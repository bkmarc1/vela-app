// Propul8 Transformation Intelligence™ — eight branded capabilities.
// Replaces the previous "Why Propul8" cards with the new positioning grid.

const FEATURES = [
  ['Offer Intelligence™',
   'Smart buy / aggressive / fair / overpriced — institutional acquisition envelope per asset.',
   'OPER · INVEST'],
  ['Transformation Arbitrage™',
   'Underperforming assets, estimated upside after redesign and repositioning.',
   'INVEST'],
  ['ADR Potential™',
   'Predicts achievable ADR after optimization. Reasons: weak branding, listing, design, pricing.',
   'OPER'],
  ['Design ROI™',
   'Per-upgrade payback — bathroom, lighting, hospitality styling — with ADR impact and months.',
   'OPER'],
  ['Market Mispricing™',
   'Assets mispriced vs hospitality potential — overpriced, undervalued, hidden upside, weak positioning.',
   'INVEST'],
  ['Yield Leaks™',
   'Operational revenue leakage — photography, pricing, amenities, response, design — quantified annually.',
   'OPER'],
  ['AI Investment Memo™',
   'Institutional acquisition memo: summary, risks, upside, transformation strategy, comps, signals.',
   'INVEST'],
  ['District Momentum Signal™',
   'Tourism, hotel openings, flight growth, luxury demand, infrastructure, occupancy, STR saturation.',
   'INVEST · OPER'],
];

export default function WhyVela() {
  return (
    <section
      className="border-b"
      style={{ borderColor: 'rgba(9,9,11,0.08)' }}
      data-testid="landing-differentiators"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-32 lg:py-40">
        <div className="mb-20 max-w-[860px]">
          <span className="kicker-bronze">Propul8 Transformation Intelligence™</span>
          <h2 className="font-display text-3xl md:text-5xl font-medium mt-5 leading-[1.04]">
            Eight institutional capabilities.<br />
            <span style={{ color: '#B8956A' }}>One unified intelligence system.</span>
          </h2>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px"
          style={{ background: 'rgba(184,149,106,0.10)' }}
        >
          {FEATURES.map(([title, copy, scope], i) => (
            <div
              key={title}
              className="p-10 lg:p-12 transition-colors flex flex-col"
              style={{ background: '#FAFAFA', minHeight: 240 }}
              data-testid={`landing-diff-${title.toLowerCase().replace(/[™\s]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`}
            >
              <div className="flex items-baseline justify-between gap-3 mb-5">
                <span
                  className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase"
                  style={{ color: '#52525B' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className="font-mono-tight text-[8.5px] tracking-[0.18em] uppercase"
                  style={{ color: '#B8956A' }}
                >
                  {scope}
                </span>
              </div>
              <h4 className="font-display text-xl font-medium leading-tight" style={{ color: '#09090B' }}>
                {title}
              </h4>
              <p className="mt-4 text-[13px] leading-relaxed flex-1" style={{ color: '#52525B' }}>
                {copy}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
