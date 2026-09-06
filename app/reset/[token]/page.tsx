import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteHeader } from '@/app/components/site-header'
import { readPasswordReset } from '@/app/lib/auth/password-reset'
import { ResetForm } from './reset-form'

export const metadata: Metadata = { title: 'Reset your password — Sermon Drop' }

export default async function ResetPage({
	params,
}: PageProps<'/reset/[token]'>) {
	const { token } = await params

	// Checked before the form is drawn, so a dead link says so immediately
	// rather than after someone has typed a new password into it.
	const user = await readPasswordReset(token)

	return (
		<main className="flex flex-1 flex-col">
			<SiteHeader />

			<div className="mx-auto w-full max-w-sm px-6 pt-16 pb-24">
				{user ? (
					<ResetForm token={token} />
				) : (
					<div className="text-center">
						<h1 className="font-serif text-[1.75rem] leading-tight font-medium tracking-tight">
							This link has expired
						</h1>
						<p className="text-ink-muted mt-2 text-[0.9375rem] text-pretty">
							Reset links work once and last an hour. Ask for a fresh one from
							the sign-in form.
						</p>
						<Link
							href="/"
							className="border-line bg-surface hover:border-accent/40 hover:text-accent-strong mt-6 inline-flex rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors"
						>
							Back to Sermon Drop
						</Link>
					</div>
				)}
			</div>
		</main>
	)
}
