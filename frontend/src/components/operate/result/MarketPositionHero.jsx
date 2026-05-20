// Propul8 · OPERATE — Market Position HERO.
//
// The most important block on the result page. Replaces the older split
// (ResultHero + MainFinding + KeyCards + MarketPositionBar) with a single
// eye-catching unified hero that answers immediately:
//   • What asset is this?
//   • Where does it stand vs the market?
//   • What's the score, gap, and verdict?
//   • What's the next move?
//
// Layout: dramatic editorial spread — property image on the left, score +
// market-position bar + key facts on the right. One single calm narrative.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, X, TrendingUp, MapPin, Compass,
} from 'lucide-react';
import LocationScoreCard from '../../shared/LocationScoreCard';

const VERDICT_THEME = {
  Prime:        { color: '#B8956A', dot: '#B8956A', tint: 'rgba(184,149,106,0.12)', label: 'Prime' },
  Strong:       { color: '#B8956A', dot: '#B8956A', tint: 'rgba(184,149,106,0.08)', label: 'Strong' },
  Competitive:  { color: '#B8956A', dot: '#B8956A', tint: 'rgba(184,149,106,0.06)', label: 'Competitive' },
  Average:      { color: '#52525B', dot: '#52525B', tint: 'rgba(111,106,99,0.10)', label: 'Average' },
  'Below Market':         { color: '#52525B', dot: '#52525B', tint: 'rgba(111,106,99,0.10)', label: 'Below Market' },
  'Significantly Behind': { color: '#52525B', dot: '#52525B', tint: 'rgba(111,106,99,0.12)', label: 'Behind Market' },
};


export default function MarketPositionHero({ analysis, input, asset_id = 'demo' }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const mp = analysis.market_position || {};
  const snap = analysis.snapshot || {};
  const verdictKey = mp.current_label || 'Average';
  const verdict = VERDICT_THEME[verdictKey] || VERDICT_THEME.Average;
  const img = (input?.images && input.images[0]) || null;
  const sleeps = snap.capacity || (snap.bedrooms ? snap.bedrooms * 2 : null);

  const cur = mp.current ?? 0;
  const avg = mp.market_average ?? 72;
  const top = mp.top_listings ?? 86;
  const tgt = mp.target ?? cur;
  const gap = mp.gap ?? Math.max(0, tgt - cur);

  // Helpers
  const pos = (v) => `${Math.max(0, Math.min(100, v))}%`;

  return (
    <section
      className="relative"
      style={{ background: '#FAFAFA', borderBottom: '1px solid #E4E4E7' }}
      data-testid="operate-market-position-hero"
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-16 lg:py-20">

        {/* TOP ROW — kicker + property meta + back rail */}
        <div className="flex items-center justify-between gap-4 flex-wrap mb-10">
          <span
            className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
            style={{ color: '#B8956A' }}
          >
            Market Position · {snap.location || 'Athens'}
          </span>
          <div className="flex items-center gap-4 text-[12px]" style={{ color: '#52525B' }}>
            {snap.bedrooms && <span>{snap.bedrooms} BR</span>}
            {sleeps && <span>·</span>}
            {sleeps && <span>{sleeps} guests</span>}
            <span>·</span>
            <span>{input?.listing_source || 'Airbnb'}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">

          {/* LEFT — image + title */}
          <div className="lg:col-span-5">
            {img ? (
              <img
                src={img}
                alt={input?.title || 'Property'}
                className="w-full object-cover"
                style={{
                  aspectRatio: '4 / 5',
                  borderRadius: 4,
                  boxShadow: '0 1px 3px rgba(9,9,11,0.06)',
                }}
                data-testid="operate-hero-image"
              />
            ) : (
              <div
                className="w-full flex items-center justify-center text-[12px]"
                style={{
                  aspectRatio: '4 / 5',
                  background: '#E4E4E7',
                  color: '#52525B',
                  borderRadius: 4,
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Image unavailable
              </div>
            )}

            <h2
              className="mt-7 font-display leading-[1.05] tracking-tight"
              style={{
                color: '#09090B',
                fontSize: 'clamp(24px, 2.8vw, 34px)',
                letterSpacing: '-0.02em',
                fontWeight: 500,
              }}
              data-testid="operate-hero-title"
            >
              {input?.title || 'Imported listing'}
            </h2>
            <p className="mt-3 text-[13.5px]" style={{ color: '#52525B' }}>
              {snap.location}
            </p>
          </div>

          {/* RIGHT — Score · Verdict · Bar · CTAs */}
          <div className="lg:col-span-7 flex flex-col">

            {/* THE SCORE — large, calm, with verdict pill alongside */}
            <div className="flex items-end gap-5 flex-wrap">
              <div className="flex items-baseline gap-2">
                <span
                  className="font-display tabular-nums"
                  style={{
                    color: '#09090B',
                    fontSize: 'clamp(72px, 9vw, 132px)',
                    fontWeight: 500,
                    letterSpacing: '-0.035em',
                    lineHeight: 0.92,
                  }}
                  data-testid="operate-hero-score"
                >
                  {cur}
                </span>
                <span className="font-mono-tight text-[16px]" style={{ color: '#52525B' }}>
                  / 100
                </span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2"
                style={{
                  background: verdict.tint,
                  border: `1px solid ${verdict.color}30`,
                  borderRadius: 999,
                }}
                data-testid="operate-hero-verdict"
              >
                <span className="w-2 h-2 rounded-full" style={{ background: verdict.dot }} />
                <span className="font-mono-tight text-[11.5px] tracking-[0.18em] uppercase"
                  style={{ color: verdict.color, fontWeight: 600 }}>
                  {verdict.label}
                </span>
              </div>
            </div>

            {/* The narrative — calm one-sentence diagnosis */}
            <p
              className="mt-7 font-display leading-snug"
              style={{
                color: '#09090B',
                fontSize: 'clamp(18px, 2.0vw, 22px)',
                fontWeight: 400,
                letterSpacing: '-0.012em',
                maxWidth: 560,
              }}
              data-testid="operate-hero-finding"
            >
              {analysis.main_finding}
            </p>

            {/* THE BAR — editorial positioning line */}
            <div className="mt-12">
              <div className="flex items-end justify-between mb-4">
                {[
                  { pct: 0,   label: 'Below Market' },
                  { pct: 50,  label: 'Competitive' },
                  { pct: 100, label: 'Top Performer' },
                ].map((t) => (
                  <span
                    key={t.label}
                    className="font-mono-tight text-[9.5px] tracking-[0.18em] uppercase"
                    style={{ color: '#52525B' }}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
              <div className="relative" style={{ paddingTop: 28, paddingBottom: 56 }}>
                <div
                  className="absolute left-0 right-0"
                  style={{
                    top: 28,
                    height: 8,
                    background: 'linear-gradient(90deg, #E4E4E7 0%, #D4D4D8 50%, #C5BFB3 100%)',
                    borderRadius: 999,
                  }}
                />
                <Marker pos={pos(avg)} color="#52525B" labelTop="MARKET" labelBottom={`${avg}`} variant="light"  testId="operate-hero-marker-avg" />
                <Marker pos={pos(top)} color="#09090B" labelTop="TOP"    labelBottom={`${top}`} variant="light"  testId="operate-hero-marker-top" />
                <Marker pos={pos(tgt)} color="#B8956A" labelTop="TARGET" labelBottom={`${tgt}`} variant="target" testId="operate-hero-marker-target" />
                <Marker pos={pos(cur)} color="#09090B" labelTop="YOU"    labelBottom={`${cur}`} variant="current" testId="operate-hero-marker-current" />
              </div>
            </div>

            {/* CTAs + Gap-to-target — single row */}
            <div className="mt-2 flex items-center gap-5 flex-wrap">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} strokeWidth={1.7} style={{ color: '#B8956A' }} />
                <span
                  className="font-display tabular-nums"
                  style={{ color: '#B8956A', fontSize: 24, fontWeight: 500 }}
                  data-testid="operate-hero-gap"
                >
                  +{gap}
                </span>
                <span className="font-mono-tight text-[10px] tracking-[0.18em] uppercase" style={{ color: '#52525B' }}>
                  pts to target
                </span>
              </div>
              <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3 text-[13px] transition-all"
                style={{
                  background: '#B8956A',
                  color: '#FFFFFF',
                  borderRadius: 3,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  letterSpacing: '-0.005em',
                  boxShadow: '0 1px 2px rgba(184,149,106,0.10)',
                }}
                data-testid="operate-hero-close-gap-btn"
              >
                Close the Gap
                <ArrowRight size={13} />
              </button>
              <LocationScoreCard input={input} variant="pill" testId="operate-hero-location-pill" />
            </div>

            {/* Data quality footer */}
            <div className="mt-7 pt-5 border-t flex items-center gap-3 font-mono-tight text-[10px] tracking-[0.18em] uppercase"
              style={{ borderColor: '#E4E4E7', color: '#52525B' }}>
              <Compass size={11} strokeWidth={1.7} />
              <span>Data Quality · {mp.data_quality || 'Limited'}</span>
              {!mp.has_real_comparables && (
                <>
                  <span>·</span>
                  <span>Real comparables · not connected</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Close-the-Gap modal */}
      {open && (
        <CloseGapModal
          marketPosition={{ current: cur, target: tgt, gap, closes_gap: mp.closes_gap || [] }}
          onClose={() => setOpen(false)}
          onCTA={() => navigate(`/upgrade/${asset_id}/0`)}
        />
      )}
    </section>
  );
}


function Marker({ pos, color, labelTop, labelBottom, variant, testId }) {
  const dotSize = variant === 'current' || variant === 'target' ? 16 : 11;
  const isProminent = variant === 'current' || variant === 'target';
  return (
    <div
      className="absolute -translate-x-1/2 flex flex-col items-center"
      style={{ left: pos, top: 28 }}
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
          boxShadow: isProminent ? `0 3px 10px ${color}50` : 'none',
          marginTop: -3,
        }}
      />
      <div
        className="mt-2 font-display tabular-nums"
        style={{
          color,
          fontSize: isProminent ? 18 : 14,
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
            <h3 className="mt-3 font-display" style={{ color: '#09090B', fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em' }}>
              Move from {marketPosition.current} → {marketPosition.target}
            </h3>
          </div>
          <button onClick={onClose} className="p-2" style={{ color: '#52525B' }} data-testid="close-gap-modal-close">
            <X size={18} />
          </button>
        </div>

        <ul className="mt-6 space-y-4">
          {marketPosition.closes_gap.map((step, i) => (
            <li
              key={step.action}
              className="flex items-start gap-4 pb-4"
              style={{ borderBottom: i < marketPosition.closes_gap.length - 1 ? '1px solid #E4E4E7' : 'none' }}
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
                <div className="font-display text-[15px]" style={{ color: '#09090B', fontWeight: 500 }}>
                  {step.action}
                </div>
                <div className="mt-1 text-[12px] font-mono-tight" style={{ color: '#B8956A' }}>
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
          <span className="font-display tabular-nums" style={{ color: '#B8956A', fontSize: 20, fontWeight: 500 }}>
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
