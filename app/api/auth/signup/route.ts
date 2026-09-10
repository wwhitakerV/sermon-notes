import { NextResponse } from 'next/server'
import { accountStateFor } from '@/app/lib/account-state'
import {
	credentialsSchema,
	createUser,
	findUserByEmail,
} from '@/app/lib/auth/accounts'
import { logEvent } from '@/app/lib/analytics/events'
import { excludeIfAdmin } from '@/app/lib/analytics/no-track'
import { ensureDevice, linkDeviceToUser, readDeviceId } from '@/app/lib/auth/device'
import { verifyPassword } from '@/app/lib/auth/password'
import { createSession } from '@/app/lib/auth/session'
import { clientIp, rateLimit, tooManyRequests } from '@/app/lib/rate-limit'
import type { UserRowType } from '@/app/lib/db'
import { claimDeviceConversions } from '@/app/lib/notes-cache'

/**
 * One field pair, one button. If the email already has an account and the
 * password matches, this signs them in instead of scolding them — a returning
 * reader should not have to notice which form they are looking at.
 */
export async function POST(request: Request) {
	const parsed = credentialsSchema.safeParse(
		await request.json().catch(() => null),
	)

	if (!parsed.success) {
		return NextResponse.json(
			{
				error: 'Enter an email and a password of at least 8 characters.',
				code: 'invalid_credentials',
			},
			{ status: 400 },
		)
	}

	const throttled = await rateLimit('signup', clientIp(request))

	if (!throttled.allowed) {
		return tooManyRequests(throttled.retryAfter)
	}

	const { email, password } = parsed.data
	const deviceId = await readDeviceId()
	const device = deviceId ? await ensureDevice(deviceId) : null

	const existing = await findUserByEmail(email)

	if (existing) {
		if (!(await verifyPassword(password, existing.passwordHash))) {
			return NextResponse.json(
				{
					error: 'That email already has an account. Check the password.',
					code: 'email_taken',
				},
				{ status: 409 },
			)
		}

		// Signing up with an account you already have is a sign-in, and counting
		// it as a signup would overstate every conversion rate here.
		await excludeIfAdmin(existing.email)

		await logEvent('signin_succeeded', { deviceId, userId: existing.id })

		return signedIn(existing, deviceId)
	}

	const user = await createUser({
		email,
		password,
		// Carried onto the account so a second signup in this browser cannot
		// hand out a second free video.
		freeVideoUsed: device?.freeVideoUsed ?? false,
	})

	if (deviceId) {
		await linkDeviceToUser(deviceId, user.id)
	}

	await excludeIfAdmin(user.email)

	await logEvent('signup_succeeded', { deviceId, userId: user.id })

	return signedIn(user, deviceId)
}

async function signedIn(user: UserRowType, deviceId: string | null) {
	// Whatever this browser already spent a free video or a token on belongs in
	// the account that just appeared — the notes have to follow the person who
	// earned them, whether they registered before or after the run finished.
	if (deviceId) {
		await claimDeviceConversions(deviceId, user.id)
	}

	await createSession(user.id)

	return NextResponse.json(accountStateFor(user))
}
