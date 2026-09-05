'use client'

import { useEffect, useRef, useState } from 'react'
import { useAccount } from './components/account-provider'
import { AuthPrompt } from './components/auth-prompt'
import { FinishingCard } from './components/finishing-card'
import { NotesView } from './components/notes-view'
import { Overlay } from './components/overlay'
import { PaywallPrompt } from './components/paywall-prompt'
import { SiteHeader } from './components/site-header'
import { ProgressView, type StepStatusType } from './components/progress-view'
import { TakeNotesForm } from './components/take-notes-form'
import {
	coalesceNotes,
	hasCompleteSection,
	hasRenderableNotes,
} from './lib/partial-notes'
import { extractVideoId } from './lib/youtube'
import { PIPELINE_STEPS } from './types'
import type {
	AccountStateType,
	ErrorCodeType,
	GateReasonType,
	GateResponseType,
	PipelineEventType,
	PipelineStepType,
	SermonNotesType,
	VideoMetaType,
} from './types'

type PhaseType = 'idle' | 'working' | 'streaming' | 'done'
type StepMapType = Record<PipelineStepType, StepStatusType>
type PageErrorType = { code: ErrorCodeType; message: string }

/** Why the server refused this run, and what to put in front of the reader. */
type GateType = { reason: GateReasonType; balance: number }

const META_DEBOUNCE_MS = 350

/**
 * Beat between the last progress step completing and the notes page taking
 * over, so the reader actually sees that fourth check land.
 */
const HANDOFF_DWELL_MS = 650

function freshSteps(): StepMapType {
	return Object.fromEntries(
		PIPELINE_STEPS.map(step => [step, { state: 'pending' }]),
	) as StepMapType
}

export default function Home() {
	const [url, setUrl] = useState('')
	const [meta, setMeta] = useState<VideoMetaType | null>(null)
	const [metaLoading, setMetaLoading] = useState(false)
	const [phase, setPhase] = useState<PhaseType>('idle')
	const [steps, setSteps] = useState<StepMapType>(freshSteps)
	const [notes, setNotes] = useState<SermonNotesType | null>(null)
	const [error, setError] = useState<PageErrorType | null>(null)
	const [gate, setGate] = useState<GateType | null>(null)
	const [preview, setPreview] = useState(false)
	const [revealError, setRevealError] = useState<string | null>(null)

	const { account, savedCard, apply, setTokenBalance } = useAccount()

	const resolvedId = useRef<string | null>(null)
	/**
	 * The stream ends the moment the notes are ready, long after the render that
	 * started it — so the handler that receives `locked` reads who is signed in
	 * from a ref rather than a closure that has gone stale.
	 */
	const accountRef = useRef(account)
	const lockedVideoRef = useRef<string | null>(null)
	const notesArrivedRef = useRef(false)
	/** Guards the two triggers below from both firing for the same run. */
	const revealStartedRef = useRef(false)
	/** The sermon this run is about, for the address bar. */
	const runVideoRef = useRef<string | null>(null)
	/** The run has finished and the full notes are collectable. */
	const readyRef = useRef(false)
	const abortRef = useRef<AbortController | null>(null)
	const handoffRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	// Resolve the video as soon as a usable link is in the box, so the user can
	// confirm they pasted the sermon they meant to before committing to a run.
	useEffect(() => {
		const videoId = extractVideoId(url)

		if (!videoId || resolvedId.current === videoId) {
			return
		}

		const controller = new AbortController()

		const timer = setTimeout(async () => {
			setMetaLoading(true)

			try {
				const response = await fetch(
					`/api/video?url=${encodeURIComponent(url.trim())}`,
					{ signal: controller.signal },
				)

				if (!response.ok) {
					throw new Error('lookup failed')
				}

				resolvedId.current = videoId
				setMeta((await response.json()) as VideoMetaType)
				setError(null)
			} catch {
				if (!controller.signal.aborted) {
					setMeta(null)
				}
			} finally {
				if (!controller.signal.aborted) {
					setMetaLoading(false)
				}
			}
		}, META_DEBOUNCE_MS)

		return () => {
			clearTimeout(timer)
			controller.abort()
		}
	}, [url])

	useEffect(() => {
		accountRef.current = account
	}, [account])

	useEffect(() => {
		if (!account || !preview || !readyRef.current) {
			return
		}

		const videoId = lockedVideoRef.current

		if (videoId) {
			startReveal(videoId)
		}
		// `startReveal` is recreated every render and guards itself, so it is
		// deliberately not a dependency.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [account, preview])

	useEffect(() => {
		// Not on `done`: by then the notes are already on screen and the reader may
		// have scrolled well into them while the rest was still being written.
		if (phase !== 'done') {
			window.scrollTo({ top: 0 })
		}
	}, [phase])

	useEffect(
		() => () => {
			abortRef.current?.abort()
			cancelHandoff()
		},
		[],
	)

	function cancelHandoff() {
		if (handoffRef.current) {
			clearTimeout(handoffRef.current)
			handoffRef.current = null
		}
	}

	/**
	 * The progress list and the notes page are driven by the same milestone, so
	 * the handoff waits a beat rather than swapping the screen out in the same
	 * frame the final check turns green.
	 */
	function scheduleHandoff() {
		if (handoffRef.current) {
			return
		}

		handoffRef.current = setTimeout(() => {
			handoffRef.current = null
			setPhase(current => (current === 'working' ? 'streaming' : current))
		}, HANDOFF_DWELL_MS)
	}

	function handleUrlChange(next: string) {
		setUrl(next)

		const videoId = extractVideoId(next)

		if (videoId !== resolvedId.current) {
			setMeta(null)
		}

		if (!videoId) {
			resolvedId.current = null
			setMetaLoading(false)
		}
	}

	function applyEvent(event: PipelineEventType) {
		switch (event.type) {
			case 'step':
				setSteps(current => ({
					...current,
					[event.step]: { ...current[event.step], state: event.state },
				}))
				break
			case 'detail':
				setSteps(current => ({
					...current,
					[event.step]: { ...current[event.step], detail: event.detail },
				}))
				break
			case 'meta':
				resolvedId.current = event.meta.videoId
				setMeta(event.meta)
				break
			case 'notes-delta': {
				const partial = coalesceNotes(event.notes)

				setNotes(partial)

				notesArrivedRef.current = hasRenderableNotes(partial)

				// Wait for the outline to take shape — the same milestone that
				// completes the last progress step — so every check is green before
				// the notes page appears, and it opens with content already in it.
				if (hasCompleteSection(partial)) {
					scheduleHandoff()
				}

				break
			}
			case 'complete':
				setNotes(event.notes)
				setPhase('done')

				// Finished notes live at a real address. Rewriting the URL rather
				// than navigating keeps everything on screen exactly where it is —
				// a route change here would tear the page down and rebuild it — but
				// a refresh, a bookmark or a shared link now all resolve.
				if (runVideoRef.current) {
					window.history.replaceState(
						null,
						'',
						`/notes/${runVideoRef.current}`,
					)
				}
				break
			case 'balance':
				// The header carries the balance on every screen, so it follows the
				// run rather than waiting for the next page load.
				setTokenBalance(event.tokenBalance)
				break
			case 'ready':
				// The notes are cached now. If they signed up while the run was
				// still going, this is what releases them.
				readyRef.current = true

				if (accountRef.current && lockedVideoRef.current) {
					startReveal(event.videoId)
				}
				break
			case 'locked':
				// The free slice is written, but the rest of the run is still going
				// and nothing is cached yet — so this only raises the cut. Even a
				// reader who has already signed up waits for `ready` rather than
				// asking for notes that do not exist.
				lockedVideoRef.current = event.videoId

				if (notesArrivedRef.current) {
					cancelHandoff()
					setPreview(true)
					setPhase('streaming')
				} else {
					// Nothing rendered at all — a sermon the model gave no opening
					// to. Better to say so than to leave a blank page behind a form.
					setError({
						code: 'notes_failed',
						message:
							'We could not put notes together for this sermon. Please try again.',
					})
					setPhase('idle')
				}
				break
			case 'error':
				cancelHandoff()
				setError({ code: event.code, message: event.message })
				setNotes(null)
				setPhase('idle')
				break
		}
	}

	async function handleSubmit() {
		if (!extractVideoId(url)) {
			setError({
				code: 'invalid_url',
				message: "That doesn't look like a YouTube link.",
			})
			return
		}

		const controller = new AbortController()
		abortRef.current = controller

		setError(null)
		setNotes(null)
		setSteps(freshSteps())
		setPhase('working')

		runVideoRef.current = extractVideoId(url)

		try {
			const response = await fetch('/api/transcript', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/x-ndjson',
				},
				body: JSON.stringify({ url: url.trim() }),
				signal: controller.signal,
			})

			// The server owns the entitlement decision, and a 402 is the only thing
			// that opens a prompt — so the UI can never disagree with the ledger.
			if (response.status === 402) {
				const body = (await response
					.json()
					.catch(() => null)) as GateResponseType | null

				setGate({
					reason: body?.code ?? 'auth_required',
					balance: body?.balance ?? 0,
				})
				setPhase('idle')

				return
			}

			if (!response.ok || !response.body) {
				const body = await response.json().catch(() => null)

				throw new Error(body?.error ?? 'Request failed')
			}

			await readEvents(response.body, applyEvent)
		} catch (caught) {
			if (controller.signal.aborted) {
				return
			}

			setError({
				code: 'unknown',
				message:
					caught instanceof Error && caught.message !== 'Request failed'
						? caught.message
						: 'Something went wrong while taking notes. Please try again.',
			})
			setNotes(null)
			setPhase('idle')
		}
	}

	function handleCancel() {
		abortRef.current?.abort()
		abortRef.current = null
		cancelHandoff()
		setNotes(null)
		setPhase('idle')
		setSteps(freshSteps())
	}

	function handleReset() {
		abortRef.current?.abort()
		abortRef.current = null
		cancelHandoff()
		resolvedId.current = null
		setUrl('')
		setMeta(null)
		setNotes(null)
		setError(null)
		setGate(null)
		setPreview(false)
		setRevealError(null)
		lockedVideoRef.current = null
		notesArrivedRef.current = false
		readyRef.current = false
		revealStartedRef.current = false
		runVideoRef.current = null
		setSteps(freshSteps())
		setPhase('idle')

		// Back to the form, so put the address bar back with it.
		if (window.location.pathname !== '/') {
			window.history.replaceState(null, '', '/')
		}
	}

	/**
	 * Fetches the notes a finished run withheld, and replays them frame by frame
	 * so they arrive with the same animation a live generation would have given.
	 */
	function startReveal(videoId: string) {
		if (revealStartedRef.current) {
			return
		}

		revealStartedRef.current = true
		void revealNotes(videoId)
	}

	async function revealNotes(videoId: string) {
		const controller = new AbortController()
		abortRef.current = controller

		setRevealError(null)

		try {
			const response = await fetch(`/api/notes/${videoId}?after=preview`, {
				headers: { Accept: 'application/x-ndjson' },
				signal: controller.signal,
			})

			if (!response.ok || !response.body) {
				const body = await response.json().catch(() => null)

				throw new Error(body?.error ?? 'Request failed')
			}

			// The wall comes down as the first frames start arriving.
			setPreview(false)
			lockedVideoRef.current = null

			await readEvents(response.body, applyEvent)
		} catch (caught) {
			if (controller.signal.aborted) {
				return
			}

			// Never bounce them back to an empty form: the notes they can already
			// see are theirs, and the ones they paid for are safe in their library.
			setRevealError(
				caught instanceof Error && caught.message !== 'Request failed'
					? caught.message
					: 'We could not open your notes just now.',
			)
		}
	}

	/**
	 * Signing up from the gate is the last thing standing between the reader and
	 * the video they already pasted, so the run picks straight back up.
	 */
	function handleUnlocked(next: AccountStateType) {
		apply(next)
		setGate(null)
		void handleSubmit()
	}

	if ((phase === 'streaming' || phase === 'done') && notes) {
		return (
			<main className="flex-1">
				{/* The reader is still on the route that holds the form, so starting
				    again is a reset rather than a navigation. */}
				<SiteHeader
					progress={phase === 'streaming' && !preview}
					onNewNotes={handleReset}
				/>

				<NotesView
					notes={notes}
					meta={meta}
					onReset={handleReset}
					streaming={phase === 'streaming' && !preview}
					preview={preview}
					gate={
						preview ? (
							account ? (
								<FinishingCard
									error={revealError}
									onRetry={() => {
										if (lockedVideoRef.current) {
											void revealNotes(lockedVideoRef.current)
										}
									}}
								/>
							) : (
								<AuthPrompt variant="reveal" onSuccess={apply} inline />
							)
						) : null
					}
				/>
			</main>
		)
	}

	return (
		<main className="ambient-light grain relative flex flex-1 flex-col">
			<SiteHeader />

			{phase === 'working' ? (
				<ProgressView steps={steps} meta={meta} onCancel={handleCancel} />
			) : (
				<TakeNotesForm
					url={url}
					onUrlChange={handleUrlChange}
					onSubmit={handleSubmit}
					onClear={handleReset}
					canSubmit={extractVideoId(url) !== null}
					meta={meta}
					metaLoading={metaLoading}
					error={error}
				/>
			)}

			{/*
			 * Layered over the form rather than replacing it, so the pasted link,
			 * its preview and every keystroke survive a dismissal, a decline or a
			 * switched card.
			 */}
			{gate && (
				<Overlay onDismiss={() => setGate(null)}>
					{gate.reason === 'auth_required' ? (
						<AuthPrompt
							variant="unlock"
							onSuccess={handleUnlocked}
							onDismiss={() => setGate(null)}
						/>
					) : (
						<PaywallPrompt
							balance={gate.balance}
							savedCard={savedCard}
							// Paying was the last thing between them and the sermon
							// they already pasted, so the run picks straight back up.
							onPurchased={next => {
								apply(next)
								setGate(null)
								void handleSubmit()
							}}
							onDismiss={() => setGate(null)}
						/>
					)}
				</Overlay>
			)}
		</main>
	)
}

/** Reads the newline-delimited progress stream, one event at a time. */
async function readEvents(
	body: ReadableStream<Uint8Array>,
	onEvent: (event: PipelineEventType) => void,
) {
	const reader = body.getReader()
	const decoder = new TextDecoder()
	let buffer = ''

	const flush = (chunk: string) => {
		const trimmed = chunk.trim()

		if (!trimmed) {
			return
		}

		try {
			onEvent(JSON.parse(trimmed) as PipelineEventType)
		} catch {
			// A partial or malformed line is not worth failing the whole run over.
		}
	}

	while (true) {
		const { done, value } = await reader.read()

		if (done) {
			break
		}

		buffer += decoder.decode(value, { stream: true })

		const lines = buffer.split('\n')
		buffer = lines.pop() ?? ''

		lines.forEach(flush)
	}

	flush(buffer)
}
