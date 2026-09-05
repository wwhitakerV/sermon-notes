import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb, users } from '@/app/lib/db'
import type { UserRowType } from '@/app/lib/db'
import { MIN_PASSWORD_LENGTH, hashPassword } from './password'

/** Stored and compared lowercased, so casing never splits an account in two. */
export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase()
}

export const credentialsSchema = z.object({
	email: z.email().max(254).transform(normalizeEmail),
	password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
})

export type CredentialsType = z.infer<typeof credentialsSchema>

/**
 * Signing in only checks that something was typed. The length rule guards the
 * passwords we create, not the ones we compare — an existing account must be
 * told its password is wrong, not that it is too short.
 */
export const loginSchema = z.object({
	email: z.email().max(254).transform(normalizeEmail),
	password: z.string().min(1).max(200),
})

export async function findUserByEmail(
	email: string,
): Promise<UserRowType | null> {
	const [row] = await getDb()
		.select()
		.from(users)
		.where(eq(users.email, normalizeEmail(email)))

	return row ?? null
}

/**
 * `freeVideoUsed` is passed in from the signing-up device and written with the
 * row itself, not patched on afterwards — if anything later in signup fails,
 * the account still cannot claim a free video the browser already spent.
 */
export async function createUser({
	email,
	password,
	freeVideoUsed,
}: CredentialsType & { freeVideoUsed: boolean }): Promise<UserRowType> {
	const [row] = await getDb()
		.insert(users)
		.values({
			email: normalizeEmail(email),
			passwordHash: await hashPassword(password),
			freeVideoUsed,
		})
		.returning()

	return row
}
