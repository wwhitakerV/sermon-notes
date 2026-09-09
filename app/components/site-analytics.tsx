'use client'

import { Analytics } from '@vercel/analytics/next'
import { isReservedSlug } from '@/app/lib/slug'

/**
 * Page views for the three places that tell us anything: the homepage, the
 * notes someone generated, and the public sermon pages handed out for
 * marketing. Everything else is dropped in the browser before it is sent.
 *
 * `/reset/<token>` is the one that has to go. The raw path carries a live
 * password-reset token, and an analytics dashboard is no place to keep a
 * working credential.
 */
export function SiteAnalytics() {
	return (
		<Analytics
			beforeSend={event => {
				let pathname: string

				try {
					pathname = new URL(event.url).pathname
				} catch {
					return null
				}

				if (pathname === '/') return event
				if (pathname.startsWith('/notes/')) return event

				// A lone segment that isn't one of ours is a published sermon.
				const segments = pathname.split('/').filter(Boolean)

				return segments.length === 1 && !isReservedSlug(segments[0])
					? event
					: null
			}}
		/>
	)
}
