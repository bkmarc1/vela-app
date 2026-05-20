// Propul8 Method — institutional flow. Six steps, calm rhythm, no marketing prose.
const STEPS = [
  {
    n: '01',
    title: 'Ingest',
    body: 'Paste a listing URL. Propul8 extracts property data, photos, amenities, pricing references, and listing positioning.',
  },
  {
    n: '02',
    title: 'Benchmark',
    body: 'The asset is compared against curated comp-set medians and top-decile inventory across 7 hospitality performance axes.',
  },
  {
    n: '03',
    title: 'Diagnose',
    body: 'Propul8 identifies revenue leakage, positioning weakness, visual underperformance, and operational friction — each scored, each defensible.',
  },
  {
    n: '04',
    title: 'Transform',
    body: 'Three strategic execution paths are surfaced per upgrade — different cost, complexity, and disruption — solving the same operational problem.',
  },
  {
    n: '05',
    title: 'Execute',
    body: 'Propul8 produces listing rewrites, procurement carts, contractor packs, and pricing logic — packaged for direct execution.',
  },
  {
    n: '06',
    title: 'Learn',
    body: 'Each asset stores its intelligence profile and re-analysis history — the platform improves with every transformation cycle.',
  },
];

export default function Method() {
  return (
    <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-16 md:py-22" data-testid="method-page">
      <div className="kicker">The Propul8 Method</div>
      <h1 className="font-display text-[1.85rem] md:text-[2.2rem] font-medium tracking-[-0.03em] mt-3 leading-[1.08]">
        The Propul8 Intelligence Engine
        <br />
        <span className="text-[#52525B]">for hospitality investments.</span>
      </h1>
      <p className="mt-5 text-[12.5px] text-[#52525B] max-w-md leading-relaxed font-light">
        Two intelligence engines — Acquisition Intelligence and Asset Intelligence —
        connected by six operational layers that turn underperforming hospitality
        assets into higher-yield revenue products. Calibrated to comp-set, labelled
        with confidence, stored as institutional metadata.
      </p>

      <div className="mt-14 md:mt-16 space-y-px bg-[#B8956A]/[0.07]" data-testid="method-steps">
        {STEPS.map((s) => (
          <div
            key={s.n}
            data-testid={`method-step-${s.n}`}
            className="bg-[#FAFAFA] grid grid-cols-12 gap-5 md:gap-6 py-7 md:py-8 px-2 md:px-3 hover:bg-[#E4E4E7] transition-colors"
          >
            <div className="col-span-12 md:col-span-1 font-mono-tight text-[#52525B] text-[10px] uppercase tracking-[0.22em] pt-1">
              {s.n}
            </div>
            <div className="col-span-12 md:col-span-3">
              <h3 className="font-display text-[1.05rem] md:text-[1.15rem] tracking-[-0.025em] font-medium leading-[1.2]">
                {s.title}
              </h3>
            </div>
            <div className="col-span-12 md:col-span-8 text-[12.5px] text-[#52525B] leading-relaxed font-light">
              {s.body}
            </div>
          </div>
        ))}
      </div>

      {/* Closing institutional note */}
      <div className="mt-12 md:mt-14 pt-8 border-t border-[#B8956A]/[0.08] text-center">
        <div className="kicker-bronze">Institutional Standard</div>
        <p className="mt-3 text-[12.5px] text-[#52525B] font-light max-w-lg mx-auto leading-relaxed">
          Every output carries an analysis version, timestamp, confidence level, and data-source label.
          Same asset always resolves to the same intelligence.
        </p>
      </div>
    </div>
  );
}
