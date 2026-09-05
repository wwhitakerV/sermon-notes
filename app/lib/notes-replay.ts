import type {
	PartialSermonNotesType,
	PipelineEventType,
	SermonNotesType,
	VideoMetaType,
} from '@/app/types'
import { coalesceNotes, hasCompleteSection, hasRenderableNotes } from './partial-notes'
import { formatSeconds } from './youtube'

/**
 * How long a run served from cache is stretched over.
 *
 * Not the ~40s a cold run takes: making someone wait out a fake minute for a
 * database read is a cost paid in patience, not perceived value. Long enough to
 * read as work, short enough to feel good.
 */
const CACHED_RUN_MS = 12_000

/** The reveal after signing up — they have already watched the progress run. */
const REVEAL_MS = 5_000

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

type SendType = (event: PipelineEventType) => void

/**
 * Turns finished notes back into the model's prefixed shape — the exact inverse
 * of `coalesceNotes`. Replayed frames therefore travel the same `notes-delta`
 * path a live generation uses, and the client cannot tell the two apart.
 */
export function prefixNotes(notes: SermonNotesType): PartialSermonNotesType {
	return {
		a_title: notes.title,
		b_mainIdea: notes.mainIdea,
		c_mainTexts: notes.mainTexts.map(entry => ({ ...entry })),
		d_sections: notes.sections.map(section => ({
			a_title: section.title,
			b_timestamp: section.timestamp,
			c_scriptures: [...section.scriptures],
			d_notes: [...section.notes],
			e_application: section.application ?? '',
		})),
		e_scripturesReferenced: notes.scripturesReferenced.map(entry => ({
			...entry,
		})),
		f_keyTakeaways: [...notes.keyTakeaways],
		g_reflectionQuestions: [...notes.reflectionQuestions],
	}
}

/**
 * What a signed-out reader is allowed to see: the opening, the first section in
 * full, and the heading and one line of the second.
 *
 * That trailing stub is deliberate. Cutting on a clean section boundary reads
 * as "that is all there was"; letting the page fade out through a half-written
 * list reads as what it is — there is more, and it is behind an account. The
 * rest of the outline, the Scripture index, the takeaways and the questions
 * never leave the server.
 */
export function previewNotes(notes: SermonNotesType): SermonNotesType {
	const [first, second] = notes.sections
	const sections: SermonNotesType['sections'] = []

	if (first) {
		sections.push({
			...first,
			scriptures: [...first.scriptures],
			notes: [...first.notes],
		})
	}

	if (second) {
		sections.push({
			title: second.title,
			timestamp: second.timestamp,
			scriptures: [],
			notes: second.notes.slice(0, 1),
			application: undefined,
		})
	}

	return {
		...emptyNotes(),
		title: notes.title,
		mainIdea: notes.mainIdea,
		mainTexts: notes.mainTexts.map(entry => ({ ...entry })),
		sections,
	}
}

function emptyNotes(): SermonNotesType {
	return {
		title: '',
		mainIdea: '',
		mainTexts: [],
		sections: [],
		scripturesReferenced: [],
		keyTakeaways: [],
		reflectionQuestions: [],
	}
}

/**
 * Rebuilds the notes the way the model wrote them: heading first, then the big
 * idea, then each section and its points one at a time. Cumulative, so every
 * frame is a valid snapshot of "everything so far" — which is what the streamed
 * word animation is driven by.
 */
function notesFrames(notes: SermonNotesType): SermonNotesType[] {
	const frames: SermonNotesType[] = []
	const working = emptyNotes()

	const snapshot = () => {
		frames.push({
			...working,
			mainTexts: [...working.mainTexts],
			sections: working.sections.map(section => ({
				...section,
				scriptures: [...section.scriptures],
				notes: [...section.notes],
			})),
			scripturesReferenced: [...working.scripturesReferenced],
			keyTakeaways: [...working.keyTakeaways],
			reflectionQuestions: [...working.reflectionQuestions],
		})
	}

	working.title = notes.title
	snapshot()

	working.mainIdea = notes.mainIdea
	snapshot()

	for (const text of notes.mainTexts) {
		working.mainTexts.push(text)
		snapshot()
	}

	for (const section of notes.sections) {
		working.sections.push({
			title: section.title,
			timestamp: section.timestamp,
			scriptures: [],
			notes: [],
			application: undefined,
		})
		snapshot()

		const current = working.sections[working.sections.length - 1]

		current.scriptures.push(...section.scriptures)

		for (const note of section.notes) {
			current.notes.push(note)
			snapshot()
		}

		if (section.application) {
			current.application = section.application
			snapshot()
		}
	}

	for (const entry of notes.scripturesReferenced) {
		working.scripturesReferenced.push(entry)
		snapshot()
	}

	for (const takeaway of notes.keyTakeaways) {
		working.keyTakeaways.push(takeaway)
		snapshot()
	}

	for (const question of notes.reflectionQuestions) {
		working.reflectionQuestions.push(question)
		snapshot()
	}

	return frames
}

/**
 * Where the free slice stops, as an index into the replay.
 *
 * A frame belongs to the preview only if narrowing it changes nothing; the
 * first frame that survives narrowing differently is the first one carrying
 * something the reader has not been given. Resuming from there means the notes
 * already on screen are never torn down and rebuilt.
 */
export function previewFrameBoundary(notes: SermonNotesType): number {
	const frames = notesFrames(notes)

	for (let index = 0; index < frames.length; index += 1) {
		const frame = frames[index]

		if (JSON.stringify(previewNotes(frame)) !== JSON.stringify(frame)) {
			return index
		}
	}

	return frames.length
}

/**
 * Streams the notes back frame by frame. `onFrame` lets the caller drive the
 * progress steps off the same milestones a live run uses, so the checklist
 * behaves identically.
 */
export async function replayNotes(
	notes: SermonNotesType,
	send: SendType,
	{
		totalMs = REVEAL_MS,
		startAt = 0,
		onFrame = () => {},
	}: {
		totalMs?: number
		/** Skip everything already on screen. See `previewFrameBoundary`. */
		startAt?: number
		onFrame?: (partial: SermonNotesType) => void
	} = {},
): Promise<void> {
	const frames = notesFrames(notes).slice(startAt)

	// Paced per frame rather than stretched to fill the budget: resuming after
	// the preview leaves far fewer frames, and dividing the same total between
	// them would turn brisk writing into a crawl.
	const perFrame = Math.min(
		Math.max(Math.round(totalMs / Math.max(frames.length, 1)), 60),
		220,
	)

	for (const frame of frames) {
		const prefixed = prefixNotes(frame)

		send({ type: 'notes-delta', notes: prefixed })
		onFrame(coalesceNotes(prefixed))

		await sleep(perFrame)
	}
}

/**
 * A whole run served from cache: the same four progress steps, the same
 * milestones, the same streamed notes — without a transcript fetch or a single
 * model token.
 */
export async function replayCachedRun(
	notes: SermonNotesType,
	meta: VideoMetaType | null,
	send: SendType,
): Promise<SermonNotesType> {
	send({ type: 'step', step: 'sermon', state: 'active' })
	await sleep(700)

	if (meta) {
		send({ type: 'meta', meta })
	}

	send({ type: 'step', step: 'sermon', state: 'done' })
	send({ type: 'step', step: 'transcript', state: 'active' })
	await sleep(1_800)

	send({
		type: 'detail',
		step: 'transcript',
		detail: meta?.durationSeconds
			? `${formatSeconds(meta.durationSeconds)} of teaching`
			: 'Transcript ready',
	})
	await sleep(900)

	send({ type: 'step', step: 'transcript', state: 'done' })
	send({ type: 'step', step: 'understand', state: 'active' })
	await sleep(600)

	let understood = false
	let organized = false

	await replayNotes(notes, send, {
		totalMs: CACHED_RUN_MS,
		onFrame: partial => {
			if (!understood && hasRenderableNotes(partial)) {
				understood = true
				send({ type: 'step', step: 'understand', state: 'done' })
				send({ type: 'step', step: 'organize', state: 'active' })
			}

			if (!organized && hasCompleteSection(partial)) {
				organized = true
				send({ type: 'step', step: 'organize', state: 'done' })
			}
		},
	})

	if (!understood) {
		send({ type: 'step', step: 'understand', state: 'done' })
		send({ type: 'step', step: 'organize', state: 'active' })
	}

	send({
		type: 'detail',
		step: 'organize',
		detail: `${notes.sections.length} sections · ${notes.scripturesReferenced.length} Scriptures`,
	})

	if (!organized) {
		send({ type: 'step', step: 'organize', state: 'done' })
	}

	return notes
}
