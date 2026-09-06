import { Shimmer } from '@/app/components/skeleton'
import { SiteHeader } from '@/app/components/site-header'

/**
 * The reset page checks the ticket against the database before it can decide
 * whether to draw a form or an expiry notice, and that is a round trip on a
 * page people arrive at from an email — already unsure whether it will work.
 */
export default function Loading() {
	return (
		<main className="flex flex-1 flex-col">
			<SiteHeader />

			<div className="mx-auto w-full max-w-sm px-6 pt-16 pb-24" aria-hidden>
				<Shimmer className="h-8 w-4/5" />
				<Shimmer className="mt-3 h-3.5 w-3/5" />

				<div className="border-line bg-paper-sunk/40 mt-6 rounded-xl border px-3.5 py-3">
					<Shimmer className="h-2.5 w-24" />
					<Shimmer className="mt-2 h-4 w-full" />
				</div>

				<Shimmer className="mt-4 h-11 w-full rounded-xl" />
			</div>

			<span className="sr-only" aria-live="polite">
				Checking your reset link
			</span>
		</main>
	)
}
