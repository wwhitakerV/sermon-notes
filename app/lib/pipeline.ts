import { getVideoMeta } from '@/app/lib/video-meta'
import { extractVideoId, formatSeconds, formatTimestamp, watchUrl } from '@/app/lib/youtube'
import {
	coalesceNotes,
	dedupeBy,
	hasCompleteSection,
	hasRenderableNotes,
	scriptureKey,
} from '@/app/lib/partial-notes'
import {
	TranscriptError,
	formatTranscript,
	getYouTubeTranscript,
	transcriptDuration,
} from '@/app/api/transcript/utils'
import { generateSermonNotes } from '@/app/api/transcript/generate-sermon-notes'
import type {
	ErrorCodeType,
	PipelineEventType,
	SermonNotesType,
	VideoMetaType,
} from '@/app/types'

export type RunResultType = {
	notes: SermonNotesType
	meta: VideoMetaType | null
}

/**
 * Turning a YouTube link into notes, and nothing else.
 *
 * Kept apart from the route so anything that needs to generate can — the paid
 * path through `/api/transcript`, and the admin tool that publishes marketing
 * pages without spending a token.
 */
export async function runPipeline(
	url: string,
	send: (event: PipelineEventType) => void = () => {},
): Promise<RunResultType> {
	const videoId = extractVideoId(url)

	if (!videoId) {
		throw new PipelineError(
			'invalid_url',
			"That doesn't look like a YouTube link.",
		)
	}

	send({ type: 'step', step: 'sermon', state: 'active' })

	const meta = await getVideoMeta(videoId)

	if (meta) {
		send({ type: 'meta', meta })
	}

	send({ type: 'step', step: 'sermon', state: 'done' })
	send({ type: 'step', step: 'transcript', state: 'active' })

	const result = await getYouTubeTranscript(watchUrl(videoId), elapsed => {
		send({
			type: 'detail',
			step: 'transcript',
			detail: `Still working — ${formatSeconds(elapsed / 1000)} elapsed`,
		})
	})

	if (result.content.length === 0) {
		throw new PipelineError(
			'no_transcript',
			'This video has no captions available, so there is nothing to take notes from.',
		)
	}

	const duration = transcriptDuration(result.content)

	send({
		type: 'detail',
		step: 'transcript',
		detail: duration
			? `${formatSeconds(duration)} of teaching`
			: `${result.content.length.toLocaleString()} lines`,
	})
	send({ type: 'step', step: 'transcript', state: 'done' })
	send({ type: 'step', step: 'understand', state: 'active' })

	const formattedTranscript = formatTranscript(result.content)

	let notes: SermonNotesType

	// The last two steps used to complete only once the whole generation had
	// finished, which is long after the reader has been handed the notes page.
	// They are tied to what the stream actually shows instead.
	let understood = false
	let organizedEarly = false

	try {
		// Each snapshot rides the same event stream the progress steps use, so the
		// notes appear in the UI while the model is still writing them.
		notes = await generateSermonNotes(formattedTranscript, snapshot => {
			send({ type: 'notes-delta', notes: snapshot })

			const partial = coalesceNotes(snapshot)

			if (!understood && hasRenderableNotes(partial)) {
				understood = true
				send({ type: 'step', step: 'understand', state: 'done' })
				send({ type: 'step', step: 'organize', state: 'active' })
			}

			if (!organizedEarly && hasCompleteSection(partial)) {
				organizedEarly = true
				send({ type: 'step', step: 'organize', state: 'done' })
			}
		})
	} catch (error) {
		console.error(error)

		throw new PipelineError(
			'notes_failed',
			'We could not put notes together for this sermon. Please try again.',
		)
	}

	// Fallbacks for a run that never hit the milestones above — a sermon the
	// model returns in one delta, or one that yields no sections at all.
	if (!understood) {
		send({ type: 'step', step: 'understand', state: 'done' })
		send({ type: 'step', step: 'organize', state: 'active' })
	}

	const organized = organizeNotes(notes)

	send({
		type: 'detail',
		step: 'organize',
		detail: `${organized.sections.length} sections · ${organized.scripturesReferenced.length} Scriptures`,
	})

	if (!organizedEarly) {
		send({ type: 'step', step: 'organize', state: 'done' })
	}

	return { notes: organized, meta: meta ?? null }
}

/** Trim blanks and drop duplicate Scripture entries the model may repeat. */
function organizeNotes(notes: SermonNotesType): SermonNotesType {
	const seen = new Set<string>()

	return {
		...notes,
		title: notes.title.trim(),
		mainIdea: notes.mainIdea.trim(),
		// Stored clean, so what is cached for everyone after this reader is not
		// carrying the transcript's brackets around.
		mainTexts: dedupeBy(
			notes.mainTexts.map(entry => ({
				...entry,
				timestamp: formatTimestamp(entry.timestamp),
			})),
			entry => scriptureKey(entry.reference, entry.timestamp),
		),
		sections: notes.sections.map(section => ({
			...section,
			timestamp: formatTimestamp(section.timestamp),
			notes: section.notes.map(note => note.trim()).filter(Boolean),
			scriptures: dedupeBy(
				section.scriptures.map(s => s.trim()).filter(Boolean),
				scriptureKey,
			),
			application: section.application?.trim() || undefined,
		})),
		// Normalised before the duplicate check, not after: otherwise the same
		// reference arriving as `[00:03:20]` and `00:03:20` reads as two.
		scripturesReferenced: notes.scripturesReferenced
			.map(entry => ({
				...entry,
				timestamp: formatTimestamp(entry.timestamp),
			}))
			.filter(entry => {
				const key = `${entry.reference}@${entry.timestamp}`.toLowerCase()

				if (!entry.reference.trim() || seen.has(key)) {
					return false
				}

				seen.add(key)

				return true
			}),
		keyTakeaways: notes.keyTakeaways.map(item => item.trim()).filter(Boolean),
		reflectionQuestions: notes.reflectionQuestions
			.map(item => item.trim())
			.filter(Boolean),
	}
}

export class PipelineError extends Error {
	constructor(
		readonly code: ErrorCodeType,
		message: string,
	) {
		super(message)
		this.name = 'PipelineError'
	}
}

export function describeError(error: unknown): {
	code: ErrorCodeType
	message: string
} {
	if (error instanceof PipelineError || error instanceof TranscriptError) {
		return { code: error.code, message: error.message }
	}

	return {
		code: 'unknown',
		message: 'Something went wrong while taking notes. Please try again.',
	}
}
