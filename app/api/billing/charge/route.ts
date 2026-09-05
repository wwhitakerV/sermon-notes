import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { accountStateFor } from '@/app/lib/account-state'
import { currentUser } from '@/app/lib/auth/session'
import {
	ensureCustomer,
	grantForIntent,
	intentMetadata,
	markIntentFailed,
} from '@/app/lib/billing'
import { getDb, users } from '@/app/lib/db'
import { getStripe } from '@/app/lib/stripe'
import { findPack } from '@/app/lib/token-packs'

const bodySchema = z.object({
	tokens: z.number().int(),
	idempotencyKey: z.string().min(8).max(255),
})

/**
 * Every purchase after the first: one tap, no card form.
 *
 * The idempotency key comes from the client and is stable for one attempt, so
 * a double-clicked button or a retried request settles on the same charge in
 * Stripe rather than taking the money twice.
 */
export async function POST(request: Request) {
	const user = await currentUser()

	if (!user) {
		return NextResponse.json(
			{ error: 'Sign in to buy tokens.', code: 'auth_required' },
			{ status: 401 },
		)
	}

	if (!user.stripePaymentMethodId) {
		return NextResponse.json(
			{ error: 'No card on file.', code: 'no_card' },
			{ status: 409 },
		)
	}

	const parsed = bodySchema.safeParse(await request.json().catch(() => null))
	const pack = parsed.success ? findPack(parsed.data.tokens) : null

	if (!pack || !parsed.success) {
		return NextResponse.json(
			{ error: 'That is not a token pack we sell.', code: 'bad_pack' },
			{ status: 400 },
		)
	}

	const customer = await ensureCustomer(user)

	try {
		const intent = await getStripe().paymentIntents.create(
			{
				amount: pack.cents,
				currency: 'usd',
				customer,
				payment_method: user.stripePaymentMethodId,
				off_session: true,
				confirm: true,
				payment_method_types: ['card'],
				metadata: intentMetadata(user, pack),
			},
			{ idempotencyKey: parsed.data.idempotencyKey },
		)

		if (intent.status === 'succeeded') {
			await grantForIntent(intent)

			return NextResponse.json(accountStateFor(await refetch(user.id)))
		}

		// The bank wants the cardholder present after all. Handled in the same
		// prompt rather than by sending them anywhere.
		if (
			intent.status === 'requires_action' ||
			intent.status === 'requires_confirmation'
		) {
			return NextResponse.json({
				requiresAction: true,
				clientSecret: intent.client_secret,
				paymentIntentId: intent.id,
			})
		}

		await markIntentFailed(intent)

		return NextResponse.json(
			{ error: 'That payment did not go through.', code: 'payment_failed' },
			{ status: 402 },
		)
	} catch (error) {
		const message =
			error && typeof error === 'object' && 'message' in error
				? String((error as { message: unknown }).message)
				: 'That payment did not go through.'

		return NextResponse.json(
			{ error: message, code: 'payment_failed' },
			{ status: 402 },
		)
	}
}

/** Re-read so the balance handed back is the one the grant just wrote. */
async function refetch(userId: string) {
	const [row] = await getDb().select().from(users).where(eq(users.id, userId))

	return row
}
