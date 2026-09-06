import { NextResponse } from 'next/server'
import { z } from 'zod'
import { accountStateFor } from '@/app/lib/account-state'
import { currentUser } from '@/app/lib/auth/session'
import {
	ensureCustomer,
	intentMetadata,
	purchaseDescription,
} from '@/app/lib/billing'
import { getStripe } from '@/app/lib/stripe'
import { findPack } from '@/app/lib/token-packs'

const bodySchema = z.object({ tokens: z.number().int() })

/**
 * The first purchase: an unconfirmed intent for the card form to complete.
 *
 * The client sends which pack, never the price — the amount is read from the
 * server's own table, so a tampered request cannot buy ten tokens for a dollar.
 */
export async function POST(request: Request) {
	const user = await currentUser()

	if (!user) {
		return NextResponse.json(
			{ error: 'Sign in to buy tokens.', code: 'auth_required' },
			{ status: 401 },
		)
	}

	const parsed = bodySchema.safeParse(await request.json().catch(() => null))
	const pack = parsed.success ? findPack(parsed.data.tokens) : null

	if (!pack) {
		return NextResponse.json(
			{ error: 'That is not a token pack we sell.', code: 'bad_pack' },
			{ status: 400 },
		)
	}

	const customer = await ensureCustomer(user)

	const intent = await getStripe().paymentIntents.create({
		amount: pack.cents,
		currency: 'usd',
		customer,
		// Keeps the card for next time, so this is the only time they type one.
		setup_future_usage: 'off_session',
		// Cards only: anything that would bounce the reader to another site
		// would take their pasted sermon URL with it.
		payment_method_types: ['card'],
		description: purchaseDescription(pack),
		// Stripe sends its own receipt when this is set — a hosted page with a
		// downloadable PDF, a receipt number and the card used.
		receipt_email: user.email,
		metadata: intentMetadata(user, pack),
	})

	return NextResponse.json({
		clientSecret: intent.client_secret,
		paymentIntentId: intent.id,
		account: accountStateFor(user).account,
	})
}
