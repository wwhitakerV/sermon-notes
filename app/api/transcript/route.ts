import { NextRequest, NextResponse } from 'next/server'
import { readDeviceId } from '@/app/lib/auth/device'
import { currentUser } from '@/app/lib/auth/session'
import { claimGeneration, refundGeneration } from '@/app/lib/entitlement'
import type { GrantType } from '@/app/lib/entitlement'
import {
	addToLibrary,
	ownsVideo,
	readCachedNotes,
	writeCachedNotes,
} from '@/app/lib/notes-cache'
import {
	prefixNotes,
	previewNotes,
	replayCachedRun,
} from '@/app/lib/notes-replay'
import { getVideoMeta } from '@/app/lib/video-meta'
import {
	extractVideoId,
	formatSeconds,
	formatTimestamp,
	watchUrl,
} from '@/app/lib/youtube'
import type {
	ErrorCodeType,
	PipelineEventType,
	SermonNotesType,
	VideoMetaType,
} from '@/app/types'
import {
	TranscriptError,
	formatTranscript,
	getYouTubeTranscript,
	transcriptDuration,
} from './utils'
import { generateSermonNotes } from './generate-sermon-notes'
import {
	coalesceNotes,
	dedupeBy,
	hasCompleteSection,
	hasRenderableNotes,
	scriptureKey,
} from '@/app/lib/partial-notes'

const NDJSON = 'application/x-ndjson'

type RunResultType = {
	notes: SermonNotesType
	meta: VideoMetaType | null
}

type RunOptionsType = {
	url: string
	videoId: string
	userId: string | null
	/** Null when the run is free because the account already owns the notes. */
	grant: GrantType | null
	/**
	 * Nobody is signed in, so the notes must never reach the wire. The run still
	 * happens — it warms the cache and the progress is real — but it ends with
	 * `locked`, and the reader collects the notes from `/api/notes/[videoId]`
	 * once they have an account.
	 */
	locked: boolean
}

export async function POST(req: NextRequest) {
	const body = await req.json().catch(() => null)
	const url = body?.url

	if (!url || typeof url !== 'string') {
		return NextResponse.json({ error: 'YouTube URL required' }, { status: 400 })
	}

	// Checked here rather than inside the pipeline, so a mistyped link is never
	// charged for.
	const videoId = extractVideoId(url)

	if (!videoId) {
		return NextResponse.json(
			{ error: "That doesn't look like a YouTube link.", code: 'invalid_url' },
			{ status: 400 },
		)
	}

	const user = await currentUser()

	// Notes this account already paid for are theirs. Re-opening a sermon from
	// the library never costs a second token.
	const owned = user ? await ownsVideo(user.id, videoId) : false

	const options: RunOptionsType = {
		url,
		videoId,
		userId: user?.id ?? null,
		grant: null,
		locked: !user,
	}

	if (!owned) {
		const claim = await claimGeneration({
			user,
			deviceId: await readDeviceId(),
			videoId,
		})

		// 402 is answered before the stream opens: once a response starts
		// streaming its status is already on the wire and cannot be taken back.
		if (!claim.ok) {
			return NextResponse.json(
				{
					error:
						claim.reason === 'auth_required'
							? 'Create a free account to keep taking notes.'
							: "You're out of tokens.",
					code: claim.reason,
					balance: claim.balance,
				},
				{ status: 402 },
			)
		}

		options.grant = claim.grant
	}

	// The UI asks for a progress stream; anything else gets the plain JSON reply.
	if (req.headers.get('accept')?.includes(NDJSON)) {
		return streamSermonNotes(options)
	}

	try {
		const { notes } = await performRun(options)

		return NextResponse.json(
			options.locked
				? { status: 'locked', videoId }
				: { status: 'completed', notes },
		)
	} catch (error) {
		console.error(error)

		await refund(options.grant)

		const { code, message } = describeError(error)

		return NextResponse.json(
			{ error: message, code },
			{ status: code === 'invalid_url' ? 400 : 500 },
		)
	}
}

/**
 * One run, from whichever source is cheapest, plus the bookkeeping that has to
 * happen either way: the cache is filled for everyone who asks next, and the
 * notes are filed against the account that paid for them.
 */
async function performRun(
	options: RunOptionsType,
	send: (event: PipelineEventType) => void = () => {},
): Promise<RunResultType> {
	const cached = await readCachedNotes(options.videoId)

	let result: RunResultType

	if (cached) {
		result = {
			notes: await replayCachedRun(cached.notes, cached.meta, send),
			meta: cached.meta,
		}
	} else {
		result = await runPipeline(options.url, send)

		await writeCachedNotes(options.videoId, result.notes, result.meta)
	}

	if (options.userId) {
		await addToLibrary(options.userId, options.videoId)
	}

	return result
}

/**
 * Whether the free slice is finished — section one written out and the second
 * begun. Nothing the model writes after this can change what a signed-out
 * reader is shown.
 */
function isPreviewComplete(preview: SermonNotesType): boolean {
	return preview.sections.length >= 2 && preview.sections[1].notes.length >= 1
}

/**
 * A run that produced nothing should not cost anything. The spend happens up
 * front — that is what keeps it atomic — so the failure path hands it back.
 */
async function refund(grant: GrantType | null): Promise<number | null> {
	if (!grant) {
		return null
	}

	try {
		return await refundGeneration(grant)
	} catch (error) {
		// Never let a failed refund mask the failure that caused it.
		console.error('refund failed', error)

		return null
	}
}

function streamSermonNotes(options: RunOptionsType) {
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

			let lastPreview: string | null = null
			let lockedSent = false

			const sendLocked = () => {
				if (!lockedSent) {
					lockedSent = true
					send({ type: 'locked', videoId: options.videoId })
				}
			}

			/**
			 * The gate, enforced where it actually holds. A signed-out reader is
			 * sent the opening of the notes and nothing beneath it — masking the
			 * full notes in the browser would leave them in plain sight in the
			 * network tab, which is exactly how every article paywall gets walked
			 * around.
			 *
			 * Every frame is narrowed the same way whether it came from the model
			 * or from the cache, so there is one place where this can be got wrong.
			 */
			const emit = (event: PipelineEventType) => {
				if (!options.locked) {
					send(event)

					return
				}

				// The gate is up, so this reader is done with this screen. The run
				// carries on behind them to finish filling the cache.
				if (lockedSent) {
					return
				}

				if (event.type !== 'notes-delta') {
					send(event)

					return
				}

				const preview = previewNotes(coalesceNotes(event.notes))
				const fingerprint = JSON.stringify(preview)

				// Most frames only advance parts the reader is not getting, and
				// would otherwise go out as a run of identical previews.
				if (fingerprint === lastPreview) {
					return
				}

				lastPreview = fingerprint

				send({ type: 'notes-delta', notes: prefixNotes(preview) })

				// The free slice cannot grow past this point, so the cut goes up
				// now. Waiting for the run to finish would leave the reader staring
				// at a half-written page for the minute it takes to write four more
				// sections they were never going to be shown.
				if (isPreviewComplete(preview)) {
					sendLocked()
				}
			}

			const close = () => {
				if (!closed) {
					closed = true
					controller.close()
				}
			}

			// The token came out of the balance before any of this started, so say
			// so immediately rather than leaving the header a step behind until the
			// next page load.
			if (options.grant?.balance !== null && options.grant) {
				send({ type: 'balance', tokenBalance: options.grant.balance })
			}

			// Deliberately not awaited: returning a promise from `start` would hold
			// the response back until the whole pipeline finished.
			performRun(options, emit)
				.then(({ notes }) => {
					if (!options.locked) {
						send({ type: 'complete', notes })

						return
					}

					// A sermon too short to saturate the preview never tripped the
					// early gate, so this is the backstop.
					sendLocked()

					// Only now are the notes actually in the cache. Until this, an
					// account created behind the gate has nothing to collect.
					send({ type: 'ready', videoId: options.videoId })
				})
				.catch(async error => {
					console.error(error)

					const restored = await refund(options.grant)

					if (restored !== null) {
						send({ type: 'balance', tokenBalance: restored })
					}

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
