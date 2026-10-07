// Typeform "pod" logo: a narrow pill next to a wide rounded block, optionally with the wordmark.
export function TypeformLogo({
  size = 24,
  className = "",
  wordmark = false,
}: {
  size?: number;
  className?: string;
  wordmark?: boolean;
}) {
  const w = (44 / 24) * size;
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="Typeform">
      <svg width={w} height={size} viewBox="0 0 44 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="12" height="24" rx="6" fill="currentColor" />
        <rect x="16" y="0" width="28" height="24" rx="9" fill="currentColor" />
      </svg>
      {wordmark && (
        <span
          className="font-medium tracking-tight"
          style={{ fontSize: size * 1.15, lineHeight: 1, letterSpacing: "-0.03em" }}
        >
          Typeform Builder
        </span>
      )}
    </span>
  );
}
