'use client'

type Props = {
	label: string
	/** Away from the screen edge the control sits against. */
	placement?: 'top' | 'bottom' | 'left'
	/**
	 * Layout for the wrapper. Do not pass a display utility such as `hidden`
	 * here: it loses to the `inline-flex` below, because Tailwind emits
	 * `.hidden` before `.inline-flex` and the later rule wins no matter what
	 * order the class attribute is in. Hide a wrapper around this instead.
	 */
	className?: string
	children: React.ReactNode
}

/**
 * A tooltip that appears immediately and can be styled — neither of which the
 * native `title` attribute manages. Pointer devices only: on a touch screen it
 * would either never show or show stuck under a thumb, so the control's
 * `aria-label` carries the meaning there instead.
 */
export function Tooltip({
	label,
	placement = 'top',
	className = '',
	children,
}: Props) {
	return (
		<span className={`group/tip relative inline-flex ${className}`}>
			{children}

			<span
				role="tooltip"
				className={`bg-ink text-paper pointer-events-none absolute z-50 hidden rounded-md px-2 py-1 text-[0.6875rem] font-medium whitespace-nowrap opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 sm:block ${
					placement === 'left'
						? 'top-1/2 right-full mr-2 -translate-y-1/2'
						: placement === 'bottom'
							? 'top-full left-1/2 mt-2 -translate-x-1/2'
							: 'bottom-full left-1/2 mb-2 -translate-x-1/2'
				}`}
			>
				{label}
			</span>
		</span>
	)
}
