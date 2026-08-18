import { formatTimestamp, timestampLink } from '@/app/lib/youtube'
import { PlayIcon } from './icons'

type Props = {
	timestamp: string
	videoId: string | null
	tone?: 'solid' | 'quiet'
}

/**
 * A timestamp that jumps back to the moment in the sermon it came from.
 * Falls back to plain text when there is no video to link to.
 */
export function TimestampPill({ timestamp, videoId, tone = 'quiet' }: Props) {
	const label = formatTimestamp(timestamp)
	const href = timestampLink(videoId, timestamp)

	const base =
		'group inline-flex items-center gap-1.5 rounded-full font-mono text-xs tabular-nums transition-colors'
	const skin =
		tone === 'solid'
			? 'bg-accent-tint text-accent-strong px-2.5 py-1'
			: 'text-ink-faint px-2 py-0.5'

	if (!href) {
		return <span className={`${base} ${skin}`}>{label}</span>
	}

	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			title={`Watch from ${label}`}
			className={`${base} ${skin} hover:bg-accent-tint hover:text-accent-strong focus-visible:ring-accent/40 focus-visible:outline-none focus-visible:ring-2`}
		>
			<PlayIcon className="size-2.5 opacity-0 transition-opacity group-hover:opacity-100" />
			{label}
		</a>
	)
}
