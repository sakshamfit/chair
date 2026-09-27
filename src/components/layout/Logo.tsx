/** Wordmark: lowercase grotesk with a seat-like accent under the "e". */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`logo ${className}`}>
      chesselle<span className="logo__dot" aria-hidden="true" />
    </span>
  )
}
