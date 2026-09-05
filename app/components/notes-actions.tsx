'use client'

import { useEffect, useState } from 'react'
import type { SermonNotesType, VideoMetaType } from '@/app/types'
import { notesToText } from '@/app/lib/notes-text'
import { formatTimestamp } from '@/app/lib/youtube'
import {
	ArrowUpIcon,
	CheckIcon,
	CopyIcon,
	ListIcon,
	PrintIcon,
} from './icons'
import { Tooltip } from './tooltip'

export type NavItemType = {
	id: string
	label: string
	timestamp?: string
}

type Props = {
	notes: SermonNotesType
	meta: VideoMetaType | null
	navItems: NavItemType[]
	activeId: string | null
	/** The model is still writing, so the notes are not final yet. */
	disabled?: boolean
	/**
	 * Only the opening of the notes is on the page. Copy and print are not shown
	 * at all rather than shown greyed out: an account has not been created yet,
	 * so offering them is offering something that is not on the table.
	 */
	locked?: boolean
	/** Scrolled far enough that returning to the top is worth offering. */
	showBackToTop: boolean
}

/**
 * What you can do with the notes in front of you, floated out of the way rather
 * than given a bar of their own.
 *
 * The header is app chrome — where you can go and who you are — and stays thin
 * because it is on every screen. These belong to this document only, so they
 * live beside it instead of pushing it down.
 */
export function NotesActions({
	notes,
	meta,
	navItems,
	activeId,
	disabled = false,
	locked = false,
	showBackToTop,
}: Props) {
	const [copied, setCopied] = useState(false)
	const [menuOpen, setMenuOpen] = useState(false)

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(notesToText(notes, meta))
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {
			setCopied(false)
		}
	}

	useEffect(() => {
		if (!menuOpen) {
			return
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setMenuOpen(false)
			}
		}

		window.addEventListener('keydown', onKeyDown)

		return () => window.removeEventListener('keydown', onKeyDown)
	}, [menuOpen])

	function jumpTo(id: string) {
		setMenuOpen(false)
		document.getElementById(id)?.scrollIntoView({ block: 'start' })
	}

	return (
		<>
			<div className="no-print fixed right-4 bottom-4 z-30 flex flex-col items-end gap-2 sm:right-6 sm:bottom-6">
				{/* Below `lg` there is no margin outline, so this is the only way
				    around a long set of notes. */}
				<FloatingButton
					label="Sections"
					onClick={() => setMenuOpen(current => !current)}
					className="lg:hidden"
					pressed={menuOpen}
				>
					<ListIcon className="size-5" />
				</FloatingButton>

				{/* Warmed rather than tinted: these two act on the notes, where the
				    other two only move around them. */}
				{!locked && (
					<FloatingButton
						label={copied ? 'Copied' : 'Copy notes'}
						onClick={handleCopy}
						disabled={disabled}
						tone="accent"
					>
						{copied ? (
							<CheckIcon className="size-5" />
						) : (
							<CopyIcon className="size-5" />
						)}
					</FloatingButton>
				)}

				{/* Nobody prints from a phone. Hidden by a wrapper rather than a
				    class on the control, which would lose to the tooltip's own
				    display utility. */}
				{!locked && (
					<div className="hidden sm:contents">
						<FloatingButton
							label="Print notes"
							onClick={() => window.print()}
							disabled={disabled}
							tone="accent"
						>
							<PrintIcon className="size-5" />
						</FloatingButton>
					</div>
				)}

				<FloatingButton
					label="Back to top"
					onClick={() => window.scrollTo({ top: 0 })}
					className={
						showBackToTop
							? 'translate-y-0 opacity-100'
							: 'pointer-events-none translate-y-2 opacity-0'
					}
				>
					<ArrowUpIcon className="size-5" />
				</FloatingButton>
			</div>

			{menuOpen && (
				<>
					<button
						type="button"
						tabIndex={-1}
						aria-hidden
						onClick={() => setMenuOpen(false)}
						className="fixed inset-0 z-30 cursor-default bg-[rgb(26_24_21/0.2)] lg:hidden"
					/>

					<nav className="border-line bg-paper animate-rise fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t px-4 pt-3 pb-6 lg:hidden">
						<p className="text-ink-faint px-3 pb-2 text-[0.6875rem] font-medium tracking-[0.14em] uppercase">
							Jump to
						</p>
						<ul>
							{navItems.map(item => (
								<li key={item.id}>
									<button
										type="button"
										onClick={() => jumpTo(item.id)}
										className={`flex w-full items-baseline gap-3 rounded-lg px-3 py-2.5 text-left text-[0.9375rem] leading-snug transition-colors ${
											activeId === item.id
												? 'bg-accent-tint text-ink font-medium'
												: 'text-ink-muted hover:bg-paper-sunk'
										}`}
									>
										<span className="min-w-0 flex-1">{item.label}</span>
										{item.timestamp && (
											<span className="text-ink-faint shrink-0 font-mono text-[0.6875rem] tabular-nums">
												{formatTimestamp(item.timestamp)}
											</span>
										)}
									</button>
								</li>
							))}
						</ul>
					</nav>
				</>
			)}
		</>
	)
}

function FloatingButton({
	label,
	onClick,
	disabled = false,
	pressed = false,
	tone = 'neutral',
	className = '',
	children,
}: {
	label: string
	onClick: () => void
	disabled?: boolean
	pressed?: boolean
	/** `accent` tints the bubble without filling it. */
	tone?: 'neutral' | 'accent'
	className?: string
	children: React.ReactNode
}) {
	// White, with the colour carried by the glow underneath rather than a fill.
	const skin =
		pressed || tone === 'accent'
			? 'border-accent/20 bg-surface text-accent-strong shadow-[0_2px_10px_-2px_rgb(226_89_11/0.32)] hover:border-accent/50 hover:shadow-[0_4px_18px_-3px_rgb(226_89_11/0.5)]'
			: 'border-line bg-surface/90 text-ink-muted shadow-lg hover:border-accent/40 hover:text-accent-strong'

	return (
		<Tooltip label={label} placement="left" className={className}>
			<button
				type="button"
				onClick={onClick}
				disabled={disabled}
				aria-label={label}
				aria-pressed={pressed || undefined}
				className={`focus-visible:ring-accent/40 inline-flex size-11 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40 disabled:shadow-sm ${skin}`}
			>
				{children}
			</button>
		</Tooltip>
	)
}
