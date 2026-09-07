import type { MetadataRoute } from 'next'
import { siteUrl } from '@/app/lib/site-url'

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: '*',
			allow: '/',
			// Nothing here is secret, but these all bounce a signed-out visitor,
			// so there is nothing for a crawler to find.
			disallow: ['/api/', '/library', '/settings', '/notes/', '/reset/'],
		},
		sitemap: `${siteUrl()}/sitemap.xml`,
	}
}
