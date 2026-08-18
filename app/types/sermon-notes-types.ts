import type { SermonNotes } from '@/app/lib/zod-schema'

export type SermonNotesType = {
	title: string
	mainIdea: string
	mainTexts: {
		reference: string
		timestamp: string
	}[]
	sections: {
		title: string
		timestamp: string
		scriptures: string[]
		notes: string[]
		application?: string
	}[]
	scripturesReferenced: {
		reference: string
		timestamp: string
	}[]
	keyTakeaways: string[]
	reflectionQuestions: string[]
}

export type TranscriptSegmentType = {
	text: string
	offset: number
	duration: number
	lang: string
}

export type TranscriptResultType = {
	content: TranscriptSegmentType[]
	lang: string
	availableLangs?: string[]
}

/**
 * A mid-stream snapshot, in the model's own prefixed field names (see
 * `zod-schema.ts`). The JSON arrives left to right, so every field is optional
 * and the last string in the object is usually still half-written when a
 * snapshot goes out.
 */
export type PartialSermonNotesType = DeepPartialType<SermonNotes>

type DeepPartialType<T> = T extends (infer U)[]
	? DeepPartialType<U>[]
	: T extends object
		? { [K in keyof T]?: DeepPartialType<T[K]> }
		: T
