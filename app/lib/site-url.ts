/**
 * The public origin, for links that leave the app.
 *
 * A reset link has to be absolute, and it must not be built from the request:
 * an attacker who can set the Host header could otherwise have the email point
 * at their own domain.
 */
export function siteUrl(): string {
	const configured = process.env.NEXT_PUBLIC_SITE_URL

	if (configured) {
		return configured.replace(/\/$/, '')
	}

	// Vercel provides this for every deployment, so previews work too.
	if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
		return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
	}

	return 'http://localhost:3000'
}
