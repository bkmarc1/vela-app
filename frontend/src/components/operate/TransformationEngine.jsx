import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { opFmtEUR } from './OperatePrimitives';
import { useNavigate } from 'react-router-dom';

// Propul8 OPERATE — AI Transformation Engine™.
// 5 hospitality design directions with deterministic ADR/cost/ROI projections.
// User selects → CTA routes into the visualize/upgrade flows.

export default function TransformationEngine({ styles, current_adr_eur }) {
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = useState(0);
  const active = styles[activeIdx];

  return (
    <section
      className="border-b"
      style={{ borderColor: 'rgba(9,9,11,0.10)', background: '#FFFFFF' }}
      data-testid="operate-section-transformation-engine"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 lg:py-24">
        {/* Heading */}
        <div className="grid lg:grid-cols-12 gap-12 items-end mb-12">
          <div className="lg:col-span-7">
            <span
              className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
              style={{ color: '#B8956A' }}
            >
              AI Transformation Engine™ · Digital Twin
            </span>
            <h2
              className="font-display font-medium mt-4 leading-[1.04]"
              style={{
                color: '#09090B',
                fontSize: 'clamp(28px, 3.6vw, 48px)',
                letterSpacing: '-0.015em',
                maxWidth: 760,
              }}
              data-testid="operate-transformation-heading"
            >
              The highest-performing version of this asset.
            </h2>
            <p
              className="mt-4 max-w-[560px] text-[14px] leading-relaxed"
              style={{ color: '#52525B' }}
            >
              Propul8 simulates 5 hospitality positioning directions. Each modeled with
              ADR uplift, renovation cost, payback period, and expected ROI.
            </p>
          </div>
        </div>

        {/* Style chooser */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-8" data-testid="operate-style-chooser">
          {styles.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setActiveIdx(i)}
              className="whitespace-nowrap px-4 py-2.5 text-[12px] font-medium tracking-[0.02em] transition-colors"
              style={{
                color: i === activeIdx ? '#09090B' : '#52525B',
                borderBottom: i === activeIdx ? '2px solid #B8956A' : '2px solid transparent',
                fontFamily: 'inherit',
              }}
              data-testid={`operate-style-tab-${i}`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Active style detail */}
        <div className="grid lg:grid-cols-12 gap-10">
          {/* LEFT — narrative */}
          <div className="lg:col-span-5">
            <div className="flex items-baseline justify-between mb-4">
              <h3
                className="font-display font-medium leading-[1.04]"
                style={{
                  color: '#09090B',
                  fontSize: 'clamp(28px, 3.2vw, 40px)',
                  letterSpacing: '-0.015em',
                }}
                data-testid="operate-style-active-name"
              >
                {active.name}
              </h3>
              <span
                className="font-mono-tight text-[9px] tracking-[0.18em] uppercase px-2 py-1"
                style={{
                  color: active.fit_score >= 85 ? '#B8956A' : '#B8956A',
                  border: active.fit_score >= 85
                    ? '1px solid rgba(92,122,78,0.30)'
                    : '1px solid rgba(184,149,106,0.30)',
                  borderRadius: 1,
                }}
                data-testid="operate-style-active-fit"
              >
                FIT {active.fit_score}
              </span>
            </div>
            <p
              className="text-[14.5px] leading-relaxed mb-10"
              style={{ color: '#52525B', maxWidth: 480 }}
              data-testid="operate-style-active-description"
            >
              {active.description}
            </p>

            <button
              onClick={() => navigate('/visualize/demo/0')}
              className="inline-flex items-center gap-2 px-5 py-3 text-[11px] tracking-[0.08em] transition-all"
              style={{
                background: '#B8956A',
                color: '#FAFAFA',
                borderRadius: 4,
                fontFamily: 'Inter, sans-serif',
                textTransform: 'uppercase',
              }}
              data-testid="operate-style-cta"
            >
              Visualize {active.name}
              <ArrowUpRight size={13} />
            </button>
          </div>

          {/* RIGHT — projections grid (Before → After) */}
          <div className="lg:col-span-7">
            <div
              className="grid grid-cols-2 gap-px"
              style={{ background: 'rgba(9,9,11,0.10)' }}
            >
              <Cell
                background="#FAFAFA"
                kicker="Current"
                value={`€${current_adr_eur}`}
                label="ADR"
                color="#52525B"
                testId="operate-style-current-adr"
              />
              <Cell
                background="#FAFAFA"
                kicker="Projected"
                value={`€${active.projected_adr_eur}`}
                label="ADR"
                color="#B8956A"
                accent
                bigDelta={`+${active.adr_uplift_pct}% uplift`}
                testId="operate-style-projected-adr"
              />
              <Cell
                background="#FAFAFA"
                kicker="Renovation"
                value={opFmtEUR(active.estimated_cost_eur)}
                label="estimated cost"
                color="#B8956A"
                testId="operate-style-cost"
              />
              <Cell
                background="#FAFAFA"
                kicker="Payback"
                value={`${active.payback_months}mo`}
                label="estimated"
                color="#09090B"
                testId="operate-style-payback"
              />
              <Cell
                background="#FAFAFA"
                kicker="Annual Uplift"
                value={`+${opFmtEUR(active.annual_uplift_eur)}`}
                label="post-Propul8"
                color="#B8956A"
                accent
                testId="operate-style-uplift"
              />
              <Cell
                background="#FAFAFA"
                kicker="Expected ROI"
                value={`${active.expected_roi_pct}%`}
                label={`+${active.occupancy_uplift_pp}pp occupancy`}
                color="#B8956A"
                accent
                testId="operate-style-roi"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Cell({ background, kicker, value, label, color, accent, bigDelta, testId }) {
  return (
    <div className="p-7 lg:p-9" style={{ background }} data-testid={testId}>
      <div
        className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase"
        style={{ color: '#52525B' }}
      >
        {kicker}
      </div>
      <div
        className="font-mono-tight font-medium mt-3 tabular-nums"
        style={{
          fontSize: 'clamp(26px, 3vw, 38px)',
          color,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        className="mt-2 text-[11px] font-mono-tight"
        style={{ color: '#52525B' }}
      >
        {label}
      </div>
      {bigDelta && accent && (
        <div
          className="mt-3 text-[11px] font-mono-tight"
          style={{ color: '#B8956A' }}
        >
          {bigDelta}
        </div>
      )}
    </div>
  );
}
