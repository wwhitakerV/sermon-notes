/**
 * Kept free of database and `next/headers` imports: `proxy.ts` needs these
 * constants and must not pull the data layer into its bundle.
 */
export const DEVICE_COOKIE = 'sn_device'

/** A year: long enough that the free video does not quietly reset. */
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
