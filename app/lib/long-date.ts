const MONTH = new Intl.DateTimeFormat('en-US', {
	month: 'long',
	timeZone: 'UTC',
})

function ordinal(day: number): string {
	// 11th, 12th and 13th break the pattern the rest of the tens follow.
	if (day % 100 >= 11 && day % 100 <= 13) {
		return `${day}th`
	}

	switch (day % 10) {
		case 1:
			return `${day}st`
		case 2:
			return `${day}nd`
		case 3:
			return `${day}rd`
		default:
			return `${day}th`
	}
}

/**
 * `September 18th, 2026`.
 *
 * Admin screens spell dates out. `2026-09-18` is unambiguous but reads like a
 * key rather than a day, and these pages are scanned rather than studied.
 *
 * UTC, so a date here always agrees with the UTC windows the analytics ranges
 * are counted over.
 */
export function longDate(value: Date | string): string {
	const date = value instanceof Date ? value : new Date(value)

	if (Number.isNaN(date.getTime())) {
		return '—'
	}

	return `${MONTH.format(date)} ${ordinal(date.getUTCDate())}, ${date.getUTCFullYear()}`
}
