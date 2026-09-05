'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { AlertIcon, CheckIcon, CloseIcon, StarIcon } from './icons'

const RATINGS = [1, 2, 3, 4, 5]

const LABELS: Record<number, string> = {
	1: 'Not useful',
	2: 'Needs work',
	3: 'Fine',
	4: 'Good',
	5: 'Excellent',
}

export function FeedbackPrompt({ onDismiss }: { onDismiss: () => void }) {
	const pathname = usePathname()
	const [rating, setRating] = useState(0)
	const [hovered, setHovered] = useState(0)
	const [comment, setComment] = useState('')
	const [busy, setBusy] = useState(false)
	const [sent, setSent] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// While a star is under the pointer it stands in for the choice, so the row
	// fills as you sweep across it rather than only after a click.
	const shown = hovered || rating

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault()

		if (busy || rating === 0) {
			return
		}

		setBusy(true)
		setError(null)

		try {
			const response = await fetch('/api/feedback', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ rating, comment, path: pathname }),
			})

			if (!response.ok) {
				const body = await response.json().catch(() => null)

				setError(body?.error ?? 'That did not send. Please try again.')

				return
			}

			setSent(true)
			setTimeout(onDismiss, 1600)
		} catch {
			setError('Could not reach the server. Please try again.')
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className="border-line bg-surface rounded-2xl border p-5 shadow-[0_1px_2px_rgb(26_24_21/0.04),0_12px_32px_-16px_rgb(26_24_21/0.14)] sm:p-6">
			{sent ? (
				<div className="py-6 text-center">
					<span className="bg-accent-tint text-accent-strong mx-auto flex size-11 items-center justify-center rounded-full">
						<CheckIcon className="size-5" />
					</span>
					<p className="font-serif mt-3 text-lg font-medium">Thank you</p>
					<p className="text-ink-muted mt-1 text-[0.9375rem]">
						Every note gets read.
					</p>
				</div>
			) : (
				<>
					<div className="flex items-start gap-4">
						<div className="min-w-0 flex-1">
							<h2 className="font-serif text-[1.375rem] leading-tight font-medium tracking-tight">
								How is this working for you?
							</h2>
							<p className="text-ink-muted mt-1.5 text-[0.9375rem] leading-relaxed text-pretty">
								Tell us what is good and what is not. It goes straight to the
								person building it.
							</p>
						</div>

						<button
							type="button"
							onClick={onDismiss}
							title="Close"
							className="text-ink-faint hover:bg-paper-sunk hover:text-ink -mt-1 -mr-1 shrink-0 rounded-lg p-1.5 transition-colors"
						>
							<CloseIcon className="size-4" />
							<span className="sr-only">Close</span>
						</button>
					</div>

					<form onSubmit={handleSubmit} className="mt-5">
						<div
							className="flex items-center gap-1"
							onMouseLeave={() => setHovered(0)}
						>
							{RATINGS.map(value => (
								<button
									key={value}
									type="button"
									onClick={() => setRating(value)}
									onMouseEnter={() => setHovered(value)}
									aria-label={`${value} out of 5 — ${LABELS[value]}`}
									aria-pressed={rating === value}
									className={`focus-visible:ring-accent/40 rounded-lg p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none ${
										value <= shown ? 'text-accent' : 'text-line-strong'
									}`}
								>
									<StarIcon className="size-7" filled={value <= shown} />
								</button>
							))}

							<span className="text-ink-muted ml-2 text-[0.8125rem]">
								{shown ? LABELS[shown] : ''}
							</span>
						</div>

						<label className="mt-4 block">
							<span className="sr-only">Anything you want to add</span>
							<textarea
								value={comment}
								onChange={event => setComment(event.target.value)}
								rows={4}
								maxLength={2000}
								placeholder="Anything you want to add — what worked, what got in the way…"
								className="border-line bg-paper-sunk/40 focus-within:border-accent/40 placeholder:text-ink-faint/70 w-full resize-none rounded-xl border px-3.5 py-3 text-[0.9375rem] outline-none transition-colors"
							/>
						</label>

						{error && (
							<p
								role="alert"
								className="text-accent-strong bg-accent-tint border-accent/20 animate-fade mt-3 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm"
							>
								<AlertIcon className="mt-px size-4 shrink-0" />
								{error}
							</p>
						)}

						<button
							type="submit"
							disabled={busy || rating === 0}
							className="bg-accent-strong shadow-accent/25 hover:bg-accent focus-visible:ring-accent/40 disabled:bg-paper-sunk disabled:text-ink-faint mt-4 w-full rounded-xl px-5 py-3 text-[0.9375rem] font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl focus-visible:ring-2 focus-visible:outline-none disabled:shadow-none"
						>
							{busy
								? 'Sending…'
								: rating === 0
									? 'Pick a rating'
									: 'Send feedback'}
						</button>
					</form>
				</>
			)}
		</div>
	)
}
