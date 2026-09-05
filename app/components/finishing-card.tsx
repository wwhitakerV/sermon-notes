'use client'

import { AlertIcon } from './icons'

type Props = {
	error: string | null
	onRetry: () => void
}

/**
 * What stands in for the rest of the notes between signing up and the run
 * finishing.
 *
 * Shaped like the content it is waiting for rather than announced as a status,
 * so when the real lines arrive they replace these in place instead of shoving
 * the page around.
 */
export function FinishingCard({ error, onRetry }: Props) {
	if (error) {
		return (
			<div className="border-line bg-surface no-print rounded-2xl border p-5">
				<p className="text-accent-strong flex items-start gap-2.5 text-[0.9375rem]">
					<AlertIcon className="mt-0.5 size-4 shrink-0" />
					{error}
				</p>
				<p className="text-ink-muted mt-2 text-[0.8125rem]">
					These notes are saved to your library either way.
				</p>
				<button
					type="button"
					onClick={onRetry}
					className="border-line bg-surface hover:border-accent/40 hover:text-accent-strong mt-4 rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
				>
					Try again
				</button>
			</div>
		)
	}

	return (
		<div className="no-print" aria-live="polite">
			<div className="text-ink-faint flex items-center gap-2.5 text-[0.8125rem]">
				<span className="bg-accent animate-breathe size-1.5 shrink-0 rounded-full" />
				Writing the rest of your notes
			</div>

			<div className="mt-5 space-y-6" aria-hidden>
				<Shimmer widths={['w-2/5']} tall />
				<Shimmer widths={['w-full', 'w-11/12', 'w-4/5']} />
				<Shimmer widths={['w-1/3']} tall />
				<Shimmer widths={['w-full', 'w-3/4']} />
			</div>
		</div>
	)
}

function Shimmer({ widths, tall = false }: { widths: string[]; tall?: boolean }) {
	return (
		<div className="space-y-2.5">
			{widths.map((width, index) => (
				<div
					key={index}
					className={`bg-paper-sunk relative overflow-hidden rounded ${
						tall ? 'h-5' : 'h-3.5'
					} ${width}`}
				>
					<span className="via-surface/70 absolute inset-0 animate-sweep bg-linear-to-r from-transparent to-transparent" />
				</div>
			))}
		</div>
	)
}
