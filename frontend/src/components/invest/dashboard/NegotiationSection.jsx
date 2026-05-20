import { SectionHeader } from '../InvestPrimitives';
import { Section } from './InvestChrome';

export default function NegotiationSection({ negotiation }) {
  return (
    <Section testId="invest-section-negotiation">
      <SectionHeader
        kicker="Negotiation Insights"
        title="Liabilities → price-down levers."
        sub="Propul8 reads structural and design weaknesses, then translates them into negotiable basis points."
      />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {negotiation.map((n, i) => {
          const sevColor = n.severity === 'high' ? 'var(--inv-signal-down)'
                         : n.severity === 'medium' ? 'var(--inv-accent-bronze)'
                         : 'var(--inv-text-secondary)';
          return (
            <div
              key={i}
              className="inv-card p-5"
              style={{ borderLeft: `2px solid ${sevColor}` }}
              data-testid={`negotiation-card-${i}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inv-kicker" style={{ color: sevColor }}>
                  {(n.severity || 'low').toUpperCase()}
                </span>
              </div>
              <h4
                className="inv-display text-base font-medium mt-2 leading-snug"
                style={{ color: 'var(--inv-text-primary)' }}
              >
                {n.label}
              </h4>
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{ color: 'var(--inv-text-secondary)' }}
              >
                {n.detail}
              </p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
