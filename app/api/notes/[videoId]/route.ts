import { NextResponse } from 'next/server'
import { currentUser } from '@/app/lib/auth/session'
import { ownsVideo, readCachedNotes } from '@/app/lib/notes-cache'
import { previewFrameBoundary, replayNotes } from '@/app/lib/notes-replay'
import type { PipelineEventType } from '@/app/types'

const NDJSON = 'application/x-ndjson'

/**
 * The other half of the gate. A run that finished while nobody was signed in
 * ends with `locked` and no notes; once there is an account behind the request,
 * this hands them over — replayed frame by frame, so they arrive with the same
 * animation a live run would have given them.
 *
 * Ownership is checked here, not implied by holding the video id: knowing which
 * sermon was generated is not the same as having paid for it.
 */
export async function GET(
	request: Request,
	context: RouteContext<'/api/notes/[videoId]'>,
) {
	const { videoId } = await context.params
	const user = await currentUser()

	if (!user) {
		return NextResponse.json(
			{ error: 'Sign in to open these notes.', code: 'auth_required' },
			{ status: 401 },
		)
	}

	if (!(await ownsVideo(user.id, videoId))) {
		return NextResponse.json(
			{ error: 'These notes are not in your library.', code: 'not_owned' },
			{ status: 403 },
		)
	}

	const cached = await readCachedNotes(videoId)

	if (!cached) {
		return NextResponse.json(
			{ error: 'These notes are still being written.', code: 'not_ready' },
			{ status: 404 },
		)
	}

	if (!request.headers.get('accept')?.includes(NDJSON)) {
		return NextResponse.json({ notes: cached.notes, meta: cached.meta })
	}

	// `after=preview` resumes where the free slice stopped, so the notes already
	// on screen stay put and the rest writes in beneath them.
	const startAt = new URL(request.url).searchParams.get('after') === 'preview'
		? previewFrameBoundary(cached.notes)
		: 0

	const encoder = new TextEncoder()

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			let closed = false

			const send = (event: PipelineEventType) => {
				if (!closed) {
					controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
				}
			}

			if (cached.meta) {
				send({ type: 'meta', meta: cached.meta })
			}

			replayNotes(cached.notes, send, { startAt })
				.then(() => {
					send({ type: 'complete', notes: cached.notes })
				})
				.catch(error => {
					console.error(error)
					send({
						type: 'error',
						code: 'unknown',
						message: 'Could not open these notes. Please try again.',
					})
				})
				.finally(() => {
					if (!closed) {
						closed = true
						controller.close()
					}
				})
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
