/**
 * The placeholder shape used by every route-level loading state.
 *
 * Same sweep the video preview uses, so a page arriving and a page still on its
 * way look like the same product.
 */
export function Shimmer({ className = '' }: { className?: string }) {
	return (
		<div className={`bg-paper-sunk relative overflow-hidden rounded ${className}`}>
			<span className="via-surface/70 absolute inset-0 animate-sweep bg-linear-to-r from-transparent to-transparent" />
		</div>
	)
}
