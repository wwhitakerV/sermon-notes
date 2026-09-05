import { Shimmer } from '@/app/components/skeleton'
import { SiteHeader } from '@/app/components/site-header'

export default function Loading() {
	return (
		<main className="flex flex-1 flex-col">
			<SiteHeader />

			<div
				className="mx-auto w-full max-w-3xl px-5 pt-6 pb-24 sm:px-6 sm:pt-10"
				aria-hidden
			>
				<Shimmer className="h-8 w-48 sm:h-10" />
				<Shimmer className="mt-3 h-3.5 w-4/5 max-w-sm" />

				<ul className="mt-8">
					{[0, 1, 2].map(row => (
						<li
							key={row}
							className="border-line flex items-stretch gap-3.5 border-b px-2 sm:gap-4"
						>
							<Shimmer className="my-3 aspect-video w-24 shrink-0 self-center rounded-md sm:w-32" />
							<div className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-3">
								<Shimmer className="h-3.5 w-4/5" />
								<Shimmer className="h-3 w-1/3" />
							</div>
						</li>
					))}
				</ul>
			</div>

			<span className="sr-only" aria-live="polite">
				Loading your library
			</span>
		</main>
	)
}
