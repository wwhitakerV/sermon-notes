import { Shimmer } from '@/app/components/skeleton'
import { SiteHeader } from '@/app/components/site-header'

export default function Loading() {
	return (
		<main className="flex flex-1 flex-col">
			<SiteHeader />

			<div
				className="mx-auto w-full max-w-lg px-5 pt-6 pb-24 sm:px-6 sm:pt-10"
				aria-hidden
			>
				<Shimmer className="h-8 w-40 sm:h-10" />

				<div className="mt-8 space-y-3">
					{[0, 1, 2].map(card => (
						<div key={card} className="border-line bg-surface rounded-2xl border p-5">
							<Shimmer className="h-2.5 w-24" />
							<div className="mt-4 flex items-center gap-3">
								<Shimmer className="size-9 shrink-0 rounded-full" />
								<div className="flex-1 space-y-2">
									<Shimmer className="h-3.5 w-1/2" />
									<Shimmer className="h-3 w-1/3" />
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			<span className="sr-only" aria-live="polite">
				Loading settings
			</span>
		</main>
	)
}
