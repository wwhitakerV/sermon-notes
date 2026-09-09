'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SermonNotesType, VideoMetaType } from '@/app/types'
import {
	formatSeconds,
	formatTimestamp,
	posterUrl,
	thumbnailUrl,
	timestampLink,
	timestampToSeconds,
	watchUrl,
} from '@/app/lib/youtube'
import { dedupeBy, scriptureKey } from '@/app/lib/partial-notes'
import { PlayIcon, YouTubeIcon } from './icons'
import { NotesActions } from './notes-actions'
import { useVideoDialog } from './video-dialog'
import { useActiveSection } from './use-active-section'
import { useScrolledPast } from './use-scrolled-past'
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
	/** Start a new set of notes. The closing call to action. */
	onReset: () => void
	/** The model is still writing: the notes below are complete so far, not final. */
	streaming?: boolean
	/**
	 * Only the opening of the notes is here — the rest was never sent. The body
	 * fades out where it stops and `gate` is offered underneath it.
	 */
	preview?: boolean
	/** Rendered below the fade. The way past the cut. */
	gate?: React.ReactNode
}

export function NotesView({
	notes,
	meta,
	onReset,
	streaming = false,
	preview = false,
	gate,
}: Props) {
	const videoId = meta?.videoId ?? null
	const { openVideo } = useVideoDialog()

	// Words keep animating for a moment after the stream ends, so the final
	// burst finishes its entrance instead of snapping into place.
	const animating = useSettling(streaming)

	// The mask stays mounted for the length of the lift; removing it outright
	// would snap the fade away instead of drawing it back.
	const { clipped, lifting } = useClipLift(preview)

	// Only the passage the model is currently writing carries the caret.
	const caretKey = streaming ? leadingEdge(notes) : null
	const sectionIds = useMemo(
		() => notes.sections.map((_, index) => `section-${index + 1}`),
		[notes.sections],
	)

	// Repeats are dropped here rather than only on the way into the cache, so
	// notes written before this render correctly without being regenerated.
	const mainTexts = useMemo(
		() =>
			dedupeBy(notes.mainTexts, entry =>
				scriptureKey(entry.reference, entry.timestamp),
			),
		[notes.mainTexts],
	)

	const sections = useMemo(
		() =>
			notes.sections.map(section => ({
				...section,
				scriptures: dedupeBy(section.scriptures, scriptureKey),
			})),
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
	const scrolledPast = useScrolledPast(BACK_TO_TOP_AFTER_PX)

	return (
		<div className="animate-fade">
			<div className="mx-auto w-full max-w-5xl px-6 pb-28">
				<header className="pt-12 sm:pt-16">
					<div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
						<SermonPoster
							videoId={videoId}
							thumbnail={meta?.thumbnail ?? null}
							durationSeconds={meta?.durationSeconds ?? null}
							title={notes.title || meta?.title}
						/>

						<div className="min-w-0 flex-1">
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
								{meta?.url && videoId && (
									<>
										<Dot />
										<a
											href={meta.url}
											target="_blank"
											rel="noreferrer"
											onClick={event => {
												if (
													event.metaKey ||
													event.ctrlKey ||
													event.shiftKey ||
													event.altKey
												) {
													return
												}

												event.preventDefault()
												openVideo({
													videoId,
													seconds: null,
													title: notes.title || meta.title,
												})
											}}
											className="hover:text-accent-strong no-print inline-flex items-center gap-1.5 transition-colors"
										>
											<YouTubeIcon className="text-youtube size-4" />
											Watch the sermon
										</a>
									</>
								)}
							</div>
						</div>
					</div>

					{mainTexts.length > 0 && (
						<div className="mt-7">
							<Eyebrow>Main text</Eyebrow>
							<div className="mt-2.5 flex flex-wrap items-center gap-2">
								{mainTexts.map((text, index) => (
									<span
										key={`${text.reference}-${text.timestamp}-${index}`}
										className="border-accent/20 bg-accent-tint text-accent-strong inline-flex items-center gap-2 rounded-full border py-1 pr-1 pl-3.5"
									>
										<span className="font-serif text-[0.9375rem]">
											{text.reference}
										</span>
										{text.timestamp && (
											<TimestampPill
												timestamp={text.timestamp}
												videoId={videoId}
												title={notes.title || meta?.title}
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
						<div
							className={
								clipped
									? `notes-clip${lifting ? ' notes-clip-lifting' : ''}`
									: undefined
							}
						>
						<div>
							{sections.map((section, index) => (
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
												title={notes.title || meta?.title}
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
											{section.scriptures.map((scripture, index) => (
												<li
													key={`${scripture}-${index}`}
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
										<ScriptureRow
											key={`${entry.reference}-${entry.timestamp}-${index}`}
											entry={entry}
											videoId={videoId}
											title={notes.title || meta?.title}
										/>
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

						</div>

						{gate && <div className="animate-rise mt-10">{gate}</div>}

						{!streaming && !preview && (
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

			<NotesActions
				notes={notes}
				meta={meta}
				navItems={navItems}
				activeId={activeId}
				disabled={streaming}
				locked={preview}
				showBackToTop={scrolledPast}
			/>
		</div>
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

/**
 * The video still, beside the title on desktop and above it on mobile.
 *
 * It is a real link to YouTube so middle-click and keyboard both work, but a
 * plain click opens the inline player like every other video affordance here.
 * Decorative on paper, so it does not print.
 */
function SermonPoster({
	videoId,
	thumbnail,
	durationSeconds,
	title,
}: {
	videoId: string | null
	thumbnail: string | null
	durationSeconds: number | null
	title?: string | null
}) {
	const { openVideo } = useVideoDialog()

	/* maxres is missing on plenty of uploads; drop to the oEmbed still on 404. */
	const [maxResFailed, setMaxResFailed] = useState(false)

	if (!videoId) return null

	const fallback = thumbnail ?? thumbnailUrl(videoId)

	return (
		<a
			href={watchUrl(videoId)}
			target="_blank"
			rel="noreferrer"
			onClick={event => {
				if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
					return
				}

				event.preventDefault()
				openVideo({ videoId, seconds: null, title })
			}}
			className="group/poster border-line bg-paper-sunk no-print focus-visible:ring-accent/40 relative block aspect-video w-full shrink-0 overflow-hidden rounded-xl border shadow-[0_1px_3px_rgb(26_24_21/0.06)] transition-shadow duration-200 hover:shadow-[0_4px_16px_rgb(26_24_21/0.10)] focus-visible:ring-2 focus-visible:outline-none md:order-last md:w-72 lg:w-96"
		>
			<Image
				src={maxResFailed ? fallback : posterUrl(videoId)}
				alt=""
				fill
				sizes="(min-width: 1024px) 24rem, (min-width: 768px) 18rem, 100vw"
				className="object-cover transition-transform duration-500 group-hover/poster:scale-[1.03]"
				unoptimized
				onError={() => setMaxResFailed(true)}
			/>

			<span
				aria-hidden
				className="absolute inset-0 flex items-center justify-center"
			>
				<span className="bg-paper/55 group-hover/poster:bg-paper/80 flex size-9 items-center justify-center rounded-full backdrop-blur-[2px] transition-colors duration-200">
					<PlayIcon className="text-ink/60 group-hover/poster:text-ink ml-0.5 size-3.5 transition-colors duration-200" />
				</span>
			</span>

			{durationSeconds && (
				<span
					aria-hidden
					className="absolute right-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[0.6875rem] text-white tabular-nums"
				>
					{formatSeconds(durationSeconds)}
				</span>
			)}

			<span className="sr-only">Watch the sermon</span>
		</a>
	)
}

/**
 * One line of the Scripture index, clickable end to end.
 *
 * The whole row is the link — not just the timestamp — because the reference
 * and the moment it was read are the same thing to a reader, and a two-word
 * target at the far right of a wide row is a poor one.
 */
function ScriptureRow({
	entry,
	videoId,
	title,
}: {
	entry: SermonNotesType['scripturesReferenced'][number]
	videoId: string | null
	title?: string | null
}) {
	const { openVideo } = useVideoDialog()

	const href = timestampLink(videoId, entry.timestamp)

	const body = (
		<>
			<span className="font-serif text-[0.9375rem]">{entry.reference}</span>
			<span
				aria-hidden
				className="border-line-strong mt-2.5 flex-1 border-b border-dotted"
			/>
			{entry.timestamp && (
				<span className="text-ink-faint inline-flex shrink-0 items-center gap-1.5 font-mono text-xs tabular-nums">
					{/*
					 * Muted at rest. Every row here is clickable, so a red mark on
					 * each one distinguishes nothing and reads as texture; it earns
					 * its colour on the row you are actually pointing at.
					 */}
					<YouTubeIcon className="no-print group-hover/row:text-youtube size-4 shrink-0 transition-colors" />
					{formatTimestamp(entry.timestamp)}
				</span>
			)}
		</>
	)

	if (!href || !videoId) {
		return <li className="flex items-center gap-3 px-4 py-2.5">{body}</li>
	}

	return (
		<li>
			<a
				href={href}
				target="_blank"
				rel="noreferrer"
				onClick={event => {
					if (
						event.metaKey ||
						event.ctrlKey ||
						event.shiftKey ||
						event.altKey ||
						event.button !== 0
					) {
						return
					}

					event.preventDefault()
					openVideo({
						videoId,
						seconds: timestampToSeconds(entry.timestamp),
						title,
					})
				}}
				className="group/row hover:bg-accent-tint/40 focus-visible:ring-accent/40 flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:-outline-offset-2"
			>
				{body}
			</a>
		</li>
	)
}

/** How long the paywall fade takes to draw back. Matches the CSS transition. */
const CLIP_LIFT_MS = 460

/**
 * Holds the mask in place while it animates open, then takes it away. Without
 * the hold there is nothing left on the element for the transition to run on
 * and the fade vanishes in a frame.
 */
function useClipLift(preview: boolean) {
	const [lifting, setLifting] = useState(false)
	const wasPreview = useRef(preview)

	useEffect(() => {
		const justLifted = wasPreview.current && !preview

		wasPreview.current = preview

		if (!justLifted) {
			return
		}

		setLifting(true)

		const timer = setTimeout(() => setLifting(false), CLIP_LIFT_MS)

		return () => clearTimeout(timer)
	}, [preview])

	return { clipped: preview || lifting, lifting }
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

