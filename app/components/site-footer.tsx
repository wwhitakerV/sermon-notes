'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChatIcon } from './icons'
import { FeedbackPrompt } from './feedback-prompt'
import { Overlay } from './overlay'

export function SiteFooter() {
	const [open, setOpen] = useState(false)

	return (
		<footer className="border-line no-print mt-auto border-t">
			<div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-5 py-6 sm:flex-row sm:px-6">
				<p className="text-ink-faint text-[0.8125rem]">
					© {new Date().getFullYear()} Sermon Drop
				</p>

				<nav className="text-ink-muted flex items-center gap-5 text-[0.8125rem] sm:ml-auto">
					<Link href="/terms" className="hover:text-accent-strong transition-colors">
						Terms
					</Link>
					<Link
						href="/privacy"
						className="hover:text-accent-strong transition-colors"
					>
						Privacy
					</Link>
				</nav>

				{/* Louder than the links on purpose: this is the one thing here we
				    actually want people to use. */}
				<button
					type="button"
					onClick={() => setOpen(true)}
					className="border-accent/30 bg-accent-tint text-accent-strong hover:border-accent hover:bg-accent-tint focus-visible:ring-accent/40 flex items-center gap-2 rounded-full border px-4 py-2 text-[0.8125rem] font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
				>
					<ChatIcon className="size-4 shrink-0" />
					Give feedback
				</button>
			</div>

			{open && (
				<Overlay onDismiss={() => setOpen(false)}>
					<FeedbackPrompt onDismiss={() => setOpen(false)} />
				</Overlay>
			)}
		</footer>
	)
}
