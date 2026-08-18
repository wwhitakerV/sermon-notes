import { z } from 'zod'

export const ScriptureReferenceSchema = z.object({
	reference: z.string(),
	timestamp: z.string(),
})

export const SermonSectionSchema = z.object({
	title: z.string(),
	timestamp: z.string(),
	scriptures: z.array(z.string()),
	notes: z.array(z.string()),
	application: z.string(),
})

export const SermonNotesSchema = z.object({
	title: z.string(),
	mainIdea: z.string(),
	mainTexts: z.array(ScriptureReferenceSchema),
	sections: z.array(SermonSectionSchema),
	scripturesReferenced: z.array(ScriptureReferenceSchema),
	keyTakeaways: z.array(z.string()),
})

export type SermonNotes = z.infer<typeof SermonNotesSchema>
