import type { SermonNotesType } from './sermon-notes-types'

/** What we can learn about a video before any work starts. */
export type VideoMetaType = {
	videoId: string
	url: string
	title: string
	author: string | null
	thumbnail: string | null
	durationSeconds: number | null
}

/** The four things the user watches happen, in order. */
export const PIPELINE_STEPS = [
	'sermon',
	'transcript',
	'understand',
	'organize',
] as const

export type PipelineStepType = (typeof PIPELINE_STEPS)[number]

export type StepStateType = 'pending' | 'active' | 'done'

export type ErrorCodeType =
	| 'invalid_url'
	| 'no_transcript'
	| 'transcript_failed'
	| 'notes_failed'
	| 'unknown'

/** Newline-delimited JSON events streamed back from /api/transcript. */
export type PipelineEventType =
	| { type: 'step'; step: PipelineStepType; state: StepStateType }
	| { type: 'meta'; meta: VideoMetaType }
	| { type: 'detail'; step: PipelineStepType; detail: string }
	| { type: 'complete'; notes: SermonNotesType }
	| { type: 'error'; code: ErrorCodeType; message: string }
