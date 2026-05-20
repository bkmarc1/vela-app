import { ArrowRight, TrendingUp, RefreshCw, Hammer, XOctagon } from 'lucide-react';
import { opFmtEUR } from './OperatePrimitives';

// Propul8 OPERATE Optimization Verdict — single institutional answer.
// LIFT / REPRICE / REDESIGN / REPLACE — emerald execution palette.

const VERDICT_THEME = {
  LIFT:     { color: '#B8956A', icon: TrendingUp, label: 'LIFT',     bg: 'rgba(92,122,78,0.10)',  border: 'rgba(92,122,78,0.28)'  },
  REPRICE:  { color: '#B8956A', icon: RefreshCw,  label: 'REPRICE',  bg: 'rgba(184,149,106,0.10)', border: 'rgba(184,149,106,0.28)' },
  REDESIGN: { color: '#52525B', icon: Hammer,     label: 'REDESIGN', bg: 'rgba(155,107,64,0.10)', border: 'rgba(155,107,64,0.28)' },
  REPLACE:  { color: '#B8956A', icon: XOctagon,   label: 'REPLACE',  bg: 'rgba(160,82,74,0.10)',  border: 'rgba(160,82,74,0.28)'  },
};

const STRATEGY_NOTE = {
  LIFT:     'Listing rewrite + pricing curve · Week 1 wins',
  REPRICE:  'Dynamic pricing recalibration · No physical work',
  REDESIGN: 'Editorial FF&E + design refresh · Design arbitrage',
  REPLACE:  'Fundamentals too weak — reposition or divest',
};

export default function OperateVerdict({ verdict, monthly_uplift_eur }) {
  const theme = VERDICT_THEME[verdict.verdict] || VERDICT_THEME.LIFT;
  const Icon = theme.icon;

  return (
    <section
      className="border-b"
      style={{ borderColor: 'rgba(9,9,11,0.10)', background: theme.bg }}
      data-testid="operate-section-verdict"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12 lg:py-14">
        <div className="grid lg:grid-cols-12 gap-10 items-end">
          {/* Verdict block */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2 mb-4">
              <span
                className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
                style={{ color: '#B8956A' }}
              >
                Propul8 Optimization Verdict
              </span>
              <span
                className="font-mono-tight text-[9px] tracking-[0.18em] uppercase px-2 py-1"
                style={{
                  color: '#52525B',
                  border: '1px solid rgba(9,9,11,0.10)',
                  borderRadius: 1,
                }}
                data-testid="operate-verdict-confidence"
              >
                Data Quality · {verdict.confidence_pct >= 80 ? 'Strong' : verdict.confidence_pct >= 55 ? 'Medium' : 'Limited'}
              </span>
            </div>
            <div
              className="inline-flex items-center gap-3"
              style={{
                padding: '6px 18px 6px 14px',
                borderRadius: 4,
                background: theme.bg,
                border: `1px solid ${theme.border}`,
              }}
              data-testid="operate-verdict-badge"
            >
              <Icon size={20} strokeWidth={1.6} style={{ color: theme.color }} />
              <span
                className="font-display font-medium"
                style={{
                  color: theme.color,
                  fontSize: 'clamp(36px, 5vw, 64px)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                {theme.label}
              </span>
            </div>
            <p
              className="mt-6 text-[14px] leading-relaxed max-w-[460px]"
              style={{ color: '#52525B' }}
              data-testid="operate-verdict-reason"
            >
              {verdict.main_reason}
            </p>
          </div>

          {/* Annual Uplift */}
          <div className="lg:col-span-3">
            <div
              className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase"
              style={{ color: '#52525B' }}
            >
              Projected Annual Uplift
            </div>
            <div
              className="font-mono-tight font-medium mt-3"
              style={{
                fontSize: 'clamp(32px, 4vw, 52px)',
                color: '#09090B',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
              data-testid="operate-verdict-uplift"
            >
              +{opFmtEUR(verdict.projected_annual_uplift_eur)}
            </div>
            <div
              className="mt-3 text-[12px] font-mono-tight"
              style={{ color: '#B8956A' }}
            >
              after Propul8 optimization
            </div>
          </div>

          {/* Strategy */}
          <div className="lg:col-span-4">
            <div
              className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase"
              style={{ color: '#52525B' }}
            >
              Best Strategy
            </div>
            <div
              className="font-display font-medium mt-3"
              style={{
                fontSize: 'clamp(20px, 2.4vw, 30px)',
                color: '#B8956A',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
              data-testid="operate-verdict-strategy"
            >
              {verdict.strategy}
            </div>
            <p
              className="mt-3 text-[13px] leading-relaxed flex items-baseline gap-2"
              style={{ color: '#52525B' }}
            >
              <ArrowRight size={11} style={{ color: '#B8956A' }} />
              {STRATEGY_NOTE[verdict.verdict]}
            </p>
            <div
              className="mt-3 text-[11px] font-mono-tight"
              style={{ color: '#52525B' }}
            >
              Optimized monthly: <span style={{ color: '#B8956A' }}>{opFmtEUR(verdict.optimized_monthly_rev_eur)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
