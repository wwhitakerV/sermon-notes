/**
 * Top-level paths a published sermon must never take.
 *
 * Next resolves a static segment before a dynamic one, so a sermon slugged
 * "library" would not break the library — it would simply be unreachable
 * itself, which is worse because nothing would look wrong.
 */
const RESERVED = new Set([
	'admin',
	'api',
	'library',
	'notes',
	'privacy',
	'reset',
	'settings',
	'terms',
	'icon.svg',
	'sitemap.xml',
	'robots.txt',
	'favicon.ico',
	'_next',
])

/** `Living in a Perverse World (Philippians 2:12-16)` → `living-in-a-perverse-world-philippians-2-12-16` */
export function slugify(title: string): string {
	return title
		.normalize('NFKD')
		// Strip accents, then anything that is not a letter, number or space.
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 90)
		.replace(/-+$/g, '')
}

export function isReservedSlug(slug: string): boolean {
	return RESERVED.has(slug)
}
