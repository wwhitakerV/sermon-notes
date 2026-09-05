import { NextResponse } from 'next/server'
import { accountStateFor } from '@/app/lib/account-state'
import { currentUser } from '@/app/lib/auth/session'
import { ensureCustomer } from '@/app/lib/billing'
import { getStripe } from '@/app/lib/stripe'

/**
 * A SetupIntent for changing the card on file — collecting details without
 * charging anything. Buying tokens does not use this: there the card is saved
 * as a side effect of the purchase itself.
 */
export async function POST() {
	const user = await currentUser()

	if (!user) {
		return NextResponse.json(
			{ error: 'Sign in to manage your card.', code: 'auth_required' },
			{ status: 401 },
		)
	}

	const intent = await getStripe().setupIntents.create({
		customer: await ensureCustomer(user),
		usage: 'off_session',
		payment_method_types: ['card'],
		metadata: { userId: user.id },
	})

	return NextResponse.json({
		clientSecret: intent.client_secret,
		setupIntentId: intent.id,
		account: accountStateFor(user).account,
	})
}
