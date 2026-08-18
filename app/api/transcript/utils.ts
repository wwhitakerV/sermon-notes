import { TranscriptResultType, TranscriptSegmentType } from '@/app/types'
import { supadata } from '../../lib/supadata'

const BLOCK_LENGTH_MS = 30_000
const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 200 // ~10 minutes

const noResult = {
	content: [],
	lang: 'en',
} as TranscriptResultType

export class TranscriptError extends Error {
	constructor(
		readonly code: 'no_transcript' | 'transcript_failed',
		message: string,
	) {
		super(message)
		this.name = 'TranscriptError'
	}
}

export async function getYouTubeTranscript(
	url: string,
	onWaiting?: (elapsedMs: number) => void,
): Promise<TranscriptResultType> {
	const result = await supadata.transcript({
		url,
		lang: 'en',
		text: false,
		mode: 'auto',
	})

	if (!('jobId' in result)) {
		return result as TranscriptResultType
	}

	for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
		await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))

		const job = await supadata.transcript.getJobStatus(result.jobId)

		if (job.status === 'completed') {
			return (job.result || noResult) as TranscriptResultType
		}

		if (job.status === 'failed') {
			throw new TranscriptError(
				'transcript_failed',
				'YouTube did not return a transcript for this video.',
			)
		}

		onWaiting?.((attempt + 1) * POLL_INTERVAL_MS)
	}

	throw new TranscriptError(
		'transcript_failed',
		'The transcript took too long to arrive. Please try again.',
	)
}

function formatTimestamp(ms: number) {
	const seconds = Math.floor(ms / 1000)

	const hrs = Math.floor(seconds / 3600)
	const mins = Math.floor((seconds % 3600) / 60)
	const secs = seconds % 60

	return [hrs, mins, secs].map(n => String(n).padStart(2, '0')).join(':')
}

/** Length of the spoken material, taken from the final transcript segment. */
export function transcriptDuration(
	segments: TranscriptSegmentType[],
): number | null {
	const last = segments.at(-1)

	if (!last) {
		return null
	}

	return Math.round((last.offset + last.duration) / 1000)
}

export function formatTranscript(segments: TranscriptSegmentType[]): string {
	if (segments.length === 0) {
		return ''
	}

	const blocks: string[] = []

	let blockStart = segments[0].offset
	let blockText: string[] = []

	for (const segment of segments) {
		const elapsed = segment.offset - blockStart

		if (elapsed >= BLOCK_LENGTH_MS && blockText.length > 0) {
			blocks.push(`[${formatTimestamp(blockStart)}] ${blockText.join(' ')}`)

			blockStart = segment.offset
			blockText = []
		}

		blockText.push(segment.text.trim())
	}

	if (blockText.length > 0) {
		blocks.push(`[${formatTimestamp(blockStart)}] ${blockText.join(' ')}`)
	}

	return blocks.join('\n\n')
}
