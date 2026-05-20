import { useEffect, useState } from 'react';
import {
  Coins, Palette, FileText, MapPin, ShieldCheck, Zap, ArrowRight,
} from 'lucide-react';

// Propul8 Landing — Asset Command Score preview.
// The core intelligence layer surfaced on the landing as a teaser.
// Score animates 0 → target on mount. 6 dimensions + decision verdict.

const DIMENSIONS = [
  { id: 'revenue',     label: 'Revenue Potential',  score: 78, icon: Coins },
  { id: 'design',      label: 'Design Performance', score: 72, icon: Palette },
  { id: 'listing',     label: 'Listing Quality',    score: 64, icon: FileText },
  { id: 'market',      label: 'Market Fit',         score: 82, icon: MapPin },
  { id: 'acquisition', label: 'Acquisition Safety', score: 70, icon: ShieldCheck },
  { id: 'execution',   label: 'Execution Readiness', score: 76, icon: Zap },
];

const COMPOSITE = 72;

const READOUT = [
  { id: 'leak',     kicker: 'What is leaking',         value: 'Listing photos · pricing curve' },
  { id: 'fix',      kicker: 'Fix first',               value: 'Reshoot hero · install editorial FF&E' },
  { id: 'uplift',   kicker: 'Expected uplift',         value: '+€18,400 / yr' },
  { id: 'cost',     kicker: 'Estimated cost',          value: '€14,000' },
  { id: 'payback',  kicker: 'Payback period',          value: '9 months' },
];

const _tier = (s) => {
  if (s >= 78) return { color: '#B8956A', label: 'STRONG' };
  if (s >= 65) return { color: '#B8956A', label: 'MODERATE' };
  return { color: '#B8956A', label: 'WEAK' };
};

export default function ScorePreview() {
  const [shownScore, setShownScore] = useState(0);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const dur = 1100;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setShownScore(Math.round(COMPOSITE * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section
      className="py-28 lg:py-36 px-6 md:px-12"
      style={{ background: '#FAFAFA', color: '#FAFAFA' }}
      data-testid="landing-score-preview"
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Heading */}
        <div className="text-center mb-20">
          <span
            className="font-mono-tight text-[10px] tracking-[0.32em] uppercase"
            style={{ color: '#B8956A' }}
          >
            The Core Intelligence
          </span>
          <h2
            className="font-display font-medium mt-5 leading-[1.02]"
            style={{
              fontSize: 'clamp(28px, 3.6vw, 46px)',
              color: '#FAFAFA',
              letterSpacing: '-0.02em',
            }}
            data-testid="landing-score-heading"
          >
            Propul8 Asset Command Score™
          </h2>
          <p
            className="mt-5 max-w-[480px] mx-auto text-[14.5px] leading-relaxed"
            style={{ color: '#52525B' }}
          >
            One score. Six dimensions. The decision behind every property.
          </p>
        </div>

        {/* Score display + dimensions */}
        <div className="grid lg:grid-cols-12 gap-px" style={{ background: 'rgba(196,167,137,0.10)' }}>
          {/* Composite score */}
          <div
            className="lg:col-span-5 p-10 lg:p-14 flex flex-col justify-between"
            style={{
              background: '#FAFAFA',
              minHeight: 420,
            }}
            data-testid="landing-score-composite"
          >
            <div>
              <span
                className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
                style={{ color: '#52525B' }}
              >
                Propul8 Score
              </span>
              <div
                className="font-display font-medium mt-6 tabular-nums leading-[0.92]"
                style={{
                  fontSize: 'clamp(80px, 10vw, 130px)',
                  color: '#FAFAFA',
                  letterSpacing: '-0.04em',
                }}
                data-testid="landing-score-value"
              >
                {shownScore}
                <span
                  className="font-mono-tight"
                  style={{
                    fontSize: 'clamp(16px, 1.8vw, 22px)',
                    color: '#52525B',
                    marginLeft: 12,
                    letterSpacing: 0,
                  }}
                >
                  / 100
                </span>
              </div>
              <div
                className="mt-6 inline-flex items-center gap-2.5 px-3 py-1.5"
                style={{
                  background: 'rgba(196,167,137,0.08)',
                  border: '1px solid rgba(196,167,137,0.30)',
                  borderRadius: 4,
                }}
                data-testid="landing-score-decision"
              >
                <span
                  className="font-mono-tight text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: '#B8956A' }}
                >
                  Decision · Upgrade
                </span>
              </div>
            </div>

            {/* Readout */}
            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5" data-testid="landing-score-readout">
              {READOUT.map((r) => (
                <div key={r.id} data-testid={`landing-score-readout-${r.id}`}>
                  <div
                    className="font-mono-tight text-[9px] tracking-[0.22em] uppercase"
                    style={{ color: '#52525B' }}
                  >
                    {r.kicker}
                  </div>
                  <div
                    className="mt-1.5 text-[13.5px]"
                    style={{ color: '#FAFAFA' }}
                  >
                    {r.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6 dimensions */}
          <div className="lg:col-span-7 grid grid-cols-2 gap-px" style={{ background: 'rgba(196,167,137,0.10)' }}>
            {DIMENSIONS.map((d) => {
              const Icon = d.icon;
              const tier = _tier(d.score);
              return (
                <div
                  key={d.id}
                  className="p-7"
                  style={{ background: '#FAFAFA' }}
                  data-testid={`landing-score-dim-${d.id}`}
                >
                  <div className="flex items-center justify-between mb-5">
                    <Icon size={15} strokeWidth={1.5} style={{ color: '#B8956A' }} />
                    <span
                      className="font-mono-tight text-[9px] tracking-[0.16em] uppercase"
                      style={{ color: tier.color }}
                    >
                      {tier.label}
                    </span>
                  </div>
                  <div
                    className="font-mono-tight text-[10px] tracking-[0.18em] uppercase mb-3"
                    style={{ color: '#52525B' }}
                  >
                    {d.label}
                  </div>
                  <div
                    className="font-display font-medium tabular-nums"
                    style={{
                      fontSize: 28,
                      color: tier.color,
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                    }}
                  >
                    {d.score}
                    <span
                      className="font-mono-tight ml-1.5"
                      style={{ fontSize: 12, color: '#52525B' }}
                    >
                      /100
                    </span>
                  </div>
                  <div
                    className="mt-3 h-[2px] w-full overflow-hidden"
                    style={{ background: 'rgba(196,167,137,0.10)' }}
                  >
                    <div
                      className="h-full transition-all duration-700"
                      style={{ width: `${d.score}%`, background: tier.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footnote / CTA */}
        <p
          className="mt-12 text-center text-[12.5px] font-mono-tight"
          style={{ color: '#52525B' }}
        >
          <ArrowRight size={11} className="inline-block mr-2 -mt-0.5" />
          Every analyzed property gets its own Command Score. Below 70 = action required.
        </p>
      </div>
    </section>
  );
}
