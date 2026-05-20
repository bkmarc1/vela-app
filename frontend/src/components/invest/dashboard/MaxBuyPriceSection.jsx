import { SectionHeader } from '../InvestPrimitives';
import { Section, fmtEUR } from './InvestChrome';

export default function MaxBuyPriceSection({ max_buy_price, input }) {
  return (
    <Section testId="invest-section-max-buy" dark>
      <SectionHeader
        kicker="Maximum Buy Price"
        title="What you can pay to hit your target return."
      />
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        {max_buy_price.map((m, i) => (
          <div
            key={i}
            className="inv-card inv-card--deep p-6"
            data-testid={`max-buy-tile-${m.target_yield_pct}`}
            style={{ borderLeft: '2px solid var(--inv-accent-bronze)' }}
          >
            <div className="inv-kicker">Target Yield</div>
            <div
              className="inv-num text-3xl font-medium mt-1"
              style={{ color: 'var(--inv-accent-bronze)' }}
            >
              {m.target_yield_pct}%
            </div>
            <div
              className="inv-divider my-4"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(196,167,137,0.18), transparent)',
              }}
            />
            <div className="inv-kicker">Max Acquisition Price</div>
            <div
              className="inv-num text-3xl md:text-[34px] font-medium mt-1"
              style={{ color: 'var(--inv-text-primary)' }}
            >
              {fmtEUR(m.max_price_eur)}
            </div>
            <div
              className="mt-2 text-[11px] font-mono-tight"
              style={{ color: m.max_price_eur < input.asking_price_eur ? 'var(--inv-signal-down)' : 'var(--inv-signal-up)' }}
            >
              {m.max_price_eur < input.asking_price_eur
                ? `Ask exceeds by €${(input.asking_price_eur - m.max_price_eur).toLocaleString()}`
                : `Headroom of €${(m.max_price_eur - input.asking_price_eur).toLocaleString()}`}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
