import type { Metadata } from 'next'
import { LegalPage } from '@/app/components/legal-page'

export const metadata: Metadata = { title: 'Privacy — Sermon Notes' }

export default function PrivacyPage() {
	return (
		<LegalPage
			title="Privacy"
			updated="5 September 2026"
			summary={[
				'We store your email, a hashed password, and which sermons you converted. That is close to all of it.',
				'Two cookies, both strictly necessary. No analytics, no tracking, no advertising.',
				'Your card details go straight to Stripe and never touch our servers.',
				'Nobody can see your library, and we do not sell anything to anyone.',
			]}
			sections={[
				{
					id: 'what-we-collect',
					heading: 'What we collect',
					content: (
						<ul>
							<li>
								<strong>Your email and a hashed password.</strong> The password
								is stored as a one-way hash — we cannot read it, and neither
								could anyone who stole the database.
							</li>
							<li>
								<strong>A device identifier.</strong> A random id in a cookie,
								set on your first visit. It is how we know the free video has
								been used. It is linked to nothing about you until you make an
								account.
							</li>
							<li>
								<strong>Which sermons you convert,</strong> so they appear in
								your library and so you are never charged for one twice.
							</li>
							<li>
								<strong>Payment records</strong> — amount, tokens, and a Stripe
								reference.
							</li>
							<li>
								<strong>Feedback you send,</strong> including the rating, your
								comment, and which page you were on.
							</li>
						</ul>
					),
				},
				{
					id: 'cookies',
					heading: 'Cookies',
					content: (
						<>
							<p>
								Two, and both are strictly necessary: one holds your device id,
								the other keeps you signed in. Both are httpOnly, which means no
								script on the page can read them.
							</p>
							<p>
								There is no analytics cookie, no advertising cookie, and no
								third-party tracker. That is also why there is no cookie banner
								— there is nothing to consent to.
							</p>
						</>
					),
				},
				{
					id: 'processors',
					heading: 'Who else sees your data',
					content: (
						<>
							<ul>
								<li>
									<strong>Supadata</strong> — fetches captions for the video you
									submit.
								</li>
								<li>
									<strong>OpenAI</strong> — receives the transcript in order to
									write the notes.
								</li>
								<li>
									<strong>Stripe</strong> — handles payments and stores your
									card.
								</li>
								<li>
									<strong>Neon</strong> — hosts the database.
								</li>
							</ul>
							<p>
								Each receives only what it needs for its part. None of them
								receives your library, and we do not share your email with
								anyone.
							</p>
						</>
					),
				},
				{
					id: 'shared-notes',
					heading: 'Notes are cached, and shared',
					content: (
						<>
							<p>
								Notes are stored against the video, not against you. If someone
								else converts the same sermon, they are served the notes that
								already exist — which is why a popular sermon is instant.
							</p>
							<p>
								They cannot see that you converted it, when, or anything else in
								your library.{' '}
								<strong>
									The sermon is public; your reading of it is not.
								</strong>
							</p>
						</>
					),
				},
				{
					id: 'retention',
					heading: 'How long we keep it',
					content: (
						<p>
							Your account and library are kept until you ask us to delete them.
							Payment records are kept as long as the law requires. Ask, and we
							will delete your account and everything attached to it.
						</p>
					),
				},
				{
					id: 'your-rights',
					heading: 'Your rights',
					content: (
						<p>
							You can ask for a copy of your data, ask us to correct it, or ask
							us to delete it — and we will act on it rather than making you
							chase it.
						</p>
					),
				},
			]}
		/>
	)
}
