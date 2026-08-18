import type { VideoMetaType } from '@/app/types'
import { thumbnailUrl, watchUrl } from './youtube'

type OEmbedResponse = {
	title?: string
	author_name?: string
	thumbnail_url?: string
}

const REQUEST_TIMEOUT_MS = 6000

/**
 * Resolves the title/channel/thumbnail so the user can confirm they pasted the
 * sermon they meant to. Nothing here is required for note-taking, so every
 * lookup degrades to a sensible placeholder rather than failing the request.
 */
export async function getVideoMeta(
	videoId: string,
): Promise<VideoMetaType | null> {
	const url = watchUrl(videoId)

	const [oembed, durationSeconds] = await Promise.all([
		fetchOEmbed(url),
		fetchDuration(url),
	])

	if (!oembed) {
		return null
	}

	return {
		videoId,
		url,
		title: oembed.title?.trim() || 'Untitled sermon',
		author: oembed.author_name?.trim() || null,
		thumbnail: oembed.thumbnail_url || thumbnailUrl(videoId),
		durationSeconds,
	}
}

async function fetchOEmbed(url: string): Promise<OEmbedResponse | null> {
	const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`

	try {
		const response = await fetch(endpoint, {
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		})

		if (!response.ok) {
			return null
		}

		return (await response.json()) as OEmbedResponse
	} catch {
		return null
	}
}

/**
 * oEmbed does not report length, so the watch page is the only source without
 * an API key. It is best-effort: a miss just hides the runtime in the UI.
 */
async function fetchDuration(url: string): Promise<number | null> {
	try {
		const response = await fetch(url, {
			headers: { 'accept-language': 'en-US,en;q=0.9' },
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		})

		if (!response.ok) {
			return null
		}

		const html = await response.text()
		const match = html.match(/"lengthSeconds":"(\d+)"/)
		const seconds = match ? Number(match[1]) : NaN

		return Number.isFinite(seconds) && seconds > 0 ? seconds : null
	} catch {
		return null
	}
}
