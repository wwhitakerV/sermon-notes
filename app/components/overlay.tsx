'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE =
	'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'

type Props = {
	onDismiss: () => void
	/** `wide` is for a video; prompts stay narrow enough to read comfortably. */
	size?: 'prompt' | 'wide'
	children: React.ReactNode
}

/**
 * The shell every prompt in this feature renders into. Nothing here navigates:
 * the screen underneath keeps its state — including the URL the reader already
 * pasted — so dismissing puts them back exactly where they were.
 */
export function Overlay({ onDismiss, size = 'prompt', children }: Props) {
	const panelRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const returnFocusTo = document.activeElement as HTMLElement | null
		const { overflow } = document.body.style

		document.body.style.overflow = 'hidden'

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				onDismiss()

				return
			}

			// Focus stays inside while the prompt is up, so the keyboard cannot
			// wander into the screen behind it.
			if (event.key !== 'Tab' || !panelRef.current) {
				return
			}

			const targets =
				panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)

			if (targets.length === 0) {
				return
			}

			const first = targets[0]
			const last = targets[targets.length - 1]
			const active = document.activeElement

			if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
				event.preventDefault()
				last.focus()
			} else if (!event.shiftKey && active === last) {
				event.preventDefault()
				first.focus()
			}
		}

		window.addEventListener('keydown', onKeyDown)

		return () => {
			window.removeEventListener('keydown', onKeyDown)
			document.body.style.overflow = overflow
			returnFocusTo?.focus?.()
		}
	}, [onDismiss])

	// Rendered into the body rather than where it was opened from.
	//
	// An ancestor with `backdrop-filter` — the sticky header, for one — becomes
	// the containing block for fixed-position descendants, exactly as a
	// `transform` would. A prompt opened from the header was therefore being
	// positioned against a 45px-tall bar instead of the viewport, and painted
	// underneath the controls that opened it. A portal makes the overlay
	// independent of whatever it happens to be nested in.
	if (typeof document === 'undefined') {
		return null
	}

	return createPortal(
		<div
			className="animate-fade fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[rgb(26_24_21/0.32)] p-4 backdrop-blur-[2px] sm:items-center"
			onMouseDown={event => {
				// Only a click that both starts and ends on the backdrop closes it,
				// so a text selection dragged out of the panel does not.
				if (event.target === event.currentTarget) {
					onDismiss()
				}
			}}
		>
			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				className={`animate-rise my-auto w-full ${
					size === 'wide' ? 'max-w-3xl' : 'max-w-md'
				}`}
			>
				{children}
			</div>
		</div>,
		document.body,
	)
}
