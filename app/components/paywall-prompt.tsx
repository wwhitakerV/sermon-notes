'use client'

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import type { StripeElementsOptions } from '@stripe/stripe-js'
import { useMemo, useState } from 'react'
import {
	DEFAULT_PACK_TOKENS,
	TOKEN_PACKS,
	formatPrice,
} from '@/app/lib/token-packs'
import type { PackType } from '@/app/lib/token-packs'
import type { AccountStateType, SavedCardType } from '@/app/types'
import { AlertIcon, CardIcon, CheckIcon, CloseIcon } from './icons'

/**
 * Read at module scope because Next inlines `NEXT_PUBLIC_*` at build time — it
 * is not read from the environment when the page runs. Setting it on the host
 * after a deploy therefore changes nothing until the app is rebuilt, and an
 * empty key makes Stripe answer 401 and the card form quietly collapse.
 */
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

const stripePromise = publishableKey ? loadStripe(publishableKey) : null

/** Stripe's fields, wearing this app's clothes. */
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

type Props = {
	balance: number
	savedCard?: SavedCardType | null
	/** The account as it stands after the tokens land. */
	onPurchased: (next: AccountStateType) => void
	onDismiss: () => void
}

export function PaywallPrompt({
	balance,
	savedCard = null,
	onPurchased,
	onDismiss,
}: Props) {
	const [selected, setSelected] = useState(DEFAULT_PACK_TOKENS)

	const pack =
		TOKEN_PACKS.find(item => item.tokens === selected) ?? TOKEN_PACKS[0]

	// `amount` is the only field here that may change after mounting, so the
	// options object is kept stable except for the pack the reader picked.
	const options = useMemo<StripeElementsOptions>(
		() => ({
			mode: 'payment',
			amount: pack.cents,
			currency: 'usd',
			setupFutureUsage: 'off_session',
			paymentMethodTypes: ['card'],
			appearance,
		}),
		[pack.cents],
	)

	return (
		<div className="border-line bg-surface rounded-2xl border p-5 shadow-[0_1px_2px_rgb(26_24_21/0.04),0_12px_32px_-16px_rgb(26_24_21/0.14)] sm:p-6">
			<div className="flex items-start gap-4">
				<div className="min-w-0 flex-1">
					<h2 className="font-serif text-[1.375rem] leading-tight font-medium tracking-tight text-balance">
						{balance > 0 ? 'Top up your tokens' : "You're out of tokens"}
					</h2>
					<p className="text-ink-muted mt-1.5 text-[0.9375rem] leading-relaxed text-pretty">
						{savedCard
							? 'One token turns one sermon into notes. One tap and it is done.'
							: 'One token turns one sermon into notes. Your card is saved after this, so the next one is a single tap.'}
					</p>
				</div>

				<button
					type="button"
					onClick={onDismiss}
					title="Not now"
					className="text-ink-faint hover:bg-paper-sunk hover:text-ink -mt-1 -mr-1 shrink-0 rounded-lg p-1.5 transition-colors"
				>
					<CloseIcon className="size-4" />
					<span className="sr-only">Not now</span>
				</button>
			</div>

			<div className="mt-5 grid grid-cols-3 gap-2.5">
				{TOKEN_PACKS.map(item => {
					const active = item.tokens === selected

					return (
						<button
							key={item.tokens}
							type="button"
							onClick={() => setSelected(item.tokens)}
							aria-pressed={active}
							className={`relative rounded-xl border px-3 py-3.5 text-center transition-all ${
								active
									? 'border-accent bg-accent-tint shadow-[0_1px_2px_rgb(26_24_21/0.04)]'
									: 'border-line bg-paper-sunk/40 hover:border-line-strong'
							}`}
						>
							{active && (
								<CheckIcon className="text-accent-strong absolute top-1.5 right-1.5 size-3.5" />
							)}
							<span className="font-serif block text-[1.25rem] leading-none font-medium">
								{formatPrice(item.cents)}
							</span>
							<span className="text-ink-muted mt-1.5 block text-[0.8125rem]">
								{item.tokens} {item.tokens === 1 ? 'video' : 'videos'}
							</span>
						</button>
					)
				})}
			</div>

			{!publishableKey ? (
				<InlineError message="Card payments are not configured on this deployment." />
			) : (
				/*
				 * Both paths sit inside the provider. The saved-card path calls
				 * `useStripe` to answer a 3D Secure challenge, and that hook throws
				 * outright when there is no Elements context above it.
				 */
				<Elements stripe={stripePromise} options={options}>
					{savedCard ? (
						<SavedCardCheckout
							pack={pack}
							savedCard={savedCard}
							onPurchased={onPurchased}
						/>
					) : (
						<NewCardCheckout pack={pack} onPurchased={onPurchased} />
					)}
				</Elements>
			)}

			<p className="text-ink-faint mt-3.5 text-center text-[0.8125rem]">
				No subscription. Tokens do not expire.
			</p>
		</div>
	)
}

/** Every purchase after the first: no card fields, one confirm. */
function SavedCardCheckout({
	pack,
	savedCard,
	onPurchased,
}: {
	pack: PackType
	savedCard: SavedCardType
	onPurchased: (next: AccountStateType) => void
}) {
	const stripe = useStripe()
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function handleConfirm() {
		if (busy) {
			return
		}

		setBusy(true)
		setError(null)

		try {
			const response = await fetch('/api/billing/charge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tokens: pack.tokens,
					// One key per attempt: a retried request settles on the same
					// charge in Stripe instead of taking the money twice.
					idempotencyKey: crypto.randomUUID(),
				}),
			})

			const body = await response.json().catch(() => null)

			if (!response.ok) {
				setError(body?.error ?? 'That payment did not go through.')

				return
			}

			// The bank wants the cardholder present. Handled here rather than by
			// sending them anywhere.
			if (body.requiresAction) {
				const result = await stripe?.handleNextAction({
					clientSecret: body.clientSecret,
				})

				if (result?.error) {
					setError(result.error.message ?? 'That card could not be verified.')

					return
				}

				onPurchased(await confirmIntent(body.paymentIntentId))

				return
			}

			onPurchased(body as AccountStateType)
		} catch {
			setError('Could not reach the server. Please try again.')
		} finally {
			setBusy(false)
		}
	}

	return (
		<>
			{error && <InlineError message={error} />}

			<ConfirmButton busy={busy} pack={pack} onClick={handleConfirm} />

			<p className="text-ink-faint mt-3 flex items-center justify-center gap-1.5 text-[0.8125rem]">
				<CardIcon className="size-3.5 shrink-0" />
				Charging {savedCard.brand} ···{savedCard.last4}
			</p>
		</>
	)
}

/** The first purchase: card fields, inline, never a redirect. */
function NewCardCheckout({
	pack,
	onPurchased,
}: {
	pack: PackType
	onPurchased: (next: AccountStateType) => void
}) {
	const stripe = useStripe()
	const elements = useElements()
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function handleConfirm() {
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

			// The intent is only created once the card details are valid, so an
			// abandoned prompt leaves nothing behind in Stripe.
			const response = await fetch('/api/billing/intent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tokens: pack.tokens }),
			})

			const body = await response.json().catch(() => null)

			if (!response.ok || !body?.clientSecret) {
				setError(body?.error ?? 'Could not start the payment.')

				return
			}

			const confirmed = await stripe.confirmPayment({
				elements,
				clientSecret: body.clientSecret,
				redirect: 'if_required',
			})

			if (confirmed.error) {
				setError(
					confirmed.error.message ?? 'That payment did not go through.',
				)

				return
			}

			onPurchased(await confirmIntent(body.paymentIntentId))
		} catch {
			setError('Could not reach the server. Please try again.')
		} finally {
			setBusy(false)
		}
	}

	return (
		<>
			<div className="border-line bg-paper-sunk/30 mt-4 rounded-xl border p-3.5">
				<PaymentElement options={{ layout: 'tabs' }} />
			</div>

			{error && <InlineError message={error} />}

			<ConfirmButton busy={busy} pack={pack} onClick={handleConfirm} />
		</>
	)
}

/**
 * The tokens are granted server-side from the intent, never from what the
 * browser claims happened.
 */
async function confirmIntent(paymentIntentId: string): Promise<AccountStateType> {
	const response = await fetch('/api/billing/confirm', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ paymentIntentId }),
	})

	if (!response.ok) {
		throw new Error('confirm failed')
	}

	return (await response.json()) as AccountStateType
}

function ConfirmButton({
	busy,
	pack,
	onClick,
}: {
	busy: boolean
	pack: PackType
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={busy}
			className="bg-accent-strong shadow-accent/25 hover:bg-accent focus-visible:ring-accent/40 disabled:bg-paper-sunk disabled:text-ink-faint mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[0.9375rem] font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl focus-visible:ring-2 focus-visible:outline-none disabled:shadow-none"
		>
			{busy
				? 'Working…'
				: `Add ${pack.tokens} ${pack.tokens === 1 ? 'token' : 'tokens'} — ${formatPrice(pack.cents)}`}
		</button>
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
