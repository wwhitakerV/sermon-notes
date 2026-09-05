import { cookies } from 'next/headers'
import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import { getDb, sessions, users } from '@/app/lib/db'
import type { UserRowType } from '@/app/lib/db'
import { SESSION_COOKIE } from './session-cookie'

export { SESSION_COOKIE } from './session-cookie'

const SESSION_MAX_AGE = 60 * 60 * 24 * 30

/**
 * Only the hash is stored, so the sessions table cannot be replayed as a set
 * of working logins if it ever leaks.
 */
function fingerprint(token: string): string {
	return createHash('sha256').update(token).digest('hex')
}

function cookieOptions() {
	return {
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: process.env.NODE_ENV === 'production',
		path: '/',
	}
}

/**
 * Issues a session and sets the cookie. Must be called from a Route Handler or
 * Server Function — Next cannot set cookies once a response has started
 * streaming, which is exactly what `/api/transcript` does.
 */
export async function createSession(userId: string): Promise<void> {
	const token = randomBytes(32).toString('base64url')
	const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000)

	await getDb()
		.insert(sessions)
		.values({ id: fingerprint(token), userId, expiresAt })

	const store = await cookies()

	store.set({
		name: SESSION_COOKIE,
		value: token,
		maxAge: SESSION_MAX_AGE,
		...cookieOptions(),
	})
}

/** The signed-in account, or null. Expired sessions read as signed out. */
export async function currentUser(): Promise<UserRowType | null> {
	const store = await cookies()
	const token = store.get(SESSION_COOKIE)?.value

	if (!token) {
		return null
	}

	const [row] = await getDb()
		.select({ user: users })
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(
			and(
				eq(sessions.id, fingerprint(token)),
				gt(sessions.expiresAt, new Date()),
			),
		)

	return row?.user ?? null
}

export async function destroySession(): Promise<void> {
	const store = await cookies()
	const token = store.get(SESSION_COOKIE)?.value

	if (token) {
		await getDb().delete(sessions).where(eq(sessions.id, fingerprint(token)))
	}

	store.delete(SESSION_COOKIE)
}
