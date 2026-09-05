import { cookies } from 'next/headers'
import { eq, sql } from 'drizzle-orm'
import { devices, getDb } from '@/app/lib/db'
import type { DeviceRowType } from '@/app/lib/db'
import { DEVICE_COOKIE, UUID_PATTERN } from './device-cookie'
import { unsignValue } from './signed-value'

export { DEVICE_COOKIE, DEVICE_COOKIE_MAX_AGE } from './device-cookie'

/**
 * The device id minted by `proxy.ts`, or null if the cookie is missing or its
 * signature does not verify. A forged cookie is treated as no cookie at all.
 */
export async function readDeviceId(): Promise<string | null> {
	const store = await cookies()
	const value = unsignValue(store.get(DEVICE_COOKIE)?.value)

	return value && UUID_PATTERN.test(value) ? value : null
}

/**
 * Rows are created lazily: `proxy.ts` runs on every page request and has no
 * business writing to the database, so the row appears the first time this
 * device actually tries to spend a video.
 */
export async function ensureDevice(deviceId: string): Promise<DeviceRowType> {
	const db = getDb()

	await db
		.insert(devices)
		.values({ id: deviceId })
		.onConflictDoNothing({ target: devices.id })

	const [row] = await db.select().from(devices).where(eq(devices.id, deviceId))

	return row
}

/**
 * Records which account this browser signed up as. The free-video flag itself
 * is copied onto the user row at creation time, not here — this link is for
 * audit, so losing it cannot hand out a second free video.
 */
export async function linkDeviceToUser(
	deviceId: string,
	userId: string,
): Promise<void> {
	await getDb()
		.update(devices)
		.set({ linkedUserId: userId })
		.where(eq(devices.id, deviceId))
}

/** Marks the free video spent. Best-effort: the account flag is the guard. */
export async function markDeviceFreeUsed(deviceId: string): Promise<void> {
	await getDb()
		.update(devices)
		.set({ freeVideoUsed: true, freeVideoUsedAt: sql`now()` })
		.where(eq(devices.id, deviceId))
}
