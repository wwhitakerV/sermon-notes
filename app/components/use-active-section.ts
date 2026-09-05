'use client'

import { useEffect, useState } from 'react'

/** Fractional device pixels mean the bottom is rarely an exact match. */
const BOTTOM_SLACK_PX = 4

/**
 * Which of a page's sections is currently being read, for a margin outline to
 * highlight. Shared by the notes reader and the legal pages.
 */
export function useActiveSection(sectionIds: string[]) {
	const [activeId, setActiveId] = useState<string | null>(sectionIds[0] ?? null)

	// A new section arriving mid-stream hands this hook a fresh array on every
	// snapshot. Keying the effect on the contents rather than the identity keeps
	// it from tearing down and re-attaching the scroll listener each time.
	const sectionKey = sectionIds.join('|')

	useEffect(() => {
		const ids = sectionKey ? sectionKey.split('|') : []

		let frame = 0

		const measure = () => {
			frame = 0

			const line = window.innerHeight * 0.25
			let current = ids[0] ?? null

			for (const id of ids) {
				const element = document.getElementById(id)

				if (element && element.getBoundingClientRect().top <= line) {
					current = id
				}
			}

			/**
			 * The closing sections are short, so the page often cannot scroll far
			 * enough for the last one's heading to reach the line above — jumping
			 * to it would scroll there and light up the section before it. Once
			 * the page has run out, the last section is by definition the one
			 * being read.
			 */
			const atBottom =
				window.innerHeight + window.scrollY >=
				document.documentElement.scrollHeight - BOTTOM_SLACK_PX

			if (atBottom && ids.length > 0) {
				current = ids[ids.length - 1]
			}

			setActiveId(current)
		}

		const schedule = () => {
			if (!frame) {
				frame = requestAnimationFrame(measure)
			}
		}

		schedule()
		window.addEventListener('scroll', schedule, { passive: true })
		window.addEventListener('resize', schedule)

		return () => {
			if (frame) {
				cancelAnimationFrame(frame)
			}

			window.removeEventListener('scroll', schedule)
			window.removeEventListener('resize', schedule)
		}
	}, [sectionKey])

	return activeId
}
