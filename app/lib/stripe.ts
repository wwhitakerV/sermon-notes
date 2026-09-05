import Stripe from 'stripe'

let cached: Stripe | null = null

/**
 * Resolved on first use rather than at import time, so a missing key surfaces
 * as a request-time error instead of breaking the build for the routes that
 * never take money.
 */
export function getStripe(): Stripe {
	if (!cached) {
		const key = process.env.STRIPE_SECRET_KEY

		if (!key) {
			throw new Error('STRIPE_SECRET_KEY is not set.')
		}

		// Pinned so the objects we receive keep the shape these routes were
		// written against, whatever the account default later becomes.
		cached = new Stripe(key, { apiVersion: '2026-08-26.dahlia' })
	}

	return cached
}
