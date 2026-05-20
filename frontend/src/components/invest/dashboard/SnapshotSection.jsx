import { ScoreTile, MetricTile, SectionHeader } from '../InvestPrimitives';
import { Section, fmtPct } from './InvestChrome';

export default function SnapshotSection({ snapshot }) {
  return (
    <Section testId="invest-section-snapshot">
      <SectionHeader
        kicker="Investment Snapshot"
        title="Nine institutional indicators."
      />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <ScoreTile label="STR Score"             value={snapshot.str_score}              testId="snap-str-score" />
        <ScoreTile label="Appreciation Potential" value={snapshot.appreciation_potential} testId="snap-appreciation" />
        <ScoreTile label="Occupancy Strength"    value={snapshot.occupancy_strength}     testId="snap-occupancy" />
        <ScoreTile label="Pricing Power"         value={snapshot.pricing_power}          testId="snap-pricing-power" />
        <ScoreTile label="Design Upside"         value={snapshot.design_upside}          testId="snap-design-upside" />
        <ScoreTile label="Liquidity Score"       value={snapshot.liquidity_score}        testId="snap-liquidity" />
        <ScoreTile
          label="Seasonality Risk"
          value={snapshot.seasonality_risk}
          accent={snapshot.seasonality_risk >= 60 ? 'down' : snapshot.seasonality_risk >= 35 ? 'neutral' : 'up'}
          testId="snap-seasonality"
        />
        <MetricTile
          label="Estimated Net Yield"
          value={fmtPct(snapshot.estimated_net_yield_pct).replace('%', '')}
          suffix="%"
          accent={snapshot.estimated_net_yield_pct >= 9 ? 'up' : 'bronze'}
          testId="snap-net-yield"
        />
        <MetricTile
          label="Cash-on-Cash Return"
          value={fmtPct(snapshot.cash_on_cash_pct).replace('%', '')}
          suffix="%"
          accent={snapshot.cash_on_cash_pct >= 10 ? 'up' : 'bronze'}
          testId="snap-cash-on-cash"
        />
      </div>
    </Section>
  );
}
