import { notFound } from 'next/navigation'
import { SiteHeader } from '@/app/components/site-header'
import { currentAdmin } from '@/app/lib/admin'
import { AdminNav } from './admin-nav'

/**
 * The chrome every admin screen shares.
 *
 * The gate is repeated in each page rather than left to this layout alone:
 * layouts and pages render in parallel, so a page's queries would otherwise run
 * for a visitor who is about to be handed a 404.
 */
export default async function AdminLayout({
	children,
}: LayoutProps<'/admin'>) {
	if (!(await currentAdmin())) {
		notFound()
	}

	return (
		<main className="flex flex-1 flex-col">
			<SiteHeader />

			<div className="mx-auto w-full max-w-4xl px-5 pt-6 pb-24 sm:px-6 sm:pt-8">
				<AdminNav />

				{children}
			</div>
		</main>
	)
}
