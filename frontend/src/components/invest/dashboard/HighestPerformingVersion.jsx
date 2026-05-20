import { ArrowRight, Sparkles } from 'lucide-react';
import { fmtEUR } from './InvestChrome';

// Propul8 INVEST — Highest Performing Version™.
// The emotional hook: Current State → After-Propul8 optimized state.
// Renders right after Deal Verdict, before sticky tabs.

export default function HighestPerformingVersion({ hpv }) {
  if (!hpv) return null;
  const { current, after_vela, annual_uplift_eur, transformation_label } = hpv;

  return (
    <section
      className="border-b"
      style={{
        background:
          'linear-gradient(180deg, rgba(196,167,137,0.05) 0%, rgba(10,8,7,0) 100%)',
        borderColor: 'var(--inv-border)',
      }}
      data-testid="invest-section-hpv"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-14 lg:py-16">
        {/* Heading */}
        <div className="mb-10">
          <span className="inv-kicker-bronze">Highest Performing Version™</span>
          <h2
            className="inv-display font-medium mt-3 leading-[1.04]"
            style={{
              fontSize: 'clamp(28px, 3.4vw, 44px)',
              color: 'var(--inv-text-primary)',
              letterSpacing: '-0.015em',
              maxWidth: 760,
            }}
            data-testid="invest-hpv-heading"
          >
            What this property is capable of becoming.
          </h2>
        </div>

        {/* Current → After grid */}
        <div className="grid lg:grid-cols-12 gap-px items-stretch" style={{ background: 'var(--inv-border)' }}>
          {/* CURRENT */}
          <div
            className="lg:col-span-5 p-8 lg:p-10"
            style={{ background: 'var(--inv-bg-deep, #FAFAFA)' }}
            data-testid="invest-hpv-current"
          >
            <div className="inv-kicker">Current State</div>
            <div
              className="inv-display font-medium mt-4 leading-[1.02]"
              style={{
                fontSize: 'clamp(28px, 3.4vw, 38px)',
                color: 'var(--inv-text-primary)',
                letterSpacing: '-0.015em',
              }}
              data-testid="invest-hpv-current-positioning"
            >
              {current.positioning}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6">
              <Stat label="ADR" value={`€${current.adr_eur}`} />
              <Stat label="Net Yield" value={`${current.net_yield_pct.toFixed(1)}%`} />
              <Stat label="Monthly Rev" value={fmtEUR(current.monthly_rev_eur)} />
              <Stat label="State" value={(current.state || 'refresh').toUpperCase()} small />
            </div>
          </div>

          {/* Arrow column (large screens only) */}
          <div
            className="hidden lg:flex lg:col-span-2 items-center justify-center"
            style={{ background: 'var(--inv-bg-deep, #FAFAFA)' }}
          >
            <div className="flex flex-col items-center gap-3">
              <Sparkles size={16} strokeWidth={1.4} style={{ color: 'var(--inv-accent-bronze)' }} />
              <ArrowRight size={28} strokeWidth={1.2} style={{ color: 'var(--inv-accent-bronze)' }} />
              <div
                className="font-mono-tight text-[9px] tracking-[0.22em] uppercase text-center max-w-[80px]"
                style={{ color: 'var(--inv-text-muted)' }}
              >
                {transformation_label}
              </div>
            </div>
          </div>

          {/* AFTER Propul8 */}
          <div
            className="lg:col-span-5 p-8 lg:p-10 relative"
            style={{
              background: 'rgba(196,167,137,0.06)',
              borderTop: '2px solid var(--inv-accent-bronze)',
            }}
            data-testid="invest-hpv-after"
          >
            <div className="flex items-baseline justify-between">
              <span className="inv-kicker-bronze">After Propul8 · Stabilized</span>
              <span
                className="font-mono-tight text-[9px] tracking-[0.18em] uppercase px-2 py-1"
                style={{
                  color: 'var(--inv-signal-up)',
                  border: '1px solid rgba(125,191,143,0.30)',
                  borderRadius: 1,
                }}
              >
                +{fmtEUR(annual_uplift_eur)}/yr
              </span>
            </div>
            <div
              className="inv-display font-medium mt-4 leading-[1.02]"
              style={{
                fontSize: 'clamp(28px, 3.4vw, 38px)',
                color: 'var(--inv-accent-bronze)',
                letterSpacing: '-0.015em',
              }}
              data-testid="invest-hpv-after-positioning"
            >
              {after_vela.positioning}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6">
              <Stat label="ADR" value={`€${after_vela.adr_eur}`} accent />
              <Stat label="Net Yield" value={`${after_vela.net_yield_pct.toFixed(1)}%`} accent />
              <Stat label="Monthly Rev" value={fmtEUR(after_vela.monthly_rev_eur)} accent />
              <Stat label="State" value="OPTIMIZED" small accent />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, accent, small }) {
  return (
    <div>
      <div className="inv-kicker">{label}</div>
      <div
        className="font-mono-tight font-medium mt-2 tabular-nums"
        style={{
          fontSize: small ? 14 : 'clamp(18px, 1.8vw, 22px)',
          color: accent ? 'var(--inv-signal-up)' : 'var(--inv-text-primary)',
          letterSpacing: '-0.015em',
          lineHeight: 1.05,
        }}
      >
        {value}
      </div>
    </div>
  );
}
