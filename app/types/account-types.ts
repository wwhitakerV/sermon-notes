/** What the client is told about the signed-in account. Never the hash. */
export type AccountType = {
	email: string
	tokenBalance: number
}

/** Enough to name the card at the point of charging it, and nothing more. */
export type SavedCardType = {
	brand: string
	last4: string
}

/**
 * The shape every auth route answers with, and the shape the layout hands the
 * provider on first render — so one handler can apply any of them.
 */
export type AccountStateType = {
	account: AccountType | null
	savedCard: SavedCardType | null
}
