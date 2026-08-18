import type { Metadata } from 'next'
import { Fraunces, Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

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
	title: 'Sermon Notes — Turn any sermon into organized study notes',
	description:
		'Paste a YouTube sermon and get the main teaching, Scripture references, applications, and timestamps — organized so you can actually study it later.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
		>
			<body className="bg-paper text-ink min-h-full flex flex-col">
				{children}
			</body>
		</html>
	)
}
