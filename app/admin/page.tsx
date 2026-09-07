import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteHeader } from '@/app/components/site-header'
import { currentAdmin } from '@/app/lib/admin'
import { listCachedSermons } from '@/app/lib/public-sermons'
import { AdminPanel } from './admin-panel'

export const metadata: Metadata = {
	title: 'Admin — Sermon Drop',
	robots: 'noindex',
}

export default async function AdminPage() {
	// A 404 rather than a redirect: someone who is not an admin has no reason to
	// learn that this address means anything.
	if (!(await currentAdmin())) {
		notFound()
	}

	return (
		<main className="flex flex-1 flex-col">
			<SiteHeader />

			<div className="mx-auto w-full max-w-2xl px-5 pt-6 pb-24 sm:px-6 sm:pt-10">
				<h1 className="font-serif text-[1.75rem] leading-tight font-medium tracking-tight sm:text-[2.25rem]">
					Admin
				</h1>
				<p className="text-ink-muted mt-2 text-[0.9375rem] text-pretty">
					Free, public sermon pages for marketing.
				</p>

				<div className="mt-8">
					<AdminPanel sermons={await listCachedSermons()} />
				</div>
			</div>
		</main>
	)
}
