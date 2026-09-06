import { NextResponse } from 'next/server'
import { z } from 'zod'
import { redeemPasswordReset } from '@/app/lib/auth/password-reset'
import { MIN_PASSWORD_LENGTH } from '@/app/lib/auth/password'

const bodySchema = z.object({
	token: z.string().min(8).max(255),
	password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
})

export async function POST(request: Request) {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null))

	if (!parsed.success) {
		return NextResponse.json(
			{
				error: `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
				code: 'invalid_password',
			},
			{ status: 400 },
		)
	}

	const done = await redeemPasswordReset(parsed.data.token, parsed.data.password)

	if (!done) {
		return NextResponse.json(
			{
				error: 'That link has expired or has already been used.',
				code: 'link_dead',
			},
			{ status: 400 },
		)
	}

	// Deliberately not signed in here: they came from a link in an email, and
	// proving they know the new password is one more step worth keeping.
	return NextResponse.json({ reset: true })
}
