'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { PIPELINE_STEPS } from '@/app/types'
import type { PipelineStepType, StepStateType, VideoMetaType } from '@/app/types'
import { formatSeconds } from '@/app/lib/youtube'
import { CheckIcon } from './icons'

export type StepStatusType = {
	state: StepStateType
	detail?: string
}

const LABELS: Record<PipelineStepType, Record<StepStateType, string>> = {
	sermon: {
		pending: 'Find the sermon',
		active: 'Finding the sermon',
		done: 'Sermon found',
	},
	transcript: {
		pending: 'Retrieve the transcript',
		active: 'Retrieving the transcript',
		done: 'Transcript retrieved',
	},
	understand: {
		pending: 'Understand the message',
		active: 'Understanding the message',
		done: 'Message understood',
	},
	organize: {
		pending: 'Organize your notes',
		active: 'Organizing your notes',
		done: 'Notes organized',
	},
}

type Props = {
	steps: Record<PipelineStepType, StepStatusType>
	meta: VideoMetaType | null
	onCancel: () => void
}

export function ProgressView({ steps, meta, onCancel }: Props) {
	const elapsed = useElapsedSeconds()

	return (
		<div className="mx-auto w-full max-w-xl px-6 pt-20 pb-24 sm:pt-28">
			<div className="animate-rise text-center">
				<h1 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">
					Preparing your sermon notes
				</h1>
				<p className="text-ink-muted mt-3 text-[0.9375rem]">
					This usually takes a minute or two for a full-length sermon. You can
					leave this open.
				</p>
			</div>

			<div className="animate-rise border-line bg-surface isolate mt-10 overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgb(26_24_21/0.04),0_12px_32px_-16px_rgb(26_24_21/0.14)] [animation-delay:80ms]">
				<div className="bg-paper-sunk relative h-0.5 overflow-hidden">
					<span className="via-accent absolute inset-y-0 w-1/3 animate-sweep bg-linear-to-r from-transparent to-transparent" />
				</div>

				{meta && (
					<div className="border-line flex items-center gap-3.5 border-b p-4">
						<div className="bg-paper-sunk relative aspect-video w-24 shrink-0 overflow-hidden rounded-md">
							{meta.thumbnail && (
								<Image
									src={meta.thumbnail}
									alt=""
									fill
									sizes="96px"
									className="object-cover"
									unoptimized
								/>
							)}
						</div>
						<div className="min-w-0">
							<p className="line-clamp-2 text-sm font-medium text-pretty">
								{meta.title}
							</p>
							{meta.author && (
								<p className="text-ink-faint mt-0.5 truncate text-xs">
									{meta.author}
								</p>
							)}
						</div>
					</div>
				)}

				<ol className="space-y-1 p-4">
					{PIPELINE_STEPS.map(step => (
						<StepRow
							key={step}
							label={LABELS[step][steps[step].state]}
							status={steps[step]}
						/>
					))}
				</ol>
			</div>

			<div className="mt-6 flex items-center justify-center gap-4">
				<span className="text-ink-faint font-mono text-xs tabular-nums">
					{formatSeconds(elapsed)} elapsed
				</span>
				<span className="bg-line-strong size-1 rounded-full" />
				<button
					type="button"
					onClick={onCancel}
					className="text-ink-faint hover:text-ink text-xs underline underline-offset-4 transition-colors"
				>
					Cancel
				</button>
			</div>
		</div>
	)
}

function StepRow({
	label,
	status,
}: {
	label: string
	status: StepStatusType
}) {
	const { state, detail } = status

	return (
		<li
			className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors duration-300 ${
				state === 'active' ? 'bg-accent-tint/60' : ''
			}`}
		>
			<span className="flex size-5 shrink-0 items-center justify-center pt-px">
				{state === 'done' ? (
					<CheckIcon className="text-accent-strong size-4" />
				) : state === 'active' ? (
					<span className="bg-accent size-2.5 animate-breathe rounded-full" />
				) : (
					<span className="border-line-strong size-2.5 rounded-full border" />
				)}
			</span>

			<span className="min-w-0 flex-1">
				<span
					className={`block text-[0.9375rem] transition-colors ${
						state === 'pending'
							? 'text-ink-faint'
							: state === 'active'
								? 'text-ink font-medium'
								: 'text-ink-muted'
					}`}
				>
					{label}
				</span>
				{detail && (
					<span className="text-ink-faint animate-fade mt-0.5 block font-mono text-[0.6875rem] tabular-nums">
						{detail}
					</span>
				)}
			</span>
		</li>
	)
}

function useElapsedSeconds() {
	const [seconds, setSeconds] = useState(0)

	useEffect(() => {
		const started = Date.now()
		const timer = setInterval(() => {
			setSeconds(Math.floor((Date.now() - started) / 1000))
		}, 1000)

		return () => clearInterval(timer)
	}, [])

	return seconds
}
