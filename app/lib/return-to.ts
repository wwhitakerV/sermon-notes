/** Query key carrying where someone was headed before being asked to sign in. */
export const RETURN_TO = 'next'

/** The home page, remembering where to put them once they are signed in. */
export function signInUrl(pathname: string): string {
	return `/?${RETURN_TO}=${encodeURIComponent(pathname)}`
}

/**
 * Only ever a path on this site.
 *
 * Anything else — an absolute URL, or the `//evil.com` form a browser reads as
 * protocol-relative — would turn the sign-in flow into an open redirect, which
 * is a gift to anyone writing a phishing email.
 */
export function safeReturnTo(value: string | null): string | null {
	if (!value || !value.startsWith('/') || value.startsWith('//')) {
		return null
	}

	return value
}
