'use client'

import Image from 'next/image'
import { useRef } from 'react'
import type { ErrorCodeType, VideoMetaType } from '@/app/types'
import { formatSeconds } from '@/app/lib/youtube'
import {
	AlertIcon,
	ArrowRightIcon,
	CloseIcon,
	YouTubeIcon,
} from './icons'

const INCLUDES = [
	'Main idea',
	'Sermon outline',
	'Scriptures',
	'Applications',
	'Key takeaways',
	'Timestamps',
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
		<div className="mx-auto w-full max-w-2xl px-6 pt-10 pb-24 sm:pt-16">
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

				<p className="text-ink-muted mx-auto mt-5 max-w-lg text-[1.0625rem] leading-relaxed text-pretty">
					Paste a YouTube sermon and get the main teaching, Scripture
					references, applications, and timestamps — organized so you can
					actually study it later.
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
						<label className="block px-3 pt-3 pb-1">
							<span className="text-ink-faint text-[0.6875rem] font-medium tracking-[0.14em] uppercase">
								Paste a YouTube sermon
							</span>
							<div className="mt-2 flex items-center gap-3">
								<YouTubeIcon className="text-ink-faint size-5 shrink-0" />
								<input
									ref={inputRef}
									value={url}
									onChange={event => onUrlChange(event.target.value)}
									placeholder="https://youtube.com/watch?v=..."
									inputMode="url"
									autoComplete="off"
									spellCheck={false}
									autoFocus
									aria-label="YouTube sermon URL"
									className="placeholder:text-ink-faint/70 w-full bg-transparent py-1 text-[0.9375rem] outline-none"
								/>
							</div>
						</label>
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

			<p className="text-ink-faint mt-5 text-center text-[0.8125rem] leading-relaxed text-balance">
				Works best with sermons, Bible studies, and Christian teaching videos
				from 30 minutes to an hour or more.
			</p>

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
