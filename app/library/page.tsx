import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteHeader } from '@/app/components/site-header'
import { currentUser } from '@/app/lib/auth/session'
import { listLibrary } from '@/app/lib/notes-cache'
import { LibraryList } from './library-list'

export const metadata: Metadata = {
	title: 'Your library — Sermon Notes',
}

export default async function LibraryPage() {
	const user = await currentUser()

	// The authority, not the proxy: a session cookie can be present and still be
	// expired or forged. A signed-out visitor belongs on the home page.
	if (!user) {
		redirect('/')
	}

	return (
		<main className="flex flex-1 flex-col">
			<SiteHeader />

			<div className="mx-auto w-full max-w-3xl px-5 pt-6 pb-24 sm:px-6 sm:pt-10">
				<h1 className="font-serif text-[1.75rem] leading-tight font-medium tracking-tight sm:text-[2.25rem]">
					Your library
				</h1>
				<p className="text-ink-muted mt-2 text-[0.9375rem] text-pretty">
					Every sermon you have taken notes on. Opening one again is free.
				</p>

				<div className="mt-8">
					<LibraryList items={await listLibrary(user.id)} />
				</div>
			</div>
		</main>
	)
}
