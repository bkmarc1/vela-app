// Atomic visual primitives shared across Propul8 OPERATE pages.
// Distinct from INVEST: warm parchment surfaces, emerald execution accents.

export const opFmtEUR = (n) => `€${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

export function OperateSection({ children, dark, kicker, title, sub, testId }) {
  return (
    <section
      className="border-b"
      style={{
        borderColor: 'rgba(9,9,11,0.08)',
        background: dark ? '#FAFAFA' : 'transparent',
        color: dark ? '#FAFAFA' : 'inherit',
      }}
      data-testid={testId}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 lg:py-24">
        {(kicker || title) && (
          <div className="mb-12">
            {kicker && (
              <span
                className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
                style={{ color: dark ? '#52525B' : '#B8956A' }}
              >
                {kicker}
              </span>
            )}
            {title && (
              <h2
                className="font-display text-3xl md:text-4xl lg:text-5xl font-medium mt-4 leading-[1.04] max-w-[780px]"
                style={{ color: dark ? '#FAFAFA' : '#09090B' }}
              >
                {title}
              </h2>
            )}
            {sub && (
              <p
                className="mt-4 max-w-[640px] text-[14px] leading-relaxed"
                style={{ color: dark ? '#52525B' : '#52525B' }}
              >
                {sub}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export function OpMetric({ label, value, prefix, suffix, sub, accent, big, testId }) {
  const color = accent === 'up' ? '#B8956A'
              : accent === 'down' ? '#B8956A'
              : accent === 'bronze' ? '#B8956A'
              : '#09090B';
  return (
    <div data-testid={testId}>
      <div
        className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase"
        style={{ color: '#52525B' }}
      >
        {label}
      </div>
      <div
        className="font-mono-tight font-medium mt-2"
        style={{
          fontSize: big ? 'clamp(40px, 5.4vw, 72px)' : 'clamp(26px, 3vw, 38px)',
          color,
          letterSpacing: '-0.02em',
          lineHeight: 1.04,
        }}
      >
        {prefix}{value}
        {suffix && (
          <span className="text-[0.42em] ml-1" style={{ color: '#52525B', letterSpacing: 0 }}>
            {suffix}
          </span>
        )}
      </div>
      {sub && (
        <div className="mt-3 text-[11.5px] font-mono-tight" style={{ color: '#52525B' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function OpScoreBar({ label, value, testId }) {
  const color = value >= 75 ? '#B8956A' : value >= 55 ? '#B8956A' : '#B8956A';
  return (
    <div data-testid={testId}>
      <div className="flex items-baseline justify-between mb-2">
        <span
          className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase"
          style={{ color: '#52525B' }}
        >
          {label}
        </span>
        <span
          className="font-mono-tight text-[18px] font-medium"
          style={{ color, letterSpacing: '-0.02em' }}
        >
          {value}<span className="text-[10px] ml-1" style={{ color: '#52525B' }}>/100</span>
        </span>
      </div>
      <div className="h-[2px] w-full overflow-hidden" style={{ background: 'rgba(9,9,11,0.06)' }}>
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(2, value))}%`, background: color }}
        />
      </div>
    </div>
  );
}
