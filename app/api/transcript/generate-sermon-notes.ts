import { zodResponseFormat } from 'openai/helpers/zod'
import { openai } from '../../lib/openai'
import { SermonNotesSchema } from '../../lib/zod-schema'
import { instructions } from '@/app/lib/openai-notes-instruction'

export async function generateSermonNotes(transcript: string) {
	const completion = await openai.chat.completions.parse({
		model: 'gpt-5.6',
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

	const notes = completion.choices[0].message.parsed

	if (!notes) {
		throw new Error('The model did not return sermon notes.')
	}

	return notes
}
