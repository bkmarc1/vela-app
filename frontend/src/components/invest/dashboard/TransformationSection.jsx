import { SectionHeader } from '../InvestPrimitives';
import { Section, fmtEUR, fmtPct } from './InvestChrome';

export default function TransformationSection({ transformation }) {
  return (
    <Section testId="invest-section-transformation" dark>
      <SectionHeader
        kicker="Transformation Upside"
        title="Same asset. Three operating realities."
        sub="What this listing earns today — and after Propul8 optimization."
      />

      <div
        className="inv-card inv-card--deep"
        style={{ borderColor: 'var(--inv-border-strong)' }}
        data-testid="transformation-table"
      >
        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>ADR</th>
              <th>Occupancy</th>
              <th>Net Yield</th>
              <th>Annual Revenue</th>
            </tr>
          </thead>
          <tbody>
            {transformation.scenarios.map((s, i) => {
              const annualRev = s.adr * Math.round(365 * s.occupancy_pct / 100);
              const isPremium = i === transformation.scenarios.length - 1;
              return (
                <tr
                  key={s.label}
                  style={{ background: isPremium ? 'rgba(125,191,143,0.06)' : 'transparent' }}
                  data-testid={`transformation-row-${i}`}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <span
                        className="w-1 h-6"
                        style={{ background: ['var(--inv-text-muted)', 'var(--inv-accent-bronze)', 'var(--inv-signal-up)'][i] }}
                      />
                      <span className="inv-display text-base">{s.label}</span>
                    </div>
                  </td>
                  <td><span className="inv-num text-base">€{s.adr}</span></td>
                  <td><span className="inv-num text-base">{s.occupancy_pct}%</span></td>
                  <td>
                    <span
                      className="inv-num text-base"
                      style={{ color: isPremium ? 'var(--inv-signal-up)' : 'var(--inv-text-primary)' }}
                    >
                      {fmtPct(s.net_yield_pct)}
                    </span>
                  </td>
                  <td>
                    <span
                      className="inv-num text-base"
                      style={{ color: isPremium ? 'var(--inv-signal-up)' : 'var(--inv-text-primary)' }}
                    >
                      {fmtEUR(annualRev)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="inv-card p-5" style={{ borderLeft: '2px solid var(--inv-text-muted)' }}>
          <div className="inv-kicker">Current State</div>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--inv-text-secondary)' }}>
            Asset operates at market median. ADR + occupancy lag the comp-set by a measurable margin.
          </p>
        </div>
        <div className="inv-card p-5" style={{ borderLeft: '2px solid var(--inv-signal-up)' }}>
          <div className="inv-kicker-bronze">After Propul8 Optimization</div>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--inv-text-secondary)' }}>
            Editorial interiors, premium positioning, listing rewrite, dynamic pricing — yields rebuilt from the ground up.
          </p>
        </div>
      </div>
    </Section>
  );
}
