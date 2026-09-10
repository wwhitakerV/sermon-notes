import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowRightIcon } from '@/app/components/icons'
import { NoTrackToggle } from '../no-track-toggle'
import { currentAdmin } from '@/app/lib/admin'
import { isNoTrack } from '@/app/lib/analytics/no-track'
import { longDate } from '@/app/lib/long-date'
import {
	readCacheSplit,
	readFunnel,
	readRepeatBuyers,
	readSources,
	readStepSplit,
	readVisits,
} from '@/app/lib/analytics/report'
import type {
	FunnelType,
	RangeType,
	VisitRowType,
} from '@/app/lib/analytics/report'

export const metadata: Metadata = {
	title: 'Analytics — Sermon Drop',
	robots: 'noindex',
}

/** Recorded events are never cached: the point of the page is what just happened. */
export const dynamic = 'force-dynamic'

const PRESETS = [
	{ key: 'today', label: 'Today' },
	{ key: '7', label: '7 days' },
	{ key: '30', label: '30 days' },
	{ key: '90', label: '90 days' },
] as const

const VISIT_LIMIT = 60

const DAY_MS = 24 * 60 * 60 * 1000

export default async function AnalyticsPage({
	searchParams,
}: PageProps<'/admin/analytics'>) {
	// A 404, like the admin page itself: someone who is not an admin has no
	// reason to learn that this address means anything.
	if (!(await currentAdmin())) {
		notFound()
	}

	const params = await searchParams
	const window = resolveRange(params)
	const excluded = await isNoTrack()

	const [funnel, cache, steps, sources, repeats, visits] = await Promise.all([
		readFunnel(window.range),
		readCacheSplit(window.range),
		readStepSplit(window.range),
		readSources(window.range),
		readRepeatBuyers(),
		readVisits(window.range, VISIT_LIMIT),
	])

	const runs = cache.cached + cache.cold
	const nothingYet = funnel.pasted === 0 && visits.length === 0

	return (
		<>
		{/* One row: any window on the left, the common ones on the right. */}
		<div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
			<form
				action="/admin/analytics"
				method="get"
				className="flex items-center gap-2"
			>
				<span className="text-ink-faint text-[0.6875rem] tracking-[0.08em] uppercase">
					From
				</span>
				<input
					type="date"
					name="from"
					defaultValue={window.from}
					max={window.to}
					className="border-line bg-surface focus:border-accent/50 rounded-lg border px-2.5 py-1.5 text-[0.8125rem] focus:outline-none"
				/>

				<span className="text-ink-faint text-[0.6875rem] tracking-[0.08em] uppercase">
					To
				</span>
				<input
					type="date"
					name="to"
					defaultValue={window.to}
					className="border-line bg-surface focus:border-accent/50 rounded-lg border px-2.5 py-1.5 text-[0.8125rem] focus:outline-none"
				/>

				<button
					type="submit"
					title="Apply this range"
					aria-label="Apply this range"
					className="border-ink text-ink hover:bg-ink/5 flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors"
				>
					<ArrowRightIcon className="size-3.5" />
				</button>
			</form>

			<div className="flex flex-wrap items-center gap-2">
				{PRESETS.map(preset => (
					<Link
						key={preset.key}
						href={`/admin/analytics?days=${preset.key}`}
						className={`rounded-full border px-3 py-1 text-[0.8125rem] transition-colors ${
							preset.key === window.preset
								? 'border-ink bg-ink text-paper'
								: 'border-line bg-surface text-ink-muted hover:border-line-strong'
						}`}
					>
						{preset.label}
					</Link>
				))}
			</div>
		</div>

		<p className="text-ink-faint mt-2.5 text-[0.75rem]">
			Showing {window.label}
		</p>

		<NoTrackToggle excluded={excluded} />

		{nothingYet && (
			<p className="border-line bg-paper-sunk/60 text-ink-muted mt-8 rounded-xl border px-5 py-4 text-[0.9375rem]">
				Nothing recorded in this window. Events land as soon as someone
				pastes a link on a deployment that includes the logging — if you
				have just deployed, widen the range or wait for traffic.
			</p>
		)}

		<Panel
			title="The funnel"
			hint={window.short}
			description="People, not clicks — one person who pastes four sermons counts once. Each step only counts people who reached the step before it, so the percentages are the share who carried on from the previous box. The place to spend your effort is wherever the drop is biggest."
		>
			<Funnel funnel={funnel} />
		</Panel>

		<Panel
			title="Where it goes wrong"
			hint={window.short}
			description="Not funnel steps — these are the people something went wrong for, counted separately. A bad link never reached the pipeline. A failed run did and broke, which costs you the API call and them their patience. Out of tokens means an account wanted another sermon and had none left, which is the one you want to be high."
		>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<Stat label="Got the full notes" value={funnel.delivered} />
				<Stat label="Pasted a bad link" value={funnel.bad_link} muted />
				<Stat label="Hit a failed run" value={funnel.failed} muted />
				<Stat label="Ran out of tokens" value={funnel.out_of_tokens} muted />
			</div>
		</Panel>

		<Panel
			title="Cache hit rate"
			hint={window.short}
			description="A sermon someone has already run costs nothing to serve again. A cold one pays Supadata for the transcript and OpenAI for the notes. Higher is better, and a falling hit rate means your cost per dollar earned is climbing — the usual cause is people pasting sermons nobody has run before, which is normal early on."
		>
			<div className="grid grid-cols-3 gap-3">
				<Stat label="Served from cache" value={cache.cached} />
				<Stat label="Generated cold" value={cache.cold} />
				<Stat label="Hit rate" value={percent(cache.cached, runs)} />
			</div>
		</Panel>

		<Panel
			title="Where they came from"
			hint={window.short}
			description="The site that sent them, or the utm_source tag if the link carried one. Judge these on the “bought” column, not “visitors” — a source that sends a hundred people and produces no purchases is worse than one that sends five and produces two. “(direct)” means no referrer was passed, which covers typed addresses, bookmarks, and most links opened from apps."
		>
			<Table
				head={['Source', 'Visitors', 'Signed up', 'Bought']}
				rows={sources.map(row => [
					row.source,
					row.visitors,
					row.signed_up,
					row.bought,
				])}
			/>
		</Panel>

		<Panel
			title="Signed in or out"
			hint={window.short}
			description="Whether the person had an account at the moment each step happened, never backfilled afterwards. Expect gate_shown to be almost entirely anonymous — that is the whole point of the wall. Signed-in people appearing there would mean the gate is firing for accounts that should be past it."
		>
			<Table
				head={['Step', 'Anonymous', 'Signed in']}
				rows={steps.map(row => [row.name, row.anonymous, row.signed_in])}
			/>
		</Panel>

		<Panel
			title="Repeat buyers"
			hint="All time, ignores the range"
			description="How many purchases each buyer has made. One row at 1 with nothing above it means nobody has come back for a second sermon, which matters more than any other number on this page — first purchases can be bought with marketing, second ones cannot."
		>
			<Table
				head={['Purchases', 'Buyers']}
				rows={repeats.map(row => [row.purchases, row.buyers])}
			/>
		</Panel>

		<Panel
			title="Recent visits"
			hint={`Newest first, up to ${VISIT_LIMIT}`}
			description="One line per visit, newest first, split wherever someone was idle for thirty minutes. The row of tags is what they actually did, in order, so you can see individual people stall. The short code is the browser — the same code on two lines is one person returning. “Signed in” means they had an account by the end of that visit."
		>
			{visits.length === 0 ? (
				<Empty />
			) : (
				<ul className="divide-line divide-y">
					{visits.map(visit => (
						<Visit
							key={`${visit.device_id}-${visit.visit}`}
							visit={visit}
						/>
					))}
				</ul>
			)}
		</Panel>
		</>
	)
}

type WindowType = {
	range: RangeType
	/** Short form for the section hints, where the full span is too long. */
	short: string
	/** Which pill is lit, or null for a hand-picked range. */
	preset: string | null
	from: string
	to: string
	label: string
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

function first(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value
}

function asDay(value: string | undefined): string | null {
	return value && DATE.test(value) && Number.isFinite(Date.parse(value))
		? value
		: null
}

function toInput(date: Date): string {
	return date.toISOString().slice(0, 10)
}

/**
 * An explicit `from`/`to` wins; otherwise one of the presets; otherwise the
 * last 30 days. Relative windows end a minute in the future so an event
 * recorded a moment ago is not excluded by clock skew between here and Neon.
 */
function resolveRange(params: Record<string, string | string[] | undefined>): WindowType {
	const from = asDay(first(params.from))
	const to = asDay(first(params.to))

	if (from && to && from <= to) {
		const start = new Date(`${from}T00:00:00.000Z`)
		// Through the end of the chosen day, not up to its start.
		const end = new Date(new Date(`${to}T00:00:00.000Z`).getTime() + DAY_MS)

		return {
			range: { start, end },
			preset: null,
			short: from === to ? longDate(start) : 'custom range',
			from,
			to,
			label:
				from === to
					? longDate(start)
					: `${longDate(start)} to ${longDate(to)}`,
		}
	}

	const asked = first(params.days)
	const preset = PRESETS.find(entry => entry.key === asked) ?? PRESETS[2]
	const end = new Date(Date.now() + 60_000)

	const start =
		preset.key === 'today'
			? new Date(`${toInput(new Date())}T00:00:00.000Z`)
			: new Date(Date.now() - Number(preset.key) * DAY_MS)

	return {
		range: { start, end },
		preset: preset.key,
		short: preset.key === 'today' ? 'today' : `last ${preset.label}`,
		from: toInput(start),
		to: toInput(new Date()),
		label:
			preset.key === 'today'
				? longDate(start)
				: `${longDate(start)} to ${longDate(new Date())}`,
	}
}

/** Each box is the people who reached it, having reached every box to its left. */
function Funnel({ funnel }: { funnel: FunnelType }) {
	const steps = [
		{ label: 'Pasted a link', value: funnel.pasted, verb: 'pasted a link' },
		{
			label: 'Shown the opening',
			value: funnel.walled,
			verb: 'were shown the opening',
			action: 'get that far',
		},
		{
			label: 'Created an account',
			value: funnel.signed_up,
			verb: 'created an account',
			action: 'create an account',
		},
		{
			label: 'Bought tokens',
			value: funnel.bought,
			verb: 'bought tokens',
			action: 'buy tokens',
		},
	]

	let worst = -1

	steps.forEach((step, index) => {
		if (index === 0 || steps[index - 1].value === 0) return

		const rate = step.value / steps[index - 1].value
		const worstRate =
			worst > 0 ? steps[worst].value / steps[worst - 1].value : Infinity

		if (rate < worstRate) worst = index
	})

	return (
		<>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{steps.map((step, index) => {
					const previous = index === 0 ? null : steps[index - 1].value

					return (
						<div
							key={step.label}
							className={`rounded-xl border px-4 py-3 ${
								index === worst
									? 'border-accent/40 bg-accent-tint'
									: 'border-line bg-surface'
							}`}
						>
							<p className="font-serif text-[1.5rem] leading-none tabular-nums">
								{step.value}
							</p>
							<p className="text-ink-muted mt-1.5 text-[0.8125rem] leading-snug">
								{step.label}
							</p>
							<p className="text-ink-faint mt-1 text-[0.6875rem]">
								{previous === null
									? 'people, this window'
									: `${percent(step.value, previous)} of previous`}
							</p>
						</div>
					)
				})}
			</div>

			{/* Only worth saying when people actually fell out somewhere. */}
			{worst > 0 && steps[worst].value < steps[worst - 1].value && (
				<p className="border-accent/25 bg-accent-tint/50 mt-3 rounded-xl border px-4 py-3 text-[0.875rem] leading-[1.6] text-pretty">
					<span className="font-medium">Biggest drop.</span>{' '}
					{`${steps[worst - 1].value - steps[worst].value} of the ${steps[worst - 1].value} ${
						steps[worst - 1].value === 1 ? 'person' : 'people'
					} who ${steps[worst - 1].verb} did not go on to ${steps[worst].action}.`}
				</p>
			)}
		</>
	)
}

function Visit({ visit }: { visit: VisitRowType }) {
	return (
		<li className="py-3.5">
			<div className="text-ink-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem]">
				<span className="font-mono">{visit.device_id.slice(0, 8)}</span>
				<span className={visit.signed_in ? 'text-accent-strong' : 'text-ink-faint'}>
					{visit.signed_in ? 'signed in' : 'anonymous'}
				</span>
				{visit.source && <span>via {visit.source}</span>}
				<span className="text-ink-faint">{ago(visit.started_at)}</span>
				<span className="text-ink-faint">{visit.steps} steps</span>
			</div>

			<div className="mt-2 flex flex-wrap items-center gap-1.5">
				{visit.trail.map((step, index) => (
					<span
						key={`${step}-${index}`}
						className="border-line bg-surface rounded-md border px-2 py-0.5 font-mono text-[0.6875rem]"
					>
						{step}
					</span>
				))}
			</div>
		</li>
	)
}

function Panel({
	title,
	hint,
	description,
	children,
}: {
	title: string
	hint?: string
	description: string
	children: React.ReactNode
}) {
	return (
		<section className="mt-12">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h2 className="font-serif text-[1.25rem] leading-snug font-medium tracking-tight">
					{title}
				</h2>
				{hint && (
					<p className="text-ink-faint text-[0.75rem] tracking-[0.08em] uppercase">
						{hint}
					</p>
				)}
			</div>

			<p className="text-ink-muted mt-2 max-w-2xl text-[0.875rem] leading-[1.65] text-pretty">
				{description}
			</p>

			<div className="mt-4">{children}</div>
		</section>
	)
}

function Stat({
	label,
	value,
	muted = false,
}: {
	label: string
	value: number | string
	muted?: boolean
}) {
	return (
		<div className="border-line bg-surface rounded-xl border px-4 py-3">
			<p
				className={`font-serif text-[1.5rem] leading-none tabular-nums ${
					muted ? 'text-ink-muted' : ''
				}`}
			>
				{value}
			</p>
			<p className="text-ink-faint mt-1.5 text-[0.75rem] leading-snug">{label}</p>
		</div>
	)
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
	if (rows.length === 0) {
		return <Empty />
	}

	return (
		<div className="border-line bg-surface overflow-x-auto rounded-xl border">
			<table className="w-full text-[0.875rem]">
				<thead>
					<tr className="border-line border-b">
						{head.map((cell, index) => (
							<th
								key={cell}
								className={`text-ink-faint px-4 py-2.5 text-[0.75rem] font-medium tracking-[0.06em] uppercase ${
									index === 0 ? 'text-left' : 'text-right'
								}`}
							>
								{cell}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, rowIndex) => (
						<tr key={rowIndex} className="border-line not-last:border-b">
							{row.map((cell, index) => (
								<td
									key={index}
									className={`px-4 py-2.5 ${
										index === 0 ? 'text-left' : 'text-right tabular-nums'
									}`}
								>
									{cell}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

function Empty() {
	return (
		<p className="border-line text-ink-faint rounded-xl border border-dashed px-4 py-6 text-center text-[0.875rem]">
			Nothing in this range.
		</p>
	)
}

function percent(part: number, whole: number): string {
	return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—'
}

/**
 * A duration for the first day, because "20m ago" is what you want while
 * watching traffic arrive, then the date once it stops being about right now.
 */
function ago(value: string): string {
	const minutes = Math.max(
		0,
		Math.round((Date.now() - new Date(value).getTime()) / 60000),
	)

	if (minutes < 60) return `${minutes}m ago`
	if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`

	return longDate(value)
}
