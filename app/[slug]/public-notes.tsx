'use client'

import { useRouter } from 'next/navigation'
import { NotesView } from '@/app/components/notes-view'
import type { SermonNotesType, VideoMetaType } from '@/app/types'

export function PublicNotes({
	notes,
	meta,
}: {
	notes: SermonNotesType
	meta: VideoMetaType | null
}) {
	const router = useRouter()

	return (
		<NotesView notes={notes} meta={meta} onReset={() => router.push('/')} />
	)
}
