type IconProps = {
	className?: string
}

/** Lamp flame — "Your word is a lamp to my feet." */
export function LampMark({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
			<path
				d="M12 2.5c2.8 3.1 4.2 5.4 4.2 7.4 0 1.6-.7 2.7-1.8 3.4.5-1.6.2-3-1-4.4-.5 1.9-1.5 2.7-2.6 3.7-1.3 1.2-2 2.3-2 3.6a4.2 4.2 0 0 0 8.4 0c0-.5 0-1-.2-1.4a6.9 6.9 0 0 1 2.2 5A7.2 7.2 0 1 1 5.4 14c0-3.6 2.2-7.4 6.6-11.5Z"
				fill="currentColor"
			/>
		</svg>
	)
}

export function CheckIcon({ className }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2.6}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<path d="m5 12.5 4.5 4.5L19 7" className="animate-draw [stroke-dasharray:24]" />
		</svg>
	)
}

export function ArrowRightIcon({ className }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<path d="M5 12h13m-5-6 6 6-6 6" />
		</svg>
	)
}

export function ArrowLeftIcon({ className }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<path d="M19 12H6m5 6-6-6 6-6" />
		</svg>
	)
}

export function PlayIcon({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
			<path d="M8 5.5v13l11-6.5-11-6.5Z" />
		</svg>
	)
}

export function YouTubeIcon({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
			<path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8A26 26 0 0 0 2 12c0 1.7.1 3.4.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.3-1.4.4-3.1.4-4.8s-.1-3.4-.4-4.8ZM10 15.1V8.9l5.2 3.1-5.2 3.1Z" />
		</svg>
	)
}

export function CopyIcon({ className }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.7}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<rect x="9" y="9" width="11" height="11" rx="2.5" />
			<path d="M15 5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15" />
		</svg>
	)
}

export function PrintIcon({ className }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.7}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<path d="M7 9V4h10v5" />
			<path d="M7 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
			<rect x="7" y="14" width="10" height="6" rx="1" />
		</svg>
	)
}

export function AlertIcon({ className }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.8}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7.5v5.5M12 16.4h.01" />
		</svg>
	)
}

export function CloseIcon({ className }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			className={className}
			aria-hidden
		>
			<path d="m6 6 12 12M18 6 6 18" />
		</svg>
	)
}
