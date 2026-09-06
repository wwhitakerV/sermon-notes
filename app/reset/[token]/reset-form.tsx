'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AlertIcon, ArrowRightIcon, CheckIcon } from '@/app/components/icons'

const MIN_PASSWORD_LENGTH = 8

export function ResetForm({ token }: { token: string }) {
	const [password, setPassword] = useState('')
	const [busy, setBusy] = useState(false)
	const [done, setDone] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault()

		if (busy) {
			return
		}

		setBusy(true)
		setError(null)

		try {
			const response = await fetch('/api/auth/reset', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, password }),
			})

			if (!response.ok) {
				const body = await response.json().catch(() => null)

				setError(body?.error ?? 'That did not work. Please try again.')

				return
			}

			setDone(true)
		} catch {
			setError('Could not reach the server. Please try again.')
		} finally {
			setBusy(false)
		}
	}

	if (done) {
		return (
			<div className="text-center">
				<span className="bg-accent-tint text-accent-strong mx-auto flex size-11 items-center justify-center rounded-full">
					<CheckIcon className="size-5" />
				</span>
				<h1 className="font-serif mt-4 text-[1.5rem] font-medium tracking-tight">
					Password changed
				</h1>
				<p className="text-ink-muted mt-2 text-[0.9375rem] text-pretty">
					Every device that was signed in has been signed out. Sign in again
					with your new password.
				</p>
				<Link
					href="/"
					className="bg-accent-strong shadow-accent/25 hover:bg-accent mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl"
				>
					Go to Sermon Drop
					<ArrowRightIcon className="size-4" />
				</Link>
			</div>
		)
	}

	return (
		<>
			<h1 className="font-serif text-[1.75rem] leading-tight font-medium tracking-tight">
				Choose a new password
			</h1>
			<p className="text-ink-muted mt-2 text-[0.9375rem] text-pretty">
				At least {MIN_PASSWORD_LENGTH} characters. This link works once.
			</p>

			<form onSubmit={handleSubmit} className="mt-6">
				<label className="border-line bg-paper-sunk/40 focus-within:border-accent/40 block rounded-xl border px-3.5 py-2.5 transition-colors">
					<span className="text-ink-faint text-[0.6875rem] font-medium tracking-[0.14em] uppercase">
						New password
					</span>
					<input
						type="password"
						value={password}
						onChange={event => setPassword(event.target.value)}
						required
						minLength={MIN_PASSWORD_LENGTH}
						autoComplete="new-password"
						autoFocus
						className="mt-1 w-full bg-transparent text-[0.9375rem] outline-none"
					/>
				</label>

				{error && (
					<p
						role="alert"
						className="text-accent-strong bg-accent-tint border-accent/20 animate-fade mt-3 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm"
					>
						<AlertIcon className="mt-px size-4 shrink-0" />
						{error}
					</p>
				)}

				<button
					type="submit"
					disabled={busy}
					className="bg-accent-strong shadow-accent/25 hover:bg-accent focus-visible:ring-accent/40 disabled:bg-paper-sunk disabled:text-ink-faint mt-4 w-full rounded-xl px-5 py-3 text-[0.9375rem] font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl focus-visible:ring-2 focus-visible:outline-none disabled:shadow-none"
				>
					{busy ? 'Saving…' : 'Change password'}
				</button>
			</form>
		</>
	)
}
