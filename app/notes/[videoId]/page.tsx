import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteHeader } from '@/app/components/site-header'
import { ArrowRightIcon } from '@/app/components/icons'
import { currentUser } from '@/app/lib/auth/session'
import { ownsVideo, readCachedNotes } from '@/app/lib/notes-cache'
import { signInUrl } from '@/app/lib/return-to'
import { SavedNotes } from './saved-notes'

export const metadata: Metadata = {
	title: 'Sermon notes',
}

export default async function SavedNotesPage({
	params,
}: PageProps<'/notes/[videoId]'>) {
	const { videoId } = await params
	const user = await currentUser()

	// Saved notes belong to an account. Anyone without one — including someone
	// following a shared link — goes to the home page to start their own.
	if (!user) {
		redirect(signInUrl(`/notes/${videoId}`))
	}

	// Holding the video id is not the same as having paid for the notes, so
	// ownership is checked here rather than assumed from the URL.
	const cached = (await ownsVideo(user.id, videoId))
		? await readCachedNotes(videoId)
		: null

	if (!cached) {
		return (
			<main className="flex flex-1 flex-col">
				<SiteHeader />

				<div className="mx-auto w-full max-w-md px-6 py-16 text-center">
					<h1 className="font-serif text-2xl font-medium tracking-tight">
						Not in your library
					</h1>
					<p className="text-ink-muted mt-2 text-[0.9375rem] text-pretty">
						These notes are not on your account yet. Paste the sermon on the
						home page and they are yours for a token.
					</p>
					<Link
						href="/"
						className="bg-accent-strong shadow-accent/25 hover:bg-accent mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl"
					>
						Take notes on a sermon
						<ArrowRightIcon className="size-4" />
					</Link>
				</div>
			</main>
		)
	}

	return (
		<main className="flex-1">
			<SiteHeader />
			<SavedNotes notes={cached.notes} meta={cached.meta} />
		</main>
	)
}
