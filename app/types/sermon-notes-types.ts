export type SermonNotesType = {
	title: string
	mainIdea: string
	mainTexts: {
		reference: string
		timestamp: string
	}[]
	sections: {
		title: string
		timestamp: string
		scriptures: string[]
		notes: string[]
		application?: string
	}[]
	scripturesReferenced: {
		reference: string
		timestamp: string
	}[]
	keyTakeaways: string[]
}

export type TranscriptSegmentType = {
	text: string
	offset: number
	duration: number
	lang: string
}

export type TranscriptResultType = {
	content: TranscriptSegmentType[]
	lang: string
	availableLangs?: string[]
}
