import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { accountStateFor } from '@/app/lib/account-state'
import { currentUser } from '@/app/lib/auth/session'
import { forgetCard, rememberCard } from '@/app/lib/billing'
import { getDb, users } from '@/app/lib/db'
import { getStripe } from '@/app/lib/stripe'

const bodySchema = z.object({ setupIntentId: z.string().min(4).max(255) })

/** Saves the card a SetupIntent just collected, and detaches the old one. */
export async function POST(request: Request) {
	const user = await currentUser()

	if (!user) {
		return NextResponse.json(
			{ error: 'Sign in to manage your card.', code: 'auth_required' },
			{ status: 401 },
		)
	}

	const parsed = bodySchema.safeParse(await request.json().catch(() => null))

	if (!parsed.success) {
		return NextResponse.json(
			{ error: 'Missing card reference.', code: 'bad_request' },
			{ status: 400 },
		)
	}

	const intent = await getStripe().setupIntents.retrieve(
		parsed.data.setupIntentId,
	)

	// Holding a setup intent id is not the same as owning it.
	if (intent.metadata?.userId !== user.id) {
		return NextResponse.json(
			{ error: 'That card is not yours.', code: 'not_owned' },
			{ status: 403 },
		)
	}

	if (intent.status !== 'succeeded') {
		return NextResponse.json(
			{ error: 'That card could not be saved.', code: 'card_failed' },
			{ status: 402 },
		)
	}

	await rememberCard(user.id, intent)

	return NextResponse.json(accountStateFor(await refetch(user.id)))
}

/** Removes the card from the account and from the Stripe customer. */
export async function DELETE() {
	const user = await currentUser()

	if (!user) {
		return NextResponse.json(
			{ error: 'Sign in to manage your card.', code: 'auth_required' },
			{ status: 401 },
		)
	}

	await forgetCard(user.id)

	return NextResponse.json(accountStateFor(await refetch(user.id)))
}

/** Re-read so the state handed back is the one that was just written. */
async function refetch(userId: string) {
	const [row] = await getDb().select().from(users).where(eq(users.id, userId))

	return row
}
