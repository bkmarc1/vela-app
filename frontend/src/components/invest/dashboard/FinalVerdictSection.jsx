import { useNavigate, useParams } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Section, fmtEUR } from './InvestChrome';

// Final Verdict — bottom-of-dashboard institutional summary + memo CTA.
// Mirrors the top Deal Verdict but adds risk flags + next-action triggers.

const VERDICT_COLOR = {
  BUY:       'var(--inv-signal-up)',
  NEGOTIATE: 'var(--inv-accent-bronze)',
  PASS:      'var(--inv-signal-down)',
};

export default function FinalVerdictSection({ verdict, analysis, input }) {
  const navigate = useNavigate();
  const { assetId } = useParams();
  const color = VERDICT_COLOR[verdict.verdict] || VERDICT_COLOR.NEGOTIATE;

  // Top 3 risk flags (highest severity first)
  const risks = [...(analysis.negotiation || [])]
    .sort((a, b) => {
      const order = { high: 3, medium: 2, low: 1 };
      return (order[b.severity] || 0) - (order[a.severity] || 0);
    })
    .slice(0, 3);

  return (
    <Section testId="invest-section-final-verdict" dark>
      <div className="grid lg:grid-cols-12 gap-12">
        {/* LEFT — recap */}
        <div className="lg:col-span-7">
          <span className="inv-kicker-bronze">Propul8 Final Verdict</span>
          <h2 className="inv-display text-3xl md:text-5xl font-medium mt-5 leading-[1.04]">
            <span style={{ color }}>{verdict.verdict}</span> at{' '}
            <span style={{ color: 'var(--inv-text-primary)' }}>
              {fmtEUR(verdict.target_offer_eur)}
            </span>.
          </h2>
          <p
            className="mt-6 max-w-[640px] text-[14px] leading-relaxed"
            style={{ color: 'var(--inv-text-secondary)' }}
          >
            {verdict.main_reason}
          </p>

          <div className="mt-10 grid grid-cols-3 gap-x-8">
            <FinalMetric label="Strategy"          value={verdict.strategy} />
            <FinalMetric label="Data Quality"       value={verdict.confidence_pct >= 80 ? 'Strong' : verdict.confidence_pct >= 55 ? 'Medium' : 'Limited'} />
            <FinalMetric label="Post-Propul8 Yield"   value={`${verdict.projected_post_vela_yield_pct.toFixed(1)}%`} accent />
          </div>

          <div className="mt-12 flex flex-wrap gap-3">
            <button
              onClick={() => navigate(`/invest/memo/${assetId}`, { state: { analysis, input } })}
              className="inv-btn"
              data-testid="final-verdict-memo-btn"
            >
              Generate AI Investment Memo™
              <ArrowUpRight size={13} />
            </button>
            <button
              onClick={() => navigate('/invest')}
              className="inv-btn-ghost"
              data-testid="final-verdict-new-btn"
            >
              Analyze another acquisition
            </button>
          </div>
        </div>

        {/* RIGHT — risk flags */}
        <div className="lg:col-span-5">
          <span className="inv-kicker">Top Risk Flags</span>
          <div className="mt-5 space-y-3">
            {risks.map((r, i) => {
              const sev = r.severity === 'high' ? 'var(--inv-signal-down)'
                        : r.severity === 'medium' ? 'var(--inv-accent-bronze)'
                        : 'var(--inv-text-secondary)';
              return (
                <div
                  key={i}
                  className="inv-card p-4"
                  style={{ borderLeft: `2px solid ${sev}` }}
                  data-testid={`final-risk-${i}`}
                >
                  <div
                    className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase"
                    style={{ color: sev }}
                  >
                    {(r.severity || 'low').toUpperCase()}
                  </div>
                  <div
                    className="font-display text-[13.5px] mt-1"
                    style={{ color: 'var(--inv-text-primary)' }}
                  >
                    {r.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}

function FinalMetric({ label, value, accent }) {
  return (
    <div>
      <div className="inv-kicker">{label}</div>
      <div
        className="inv-num font-medium mt-2"
        style={{
          fontSize: 'clamp(20px, 2.4vw, 28px)',
          color: accent ? 'var(--inv-signal-up)' : 'var(--inv-text-primary)',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
    </div>
  );
}
