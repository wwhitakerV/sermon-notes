import { NextResponse } from 'next/server'
import { z } from 'zod'
import { findUserByEmail, normalizeEmail } from '@/app/lib/auth/accounts'
import { createPasswordReset } from '@/app/lib/auth/password-reset'
import { sendEmail } from '@/app/lib/email'
import { siteUrl } from '@/app/lib/site-url'

const bodySchema = z.object({ email: z.email().max(254) })

/**
 * Always answers the same way.
 *
 * Saying "no account with that email" would turn this form into a way to test
 * whether someone has an account here, which is a privacy leak and a gift to
 * anyone stuffing credentials. The reply is identical either way; only the
 * inbox differs.
 */
export async function POST(request: Request) {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null))

	if (!parsed.success) {
		return NextResponse.json(
			{ error: 'Enter the email you signed up with.', code: 'invalid_email' },
			{ status: 400 },
		)
	}

	const email = normalizeEmail(parsed.data.email)
	const user = await findUserByEmail(email)

	if (user) {
		const token = await createPasswordReset(user.id)
		const link = `${siteUrl()}/reset/${token}`

		await sendEmail({
			to: user.email,
			subject: 'Reset your Sermon Drop password',
			text: [
				'Someone asked to reset the password for this Sermon Drop account.',
				'',
				`Set a new one here: ${link}`,
				'',
				'The link works once and expires in an hour.',
				'If this was not you, ignore this email — nothing has changed.',
			].join('\n'),
			html: resetEmailHtml(link),
		})
	}

	return NextResponse.json({ sent: true })
}

function resetEmailHtml(link: string): string {
	return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1815;line-height:1.6;max-width:480px">
  <p>Someone asked to reset the password for this Sermon Drop account.</p>
  <p style="margin:24px 0">
    <a href="${link}" style="background:#b8460a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;display:inline-block;font-weight:600">Set a new password</a>
  </p>
  <p style="color:#5c554c;font-size:14px">The link works once and expires in an hour.</p>
  <p style="color:#5c554c;font-size:14px">If this wasn't you, ignore this email — nothing has changed.</p>
</div>`
}
