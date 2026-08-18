import { z } from 'zod'

/**
 * The field names carry an ordering prefix on purpose.
 *
 * The model emits object keys in alphabetical order rather than the order this
 * schema declares them. Left alone, that means the notes arrive back to front:
 * a section's `application` before its `title`, and the whole document's
 * `keyTakeaways` before anything else — so a streamed page fills in bottom-up
 * and the heading lands last.
 *
 * Prefixing makes alphabetical order and reading order the same thing, so the
 * notes stream in the order they are meant to be read. `coalesceNotes` maps
 * these back to the names the rest of the app uses; nothing outside the model
 * boundary sees them.
 */
export const ScriptureReferenceSchema = z.object({
	// Already alphabetical in reading order, so no prefix is needed.
	reference: z.string(),
	timestamp: z.string(),
})

export const SermonSectionSchema = z.object({
	a_title: z.string(),
	b_timestamp: z.string(),
	c_scriptures: z.array(z.string()),
	d_notes: z.array(z.string()),
	e_application: z.string(),
})

export const SermonNotesSchema = z.object({
	a_title: z.string(),
	b_mainIdea: z.string(),
	c_mainTexts: z.array(ScriptureReferenceSchema),
	d_sections: z.array(SermonSectionSchema),
	e_scripturesReferenced: z.array(ScriptureReferenceSchema),
	f_keyTakeaways: z.array(z.string()),
	g_reflectionQuestions: z.array(z.string()),
})

/** The shape the model returns, before it is mapped to `SermonNotesType`. */
export type SermonNotes = z.infer<typeof SermonNotesSchema>
