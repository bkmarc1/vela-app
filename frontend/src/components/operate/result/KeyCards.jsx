// Propul8 · OPERATE — 5 Key Cards row.
// Propul8 Score · Revenue Gap · Main Issue · Market Support · Location.
// Missing values render honest "Needs data" label.

import LocationScoreCard from '../../shared/LocationScoreCard';

export default function KeyCards({ cards, input }) {
  const items = [
    {
      id: 'score',
      label: 'Propul8 Score',
      value: cards.propul8_score !== null && cards.propul8_score !== undefined
        ? `${cards.propul8_score}`
        : null,
      unit: cards.propul8_score !== null && cards.propul8_score !== undefined ? '/ 100' : null,
      empty: 'Pending',
    },
    {
      id: 'revenue-gap',
      label: 'Revenue Gap',
      value: cards.revenue_gap_monthly_eur !== null && cards.revenue_gap_monthly_eur !== undefined
        ? `€${cards.revenue_gap_monthly_eur.toLocaleString('en-US')}`
        : null,
      unit: cards.revenue_gap_monthly_eur !== null && cards.revenue_gap_monthly_eur !== undefined
        ? '/ month'
        : null,
      empty: 'Needs data',
    },
    {
      id: 'main-issue',
      label: 'Main Issue',
      value: cards.main_issue || null,
      unit: null,
      empty: 'Needs data',
    },
    {
      id: 'market-support',
      label: 'Market Support',
      value: cards.market_support || null,
      unit: null,
      empty: 'Needs data',
    },
  ];

  return (
    <section className="px-6 md:px-12 pb-6" data-testid="operate-result-keycards">
      <div className="max-w-[1180px] mx-auto grid grid-cols-2 lg:grid-cols-5 gap-4">
        {items.map((c) => (
          <div
            key={c.id}
            className="p-6 lg:p-7 transition-all"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: 4,
              boxShadow: '0 1px 2px rgba(9,9,11,0.03)',
            }}
            data-testid={`operate-keycard-${c.id}`}
          >
            <div
              className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
              style={{ color: '#52525B' }}
            >
              {c.label}
            </div>
            {c.value !== null ? (
              <div className="mt-3 flex items-baseline gap-2">
                <span
                  className="font-display tabular-nums"
                  style={{
                    color: '#09090B',
                    fontSize: 'clamp(24px, 2.6vw, 32px)',
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {c.value}
                </span>
                {c.unit && (
                  <span
                    className="font-mono-tight text-[11px]"
                    style={{ color: '#52525B' }}
                  >
                    {c.unit}
                  </span>
                )}
              </div>
            ) : (
              <div
                className="mt-3 font-display"
                style={{
                  color: '#52525B',
                  fontSize: 'clamp(20px, 2.2vw, 26px)',
                  fontWeight: 400,
                  letterSpacing: '-0.015em',
                }}
              >
                {c.empty}
              </div>
            )}
          </div>
        ))}
        {/* 5th card — Location (auto-fetched, click expands modal) */}
        <LocationScoreCard input={input} variant="card" testId="operate-keycard-location" />
      </div>
    </section>
  );
}
