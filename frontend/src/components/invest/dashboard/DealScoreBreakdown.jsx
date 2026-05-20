// Propul8 INVEST — Deal Score™ 8-dimension breakdown.
// Institutional-grade scorecard rendered after the Deal Verdict.
// Each dimension shows score + 1-line note; bars use bronze→up gradient.

const _scoreTier = (s) => {
  if (s >= 80) return { color: 'var(--inv-signal-up)', label: 'STRONG' };
  if (s >= 65) return { color: 'var(--inv-accent-bronze)', label: 'MODERATE' };
  return { color: 'var(--inv-signal-down)', label: 'WEAK' };
};

export default function DealScoreBreakdown({ scores, composite }) {
  if (!scores || !scores.length) return null;

  return (
    <section
      className="border-b"
      style={{ borderColor: 'var(--inv-border)', background: 'var(--inv-bg-deep, #FAFAFA)' }}
      data-testid="invest-section-deal-score"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-14 lg:py-16">
        {/* Heading */}
        <div className="grid lg:grid-cols-12 gap-8 items-end mb-12">
          <div className="lg:col-span-7">
            <span className="inv-kicker-bronze">Propul8 Deal Score™</span>
            <h2
              className="inv-display font-medium mt-3 leading-[1.04]"
              style={{
                fontSize: 'clamp(28px, 3.4vw, 44px)',
                color: 'var(--inv-text-primary)',
                letterSpacing: '-0.015em',
              }}
              data-testid="invest-deal-score-heading"
            >
              Acquisition scorecard.
            </h2>
          </div>
          <div className="lg:col-span-5 lg:text-right" data-testid="invest-deal-score-composite">
            <div className="inv-kicker">Composite</div>
            <div
              className="inv-display font-medium mt-2 tabular-nums"
              style={{
                fontSize: 'clamp(40px, 5vw, 64px)',
                color: 'var(--inv-text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {composite}
              <span
                className="ml-2 font-mono-tight"
                style={{ fontSize: '0.40em', color: 'var(--inv-text-muted)' }}
              >
                / 100
              </span>
            </div>
          </div>
        </div>

        {/* 8 score grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: 'var(--inv-border)' }}>
          {scores.map((s) => {
            const tier = _scoreTier(s.score);
            return (
              <div
                key={s.id}
                className="p-6"
                style={{ background: 'var(--inv-bg-surface, #FAFAFA)' }}
                data-testid={`invest-score-${s.id}`}
              >
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <span className="inv-kicker">{s.label}</span>
                  <span
                    className="font-mono-tight text-[8.5px] tracking-[0.18em] uppercase"
                    style={{ color: tier.color }}
                  >
                    {tier.label}
                  </span>
                </div>
                <div
                  className="inv-display font-medium tabular-nums"
                  style={{
                    fontSize: 'clamp(28px, 3.2vw, 36px)',
                    color: tier.color,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  {s.score}
                  <span
                    className="ml-1.5 font-mono-tight"
                    style={{ fontSize: '0.40em', color: 'var(--inv-text-muted)' }}
                  >
                    /100
                  </span>
                </div>
                <div
                  className="mt-3 h-[2px] w-full overflow-hidden"
                  style={{ background: 'rgba(196,167,137,0.10)' }}
                >
                  <div
                    className="h-full transition-all duration-700"
                    style={{ width: `${s.score}%`, background: tier.color }}
                  />
                </div>
                <p
                  className="mt-3 text-[12px] font-mono-tight leading-snug"
                  style={{ color: 'var(--inv-text-muted)' }}
                >
                  {s.note}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
