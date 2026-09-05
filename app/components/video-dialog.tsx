'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { formatSeconds, watchUrl } from '@/app/lib/youtube'
import { CloseIcon, YouTubeIcon } from './icons'
import { Overlay } from './overlay'

type RequestType = {
	videoId: string
	/** Where to start. Null plays from the beginning. */
	seconds: number | null
	title?: string | null
}

type ContextType = {
	openVideo: (request: RequestType) => void
}

const VideoDialogContext = createContext<ContextType | null>(null)

/**
 * Plays the sermon over the notes instead of in another tab.
 *
 * A timestamp is a checking gesture — "where did he say that?" — and a new tab
 * turns two seconds of checking into leaving. This keeps the reading position,
 * the scroll, and the page underneath exactly where they were.
 */
export function VideoDialogProvider({
	children,
}: {
	children: React.ReactNode
}) {
	const [request, setRequest] = useState<RequestType | null>(null)

	const openVideo = useCallback((next: RequestType) => setRequest(next), [])
	const value = useMemo<ContextType>(() => ({ openVideo }), [openVideo])

	return (
		<VideoDialogContext.Provider value={value}>
			{children}

			{request && (
				<Overlay size="wide" onDismiss={() => setRequest(null)}>
					<VideoPanel request={request} onDismiss={() => setRequest(null)} />
				</Overlay>
			)}
		</VideoDialogContext.Provider>
	)
}

export function useVideoDialog(): ContextType {
	const value = useContext(VideoDialogContext)

	if (!value) {
		throw new Error('useVideoDialog must be used inside <VideoDialogProvider>')
	}

	return value
}

function VideoPanel({
	request,
	onDismiss,
}: {
	request: RequestType
	onDismiss: () => void
}) {
	const { videoId, seconds, title } = request

	const params = new URLSearchParams({ autoplay: '1', rel: '0' })

	if (seconds !== null) {
		params.set('start', String(seconds))
	}

	return (
		<div className="bg-ink overflow-hidden rounded-2xl shadow-2xl">
			<div className="flex items-center gap-3 px-4 py-2.5">
				<p className="text-paper/70 min-w-0 flex-1 truncate text-[0.8125rem]">
					{title || 'Sermon'}
					{seconds !== null && (
						<span className="ml-2 font-mono tabular-nums">
							{formatSeconds(seconds)}
						</span>
					)}
				</p>

				{/*
				 * Some videos disallow embedding and there is no reliable way to be
				 * told so from inside the frame. This is the way out either way.
				 */}
				<a
					href={
						seconds === null
							? watchUrl(videoId)
							: `${watchUrl(videoId)}&t=${seconds}s`
					}
					target="_blank"
					rel="noreferrer"
					className="text-paper/70 hover:text-paper inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[0.8125rem] transition-colors"
				>
					<YouTubeIcon className="size-4" />
					<span className="hidden sm:inline">YouTube</span>
				</a>

				<button
					type="button"
					onClick={onDismiss}
					aria-label="Close video"
					className="text-paper/70 hover:text-paper hover:bg-paper/10 shrink-0 rounded-lg p-1.5 transition-colors"
				>
					<CloseIcon className="size-4" />
				</button>
			</div>

			<div className="aspect-video w-full bg-black">
				<iframe
					// Keyed on the request so re-opening at a new timestamp reloads
					// the frame rather than leaving it where it was.
					key={`${videoId}-${seconds}`}
					src={`https://www.youtube-nocookie.com/embed/${videoId}?${params}`}
					title={title || 'Sermon video'}
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowFullScreen
					className="size-full border-0"
				/>
			</div>
		</div>
	)
}
