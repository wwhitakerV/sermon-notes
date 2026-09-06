import { sampleNotes as notes } from '@/app/lib/sample-notes'
import { formatTimestamp } from '@/app/lib/youtube'

/**
 * A window onto real notes, drifting slowly past.
 *
 * "Study notes" means nothing until you see them — one person pictures a
 * summary paragraph, another a transcript. Trying it costs forty seconds and an
 * account, which is a lot to ask of someone who arrived from a link. This
 * answers the question in about two seconds.
 *
 * Deliberately not the real `NotesView`: that carries a toolbar, a margin
 * outline, timestamp links and streaming animation, none of which belong in a
 * static picture of the output.
 */
export function NotesPreview() {
	return (
		<div
			aria-hidden
			className="border-line bg-surface relative overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgb(26_24_21/0.04),0_12px_32px_-16px_rgb(26_24_21/0.14)]"
			style={{ height: 'var(--drift-window)', ['--drift-window' as string]: '22rem' }}
		>
			<div className="notes-drift px-5 py-6 sm:px-7">
				<Eyebrow>Sermon notes</Eyebrow>
				<h3 className="font-serif mt-2 text-[1.25rem] leading-tight font-medium tracking-tight text-pretty">
					{notes.title}
				</h3>

				<div className="border-accent mt-4 border-l-2 pl-4">
					<Eyebrow>Big idea</Eyebrow>
					<p className="font-serif mt-1.5 text-[0.9375rem] leading-[1.6] text-pretty">
						{notes.mainIdea}
					</p>
				</div>

				{notes.sections.map(section => (
					<section key={section.title} className="mt-7">
						<div className="flex items-baseline gap-2.5">
							<h4 className="font-serif text-[1.0625rem] leading-snug font-medium text-pretty">
								{section.title}
							</h4>
							<span className="text-ink-faint shrink-0 font-mono text-[0.6875rem] tabular-nums">
								{formatTimestamp(section.timestamp)}
							</span>
						</div>

						{section.scriptures.length > 0 && (
							<div className="mt-2 flex flex-wrap gap-1.5">
								{section.scriptures.map(reference => (
									<span
										key={reference}
										className="border-line bg-paper-sunk/50 text-ink-muted font-serif rounded-md border px-2 py-0.5 text-[0.75rem]"
									>
										{reference}
									</span>
								))}
							</div>
						)}

						<ul className="mt-2.5 space-y-2">
							{section.notes.map(note => (
								<li key={note} className="flex gap-3">
									<span className="bg-accent/40 mt-[0.6em] size-1 shrink-0 rounded-full" />
									<span className="text-ink-muted text-[0.875rem] leading-[1.6] text-pretty">
										{note}
									</span>
								</li>
							))}
						</ul>
					</section>
				))}

				<section className="mt-7">
					<Eyebrow>Scriptures referenced</Eyebrow>
					<div className="mt-2 flex flex-wrap gap-1.5">
						{notes.scripturesReferenced.map(entry => (
							<span
								key={`${entry.reference}-${entry.timestamp}`}
								className="border-accent/20 bg-accent-tint text-accent-strong font-serif rounded-full border px-2.5 py-0.5 text-[0.75rem]"
							>
								{entry.reference}
							</span>
						))}
					</div>
				</section>

				<section className="mt-7">
					<Eyebrow>Key takeaways</Eyebrow>
					<ul className="mt-2 space-y-2">
						{notes.keyTakeaways.map(item => (
							<li key={item} className="flex gap-3">
								<span className="bg-accent/40 mt-[0.6em] size-1 shrink-0 rounded-full" />
								<span className="text-ink-muted text-[0.875rem] leading-[1.6] text-pretty">
									{item}
								</span>
							</li>
						))}
					</ul>
				</section>

				<section className="mt-7 pb-2">
					<Eyebrow>Reflection questions</Eyebrow>
					<ol className="mt-2 space-y-2">
						{notes.reflectionQuestions.map((question, index) => (
							<li key={question} className="flex gap-3">
								<span className="text-ink-faint shrink-0 font-mono text-[0.6875rem] tabular-nums">
									{String(index + 1).padStart(2, '0')}
								</span>
								<span className="text-ink-muted text-[0.875rem] leading-[1.6] text-pretty">
									{question}
								</span>
							</li>
						))}
					</ol>
				</section>
			</div>

			{/* Content enters and leaves through a fade rather than a hard edge. */}
			<div className="from-surface pointer-events-none absolute inset-x-0 top-0 h-10 bg-linear-to-b to-transparent" />
			<div className="from-surface pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-linear-to-t to-transparent" />
		</div>
	)
}

function Eyebrow({ children }: { children: React.ReactNode }) {
	return (
		<span className="text-ink-faint text-[0.625rem] font-medium tracking-[0.14em] uppercase">
			{children}
		</span>
	)
}
