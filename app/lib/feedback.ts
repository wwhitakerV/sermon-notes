import { sql } from 'drizzle-orm'
import { getDb } from '@/app/lib/db'

/**
 * Reads for the admin feedback page. Nothing writes here — that is
 * `/api/feedback`, which is open to signed-out visitors on purpose.
 */

export type FeedbackSummaryType = {
	total: number
	average: number | null
	five: number
	four: number
	three: number
	two: number
	one: number
	with_comment: number
	with_email: number
}

export type FeedbackRowType = {
	id: string
	rating: number
	comment: string | null
	path: string | null
	created_at: string
	/** Typed into the form. */
	submitted_email: string | null
	/** From the account they were signed in as, if any. */
	account_email: string | null
	device_id: string | null
}

function rows<T>(result: unknown): T[] {
	return (
		Array.isArray(result) ? result : ((result as { rows?: unknown[] })?.rows ?? [])
	) as T[]
}

export async function readFeedbackSummary(): Promise<FeedbackSummaryType> {
	const result = await getDb().execute(sql`
		SELECT
			count(*)::int                                  AS total,
			round(avg(rating)::numeric, 2)::float8         AS average,
			count(*) FILTER (WHERE rating = 5)::int        AS five,
			count(*) FILTER (WHERE rating = 4)::int        AS four,
			count(*) FILTER (WHERE rating = 3)::int        AS three,
			count(*) FILTER (WHERE rating = 2)::int        AS two,
			count(*) FILTER (WHERE rating = 1)::int        AS one,
			count(*) FILTER (WHERE comment IS NOT NULL)::int AS with_comment,
			count(*) FILTER (WHERE email IS NOT NULL)::int   AS with_email
		FROM feedback
	`)

	return (
		rows<FeedbackSummaryType>(result)[0] ?? {
			total: 0,
			average: null,
			five: 0,
			four: 0,
			three: 0,
			two: 0,
			one: 0,
			with_comment: 0,
			with_email: 0,
		}
	)
}

/**
 * Newest first. The email is joined rather than stored on the row, so feedback
 * left before someone signed up stays anonymous — which is most of it.
 */
export async function readFeedback({
	rating,
	commentsOnly,
	limit,
}: {
	rating: number | null
	commentsOnly: boolean
	limit: number
}): Promise<FeedbackRowType[]> {
	const result = await getDb().execute(sql`
		SELECT
			f.id,
			f.rating,
			f.comment,
			f.path,
			f.created_at,
			f.device_id,
			f.email AS submitted_email,
			u.email AS account_email
		FROM feedback f
		LEFT JOIN users u ON u.id = f.user_id
		WHERE (${rating}::int IS NULL OR f.rating = ${rating}::int)
			AND (${commentsOnly} = false OR f.comment IS NOT NULL)
		ORDER BY f.created_at DESC
		LIMIT ${limit}
	`)

	return rows<FeedbackRowType>(result)
}
