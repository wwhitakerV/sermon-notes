'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import type { AccountStateType } from '@/app/types'

type AccountContextType = AccountStateType & {
	/** Adopt the state an auth route just returned, with no extra round trip. */
	apply: (next: AccountStateType) => void
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
			signOut: async () => {
				const response = await fetch('/api/auth/logout', { method: 'POST' })

				if (response.ok) {
					setState((await response.json()) as AccountStateType)
				}
			},
		}),
		[state],
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
