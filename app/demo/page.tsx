'use client'

import { useRouter } from 'next/navigation'
import { NotesView } from '../components/notes-view'
import { sampleNotes } from '../lib/sample-notes'

/** Renders the finished notes layout with real output — no API calls needed. */
export default function DemoPage() {
	const router = useRouter()

	return (
		<main className="flex-1">
			<NotesView
				notes={sampleNotes}
				meta={null}
				onReset={() => router.push('/')}
			/>
		</main>
	)
}
