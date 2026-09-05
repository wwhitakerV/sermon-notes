'use client'

import Link from 'next/link'
import { PlusIcon } from './icons'

type Props = {
	/**
	 * Given when the current screen can start a fresh run without navigating —
	 * the notes reader is the same route as the form, so it resets in place.
	 * Everywhere else this is a link home.
	 */
	onClick?: () => void
}

const CLASS =
	'bg-accent-strong shadow-accent/25 hover:bg-accent focus-visible:ring-accent/40 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[0.8125rem] font-semibold text-white shadow-sm transition-all hover:shadow-md focus-visible:ring-2 focus-visible:outline-none sm:px-3.5'

/**
 * Taking notes on a sermon is the whole point of the app, so it gets a place
 * that never moves. Without it the library is a dead end: its only call to
 * action lives in the empty state, and vanishes the moment anything is saved.
 */
export function NewNotesButton({ onClick }: Props) {
	const content = (
		<>
			<PlusIcon className="size-4 shrink-0" />
			<span className="hidden sm:inline">New notes</span>
			<span className="sr-only sm:hidden">New notes</span>
		</>
	)

	if (onClick) {
		return (
			<button type="button" onClick={onClick} className={CLASS}>
				{content}
			</button>
		)
	}

	return (
		<Link href="/" className={CLASS}>
			{content}
		</Link>
	)
}
