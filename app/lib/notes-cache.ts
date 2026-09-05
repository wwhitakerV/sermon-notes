import { and, desc, eq, sql } from 'drizzle-orm'
import { conversions, getDb, libraryEntries, videoNotes } from '@/app/lib/db'
import type { SermonNotesType, VideoMetaType } from '@/app/types'

export type LibraryItemType = {
	videoId: string
	title: string
	author: string | null
	thumbnail: string | null
	durationSeconds: number | null
	savedAt: string
}

/**
 * Bump this whenever the notes prompt or the notes schema changes. Cached rows
 * written under an older version read as a miss and are regenerated, so a
 * prompt edit can never serve stale or wrongly shaped notes.
 */
export const NOTES_VERSION = 1

export type CachedNotesType = {
	notes: SermonNotesType
	meta: VideoMetaType | null
}

export async function readCachedNotes(
	videoId: string,
): Promise<CachedNotesType | null> {
	const [row] = await getDb()
		.select({ notes: videoNotes.notes, meta: videoNotes.meta })
		.from(videoNotes)
		.where(
			and(
				eq(videoNotes.videoId, videoId),
				eq(videoNotes.notesVersion, NOTES_VERSION),
			),
		)

	return row ? { notes: row.notes, meta: row.meta ?? null } : null
}

export async function writeCachedNotes(
	videoId: string,
	notes: SermonNotesType,
	meta: VideoMetaType | null,
): Promise<void> {
	await getDb()
		.insert(videoNotes)
		.values({ videoId, notes, meta, notesVersion: NOTES_VERSION })
		.onConflictDoUpdate({
			target: videoNotes.videoId,
			set: { notes, meta, notesVersion: NOTES_VERSION, updatedAt: sql`now()` },
		})
}

/** Idempotent: asking for the same video twice does not duplicate the entry. */
export async function addToLibrary(
	userId: string,
	videoId: string,
): Promise<void> {
	await getDb()
		.insert(libraryEntries)
		.values({ userId, videoId })
		.onConflictDoNothing()
}

/**
 * Whether this account has already paid for these notes. Owning a video means
 * re-opening it is free — nobody is charged twice for the same sermon.
 */
export async function ownsVideo(
	userId: string,
	videoId: string,
): Promise<boolean> {
	const [row] = await getDb()
		.select({ id: libraryEntries.id })
		.from(libraryEntries)
		.where(
			and(
				eq(libraryEntries.userId, userId),
				eq(libraryEntries.videoId, videoId),
			),
		)

	return Boolean(row)
}

/**
 * Moves everything this browser paid for into the account that just signed up.
 *
 * Someone can spend their free video, hit the wall, and only then create an
 * account — the notes they already earned have to follow them. Refunded runs are
 * skipped: those cost nothing and produced nothing.
 */
export async function claimDeviceConversions(
	deviceId: string,
	userId: string,
): Promise<void> {
	const owed = await getDb()
		.selectDistinct({ videoId: conversions.videoId })
		.from(conversions)
		.where(
			and(eq(conversions.deviceId, deviceId), eq(conversions.refunded, false)),
		)

	if (owed.length === 0) {
		return
	}

	await getDb()
		.insert(libraryEntries)
		.values(owed.map(row => ({ userId, videoId: row.videoId })))
		.onConflictDoNothing()
}

/**
 * Everything this account owns, newest first.
 *
 * The join is a left join on purpose — an entry is written the moment someone
 * signs up mid-generation, so for a few seconds it can point at notes that are
 * still being written. Those are held back until there is something to open.
 */
export async function listLibrary(
	userId: string,
): Promise<LibraryItemType[]> {
	const rows = await getDb()
		.select({
			videoId: libraryEntries.videoId,
			savedAt: libraryEntries.createdAt,
			notes: videoNotes.notes,
			meta: videoNotes.meta,
		})
		.from(libraryEntries)
		.leftJoin(videoNotes, eq(videoNotes.videoId, libraryEntries.videoId))
		.where(eq(libraryEntries.userId, userId))
		.orderBy(desc(libraryEntries.createdAt))

	return rows
		.filter(row => row.notes !== null)
		.map(row => ({
			videoId: row.videoId,
			title: row.notes?.title || row.meta?.title || 'Untitled sermon',
			author: row.meta?.author ?? null,
			thumbnail: row.meta?.thumbnail ?? null,
			durationSeconds: row.meta?.durationSeconds ?? null,
			savedAt: row.savedAt.toISOString(),
		}))
}
