'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { SermonNotesType, VideoMetaType } from '@/app/types'
import { notesToText } from '@/app/lib/notes-text'
import {
	formatSeconds,
	formatTimestamp,
	timestampToSeconds,
} from '@/app/lib/youtube'
import {
	ArrowLeftIcon,
	ArrowUpIcon,
	CheckIcon,
	ChevronDownIcon,
	CopyIcon,
	PrintIcon,
	YouTubeIcon,
} from './icons'
import { StreamedText } from './streamed-text'
import { TimestampPill } from './timestamp-pill'

/** The closing sections are jump targets too, so they need stable ids. */
const SCRIPTURES_ID = 'scriptures-referenced'
const TAKEAWAYS_ID = 'key-takeaways'
const QUESTIONS_ID = 'reflection-questions'

/** Grace period for the last words to finish animating after the stream ends. */
const SETTLE_TAIL_MS = 700

/** How far down the page the "back to top" control fades in. */
const BACK_TO_TOP_AFTER_PX = 400

type NavItemType = {
	id: string
	label: string
	timestamp?: string
}

type Props = {
	notes: SermonNotesType
	meta: VideoMetaType | null
	onReset: () => void
	/** The model is still writing: the notes below are complete so far, not final. */
	streaming?: boolean
}

export function NotesView({ notes, meta, onReset, streaming = false }: Props) {
	const videoId = meta?.videoId ?? null

	useFollowStream(streaming, notes)

	// Words keep animating for a moment after the stream ends, so the final
	// burst finishes its entrance instead of snapping into place.
	const animating = useSettling(streaming)

	// Only the passage the model is currently writing carries the caret.
	const caretKey = streaming ? leadingEdge(notes) : null
	const sectionIds = useMemo(
		() => notes.sections.map((_, index) => `section-${index + 1}`),
		[notes.sections],
	)

	// Chronological order makes the Scripture index usable alongside the video.
	// While streaming, entries are kept in arrival order instead: their
	// timestamps land a moment after their references, and sorting on the
	// half-filled list makes rows jump around as the reader is looking at them.
	const scriptures = useMemo(
		() =>
			streaming
				? notes.scripturesReferenced
				: [...notes.scripturesReferenced].sort(
						(a, b) =>
							(timestampToSeconds(a.timestamp) ?? 0) -
							(timestampToSeconds(b.timestamp) ?? 0),
					),
		[notes.scripturesReferenced, streaming],
	)

	// One list drives the margin outline and the mobile jump menu, so the two
	// can never drift apart. Closing sections appear only once they have content.
	const navItems = useMemo<NavItemType[]>(() => {
		const items: NavItemType[] = notes.sections.map((section, index) => ({
			id: sectionIds[index],
			label: section.title,
			timestamp: section.timestamp,
		}))

		if (scriptures.length > 0) {
			items.push({ id: SCRIPTURES_ID, label: 'Scriptures referenced' })
		}

		if (notes.keyTakeaways.length > 0) {
			items.push({ id: TAKEAWAYS_ID, label: 'Key takeaways' })
		}

		if (notes.reflectionQuestions.length > 0) {
			items.push({ id: QUESTIONS_ID, label: 'Reflection questions' })
		}

		return items
	}, [
		notes.sections,
		notes.keyTakeaways.length,
		notes.reflectionQuestions.length,
		scriptures.length,
		sectionIds,
	])

	const activeId = useActiveSection(navItems.map(item => item.id))

	return (
		<div className="animate-fade">
			<Toolbar
				notes={notes}
				meta={meta}
				onReset={onReset}
				streaming={streaming}
				navItems={navItems}
				activeId={activeId}
			/>

			<div className="mx-auto w-full max-w-5xl px-6 pb-28">
				<header className="pt-12 sm:pt-16">
					<Eyebrow>Sermon notes</Eyebrow>

					{notes.title ? (
						<h1 className="font-serif mt-5 text-[1.75rem] leading-[1.12] font-medium tracking-tight text-balance sm:text-[2.5rem] lg:text-[2.875rem]">
							<StreamedText
								text={notes.title}
								animate={animating}
								caret={caretKey === 'title'}
							/>
						</h1>
					) : (
						<div className="mt-5 space-y-3" aria-hidden>
							<SkeletonBar className="h-8 w-4/5 sm:h-10" />
							<SkeletonBar className="h-8 w-3/5 sm:h-10" />
						</div>
					)}

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
										{text.timestamp && (
											<TimestampPill
												timestamp={text.timestamp}
												videoId={videoId}
											/>
										)}
									</span>
								))}
							</div>
						</div>
					)}

					<div className="border-accent bg-surface print-plain mt-8 rounded-r-xl border-l-2 py-5 pr-6 pl-6 shadow-[0_1px_2px_rgb(26_24_21/0.04)]">
						<Eyebrow>Big idea</Eyebrow>
						{notes.mainIdea ? (
							<p className="font-serif note-body mt-3 text-[1.0625rem] leading-[1.65] text-pretty sm:text-[1.1875rem]">
								<StreamedText
									text={notes.mainIdea}
									animate={animating}
									caret={caretKey === 'mainIdea'}
								/>
							</p>
						) : (
							<div className="mt-4 space-y-2.5" aria-hidden>
								<SkeletonBar className="h-3.5 w-full" />
								<SkeletonBar className="h-3.5 w-11/12" />
								<SkeletonBar className="h-3.5 w-2/3" />
							</div>
						)}
					</div>
				</header>

				<div className="mt-16 grid gap-12 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-14">
					<Outline items={navItems} activeId={activeId} />

					<div className="min-w-0">
						<div>
							{notes.sections.map((section, index) => (
								<section
									key={sectionIds[index]}
									id={sectionIds[index]}
									className={`print-break border-line scroll-mt-24 not-first:mt-12 not-first:border-t not-first:pt-12 ${
										streaming ? 'animate-rise' : ''
									}`}
								>
									<div className="flex items-baseline gap-3.5">
										<span className="text-accent-strong font-serif text-lg tabular-nums">
											{String(index + 1).padStart(2, '0')}
										</span>
										{section.timestamp && (
											<TimestampPill
												timestamp={section.timestamp}
												videoId={videoId}
												tone="solid"
											/>
										)}
									</div>

									<h2 className="font-serif mt-2.5 text-[1.5rem] leading-snug font-medium tracking-tight text-balance sm:text-[1.75rem]">
										<StreamedText
											text={section.title}
											animate={animating}
											caret={caretKey === `s${index}.title`}
										/>
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
													<StreamedText
														text={note}
														animate={animating}
														caret={caretKey === `s${index}.n${noteIndex}`}
													/>
												</p>
											</li>
										))}
									</ul>

									{section.application && (
										<div className="border-line bg-paper-sunk/60 print-plain mt-6 rounded-xl border px-5 py-4">
											<Eyebrow>Practical Application</Eyebrow>
											<p className="note-body mt-2 text-[0.9375rem] leading-[1.7]">
												<StreamedText
													text={section.application}
													animate={animating}
													caret={caretKey === `s${index}.app`}
												/>
											</p>
										</div>
									)}
								</section>
							))}
						</div>

						{scriptures.length > 0 && (
							<section
								id={SCRIPTURES_ID}
								className="print-break mt-20 scroll-mt-24"
							>
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
											{entry.timestamp && (
												<TimestampPill
													timestamp={entry.timestamp}
													videoId={videoId}
												/>
											)}
										</li>
									))}
								</ul>
							</section>
						)}

						{notes.keyTakeaways.length > 0 && (
							<section
								id={TAKEAWAYS_ID}
								className="print-break mt-20 scroll-mt-24"
							>
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
												<StreamedText
													text={takeaway}
													animate={animating}
													caret={caretKey === `t${index}`}
												/>
											</p>
										</li>
									))}
								</ul>
							</section>
						)}

						{notes.reflectionQuestions.length > 0 && (
							<section
								id={QUESTIONS_ID}
								className="print-break mt-20 scroll-mt-24"
							>
								<SectionHeading>Reflection questions</SectionHeading>

								<ul className="mt-6 space-y-3">
									{notes.reflectionQuestions.map((question, index) => (
										<li
											key={index}
											className="border-line bg-surface print-plain flex gap-4 rounded-xl border px-5 py-4"
										>
											<span className="text-accent-strong/70 font-serif w-6 shrink-0 text-lg tabular-nums">
												{index + 1}
											</span>
											<p className="note-body text-[0.9375rem] leading-[1.7]">
												<StreamedText
													text={question}
													animate={animating}
													caret={caretKey === `q${index}`}
												/>
											</p>
										</li>
									))}
								</ul>
							</section>
						)}

						{!streaming && (
							<div className="no-print animate-fade mt-20 text-center">
								<button
									type="button"
									onClick={onReset}
									className="border-line bg-surface hover:border-accent/40 hover:text-accent-strong inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors"
								>
									Take notes on another sermon
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			<BackToTop />
		</div>
	)
}

type ToolbarProps = Props & {
	navItems: NavItemType[]
	activeId: string | null
}

function Toolbar({
	notes,
	meta,
	onReset,
	streaming = false,
	navItems,
	activeId,
}: ToolbarProps) {
	const [copied, setCopied] = useState(false)
	const [menuOpen, setMenuOpen] = useState(false)

	const activeLabel = navItems.find(item => item.id === activeId)?.label

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(notesToText(notes, meta))
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {
			setCopied(false)
		}
	}

	useEffect(() => {
		if (!menuOpen) {
			return
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setMenuOpen(false)
			}
		}

		window.addEventListener('keydown', onKeyDown)

		return () => window.removeEventListener('keydown', onKeyDown)
	}, [menuOpen])

	function jumpTo(id: string) {
		setMenuOpen(false)
		scrollToSection(id)
	}

	return (
		<div className="no-print border-line bg-paper/85 sticky top-0 z-20 border-b backdrop-blur-md">
			{streaming && (
				<div className="bg-paper-sunk absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
					<span className="via-accent absolute inset-y-0 w-1/3 animate-sweep bg-linear-to-r from-transparent to-transparent" />
				</div>
			)}

			<div className="relative z-20 mx-auto flex w-full max-w-5xl items-center gap-3 px-6 py-3">
				{/* Wide screens keep the outline in the margin, so the bar just goes back. */}
				<button
					type="button"
					onClick={onReset}
					className="text-ink-muted hover:text-ink -ml-2 hidden items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors lg:inline-flex"
				>
					<ArrowLeftIcon className="size-4" />
					New notes
				</button>

				{/* Below `lg` there is no margin outline, so the bar becomes the nav. */}
				<button
					type="button"
					onClick={() => setMenuOpen(open => !open)}
					disabled={navItems.length === 0}
					aria-expanded={menuOpen}
					aria-controls="jump-menu"
					className="text-ink-muted hover:text-ink -ml-2 flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors disabled:opacity-40 lg:hidden"
				>
					<span className="truncate">{activeLabel ?? 'Jump to section'}</span>
					<ChevronDownIcon
						className={`size-4 shrink-0 transition-transform duration-200 ${
							menuOpen ? 'rotate-180' : ''
						}`}
					/>
				</button>

				<span className="text-ink-faint hidden min-w-0 flex-1 truncate text-center text-xs lg:block">
					{notes.title || meta?.title}
				</span>

				<div className="ml-auto flex items-center gap-1">
					<ToolbarButton
						onClick={handleCopy}
						label={copied ? 'Copied' : 'Copy'}
						disabled={streaming}
					>
						{copied ? (
							<CheckIcon className="text-accent-strong size-4" />
						) : (
							<CopyIcon className="size-4" />
						)}
					</ToolbarButton>

					<ToolbarButton
						onClick={() => window.print()}
						label="Print"
						disabled={streaming}
					>
						<PrintIcon className="size-4" />
					</ToolbarButton>
				</div>
			</div>

			{menuOpen && (
				<>
					<button
						type="button"
						tabIndex={-1}
						aria-hidden
						onClick={() => setMenuOpen(false)}
						className="fixed inset-0 z-10 cursor-default lg:hidden"
					/>

					<nav
						id="jump-menu"
						className="border-line bg-paper animate-fade relative z-20 h-[calc(100vh-56px)] overflow-y-auto border-t lg:hidden"
					>
						<ul className="mx-auto w-full max-w-5xl px-4 py-2">
							{navItems.map(item => (
								<li key={item.id}>
									<button
										type="button"
										onClick={() => jumpTo(item.id)}
										className={`flex w-full items-baseline gap-3 rounded-lg px-3 py-2.5 text-left text-[0.9375rem] leading-snug transition-colors ${
											activeId === item.id
												? 'bg-accent-tint text-ink font-medium'
												: 'text-ink-muted hover:bg-paper-sunk'
										}`}
									>
										<span className="min-w-0 flex-1">{item.label}</span>
										{item.timestamp && (
											<span className="text-ink-faint shrink-0 font-mono text-[0.6875rem] tabular-nums">
												{formatTimestamp(item.timestamp)}
											</span>
										)}
									</button>
								</li>
							))}
						</ul>

						<div className="border-line mx-auto w-full max-w-5xl border-t px-4 py-3">
							<button
								type="button"
								onClick={onReset}
								className="border-line bg-surface hover:border-accent/40 hover:text-accent-strong flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors"
							>
								<ArrowLeftIcon className="size-4" />
								Take notes on another sermon
							</button>
						</div>
					</nav>
				</>
			)}
		</div>
	)
}

function ToolbarButton({
	onClick,
	label,
	disabled,
	children,
}: {
	onClick: () => void
	label: string
	disabled?: boolean
	children: React.ReactNode
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="text-ink-muted hover:bg-paper-sunk hover:text-ink disabled:pointer-events-none disabled:opacity-40 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
		>
			{children}
			<span className="hidden sm:inline">{label}</span>
		</button>
	)
}

function Outline({
	items,
	activeId,
}: {
	items: NavItemType[]
	activeId: string | null
}) {
	return (
		<nav className="no-print hidden lg:block">
			<div className="sticky top-20">
				<Eyebrow>Outline</Eyebrow>

				<ul className="border-line mt-4 space-y-px border-l">
					{items.map(item => {
						const isActive = activeId === item.id

						return (
							<li key={item.id}>
								<a
									href={`#${item.id}`}
									onClick={event => {
										event.preventDefault()
										scrollToSection(item.id)
									}}
									className={`-ml-px block border-l-2 py-1.5 pl-3.5 text-[0.8125rem] leading-snug transition-colors ${
										isActive
											? 'border-accent text-ink font-medium'
											: 'text-ink-faint hover:text-ink-muted border-transparent'
									}`}
								>
									{item.label}
									{item.timestamp && (
										<span className="mt-0.5 block font-mono text-[0.6875rem] tabular-nums opacity-70">
											{formatTimestamp(item.timestamp)}
										</span>
									)}
								</a>
							</li>
						)
					})}
				</ul>
			</div>
		</nav>
	)
}

/**
 * Returns the reader to the top of the notes. Fixed rather than in the flow so
 * it stays reachable from anywhere on the page, on any screen size.
 */
function BackToTop() {
	const visible = useScrolledPast(BACK_TO_TOP_AFTER_PX)

	return (
		<button
			type="button"
			onClick={() => window.scrollTo({ top: 0, behavior: scrollBehavior() })}
			aria-label="Back to top"
			className={`no-print border-line bg-surface/90 text-ink-muted hover:border-accent/40 hover:text-accent-strong focus-visible:ring-accent/40 fixed right-5 bottom-5 z-30 inline-flex size-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none sm:right-8 sm:bottom-8 ${
				visible
					? 'translate-y-0 opacity-100'
					: 'pointer-events-none translate-y-2 opacity-0'
			}`}
		>
			<ArrowUpIcon className="size-5" />
		</button>
	)
}

/**
 * Smooth by default, instant for readers who have asked for reduced motion —
 * the stylesheet already makes that promise for CSS-driven scrolling, and an
 * explicit behaviour passed from script would otherwise override it.
 */
function scrollBehavior(): ScrollBehavior {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches
		? 'auto'
		: 'smooth'
}

/** `scroll-mt-24` on each target keeps the sticky bar clear of the heading. */
function scrollToSection(id: string) {
	document
		.getElementById(id)
		?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
}

function useScrolledPast(threshold: number) {
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

/** How close to the bottom still counts as "reading along with the writing". */
const FOLLOW_THRESHOLD_PX = 160

/**
 * Walks the page down as the notes are written, the way a terminal tails
 * output. Following stops the moment the reader scrolls up to re-read
 * something, and picks back up if they return to the bottom — so the page
 * never yanks itself out from under someone mid-sentence.
 */
function useFollowStream(active: boolean, notes: SermonNotesType) {
	const following = useRef(true)
	const selfY = useRef(0)
	const wasActive = useRef(false)

	useEffect(() => {
		if (!active) {
			return
		}

		following.current = true
		selfY.current = window.scrollY

		const onScroll = () => {
			// Compare against where *we* last parked the viewport rather than
			// against the distance to the bottom. Our own scrollTo fires this
			// handler asynchronously, and by the time it runs the next snapshot
			// has often already grown the page — measuring the gap to the bottom
			// there reads as "the reader scrolled up" and stops the follow for
			// good. Position never lies: growing content cannot move the viewport.
			if (Math.abs(window.scrollY - selfY.current) <= 1) {
				return
			}

			const fromBottom =
				document.documentElement.scrollHeight -
				(window.scrollY + window.innerHeight)

			following.current = fromBottom < FOLLOW_THRESHOLD_PX
		}

		window.addEventListener('scroll', onScroll, { passive: true })

		return () => window.removeEventListener('scroll', onScroll)
	}, [active])

	// Runs on every snapshot — `notes` is a fresh object each time one lands —
	// and once more as the stream ends, so the closing content is not left
	// sitting below the fold.
	useEffect(() => {
		const justFinished = wasActive.current && !active

		wasActive.current = active

		if ((!active && !justFinished) || !following.current) {
			return
		}

		window.scrollTo({ top: document.documentElement.scrollHeight })
		selfY.current = window.scrollY
	}, [active, notes])
}

/** Keeps word animations running briefly after the stream stops. */
function useSettling(streaming: boolean) {
	const [settling, setSettling] = useState(false)
	const wasStreaming = useRef(streaming)

	useEffect(() => {
		const justStopped = wasStreaming.current && !streaming

		wasStreaming.current = streaming

		if (!justStopped) {
			return
		}

		setSettling(true)

		const timer = setTimeout(() => setSettling(false), SETTLE_TAIL_MS)

		return () => clearTimeout(timer)
	}, [streaming])

	return streaming || settling
}

/**
 * The last passage that has any text — in document order, which is also the
 * order the model writes in, so this is wherever its pen currently is.
 */
function leadingEdge(notes: SermonNotesType): string | null {
	let key: string | null = null

	if (notes.title.trim()) {
		key = 'title'
	}

	if (notes.mainIdea.trim()) {
		key = 'mainIdea'
	}

	notes.sections.forEach((section, index) => {
		if (section.title.trim()) {
			key = `s${index}.title`
		}

		section.notes.forEach((note, noteIndex) => {
			if (note.trim()) {
				key = `s${index}.n${noteIndex}`
			}
		})

		if (section.application?.trim()) {
			key = `s${index}.app`
		}
	})

	notes.keyTakeaways.forEach((takeaway, index) => {
		if (takeaway.trim()) {
			key = `t${index}`
		}
	})

	notes.reflectionQuestions.forEach((question, index) => {
		if (question.trim()) {
			key = `q${index}`
		}
	})

	return key
}

/** Matches the placeholder treatment already used for the video preview. */
function SkeletonBar({ className = '' }: { className?: string }) {
	return (
		<span
			className={`bg-paper-sunk relative block overflow-hidden rounded ${className}`}
		>
			<span className="via-surface/70 absolute inset-0 animate-sweep bg-linear-to-r from-transparent to-transparent" />
		</span>
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
