'use client'

import { useEffect, useMemo, useState } from 'react'
import type { SermonNotesType, VideoMetaType } from '@/app/types'
import { notesToText } from '@/app/lib/notes-text'
import {
	formatSeconds,
	formatTimestamp,
	timestampToSeconds,
} from '@/app/lib/youtube'
import {
	ArrowLeftIcon,
	CheckIcon,
	CopyIcon,
	PrintIcon,
	YouTubeIcon,
} from './icons'
import { TimestampPill } from './timestamp-pill'

type Props = {
	notes: SermonNotesType
	meta: VideoMetaType | null
	onReset: () => void
}

export function NotesView({ notes, meta, onReset }: Props) {
	const videoId = meta?.videoId ?? null
	const sectionIds = useMemo(
		() => notes.sections.map((_, index) => `section-${index + 1}`),
		[notes.sections],
	)
	const activeId = useActiveSection(sectionIds)

	// Chronological order makes the Scripture index usable alongside the video.
	const scriptures = useMemo(
		() =>
			[...notes.scripturesReferenced].sort(
				(a, b) =>
					(timestampToSeconds(a.timestamp) ?? 0) -
					(timestampToSeconds(b.timestamp) ?? 0),
			),
		[notes.scripturesReferenced],
	)

	return (
		<div className="animate-fade">
			<Toolbar notes={notes} meta={meta} onReset={onReset} />

			<div className="mx-auto w-full max-w-5xl px-6 pb-28">
				<header className="pt-12 sm:pt-16">
					<Eyebrow>Sermon notes</Eyebrow>

					<h1 className="font-serif mt-5 text-[1.75rem] leading-[1.12] font-medium tracking-tight text-balance sm:text-[2.5rem] lg:text-[2.875rem]">
						{notes.title}
					</h1>

					<div className="text-ink-muted mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
						{meta?.author && <span>{meta.author}</span>}
						{meta?.durationSeconds && (
							<>
								<Dot />
								<span className="font-mono text-xs tabular-nums">
									{formatSeconds(meta.durationSeconds)}
								</span>
							</>
						)}
						{meta?.url && (
							<>
								<Dot />
								<a
									href={meta.url}
									target="_blank"
									rel="noreferrer"
									className="hover:text-accent-strong no-print inline-flex items-center gap-1.5 transition-colors"
								>
									<YouTubeIcon className="size-4" />
									Watch on YouTube
								</a>
							</>
						)}
					</div>

					{notes.mainTexts.length > 0 && (
						<div className="mt-7">
							<Eyebrow>Main text</Eyebrow>
							<div className="mt-2.5 flex flex-wrap items-center gap-2">
								{notes.mainTexts.map(text => (
									<span
										key={`${text.reference}-${text.timestamp}`}
										className="border-accent/20 bg-accent-tint text-accent-strong inline-flex items-center gap-2 rounded-full border py-1 pr-1 pl-3.5"
									>
										<span className="font-serif text-[0.9375rem]">
											{text.reference}
										</span>
										<TimestampPill
											timestamp={text.timestamp}
											videoId={videoId}
										/>
									</span>
								))}
							</div>
						</div>
					)}

					<div className="border-accent bg-surface print-plain mt-8 rounded-r-xl border-l-2 py-5 pr-6 pl-6 shadow-[0_1px_2px_rgb(26_24_21/0.04)]">
						<Eyebrow>Big idea</Eyebrow>
						<p className="font-serif note-body mt-3 text-[1.0625rem] leading-[1.65] text-pretty sm:text-[1.1875rem]">
							{notes.mainIdea}
						</p>
					</div>
				</header>

				<div className="mt-16 grid gap-12 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-14">
					<Outline
						sections={notes.sections}
						sectionIds={sectionIds}
						activeId={activeId}
					/>

					<div className="min-w-0">
						<div>
							{notes.sections.map((section, index) => (
								<section
									key={sectionIds[index]}
									id={sectionIds[index]}
									className="print-break border-line scroll-mt-24 not-first:mt-12 not-first:border-t not-first:pt-12"
								>
									<div className="flex items-baseline gap-3.5">
										<span className="text-accent-strong font-serif text-lg tabular-nums">
											{String(index + 1).padStart(2, '0')}
										</span>
										<TimestampPill
											timestamp={section.timestamp}
											videoId={videoId}
											tone="solid"
										/>
									</div>

									<h2 className="font-serif mt-2.5 text-[1.5rem] leading-snug font-medium tracking-tight text-balance sm:text-[1.75rem]">
										{section.title}
									</h2>

									{section.scriptures.length > 0 && (
										<ul className="mt-3.5 flex flex-wrap gap-1.5">
											{section.scriptures.map(scripture => (
												<li
													key={scripture}
													className="border-line bg-surface text-ink-muted font-serif rounded-md border px-2.5 py-1 text-[0.8125rem]"
												>
													{scripture}
												</li>
											))}
										</ul>
									)}

									<ul className="mt-6 space-y-4">
										{section.notes.map((note, noteIndex) => (
											<li key={noteIndex} className="flex gap-3.5">
												<span
													aria-hidden
													className="bg-accent/40 mt-[0.7em] size-1.5 shrink-0 rotate-45 rounded-[1px]"
												/>
												<p className="note-body text-ink-muted text-[0.9375rem] leading-[1.75]">
													{note}
												</p>
											</li>
										))}
									</ul>

									{section.application && (
										<div className="border-line bg-paper-sunk/60 print-plain mt-6 rounded-xl border px-5 py-4">
											<Eyebrow>Application</Eyebrow>
											<p className="note-body mt-2 text-[0.9375rem] leading-[1.7]">
												{section.application}
											</p>
										</div>
									)}
								</section>
							))}
						</div>

						{scriptures.length > 0 && (
							<section className="print-break mt-20">
								<SectionHeading>Scriptures referenced</SectionHeading>

								<ul className="border-line bg-surface mt-6 divide-line divide-y divide-dashed overflow-hidden rounded-xl border">
									{scriptures.map((entry, index) => (
										<li
											key={`${entry.reference}-${entry.timestamp}-${index}`}
											className="hover:bg-accent-tint/40 flex items-center gap-3 px-4 py-2.5 transition-colors"
										>
											<span className="font-serif text-[0.9375rem]">
												{entry.reference}
											</span>
											<span
												aria-hidden
												className="border-line-strong mt-2.5 flex-1 border-b border-dotted"
											/>
											<TimestampPill
												timestamp={entry.timestamp}
												videoId={videoId}
											/>
										</li>
									))}
								</ul>
							</section>
						)}

						{notes.keyTakeaways.length > 0 && (
							<section className="print-break mt-20">
								<SectionHeading>Key takeaways</SectionHeading>

								<ul className="mt-6 space-y-3">
									{notes.keyTakeaways.map((takeaway, index) => (
										<li
											key={index}
											className="border-line bg-surface print-plain flex gap-4 rounded-xl border px-5 py-4"
										>
											<span className="text-accent-strong/70 font-serif w-6 shrink-0 text-lg tabular-nums">
												{index + 1}
											</span>
											<p className="note-body text-[0.9375rem] leading-[1.7]">
												{takeaway}
											</p>
										</li>
									))}
								</ul>
							</section>
						)}

						<div className="no-print mt-20 text-center">
							<button
								type="button"
								onClick={onReset}
								className="border-line bg-surface hover:border-accent/40 hover:text-accent-strong inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors"
							>
								Take notes on another sermon
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

function Toolbar({ notes, meta, onReset }: Props) {
	const [copied, setCopied] = useState(false)

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(notesToText(notes, meta))
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {
			setCopied(false)
		}
	}

	return (
		<div className="no-print border-line bg-paper/85 sticky top-0 z-20 border-b backdrop-blur-md">
			<div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-6 py-3">
				<button
					type="button"
					onClick={onReset}
					className="text-ink-muted hover:text-ink -ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors"
				>
					<ArrowLeftIcon className="size-4" />
					New notes
				</button>

				<span className="text-ink-faint hidden min-w-0 flex-1 truncate text-center text-xs sm:block">
					{notes.title}
				</span>

				<div className="ml-auto flex items-center gap-1 sm:ml-0">
					<ToolbarButton onClick={handleCopy} label={copied ? 'Copied' : 'Copy'}>
						{copied ? (
							<CheckIcon className="text-accent-strong size-4" />
						) : (
							<CopyIcon className="size-4" />
						)}
					</ToolbarButton>

					<ToolbarButton onClick={() => window.print()} label="Print">
						<PrintIcon className="size-4" />
					</ToolbarButton>
				</div>
			</div>
		</div>
	)
}

function ToolbarButton({
	onClick,
	label,
	children,
}: {
	onClick: () => void
	label: string
	children: React.ReactNode
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="text-ink-muted hover:bg-paper-sunk hover:text-ink inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
		>
			{children}
			<span className="hidden sm:inline">{label}</span>
		</button>
	)
}

function Outline({
	sections,
	sectionIds,
	activeId,
}: {
	sections: SermonNotesType['sections']
	sectionIds: string[]
	activeId: string | null
}) {
	return (
		<nav className="no-print hidden lg:block">
			<div className="sticky top-20">
				<Eyebrow>Outline</Eyebrow>

				<ul className="border-line mt-4 space-y-px border-l">
					{sections.map((section, index) => {
						const id = sectionIds[index]
						const isActive = activeId === id

						return (
							<li key={id}>
								<a
									href={`#${id}`}
									className={`-ml-px block border-l-2 py-1.5 pl-3.5 text-[0.8125rem] leading-snug transition-colors ${
										isActive
											? 'border-accent text-ink font-medium'
											: 'text-ink-faint hover:text-ink-muted border-transparent'
									}`}
								>
									{section.title}
									<span className="mt-0.5 block font-mono text-[0.6875rem] tabular-nums opacity-70">
										{formatTimestamp(section.timestamp)}
									</span>
								</a>
							</li>
						)
					})}
				</ul>
			</div>
		</nav>
	)
}

function SectionHeading({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex items-center gap-4">
			<h2 className="text-ink-faint text-[0.6875rem] font-medium tracking-[0.14em] whitespace-nowrap uppercase">
				{children}
			</h2>
			<span className="bg-line h-px flex-1" />
		</div>
	)
}

function Eyebrow({ children }: { children: React.ReactNode }) {
	return (
		<span className="text-accent-strong/80 block text-[0.6875rem] font-medium tracking-[0.14em] uppercase">
			{children}
		</span>
	)
}

function Dot() {
	return <span aria-hidden className="bg-line-strong size-1 rounded-full" />
}

/**
 * Highlights the outline entry for the section the reader is currently in —
 * the last one whose heading has passed the top quarter of the viewport.
 * Measured on scroll rather than observed, so it stays correct after a jump.
 */
function useActiveSection(sectionIds: string[]) {
	const [activeId, setActiveId] = useState<string | null>(sectionIds[0] ?? null)

	useEffect(() => {
		let frame = 0

		const measure = () => {
			frame = 0

			const line = window.innerHeight * 0.25
			let current = sectionIds[0] ?? null

			for (const id of sectionIds) {
				const element = document.getElementById(id)

				if (element && element.getBoundingClientRect().top <= line) {
					current = id
				}
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
	}, [sectionIds])

	return activeId
}
