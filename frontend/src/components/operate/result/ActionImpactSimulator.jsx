// Propul8 · OPERATE — Action Impact Simulator.
//
// Interactive sliders that let an operator dial ADR + Occupancy targets
// and instantly see the resulting monthly + annual revenue delta vs the
// current baseline. Pure deterministic math — no LLM, no fake numbers.
//
// • Baseline: pulled from analysis.snapshot.current_adr_eur / current_occupancy_pct
//   (falls back to a synth baseline if user did not provide ADR/occupancy).
// • Sliders cap at ±35% on ADR and at 92% on occupancy (institutional ceilings).
// • Annual + monthly + per-night uplift shown in real-time.
// • "What to do to hit this" — derived from the analysis's top_3_fixes,
//   filtered to those that move ADR / occupancy.

import { useMemo, useState } from 'react';
import { TrendingUp, RotateCcw } from 'lucide-react';

const fmtEUR  = (v) => (v == null ? '—' : `€${Math.round(v).toLocaleString('en-US')}`);
const fmtSign = (v) => (v > 0 ? `+${Math.round(v).toLocaleString('en-US')}` : `${Math.round(v).toLocaleString('en-US')}`);

export default function ActionImpactSimulator({ analysis }) {
  const baseAdr = analysis.snapshot?.current_adr_eur ?? 168;
  const baseOcc = analysis.snapshot?.current_occupancy_pct ?? 64;

  const adrUpliftRecommended = Number.isFinite(analysis.snapshot?.adr_uplift_pct)
    ? analysis.snapshot.adr_uplift_pct : 18;
  const occUpliftRecommended = Number.isFinite(analysis.snapshot?.occ_uplift_pp)
    ? analysis.snapshot.occ_uplift_pp : 10;

  // Slider state — start at recommended targets so user immediately sees uplift
  const [adr, setAdr] = useState(() => Math.round(baseAdr * (1 + adrUpliftRecommended / 100)));
  const [occ, setOcc] = useState(() => Math.min(92, baseOcc + occUpliftRecommended));

  const reset = () => {
    setAdr(Math.round(baseAdr * (1 + adrUpliftRecommended / 100)));
    setOcc(Math.min(92, baseOcc + occUpliftRecommended));
  };

  const baselineNightly  = baseAdr;
  const baselineNights   = Math.round(365 * baseOcc / 100);
  const baselineAnnual   = Math.round(baseAdr * baselineNights);
  const baselineMonthly  = Math.round(baselineAnnual / 12);

  const simNights        = Math.round(365 * occ / 100);
  const simAnnual        = Math.round(adr * simNights);
  const simMonthly       = Math.round(simAnnual / 12);

  const deltaAnnual      = simAnnual  - baselineAnnual;
  const deltaMonthly     = simMonthly - baselineMonthly;
  const deltaPct         = baselineAnnual ? Math.round((deltaAnnual / baselineAnnual) * 100) : 0;

  // ADR slider bounds — ±35% of baseline (institutional sanity)
  const ADR_MIN = Math.round(baseAdr * 0.65);
  const ADR_MAX = Math.round(baseAdr * 1.35);
  // Occupancy bounds — 30%..92%
  const OCC_MIN = 30;
  const OCC_MAX = 92;

  // What gets you here — filter analysis.top_3_fixes by their action verb
  const moves = useMemo(() => {
    const fixes = analysis.top_3_fixes || [];
    const adrFixes = fixes.filter((f) => ['pricing', 'dynamic-pricing'].includes(f.id));
    const occFixes = fixes.filter((f) => ['photos', 'title', 'description', 'reshoot', 'amenities'].includes(f.id));
    return { adrFixes, occFixes };
  }, [analysis]);

  return (
    <section className="px-6 md:px-12 py-10" data-testid="operate-result-simulator">
      <div className="max-w-[1180px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#B8956A' }}>
              Action Impact Simulator
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
              Dial ADR and occupancy. See yield in real time.
            </h2>
          </div>
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[11.5px]"
            style={{
              background: 'transparent',
              color: '#B8956A',
              border: '1px solid #E4E4E7',
              borderRadius: 999,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
            }}
            data-testid="simulator-reset-btn"
          >
            <RotateCcw size={11} strokeWidth={1.8} />
            Reset to recommended
          </button>
        </div>

        <div
          className="p-7 lg:p-9 grid lg:grid-cols-12 gap-10"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E4E4E7',
            borderRadius: 4,
            boxShadow: '0 1px 2px rgba(9,9,11,0.04)',
          }}
        >
          {/* LEFT — sliders */}
          <div className="lg:col-span-7">
            <SliderRow
              testId="simulator-adr"
              label="Average Daily Rate (ADR)"
              unit="€"
              baseline={baselineNightly}
              value={adr}
              min={ADR_MIN}
              max={ADR_MAX}
              step={1}
              onChange={setAdr}
              hint={`Baseline ${fmtEUR(baseAdr)} · slider ${fmtEUR(ADR_MIN)} → ${fmtEUR(ADR_MAX)}`}
              fixes={moves.adrFixes}
              fixesLabel="ADR moves"
            />
            <div className="mt-8">
              <SliderRow
                testId="simulator-occ"
                label="Occupancy"
                unit="%"
                baseline={baseOcc}
                value={occ}
                min={OCC_MIN}
                max={OCC_MAX}
                step={1}
                onChange={setOcc}
                hint={`Baseline ${baseOcc}% · slider ${OCC_MIN}% → ${OCC_MAX}%`}
                fixes={moves.occFixes}
                fixesLabel="Occupancy moves"
              />
            </div>
          </div>

          {/* RIGHT — yield impact panel */}
          <div className="lg:col-span-5 flex flex-col" data-testid="simulator-output">
            <div
              className="p-7 flex-1"
              style={{
                background: '#FAFAFA',
                borderRadius: 4,
              }}
            >
              <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
                style={{ color: '#52525B' }}>
                Yield Impact
              </span>

              <div className="mt-6">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} strokeWidth={1.7} style={{ color: '#B8956A' }} />
                  <span className="font-mono-tight text-[10.5px] tracking-[0.18em] uppercase"
                    style={{ color: '#B8956A', fontWeight: 600 }}>
                    Annual Δ
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                  <span
                    className="font-display tabular-nums"
                    style={{
                      color: deltaAnnual >= 0 ? '#B8956A' : '#52525B',
                      fontSize: 'clamp(34px, 4vw, 48px)',
                      fontWeight: 500,
                      letterSpacing: '-0.025em',
                      lineHeight: 1,
                    }}
                    data-testid="simulator-annual-delta"
                  >
                    €{fmtSign(deltaAnnual)}
                  </span>
                  <span
                    className="font-mono-tight text-[11px]"
                    style={{ color: '#52525B' }}
                  >
                    {deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`}
                  </span>
                </div>
              </div>

              <hr style={{ borderColor: '#E4E4E7', margin: '24px 0' }} />

              <RowKV label="Monthly Δ"     value={`€${fmtSign(deltaMonthly)}`} accent={deltaMonthly >= 0} />
              <RowKV label="Sim · annual"  value={fmtEUR(simAnnual)} />
              <RowKV label="Baseline"      value={fmtEUR(baselineAnnual)} />
              <RowKV label="Sim · nights/yr" value={`${simNights}`} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


function SliderRow({ testId, label, unit, baseline, value, min, max, step, onChange, hint, fixes, fixesLabel }) {
  const pct = ((value - min) / (max - min)) * 100;
  const basePct = ((baseline - min) / (max - min)) * 100;
  return (
    <div data-testid={testId}>
      <div className="flex items-end justify-between mb-2 flex-wrap gap-2">
        <div>
          <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
            style={{ color: '#52525B' }}>
            {label}
          </span>
          <div className="mt-1 font-display tabular-nums" style={{ color: '#09090B', fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>
            {unit === '€' ? '€' : ''}{value}{unit === '%' ? '%' : ''}
          </div>
        </div>
        <span className="text-[11px] font-mono-tight" style={{ color: '#52525B' }}>
          {hint}
        </span>
      </div>

      <div className="relative" style={{ paddingTop: 8, paddingBottom: 8 }}>
        {/* track */}
        <div style={{ height: 6, background: '#FAFAFA', borderRadius: 999, position: 'relative' }}>
          {/* filled portion from min → value */}
          <div
            style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${pct}%`,
              background: '#B8956A',
              borderRadius: 999,
              transition: 'width 80ms linear',
            }}
          />
          {/* baseline marker */}
          <div
            style={{
              position: 'absolute',
              left: `${basePct}%`,
              top: -3,
              width: 2,
              height: 12,
              background: '#52525B',
              transform: 'translateX(-50%)',
            }}
            title={`Baseline ${baseline}${unit}`}
          />
        </div>
        {/* native range input layered on top */}
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ height: 22, top: 0 }}
          data-testid={`${testId}-input`}
        />
      </div>

      {fixes && fixes.length > 0 && (
        <div className="mt-3">
          <span className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase"
            style={{ color: '#B8956A' }}>
            {fixesLabel}
          </span>
          <ul className="mt-1.5 space-y-1 text-[12px]" style={{ color: '#09090B' }}>
            {fixes.slice(0, 2).map((f) => (
              <li key={f.id} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ background: '#B8956A' }} />
                <span>{f.action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


function RowKV({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-2 text-[12.5px]">
      <span style={{ color: '#52525B' }}>{label}</span>
      <span
        className="font-display tabular-nums"
        style={{
          color: accent === true ? '#B8956A' : (accent === false ? '#52525B' : '#09090B'),
          fontWeight: 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}
