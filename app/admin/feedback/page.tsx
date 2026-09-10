import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { StarIcon } from '@/app/components/icons'
import { currentAdmin } from '@/app/lib/admin'
import { readFeedback, readFeedbackSummary } from '@/app/lib/feedback'
import type { FeedbackRowType } from '@/app/lib/feedback'
import { longDate } from '@/app/lib/long-date'

export const metadata: Metadata = {
	title: 'Feedback — Sermon Drop',
	robots: 'noindex',
}

export const dynamic = 'force-dynamic'

const LIMIT = 200

export default async function FeedbackPage({
	searchParams,
}: PageProps<'/admin/feedback'>) {
	// Repeated from the layout: pages and layouts render in parallel, so without
	// this the comments would be read for a visitor about to get a 404.
	if (!(await currentAdmin())) {
		notFound()
	}

	const params = await searchParams
	const askedRating = Number(first(params.rating))
	const rating =
		Number.isInteger(askedRating) && askedRating >= 1 && askedRating <= 5
			? askedRating
			: null
	const commentsOnly = first(params.comments) === '1'

	const [summary, entries] = await Promise.all([
		readFeedbackSummary(),
		readFeedback({ rating, commentsOnly, limit: LIMIT }),
	])

	const distribution = [
		{ score: 5, count: summary.five },
		{ score: 4, count: summary.four },
		{ score: 3, count: summary.three },
		{ score: 2, count: summary.two },
		{ score: 1, count: summary.one },
	]

	return (
		<>
			<section className="mt-8">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
					<Stat label="Responses" value={summary.total} />
					<Stat
						label="Average rating"
						value={summary.average === null ? '—' : summary.average.toFixed(2)}
					/>
					<Stat label="Left a comment" value={summary.with_comment} />
					<Stat label="Left an email" value={summary.with_email} />
					<Stat
						label="4 or 5 stars"
						value={percent(summary.five + summary.four, summary.total)}
					/>
				</div>

				<div className="border-line bg-surface mt-3 overflow-hidden rounded-xl border">
					{distribution.map(row => (
						<div
							key={row.score}
							className="border-line flex items-center gap-3 px-4 py-2 not-last:border-b"
						>
							<span className="text-ink-muted w-4 text-right font-mono text-[0.8125rem] tabular-nums">
								{row.score}
							</span>
							<StarIcon className="text-accent size-3.5 shrink-0" filled />
							<span className="bg-paper-sunk h-2 flex-1 overflow-hidden rounded-full">
								<span
									className="bg-accent/50 block h-full rounded-full"
									style={{
										width: `${summary.total > 0 ? (row.count / summary.total) * 100 : 0}%`,
									}}
								/>
							</span>
							<span className="text-ink-muted w-8 text-right font-mono text-[0.8125rem] tabular-nums">
								{row.count}
							</span>
						</div>
					))}
				</div>
			</section>

			<div className="mt-8 flex flex-wrap items-center gap-2">
				<Filter href="/admin/feedback" active={rating === null && !commentsOnly}>
					All
				</Filter>
				{[5, 4, 3, 2, 1].map(score => (
					<Filter
						key={score}
						href={`/admin/feedback?rating=${score}`}
						active={rating === score}
					>
						{score} star
					</Filter>
				))}
				<Filter href="/admin/feedback?comments=1" active={commentsOnly}>
					With comments
				</Filter>
			</div>

			<section className="mt-6">
				{entries.length === 0 ? (
					<p className="border-line text-ink-faint rounded-xl border border-dashed px-4 py-8 text-center text-[0.875rem]">
						No feedback matches this filter.
					</p>
				) : (
					<ul className="border-line bg-surface divide-line divide-y overflow-hidden rounded-xl border">
						{entries.map(entry => (
							<Entry key={entry.id} entry={entry} />
						))}
					</ul>
				)}

				{entries.length === LIMIT && (
					<p className="text-ink-faint mt-3 text-[0.75rem]">
						Showing the newest {LIMIT}. Narrow with a filter to see older ones.
					</p>
				)}
			</section>
		</>
	)
}

function Entry({ entry }: { entry: FeedbackRowType }) {
	return (
		<li className="px-4 py-3.5">
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
				<span className="flex items-center gap-0.5" aria-label={`${entry.rating} out of 5`}>
					{[1, 2, 3, 4, 5].map(score => (
						<StarIcon
							key={score}
							filled={score <= entry.rating}
							className={
								score <= entry.rating
									? 'text-accent size-3.5'
									: 'text-line-strong size-3.5'
							}
						/>
					))}
				</span>

				{/* What they typed wins: it is where they asked to be replied to. */}
				<span className="text-ink-muted text-[0.8125rem]">
					{entry.submitted_email ??
						entry.account_email ?? (
							<span className="font-mono">
								{entry.device_id ? entry.device_id.slice(0, 8) : 'unknown'}
							</span>
						)}
				</span>

				{entry.submitted_email &&
					entry.account_email &&
					entry.submitted_email !== entry.account_email && (
						<span className="text-ink-faint text-[0.75rem]">
							account: {entry.account_email}
						</span>
					)}

				<span className="text-ink-faint text-[0.8125rem]">
					{longDate(entry.created_at)}
				</span>

				{entry.path && (
					<span className="text-ink-faint font-mono text-[0.75rem]">
						{entry.path}
					</span>
				)}
			</div>

			{entry.comment && (
				<p className="note-body mt-2 text-[0.9375rem] leading-[1.65] text-pretty">
					{entry.comment}
				</p>
			)}
		</li>
	)
}

function Filter({
	href,
	active,
	children,
}: {
	href: string
	active: boolean
	children: React.ReactNode
}) {
	return (
		<Link
			href={href}
			className={`rounded-full border px-3 py-1 text-[0.8125rem] transition-colors ${
				active
					? 'border-ink bg-ink text-paper'
					: 'border-line bg-surface text-ink-muted hover:border-line-strong'
			}`}
		>
			{children}
		</Link>
	)
}

function Stat({ label, value }: { label: string; value: number | string }) {
	return (
		<div className="border-line bg-surface rounded-xl border px-4 py-3">
			<p className="font-serif text-[1.5rem] leading-none tabular-nums">
				{value}
			</p>
			<p className="text-ink-faint mt-1.5 text-[0.75rem] leading-snug">{label}</p>
		</div>
	)
}

function first(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value
}

function percent(part: number, whole: number): string {
	return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—'
}
