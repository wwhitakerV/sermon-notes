/**
 * Shared between the buy prompt and the routes behind it. Prices live here and
 * only here — the client sends which pack, never how much, so a tampered
 * request cannot buy ten tokens for a dollar.
 */
export type PackType = {
	tokens: number
	cents: number
}

/** 1 token = $1 = one video. The larger packs only exist to cut card fees. */
export const TOKEN_PACKS: PackType[] = [
	{ tokens: 1, cents: 100 },
	{ tokens: 5, cents: 500 },
	{ tokens: 10, cents: 1000 },
]

/**
 * The $5 pack leads. A single $1 charge loses about a third of itself to card
 * fees, so the default that costs the reader least per video is also the one
 * that keeps the product solvent — but $1 stays on the table.
 */
export const DEFAULT_PACK_TOKENS = 5

export function findPack(tokens: unknown): PackType | null {
	return TOKEN_PACKS.find(pack => pack.tokens === tokens) ?? null
}

export function formatPrice(cents: number): string {
	return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}
