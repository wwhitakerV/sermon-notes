import type { MetadataRoute } from 'next'
import { listPublicSermons } from '@/app/lib/public-sermons'
import { siteUrl } from '@/app/lib/site-url'

/**
 * Published sermons are the pages worth finding, so they go in the sitemap
 * alongside the handful of fixed ones. The account screens are deliberately
 * absent — they redirect signed-out visitors, and a crawler is always one.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const base = siteUrl()

	const sermons = await listPublicSermons().catch(() => [])

	return [
		{ url: base, changeFrequency: 'weekly', priority: 1 },
		{ url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.3 },
		{ url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
		...sermons.map(sermon => ({
			url: `${base}/${sermon.slug}`,
			lastModified: sermon.updatedAt,
			changeFrequency: 'monthly' as const,
			priority: 0.8,
		})),
	]
}
