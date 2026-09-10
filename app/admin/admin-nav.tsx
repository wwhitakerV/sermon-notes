'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * One bar across every admin screen, so moving between them never depends on
 * the browser's back button knowing where you came from.
 */
const TABS = [
	{ href: '/admin', label: 'Public Sermons' },
	{ href: '/admin/analytics', label: 'Analytics' },
	{ href: '/admin/feedback', label: 'Feedback' },
] as const

export function AdminNav() {
	const pathname = usePathname()

	return (
		<nav className="border-line flex items-center gap-1 border-b">
			{TABS.map(tab => {
				// `/admin` would otherwise match every page beneath it.
				const active =
					tab.href === '/admin' ? pathname === '/admin' : pathname.startsWith(tab.href)

				return (
					<Link
						key={tab.href}
						href={tab.href}
						aria-current={active ? 'page' : undefined}
						className={`-mb-px border-b-2 px-3 py-2.5 text-[0.875rem] transition-colors ${
							active
								? 'border-accent text-ink font-medium'
								: 'text-ink-muted hover:text-ink border-transparent'
						}`}
					>
						{tab.label}
					</Link>
				)
			})}
		</nav>
	)
}
