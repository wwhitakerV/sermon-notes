'use client'

import { useActiveSection } from './use-active-section'

type ItemType = { id: string; heading: string }

/** The same margin outline the notes reader uses, so these pages belong. */
export function LegalOutline({ items }: { items: ItemType[] }) {
	const activeId = useActiveSection(items.map(item => item.id))

	return (
		<nav aria-label="On this page" className="no-print hidden lg:block">
			<div className="sticky top-20">
				<p className="text-ink-faint text-[0.6875rem] font-medium tracking-[0.14em] uppercase">
					On this page
				</p>

				<ol className="mt-3 space-y-0.5">
					{items.map((item, index) => {
						const active = item.id === activeId

						return (
							<li key={item.id}>
								<a
									href={`#${item.id}`}
									className={`flex items-baseline gap-2.5 rounded-lg py-1.5 pr-2 pl-3 text-[0.8125rem] leading-snug transition-colors ${
										active
											? 'bg-accent-tint text-ink font-medium'
											: 'text-ink-muted hover:bg-paper-sunk'
									}`}
								>
									<span className="text-ink-faint shrink-0 font-mono text-[0.6875rem] tabular-nums">
										{String(index + 1).padStart(2, '0')}
									</span>
									{item.heading}
								</a>
							</li>
						)
					})}
				</ol>
			</div>
		</nav>
	)
}
