import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

const KEY_BYTES = 64
const SALT_BYTES = 16
const SCHEME = 'scrypt'

export const MIN_PASSWORD_LENGTH = 8

/**
 * scrypt from the standard library: no native build step, no extra dependency,
 * and strong enough for this. Stored as `scrypt$<salt>$<derived>`, so the
 * scheme can change later without a migration.
 */
export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(SALT_BYTES).toString('hex')
	const derived = (await scryptAsync(
		password.normalize('NFKC'),
		salt,
		KEY_BYTES,
	)) as Buffer

	return `${SCHEME}$${salt}$${derived.toString('hex')}`
}

export async function verifyPassword(
	password: string,
	stored: string,
): Promise<boolean> {
	const [scheme, salt, hash] = stored.split('$')

	if (scheme !== SCHEME || !salt || !hash) {
		return false
	}

	const expected = Buffer.from(hash, 'hex')
	const derived = (await scryptAsync(
		password.normalize('NFKC'),
		salt,
		expected.length,
	)) as Buffer

	// `timingSafeEqual` throws on a length mismatch, which would itself leak.
	if (expected.length !== derived.length) {
		return false
	}

	return timingSafeEqual(expected, derived)
}
