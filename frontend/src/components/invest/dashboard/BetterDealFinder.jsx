import { ArrowRight, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Propul8 INVEST — Better Deal Finder.
// Shown when verdict is PASS or WATCHLIST. Six guided alternative acquisition types.
// "Propul8 never just rejects — it always points to the better trade."

export default function BetterDealFinder({ alternatives, verdict }) {
  const navigate = useNavigate();
  if (!alternatives || !alternatives.length) return null;
  // Only show for non-PROCEED verdicts.
  if (verdict === 'PROCEED' || verdict === 'BUY') return null;

  return (
    <section
      className="border-b"
      style={{ borderColor: 'var(--inv-border)', background: 'var(--inv-bg-surface, #FAFAFA)' }}
      data-testid="invest-section-better-deals"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-14 lg:py-16">
        {/* Heading */}
        <div className="grid lg:grid-cols-12 gap-8 items-end mb-12">
          <div className="lg:col-span-7">
            <span className="inv-kicker-bronze">Better Deal Finder</span>
            <h2
              className="inv-display font-medium mt-3 leading-[1.04]"
              style={{
                fontSize: 'clamp(28px, 3.4vw, 44px)',
                color: 'var(--inv-text-primary)',
                letterSpacing: '-0.015em',
              }}
              data-testid="invest-better-deals-heading"
            >
              Where the trade actually clears.
            </h2>
            <p
              className="mt-4 max-w-[480px] text-[13.5px] leading-relaxed"
              style={{ color: 'var(--inv-text-secondary)' }}
            >
              Propul8 never just rejects an asset. Six alternative acquisition pathways
              with stronger institutional fundamentals.
            </p>
          </div>
          <div className="lg:col-span-5 lg:text-right">
            <button
              onClick={() => navigate('/invest')}
              className="inv-btn inline-flex items-center gap-2"
              data-testid="invest-better-deals-find-cta"
            >
              <Compass size={13} strokeWidth={1.6} />
              Find better deals like this
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* 6-card grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: 'var(--inv-border)' }}>
          {alternatives.map((alt, i) => (
            <div
              key={alt.id}
              className="p-7"
              style={{ background: 'var(--inv-bg-deep, #FAFAFA)' }}
              data-testid={`invest-better-deal-${alt.id}`}
            >
              <div className="flex items-baseline justify-between mb-3">
                <span
                  className="font-mono-tight text-[10px] tabular-nums tracking-[0.18em]"
                  style={{ color: 'var(--inv-accent-bronze)' }}
                >
                  ALT 0{i + 1}
                </span>
                <ArrowRight size={12} style={{ color: 'var(--inv-text-muted)' }} />
              </div>
              <div
                className="inv-display font-medium leading-[1.1] mb-3"
                style={{
                  fontSize: 16.5,
                  color: 'var(--inv-text-primary)',
                  letterSpacing: '-0.01em',
                }}
                data-testid={`invest-better-deal-${alt.id}-title`}
              >
                {alt.title}
              </div>
              <p
                className="text-[12.5px] leading-relaxed"
                style={{ color: 'var(--inv-text-secondary)' }}
                data-testid={`invest-better-deal-${alt.id}-detail`}
              >
                {alt.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
