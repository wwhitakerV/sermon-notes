import { LegalOutline } from './legal-outline'
import { SiteHeader } from './site-header'

export type LegalSectionType = {
	id: string
	heading: string
	content: React.ReactNode
}

type Props = {
	title: string
	updated: string
	/** The deal in plain words, for the many more people who read only this. */
	summary: string[]
	sections: LegalSectionType[]
}

export function LegalPage({ title, updated, summary, sections }: Props) {
	return (
		<main className="flex flex-1 flex-col">
			<SiteHeader />

			<div className="mx-auto w-full max-w-5xl px-5 pt-8 pb-24 sm:px-6 sm:pt-12">
				<header>
					<p className="text-ink-faint text-[0.6875rem] font-medium tracking-[0.14em] uppercase">
						Legal
					</p>
					<h1 className="font-serif mt-4 text-[2rem] leading-[1.1] font-medium tracking-tight text-balance sm:text-[2.75rem]">
						{title}
					</h1>
					<p className="text-ink-faint mt-3 font-mono text-xs tabular-nums">
						Updated {updated}
					</p>
				</header>

				{/*
				 * Borrowed from the "Big idea" block in the notes. Almost nobody
				 * reads a terms page top to bottom; this is the part written for
				 * the people who will not.
				 */}
				<section className="border-accent bg-surface mt-8 max-w-2xl rounded-r-xl border-l-2 py-5 pr-6 pl-6 shadow-[0_1px_2px_rgb(26_24_21/0.04)]">
					<p className="text-ink-faint text-[0.6875rem] font-medium tracking-[0.14em] uppercase">
						The short version
					</p>
					<ul className="mt-3 space-y-2">
						{summary.map(line => (
							<li
								key={line}
								className="font-serif flex gap-3 text-[1.0625rem] leading-[1.55] text-pretty"
							>
								<span
									aria-hidden
									className="bg-accent mt-[0.6em] size-1.5 shrink-0 rounded-full"
								/>
								{line}
							</li>
						))}
					</ul>
				</section>

				<div className="mt-14 grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14">
					<LegalOutline
						items={sections.map(({ id, heading }) => ({ id, heading }))}
					/>

					<div className="legal min-w-0 max-w-2xl">
						{sections.map((section, index) => (
							<section
								key={section.id}
								id={section.id}
								className="border-line scroll-mt-24 not-first:mt-12 not-first:border-t not-first:pt-12"
							>
								<h2 className="flex items-baseline gap-3">
									<span className="text-accent-strong font-mono text-xs tabular-nums">
										{String(index + 1).padStart(2, '0')}
									</span>
									{section.heading}
								</h2>
								{section.content}
							</section>
						))}
					</div>
				</div>
			</div>
		</main>
	)
}
