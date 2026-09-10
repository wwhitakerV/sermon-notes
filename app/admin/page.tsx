import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { currentAdmin } from '@/app/lib/admin'
import { listCachedSermons } from '@/app/lib/public-sermons'
import { AdminPanel } from './admin-panel'

export const metadata: Metadata = {
	title: 'Admin — Sermon Drop',
	robots: 'noindex',
}

export default async function AdminPage() {
	// Repeated from the layout on purpose: pages and layouts render in parallel,
	// so without this the sermon list would be read for a visitor about to get a
	// 404.
	if (!(await currentAdmin())) {
		notFound()
	}

	return (
		<div className="mt-8">
			<AdminPanel sermons={await listCachedSermons()} />
		</div>
	)
}
