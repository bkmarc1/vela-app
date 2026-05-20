import { MetricTile, SectionHeader } from '../InvestPrimitives';
import { Section, fmtEUR, fmtPct } from './InvestChrome';

export default function ROISection({ true_roi, snapshot }) {
  return (
    <Section testId="invest-section-roi">
      <SectionHeader
        kicker="True ROI Engine"
        title="Honest cashflow."
        sub="Every line item that touches your annual return — modeled at default assumptions you can override."
      />

      <div className="grid md:grid-cols-3 gap-3 mb-8">
        <MetricTile label="Gross Revenue"
          value={fmtEUR(true_roi.gross_revenue_eur).replace('€', '')}
          prefix="€"
          sublabel={`ADR €${true_roi.adr_eur} · ${true_roi.occupancy_pct}% occupancy · STR comps · market estimate`}
          testId="roi-gross"
        />
        <MetricTile label="Total Expenses"
          value={fmtEUR(true_roi.total_expenses_eur).replace('€', '')}
          prefix="€"
          accent="down"
          sublabel="12 line items · default assumptions"
          testId="roi-expenses"
        />
        <MetricTile label="True Net Cashflow"
          value={fmtEUR(true_roi.net_cashflow_eur).replace('€', '')}
          prefix="€"
          accent={true_roi.net_cashflow_eur > 0 ? 'up' : 'down'}
          sublabel={`Net Yield ${fmtPct(snapshot.estimated_net_yield_pct)} · CoC ${fmtPct(snapshot.cash_on_cash_pct)} · modeled`}
          testId="roi-net"
        />
      </div>

      <div className="inv-card p-0 inv-card--elevated" data-testid="roi-waterfall-table">
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--inv-border)' }}
        >
          <span className="inv-kicker-bronze">Cashflow Waterfall · Annual €</span>
          <span className="inv-kicker">Investor defaults</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Line Item</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span className="inv-display text-base">Gross STR Revenue</span></td>
              <td style={{ textAlign: 'right' }}>
                <span className="inv-num font-medium" style={{ color: 'var(--inv-signal-up)' }}>
                  +{fmtEUR(true_roi.gross_revenue_eur)}
                </span>
              </td>
              <td>
                <span style={{ color: 'var(--inv-text-muted)' }}>
                  Inflow before expenses
                </span>
              </td>
            </tr>
            {true_roi.expenses.map((e, i) => (
              <tr key={i}>
                <td>{e.label}</td>
                <td style={{ textAlign: 'right' }}>
                  <span className="inv-num" style={{ color: 'var(--inv-signal-down)' }}>
                    –{fmtEUR(e.amount_eur)}
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--inv-text-muted)' }}>
                    {e.note || '—'}
                  </span>
                </td>
              </tr>
            ))}
            <tr style={{ background: 'rgba(196,167,137,0.06)' }}>
              <td>
                <span
                  className="inv-display text-base font-medium"
                  style={{ color: 'var(--inv-accent-bronze)' }}
                >
                  True Net Cashflow
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <span
                  className="inv-num text-lg font-medium"
                  style={{ color: 'var(--inv-accent-bronze)' }}
                >
                  {fmtEUR(true_roi.net_cashflow_eur)}
                </span>
              </td>
              <td>
                <span style={{ color: 'var(--inv-text-secondary)' }}>
                  after every line item
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Section>
  );
}
