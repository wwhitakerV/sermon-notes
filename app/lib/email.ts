type SendType = {
	to: string
	subject: string
	text: string
	html: string
}

/**
 * Sends through Resend's HTTP API directly rather than its SDK — one fetch, no
 * dependency, and swapping provider later means editing this function only.
 *
 * Returns whether it went. Callers must not tell the browser either way: that
 * would turn any form into a way to ask whether an address has an account here.
 */
export async function sendEmail({
	to,
	subject,
	text,
	html,
}: SendType): Promise<boolean> {
	const key = process.env.RESEND_API_KEY
	const from = process.env.EMAIL_FROM

	if (!key || !from) {
		console.error('email not configured: set RESEND_API_KEY and EMAIL_FROM')

		return false
	}

	try {
		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${key}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ from, to, subject, text, html }),
		})

		if (!response.ok) {
			console.error('email send failed', response.status, await response.text())

			return false
		}

		return true
	} catch (error) {
		console.error('email send threw', error)

		return false
	}
}
