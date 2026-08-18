const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/
const PATH_PREFIXES = ['embed', 'shorts', 'live', 'v']

/**
 * Pulls the 11-character video id out of any of the shapes people actually
 * paste: full watch URLs, youtu.be links, shorts, live, embeds, or a bare id.
 */
export function extractVideoId(input: string): string | null {
	const trimmed = input.trim()

	if (!trimmed) {
		return null
	}

	if (VIDEO_ID.test(trimmed)) {
		return trimmed
	}

	let url: URL

	try {
		url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
	} catch {
		return null
	}

	const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '')
	const isYouTube =
		host === 'youtube.com' ||
		host === 'youtube-nocookie.com' ||
		host === 'youtu.be' ||
		host.endsWith('.youtube.com')

	if (!isYouTube) {
		return null
	}

	if (host === 'youtu.be') {
		const id = url.pathname.slice(1).split('/')[0]
		return VIDEO_ID.test(id) ? id : null
	}

	const fromQuery = url.searchParams.get('v')

	if (fromQuery && VIDEO_ID.test(fromQuery)) {
		return fromQuery
	}

	const [prefix, candidate] = url.pathname.split('/').filter(Boolean)

	if (PATH_PREFIXES.includes(prefix) && candidate && VIDEO_ID.test(candidate)) {
		return VIDEO_ID.test(candidate) ? candidate : null
	}

	return null
}

export function isLikelyYouTubeUrl(input: string): boolean {
	return extractVideoId(input) !== null
}

export function watchUrl(videoId: string): string {
	return `https://www.youtube.com/watch?v=${videoId}`
}

export function thumbnailUrl(videoId: string): string {
	return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

/**
 * Timestamps arrive as `HH:MM:SS` or as a range `HH:MM:SS-HH:MM:SS`.
 * Both resolve to the starting second so a link can jump there.
 */
export function timestampToSeconds(timestamp: string): number | null {
	const start = timestamp.split(/[–—-]/)[0]?.trim()

	if (!start) {
		return null
	}

	const parts = start.split(':').map(part => Number(part))

	if (parts.some(part => !Number.isFinite(part))) {
		return null
	}

	if (parts.length === 3) {
		return parts[0] * 3600 + parts[1] * 60 + parts[2]
	}

	if (parts.length === 2) {
		return parts[0] * 60 + parts[1]
	}

	return null
}

/** `00:06:36` reads better as `6:36`; anything past an hour keeps the hour. */
export function formatTimestamp(timestamp: string): string {
	const seconds = timestampToSeconds(timestamp)

	if (seconds === null) {
		return timestamp
	}

	return formatSeconds(seconds)
}

export function formatSeconds(total: number): string {
	const seconds = Math.max(0, Math.floor(total))
	const hrs = Math.floor(seconds / 3600)
	const mins = Math.floor((seconds % 3600) / 60)
	const secs = seconds % 60
	const pad = (n: number) => String(n).padStart(2, '0')

	return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${mins}:${pad(secs)}`
}

/** A watch link that starts playback at the moment a note came from. */
export function timestampLink(
	videoId: string | null,
	timestamp: string,
): string | null {
	if (!videoId) {
		return null
	}

	const seconds = timestampToSeconds(timestamp)

	if (seconds === null) {
		return null
	}

	return `${watchUrl(videoId)}&t=${seconds}s`
}
