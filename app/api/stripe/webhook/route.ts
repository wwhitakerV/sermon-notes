import { NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import type Stripe from 'stripe'
import { logEvent } from '@/app/lib/analytics/events'
import { grantForIntent, markIntentFailed, rememberCard } from '@/app/lib/billing'
import { getDb, transactions, users } from '@/app/lib/db'
import { getStripe } from '@/app/lib/stripe'

/**
 * The safety net. The inline confirm grants tokens immediately so the reader is
 * not left waiting, but a closed laptop or a dropped connection must not cost
 * someone the tokens they paid for — this arrives regardless.
 *
 * Stripe redelivers, sometimes out of order, and retries anything that is not a
 * 2xx for three days. Every handler here is written to be safe to run twice.
 */
export async function POST(request: Request) {
	const signature = request.headers.get('stripe-signature')
	const secret = process.env.STRIPE_WEBHOOK_SECRET

	if (!signature || !secret) {
		return NextResponse.json({ error: 'Not configured' }, { status: 400 })
	}

	let event: Stripe.Event

	try {
		// The raw bytes, not parsed JSON: the signature is over exactly what was
		// sent, so `request.json()` here would fail verification every time.
		event = await getStripe().webhooks.constructEventAsync(
			await request.text(),
			signature,
			secret,
		)
	} catch (error) {
		console.error('stripe signature verification failed', error)

		return NextResponse.json({ error: 'Bad signature' }, { status: 400 })
	}

	try {
		await handle(event)
	} catch (error) {
		// A 500 makes Stripe retry, which is what we want for a transient fault.
		console.error(`stripe webhook ${event.type} failed`, error)

		return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
	}

	return NextResponse.json({ received: true })
}

async function handle(event: Stripe.Event): Promise<void> {
	switch (event.type) {
		case 'payment_intent.succeeded': {
			const intent = event.data.object

			// Stripe is the caller here, so there are no cookies and no device to
			// tie this to — the account is the only identity available.
			if (await grantForIntent(intent)) {
				await logEvent('purchase_succeeded', {
					deviceId: null,
					userId: intent.metadata?.userId ?? null,
					props: {
						cents: intent.amount,
						tokens: Number(intent.metadata?.tokens) || null,
					},
				})
			}

			if (intent.metadata?.userId) {
				await rememberCard(intent.metadata.userId, intent)
			}

			break
		}

		case 'payment_intent.payment_failed': {
			const intent = event.data.object

			await markIntentFailed(intent)

			await logEvent('purchase_failed', {
				deviceId: null,
				userId: intent.metadata?.userId ?? null,
				props: {
					code:
						intent.last_payment_error?.decline_code ??
						intent.last_payment_error?.code ??
						null,
				},
			})

			break
		}

		case 'charge.refunded':
			await reverse(event.data.object, 'refunded')
			break

		case 'charge.dispute.created':
			await reverse(event.data.object.charge, 'disputed')
			break

		default:
			// Everything else is subscribed to for visibility, not for action.
			break
	}
}

/**
 * Takes back what a refund or a chargeback undid.
 *
 * The balance is floored at zero rather than driven negative: tokens already
 * spent on notes cannot be un-spent, and leaving someone unable to use the app
 * until they buy back a debt is a worse answer than absorbing it.
 */
async function reverse(
	charge: Stripe.Charge | string,
	reason: 'refunded' | 'disputed',
): Promise<void> {
	const intentId =
		typeof charge === 'string'
			? await intentForCharge(charge)
			: typeof charge.payment_intent === 'string'
				? charge.payment_intent
				: (charge.payment_intent?.id ?? null)

	if (!intentId) {
		return
	}

	const db = getDb()

	const claimed = await db
		.update(transactions)
		.set({ status: reason })
		.where(
			sql`${transactions.stripePaymentIntentId} = ${intentId} AND ${transactions.status} = 'succeeded'`,
		)
		.returning({
			userId: transactions.userId,
			tokens: transactions.tokensGranted,
		})

	if (claimed.length === 0) {
		return
	}

	const { userId, tokens } = claimed[0]

	await db
		.update(users)
		.set({
			tokenBalance: sql`greatest(${users.tokenBalance} - ${tokens}, 0)`,
		})
		.where(eq(users.id, userId))
}

async function intentForCharge(chargeId: string): Promise<string | null> {
	const charge = await getStripe().charges.retrieve(chargeId)

	return typeof charge.payment_intent === 'string'
		? charge.payment_intent
		: (charge.payment_intent?.id ?? null)
}
