'use client'

import { useRef, useState } from 'react'
import type { AccountStateType } from '@/app/types'
import { AlertIcon, ArrowRightIcon, CloseIcon } from './icons'

const MIN_PASSWORD_LENGTH = 8

type VariantType = 'unlock' | 'reveal' | 'signin'

type ModeType = 'create' | 'signin'

type Props = {
	variant: VariantType
	onSuccess: (next: AccountStateType) => void
	onDismiss?: () => void
	/**
	 * Rendered in the flow of the page rather than over it. Skips the autofocus:
	 * pulling focus into a form the reader has not scrolled to yet would jump
	 * the page out from under them.
	 */
	inline?: boolean
}

const COPY: Record<VariantType, { title: string; body: string }> = {
	unlock: {
		title: 'Create your free account',
		body: 'That was your free video. Accounts are free — after that it is $1 a video.',
	},
	signin: {
		title: 'Welcome back',
		body: 'Sign in to reach your library and your tokens.',
	},
	reveal: {
		title: 'Read the rest of these notes',
		body: 'Create your free account to open the full outline, Scriptures and takeaways — and keep them in your library.',
	},
}

/**
 * Email and password, nothing else. Deliberately not a page: it renders inline
 * on whatever screen the reader is already on, and never takes away notes they
 * have already earned.
 */
export function AuthPrompt({
	variant,
	onSuccess,
	onDismiss,
	inline = false,
}: Props) {
	const [mode, setMode] = useState<ModeType>(
		variant === 'signin' ? 'signin' : 'create',
	)
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const passwordRef = useRef<HTMLInputElement>(null)

	const copy = COPY[variant]

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault()

		if (busy) {
			return
		}

		setBusy(true)
		setError(null)

		try {
			const response = await fetch(
				mode === 'create' ? '/api/auth/signup' : '/api/auth/login',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email, password }),
				},
			)

			const body = await response.json().catch(() => null)

			if (!response.ok) {
				// The email is already taken and the password did not match it. Flip
				// to signing in rather than making them find a different form.
				if (body?.code === 'email_taken') {
					setMode('signin')
					requestAnimationFrame(() => passwordRef.current?.focus())
				}

				setError(body?.error ?? 'Something went wrong. Please try again.')

				return
			}

			onSuccess(body as AccountStateType)
		} catch {
			setError('Could not reach the server. Please try again.')
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className="border-line bg-surface no-print rounded-2xl border p-5 shadow-[0_1px_2px_rgb(26_24_21/0.04),0_12px_32px_-16px_rgb(26_24_21/0.14)] sm:p-6">
			<div className="flex items-start gap-4">
				<div className="min-w-0 flex-1">
					<h2 className="font-serif text-[1.375rem] leading-tight font-medium tracking-tight text-balance">
						{mode === 'signin' ? 'Sign in to continue' : copy.title}
					</h2>
					<p className="text-ink-muted mt-1.5 text-[0.9375rem] leading-relaxed text-pretty">
						{mode === 'signin'
							? 'Enter the password for this email and we will pick up where you left off.'
							: copy.body}
					</p>
				</div>

				{onDismiss && (
					<button
						type="button"
						onClick={onDismiss}
						title="Not now"
						className="text-ink-faint hover:bg-paper-sunk hover:text-ink -mt-1 -mr-1 shrink-0 rounded-lg p-1.5 transition-colors"
					>
						<CloseIcon className="size-4" />
						<span className="sr-only">Not now</span>
					</button>
				)}
			</div>

			<form onSubmit={handleSubmit} className="mt-5 space-y-2.5">
				<Field
					label="Email"
					type="email"
					value={email}
					onChange={setEmail}
					autoComplete="email"
					autoFocus={!inline}
				/>
				<Field
					ref={passwordRef}
					label="Password"
					type="password"
					value={password}
					onChange={setPassword}
					autoComplete={
						mode === 'signin' ? 'current-password' : 'new-password'
					}
					minLength={MIN_PASSWORD_LENGTH}
				/>

				{error && (
					<p
						role="alert"
						className="text-accent-strong bg-accent-tint border-accent/20 animate-fade flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm"
					>
						<AlertIcon className="mt-px size-4 shrink-0" />
						{error}
					</p>
				)}

				<button
					type="submit"
					disabled={busy}
					className="bg-accent-strong shadow-accent/25 hover:bg-accent focus-visible:ring-accent/40 disabled:bg-paper-sunk disabled:text-ink-faint mt-1 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[0.9375rem] font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl focus-visible:ring-2 focus-visible:outline-none disabled:shadow-none"
				>
					{busy
						? 'One moment…'
						: mode === 'signin'
							? 'Sign in'
							: 'Create free account'}
					{!busy && <ArrowRightIcon className="size-4" />}
				</button>
			</form>

			<p className="text-ink-faint mt-3.5 text-center text-[0.8125rem]">
				{mode === 'signin' ? 'New here?' : 'Already have an account?'}{' '}
				<button
					type="button"
					onClick={() => {
						setMode(mode === 'signin' ? 'create' : 'signin')
						setError(null)
					}}
					className="hover:text-accent-strong underline underline-offset-2 transition-colors"
				>
					{mode === 'signin' ? 'Create one' : 'Sign in'}
				</button>
			</p>
		</div>
	)
}

type FieldProps = {
	label: string
	type: string
	value: string
	onChange: (value: string) => void
	autoComplete: string
	autoFocus?: boolean
	minLength?: number
	ref?: React.Ref<HTMLInputElement>
}

function Field({ label, value, onChange, ref, ...input }: FieldProps) {
	return (
		<label className="border-line bg-paper-sunk/40 focus-within:border-accent/40 block rounded-xl border px-3.5 py-2.5 transition-colors">
			<span className="text-ink-faint text-[0.6875rem] font-medium tracking-[0.14em] uppercase">
				{label}
			</span>
			<input
				{...input}
				ref={ref}
				required
				value={value}
				onChange={event => onChange(event.target.value)}
				className="mt-1 w-full bg-transparent text-[0.9375rem] outline-none"
			/>
		</label>
	)
}
