/**
 * One switch that silences both analytics systems for a browser.
 *
 * Deliberately **not** httpOnly: the Vercel Web Analytics filter runs in the
 * page, so it has to be able to read this. Nothing is protected by it — forging
 * it only removes your own activity from your own numbers — so it is not signed
 * either.
 *
 * Kept free of `next/headers` so the client component can import the name.
 */
export const NO_TRACK_COOKIE = 'sn_no_track'

/** A year, matching the device cookie: this should outlive a laptop rebuild. */
export const NO_TRACK_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
