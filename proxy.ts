import { NextResponse, type NextRequest } from 'next/server'
import {
	DEVICE_COOKIE,
	DEVICE_COOKIE_MAX_AGE,
} from '@/app/lib/auth/device-cookie'
import { SESSION_COOKIE } from '@/app/lib/auth/session-cookie'
import { signInUrl } from '@/app/lib/return-to'
import { signValue, unsignValue } from '@/app/lib/auth/signed-value'

/**
 * Screens that belong to an account. Everything a signed-out visitor may reach
 * lives at `/` — including a run in progress, which never leaves that route
 * because the notes are only handed over once there is somewhere to file them.
 */
const ACCOUNT_ONLY = ['/library', '/settings', '/notes']

function needsAccount(pathname: string): boolean {
	return ACCOUNT_ONLY.some(
		prefix => pathname === prefix || pathname.startsWith(`${prefix}/`),
	)
}

/**
 * Every visitor gets a signed, httpOnly device id on their first request. It is
 * what the free video is tracked against, so it has to exist before anything
 * can be generated — and `/api/transcript` streams its response, which means
 * it can no longer set cookies by the time it knows it needs one.
 *
 * This only mints the cookie. The matching row is written lazily on first use;
 * proxy runs on every request and has no business touching the database.
 */
export function proxy(request: NextRequest) {
	/**
	 * An optimistic check only: no session cookie at all means definitely signed
	 * out, and that is worth catching here without a database round trip on
	 * every request. A cookie that exists but is expired or forged gets past
	 * this and is turned away by the page itself, which is the authority.
	 */
	const turnAway =
		needsAccount(request.nextUrl.pathname) &&
		!request.cookies.get(SESSION_COOKIE)

	const home = () =>
		new URL(
			signInUrl(request.nextUrl.pathname + request.nextUrl.search),
			request.url,
		)

	if (unsignValue(request.cookies.get(DEVICE_COOKIE)?.value)) {
		return turnAway
			? NextResponse.redirect(home())
			: NextResponse.next()
	}

	const signed = signValue(crypto.randomUUID())

	// Handed to the current request as well as the browser, so a route handler
	// reached before the browser has stored the cookie still sees the same id.
	// Set rather than appended: a stale or forged value must not be left sitting
	// ahead of the new one in the same `Cookie` header, where which id wins would
	// come down to lookup order.
	request.cookies.set(DEVICE_COOKIE, signed)

	// Redirected or not, the visitor still leaves with a device id — it is what
	// their free video is tracked against.
	const response = turnAway
		? NextResponse.redirect(home())
		: NextResponse.next({ request })

	response.cookies.set({
		name: DEVICE_COOKIE,
		value: signed,
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		maxAge: DEVICE_COOKIE_MAX_AGE,
	})

	return response
}

export const config = {
	matcher: [
		/*
		 * Everything except Next's own assets and static files — the cookie is
		 * only needed on requests that can reach application code.
		 */
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
	],
}
