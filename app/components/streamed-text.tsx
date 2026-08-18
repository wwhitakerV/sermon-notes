'use client'

import { memo, useEffect, useState } from 'react'

/** One word, plus whatever whitespace trails it. */
const WORD = /\S+\s*/g

/** Gap between consecutive words, so a snapshot lands as a wave. */
const STAGGER_MS = 18

/** Ceiling on that wave, so a large burst still finishes promptly. */
const MAX_DELAY_MS = 260

/** Quiet time after which a finished passage collapses back to plain text. */
const SETTLE_MS = 600

type Props = {
	text: string
	/** False once the notes are settled: renders a plain string, no markup. */
	animate: boolean
	/** Draws the caret after the last word. Only one passage gets this. */
	caret?: boolean
}

/**
 * Reveals text a word at a time as it streams in.
 *
 * Words are revealed rather than characters on purpose: a character-by-character
 * reveal re-wraps the line on nearly every frame, and watching the last word
 * hop to the next line is the one artifact that makes this kind of animation
 * look cheap. A word lands in its final position and stays there.
 *
 * The stagger is handed to CSS rather than driven from a frame loop, so the
 * compositor does the work and React re-renders only when a snapshot arrives.
 */
function StreamedTextView({ text, animate, caret = false }: Props) {
	// Which words were already on screen, and whether the model has moved on.
	// Held as state rather than a ref because the render itself needs to read
	// it, and adjusted during render — the sanctioned way to derive state from
	// a changed prop without bouncing through an effect.
	const [seen, setSeen] = useState({ text, from: 0, quiet: false })

	if (seen.text !== text) {
		setSeen({ text, from: countWords(seen.text), quiet: false })
	}

	// Marks the passage quiet once the model stops adding to it.
	useEffect(() => {
		if (!animate) {
			return
		}

		const timer = setTimeout(
			() =>
				setSeen(current =>
					current.quiet ? current : { ...current, quiet: true },
				),
			SETTLE_MS,
		)

		return () => clearTimeout(timer)
	}, [text, animate])

	const current = seen.text === text
	const from = current ? seen.from : countWords(seen.text)
	const quiet = current ? seen.quiet : false

	// A settled passage is hundreds of spans doing nothing for the rest of a
	// long sermon. Every word has finished animating by now, so this changes
	// nothing on screen — it just hands the text back as a plain node.
	if (!animate || (quiet && !caret)) {
		return <>{text}</>
	}

	const words = text.match(WORD) ?? []
	const start = Math.min(from, words.length)

	return (
		<>
			{words.map((word, index) => (
				<span
					key={index}
					// The class stays put for the life of the word. Swapping it out
					// mid-flight would cancel the animation and snap the word in.
					className="animate-word"
					style={
						index < start
							? undefined
							: {
									animationDelay: `${Math.min(
										(index - start) * STAGGER_MS,
										MAX_DELAY_MS,
									)}ms`,
								}
					}
				>
					{word}
				</span>
			))}

			{caret && (
				<span
					aria-hidden
					className="bg-accent animate-caret ml-0.5 inline-block h-[0.85em] w-[0.09em] translate-y-[0.1em] rounded-[1px]"
				/>
			)}
		</>
	)
}

function countWords(text: string): number {
	return text.match(WORD)?.length ?? 0
}

/**
 * Memoised because a snapshot re-renders the whole document while touching one
 * passage; without this every settled paragraph reconciles eight times a second.
 */
export const StreamedText = memo(StreamedTextView)
