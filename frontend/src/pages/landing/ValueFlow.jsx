import { ArrowRight } from 'lucide-react';
import { BEFORE_IMG, AFTER_IMG } from './_shared';

// Propul8 Transformation™ — cinematic Current vs After comparison.
// Demonstrates the core platform philosophy: Propul8 reveals transformation
// upside, not just current value.

const CURRENT = [
  { label: 'ADR',         value: '€118' },
  { label: 'Occupancy',   value: '67%' },
  { label: 'Net Yield',   value: '6.9%' },
];
const CURRENT_QUAL = [
  'Weak positioning',
  'Outdated interiors',
  'Low pricing power',
];

const AFTER = [
  { label: 'Projected ADR',        value: '€184' },
  { label: 'Projected Occupancy',  value: '82%' },
  { label: 'Projected Net Yield',  value: '13.1%' },
];
const AFTER_QUAL = [
  'Luxury positioning',
  'Optimized design',
  'Higher pricing power',
];

export default function ValueFlow() {
  return (
    <section
      className="border-b relative overflow-hidden"
      style={{
        background: '#FAFAFA',
        color: '#FAFAFA',
        borderColor: 'rgba(196,167,137,0.08)',
      }}
      data-testid="landing-transformation"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-28 lg:py-36">
        {/* Section header */}
        <div className="mb-16 lg:mb-20 max-w-[860px]">
          <span
            className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
            style={{ color: '#B8956A' }}
          >
            Propul8 Transformation™
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-medium mt-5 leading-[1.04]">
            Most platforms analyze current value.<br />
            <span style={{ color: '#B8956A' }}>Propul8 reveals what the asset can become.</span>
          </h2>
        </div>

        {/* Current vs After split */}
        <div className="grid lg:grid-cols-2 gap-px" style={{ background: 'rgba(196,167,137,0.10)' }}>
          {/* CURRENT */}
          <div
            className="p-10 lg:p-14"
            style={{ background: '#FAFAFA' }}
            data-testid="transform-current"
          >
            <div className="flex items-baseline gap-3 mb-8">
              <span
                className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
                style={{ color: '#52525B' }}
              >
                Current State
              </span>
            </div>

            {/* Hero photo */}
            <div className="aspect-[16/10] mb-10 overflow-hidden" style={{ borderRadius: 12 }}>
              <img
                src={BEFORE_IMG}
                alt="Before"
                className="w-full h-full object-cover"
                style={{ filter: 'grayscale(0.55) brightness(0.78) contrast(0.95)' }}
              />
            </div>

            {/* Numbers */}
            <div className="grid grid-cols-3 gap-6 mb-10">
              {CURRENT.map((m) => (
                <div key={m.label}>
                  <div
                    className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase"
                    style={{ color: '#52525B' }}
                  >
                    {m.label}
                  </div>
                  <div
                    className="font-mono-tight font-medium mt-2"
                    style={{
                      fontSize: 'clamp(24px, 3.0vw, 36px)',
                      color: '#52525B',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {m.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Qualitative drag */}
            <ul className="space-y-2.5">
              {CURRENT_QUAL.map((q) => (
                <li
                  key={q}
                  className="flex items-baseline gap-3 text-[13.5px]"
                  style={{ color: '#52525B' }}
                >
                  <span className="w-1 h-1 mt-2" style={{ background: '#B8956A' }} />
                  {q}
                </li>
              ))}
            </ul>
          </div>

          {/* AFTER */}
          <div
            className="p-10 lg:p-14"
            style={{ background: '#FAFAFA' }}
            data-testid="transform-after"
          >
            <div className="flex items-baseline gap-3 mb-8">
              <span
                className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
                style={{ color: '#B8956A' }}
              >
                After Propul8 Transformation™
              </span>
            </div>

            <div className="aspect-[16/10] mb-10 overflow-hidden" style={{ borderRadius: 12 }}>
              <img
                src={AFTER_IMG}
                alt="After"
                className="w-full h-full object-cover"
                style={{ filter: 'saturate(1.06) brightness(1.02)' }}
              />
            </div>

            <div className="grid grid-cols-3 gap-6 mb-10">
              {AFTER.map((m) => (
                <div key={m.label}>
                  <div
                    className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase"
                    style={{ color: '#52525B' }}
                  >
                    {m.label}
                  </div>
                  <div
                    className="font-mono-tight font-medium mt-2"
                    style={{
                      fontSize: 'clamp(24px, 3.0vw, 36px)',
                      color: '#B8956A',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {m.value}
                  </div>
                </div>
              ))}
            </div>

            <ul className="space-y-2.5">
              {AFTER_QUAL.map((q) => (
                <li
                  key={q}
                  className="flex items-baseline gap-3 text-[13.5px]"
                  style={{ color: '#FAFAFA' }}
                >
                  <span className="w-1 h-1 mt-2" style={{ background: '#B8956A' }} />
                  {q}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Insight */}
        <p
          className="mt-12 max-w-[720px] text-[14px] leading-relaxed flex items-baseline gap-3"
          style={{ color: '#52525B' }}
          data-testid="landing-transformation-insight"
        >
          <ArrowRight size={13} style={{ color: '#B8956A' }} />
          Propul8 identified hidden hospitality upside through repositioning,
          redesign, and operational intelligence.
        </p>
      </div>
    </section>
  );
}
