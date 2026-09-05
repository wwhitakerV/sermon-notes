'use client'

import { useAccount } from '@/app/components/account-provider'
import { CardIcon, SignOutIcon, TokenIcon } from '@/app/components/icons'

/**
 * Account state, and nothing else.
 *
 * Buying happens in two places: the tokens button in the header, and the prompt
 * that appears on its own when a run has nothing to spend. Selling here as well
 * only puts a shop window in the one screen someone opened to check a fact.
 */
export function SettingsPanel({ memberSince }: { memberSince: string }) {
	const { account, savedCard, signOut } = useAccount()

	if (!account) {
		return null
	}

	return (
		<div className="space-y-3">
			<Row label="Account">
				<div className="flex items-center gap-3">
					<span className="border-line bg-paper-sunk text-ink-muted flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold uppercase">
						{account.email.charAt(0)}
					</span>
					<div className="min-w-0">
						<p className="truncate text-[0.9375rem]">{account.email}</p>
						<p className="text-ink-faint text-[0.8125rem]">
							Member since {memberSince}
						</p>
					</div>
				</div>
			</Row>

			<Row label="Tokens">
				<div className="flex items-center gap-3">
					<TokenIcon className="text-ink-faint size-5 shrink-0" />
					<div>
						<p className="font-serif text-[1.125rem] leading-none font-medium tabular-nums">
							{account.tokenBalance}
						</p>
						<p className="text-ink-faint mt-1.5 text-[0.8125rem]">
							One token, one sermon.
						</p>
					</div>
				</div>
			</Row>

			<Row label="Payment method">
				<div className="flex items-center gap-3">
					<CardIcon className="text-ink-faint size-5 shrink-0" />
					<p className="text-[0.9375rem]">
						{savedCard ? (
							<>
								{savedCard.brand}{' '}
								<span className="font-mono">···{savedCard.last4}</span>
							</>
						) : (
							<span className="text-ink-muted">
								No card yet — you will add one the first time you buy tokens.
							</span>
						)}
					</p>
				</div>
			</Row>

			<button
				type="button"
				onClick={() => void signOut()}
				className="border-line bg-surface text-ink-muted hover:border-accent/40 hover:text-accent-strong flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-medium transition-colors"
			>
				<SignOutIcon className="size-4" />
				Sign out
			</button>
		</div>
	)
}

function Row({
	label,
	children,
}: {
	label: string
	children: React.ReactNode
}) {
	return (
		<section className="border-line bg-surface rounded-2xl border p-5">
			<h2 className="text-ink-faint text-[0.6875rem] font-medium tracking-[0.14em] uppercase">
				{label}
			</h2>
			<div className="mt-3.5">{children}</div>
		</section>
	)
}
