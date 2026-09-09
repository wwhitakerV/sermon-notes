import type { SermonNotesType } from '@/app/types'

/**
 * Real output, trimmed.
 *
 * Taken from an actual run rather than written by hand: the preview exists to
 * answer "what do I actually get", and an idealised sample would be answering a
 * different question. Same sermon the example link pastes, so what the preview
 * shows is exactly what clicking through produces.
 */
export const sampleNotes: SermonNotesType = {
	title: 'He Heard, He’s Holding, It’s Him',
	mainIdea: 'God hears every prayer, holds what we cannot control, and is himself the answer—even when the problem has not gone away. Trust him moment by moment and recognize his presence in both the highs and the lows.',
	mainTexts: [
		{ reference: '1 John 5:14–15', timestamp: '1:02' },
		{ reference: 'John 20:11–18', timestamp: '20:28' },
	],
	sections: [
		{
			title: 'He Heard',
			timestamp: '0:00',
			scriptures: [
				'1 John 5:14–15',
			],
			notes: [
				'The enemy points to what has not happened yet and says God cannot be trusted, but the answer, healing, reconciliation, result, and proof are found in God.',
				'There is a space between prayed and answered called heard. Knowing that God hears gives confidence.',
				'1 John 5:14 says that if we ask anything according to God’s will, he hears us. Verse 15 says that when we know he hears us, we know we have what we asked of him.',
				'God hears better than any human being or technology. He heard the first time.',
			],
			application: 'When the enemy says, “Not here,” remind yourself that God hears you. Continue trusting him even when the answer has not yet appeared.',
		},
		{
			title: 'He’s Holding',
			timestamp: '5:13',
			scriptures: [
			],
			notes: [
				'While waiting for an answer, trust that what God has not answered yet, he is holding.',
				'God holds tears and prayers like precious things kept before him.',
				'God may hold one thing in one hand while working on something else with the other. He remains the same whether he seems to be removing a burden or sustaining us through it.',
				'We cannot control everything, and we are not required to hold everything together. Give God the part you cannot control.',
			],
			application: 'Release to God the situation, person, problem, or future you cannot control. Take the next breath and trust him with the next moment.',
		},
		{
			title: 'It’s Him',
			timestamp: '11:00',
			scriptures: [
				'John 20:11–18',
			],
			notes: [
				'Sometimes the answer to prayer is not a changed circumstance but God himself.',
				'Worship does not guarantee that everything at home will be fixed, every bed will be made, or everyone will support your dreams. Faith must continue in the places where life remains difficult.',
				'Mary Magdalene came to Jesus’ tomb while it was still dark and found that he was not there. She looked for Jesus in the last place she had seen him, but the absence of his body became the setting for a new revelation of who he was.',
				'Mary was crying because she did not know where Jesus was or what to do. Jesus was standing near her, but she did not recognize him until he called her by name.',
			],
			application: 'Invite God into the low places, not only the spiritual highs. Look for him in grief, uncertainty, difficult relationships, daily decisions, and ordinary moments.',
		},
	],
	scripturesReferenced: [
		{ reference: '1 John 5:14–15', timestamp: '1:02' },
		{ reference: 'John 20:11–18', timestamp: '20:28' },
	],
	keyTakeaways: [
		'God hears you the first time, including prayers expressed through tears, groans, grief, and pain.',
		'An unanswered request does not mean an unheard prayer; God may be holding the situation while teaching and sustaining you.',
		'You are not responsible for holding everything together. God holds it all together.',
		'The answer is not always the removal of the problem. The answer is often that God comes and makes himself present.',
		'Faith and the renewal of the mind must continue moment by moment in the low places and in everyday situations.',
	],
	reflectionQuestions: [
		'Where have you been listening to the message that God has not heard you, and how would remembering that he hears you change your posture in that situation?',
		'What person, problem, or future are you trying to hold that you need to entrust to God?',
		'How might God be sustaining or teaching you through something you have repeatedly asked him to remove?',
		'Where do you need to invite God into a low place rather than looking only for him in spiritual highs?',
	],
}
