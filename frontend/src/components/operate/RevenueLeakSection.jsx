import {
  AlertTriangle, Camera, Sofa, Sun, Layers, Tag, Sparkles, ShieldCheck,
} from 'lucide-react';
import { opFmtEUR } from './OperatePrimitives';

// Propul8 OPERATE — Revenue Leak Detection™.
// Categorized leaks with severity bars + annual impact. The killer feature
// that makes the dashboard feel diagnostic, not informational.

const ICON_MAP = {
  'Visual Positioning':   Camera,
  'Furniture Density':    Sofa,
  'Lighting Quality':     Sun,
  'Listing Hierarchy':    Layers,
  'Pricing Structure':    Tag,
  'Hospitality Identity': Sparkles,
  'Trust Signals':        ShieldCheck,
};

const SEVERITY_THEME = {
  HIGH:   { color: '#B8956A', label: 'HIGH',   bar: '#B8956A' },
  MEDIUM: { color: '#B8956A', label: 'MEDIUM', bar: '#B8956A' },
  LOW:    { color: '#B8956A', label: 'LOW',    bar: '#B8956A' },
};

export default function RevenueLeakSection({ leaks, total_leak_eur, leakage_pct }) {
  return (
    <section
      className="border-b"
      style={{ borderColor: 'rgba(9,9,11,0.10)', background: '#FAFAFA', color: '#FAFAFA' }}
      data-testid="operate-section-revenue-leaks"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 lg:py-24">
        {/* Heading row */}
        <div className="grid lg:grid-cols-12 gap-12 items-end mb-14">
          <div className="lg:col-span-7">
            <span
              className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
              style={{ color: '#B8956A' }}
            >
              Revenue Leak Detection™
            </span>
            <h2
              className="font-display font-medium mt-4 leading-[1.04]"
              style={{
                color: '#FAFAFA',
                fontSize: 'clamp(28px, 3.6vw, 48px)',
                letterSpacing: '-0.015em',
                maxWidth: 760,
              }}
              data-testid="operate-leaks-heading"
            >
              Where this asset is bleeding revenue.
            </h2>
            <p
              className="mt-4 max-w-[560px] text-[14px] leading-relaxed"
              style={{ color: '#52525B' }}
            >
              Propul8 scans visual positioning, furniture density, listing hierarchy,
              pricing structure, and trust signals — every category quantified.
            </p>
          </div>
          <div className="lg:col-span-5 lg:text-right" data-testid="operate-leaks-total">
            <div
              className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
              style={{ color: '#52525B' }}
            >
              Total annual leakage
            </div>
            <div
              className="font-mono-tight font-medium mt-3 tabular-nums"
              style={{
                fontSize: 'clamp(40px, 5vw, 64px)',
                color: '#B8956A',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {opFmtEUR(total_leak_eur)}
              <span className="ml-3 text-[0.4em] font-mono-tight" style={{ color: '#52525B' }}>
                {leakage_pct}% of potential
              </span>
            </div>
          </div>
        </div>

        {/* Leak grid */}
        <div className="grid md:grid-cols-2 gap-px" style={{ background: 'rgba(196,167,137,0.08)' }}>
          {leaks.map((leak, i) => {
            const Icon = ICON_MAP[leak.category] || AlertTriangle;
            const theme = SEVERITY_THEME[leak.severity];
            return (
              <div
                key={leak.category}
                className="p-7 lg:p-9"
                style={{ background: '#FAFAFA' }}
                data-testid={`operate-leak-${i}`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 flex items-center justify-center"
                      style={{
                        border: `1px solid ${theme.color}55`,
                        borderRadius: 4,
                        background: `${theme.color}10`,
                      }}
                    >
                      <Icon size={16} strokeWidth={1.5} style={{ color: theme.color }} />
                    </div>
                    <div
                      className="font-display font-medium"
                      style={{ fontSize: 18, color: '#FAFAFA', letterSpacing: '-0.01em' }}
                      data-testid={`operate-leak-${i}-category`}
                    >
                      {leak.category}
                    </div>
                  </div>
                  <span
                    className="font-mono-tight text-[9px] tracking-[0.18em] uppercase px-2 py-1"
                    style={{
                      color: theme.color,
                      border: `1px solid ${theme.color}40`,
                      borderRadius: 1,
                    }}
                    data-testid={`operate-leak-${i}-severity`}
                  >
                    {theme.label}
                  </span>
                </div>

                <p
                  className="text-[13.5px] leading-relaxed mb-6"
                  style={{ color: '#52525B' }}
                  data-testid={`operate-leak-${i}-detail`}
                >
                  {leak.detail}
                </p>

                {/* Severity bar */}
                <div className="h-[2px] w-full overflow-hidden" style={{ background: 'rgba(196,167,137,0.10)' }}>
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: leak.severity === 'HIGH' ? '88%' : leak.severity === 'MEDIUM' ? '58%' : '28%',
                      background: theme.bar,
                    }}
                  />
                </div>

                <div className="flex items-baseline justify-between mt-5">
                  <span
                    className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase"
                    style={{ color: '#52525B' }}
                  >
                    Annual impact
                  </span>
                  <span
                    className="font-mono-tight font-medium tabular-nums"
                    style={{ fontSize: 16, color: theme.color, letterSpacing: '-0.01em' }}
                    data-testid={`operate-leak-${i}-impact`}
                  >
                    {opFmtEUR(leak.impact_eur_per_year)}/yr
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
