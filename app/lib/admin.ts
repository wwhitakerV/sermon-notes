import { currentUser } from './auth/session'
import type { UserRowType } from './db'

/**
 * Admins are named in the environment rather than flagged in the database.
 *
 * There is one of you. A column would mean a migration, a way to set it, and a
 * way to get it wrong; an env var cannot be escalated to from inside the app,
 * which is the property that actually matters here.
 */
function adminEmails(): string[] {
	return (process.env.ADMIN_EMAILS ?? '')
		.split(',')
		.map(entry => entry.trim().toLowerCase())
		.filter(Boolean)
}

export function isAdminEmail(email: string): boolean {
	return adminEmails().includes(email.trim().toLowerCase())
}

/** The signed-in admin, or null. */
export async function currentAdmin(): Promise<UserRowType | null> {
	const user = await currentUser()

	return user && isAdminEmail(user.email) ? user : null
}
