import { createHmac, timingSafeEqual } from 'node:crypto'

const SEPARATOR = '.'

function secret(): string {
	const value = process.env.SESSION_SECRET

	if (!value) {
		throw new Error(
			'SESSION_SECRET is not set. Generate one with `openssl rand -base64 32`.',
		)
	}

	return value
}

function digest(value: string): string {
	return createHmac('sha256', secret()).update(value).digest('base64url')
}

/** `<value>.<hmac>` — tamper-evident, not secret. */
export function signValue(value: string): string {
	return `${value}${SEPARATOR}${digest(value)}`
}

/** Returns the original value, or null if the signature does not hold up. */
export function unsignValue(signed: string | undefined | null): string | null {
	if (!signed) {
		return null
	}

	const index = signed.lastIndexOf(SEPARATOR)

	if (index <= 0) {
		return null
	}

	const value = signed.slice(0, index)
	const provided = Buffer.from(signed.slice(index + 1))
	const expected = Buffer.from(digest(value))

	if (provided.length !== expected.length) {
		return null
	}

	return timingSafeEqual(provided, expected) ? value : null
}
