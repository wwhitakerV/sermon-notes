'use client'

import {
	Elements,
	PaymentElement,
	useElements,
	useStripe,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import type { StripeElementsOptions } from '@stripe/stripe-js'
import { useState } from 'react'
import type { AccountStateType, SavedCardType } from '@/app/types'
import { AlertIcon, CloseIcon } from './icons'

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

const stripePromise = publishableKey ? loadStripe(publishableKey) : null

const appearance: StripeElementsOptions['appearance'] = {
	variables: {
		colorPrimary: '#b8460a',
		colorText: '#1a1815',
		colorTextSecondary: '#5c554c',
		colorDanger: '#b8460a',
		borderRadius: '12px',
		fontSizeBase: '15px',
		spacingUnit: '4px',
	},
}

/** Setup mode: details are collected and kept, and nothing is charged. */
const options: StripeElementsOptions = {
	mode: 'setup',
	currency: 'usd',
	paymentMethodTypes: ['card'],
	appearance,
}

type Props = {
	savedCard: SavedCardType | null
	onSaved: (next: AccountStateType) => void
	onDismiss: () => void
}

export function CardPrompt({ savedCard, onSaved, onDismiss }: Props) {
	return (
		<div className="border-line bg-surface rounded-2xl border p-5 shadow-[0_1px_2px_rgb(26_24_21/0.04),0_12px_32px_-16px_rgb(26_24_21/0.14)] sm:p-6">
			<div className="flex items-start gap-4">
				<div className="min-w-0 flex-1">
					<h2 className="font-serif text-[1.375rem] leading-tight font-medium tracking-tight">
						{savedCard ? 'Replace your card' : 'Add a card'}
					</h2>
					<p className="text-ink-muted mt-1.5 text-[0.9375rem] leading-relaxed text-pretty">
						{savedCard
							? `This replaces ${savedCard.brand} ···${savedCard.last4}. Nothing is charged now.`
							: 'Kept on file so buying tokens is a single tap. Nothing is charged now.'}
					</p>
				</div>

				<button
					type="button"
					onClick={onDismiss}
					title="Close"
					className="text-ink-faint hover:bg-paper-sunk hover:text-ink -mt-1 -mr-1 shrink-0 rounded-lg p-1.5 transition-colors"
				>
					<CloseIcon className="size-4" />
					<span className="sr-only">Close</span>
				</button>
			</div>

			{!publishableKey ? (
				<InlineError message="Card payments are not configured on this deployment." />
			) : (
				<Elements stripe={stripePromise} options={options}>
					<CardForm onSaved={onSaved} />
				</Elements>
			)}
		</div>
	)
}

function CardForm({ onSaved }: { onSaved: (next: AccountStateType) => void }) {
	const stripe = useStripe()
	const elements = useElements()
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function handleSubmit() {
		if (busy || !stripe || !elements) {
			return
		}

		setBusy(true)
		setError(null)

		try {
			const submitted = await elements.submit()

			if (submitted.error) {
				setError(submitted.error.message ?? 'Check the card details.')

				return
			}

			// Created only once the details are valid, so an abandoned form leaves
			// nothing behind in Stripe.
			const response = await fetch('/api/billing/card/setup', {
				method: 'POST',
			})
			const body = await response.json().catch(() => null)

			if (!response.ok || !body?.clientSecret) {
				setError(body?.error ?? 'Could not start saving the card.')

				return
			}

			const confirmed = await stripe.confirmSetup({
				elements,
				clientSecret: body.clientSecret,
				redirect: 'if_required',
			})

			if (confirmed.error) {
				setError(confirmed.error.message ?? 'That card could not be saved.')

				return
			}

			// Saved server-side from the intent, never from what the browser says.
			const saved = await fetch('/api/billing/card', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ setupIntentId: body.setupIntentId }),
			})

			if (!saved.ok) {
				setError('That card could not be saved.')

				return
			}

			onSaved((await saved.json()) as AccountStateType)
		} catch {
			setError('Could not reach the server. Please try again.')
		} finally {
			setBusy(false)
		}
	}

	return (
		<>
			<div className="border-line bg-paper-sunk/30 mt-5 rounded-xl border p-3.5">
				<PaymentElement options={{ layout: 'tabs' }} />
			</div>

			{error && <InlineError message={error} />}

			<button
				type="button"
				onClick={handleSubmit}
				disabled={busy}
				className="bg-accent-strong shadow-accent/25 hover:bg-accent focus-visible:ring-accent/40 disabled:bg-paper-sunk disabled:text-ink-faint mt-4 w-full rounded-xl px-5 py-3 text-[0.9375rem] font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl focus-visible:ring-2 focus-visible:outline-none disabled:shadow-none"
			>
				{busy ? 'Saving…' : 'Save card'}
			</button>
		</>
	)
}

function InlineError({ message }: { message: string }) {
	return (
		<p
			role="alert"
			className="text-accent-strong bg-accent-tint border-accent/20 animate-fade mt-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm"
		>
			<AlertIcon className="mt-px size-4 shrink-0" />
			{message}
		</p>
	)
}
