import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { currentAdmin } from '@/app/lib/admin'
import { getDb, videoNotes } from '@/app/lib/db'

const bodySchema = z.object({ videoId: z.string().min(4).max(64) })

/** Takes the page down. The notes stay cached and keep serving paying readers. */
export async function POST(request: Request) {
	const admin = await currentAdmin()

	if (!admin) {
		return NextResponse.json(
			{ error: 'Not found.', code: 'not_found' },
			{ status: 404 },
		)
	}

	const parsed = bodySchema.safeParse(await request.json().catch(() => null))

	if (!parsed.success) {
		return NextResponse.json(
			{ error: 'Missing sermon.', code: 'bad_request' },
			{ status: 400 },
		)
	}

	await getDb()
		.update(videoNotes)
		.set({ slug: null })
		.where(eq(videoNotes.videoId, parsed.data.videoId))

	return NextResponse.json({ unpublished: true })
}
