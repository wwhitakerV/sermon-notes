import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { accountStateFor } from '@/app/lib/account-state'
import { currentUser } from '@/app/lib/auth/session'
import { grantForIntent, markIntentFailed, rememberCard } from '@/app/lib/billing'
import { getDb, users } from '@/app/lib/db'
import { getStripe } from '@/app/lib/stripe'

const bodySchema = z.object({ paymentIntentId: z.string().min(4).max(255) })

/**
 * Called once the browser has finished with a card, so the tokens land before
 * the reader has to wonder whether they did.
 *
 * The webhook does exactly the same work independently — this is the fast path,
 * not the trustworthy one. The intent is re-read from Stripe rather than taken
 * on the client's word, and the grant is the same idempotent statement, so the
 * two racing each other is fine.
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

	if (!parsed.success) {
		return NextResponse.json(
			{ error: 'Missing payment reference.', code: 'bad_request' },
			{ status: 400 },
		)
	}

	const intent = await getStripe().paymentIntents.retrieve(
		parsed.data.paymentIntentId,
	)

	// Holding an intent id is not the same as owning it.
	if (intent.metadata?.userId !== user.id) {
		return NextResponse.json(
			{ error: 'That payment is not yours.', code: 'not_owned' },
			{ status: 403 },
		)
	}

	if (intent.status !== 'succeeded') {
		if (intent.status === 'canceled' || intent.status === 'requires_payment_method') {
			await markIntentFailed(intent)
		}

		return NextResponse.json(
			{ error: 'That payment did not go through.', code: 'payment_failed' },
			{ status: 402 },
		)
	}

	await grantForIntent(intent)
	await rememberCard(user.id, intent)

	const [fresh] = await getDb().select().from(users).where(eq(users.id, user.id))

	return NextResponse.json(accountStateFor(fresh))
}
