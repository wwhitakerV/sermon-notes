import { sql } from 'drizzle-orm'
import { getDb } from '@/app/lib/db'

/**
 * Reads for the admin analytics page.
 *
 * Raw SQL rather than the query builder: every one of these is an aggregate
 * with `FILTER` clauses or a window function, which is exactly the shape the
 * builder is worst at expressing and a reader is best at checking.
 *
 * Counts are cast to `int` because Postgres returns `bigint` as a string, and a
 * string that looks like a number is the kind of thing that renders fine and
 * sorts wrong.
 */

/** The window every figure on the page is counted over. */
export type RangeType = { start: Date; end: Date }

/** One place where "inside the range" is decided. */
function within(range: RangeType) {
	return sql`occurred_at >= ${range.start} AND occurred_at < ${range.end}`
}

/**
 * People, not events, and each step a subset of the one before it — otherwise
 * the ratios between them mean nothing and can exceed 100%.
 */
export type FunnelType = {
	/** Distinct people who pasted a link that parsed. */
	pasted: number
	/** ...of those, how many were shown the opening and stopped there. */
	walled: number
	/** ...of those, how many then made an account. */
	signed_up: number
	/** ...of those, how many then paid. */
	bought: number
	/** People who got the whole notes, by any route. */
	delivered: number
	bad_link: number
	failed: number
	out_of_tokens: number
}

export type CacheSplitType = { cached: number; cold: number }

export type StepSplitType = {
	name: string
	anonymous: number
	signed_in: number
}

export type SourceRowType = {
	source: string
	visitors: number
	signed_up: number
	bought: number
}

export type RepeatRowType = { purchases: number; buyers: number }

export type VisitRowType = {
	device_id: string
	visit: number
	started_at: string
	ended_at: string
	steps: number
	signed_in: boolean
	source: string | null
	trail: string[]
}

function rows<T>(result: unknown): T[] {
	return (
		Array.isArray(result) ? result : ((result as { rows?: unknown[] })?.rows ?? [])
	) as T[]
}

/**
 * The funnel, counted over people.
 *
 * Identity is the device, because that is what exists before an account does.
 * Events with no device — the Stripe webhook fires with no cookies at all —
 * are pulled back to one through `devices.linked_user_id`, the same link that
 * lets a purchase be traced to the visit that preceded the account.
 *
 * Each step is then `AND`-ed with the ones before it, so every figure is a
 * subset of the one to its left and the ratios are real.
 */
export async function readFunnel(range: RangeType): Promise<FunnelType> {
	const result = await getDb().execute(sql`
		WITH person AS (
			SELECT
				coalesce(
					e.device_id,
					(SELECT d.id FROM devices d WHERE d.linked_user_id = e.user_id LIMIT 1)
				) AS pid,
				e.name
			FROM events e
			WHERE ${within(range)}
		),
		reached AS (
			SELECT
				pid,
				bool_or(name = 'link_submitted')     AS pasted,
				bool_or(name = 'gate_shown')         AS walled,
				bool_or(name = 'signup_succeeded')   AS signed_up,
				bool_or(name = 'purchase_succeeded') AS bought,
				bool_or(name = 'notes_delivered')    AS delivered,
				bool_or(name = 'link_rejected')      AS bad_link,
				bool_or(name = 'run_failed')         AS failed,
				bool_or(name = 'paywall_shown')      AS out_of_tokens
			FROM person
			WHERE pid IS NOT NULL
			GROUP BY pid
		)
		SELECT
			count(*) FILTER (WHERE pasted)::int AS pasted,
			count(*) FILTER (WHERE pasted AND walled)::int AS walled,
			count(*) FILTER (WHERE pasted AND walled AND signed_up)::int AS signed_up,
			count(*) FILTER (WHERE pasted AND walled AND signed_up AND bought)::int
				AS bought,
			count(*) FILTER (WHERE delivered)::int      AS delivered,
			count(*) FILTER (WHERE bad_link)::int       AS bad_link,
			count(*) FILTER (WHERE failed)::int         AS failed,
			count(*) FILTER (WHERE out_of_tokens)::int  AS out_of_tokens
		FROM reached
	`)

	return (
		rows<FunnelType>(result)[0] ?? {
			pasted: 0,
			walled: 0,
			signed_up: 0,
			bought: 0,
			delivered: 0,
			bad_link: 0,
			failed: 0,
			out_of_tokens: 0,
		}
	)
}

/** Cache hits are the whole margin: a cold run costs Supadata and OpenAI. */
export async function readCacheSplit(range: RangeType): Promise<CacheSplitType> {
	const result = await getDb().execute(sql`
		SELECT
			count(*) FILTER (WHERE props->>'cached' = 'true')::int  AS cached,
			count(*) FILTER (WHERE props->>'cached' = 'false')::int AS cold
		FROM events
		WHERE name = 'run_started' AND ${within(range)}
	`)

	return rows<CacheSplitType>(result)[0] ?? { cached: 0, cold: 0 }
}

export async function readStepSplit(range: RangeType): Promise<StepSplitType[]> {
	const result = await getDb().execute(sql`
		SELECT
			name,
			count(*) FILTER (WHERE user_id IS NULL)::int     AS anonymous,
			count(*) FILTER (WHERE user_id IS NOT NULL)::int AS signed_in
		FROM events
		WHERE ${within(range)}
		GROUP BY name
		ORDER BY name
	`)

	return rows<StepSplitType>(result)
}

/** Which marketing actually produces buyers, not just visits. */
export async function readSources(range: RangeType): Promise<SourceRowType[]> {
	const result = await getDb().execute(sql`
		SELECT
			coalesce(
				props->'attribution'->>'source',
				props->'attribution'->>'ref',
				'(direct)'
			) AS source,
			count(DISTINCT device_id)::int                          AS visitors,
			count(*) FILTER (WHERE name = 'signup_succeeded')::int   AS signed_up,
			count(*) FILTER (WHERE name = 'purchase_succeeded')::int AS bought
		FROM events
		WHERE ${within(range)}
		GROUP BY 1
		ORDER BY visitors DESC, source
	`)

	return rows<SourceRowType>(result)
}

/** Whether anyone comes back for a second sermon. */
export async function readRepeatBuyers(): Promise<RepeatRowType[]> {
	const result = await getDb().execute(sql`
		SELECT purchases::int, count(*)::int AS buyers
		FROM (
			SELECT user_id, count(*) AS purchases
			FROM events
			WHERE name = 'purchase_succeeded' AND user_id IS NOT NULL
			GROUP BY user_id
		) per_buyer
		GROUP BY purchases
		ORDER BY purchases
	`)

	return rows<RepeatRowType>(result)
}

/**
 * One row per visit, newest first, with the steps in order.
 *
 * Visits are cut here rather than stored, on a 30-minute gap. Two CTEs because
 * a window function may not be nested inside another: the first marks where a
 * visit starts, the second runs the running total over those marks.
 */
export async function readVisits(
	range: RangeType,
	limit: number,
): Promise<VisitRowType[]> {
	const result = await getDb().execute(sql`
		WITH marked AS (
			SELECT
				device_id, user_id, name, occurred_at, props,
				CASE
					WHEN lag(occurred_at) OVER w IS NULL
						OR occurred_at - lag(occurred_at) OVER w > interval '30 minutes'
					THEN 1 ELSE 0
				END AS started
			FROM events
			WHERE device_id IS NOT NULL AND ${within(range)}
			WINDOW w AS (PARTITION BY device_id ORDER BY occurred_at)
		),
		numbered AS (
			SELECT
				device_id, user_id, name, occurred_at, props,
				sum(started) OVER (PARTITION BY device_id ORDER BY occurred_at) AS visit
			FROM marked
		)
		SELECT
			device_id,
			visit::int,
			min(occurred_at)                        AS started_at,
			max(occurred_at)                        AS ended_at,
			count(*)::int                           AS steps,
			bool_or(user_id IS NOT NULL)            AS signed_in,
			array_agg(name ORDER BY occurred_at)    AS trail,
			min(
				coalesce(
					props->'attribution'->>'source',
					props->'attribution'->>'ref'
				)
			) AS source
		FROM numbered
		GROUP BY device_id, visit
		ORDER BY started_at DESC
		LIMIT ${limit}
	`)

	return rows<VisitRowType>(result)
}
