import { zodResponseFormat } from 'openai/helpers/zod'
import { openai } from '../../lib/openai'
import { SermonNotesSchema } from '../../lib/zod-schema'
import { instructions } from '@/app/lib/openai-notes-instruction'
import { coalesceNotes } from '@/app/lib/partial-notes'
import type { PartialSermonNotesType } from '@/app/types'

/**
 * The model emits a token at a time, but each snapshot carries the whole notes
 * object. Sending every one would flood the response with near-duplicates, so
 * snapshots go out on a fixed cadence — fast enough to read as live typing.
 */
const SNAPSHOT_INTERVAL_MS = 120

export async function generateSermonNotes(
	transcript: string,
	onSnapshot: (notes: PartialSermonNotesType) => void = () => {},
) {
	const stream = openai.chat.completions.stream({
		model: 'gpt-5.6-luna',
		messages: [
			{
				role: 'system',
				content: instructions.trim(),
			},
			{
				role: 'user',
				content: `Create sermon notes from this transcript:
        ${transcript}`.trim(),
			},
		],
		response_format: zodResponseFormat(SermonNotesSchema, 'sermon_notes'),
	})

	let lastSentAt = 0

	// `parsed` is the JSON received so far, parsed leniently: complete keys are
	// present, the key being written is truncated, and the rest is absent.
	stream.on('content.delta', ({ parsed }) => {
		if (!parsed || typeof parsed !== 'object') {
			return
		}

		const now = Date.now()

		if (now - lastSentAt < SNAPSHOT_INTERVAL_MS) {
			return
		}

		lastSentAt = now

		onSnapshot(parsed as PartialSermonNotesType)
	})

	const completion = await stream.finalChatCompletion()
	const notes = completion.choices[0].message.parsed

	if (!notes) {
		throw new Error('The model did not return sermon notes.')
	}

	// Same mapping the snapshots go through, so the final notes and the last
	// streamed frame cannot disagree.
	return coalesceNotes(notes)
}
