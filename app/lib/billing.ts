import { eq, sql } from 'drizzle-orm'
import type Stripe from 'stripe'
import { getDb, transactions, users } from '@/app/lib/db'
import type { UserRowType } from '@/app/lib/db'
import { getStripe } from './stripe'
import type { PackType } from './token-packs'

/** Everything the grant needs, carried on the intent itself. */
type IntentMetadataType = {
	userId: string
	tokens: string
}

export async function ensureCustomer(user: UserRowType): Promise<string> {
	if (user.stripeCustomerId) {
		return user.stripeCustomerId
	}

	const customer = await getStripe().customers.create({
		email: user.email,
		metadata: { userId: user.id },
	})

	await getDb()
		.update(users)
		.set({ stripeCustomerId: customer.id })
		.where(eq(users.id, user.id))

	return customer.id
}

/**
 * Grants the tokens a payment bought — the only place a balance goes up.
 *
 * One statement, and idempotent three ways over. It writes the transaction row
 * if the row never made it (the charge succeeding but the insert failing would
 * otherwise mean money taken and nothing given), claims it only if it has not
 * already been claimed, and adds the tokens in the same breath. The inline
 * confirm and the webhook both call this, so whichever reaches the database
 * first does the work and the other is a no-op.
 */
export async function grantForIntent(
	intent: Stripe.PaymentIntent,
): Promise<boolean> {
	const metadata = intent.metadata as Partial<IntentMetadataType>
	const userId = metadata.userId
	const tokens = Number(metadata.tokens)

	if (!userId || !Number.isInteger(tokens) || tokens <= 0) {
		console.error('payment intent without usable metadata', intent.id)

		return false
	}

	const result = await getDb().execute(sql`
		WITH claimed AS (
			INSERT INTO transactions
				(user_id, amount_cents, tokens_granted, stripe_payment_intent_id, status)
			VALUES
				(${userId}::uuid, ${intent.amount}, ${tokens}, ${intent.id}, 'succeeded')
			ON CONFLICT (stripe_payment_intent_id) DO UPDATE
				SET status = 'succeeded'
				WHERE transactions.status <> 'succeeded'
			RETURNING user_id, tokens_granted
		)
		UPDATE users
			SET token_balance = token_balance + (SELECT tokens_granted FROM claimed)
			WHERE id = (SELECT user_id FROM claimed)
		RETURNING token_balance
	`)

	return rowCount(result) > 0
}

/** Records a decline so pending rows do not sit unresolved forever. */
export async function markIntentFailed(
	intent: Stripe.PaymentIntent,
): Promise<void> {
	await getDb()
		.update(transactions)
		.set({ status: 'failed' })
		.where(eq(transactions.stripePaymentIntentId, intent.id))
}

/**
 * Remembers the card so the next purchase is a single tap. Brand and last four
 * are mirrored onto the user so reading the account never has to call Stripe.
 */
export async function rememberCard(
	userId: string,
	intent: Stripe.PaymentIntent,
): Promise<void> {
	const paymentMethodId =
		typeof intent.payment_method === 'string'
			? intent.payment_method
			: intent.payment_method?.id

	if (!paymentMethodId) {
		return
	}

	const method = await getStripe().paymentMethods.retrieve(paymentMethodId)

	await getDb()
		.update(users)
		.set({
			stripePaymentMethodId: paymentMethodId,
			cardBrand: method.card?.brand ?? null,
			cardLast4: method.card?.last4 ?? null,
		})
		.where(eq(users.id, userId))
}

export function intentMetadata(
	user: UserRowType,
	pack: PackType,
): IntentMetadataType {
	return { userId: user.id, tokens: String(pack.tokens) }
}

function rowCount(result: unknown): number {
	if (Array.isArray(result)) {
		return result.length
	}

	const rows = (result as { rows?: unknown[] })?.rows

	return Array.isArray(rows) ? rows.length : 0
}
