'use client'

import { formatTimestamp, timestampLink, timestampToSeconds } from '@/app/lib/youtube'
import { YouTubeIcon } from './icons'
import { Tooltip } from './tooltip'
import { useVideoDialog } from './video-dialog'

type Props = {
	timestamp: string
	videoId: string | null
	title?: string | null
	tone?: 'solid' | 'quiet'
}

/**
 * A timestamp that jumps back to the moment in the sermon it came from.
 * Falls back to plain text when there is no video to link to.
 */
export function TimestampPill({
	timestamp,
	videoId,
	title = null,
	tone = 'quiet',
}: Props) {
	const { openVideo } = useVideoDialog()

	const label = formatTimestamp(timestamp)
	const href = timestampLink(videoId, timestamp)

	const base =
		'inline-flex items-center gap-1.5 rounded-full border font-mono text-xs tabular-nums transition-colors'
	const skin =
		tone === 'solid'
			? 'bg-accent-tint text-accent-strong px-2.5 py-1'
			: 'text-ink-faint px-2 py-0.5'

	if (!href || !videoId) {
		return <span className={`${base} ${skin} border-transparent`}>{label}</span>
	}

	return (
		<Tooltip label={`Watch from ${label}`}>
			<a
				href={href}
				target="_blank"
				rel="noreferrer"
				aria-label={`Watch from ${label}`}
				// Still a real link, so a modifier-click or a right-click behaves
				// the way the browser promises. A plain click plays it here.
				onClick={event => {
					if (
						event.metaKey ||
						event.ctrlKey ||
						event.shiftKey ||
						event.altKey ||
						event.button !== 0
					) {
						return
					}

					event.preventDefault()
					openVideo({
						videoId,
						seconds: timestampToSeconds(timestamp),
						title,
					})
				}}
				className={`${base} ${skin} hover:bg-accent-tint hover:text-accent-strong hover:border-accent/60 focus-visible:ring-accent/40 border-transparent focus-visible:ring-2 focus-visible:outline-none`}
			>
				{/*
				 * YouTube's own mark, in YouTube's own red. A generic play triangle
				 * says "something happens"; this says what happens, which is the
				 * whole reason to click a timestamp.
				 */}
				<YouTubeIcon className="text-youtube no-print size-4 shrink-0" />
				{label}
			</a>
		</Tooltip>
	)
}
