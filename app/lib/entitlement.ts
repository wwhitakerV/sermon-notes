import { and, eq, gt, sql } from 'drizzle-orm'
import { conversions, devices, getDb, users } from '@/app/lib/db'
import type { DeviceRowType, UserRowType } from '@/app/lib/db'
import { ensureDevice, markDeviceFreeUsed } from './auth/device'

/** What paid for a run, and what to hand back if the pipeline falls over. */
export type GrantType = {
	source: 'free' | 'token'
	userId: string | null
	deviceId: string | null
	conversionId: string
	/**
	 * What the account has left, straight from the statement that spent it.
	 * Null when nothing was spent — a free video, or notes already owned.
	 */
	balance: number | null
}

export type DeniedReasonType = 'auth_required' | 'payment_required'

export type ClaimType =
	| { ok: true; grant: GrantType }
	| { ok: false; reason: DeniedReasonType; balance: number }

type ClaimInputType = {
	user: UserRowType | null
	deviceId: string | null
	videoId: string
}

/**
 * Decides who pays for this video and takes the payment, before a single line
 * of transcript is fetched.
 *
 * Every branch that spends something does it in one conditional `UPDATE ...
 * RETURNING`: the row is only claimed if it was still unclaimed when the
 * statement ran. Two tabs submitting at once, or a double-clicked button, can
 * therefore never spend the same free video or the same token twice, and the
 * balance can never go negative — without a lock or a transaction.
 */
export async function claimGeneration({
	user,
	deviceId,
	videoId,
}: ClaimInputType): Promise<ClaimType> {
	const db = getDb()
	const device = deviceId ? await ensureDevice(deviceId) : null

	if (user) {
		// The free video comes first: someone who still has one owed to them
		// should never have a token taken instead.
		if (isFreeAvailable(user, device)) {
			const claimed = await db
				.update(users)
				.set({ freeVideoUsed: true })
				.where(and(eq(users.id, user.id), eq(users.freeVideoUsed, false)))
				.returning({ id: users.id })

			if (claimed.length > 0) {
				if (deviceId) {
					await markDeviceFreeUsed(deviceId)
				}

				return recordGrant({
					source: 'free',
					userId: user.id,
					deviceId,
					videoId,
				})
			}
		}

		const spent = await db
			.update(users)
			.set({ tokenBalance: sql`${users.tokenBalance} - 1` })
			.where(and(eq(users.id, user.id), gt(users.tokenBalance, 0)))
			.returning({ balance: users.tokenBalance })

		if (spent.length > 0) {
			return recordGrant({
				source: 'token',
				userId: user.id,
				deviceId,
				videoId,
				balance: spent[0].balance,
			})
		}

		return { ok: false, reason: 'payment_required', balance: 0 }
	}

	// A missing or forged device cookie cannot be trusted with a free video.
	if (!deviceId) {
		return { ok: false, reason: 'auth_required', balance: 0 }
	}

	const burned = await db
		.update(devices)
		.set({ freeVideoUsed: true, freeVideoUsedAt: sql`now()` })
		.where(and(eq(devices.id, deviceId), eq(devices.freeVideoUsed, false)))
		.returning({ id: devices.id })

	if (burned.length > 0) {
		return recordGrant({ source: 'free', userId: null, deviceId, videoId })
	}

	return { ok: false, reason: 'auth_required', balance: 0 }
}

/**
 * Hands back what a run cost when the pipeline failed before producing notes.
 * Spending up front is what keeps the guards atomic; this is the other half of
 * that bargain, so a broken transcript never costs a real dollar.
 */
export async function refundGeneration(
	grant: GrantType,
): Promise<number | null> {
	const db = getDb()
	let balance: number | null = null

	if (grant.source === 'token' && grant.userId) {
		const [row] = await db
			.update(users)
			.set({ tokenBalance: sql`${users.tokenBalance} + 1` })
			.where(eq(users.id, grant.userId))
			.returning({ balance: users.tokenBalance })

		balance = row?.balance ?? null
	}

	if (grant.source === 'free') {
		if (grant.userId) {
			await db
				.update(users)
				.set({ freeVideoUsed: false })
				.where(eq(users.id, grant.userId))
		}

		if (grant.deviceId) {
			await db
				.update(devices)
				.set({ freeVideoUsed: false, freeVideoUsedAt: null })
				.where(eq(devices.id, grant.deviceId))
		}
	}

	await db
		.update(conversions)
		.set({ refunded: true })
		.where(eq(conversions.id, grant.conversionId))

	return balance
}

/**
 * Whether this visitor still has their free video. A signed-in user needs both
 * their account and the browser they are sitting at to be unspent, so signing
 * up again in the same browser cannot mint a second one.
 */
function isFreeAvailable(
	user: UserRowType | null,
	device: DeviceRowType | null,
): boolean {
	if (device?.freeVideoUsed) {
		return false
	}

	return user ? !user.freeVideoUsed : true
}

async function recordGrant({
	source,
	userId,
	deviceId,
	videoId,
	balance = null,
}: Omit<GrantType, 'conversionId' | 'balance'> & {
	videoId: string
	balance?: number | null
}): Promise<ClaimType> {
	const [row] = await getDb()
		.insert(conversions)
		.values({ userId, deviceId, videoId, source })
		.returning({ id: conversions.id })

	return {
		ok: true,
		grant: { source, userId, deviceId, conversionId: row.id, balance },
	}
}
