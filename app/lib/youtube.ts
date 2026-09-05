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

export function watchUrl(videoId: string): string {
	return `https://www.youtube.com/watch?v=${videoId}`
}

export function thumbnailUrl(videoId: string): string {
	return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

/** `H:MM:SS` or `MM:SS`, wherever it sits in the string. */
const CLOCK = /(\d{1,3}):([0-5]\d)(?::([0-5]\d))?/

/**
 * The first clock time in the string, in seconds.
 *
 * Deliberately forgiving about what surrounds it. The transcript is handed to
 * the model as `[00:04:12] ...` blocks and the prompt asks it to preserve the
 * timestamps — which it does, brackets and all. Splitting on `:` and trusting
 * `Number` meant one stray bracket turned every timestamp on the page from a
 * link back into plain text. A range resolves to where it starts.
 */
export function timestampToSeconds(timestamp: string): number | null {
	const match = timestamp.match(CLOCK)

	if (!match) {
		return null
	}

	const [, first, second, third] = match

	return third
		? Number(first) * 3600 + Number(second) * 60 + Number(third)
		: Number(first) * 60 + Number(second)
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
