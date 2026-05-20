// Propul8 — proprietary geometric logomark.
//
// Concept: four ascending bars rendered as a yield-curve / propulsion
// signature. Reads as both "growth chart" (the product's purpose) and
// the digit 8 (the brand) when viewed at small scale. Pure SVG so it
// scales crisply from 16 → 64 px and inverts cleanly for any surface.
//
// Usage:
//   <Logomark size={28} />                      // accent (electric blue)
//   <Logomark size={28} color="#FFFFFF" />      // override on dark surfaces
//   <Logomark size={28} variant="mono" />       // single-tone (no accent dot)

export function Logomark({
  size = 28,
  color = '#B8956A',
  dot = '#B8956A',
  variant = 'default',
  className,
  ...rest
}) {
  const showDot = variant !== 'mono';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Propul8"
      role="img"
      data-testid="propul8-logomark"
      {...rest}
    >
      {/* Four ascending bars — propulsion / yield curve */}
      <rect x="3"  y="20" width="4" height="9"  rx="1.2" fill={color} />
      <rect x="10" y="15" width="4" height="14" rx="1.2" fill={color} />
      <rect x="17" y="10" width="4" height="19" rx="1.2" fill={color} />
      <rect x="24" y="5"  width="4" height="24" rx="1.2" fill={color} />
      {/* Accent dot — the "trailing dot" in Propul8. */}
      {showDot && (
        <circle cx="26" cy="3.4" r="1.6" fill={dot} />
      )}
    </svg>
  );
}

// Convenience: the full lockup (mark + wordmark) for places where the
// brand needs more weight — landing hero, footer, OG preview cards, etc.
export function Wordmark({
  size = 22,
  color = '#09090B',
  dot = '#B8956A',
  className,
  ...rest
}) {
  const markSize = Math.round(size * 1.05);
  return (
    <span
      className={`inline-flex items-center gap-2 ${className || ''}`}
      data-testid="propul8-wordmark"
      {...rest}
    >
      <Logomark size={markSize} color={dot} dot={dot} />
      <span
        className="font-display tracking-tight"
        style={{
          color,
          fontSize: size,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        Propul8
        <span style={{ color: dot, fontWeight: 300 }}>.</span>
      </span>
    </span>
  );
}

export default Logomark;
