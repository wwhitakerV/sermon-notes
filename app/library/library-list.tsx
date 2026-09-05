'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { LibraryItemType } from '@/app/lib/notes-cache'
import { notesToText } from '@/app/lib/notes-text'
import { formatSeconds } from '@/app/lib/youtube'
import type { SermonNotesType, VideoMetaType } from '@/app/types'
import {
	ArrowRightIcon,
	CheckIcon,
	CopyIcon,
	LibraryIcon,
	PrintIcon,
} from '@/app/components/icons'
import { Tooltip } from '@/app/components/tooltip'

function savedLabel(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

export function LibraryList({ items }: { items: LibraryItemType[] }) {
	if (items.length === 0) {
		return (
			<div className="border-line bg-surface/60 rounded-2xl border border-dashed px-6 py-16 text-center">
				<span className="text-ink-faint mx-auto flex size-10 items-center justify-center">
					<LibraryIcon className="size-6" />
				</span>
				<p className="font-serif mt-3 text-lg font-medium">
					Nothing saved yet
				</p>
				<p className="text-ink-muted mx-auto mt-1.5 max-w-sm text-[0.9375rem] text-pretty">
					Every sermon you take notes on is kept here, so you can come back to
					it whenever you like.
				</p>
				<Link
					href="/"
					className="bg-accent-strong shadow-accent/25 hover:bg-accent mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl"
				>
					Take your first notes
					<ArrowRightIcon className="size-4" />
				</Link>
			</div>
		)
	}

	return (
		<ul>
			{items.map(item => (
				<LibraryRow key={item.videoId} item={item} />
			))}
		</ul>
	)
}

function LibraryRow({ item }: { item: LibraryItemType }) {
	const router = useRouter()
	const [copied, setCopied] = useState(false)
	const [busy, setBusy] = useState(false)

	async function handleCopy() {
		if (busy) {
			return
		}

		setBusy(true)

		try {
			// The notes are not in the listing — carrying every sermon's full text
			// just so a row can offer Copy would make this page enormous.
			const response = await fetch(`/api/notes/${item.videoId}`)

			if (!response.ok) {
				return
			}

			const body = (await response.json()) as {
				notes: SermonNotesType
				meta: VideoMetaType | null
			}

			await navigator.clipboard.writeText(notesToText(body.notes, body.meta))
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {
			setCopied(false)
		} finally {
			setBusy(false)
		}
	}

	return (
		<li className="group border-line relative border-b">
			<div className="group-hover:bg-paper-sunk/50 flex items-stretch gap-4 rounded-lg px-2 transition-colors">
				<div className="bg-paper-sunk relative my-3 aspect-video w-24 shrink-0 self-center overflow-hidden rounded-md sm:w-32">
					{item.thumbnail && (
						<Image
							src={item.thumbnail}
							alt=""
							fill
							sizes="128px"
							className="object-cover"
							unoptimized
						/>
					)}
				</div>

				<div className="flex min-w-0 flex-1 items-center gap-3 py-3">
					<div className="min-w-0 flex-1">
						{/* Stretched over the whole row, so anywhere but the buttons
						    opens the notes — and it stays a real link, which keeps
						    the keyboard and open-in-new-tab working. */}
						<Link
							href={`/notes/${item.videoId}`}
							className="font-serif group-hover:text-accent-strong line-clamp-2 text-[0.9375rem] leading-snug font-medium text-pretty transition-colors after:absolute after:inset-0"
						>
							{item.title}
						</Link>

						{item.author && (
							<p className="text-ink-muted mt-1 truncate text-[0.8125rem]">
								{item.author}
							</p>
						)}
						<p className="text-ink-faint mt-1.5 hidden truncate font-mono text-[0.6875rem] tabular-nums sm:block">
							{item.durationSeconds
								? `${formatSeconds(item.durationSeconds)} · `
								: ''}
							{savedLabel(item.savedAt)}
						</p>
					</div>

					<div className="relative z-10 hidden shrink-0 items-center gap-0.5 sm:flex">
						<RowButton
							label={copied ? 'Copied' : 'Copy notes'}
							onClick={handleCopy}
							disabled={busy}
						>
							{copied ? (
								<CheckIcon className="text-accent-strong size-4" />
							) : (
								<CopyIcon className="size-4" />
							)}
						</RowButton>

						{/* Printing needs the notes laid out, so it opens them and
						    prints from there. */}
						<RowButton
							label="Print notes"
							onClick={() => router.push(`/notes/${item.videoId}?print=1`)}
						>
							<PrintIcon className="size-4" />
						</RowButton>
					</div>
				</div>
			</div>
		</li>
	)
}

function RowButton({
	label,
	onClick,
	disabled = false,
	className = '',
	children,
}: {
	label: string
	onClick: () => void
	disabled?: boolean
	className?: string
	children: React.ReactNode
}) {
	return (
		<Tooltip label={label} className={className}>
			<button
				type="button"
				onClick={onClick}
				disabled={disabled}
				aria-label={label}
				className="border-line text-ink-faint hover:border-accent/50 hover:bg-surface hover:text-accent-strong focus-visible:ring-accent/40 inline-flex size-8 items-center justify-center rounded-lg border transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
			>
				{children}
			</button>
		</Tooltip>
	)
}
