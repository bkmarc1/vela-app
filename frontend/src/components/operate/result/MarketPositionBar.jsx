// Propul8 · OPERATE — Market Position Bar.
// Innovative positioning visual showing where the listing sits vs
// competitors and the realistic target with "Close the Gap" CTA.
// Real comparables not connected yet — shows honest data quality.

import { useState } from 'react';
import { ArrowRight, X, TrendingUp } from 'lucide-react';

const TICKS = [
  { pct: 0,   label: 'Below Market' },
  { pct: 50,  label: 'Competitive' },
  { pct: 100, label: 'Top Performer' },
];

export default function MarketPositionBar({ market_position, onCloseTheGap }) {
  const [open, setOpen] = useState(false);

  if (!market_position || market_position.current === null) {
    return (
      <section className="px-6 md:px-12 py-10" data-testid="operate-result-market-position">
        <div className="max-w-[1180px] mx-auto">
          <Header />
          <div
            className="mt-6 p-8 text-center"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: 4,
              boxShadow: '0 1px 2px rgba(9,9,11,0.03)',
            }}
          >
            <div className="font-display text-[20px]" style={{ color: '#52525B' }}>
              Market Position · Needs data
            </div>
            <p className="mt-3 max-w-[440px] mx-auto text-[14px]" style={{ color: '#52525B' }}>
              Add current ADR + occupancy to position your listing against comparable properties.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const cur = market_position.current;
  const tgt = market_position.target;
  const avg = market_position.market_average;
  const top = market_position.top_listings;

  // Scale 0-100 maps directly to bar position percentage.
  const pos = (v) => `${Math.max(0, Math.min(100, v))}%`;

  return (
    <section className="px-6 md:px-12 py-10" data-testid="operate-result-market-position">
      <div className="max-w-[1180px] mx-auto">
        <Header />

        <div
          className="mt-6 p-7 lg:p-9"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E4E4E7',
            borderRadius: 4,
            boxShadow: '0 1px 2px rgba(9,9,11,0.03)',
          }}
        >
          {/* Tick labels above bar */}
          <div className="flex items-end justify-between mb-3">
            {TICKS.map((t) => (
              <div
                key={t.label}
                className="font-mono-tight text-[10px] tracking-[0.16em] uppercase"
                style={{ color: '#52525B' }}
              >
                {t.label}
              </div>
            ))}
          </div>

          {/* The Bar */}
          <div className="relative" style={{ paddingTop: 36, paddingBottom: 64 }}>
            <div
              className="absolute left-0 right-0"
              style={{
                top: 36,
                height: 6,
                background: 'linear-gradient(90deg, #E4E4E7 0%, #D4D4D8 50%, #C5BFB3 100%)',
                borderRadius: 999,
              }}
            />
            {/* Market Average marker */}
            <Marker
              pos={pos(avg)}
              top={36}
              color="#52525B"
              labelTop="Market"
              labelBottom={`${avg}`}
              testId="market-marker-average"
              variant="light"
            />
            {/* Top Listings marker */}
            <Marker
              pos={pos(top)}
              top={36}
              color="#52525B"
              labelTop="Top"
              labelBottom={`${top}`}
              testId="market-marker-top"
              variant="light"
            />
            {/* Target marker (olive, prominent) */}
            <Marker
              pos={pos(tgt)}
              top={36}
              color="#B8956A"
              labelTop="TARGET"
              labelBottom={`${tgt}`}
              testId="market-marker-target"
              variant="target"
            />
            {/* Your Listing marker (charcoal, prominent) */}
            <Marker
              pos={pos(cur)}
              top={36}
              color="#09090B"
              labelTop="YOU"
              labelBottom={`${cur}`}
              testId="market-marker-current"
              variant="current"
            />
          </div>

          {/* Stats + Message + CTA */}
          <div className="mt-2 grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7">
              <p
                className="text-[15px] leading-relaxed"
                style={{ color: '#09090B' }}
                data-testid="market-position-message"
              >
                {market_position.message}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-[12.5px] font-mono-tight" style={{ color: '#52525B' }}>
                <span>Data Quality · {market_position.data_quality}</span>
                {!market_position.has_real_comparables && (
                  <>
                    <span>·</span>
                    <span>Real comparables not connected yet</span>
                  </>
                )}
              </div>
            </div>
            <div className="lg:col-span-5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#52525B' }}>
                  Gap to Target
                </span>
                <span className="font-display tabular-nums" style={{ color: '#B8956A', fontSize: 22, fontWeight: 500 }}>
                  +{market_position.gap} <span className="text-[11px]" style={{ color: '#52525B' }}>pts</span>
                </span>
              </div>
              <button
                onClick={() => setOpen(true)}
                className="mt-3 inline-flex items-center justify-center gap-2 px-5 py-3.5 text-[13px] transition-all"
                style={{
                  background: '#B8956A',
                  color: '#FFFFFF',
                  borderRadius: 3,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  letterSpacing: '-0.005em',
                  boxShadow: '0 1px 2px rgba(184,149,106,0.10)',
                }}
                data-testid="market-position-close-gap-btn"
              >
                <TrendingUp size={14} strokeWidth={1.7} />
                Close the Gap
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {open && (
        <CloseGapModal
          marketPosition={market_position}
          onClose={() => setOpen(false)}
          onCTA={onCloseTheGap}
        />
      )}
    </section>
  );
}

function Header() {
  return (
    <div>
      <span
        className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
        style={{ color: '#B8956A' }}
      >
        Market Position
      </span>
      <h2
        className="mt-3 font-display"
        style={{
          color: '#09090B',
          fontSize: 'clamp(22px, 2.4vw, 30px)',
          fontWeight: 500,
          letterSpacing: '-0.02em',
        }}
      >
        Where your listing stands.
      </h2>
      <p className="mt-2 text-[14px]" style={{ color: '#52525B' }}>
        Your listing vs similar properties — and the realistic target you can hit.
      </p>
    </div>
  );
}

function Marker({ pos, top, color, labelTop, labelBottom, testId, variant }) {
  const dotSize = variant === 'current' || variant === 'target' ? 14 : 10;
  const isProminent = variant === 'current' || variant === 'target';
  return (
    <div
      className="absolute -translate-x-1/2 flex flex-col items-center"
      style={{ left: pos, top }}
      data-testid={testId}
    >
      <div
        className="font-mono-tight text-[9.5px] tracking-[0.18em] uppercase mb-1.5"
        style={{
          color,
          fontWeight: isProminent ? 600 : 500,
          opacity: isProminent ? 1 : 0.85,
        }}
      >
        {labelTop}
      </div>
      <div
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: 999,
          background: color,
          border: isProminent ? '3px solid #FFFFFF' : '2px solid #FFFFFF',
          boxShadow: isProminent ? `0 2px 8px ${color}40` : 'none',
          marginTop: -3,
        }}
      />
      <div
        className="mt-2 font-display tabular-nums text-[15px]"
        style={{
          color,
          fontWeight: isProminent ? 600 : 500,
        }}
      >
        {labelBottom}
      </div>
    </div>
  );
}

function CloseGapModal({ marketPosition, onClose, onCTA }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(9,9,11,0.42)' }}
      onClick={onClose}
      data-testid="close-gap-modal"
    >
      <div
        className="w-full max-w-[560px] p-8 lg:p-10"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E4E4E7',
          borderRadius: 4,
          boxShadow: '0 24px 70px rgba(9,9,11,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#B8956A' }}>
              Close the Gap
            </span>
            <h3 className="mt-3 font-display" style={{ color: '#09090B', fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em' }}>
              Move from {marketPosition.current} → {marketPosition.target}
            </h3>
          </div>
          <button
            onClick={onClose}
            data-testid="close-gap-modal-close"
            className="p-2"
            style={{ color: '#52525B' }}
          >
            <X size={18} />
          </button>
        </div>

        <ul className="mt-6 space-y-4">
          {marketPosition.closes_gap.map((step, i) => (
            <li
              key={step.action}
              className="flex items-start gap-4 pb-4"
              style={{ borderBottom: i < marketPosition.closes_gap.length - 1 ? '1px solid #E4E4E7' : 'none' }}
              data-testid={`close-gap-step-${i}`}
            >
              <div
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center font-mono-tight text-[11px]"
                style={{
                  background: 'rgba(184,149,106,0.08)',
                  color: '#B8956A',
                  borderRadius: 999,
                  fontWeight: 600,
                }}
              >
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="font-display text-[16px]" style={{ color: '#09090B', fontWeight: 500 }}>
                  {step.action}
                </div>
                <div className="mt-1 text-[12.5px] font-mono-tight" style={{ color: '#B8956A' }}>
                  Expected gain · +{step.expected_gain} pts
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-7 flex items-center justify-between p-4" style={{ background: '#FAFAFA', borderRadius: 14 }}>
          <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#52525B' }}>
            Total target gain
          </span>
          <span className="font-display tabular-nums" style={{ color: '#B8956A', fontSize: 22, fontWeight: 500 }}>
            +{marketPosition.gap} <span className="text-[11px]" style={{ color: '#52525B' }}>pts</span>
          </span>
        </div>

        <button
          onClick={() => { onClose(); onCTA && onCTA(); }}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-4 text-[14px] transition-all"
          style={{
            background: '#B8956A',
            color: '#FFFFFF',
            borderRadius: 3,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            letterSpacing: '-0.005em',
            boxShadow: '0 1px 2px rgba(184,149,106,0.10)',
          }}
          data-testid="close-gap-build-plan-btn"
        >
          Build Action Plan
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
