'use client'

import { useEffect, useRef, useState } from 'react'
import { NotesView } from './components/notes-view'
import { ProgressView, type StepStatusType } from './components/progress-view'
import { TakeNotesForm } from './components/take-notes-form'
import { LampMark } from './components/icons'
import { coalesceNotes, hasCompleteSection } from './lib/partial-notes'
import { extractVideoId } from './lib/youtube'
import { PIPELINE_STEPS } from './types'
import type {
	ErrorCodeType,
	PipelineEventType,
	PipelineStepType,
	SermonNotesType,
	VideoMetaType,
} from './types'

type PhaseType = 'idle' | 'working' | 'streaming' | 'done'
type StepMapType = Record<PipelineStepType, StepStatusType>
type PageErrorType = { code: ErrorCodeType; message: string }

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

	const resolvedId = useRef<string | null>(null)
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
		setSteps(freshSteps())
		setPhase('idle')
	}

	if ((phase === 'streaming' || phase === 'done') && notes) {
		return (
			<main className="flex-1">
				<NotesView
					notes={notes}
					meta={meta}
					onReset={handleReset}
					streaming={phase === 'streaming'}
				/>
			</main>
		)
	}

	return (
		<main className="ambient-light grain relative flex flex-1 flex-col">
			<Header />

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
		</main>
	)
}

function Header() {
	return (
		<header className="relative z-10 flex items-center gap-2.5 px-6 py-6 sm:px-8">
			<span className="bg-accent-strong shadow-accent/25 flex size-7 items-center justify-center rounded-lg text-white shadow-md">
				<LampMark className="size-4" />
			</span>
			<span className="font-serif text-[0.9375rem] font-medium tracking-tight">
				Sermon Notes
			</span>
		</header>
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
