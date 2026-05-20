import { SignalChip, SectionHeader } from '../InvestPrimitives';
import { Section } from './InvestChrome';

export default function MarketSignalsSection({ market_signals }) {
  return (
    <Section testId="invest-section-signals" dark>
      <SectionHeader
        kicker="Market Signals"
        title="District-level intelligence."
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {market_signals.map((s, i) => (
          <SignalChip
            key={s.label}
            label={s.label}
            level={s.level}
            testId={`signal-chip-${i}`}
          />
        ))}
      </div>
    </Section>
  );
}
