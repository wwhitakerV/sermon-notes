import type {
	PartialSermonNotesType,
	SermonNotesType,
} from './sermon-notes-types'

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
	| { type: 'notes-delta'; notes: PartialSermonNotesType }
	| { type: 'complete'; notes: SermonNotesType }
	/**
	 * The run finished, but the reader is not signed in, so the notes were
	 * never put on the wire. They fetch them from `/api/notes/[videoId]` once
	 * they have an account.
	 */
	/**
	 * The run just spent a token, or handed one back. The header shows the
	 * balance on every screen, so it has to hear about it — the stream is the
	 * only thing that knows.
	 */
	| { type: 'balance'; tokenBalance: number }
	| { type: 'locked'; videoId: string }
	/**
	 * The run has finished and the notes are cached. Sent after `locked`,
	 * because the gate now goes up as soon as the free slice is written — long
	 * before there is anything at `/api/notes/[videoId]` to collect.
	 */
	| { type: 'ready'; videoId: string }
	| { type: 'error'; code: ErrorCodeType; message: string }

/** Why `/api/transcript` answered 402 instead of starting a run. */
export type GateReasonType = 'auth_required' | 'payment_required'

export type GateResponseType = {
	error: string
	code: GateReasonType
	balance: number
}
