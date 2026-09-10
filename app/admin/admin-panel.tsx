'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { CachedSermonType } from '@/app/lib/public-sermons'
import { AlertIcon, ArrowRightIcon, CheckIcon } from '@/app/components/icons'

export function AdminPanel({ sermons }: { sermons: CachedSermonType[] }) {
	const router = useRouter()
	const [url, setUrl] = useState('')
	const [slug, setSlug] = useState('')
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [done, setDone] = useState<{ slug: string; generated: boolean } | null>(
		null,
	)

	async function publish(event: React.FormEvent) {
		event.preventDefault()

		if (busy) {
			return
		}

		setBusy(true)
		setError(null)
		setDone(null)

		try {
			const response = await fetch('/api/admin/publish', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url, slug: slug || undefined }),
			})

			const body = await response.json().catch(() => null)

			if (!response.ok) {
				setError(body?.error ?? body?.message ?? 'That did not work.')

				return
			}

			setDone({ slug: body.slug, generated: body.generated })
			setUrl('')
			setSlug('')
			router.refresh()
		} catch {
			setError('Could not reach the server.')
		} finally {
			setBusy(false)
		}
	}

	async function unpublish(videoId: string) {
		await fetch('/api/admin/unpublish', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ videoId }),
		})

		router.refresh()
	}

	const published = sermons.filter(sermon => sermon.slug)
	const cached = sermons.filter(sermon => !sermon.slug)

	return (
		<div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
			<form
				onSubmit={publish}
				className="border-line bg-surface rounded-2xl border p-5 lg:sticky lg:top-20"
			>
				<h2 className="text-ink-faint text-[0.6875rem] font-medium tracking-[0.14em] uppercase">
					Publish a sermon
				</h2>
				<p className="text-ink-muted mt-1.5 text-[0.8125rem] text-pretty">
					Generates it if uncached, then puts it online free. No token spent.
				</p>

				<div className="mt-4 space-y-2.5">
					<Labelled label="YouTube URL">
						<input
							value={url}
							onChange={event => setUrl(event.target.value)}
							placeholder="https://youtube.com/watch?v=..."
							inputMode="url"
							autoComplete="off"
							spellCheck={false}
							required
							className="mt-1 w-full bg-transparent text-[0.9375rem] outline-none"
						/>
					</Labelled>

					<Labelled label="Address — taken from the title if blank">
						<input
							value={slug}
							onChange={event => setSlug(event.target.value)}
							placeholder="living-as-gods-people"
							autoComplete="off"
							spellCheck={false}
							className="mt-1 w-full bg-transparent font-mono text-[0.875rem] outline-none"
						/>
					</Labelled>
				</div>

				{error && (
					<p
						role="alert"
						className="text-accent-strong bg-accent-tint border-accent/20 mt-3 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm"
					>
						<AlertIcon className="mt-px size-4 shrink-0" />
						{error}
					</p>
				)}

				{done && (
					<p className="border-accent/25 bg-accent-tint mt-3 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm">
						<CheckIcon className="text-accent-strong mt-px size-4 shrink-0" />
						<span>
							{done.generated ? 'Generated and published' : 'Published'} at{' '}
							<Link
								href={`/${done.slug}`}
								className="text-accent-strong font-mono underline underline-offset-2"
							>
								/{done.slug}
							</Link>
						</span>
					</p>
				)}

				<button
					type="submit"
					disabled={busy}
					className="bg-accent-strong shadow-accent/25 hover:bg-accent disabled:bg-paper-sunk disabled:text-ink-faint mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[0.9375rem] font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:shadow-none"
				>
					{busy ? 'Working…' : 'Publish'}
					{!busy && <ArrowRightIcon className="size-4" />}
				</button>
			</form>

			<div className="space-y-8">
				<Section title={`Published (${published.length})`}>
					{published.length === 0 ? (
						<Empty>Nothing published yet.</Empty>
					) : (
						published.map(sermon => (
							<Row key={sermon.videoId} sermon={sermon}>
								<Link
									href={`/${sermon.slug}`}
									className="text-accent-strong font-mono text-[0.75rem] underline underline-offset-2"
								>
									/{sermon.slug}
								</Link>
								<button
									type="button"
									onClick={() => unpublish(sermon.videoId)}
									className="border-line text-ink-muted hover:border-accent/50 hover:text-accent-strong ml-auto shrink-0 rounded-lg border px-2.5 py-1 text-[0.75rem] transition-colors"
								>
									Unpublish
								</button>
							</Row>
						))
					)}
				</Section>

				<Section title={`Cached, not published (${cached.length})`}>
					{cached.length === 0 ? (
						<Empty>Everything cached is published.</Empty>
					) : (
						cached.map(sermon => (
							<Row key={sermon.videoId} sermon={sermon}>
								<span className="text-ink-faint font-mono text-[0.75rem]">
									{sermon.videoId}
								</span>
								<button
									type="button"
									onClick={() => {
										setUrl(`https://youtube.com/watch?v=${sermon.videoId}`)
										setSlug('')
										window.scrollTo({ top: 0 })
									}}
									className="border-line text-ink-muted hover:border-accent/50 hover:text-accent-strong ml-auto shrink-0 rounded-lg border px-2.5 py-1 text-[0.75rem] transition-colors"
								>
									Publish
								</button>
							</Row>
						))
					)}
				</Section>
			</div>
		</div>
	)
}

function Labelled({
	label,
	children,
}: {
	label: string
	children: React.ReactNode
}) {
	return (
		<label className="border-line bg-paper-sunk/40 focus-within:border-accent/40 block rounded-xl border px-3.5 py-2.5 transition-colors">
			<span className="text-ink-faint text-[0.6875rem] font-medium tracking-[0.14em] uppercase">
				{label}
			</span>
			{children}
		</label>
	)
}

function Section({
	title,
	children,
}: {
	title: string
	children: React.ReactNode
}) {
	return (
		<section>
			<div className="flex items-center gap-4">
				<span className="text-ink-faint text-[0.6875rem] font-medium tracking-[0.14em] whitespace-nowrap uppercase">
					{title}
				</span>
				<span className="bg-line h-px flex-1" />
			</div>
			<div className="mt-3 space-y-2">{children}</div>
		</section>
	)
}

function Row({
	sermon,
	children,
}: {
	sermon: CachedSermonType
	children: React.ReactNode
}) {
	return (
		<div className="border-line bg-surface rounded-xl border p-3.5">
			<p className="font-serif text-[0.9375rem] leading-snug font-medium text-pretty">
				{sermon.title}
			</p>
			{sermon.author && (
				<p className="text-ink-faint mt-0.5 text-[0.8125rem]">{sermon.author}</p>
			)}
			<div className="mt-2 flex items-center gap-3">{children}</div>
		</div>
	)
}

function Empty({ children }: { children: React.ReactNode }) {
	return (
		<p className="border-line text-ink-faint rounded-xl border border-dashed px-4 py-6 text-center text-[0.875rem]">
			{children}
		</p>
	)
}
