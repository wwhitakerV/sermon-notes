'use client'

import Image from 'next/image'
import { useRef } from 'react'
import type { ErrorCodeType, VideoMetaType } from '@/app/types'
import { formatSeconds } from '@/app/lib/youtube'
import { AlertIcon, ArrowRightIcon, CloseIcon, YouTubeIcon } from './icons'
import { NotesPreview } from './notes-preview'

/**
 * Something to paste for the many people who agree with the headline and then
 * realise they do not have a sermon link to hand. Already in the cache, so it
 * comes back fast and costs nothing to serve.
 */
const SAMPLE_URL = 'https://www.youtube.com/watch?v=pgrbqckDpQg'

const URL_FIELD_ID = 'sermon-url'

const INCLUDES = [
	'Main idea',
	'Sermon outline',
	'Scriptures',
	'Practical applications',
	'Key takeaways',
	'Reflection Questions',
]

type Props = {
	url: string
	onUrlChange: (url: string) => void
	onSubmit: () => void
	onClear: () => void
	canSubmit: boolean
	meta: VideoMetaType | null
	metaLoading: boolean
	error: { code: ErrorCodeType; message: string } | null
}

export function TakeNotesForm({
	url,
	onUrlChange,
	onSubmit,
	onClear,
	canSubmit,
	meta,
	metaLoading,
	error,
}: Props) {
	const inputRef = useRef<HTMLInputElement>(null)

	function handleClear() {
		onClear()
		requestAnimationFrame(() => inputRef.current?.focus())
	}

	return (
		<div className="mx-auto w-full max-w-2xl px-6 pt-16 pb-24 sm:pt-24">
			<div className="animate-rise text-center">
				<h1 className="font-serif text-4xl leading-[1.08] font-medium tracking-tight text-balance sm:text-[3.25rem]">
					Turn any sermon into{' '}
					<span className="relative whitespace-nowrap">
						<span className="relative z-10">study notes</span>
						<span
							aria-hidden
							className="bg-accent/15 absolute inset-x-0 bottom-[0.1em] z-0 h-[0.38em] -skew-x-6 rounded-sm"
						/>
					</span>
					.
				</h1>

				<p className="text-ink-muted mx-auto mt-5 max-w-md text-[1.0625rem] leading-relaxed text-pretty">
					Paste a YouTube link and get notes you&rsquo;ll actually come back to.
					It takes less than 15 seconds per sermon.
				</p>
			</div>

			<form
				onSubmit={event => {
					event.preventDefault()
					onSubmit()
				}}
				className="animate-rise mt-10 [animation-delay:80ms]"
			>
				<div className="border-line bg-surface rounded-2xl border p-3 shadow-[0_1px_2px_rgb(26_24_21/0.04),0_12px_32px_-16px_rgb(26_24_21/0.14)]">
					{meta ? (
						<VideoPreview meta={meta} onClear={handleClear} />
					) : metaLoading ? (
						<PreviewSkeleton />
					) : (
						<div className="px-3 pt-3 pb-1">
							{/*
							 * The label and the sample button are siblings rather than
							 * nested: a label may not contain another interactive
							 * control, and clicking one inside it fires both.
							 */}
							<div className="flex items-center justify-between gap-3">
								<label
									htmlFor={URL_FIELD_ID}
									className="text-ink-faint text-[0.6875rem] font-medium tracking-[0.14em] uppercase"
								>
									Paste a YouTube sermon
								</label>

								<button
									type="button"
									onClick={() => onUrlChange(SAMPLE_URL)}
									className="text-accent-strong hover:text-accent text-[0.75rem] font-medium underline underline-offset-2 transition-colors"
								>
									or use an example
								</button>
							</div>

							<div className="mt-2 flex items-center gap-3">
								<YouTubeIcon className="text-ink-faint size-5 shrink-0" />
								<input
									id={URL_FIELD_ID}
									ref={inputRef}
									value={url}
									onChange={event => onUrlChange(event.target.value)}
									placeholder="https://youtube.com/watch?v=..."
									inputMode="url"
									autoComplete="off"
									spellCheck={false}
									autoFocus
									className="placeholder:text-ink-faint/70 w-full bg-transparent py-1 text-[0.9375rem] outline-none"
								/>
							</div>
						</div>
					)}

					<button
						type="submit"
						disabled={!canSubmit}
						className="bg-accent-strong shadow-accent/25 hover:bg-accent focus-visible:ring-accent/40 disabled:bg-paper-sunk disabled:text-ink-faint mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[0.9375rem] font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl focus-visible:ring-2 focus-visible:outline-none disabled:shadow-none"
					>
						Take Notes
						<ArrowRightIcon className="size-4" />
					</button>
				</div>
			</form>

			{error && (
				<p
					role="alert"
					className="text-accent-strong bg-accent-tint border-accent/20 animate-fade mt-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm"
				>
					<AlertIcon className="mt-px size-4 shrink-0" />
					{error.message}
				</p>
			)}

			{/*
			 * The offer, not the fine print. It used to be set at the same size and
			 * colour as the caveat below it, which made the best reason to try this
			 * look like a limitation.
			 */}
			<div className="mt-6 text-center">
				<p className="text-ink text-[1.0625rem] leading-snug font-medium text-balance">
					Your first sermon is free.
				</p>
				<p className="text-ink-muted mt-1.5 text-[0.8125rem] leading-relaxed text-balance">
					<span className="text-accent-strong font-medium">$1</span> each after
					— five for{' '}
					<span className="text-accent-strong font-medium">$5</span>. No
					subscription.
				</p>
			</div>

			<div className="animate-rise mt-16 [animation-delay:160ms]">
				<div className="flex items-center gap-4">
					<span className="text-ink-faint text-[0.6875rem] font-medium tracking-[0.14em] whitespace-nowrap uppercase">
						Your notes will include
					</span>
					<span className="bg-line h-px flex-1" />
				</div>

				<ul className="mt-4 flex flex-wrap gap-2">
					{INCLUDES.map(item => (
						<li
							key={item}
							className="border-line bg-surface/70 text-ink-muted rounded-full border px-3.5 py-1.5 text-[0.8125rem]"
						>
							{item}
						</li>
					))}
				</ul>

				{/* The chips say what is in the notes; this shows it. */}
				<div className="mt-6">
					<NotesPreview />
				</div>

				<p className="text-ink-faint mt-5 text-center text-[0.8125rem] leading-relaxed text-balance">
					Works best with sermons, Bible studies, and Christian teaching videos
					from 30 minutes to an hour or more.
				</p>
			</div>
		</div>
	)
}

function VideoPreview({
	meta,
	onClear,
}: {
	meta: VideoMetaType
	onClear: () => void
}) {
	return (
		<div className="animate-fade flex items-start gap-4 p-2">
			<div className="bg-paper-sunk relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg sm:w-40">
				{meta.thumbnail && (
					<Image
						src={meta.thumbnail}
						alt=""
						fill
						sizes="160px"
						className="object-cover"
						unoptimized
					/>
				)}
			</div>

			<div className="min-w-0 flex-1 pt-0.5">
				<p className="text-ink line-clamp-2 font-medium text-pretty">
					{meta.title}
				</p>
				{meta.author && (
					<p className="text-ink-muted mt-1 truncate text-sm">{meta.author}</p>
				)}
				<p className="text-ink-faint mt-1.5 font-mono text-xs tabular-nums">
					{meta.durationSeconds
						? formatSeconds(meta.durationSeconds)
						: 'YouTube'}
				</p>
			</div>

			<button
				type="button"
				onClick={onClear}
				title="Use a different link"
				className="text-ink-faint hover:bg-paper-sunk hover:text-ink -mt-0.5 -mr-0.5 shrink-0 rounded-lg p-1.5 transition-colors"
			>
				<CloseIcon className="size-4" />
				<span className="sr-only">Use a different link</span>
			</button>
		</div>
	)
}

function PreviewSkeleton() {
	return (
		<div className="flex items-start gap-4 p-2">
			<div className="bg-paper-sunk relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg sm:w-40">
				<span className="via-surface/70 absolute inset-0 animate-sweep bg-linear-to-r from-transparent to-transparent" />
			</div>
			<div className="flex-1 space-y-2.5 pt-1.5">
				<div className="bg-paper-sunk h-3.5 w-4/5 rounded" />
				<div className="bg-paper-sunk h-3 w-2/5 rounded" />
			</div>
		</div>
	)
}
