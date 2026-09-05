'use client'

import { useEffect, useState } from 'react'

/**
 * Whether the page is scrolled past a given depth.
 *
 * Measured on an animation frame rather than on every scroll event, so a fast
 * flick does not turn into hundreds of renders.
 */
export function useScrolledPast(threshold: number): boolean {
	const [past, setPast] = useState(false)

	useEffect(() => {
		let frame = 0

		const measure = () => {
			frame = 0
			setPast(window.scrollY > threshold)
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
	}, [threshold])

	return past
}
