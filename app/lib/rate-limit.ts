import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/db'

export type LimitType = {
	/** How many attempts are allowed inside the window. */
	max: number
	/** Window length in seconds. */
	windowSeconds: number
}

/** The limits, in one place, so they can be read against each other. */
export const LIMITS = {
	/** Guessing a password. Generous enough for a real typo streak. */
	login: { max: 10, windowSeconds: 15 * 60 },
	/** Making accounts in bulk. */
	signup: { max: 5, windowSeconds: 60 * 60 },
	/** Each of these sends an email we pay for, so this one is tight. */
	forgot: { max: 3, windowSeconds: 60 * 60 },
	/** Guessing reset tokens. */
	reset: { max: 10, windowSeconds: 60 * 60 },
	/** Filling the feedback table. */
	feedback: { max: 5, windowSeconds: 60 * 60 },
} satisfies Record<string, LimitType>

/**
 * Best available identity for an anonymous caller.
 *
 * `x-forwarded-for` is a chain and only the first entry is the client; the rest
 * are proxies. Trustworthy behind Vercel, which rewrites it — never trust it on
 * a server anyone can reach directly.
 */
export function clientIp(request: Request): string {
	const forwarded = request.headers.get('x-forwarded-for')

	return (
		forwarded?.split(',')[0]?.trim() ||
		request.headers.get('x-real-ip')?.trim() ||
		'unknown'
	)
}

/**
 * Counts one attempt and says whether it is allowed.
 *
 * One statement: the row is created, or its counter advanced, or its window
 * rolled over if the old one has passed — so two requests arriving together
 * cannot both read a stale count and both decide they are under the limit.
 */
export async function rateLimit(
	action: keyof typeof LIMITS,
	subject: string,
): Promise<{ allowed: boolean; retryAfter: number }> {
	const { max, windowSeconds } = LIMITS[action]
	const key = `${action}:${subject}`.slice(0, 512)

	const result = await getDb().execute(sql`
		INSERT INTO rate_limits (key, count, window_start)
		VALUES (${key}, 1, now())
		ON CONFLICT (key) DO UPDATE SET
			count = CASE
				WHEN rate_limits.window_start < now() - (${windowSeconds} * interval '1 second')
				THEN 1
				ELSE rate_limits.count + 1
			END,
			window_start = CASE
				WHEN rate_limits.window_start < now() - (${windowSeconds} * interval '1 second')
				THEN now()
				ELSE rate_limits.window_start
			END
		RETURNING count, extract(epoch from (window_start + (${windowSeconds} * interval '1 second') - now())) AS retry_after
	`)

	const row = firstRow<{ count: number; retry_after: number }>(result)

	if (!row) {
		// A counter that cannot be read must not lock people out of the product.
		return { allowed: true, retryAfter: 0 }
	}

	return {
		allowed: Number(row.count) <= max,
		retryAfter: Math.max(1, Math.ceil(Number(row.retry_after))),
	}
}

/** The response to send when a caller is over the limit. */
export function tooManyRequests(retryAfter: number): NextResponse {
	return NextResponse.json(
		{
			error: 'Too many attempts. Please wait a moment and try again.',
			code: 'rate_limited',
		},
		{ status: 429, headers: { 'Retry-After': String(retryAfter) } },
	)
}

function firstRow<T>(result: unknown): T | null {
	const rows = Array.isArray(result)
		? result
		: ((result as { rows?: unknown[] })?.rows ?? [])

	return (rows[0] as T) ?? null
}
