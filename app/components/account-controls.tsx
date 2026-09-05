'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useAccount } from './account-provider'
import { AuthPrompt } from './auth-prompt'
import {
	LibraryIcon,
	SettingsIcon,
	SignOutIcon,
	TokenIcon,
} from './icons'
import { Overlay } from './overlay'
import { PaywallPrompt } from './paywall-prompt'
import { Tooltip } from './tooltip'

/**
 * Library, tokens and the account menu. Shared by the page header and the notes
 * toolbar so the two can never drift apart.
 */
export function AccountControls() {
	const { account, savedCard, apply, signOut } = useAccount()
	const [buying, setBuying] = useState(false)
	const [signingIn, setSigningIn] = useState(false)

	if (!account) {
		return (
			<>
				<button
					type="button"
					onClick={() => setSigningIn(true)}
					className="text-ink-muted hover:text-ink rounded-full px-2 py-1.5 text-[0.8125rem] font-medium transition-colors"
				>
					Sign in
				</button>

				{signingIn && (
					<Overlay onDismiss={() => setSigningIn(false)}>
						<AuthPrompt
							variant="signin"
							onSuccess={next => {
								apply(next)
								setSigningIn(false)
							}}
							onDismiss={() => setSigningIn(false)}
						/>
					</Overlay>
				)}
			</>
		)
	}

	const empty = account.tokenBalance === 0

	return (
		<>
			{/*
			 * The only deliberate way to buy anything, now that settings sells
			 * nothing — so at zero it stops reporting a balance and asks for
			 * attention. Outlined rather than filled, and a touch shorter than the
			 * button beside it: two filled accent pills side by side read as a
			 * matched pair, and these are not a pair. Taking notes is the verb;
			 * this is what you need when you cannot.
			 */}
			<Tooltip label="Add tokens" placement="bottom">
				<button
					type="button"
					onClick={() => setBuying(true)}
					aria-label="Add tokens"
					className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.8125rem] font-medium transition-colors sm:px-3 ${
						empty
							? 'border-accent bg-accent-tint text-accent-strong hover:border-accent-strong hover:bg-accent/15'
							: 'border-line bg-surface/70 text-accent-strong hover:border-accent/40 hover:bg-accent-tint'
					}`}
				>
					<TokenIcon className="size-4 shrink-0" />

					{empty ? (
						<span className="whitespace-nowrap">Add tokens</span>
					) : (
						<>
							<span className="font-mono tabular-nums">
								{account.tokenBalance}
							</span>
							<span
								className="hidden sm:inline"
							>
								{account.tokenBalance === 1 ? 'token' : 'tokens'}
							</span>
						</>
					)}
				</button>
			</Tooltip>

			<AccountMenu email={account.email} onSignOut={signOut} />

			{buying && (
				<Overlay onDismiss={() => setBuying(false)}>
					<PaywallPrompt
						balance={account.tokenBalance}
						savedCard={savedCard}
						onPurchased={next => {
							apply(next)
							setBuying(false)
						}}
						onDismiss={() => setBuying(false)}
					/>
				</Overlay>
			)}
		</>
	)
}

/**
 * The avatar and what sits under it. Opens on hover for a mouse and on tap for
 * everything else, because a hover-only menu is unreachable on a phone.
 */
function AccountMenu({
	email,
	onSignOut,
}: {
	email: string
	onSignOut: () => void
}) {
	const [open, setOpen] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		if (!open) {
			return
		}

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				setOpen(false)
			}
		}

		function onPointerDown(event: PointerEvent) {
			if (!containerRef.current?.contains(event.target as Node)) {
				setOpen(false)
			}
		}

		window.addEventListener('keydown', onKeyDown)
		window.addEventListener('pointerdown', onPointerDown)

		return () => {
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('pointerdown', onPointerDown)
		}
	}, [open])

	useEffect(
		() => () => {
			if (closeTimer.current) {
				clearTimeout(closeTimer.current)
			}
		},
		[],
	)

	function cancelClose() {
		if (closeTimer.current) {
			clearTimeout(closeTimer.current)
			closeTimer.current = null
		}
	}

	return (
		<div
			ref={containerRef}
			className="relative"
			onMouseEnter={() => {
				cancelClose()
				setOpen(true)
			}}
			onMouseLeave={() => {
				// A beat of grace, so the diagonal from the avatar to the menu does
				// not close it out from under the pointer.
				cancelClose()
				closeTimer.current = setTimeout(() => setOpen(false), 180)
			}}
		>
			<button
				type="button"
				onClick={() => setOpen(current => !current)}
				aria-haspopup="menu"
				aria-expanded={open}
				className="border-line bg-paper-sunk text-ink-muted hover:text-ink hover:border-line-strong focus-visible:ring-accent/40 flex size-8 items-center justify-center rounded-full border text-[0.8125rem] font-semibold uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
			>
				{email.charAt(0)}
				<span className="sr-only">Account menu</span>
			</button>

			{open && (
				<div
					role="menu"
					className="border-line bg-surface animate-fade absolute top-full right-0 z-40 mt-2 w-60 overflow-hidden rounded-2xl border py-1.5 shadow-[0_1px_2px_rgb(26_24_21/0.04),0_16px_40px_-20px_rgb(26_24_21/0.28)]"
				>
					<p className="border-line text-ink-faint truncate border-b px-4 pt-1.5 pb-3 text-[0.8125rem]">
						{email}
					</p>

					{/* Also in the menu because the link itself is hidden on phones. */}
					<MenuLink href="/library" onNavigate={() => setOpen(false)}>
						<LibraryIcon className="size-4 shrink-0" />
						Library
					</MenuLink>

					<MenuLink href="/settings" onNavigate={() => setOpen(false)}>
						<SettingsIcon className="size-4 shrink-0" />
						Settings
					</MenuLink>

					<button
						type="button"
						role="menuitem"
						onClick={() => {
							setOpen(false)
							void onSignOut()
						}}
						className="text-ink-muted hover:bg-paper-sunk hover:text-ink flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors"
					>
						<SignOutIcon className="size-4 shrink-0" />
						Sign out
					</button>
				</div>
			)}
		</div>
	)
}

function MenuLink({
	href,
	onNavigate,
	children,
}: {
	href: string
	onNavigate: () => void
	children: React.ReactNode
}) {
	return (
		<Link
			href={href}
			role="menuitem"
			onClick={onNavigate}
			className="text-ink-muted hover:bg-paper-sunk hover:text-ink flex items-center gap-2.5 px-4 py-2 text-sm transition-colors first:mt-1.5"
		>
			{children}
		</Link>
	)
}
