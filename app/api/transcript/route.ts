import { NextRequest, NextResponse } from 'next/server'
import { getVideoMeta } from '@/app/lib/video-meta'
import { extractVideoId, formatSeconds, watchUrl } from '@/app/lib/youtube'
import type {
	ErrorCodeType,
	PipelineEventType,
	SermonNotesType,
} from '@/app/types'
import {
	TranscriptError,
	formatTranscript,
	getYouTubeTranscript,
	transcriptDuration,
} from './utils'
import { generateSermonNotes } from './generate-sermon-notes'

const NDJSON = 'application/x-ndjson'

export async function POST(req: NextRequest) {
	const body = await req.json().catch(() => null)
	const url = body?.url

	if (!url || typeof url !== 'string') {
		return NextResponse.json({ error: 'YouTube URL required' }, { status: 400 })
	}

	// The UI asks for a progress stream; anything else gets the plain JSON reply.
	if (req.headers.get('accept')?.includes(NDJSON)) {
		return streamSermonNotes(url)
	}

	try {
		const notes = await runPipeline(url)

		return NextResponse.json({ status: 'completed', notes })
	} catch (error) {
		console.error(error)

		const { code, message } = describeError(error)

		return NextResponse.json(
			{ error: message, code },
			{ status: code === 'invalid_url' ? 400 : 500 },
		)
	}
}

function streamSermonNotes(url: string) {
	const encoder = new TextEncoder()

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			let closed = false

			const send = (event: PipelineEventType) => {
				if (closed) {
					return
				}

				controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
			}

			const close = () => {
				if (!closed) {
					closed = true
					controller.close()
				}
			}

			// Deliberately not awaited: returning a promise from `start` would hold
			// the response back until the whole pipeline finished.
			runPipeline(url, send)
				.then(notes => {
					send({ type: 'complete', notes })
				})
				.catch(error => {
					console.error(error)
					send({ type: 'error', ...describeError(error) })
				})
				.finally(close)
		},
	})

	return new Response(stream, {
		headers: {
			'Content-Type': NDJSON,
			'Cache-Control': 'no-cache, no-transform',
			'X-Accel-Buffering': 'no',
		},
	})
}

/**
 * The whole job, start to finish. `send` is optional so the non-streaming
 * response path can reuse exactly the same steps.
 */
async function runPipeline(
	url: string,
	send: (event: PipelineEventType) => void = () => {},
): Promise<SermonNotesType> {
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

	try {
		notes = await generateSermonNotes(formattedTranscript)
	} catch (error) {
		console.error(error)

		throw new PipelineError(
			'notes_failed',
			'We could not put notes together for this sermon. Please try again.',
		)
	}

	send({ type: 'step', step: 'understand', state: 'done' })
	send({ type: 'step', step: 'organize', state: 'active' })

	const organized = organizeNotes(notes)

	send({
		type: 'detail',
		step: 'organize',
		detail: `${organized.sections.length} sections · ${organized.scripturesReferenced.length} Scriptures`,
	})
	send({ type: 'step', step: 'organize', state: 'done' })

	return organized
}

/** Trim blanks and drop duplicate Scripture entries the model may repeat. */
function organizeNotes(notes: SermonNotesType): SermonNotesType {
	const seen = new Set<string>()

	return {
		...notes,
		title: notes.title.trim(),
		mainIdea: notes.mainIdea.trim(),
		sections: notes.sections.map(section => ({
			...section,
			notes: section.notes.map(note => note.trim()).filter(Boolean),
			scriptures: section.scriptures.map(s => s.trim()).filter(Boolean),
			application: section.application?.trim() || undefined,
		})),
		scripturesReferenced: notes.scripturesReferenced.filter(entry => {
			const key = `${entry.reference}@${entry.timestamp}`.toLowerCase()

			if (!entry.reference.trim() || seen.has(key)) {
				return false
			}

			seen.add(key)

			return true
		}),
		keyTakeaways: notes.keyTakeaways.map(item => item.trim()).filter(Boolean),
	}
}

class PipelineError extends Error {
	constructor(
		readonly code: ErrorCodeType,
		message: string,
	) {
		super(message)
		this.name = 'PipelineError'
	}
}

function describeError(error: unknown): {
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
