/**
 * Publishes a cached sermon at sermondrop.app/<slug>, free and open.
 *
 *   node scripts/publish-sermon.mjs <videoId> [custom-slug]
 *   node scripts/publish-sermon.mjs --cached
 *   node scripts/publish-sermon.mjs --list
 *   node scripts/publish-sermon.mjs --unpublish <videoId>
 *
 * Works against whatever DATABASE_URL points at, so publishing to production
 * means passing the production string explicitly.
 */
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

for (const line of readFileSync('.env', 'utf8').split('\n')) {
	const match = line.match(/^([A-Z_]+)=(.*)$/)
	if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
}

const RESERVED = new Set(['api','library','notes','privacy','reset','settings','terms','icon.svg','sitemap.xml','robots.txt','favicon.ico','_next'])

const slugify = title =>
	title.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
		.replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '').slice(0, 90).replace(/-+$/g, '')

const sql = neon(process.env.DATABASE_URL)
const [command, second] = process.argv.slice(2)

if (command === '--list') {
	const rows = await sql`select slug, video_id, notes->>'title' as title from video_notes where slug is not null order by updated_at desc`
	if (!rows.length) console.log('nothing published yet')
	for (const r of rows) console.log(`  /${r.slug}\n      ${r.title}  (${r.video_id})`)
	process.exit(0)
}

if (command === '--cached') {
	const rows = await sql`select video_id, slug, notes->>'title' as title, meta->>'author' as author from video_notes order by updated_at desc`
	if (!rows.length) console.log('nothing cached yet — generate a sermon in the app first')
	for (const r of rows) {
		console.log(`  ${r.video_id}  ${r.slug ? 'published' : '—        '}  ${r.title}`)
		if (r.author) console.log(`                            ${r.author}`)
	}
	process.exit(0)
}

if (command === '--unpublish') {
	const rows = await sql`update video_notes set slug = null where video_id = ${second} returning video_id`
	console.log(rows.length ? `unpublished ${second}` : `no cached sermon with id ${second}`)
	process.exit(0)
}

if (!command) {
	console.log('usage: node scripts/publish-sermon.mjs <videoId> [slug] | --cached | --list | --unpublish <videoId>')
	process.exit(1)
}

const [row] = await sql`select video_id, notes->>'title' as title from video_notes where video_id = ${command}`

if (!row) {
	console.error(`no cached sermon with id ${command} — generate it once first`)
	process.exit(1)
}

const slug = second ? slugify(second) : slugify(row.title)

if (!slug) {
	console.error('that title produces an empty slug — pass one explicitly')
	process.exit(1)
}

if (RESERVED.has(slug)) {
	console.error(`"${slug}" collides with an app route — pass a different one`)
	process.exit(1)
}

const [clash] = await sql`select video_id from video_notes where slug = ${slug} and video_id <> ${command}`

if (clash) {
	console.error(`"${slug}" is already used by ${clash.video_id}`)
	process.exit(1)
}

await sql`update video_notes set slug = ${slug} where video_id = ${command}`
console.log(`published:  /${slug}\n            ${row.title}`)
