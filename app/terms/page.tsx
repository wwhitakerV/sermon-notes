import type { Metadata } from 'next'
import { LegalPage } from '@/app/components/legal-page'

export const metadata: Metadata = { title: 'Terms — Sermon Notes' }

export default function TermsPage() {
	return (
		<LegalPage
			title="Terms of service"
			updated="5 September 2026"
			summary={[
				'One token is $1 and turns one sermon into notes. Your first one is free.',
				'Tokens never expire, there is no subscription, and nothing to cancel.',
				'Re-opening notes you already own is always free — you are never charged twice.',
				'A failed conversion costs you nothing. The token comes straight back.',
			]}
			sections={[
				{
					id: 'what-this-is',
					heading: 'What this service does',
					content: (
						<>
							<p>
								Sermon Notes takes a YouTube video you choose, reads its
								captions, and uses an AI model to write study notes from them.
							</p>
							<p>
								The notes are a machine&rsquo;s summary of what was said. They
								may be incomplete, may misattribute a point, and may get a
								Scripture reference wrong.{' '}
								<strong>
									Check anything that matters against the sermon itself
								</strong>{' '}
								— every timestamp on the page plays the moment it came from.
							</p>
						</>
					),
				},
				{
					id: 'account',
					heading: 'Your account',
					content: (
						<>
							<p>
								You need an account to read and keep notes. You are responsible
								for your password and for what happens under your account. One
								person, one account.
							</p>
							<p>
								Tell us promptly if you think someone else has access, and we
								will end every session on it.
							</p>
						</>
					),
				},
				{
					id: 'tokens',
					heading: 'Tokens and payment',
					content: (
						<>
							<ul>
								<li>
									<strong>One token converts one video into notes.</strong>{' '}
									Tokens cost $1 each and are sold in packs of 1, 5 and 10.
								</li>
								<li>
									<strong>Your first video is free.</strong> After that every
									new video costs a token.
								</li>
								<li>
									<strong>Opening notes already in your library is free</strong>{' '}
									and always will be. You are never charged twice for the same
									sermon.
								</li>
								<li>
									<strong>Tokens do not expire.</strong> This is not a
									subscription and there is nothing to cancel.
								</li>
								<li>
									<strong>A token is only spent on notes you receive.</strong>{' '}
									If a conversion fails, it is returned automatically.
								</li>
								<li>
									Tokens have no cash value and cannot be transferred or
									redeemed for money.
								</li>
							</ul>
							<p>
								Payments are handled by Stripe. Your full card number never
								reaches our servers.
							</p>
						</>
					),
				},
				{
					id: 'refunds',
					heading: 'Refunds',
					content: (
						<>
							<p>
								If something goes wrong, write to us and we will sort it out.
								Unused tokens can be refunded on request.
							</p>
							<p>
								Tokens already spent on notes you received are not normally
								refundable, because the work was done — but ask anyway if the
								notes were bad. We would rather hear it.
							</p>
						</>
					),
				},
				{
					id: 'content',
					heading: 'Sermons and copyright',
					content: (
						<>
							<p>
								The sermons belong to whoever preached and published them. We do
								not host video, and notes are generated for your personal study.
							</p>
							<p>
								Do not use this service to reproduce or redistribute
								someone&rsquo;s work in a way their licence does not allow.
							</p>
						</>
					),
				},
				{
					id: 'acceptable-use',
					heading: 'Acceptable use',
					content: (
						<p>
							Do not attempt to break, overload, or work around the limits of the
							service, and do not use it to process material you have no right
							to. We may suspend an account that does.
						</p>
					),
				},
				{
					id: 'liability',
					heading: 'Availability and liability',
					content: (
						<>
							<p>
								The service is provided as it is. We do not promise it will
								always be available, or that the notes will be accurate.
							</p>
							<p>
								To the extent the law allows, our liability is limited to what
								you have paid us in the previous twelve months.
							</p>
						</>
					),
				},
				{
					id: 'changes',
					heading: 'Changes to these terms',
					content: (
						<p>
							We may update these terms. If a change matters, we will say so on
							this page and update the date at the top.
						</p>
					),
				},
			]}
		/>
	)
}
