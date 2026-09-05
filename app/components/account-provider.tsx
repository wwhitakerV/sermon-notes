'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useMemo, useState } from 'react'
import type { AccountStateType } from '@/app/types'

type AccountContextType = AccountStateType & {
	/** Adopt the state an auth route just returned, with no extra round trip. */
	apply: (next: AccountStateType) => void
	/** A run spent or returned a token. Everything else about the account holds. */
	setTokenBalance: (tokenBalance: number) => void
	signOut: () => Promise<void>
}

const AccountContext = createContext<AccountContextType | null>(null)

/**
 * Seeded from the server on first render, so the page never flashes a signed-out
 * header at someone who is signed in, and there is no fetch on mount.
 */
export function AccountProvider({
	initial,
	children,
}: {
	initial: AccountStateType
	children: React.ReactNode
}) {
	const [state, setState] = useState<AccountStateType>(initial)
	const router = useRouter()

	// `useState` reads its argument once, so without this the provider keeps
	// whatever it was mounted with for the life of the tab. A session that
	// expired, was signed out elsewhere, or was revoked would leave the header
	// showing an account that no longer exists. The server is the authority, so
	// its answer wins whenever it differs — compared by value, since every
	// render hands over a fresh object.
	const [seeded, setSeeded] = useState(() => JSON.stringify(initial))
	const incoming = JSON.stringify(initial)

	if (seeded !== incoming) {
		setSeeded(incoming)
		setState(initial)
	}

	const value = useMemo<AccountContextType>(
		() => ({
			...state,
			apply: setState,
			setTokenBalance: tokenBalance =>
				setState(current =>
					current.account
						? { ...current, account: { ...current.account, tokenBalance } }
						: current,
				),
			signOut: async () => {
				const response = await fetch('/api/auth/logout', { method: 'POST' })

				if (response.ok) {
					setState((await response.json()) as AccountStateType)
				}

				// Every screen but the home page belongs to an account, and the
				// server only turns people away on a fresh request. Signing out
				// while standing on one of them would otherwise leave an empty
				// shell behind, so leaving is part of signing out.
				//
				// `replace`, not `push`: going back to a page that will bounce you
				// is not going back.
				router.replace('/')
			},
		}),
		[state, router],
	)

	return (
		<AccountContext.Provider value={value}>{children}</AccountContext.Provider>
	)
}

export function useAccount(): AccountContextType {
	const value = useContext(AccountContext)

	if (!value) {
		throw new Error('useAccount must be used inside <AccountProvider>')
	}

	return value
}
