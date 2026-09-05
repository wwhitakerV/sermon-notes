import type { AccountStateType } from '@/app/types'
import type { UserRowType } from './db'
import { currentUser } from './auth/session'

/**
 * The one place the client's view of an account is assembled, so `/api/me`, the
 * auth routes and the server-rendered first paint can never disagree.
 *
 * Whether the free video is still available is deliberately not here: nothing
 * renders it, and working it out costs a `devices` lookup on every page. The
 * server decides that when a run is actually claimed.
 */
export function accountStateFor(user: UserRowType | null): AccountStateType {
	return {
		account: user
			? { email: user.email, tokenBalance: user.tokenBalance }
			: null,
		// Mirrored onto the user row when a card is kept, so reading the account
		// never has to call Stripe.
		savedCard:
			user?.cardBrand && user.cardLast4
				? { brand: user.cardBrand, last4: user.cardLast4 }
				: null,
	}
}

export async function readAccountState(): Promise<AccountStateType> {
	return accountStateFor(await currentUser())
}
