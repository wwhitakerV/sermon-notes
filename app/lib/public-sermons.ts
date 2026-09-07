import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { getDb, videoNotes } from '@/app/lib/db'
import { NOTES_VERSION } from './notes-cache'
import type { SermonNotesType, VideoMetaType } from '@/app/types'

export type PublicSermonType = {
	slug: string
	videoId: string
	notes: SermonNotesType
	meta: VideoMetaType | null
	updatedAt: Date
}

/** One published sermon, or null. Free to read, no account. */
export async function readPublicSermon(
	slug: string,
): Promise<PublicSermonType | null> {
	const [row] = await getDb()
		.select({
			slug: videoNotes.slug,
			videoId: videoNotes.videoId,
			notes: videoNotes.notes,
			meta: videoNotes.meta,
			updatedAt: videoNotes.updatedAt,
		})
		.from(videoNotes)
		.where(
			and(
				eq(videoNotes.slug, slug),
				eq(videoNotes.notesVersion, NOTES_VERSION),
			),
		)

	if (!row?.slug) {
		return null
	}

	return {
		slug: row.slug,
		videoId: row.videoId,
		notes: row.notes,
		meta: row.meta ?? null,
		updatedAt: row.updatedAt,
	}
}

/** Everything published, newest first — for the index and the sitemap. */
export async function listPublicSermons(): Promise<
	{ slug: string; title: string; author: string | null; updatedAt: Date }[]
> {
	const rows = await getDb()
		.select({
			slug: videoNotes.slug,
			notes: videoNotes.notes,
			meta: videoNotes.meta,
			updatedAt: videoNotes.updatedAt,
		})
		.from(videoNotes)
		.where(isNotNull(videoNotes.slug))
		.orderBy(desc(videoNotes.updatedAt))

	return rows
		.filter(row => row.slug)
		.map(row => ({
			slug: row.slug as string,
			title: row.notes.title || row.meta?.title || 'Sermon notes',
			author: row.meta?.author ?? null,
			updatedAt: row.updatedAt,
		}))
}

export type CachedSermonType = {
	videoId: string
	slug: string | null
	title: string
	author: string | null
	updatedAt: Date
}

/** Every cached sermon, published or not — the admin's working set. */
export async function listCachedSermons(): Promise<CachedSermonType[]> {
	const rows = await getDb()
		.select({
			videoId: videoNotes.videoId,
			slug: videoNotes.slug,
			notes: videoNotes.notes,
			meta: videoNotes.meta,
			updatedAt: videoNotes.updatedAt,
		})
		.from(videoNotes)
		.orderBy(desc(videoNotes.updatedAt))

	return rows.map(row => ({
		videoId: row.videoId,
		slug: row.slug,
		title: row.notes.title || row.meta?.title || 'Untitled sermon',
		author: row.meta?.author ?? null,
		updatedAt: row.updatedAt,
	}))
}
