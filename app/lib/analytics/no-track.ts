import { cookies } from 'next/headers'
import { isAdminEmail } from '@/app/lib/admin'
import {
	NO_TRACK_COOKIE,
	NO_TRACK_COOKIE_MAX_AGE,
} from './no-track-cookie'

export async function isNoTrack(): Promise<boolean> {
	const store = await cookies()

	return store.get(NO_TRACK_COOKIE)?.value === '1'
}

export async function setNoTrack(on: boolean): Promise<void> {
	const store = await cookies()

	if (!on) {
		store.delete(NO_TRACK_COOKIE)

		return
	}

	store.set({
		name: NO_TRACK_COOKIE,
		value: '1',
		// Readable by the page: the Vercel Analytics filter runs in the browser.
		httpOnly: false,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		maxAge: NO_TRACK_COOKIE_MAX_AGE,
	})
}

/**
 * Signing in as an admin excludes that browser automatically, so your own
 * testing never has to be remembered about — and a new laptop or a cleared
 * cookie jar re-excludes itself the next time you sign in.
 */
export async function excludeIfAdmin(email: string): Promise<void> {
	if (isAdminEmail(email)) {
		await setNoTrack(true)
	}
}
