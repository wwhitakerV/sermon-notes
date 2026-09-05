'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccount } from './account-provider'
import { AccountControls } from './account-controls'
import { LampMark, LibraryIcon } from './icons'
import { NewNotesButton } from './new-notes-button'
import { useScrolledPast } from './use-scrolled-past'

type Props = {
	/**
	 * A run is in flight. Draws the progress sweep along the bottom edge, which
	 * is where the notes toolbar used to carry it.
	 */
	progress?: boolean
	/**
	 * The reader is already on the route that holds the form, so a fresh run is
	 * a reset rather than a navigation.
	 */
	onNewNotes?: () => void
}

/**
 * App chrome, and only app chrome: where you can go, and who you are. It is on
 * every screen and never scrolls away, so it stays thin — 40px on a phone, 45
 * on a desktop. Anything belonging to one document lives with that document.
 */
/** Barely any scroll at all: the frost should arrive as the page starts moving. */
const FROST_AFTER_PX = 8

export function SiteHeader({ progress = false, onNewNotes }: Props) {
	const pathname = usePathname()
	const { account } = useAccount()

	// Nothing sits behind the header until the page moves under it, and until
	// then it should be invisible — no panel, no seam, just the controls.
	const stuck = useScrolledPast(FROST_AFTER_PX)

	// Pointless on the page that is itself the form — unless that page is
	// currently showing notes, where it restarts rather than navigates.
	const showNew = pathname !== '/' || Boolean(onNewNotes)

	return (
		<header
			className="sticky top-0 z-40 transition-[backdrop-filter] duration-200"
			// Driven as a value rather than a class: a transition cannot
			// interpolate out of `none`, so toggling the utility on and off would
			// snap the frost in instead of easing it.
			style={{
				backdropFilter: stuck ? 'blur(12px)' : 'blur(0px)',
				WebkitBackdropFilter: stuck ? 'blur(12px)' : 'blur(0px)',
			}}
		>
			<div className="mx-auto flex h-10 w-full max-w-5xl items-center gap-2 px-4 sm:h-[45px] sm:gap-3 sm:px-6">
				<Link
					href="/"
					className="flex shrink-0 items-center gap-2"
					aria-label="Sermon Drop home"
				>
					<span className="bg-accent-strong shadow-accent/25 flex size-6 items-center justify-center rounded-md text-white shadow-sm">
						<LampMark className="size-3.5" />
					</span>
					<span className="font-serif hidden text-[0.875rem] font-medium tracking-tight sm:inline">
						Sermon Drop
					</span>
				</Link>

				{/*
				 * Grouped by kind: somewhere to go, then something to do, then who
				 * you are. A quiet nav link wedged between the two accent controls
				 * split them and read as clutter.
				 */}
				<div className="ml-auto flex items-center gap-1.5 sm:gap-2">
					{account && (
						<Link
							href="/library"
							// Colour only, no fill. The header carries no background of
							// its own, so a beige pill on a nearly-beige surface reads as
							// a smudge — and ink rather than accent, because the two
							// controls beside it own the orange.
							className="text-ink-muted hover:text-ink hidden items-center gap-2 rounded-full px-2 py-1.5 text-[0.8125rem] font-medium transition-colors sm:flex"
						>
							<LibraryIcon className="size-4 shrink-0" />
							Library
						</Link>
					)}

					{showNew && <NewNotesButton onClick={onNewNotes} />}
					<AccountControls />
				</div>
			</div>

			{progress && (
				<div className="bg-paper-sunk absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
					<span className="via-accent absolute inset-y-0 w-1/3 animate-sweep bg-linear-to-r from-transparent to-transparent" />
				</div>
			)}
		</header>
	)
}
