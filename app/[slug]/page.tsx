import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowRightIcon } from '@/app/components/icons'
import { SiteHeader } from '@/app/components/site-header'
import { listPublicSermons, readPublicSermon } from '@/app/lib/public-sermons'
import { isReservedSlug } from '@/app/lib/slug'
import { siteUrl } from '@/app/lib/site-url'
import { PublicNotes } from './public-notes'

/**
 * A published sermon, free and open.
 *
 * No account, no cut, no blur — the whole point is that someone arriving from a
 * comment or a search result gets the thing they were promised. The hope is
 * that having read one they try a sermon of their own, which is where the
 * account and the token come in.
 */
export async function generateMetadata({
	params,
}: PageProps<'/[slug]'>): Promise<Metadata> {
	const { slug } = await params
	const sermon = await readPublicSermon(slug)

	if (!sermon) {
		return { title: 'Sermon notes — Sermon Drop' }
	}

	const title = `${sermon.notes.title} — sermon notes`
	const description =
		sermon.notes.mainIdea.slice(0, 155) ||
		'Study notes with the outline, Scriptures and reflection questions.'
	const url = `${siteUrl()}/${sermon.slug}`

	return {
		title,
		description,
		alternates: { canonical: url },
		openGraph: {
			title,
			description,
			url,
			type: 'article',
			siteName: 'Sermon Drop',
			images: sermon.meta?.thumbnail ? [sermon.meta.thumbnail] : undefined,
		},
		twitter: {
			card: 'summary_large_image',
			title,
			description,
		},
	}
}

export default async function PublicSermonPage({
	params,
}: PageProps<'/[slug]'>) {
	const { slug } = await params

	if (isReservedSlug(slug)) {
		notFound()
	}

	const sermon = await readPublicSermon(slug)

	if (!sermon) {
		notFound()
	}

	const others = (await listPublicSermons())
		.filter(item => item.slug !== sermon.slug)
		.slice(0, 4)

	return (
		<main className="flex-1">
			<SiteHeader />
			<PublicNotes notes={sermon.notes} meta={sermon.meta} />

			<div className="mx-auto w-full max-w-5xl px-6 pb-24">
				<div className="border-accent bg-surface rounded-r-xl border-l-2 py-6 pr-6 pl-6 shadow-[0_1px_2px_rgb(26_24_21/0.04)]">
					<p className="text-ink-faint text-[0.6875rem] font-medium tracking-[0.14em] uppercase">
						These notes were made by Sermon Drop
					</p>
					<p className="font-serif mt-3 text-[1.25rem] leading-snug font-medium text-balance">
						Do this with any sermon. Your first one is free.
					</p>
					<p className="text-ink-muted mt-2 text-[0.9375rem] text-pretty">
						Paste a YouTube link and get the outline, every Scripture with a
						timestamp, applications and reflection questions — in about fifteen
						seconds.
					</p>
					<Link
						href="/"
						className="bg-accent-strong shadow-accent/25 hover:bg-accent mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[0.9375rem] font-semibold text-white shadow-lg transition-all hover:shadow-xl"
					>
						Take notes on a sermon
						<ArrowRightIcon className="size-4" />
					</Link>
				</div>

				{others.length > 0 && (
					<div className="mt-12">
						<div className="flex items-center gap-4">
							<span className="text-ink-faint text-[0.6875rem] font-medium tracking-[0.14em] whitespace-nowrap uppercase">
								More sermons
							</span>
							<span className="bg-line h-px flex-1" />
						</div>

						<ul className="mt-4 grid gap-2 sm:grid-cols-2">
							{others.map(item => (
								<li key={item.slug}>
									<Link
										href={`/${item.slug}`}
										className="border-line bg-surface hover:border-accent/40 hover:text-accent-strong block rounded-xl border p-4 transition-colors"
									>
										<p className="font-serif line-clamp-2 text-[0.9375rem] leading-snug font-medium text-pretty">
											{item.title}
										</p>
										{item.author && (
											<p className="text-ink-faint mt-1 truncate text-[0.8125rem]">
												{item.author}
											</p>
										)}
									</Link>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</main>
	)
}
