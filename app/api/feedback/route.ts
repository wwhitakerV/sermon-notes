import { NextResponse } from 'next/server'
import { z } from 'zod'
import { readDeviceId } from '@/app/lib/auth/device'
import { currentUser } from '@/app/lib/auth/session'
import { feedback, getDb } from '@/app/lib/db'

const bodySchema = z.object({
	rating: z.number().int().min(1).max(5),
	comment: z.string().max(2000).optional(),
	path: z.string().max(512).optional(),
})

/**
 * Open to everyone, signed in or not — the people most likely to say something
 * blunt are the ones who have not signed up.
 */
export async function POST(request: Request) {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null))

	if (!parsed.success) {
		return NextResponse.json(
			{ error: 'Pick a rating from one to five.', code: 'invalid_feedback' },
			{ status: 400 },
		)
	}

	const user = await currentUser()

	await getDb()
		.insert(feedback)
		.values({
			userId: user?.id ?? null,
			deviceId: await readDeviceId(),
			rating: parsed.data.rating,
			comment: parsed.data.comment?.trim() || null,
			path: parsed.data.path ?? null,
		})

	return NextResponse.json({ received: true })
}
