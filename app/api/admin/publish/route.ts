import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { currentAdmin } from '@/app/lib/admin'
import { getDb, videoNotes } from '@/app/lib/db'
import { readCachedNotes, writeCachedNotes } from '@/app/lib/notes-cache'
import { describeError, runPipeline } from '@/app/lib/pipeline'
import { isReservedSlug, slugify } from '@/app/lib/slug'
import { extractVideoId, watchUrl } from '@/app/lib/youtube'

/** Generating a sermon from cold takes longer than the default allowance. */
export const maxDuration = 60

const bodySchema = z.object({
	url: z.string().min(4).max(500),
	slug: z.string().max(120).optional(),
})

/**
 * Publishes a sermon at `/<slug>`, generating it first if it is not cached.
 *
 * Deliberately outside the entitlement system: these pages are marketing, paid
 * for out of the same pocket that pays the OpenAI bill, and making the owner
 * spend tokens on their own shop window would be daft.
 */
export async function POST(request: Request) {
	const admin = await currentAdmin()

	if (!admin) {
		return NextResponse.json(
			{ error: 'Not found.', code: 'not_found' },
			{ status: 404 },
		)
	}

	const parsed = bodySchema.safeParse(await request.json().catch(() => null))
	const videoId = parsed.success ? extractVideoId(parsed.data.url) : null

	if (!parsed.success || !videoId) {
		return NextResponse.json(
			{ error: "That doesn't look like a YouTube link.", code: 'invalid_url' },
			{ status: 400 },
		)
	}

	const db = getDb()

	let cached = await readCachedNotes(videoId)
	let generated = false

	if (!cached) {
		try {
			const result = await runPipeline(watchUrl(videoId))

			await writeCachedNotes(videoId, result.notes, result.meta)

			cached = { notes: result.notes, meta: result.meta }
			generated = true
		} catch (error) {
			console.error(error)

			return NextResponse.json(describeError(error), { status: 502 })
		}
	}

	const slug = slugify(parsed.data.slug || cached.notes.title)

	if (!slug) {
		return NextResponse.json(
			{ error: 'That title makes an empty address. Set one yourself.', code: 'bad_slug' },
			{ status: 400 },
		)
	}

	if (isReservedSlug(slug)) {
		return NextResponse.json(
			{ error: `"${slug}" collides with a page in the app.`, code: 'bad_slug' },
			{ status: 409 },
		)
	}

	const [clash] = await db
		.select({ videoId: videoNotes.videoId })
		.from(videoNotes)
		.where(eq(videoNotes.slug, slug))

	if (clash && clash.videoId !== videoId) {
		return NextResponse.json(
			{ error: `"${slug}" is already taken by another sermon.`, code: 'bad_slug' },
			{ status: 409 },
		)
	}

	await db
		.update(videoNotes)
		.set({ slug })
		.where(eq(videoNotes.videoId, videoId))

	return NextResponse.json({
		slug,
		videoId,
		title: cached.notes.title,
		generated,
	})
}
