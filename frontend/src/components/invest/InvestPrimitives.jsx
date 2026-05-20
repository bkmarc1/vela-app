// Atomic visual components used inside the Propul8 INVEST dashboard.

export function ScoreTile({ label, value, suffix = '/100', accent, testId }) {
  const v = Number(value || 0);
  // Determine accent: high = positive, mid = neutral, low = warn
  const auto = v >= 75 ? 'up' : v >= 50 ? 'neutral' : 'down';
  const a = accent || auto;
  const color = a === 'up' ? 'var(--inv-signal-up)' : a === 'down' ? 'var(--inv-signal-down)' : 'var(--inv-accent-bronze)';
  // Bar showing percentile-style fill
  return (
    <div className="inv-card p-5" data-testid={testId}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="inv-kicker">{label}</span>
        <span
          className="inv-num text-3xl font-medium"
          style={{ color }}
        >
          {v}
          <span
            className="text-sm ml-1"
            style={{ color: 'var(--inv-text-muted)' }}
          >
            {suffix}
          </span>
        </span>
      </div>
      <div
        className="mt-4 h-[2px] w-full overflow-hidden"
        style={{ background: 'rgba(196,167,137,0.08)' }}
      >
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${Math.min(100, Math.max(2, suffix.includes('%') ? v : v))}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

export function MetricTile({ label, value, suffix, prefix, accent, testId, sublabel }) {
  const color = accent === 'up' ? 'var(--inv-signal-up)'
              : accent === 'down' ? 'var(--inv-signal-down)'
              : accent === 'bronze' ? 'var(--inv-accent-bronze)'
              : 'var(--inv-text-primary)';
  return (
    <div className="inv-card p-5" data-testid={testId}>
      <div className="inv-kicker">{label}</div>
      <div
        className="inv-num text-3xl md:text-[34px] font-medium mt-2"
        style={{ color }}
      >
        {prefix}
        {value}
        {suffix && (
          <span
            className="text-sm ml-1"
            style={{ color: 'var(--inv-text-muted)' }}
          >
            {suffix}
          </span>
        )}
      </div>
      {sublabel && (
        <div
          className="mt-2 text-[11px] font-mono-tight"
          style={{ color: 'var(--inv-text-muted)' }}
        >
          {sublabel}
        </div>
      )}
    </div>
  );
}

export function SignalChip({ label, level, testId }) {
  const map = {
    HIGH:     { bg: 'rgba(125,191,143,0.10)', color: 'var(--inv-signal-up)',     border: 'rgba(125,191,143,0.25)' },
    MODERATE: { bg: 'rgba(196,167,137,0.10)', color: 'var(--inv-accent-bronze)', border: 'rgba(196,167,137,0.25)' },
    LOW:      { bg: 'rgba(110,100,87,0.10)',  color: 'var(--inv-text-secondary)', border: 'rgba(110,100,87,0.25)' },
    YES:      { bg: 'rgba(125,191,143,0.10)', color: 'var(--inv-signal-up)',     border: 'rgba(125,191,143,0.25)' },
    NO:       { bg: 'rgba(201,122,106,0.10)', color: 'var(--inv-signal-down)',   border: 'rgba(201,122,106,0.25)' },
  };
  const s = map[level] || map.MODERATE;
  return (
    <div
      className="inv-card p-5 transition-all"
      data-testid={testId}
      style={{ borderColor: s.border, background: s.bg }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[12.5px] font-medium leading-tight max-w-[80%]"
          style={{ color: 'var(--inv-text-primary)' }}
        >
          {label}
        </span>
        <span
          className="inv-num text-[10px] tracking-[0.18em] uppercase"
          style={{ color: s.color }}
        >
          {level}
        </span>
      </div>
    </div>
  );
}

export function SectionHeader({ kicker, title, sub, testId }) {
  return (
    <div className="mb-8" data-testid={testId}>
      <div className="inv-kicker-bronze">{kicker}</div>
      <h2 className="inv-display text-3xl md:text-4xl font-medium mt-3 leading-[1.05]">
        {title}
      </h2>
      {sub && (
        <p
          className="mt-3 max-w-[680px] text-sm leading-relaxed"
          style={{ color: 'var(--inv-text-secondary)' }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
