import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Fraunces, Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AccountProvider } from './components/account-provider'
import { ReturnToPrompt } from './components/return-to-prompt'
import { SiteAnalytics } from './components/site-analytics'
import { SiteFooter } from './components/site-footer'
import { VideoDialogProvider } from './components/video-dialog'
import { readAccountState } from './lib/account-state'

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
})

const fraunces = Fraunces({
	variable: '--font-fraunces',
	subsets: ['latin'],
})

export const metadata: Metadata = {
	title: 'Sermon Drop — Turn any sermon into organized study notes',
	description:
		'Paste a YouTube sermon and get the main teaching, Scripture references, applications, and reflection questions — organized so you can actually study it later.',
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
		>
			<body className="bg-paper text-ink min-h-full flex flex-col">
				<AccountProvider initial={await readAccountState()}>
					<VideoDialogProvider>
						{children}
						<SiteFooter />

						<Suspense>
							<ReturnToPrompt />
						</Suspense>
					</VideoDialogProvider>
				</AccountProvider>

				<SiteAnalytics />
			</body>
		</html>
	)
}
