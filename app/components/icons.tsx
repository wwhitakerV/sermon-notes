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

export function ArrowUpIcon({ className }: IconProps) {
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
			<path d="M12 19V6m-6 5 6-6 6 6" />
		</svg>
	)
}


export function LibraryIcon({ className }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
			<path d="M10 4h4.5A1.5 1.5 0 0 1 16 5.5v13a1.5 1.5 0 0 1-1.5 1.5H10z" />
			<path d="m17.5 5.9 1.9-.5a1 1 0 0 1 1.2.7l2.2 8.2" />
		</svg>
	)
}

export function TokenIcon({ className }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<circle cx="12" cy="12" r="8.25" />
			<path d="M12 7.5v9M14.4 9.6a2.6 2.6 0 0 0-2.4-1.2c-1.5 0-2.4.8-2.4 1.9 0 2.6 5 1.3 5 3.9 0 1.1-1 1.9-2.6 1.9a2.8 2.8 0 0 1-2.5-1.3" />
		</svg>
	)
}

export function SettingsIcon({ className }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<circle cx="12" cy="12" r="3" />
			<path d="M19.4 14.5a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.11a1.7 1.7 0 0 0-1.1-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.88 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.11a1.7 1.7 0 0 0 1.56-1.1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.88.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.11a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.88V9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.49 1z" />
		</svg>
	)
}

export function SignOutIcon({ className }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<path d="M9 21H5.5A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5.5 3H9" />
			<path d="m15.5 16.5 4.5-4.5-4.5-4.5M20 12H9" />
		</svg>
	)
}

export function CardIcon({ className }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<rect x="2.5" y="5" width="19" height="14" rx="2.5" />
			<path d="M2.5 10h19" />
		</svg>
	)
}

export function PlusIcon({ className }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<path d="M12 5v14M5 12h14" />
		</svg>
	)
}

export function ListIcon({ className }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
		</svg>
	)
}

export function StarIcon({ className, filled = false }: IconProps & { filled?: boolean }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill={filled ? 'currentColor' : 'none'}
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<path d="m12 3.5 2.6 5.4 5.9.85-4.25 4.15 1 5.9L12 17l-5.25 2.8 1-5.9L3.5 9.75l5.9-.85z" />
		</svg>
	)
}

export function ChatIcon({ className }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<path d="M20.5 11.5a7.5 7.5 0 0 1-10.9 6.7L4.5 19.5l1.3-4.6A7.5 7.5 0 1 1 20.5 11.5z" />
		</svg>
	)
}
