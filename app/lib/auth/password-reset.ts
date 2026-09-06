import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { getDb, passwordResets, sessions, users } from '@/app/lib/db'
import type { UserRowType } from '@/app/lib/db'
import { hashPassword } from './password'

/** Long enough to find the email, short enough to matter if it leaks. */
const RESET_MAX_AGE_MS = 60 * 60 * 1000

function fingerprint(token: string): string {
	return createHash('sha256').update(token).digest('hex')
}

/**
 * Issues a reset ticket and returns the raw token for the email. Only the hash
 * is stored, so the link cannot be reconstructed from the database.
 */
export async function createPasswordReset(userId: string): Promise<string> {
	const db = getDb()
	const token = randomBytes(32).toString('base64url')

	// Asking again should not leave the earlier links working.
	await db.delete(passwordResets).where(eq(passwordResets.userId, userId))

	await db.insert(passwordResets).values({
		id: fingerprint(token),
		userId,
		expiresAt: new Date(Date.now() + RESET_MAX_AGE_MS),
	})

	return token
}

/** The account a live, unused ticket belongs to, or null. */
export async function readPasswordReset(
	token: string,
): Promise<UserRowType | null> {
	const [row] = await getDb()
		.select({ user: users })
		.from(passwordResets)
		.innerJoin(users, eq(users.id, passwordResets.userId))
		.where(
			and(
				eq(passwordResets.id, fingerprint(token)),
				gt(passwordResets.expiresAt, new Date()),
				isNull(passwordResets.usedAt),
			),
		)

	return row?.user ?? null
}

/**
 * Sets the new password and closes the door behind it: the ticket is spent, and
 * every session on the account ends. Whoever prompted the reset may be the one
 * who should be signed out.
 */
export async function redeemPasswordReset(
	token: string,
	password: string,
): Promise<boolean> {
	const db = getDb()
	const id = fingerprint(token)

	// Claimed conditionally, so two submissions of the same link cannot both
	// win and the second cannot set a different password.
	const claimed = await db
		.update(passwordResets)
		.set({ usedAt: new Date() })
		.where(
			and(
				eq(passwordResets.id, id),
				gt(passwordResets.expiresAt, new Date()),
				isNull(passwordResets.usedAt),
			),
		)
		.returning({ userId: passwordResets.userId })

	if (claimed.length === 0) {
		return false
	}

	const { userId } = claimed[0]

	await db
		.update(users)
		.set({ passwordHash: await hashPassword(password) })
		.where(eq(users.id, userId))

	await db.delete(sessions).where(eq(sessions.userId, userId))

	return true
}
