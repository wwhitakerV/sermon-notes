import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteHeader } from '@/app/components/site-header'
import { currentUser } from '@/app/lib/auth/session'
import { SettingsPanel } from './settings-panel'

export const metadata: Metadata = {
	title: 'Settings — Sermon Drop',
}

export default async function SettingsPage() {
	const user = await currentUser()

	if (!user) {
		redirect('/')
	}

	return (
		<main className="flex flex-1 flex-col">
			<SiteHeader />

			<div className="mx-auto w-full max-w-lg px-5 pt-6 pb-24 sm:px-6 sm:pt-10">
				<h1 className="font-serif text-[1.75rem] leading-tight font-medium tracking-tight sm:text-[2.25rem]">
					Settings
				</h1>

				<div className="mt-8">
					<SettingsPanel
						memberSince={user.createdAt.toLocaleDateString('en-US', {
							month: 'long',
							year: 'numeric',
						})}
					/>
				</div>
			</div>
		</main>
	)
}
