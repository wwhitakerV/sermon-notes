import type { SermonNotesType, VideoMetaType } from '@/app/types'
import { formatTimestamp } from './youtube'

/** A clean plain-text version of the notes, for pasting anywhere. */
export function notesToText(
	notes: SermonNotesType,
	meta: VideoMetaType | null,
): string {
	const lines: string[] = ['SERMON NOTES', '', notes.title]

	if (meta?.author) {
		lines.push(meta.author)
	}

	if (meta?.url) {
		lines.push(meta.url)
	}

	if (notes.mainTexts.length > 0) {
		lines.push(
			'',
			'MAIN TEXT',
			...notes.mainTexts.map(
				text => `${text.reference}  ${formatTimestamp(text.timestamp)}`,
			),
		)
	}

	lines.push('', 'BIG IDEA', notes.mainIdea)

	notes.sections.forEach((section, index) => {
		lines.push(
			'',
			'',
			`${index + 1}. ${section.title.toUpperCase()}`,
			formatTimestamp(section.timestamp),
		)

		if (section.scriptures.length > 0) {
			lines.push('', section.scriptures.join(' · '))
		}

		lines.push('', ...section.notes.map(note => `• ${note}`))

		if (section.application) {
			lines.push('', 'APPLICATION', section.application)
		}
	})

	if (notes.scripturesReferenced.length > 0) {
		lines.push(
			'',
			'',
			'SCRIPTURES REFERENCED',
			'',
			...notes.scripturesReferenced.map(
				entry =>
					`${entry.reference.padEnd(34, ' ')}${formatTimestamp(entry.timestamp)}`,
			),
		)
	}

	if (notes.keyTakeaways.length > 0) {
		lines.push(
			'',
			'',
			'KEY TAKEAWAYS',
			'',
			...notes.keyTakeaways.map((item, index) => `${index + 1}. ${item}`),
		)
	}

	if (notes.reflectionQuestions.length > 0) {
		lines.push(
			'',
			'',
			'REFLECTION QUESTIONS',
			'',
			...notes.reflectionQuestions.map(
				(item, index) => `${index + 1}. ${item}`,
			),
		)
	}

	return lines.join('\n')
}
