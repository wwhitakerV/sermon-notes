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
import { describeError, runPipeline } from '@/app/lib/pipeline'
import type { RunResultType } from '@/app/lib/pipeline'
import { extractVideoId } from '@/app/lib/youtube'
import type { PipelineEventType, SermonNotesType } from '@/app/types'
import { coalesceNotes } from '@/app/lib/partial-notes'

const NDJSON = 'application/x-ndjson'

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
