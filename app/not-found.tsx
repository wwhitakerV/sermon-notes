import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteHeader } from './components/site-header'

export const metadata: Metadata = {
	title: 'Not found — Sermon Drop',
	robots: 'noindex',
}

/**
 * Without this file Next serves its own 404, which carries inline styles and a
 * white background — the one page in the app that did not look like the app.
 *
 * It also stands in for the admin screens, which answer a 404 rather than a
 * 403 so their addresses give nothing away. So it has to read as an ordinary
 * dead end, not as a locked door.
 */
export default function NotFound() {
	return (
		<main className="flex flex-1 flex-col">
			<SiteHeader />

			<div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-24 text-center">
				<p className="text-ink-faint font-mono text-[0.75rem] tracking-[0.18em] uppercase">
					404
				</p>

				<h1 className="font-serif mt-4 text-[1.75rem] leading-tight font-medium tracking-tight text-balance sm:text-[2.125rem]">
					There&rsquo;s nothing here
				</h1>

				<p className="text-ink-muted mt-3 text-[0.9375rem] leading-relaxed text-pretty">
					The page may have moved, or the address may be slightly off.
				</p>

				<Link
					href="/"
					className="bg-accent-strong shadow-accent/25 hover:bg-accent mt-7 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[0.9375rem] font-semibold text-white shadow-lg transition-all hover:shadow-xl"
				>
					Take notes on a sermon
				</Link>
			</div>
		</main>
	)
}
