import type {
	PartialSermonNotesType,
	SermonNotesType,
} from '@/app/types'

type ReferenceType = SermonNotesType['mainTexts'][number]

/**
 * Maps a mid-stream snapshot out of the model's prefixed field names and into
 * the full notes shape, so the same `NotesView` can render it. Everything that
 * has arrived is kept verbatim — including the sentence the model is halfway
 * through — and everything that has not arrived yet simply reads as empty.
 */
export function coalesceNotes(
	partial: PartialSermonNotesType,
): SermonNotesType {
	return {
		title: partial.a_title ?? '',
		mainIdea: partial.b_mainIdea ?? '',
		mainTexts: toReferences(partial.c_mainTexts),
		sections: (partial.d_sections ?? []).map(section => ({
			title: section?.a_title ?? '',
			timestamp: section?.b_timestamp ?? '',
			scriptures: (section?.c_scriptures ?? []).filter(hasText),
			notes: (section?.d_notes ?? []).filter(hasText),
			application: section?.e_application?.trim() || undefined,
		})),
		scripturesReferenced: toReferences(partial.e_scripturesReferenced),
		keyTakeaways: (partial.f_keyTakeaways ?? []).filter(hasText),
		reflectionQuestions: (partial.g_reflectionQuestions ?? []).filter(hasText),
	}
}

/**
 * A reference object is written key by key, so it exists for a moment with no
 * `reference` at all. Those blanks are dropped rather than rendered as an
 * empty row; the entry reappears the instant its first character lands.
 */
function toReferences(
	entries: PartialSermonNotesType['c_mainTexts'],
): ReferenceType[] {
	return (entries ?? [])
		.map(entry => ({
			reference: entry?.reference ?? '',
			timestamp: entry?.timestamp ?? '',
		}))
		.filter(entry => hasText(entry.reference))
}

function hasText(value: string | undefined): value is string {
	return typeof value === 'string' && value.trim().length > 0
}

/**
 * Whether a snapshot has anything worth putting on screen yet.
 *
 * Any field arriving is enough to hand off from the skeleton. The title now
 * leads the stream, but gating on it specifically would still stall the page
 * for as long as the model spends composing that first line.
 */
export function hasRenderableNotes(notes: SermonNotesType): boolean {
	return Boolean(
		notes.title.trim() ||
			notes.mainIdea.trim() ||
			notes.mainTexts.length ||
			notes.sections.length ||
			notes.scripturesReferenced.length ||
			notes.keyTakeaways.length ||
			notes.reflectionQuestions.length,
	)
}

/**
 * True once a section has both a heading and a point under it — the moment the
 * notes stop being a title and start being an outline. This is what "organize"
 * means in the progress list, and when the reader is handed the notes page.
 */
export function hasCompleteSection(notes: SermonNotesType): boolean {
	return notes.sections.some(
		section => section.title.trim().length > 0 && section.notes.length > 0,
	)
}
