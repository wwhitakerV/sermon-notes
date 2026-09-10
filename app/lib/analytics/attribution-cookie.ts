/**
 * Where a visit came from, carried in a short-lived cookie.
 *
 * Kept free of database and `next/headers` imports: `proxy.ts` needs these and
 * must not pull the data layer into its bundle. Mirrors `auth/device-cookie`.
 *
 * Not signed, unlike the device id. Everything in here is client-asserted
 * anyway — the `Referer` header and the query string both come from the
 * browser — so signing would only make forged attribution harder to type, not
 * harder to mean. The defence that matters is refusing to store anything long
 * or unexpected, below.
 */
export const ATTRIBUTION_COOKIE = 'sn_attr'

/** Long enough to outlive a visit, short enough that the next one is its own. */
export const ATTRIBUTION_COOKIE_MAX_AGE = 60 * 30

export type AttributionType = {
	/** Referring host only. The full URL can carry someone's search terms. */
	ref?: string
	source?: string
	medium?: string
	campaign?: string
	/** The page they came in on. */
	landing?: string
}

const FIELD_MAX = 80

function clean(value: string | null | undefined): string | undefined {
	const trimmed = value?.trim().slice(0, FIELD_MAX)

	return trimmed || undefined
}

/**
 * What this request says about where the visitor came from, or null if it says
 * nothing — an internal navigation, or a direct visit with no campaign tags.
 */
export function attributionFrom(
	url: URL,
	referrer: string | null,
): AttributionType | null {
	let ref: string | undefined

	if (referrer) {
		try {
			const host = new URL(referrer).host

			// Our own pages are not a referrer, they are the middle of a visit.
			if (host && host !== url.host) {
				ref = clean(host)
			}
		} catch {
			// An unparseable Referer is no referrer.
		}
	}

	const attribution: AttributionType = {
		ref,
		source: clean(url.searchParams.get('utm_source')),
		medium: clean(url.searchParams.get('utm_medium')),
		campaign: clean(url.searchParams.get('utm_campaign')),
	}

	if (!attribution.ref && !attribution.source && !attribution.campaign) {
		return null
	}

	attribution.landing = clean(url.pathname)

	return attribution
}

export function encodeAttribution(attribution: AttributionType): string {
	return encodeURIComponent(JSON.stringify(attribution))
}

/** Parses the cookie back, discarding anything that is not the shape above. */
export function decodeAttribution(
	value: string | undefined,
): AttributionType | null {
	if (!value) {
		return null
	}

	try {
		const parsed: unknown = JSON.parse(decodeURIComponent(value))

		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return null
		}

		const attribution: AttributionType = {}

		for (const key of ['ref', 'source', 'medium', 'campaign', 'landing'] as const) {
			const field = (parsed as Record<string, unknown>)[key]

			if (typeof field === 'string') {
				attribution[key] = clean(field)
			}
		}

		return Object.values(attribution).some(Boolean) ? attribution : null
	} catch {
		return null
	}
}
