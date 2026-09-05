'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { NotesView } from '@/app/components/notes-view'
import type { SermonNotesType, VideoMetaType } from '@/app/types'

/**
 * A saved set of notes, read straight from the cache. Nothing streams here —
 * they have been paid for and written already.
 */
export function SavedNotes({
	notes,
	meta,
}: {
	notes: SermonNotesType
	meta: VideoMetaType | null
}) {
	const router = useRouter()

	// The library's print button sends the reader here first: printing needs the
	// notes actually laid out. Read off `location` rather than `useSearchParams`
	// so this does not drag the page into a Suspense boundary for one flag.
	useEffect(() => {
		if (new URLSearchParams(window.location.search).get('print') !== '1') {
			return
		}

		window.history.replaceState(null, '', window.location.pathname)

		const timer = setTimeout(() => window.print(), 300)

		return () => clearTimeout(timer)
	}, [])

	return (
		<NotesView
			notes={notes}
			meta={meta}
			onReset={() => router.push('/')}
		/>
	)
}
