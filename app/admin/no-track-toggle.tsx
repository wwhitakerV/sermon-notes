'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Whether this browser counts. Signing in as an admin turns it off
 * automatically; this is here for the times that is not what you want — an
 * incognito window you are using to check the real signed-out flow, or a phone
 * you want counted like anyone else's.
 */
export function NoTrackToggle({ excluded }: { excluded: boolean }) {
	const router = useRouter()
	const [busy, setBusy] = useState(false)

	async function toggle() {
		if (busy) return

		setBusy(true)

		try {
			await fetch('/api/admin/no-track', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ on: !excluded }),
			})

			router.refresh()
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className="border-line bg-surface mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-4 py-3">
			<span
				aria-hidden
				className={`size-2 shrink-0 rounded-full ${
					excluded ? 'bg-accent' : 'bg-line-strong'
				}`}
			/>

			<p className="text-[0.875rem]">
				{excluded
					? 'This browser is excluded from both analytics.'
					: 'This browser is being counted like any visitor.'}
			</p>

			<button
				type="button"
				onClick={toggle}
				disabled={busy}
				className="border-line text-ink-muted hover:border-ink hover:text-ink ml-auto shrink-0 rounded-lg border px-3 py-1 text-[0.8125rem] transition-colors disabled:opacity-50"
			>
				{busy ? 'Saving…' : excluded ? 'Start counting me' : 'Exclude me'}
			</button>
		</div>
	)
}
