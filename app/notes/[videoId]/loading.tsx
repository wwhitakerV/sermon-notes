import { Shimmer } from '@/app/components/skeleton'
import { SiteHeader } from '@/app/components/site-header'

/**
 * Shown the instant a library row is tapped.
 *
 * The page behind this cannot render until it has checked the session, checked
 * ownership and read the notes — three round trips to the database, about a
 * third of a second, during which a tapped row otherwise just sits there
 * looking broken. The shape matches the notes page so the real thing lands in
 * roughly the same place rather than replacing something unrelated.
 */
export default function Loading() {
	return (
		<main className="flex flex-1 flex-col">
			<SiteHeader />

			<div className="mx-auto w-full max-w-5xl px-6 pb-28" aria-hidden>
				<header className="pt-12 sm:pt-16">
					<Shimmer className="h-2.5 w-28" />

					<div className="mt-5 space-y-3">
						<Shimmer className="h-8 w-4/5 sm:h-10" />
						<Shimmer className="h-8 w-3/5 sm:h-10" />
					</div>

					<div className="mt-5 flex items-center gap-4">
						<Shimmer className="h-3 w-24" />
						<Shimmer className="h-3 w-16" />
					</div>

					<div className="border-line bg-surface mt-8 rounded-r-xl border-l-2 py-5 pr-6 pl-6">
						<Shimmer className="h-2.5 w-20" />
						<div className="mt-4 space-y-2.5">
							<Shimmer className="h-3.5 w-full" />
							<Shimmer className="h-3.5 w-11/12" />
							<Shimmer className="h-3.5 w-2/3" />
						</div>
					</div>
				</header>

				<div className="mt-16 grid gap-12 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-14">
					<div className="hidden space-y-2.5 lg:block">
						<Shimmer className="h-2.5 w-20" />
						<Shimmer className="h-3 w-full" />
						<Shimmer className="h-3 w-5/6" />
						<Shimmer className="h-3 w-4/6" />
					</div>

					<div className="min-w-0 space-y-10">
						{[0, 1].map(section => (
							<div key={section} className="space-y-3">
								<Shimmer className="h-6 w-3/5" />
								<Shimmer className="h-3.5 w-full" />
								<Shimmer className="h-3.5 w-11/12" />
								<Shimmer className="h-3.5 w-4/5" />
							</div>
						))}
					</div>
				</div>
			</div>

			<span className="sr-only" aria-live="polite">
				Opening your notes
			</span>
		</main>
	)
}
