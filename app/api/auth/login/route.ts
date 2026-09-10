import { NextResponse } from 'next/server'
import { accountStateFor } from '@/app/lib/account-state'
import { findUserByEmail, loginSchema } from '@/app/lib/auth/accounts'
import { logEvent } from '@/app/lib/analytics/events'
import { excludeIfAdmin } from '@/app/lib/analytics/no-track'
import { readDeviceId } from '@/app/lib/auth/device'
import { verifyPassword } from '@/app/lib/auth/password'
import { createSession } from '@/app/lib/auth/session'
import { clientIp, rateLimit, tooManyRequests } from '@/app/lib/rate-limit'
import { claimDeviceConversions } from '@/app/lib/notes-cache'

export async function POST(request: Request) {
	const parsed = loginSchema.safeParse(
		await request.json().catch(() => null),
	)

	if (!parsed.success) {
		return NextResponse.json(
			{ error: 'Enter your email and password.', code: 'invalid_credentials' },
			{ status: 400 },
		)
	}

	// Both, because one IP trying many accounts and many IPs trying one account
	// are different attacks and only one of them is stopped by each key.
	for (const subject of [clientIp(request), parsed.data.email]) {
		const { allowed, retryAfter } = await rateLimit('login', subject)

		if (!allowed) {
			return tooManyRequests(retryAfter)
		}
	}

	const user = await findUserByEmail(parsed.data.email)

	// One message for both halves, so this cannot be used to enumerate accounts.
	if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
		return NextResponse.json(
			{ error: 'That email and password do not match.', code: 'bad_login' },
			{ status: 401 },
		)
	}

	const deviceId = await readDeviceId()

	if (deviceId) {
		await claimDeviceConversions(deviceId, user.id)
	}

	await createSession(user.id)

	// Before the event, not after: otherwise your own sign-in is the one
	// thing that always gets counted.
	await excludeIfAdmin(user.email)

	await logEvent('signin_succeeded', { deviceId, userId: user.id })

	return NextResponse.json(accountStateFor(user))
}
