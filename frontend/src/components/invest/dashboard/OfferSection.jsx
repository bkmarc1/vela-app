import { SectionHeader } from '../InvestPrimitives';
import { Section, fmtEUR, fmtPct } from './InvestChrome';

export default function OfferSection({ offer_intelligence, input }) {
  return (
    <Section testId="invest-section-offer" dark>
      <SectionHeader
        kicker="Offer Intelligence™"
        title="Four institutional acquisition strategies."
        sub="Net yield + cash-on-cash for each tier. Spread = your negotiation envelope."
      />
      <div
        className="inv-card inv-card--deep"
        style={{ borderColor: 'var(--inv-border-strong)' }}
        data-testid="offer-strategy-table"
      >
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Offer Price</th>
              <th>Net Yield</th>
              <th>Cash-on-Cash</th>
              <th>vs Asking</th>
            </tr>
          </thead>
          <tbody>
            {offer_intelligence.strategies.map((s) => {
              const delta = s.price_eur - input.asking_price_eur;
              const isFair = s.label === 'Smart Buy';
              return (
                <tr
                  key={s.label}
                  style={{ background: isFair ? 'rgba(196,167,137,0.06)' : 'transparent' }}
                  data-testid={`offer-row-${s.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      {isFair && (
                        <span
                          className="inv-pill inv-pill--neutral"
                          style={{ padding: '2px 7px', fontSize: 8.5 }}
                        >
                          BEST
                        </span>
                      )}
                      <span
                        className="inv-display text-base"
                        style={{ color: 'var(--inv-text-primary)' }}
                      >
                        {s.label}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="inv-num text-xl font-medium">{fmtEUR(s.price_eur)}</span>
                  </td>
                  <td>
                    <span
                      className="inv-num text-base"
                      style={{ color: s.net_yield_pct >= 9 ? 'var(--inv-signal-up)' : 'var(--inv-text-primary)' }}
                    >
                      {fmtPct(s.net_yield_pct)}
                    </span>
                  </td>
                  <td>
                    <span
                      className="inv-num text-base"
                      style={{ color: s.cash_on_cash_pct >= 12 ? 'var(--inv-signal-up)' : 'var(--inv-text-primary)' }}
                    >
                      {fmtPct(s.cash_on_cash_pct)}
                    </span>
                  </td>
                  <td>
                    <span
                      className="inv-num text-sm"
                      style={{ color: delta < 0 ? 'var(--inv-signal-up)' : delta > 0 ? 'var(--inv-signal-down)' : 'var(--inv-text-secondary)' }}
                    >
                      {delta < 0 ? '–' : delta > 0 ? '+' : ''}
                      €{Math.abs(delta).toLocaleString('en-US')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-4">
        {offer_intelligence.ai_insights.map((insight, i) => (
          <div
            key={i}
            className="inv-card p-5"
            data-testid={`offer-insight-${i}`}
            style={{ borderLeft: '2px solid var(--inv-accent-bronze)' }}
          >
            <div className="inv-kicker-bronze">Insight {String(i + 1).padStart(2, '0')}</div>
            <p
              className="mt-2 text-sm leading-relaxed"
              style={{ color: 'var(--inv-text-secondary)' }}
            >
              {insight}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
