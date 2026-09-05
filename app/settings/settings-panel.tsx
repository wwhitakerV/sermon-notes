'use client'

import { useState } from 'react'
import { useAccount } from '@/app/components/account-provider'
import { CardPrompt } from '@/app/components/card-prompt'
import { Overlay } from '@/app/components/overlay'
import { CardIcon, SignOutIcon } from '@/app/components/icons'

/**
 * Account state, and the one thing here worth changing.
 *
 * Buying happens in two places: the tokens button in the header, and the prompt
 * that appears on its own when a run has nothing to spend. Selling here as well
 * only puts a shop window in the screen someone opened to check a fact.
 */
export function SettingsPanel({ memberSince }: { memberSince: string }) {
	const { account, savedCard, apply, signOut } = useAccount()
	const [editingCard, setEditingCard] = useState(false)
	const [confirmingRemove, setConfirmingRemove] = useState(false)
	const [removing, setRemoving] = useState(false)

	if (!account) {
		return null
	}

	const empty = account.tokenBalance === 0

	async function handleRemove() {
		setRemoving(true)

		try {
			const response = await fetch('/api/billing/card', { method: 'DELETE' })

			if (response.ok) {
				apply(await response.json())
				setConfirmingRemove(false)
			}
		} finally {
			setRemoving(false)
		}
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
				{/* An amount, not a field value — with no button, since the header
				    already carries the only one. */}
				<div className="flex items-center gap-4">
					<span
						className={`font-serif flex size-14 shrink-0 items-center justify-center rounded-full border text-[1.5rem] leading-none font-medium tabular-nums ${
							empty
								? 'border-line bg-paper-sunk text-ink-faint'
								: 'border-accent/25 bg-accent-tint text-accent-strong'
						}`}
					>
						{account.tokenBalance}
					</span>

					<div className="min-w-0">
						<p className="font-serif text-[1.0625rem] leading-tight font-medium">
							{empty
								? 'No tokens left'
								: `${account.tokenBalance} ${account.tokenBalance === 1 ? 'token' : 'tokens'} left`}
						</p>
						<p className="text-ink-muted mt-1 text-[0.9375rem] leading-snug text-pretty">
							{empty
								? 'Add more with the tokens button in the header.'
								: `Enough for ${account.tokenBalance} more ${account.tokenBalance === 1 ? 'sermon' : 'sermons'}. One token, one sermon.`}
						</p>
					</div>
				</div>
			</Row>

			<Row label="Payment method">
				{savedCard ? (
					<div className="flex flex-wrap items-center gap-x-4 gap-y-3">
						<span className="flex min-w-0 items-center gap-3">
							<CardIcon className="text-ink-faint size-5 shrink-0" />
							<span className="text-[0.9375rem] capitalize">
								{savedCard.brand}{' '}
								<span className="font-mono normal-case">
									···{savedCard.last4}
								</span>
							</span>
						</span>

						<span className="ml-auto flex items-center gap-2">
							<SmallButton onClick={() => setEditingCard(true)}>
								Replace
							</SmallButton>
							<SmallButton onClick={() => setConfirmingRemove(true)} danger>
								Remove
							</SmallButton>
						</span>
					</div>
				) : (
					<div className="flex flex-wrap items-center gap-x-4 gap-y-3">
						<span className="flex items-center gap-3">
							<CardIcon className="text-ink-faint size-5 shrink-0" />
							<span className="text-ink-muted text-[0.9375rem]">
								No card on file.
							</span>
						</span>

						<span className="ml-auto">
							<SmallButton onClick={() => setEditingCard(true)}>
								Add a card
							</SmallButton>
						</span>
					</div>
				)}

				{confirmingRemove && (
					<div className="border-accent/25 bg-accent-tint mt-4 rounded-xl border p-3.5">
						<p className="text-[0.875rem]">
							Remove this card? Buying tokens will ask for one again.
						</p>
						<div className="mt-3 flex items-center gap-2">
							<SmallButton onClick={handleRemove} danger disabled={removing}>
								{removing ? 'Removing…' : 'Yes, remove it'}
							</SmallButton>
							<SmallButton onClick={() => setConfirmingRemove(false)}>
								Keep it
							</SmallButton>
						</div>
					</div>
				)}
			</Row>

			<button
				type="button"
				onClick={() => void signOut()}
				className="border-line bg-surface text-ink-muted hover:border-accent/40 hover:text-accent-strong flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-medium transition-colors"
			>
				<SignOutIcon className="size-4" />
				Sign out
			</button>

			{editingCard && (
				<Overlay onDismiss={() => setEditingCard(false)}>
					<CardPrompt
						savedCard={savedCard}
						onSaved={next => {
							apply(next)
							setEditingCard(false)
						}}
						onDismiss={() => setEditingCard(false)}
					/>
				</Overlay>
			)}
		</div>
	)
}

function SmallButton({
	onClick,
	danger = false,
	disabled = false,
	children,
}: {
	onClick: () => void
	danger?: boolean
	disabled?: boolean
	children: React.ReactNode
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={`focus-visible:ring-accent/40 rounded-lg border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50 ${
				danger
					? 'border-accent/30 text-accent-strong hover:border-accent hover:bg-accent-tint'
					: 'border-line text-ink-muted hover:border-line-strong hover:text-ink bg-surface'
			}`}
		>
			{children}
		</button>
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
