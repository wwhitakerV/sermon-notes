-- Queries for the `events` table. Nothing here is wired into the app; paste
-- into the Neon SQL editor, or psql against DATABASE_URL.
--
-- There is no session column by design: visits are cut from the gaps between
-- events, so the 30-minute rule below can be changed at any time without the
-- recorded rows being wrong.

-- ---------------------------------------------------------------------------
-- The funnel, last 30 days. The number that matters is how much falls off
-- between gate_shown and signup_succeeded.
-- ---------------------------------------------------------------------------
SELECT
	count(*) FILTER (WHERE name = 'link_submitted')     AS pasted,
	count(*) FILTER (WHERE name = 'link_rejected')      AS bad_link,
	count(*) FILTER (WHERE name = 'run_failed')         AS failed,
	count(*) FILTER (WHERE name = 'gate_shown')         AS hit_the_wall,
	count(*) FILTER (WHERE name = 'signup_succeeded')   AS signed_up,
	count(*) FILTER (WHERE name = 'paywall_shown')      AS out_of_tokens,
	count(*) FILTER (WHERE name = 'purchase_succeeded') AS bought
FROM events
WHERE occurred_at > now() - interval '30 days';

-- ---------------------------------------------------------------------------
-- Cache hit rate. Every `false` is a Supadata call and an OpenAI bill; every
-- `true` is pure margin.
-- ---------------------------------------------------------------------------
SELECT
	props->>'cached' AS served_from_cache,
	count(*)         AS runs
FROM events
WHERE name = 'run_started'
GROUP BY 1;

-- ---------------------------------------------------------------------------
-- Does the funnel differ by where people came from? This is the query the
-- marketing pages and the church emails exist to move.
-- ---------------------------------------------------------------------------
SELECT
	coalesce(props->'attribution'->>'source', props->'attribution'->>'ref', '(direct)') AS came_from,
	count(DISTINCT device_id) FILTER (WHERE name = 'link_submitted')     AS visitors_who_pasted,
	count(*)                  FILTER (WHERE name = 'signup_succeeded')  AS signed_up,
	count(*)                  FILTER (WHERE name = 'purchase_succeeded') AS bought
FROM events
GROUP BY 1
ORDER BY visitors_who_pasted DESC;

-- ---------------------------------------------------------------------------
-- Signed in vs signed out, per step.
-- ---------------------------------------------------------------------------
SELECT
	name,
	count(*) FILTER (WHERE user_id IS NULL)     AS anonymous,
	count(*) FILTER (WHERE user_id IS NOT NULL) AS signed_in
FROM events
GROUP BY name
ORDER BY name;

-- ---------------------------------------------------------------------------
-- Visits, cut on a 30-minute gap. Two levels because a window function may not
-- be nested inside another.
-- ---------------------------------------------------------------------------
SELECT
	device_id,
	sum(started_visit) OVER (PARTITION BY device_id ORDER BY occurred_at) AS visit,
	name,
	occurred_at
FROM (
	SELECT
		device_id,
		name,
		occurred_at,
		CASE
			WHEN lag(occurred_at) OVER (PARTITION BY device_id ORDER BY occurred_at) IS NULL
				OR occurred_at - lag(occurred_at) OVER (PARTITION BY device_id ORDER BY occurred_at)
					> interval '30 minutes'
			THEN 1
			ELSE 0
		END AS started_visit
	FROM events
	WHERE device_id IS NOT NULL
) marked
ORDER BY device_id, occurred_at;

-- ---------------------------------------------------------------------------
-- What a buyer did before they were a buyer.
--
-- `devices.linked_user_id` is set at signup, so the anonymous half of someone's
-- history joins to the account they later created. This is the only way to ask
-- what converters did differently, and it is why the device cookie outliving
-- sign-out matters.
-- ---------------------------------------------------------------------------
SELECT
	u.email,
	e.name,
	e.user_id IS NOT NULL AS signed_in_at_the_time,
	e.occurred_at
FROM events e
JOIN devices d ON d.id = e.device_id
JOIN users u   ON u.id = d.linked_user_id
WHERE EXISTS (
	SELECT 1 FROM events p
	WHERE p.user_id = u.id AND p.name = 'purchase_succeeded'
)
ORDER BY u.email, e.occurred_at;

-- ---------------------------------------------------------------------------
-- Repeat purchases. Whether this is a business or a novelty.
-- ---------------------------------------------------------------------------
SELECT
	purchases,
	count(*) AS buyers
FROM (
	SELECT user_id, count(*) AS purchases
	FROM events
	WHERE name = 'purchase_succeeded' AND user_id IS NOT NULL
	GROUP BY user_id
) per_buyer
GROUP BY purchases
ORDER BY purchases;
