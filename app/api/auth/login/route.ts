import { NextResponse } from 'next/server'
import { accountStateFor } from '@/app/lib/account-state'
import { findUserByEmail, loginSchema } from '@/app/lib/auth/accounts'
import { readDeviceId } from '@/app/lib/auth/device'
import { verifyPassword } from '@/app/lib/auth/password'
import { createSession } from '@/app/lib/auth/session'
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

	return NextResponse.json(accountStateFor(user))
}
