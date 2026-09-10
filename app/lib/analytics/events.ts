import { cookies } from 'next/headers'
import { UUID_PATTERN } from '@/app/lib/auth/device-cookie'
import { events, getDb } from '@/app/lib/db'
import {
	ATTRIBUTION_COOKIE,
	decodeAttribution,
	type AttributionType,
} from './attribution-cookie'

/**
 * Every step worth counting, named once so a typo fails the build rather than
 * quietly creating a second event nobody queries.
 */
export type EventNameType =
	/** A link was pasted and accepted. */
	| 'link_submitted'
	/** Pasted, but not a YouTube link. */
	| 'link_rejected'
	/** A run began. `cached` is the difference between free and paid-for. */
	| 'run_started'
	| 'run_failed'
	/** Notes actually reached the reader. */
	| 'notes_delivered'
	/** The reader was shown the opening and stopped there. */
	| 'gate_shown'
	/** Signed in, but out of tokens. */
	| 'paywall_shown'
	| 'signup_succeeded'
	| 'signin_succeeded'
	| 'purchase_succeeded'
	| 'purchase_failed'

type LogOptionsType = {
	deviceId?: string | null
	userId?: string | null
	videoId?: string | null
	props?: Record<string, unknown>
}

/**
 * Records one step. Never throws, and never rejects.
 *
 * Analytics must not be able to fail a sermon or, far worse, a payment: every
 * call site here sits inside something that matters more than the measurement.
 * A lost row is the correct outcome of a bad day for this table.
 *
 * Callers pass the identities they already hold rather than having them looked
 * up again — most of these fire in handlers that resolved the user a few lines
 * earlier.
 */
export async function logEvent(
	name: EventNameType,
	options: LogOptionsType = {},
): Promise<void> {
	try {
		const attribution = await readAttribution()

		const props = {
			...options.props,
			...(attribution ? { attribution } : {}),
		}

		const deviceId = options.deviceId ?? null

		await getDb()
			.insert(events)
			.values({
				name,
				// A malformed id would fail the insert on the uuid column and take
				// the whole event with it.
				deviceId: deviceId && UUID_PATTERN.test(deviceId) ? deviceId : null,
				userId: options.userId ?? null,
				videoId: options.videoId ?? null,
				props: Object.keys(props).length > 0 ? props : null,
			})
	} catch (error) {
		console.error(`event ${name} not recorded`, error)
	}
}

/**
 * Attribution rides along on whatever events happen inside a request that can
 * still read cookies. That is every handler — the gap is events emitted from
 * inside an open stream, which belong to the same visit as the
 * `link_submitted` that already carried it.
 */
async function readAttribution(): Promise<AttributionType | null> {
	try {
		const store = await cookies()

		return decodeAttribution(store.get(ATTRIBUTION_COOKIE)?.value)
	} catch {
		return null
	}
}
