import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, ShoppingBag, Type, Workflow } from 'lucide-react';
import api from '../lib/api';
import TransformPanel from '../components/TransformPanel';
import { DEMO_PROPERTY, DEFAULT_TIMELINE } from '../lib/demoProperty';
import { getPathsForRec, pathFamilyForRec } from '../lib/recommendationPaths';
import { useGeneratedConceptImage } from '../lib/useGeneratedConceptImage';
import { computePropertyIntelligence, formatAnalyzedAt } from '../lib/intelligence';

// "Why this matters" — concise hospitality intelligence per concept family.
// Concept keys come from rec-aware paths: sleep / lighting / outdoor / photo / pricing
const FAMILY_INSIGHTS = {
  sleep: [
    'Sleeps-5 inventory under-supplied in Cycladic STR — 18% ADR premium Jul–Aug.',
    'Family-group conversion lifts dramatically with sleep capacity expansion.',
    'Operator chooses architectural permanence vs reversibility based on lease + capex.',
  ],
  lighting: [
    'Programmed evening lighting raises perceived-luxury scoring by ~14%.',
    'Sculptural focals lift hero-photo click-through ~16% on listing tests.',
    'Cove-only architectures photograph evenly across ALL listing frames.',
  ],
  outdoor: [
    'Programmed terraces outperform empty ones by 22% in boutique Med inventory.',
    'Indoor-outdoor flow conversions raise perceived footprint ~28% in listing photography.',
    'FF&E-only outdoor zones still capture ~15% of the bare-terrace ADR uplift gap.',
  ],
  photo: [
    'Golden-hour reshoots raise booking conversion ~14% within 30 days.',
    'Lifestyle imagery converts 22% higher than empty-room photography.',
    'Architectural-detail listings get picked up 4× more often by design press.',
  ],
  pricing: [
    'Seasonal-band pricing captures ~16% more annual revenue vs flat rates.',
    'Length-of-stay rules raise net (post-cleaning) revenue ~12%.',
    'Demand-priced inventory captures ~22% more peak revenue.',
  ],
  default: [
    'Operational decisions compound across listings — calibrate to comp-set, not vibes.',
  ],
};

export default function Workspace() {
  const params = useParams();
  // /workspace/demo/:upgradeIdx/:conceptKey treats `demo` as a literal,
  // so propertyId is undefined unless we fall back. Demo NEVER hits the DB.
  const propertyId = params.propertyId || 'demo';
  const upgradeIdx = params.upgradeIdx;
  const conceptKey = params.conceptKey;
  const upgradeIndex = Math.max(0, Number.isFinite(Number(upgradeIdx)) ? Number(upgradeIdx) : 0);
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [concept, setConcept] = useState(null);
  const [transformState, setTransformState] = useState(null);
  const [sliderPct, setSliderPct] = useState(50);
  const sliderRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1) Resolve property — demo always local.
      let resolvedProperty = null;
      if (propertyId === 'demo') {
        resolvedProperty = DEMO_PROPERTY;
      } else {
        try {
          const propRes = await api.get(`/properties/${propertyId}`);
          resolvedProperty = propRes.data || DEMO_PROPERTY;
        } catch (e) {
          resolvedProperty = DEMO_PROPERTY;
        }
      }
      if (cancelled) return;
      setProperty(resolvedProperty);

      const upgrades = resolvedProperty?.analysis?.yield_opportunities || [];
      const safeIdx = upgradeIndex < upgrades.length ? upgradeIndex : 0;
      const rec = upgrades[safeIdx] || DEMO_PROPERTY.analysis.yield_opportunities[0];

      // 2) Resolve concept — try AI; if it fails, use the rec-aware paths.
      const recAwareFallback = getPathsForRec(rec?.title);
      let pool = recAwareFallback;
      try {
        const visRes = await api.post('/visualize', {
          recommendation: rec,
          property: {
            name: resolvedProperty.name,
            city: resolvedProperty.city,
            property_type: resolvedProperty.property_type,
            sqm: resolvedProperty.sqm,
            sleeps: resolvedProperty.sleeps,
            nightly_rate: resolvedProperty.nightly_rate,
          },
        });
        const got = visRes.data?.concepts;
        if (Array.isArray(got) && got.length) {
          // Merge AI output with curated path so strategic fields are guaranteed.
          pool = got.map((c, i) => {
            const lp = recAwareFallback[i] || recAwareFallback[0];
            return {
              ...lp, ...c,
              strategy: c.strategy || lp.strategy,
              execution: c.execution || lp.execution,
              cost_band: c.cost_band || lp.cost_band,
              complexity: c.complexity || lp.complexity,
              disruption: c.disruption || lp.disruption,
              when_to_choose: c.when_to_choose || lp.when_to_choose,
              key: lp.key, name: lp.name,
            };
          });
        }
      } catch (e) {
        pool = recAwareFallback;
      }
      if (cancelled) return;

      const found = pool.find((c) => c.key === conceptKey)
        || recAwareFallback.find((c) => c.key === conceptKey)
        || pool[0]
        || recAwareFallback[0];
      setConcept(found);
    })();
    return () => { cancelled = true; };
  }, [propertyId, upgradeIndex, conceptKey]);

  // Hook MUST be called unconditionally — pass safe defaults when not ready.
  const { src: generatedHero } = useGeneratedConceptImage(
    concept || { key: 'mezzanine_loft', hero: '', name: '' },
    property || {},
  );

  if (!concept || !property) {
    return (
      <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-24 text-[#52525B] font-mono-tight" data-testid="workspace-loading">
        Preparing transformation studio…
      </div>
    );
  }

  const upgradesNow = property?.analysis?.yield_opportunities || [];
  const recommendation = upgradesNow[upgradeIndex < upgradesNow.length ? upgradeIndex : 0]
    || DEMO_PROPERTY.analysis.yield_opportunities[0];
  const beforeImg = property?.files?.[0]?.external_url || property?.files?.[0]?.storage_path || concept.hero;
  const afterImg = generatedHero || concept.hero;

  const handleSliderMove = (e) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPct(pct);
  };

  const propCtx = {
    name: property.name,
    city: property.city,
    property_type: property.property_type,
    sqm: property.sqm,
    sleeps: property.sleeps,
    nightly_rate: property.nightly_rate,
  };
  const recCtx = {
    title: `${recommendation.title} — ${concept.name}`,
    transformation: recommendation.transformation,
    detail: `Direction: ${concept.name}. Atmosphere: ${concept.atmosphere}. Materials: ${(concept.materials || []).join(', ')}. Lighting: ${(concept.lighting || []).join(', ')}.`,
  };

  const insights = FAMILY_INSIGHTS[pathFamilyForRec(recommendation?.title)] || FAMILY_INSIGHTS.default;
  const propertyIntel = computePropertyIntelligence(property);

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-9 md:py-11" data-testid="workspace-page">
      <button
        onClick={() => navigate(`/visualize/${propertyId}/${upgradeIndex}`)}
        className="text-[10px] font-mono-tight uppercase tracking-[0.22em] text-[#52525B] hover:text-white flex items-center gap-2 transition-colors"
        data-testid="back-to-concepts"
      >
        <ArrowLeft size={11} strokeWidth={1.6} /> Back to concepts
      </button>

      {/* INTELLIGENCE PROFILE STRIP — institutional metadata */}
      <WorkspaceIntelligenceStrip property={property} />

      {/* HEADER */}
      <div className="mt-6 mb-6 grid md:grid-cols-12 gap-6 items-end">
        <div className="md:col-span-7">
          <div className="kicker">Transformation Studio · {recommendation.title}</div>
          <h1 className="font-display text-lg md:text-[1.65rem] font-medium tracking-[-0.025em] mt-2 leading-[1.1]">
            {concept.name}
          </h1>
          {concept.strategy && (
            <p className="mt-2 text-[12px] text-[#09090B] font-light leading-relaxed max-w-xl" data-testid="workspace-strategy">
              {concept.strategy}
            </p>
          )}
        </div>
        <div className="md:col-span-5 md:text-right">
          {concept.palette && (
            <div className="flex md:justify-end gap-1.5">
              {concept.palette.map((c, i) => (
                <span key={i} className="w-3.5 h-3.5 border border-[#09090B]/15" style={{ background: c }} />
              ))}
            </div>
          )}
          <div className="mt-2 text-[10px] font-mono-tight uppercase tracking-[0.18em] text-[#52525B]">
            {concept.cost_band || ''} · {concept.complexity || ''}
          </div>
        </div>
      </div>

      {/* SPLIT-SCREEN STUDIO */}
      <div className="grid lg:grid-cols-12 gap-3">
        {/* LEFT — visualization + before/after */}
        <div className="lg:col-span-7 space-y-3">
          {/* Hero render — DARK editorial spread for cross-page rhythm */}
          <div className="vela-card overflow-hidden">
            <div className="aspect-[16/10] relative bg-[#FAFAFA]">
              <img src={afterImg} alt={concept.name} className="w-full h-full object-cover" data-testid="workspace-hero" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA]/45 to-[#FAFAFA]/10" />
              <div className="absolute bottom-4 left-5 right-5">
                <p className="text-[12px] text-[#E4E4E7] font-light leading-relaxed max-w-md">{concept.atmosphere}</p>
              </div>
              <span className="absolute top-3 left-3 font-mono-tight text-[9px] uppercase tracking-[0.22em] text-[#FAFAFA] bg-[#FAFAFA]/70 backdrop-blur-xl border border-[#B8956A]/20 px-2 py-1">
                Concept Render
              </span>
            </div>
          </div>

          {/* Before / After slider */}
          <div className="vela-card overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-end justify-between border-b border-[#09090B]/[0.08]">
              <div>
                <div className="kicker">Before / After</div>
                <h3 className="font-display text-[13px] tracking-[-0.025em] mt-1">Drag to compare.</h3>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono-tight uppercase tracking-[0.18em] text-[#52525B]">
                <span>Current</span>
                <span>Concept</span>
              </div>
            </div>
            <div
              ref={sliderRef}
              data-testid="before-after-slider"
              className="relative aspect-[16/10] cursor-ew-resize select-none"
              onMouseDown={(e) => {
                handleSliderMove(e);
                const onMove = (ev) => handleSliderMove(ev);
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
              onTouchMove={handleSliderMove}
            >
              <img src={beforeImg} alt="before" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 0 0 ${sliderPct}%)` }}>
                <img src={afterImg} alt="after" className="absolute inset-0 w-full h-full object-cover" />
              </div>
              <div className="absolute top-0 bottom-0 w-px bg-[#B8956A]" style={{ left: `${sliderPct}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#B8956A] flex items-center justify-center text-[#FAFAFA]" style={{ left: `${sliderPct}%` }}>
                <span className="font-mono-tight text-[10px]">⇆</span>
              </div>
            </div>
          </div>

          {/* Upgrade Breakdown */}
          <div className="vela-card p-5">
            <div className="kicker">Upgrade Breakdown</div>
            <div className="grid md:grid-cols-3 gap-5 mt-4">
              <BreakdownCol label="Furniture" items={concept.furniture} />
              <BreakdownCol label="Lighting" items={concept.lighting} />
              <BreakdownCol label="Materials" items={concept.materials} />
            </div>
          </div>
        </div>

        {/* RIGHT — revenue · listing · procurement · insights */}
        <div className="lg:col-span-5 space-y-3">
          {/* Revenue impact — property-level intel + concept-level uplift */}
          <div className="vela-card p-5" data-testid="workspace-revenue">
            <div className="kicker-bronze">Revenue Impact</div>
            <h3 className="font-display text-[15px] tracking-[-0.025em] mt-1.5">Modeled financial upside for this asset.</h3>
            <div className="mt-4 grid grid-cols-2 gap-px bg-[#09090B]/[0.06] border border-[#09090B]/[0.08] overflow-hidden">
              <RevTile label="Asset Score" value={`${propertyIntel.asset_score}/100`} />
              <RevTile label="Opportunity Strength" value={`${propertyIntel.opportunity_strength}/100`} accent />
              <RevTile label="ADR" value={`€${propertyIntel.nightly_rate} → €${propertyIntel.projected_adr}`} />
              <RevTile label="Occupancy" value={`${propertyIntel.occupancy_pct}% → ${propertyIntel.projected_occupancy}%`} />
              <RevTile label="Annual Uplift (Asset)" value={`+€${propertyIntel.uplift_eur.toLocaleString()}`} green />
              <RevTile label="Path Uplift" value={`+€${(concept.annual_uplift ?? 0).toLocaleString()}`} />
            </div>
            <div className="mt-3 text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.18em]">
              {propertyIntel.market_confidence} confidence · modeled against {property?.city || 'local'} comp-set
            </div>
          </div>

          {/* Listing rewrite preview */}
          <div className="vela-card p-5">
            <div className="flex items-center justify-between">
              <div className="kicker">Listing Rewrite</div>
              <button
                onClick={() => navigate(`/listing/${propertyId}/${upgradeIndex}`)}
                data-testid="ws-rewrite-listing"
                className="text-[10px] font-mono-tight uppercase tracking-[0.22em] text-[#B8956A] hover:text-white flex items-center gap-1.5 transition-colors"
              >
                Open <ArrowUpRight size={10} strokeWidth={1.6} />
              </button>
            </div>
            <p className="text-[12px] text-[#09090B] mt-3 font-light leading-relaxed">
              Editorial copy aligned to <span className="text-[#B8956A]">{concept.name}</span> direction —
              title · subhead · description · amenities · positioning.
            </p>
            {concept.guest_positioning && (
              <div className="mt-3 pt-3 border-t border-[#09090B]/[0.08]">
                <div className="kicker text-[9px]">Guest Segment</div>
                <p className="text-[11px] text-[#52525B] mt-1.5 font-light leading-relaxed">{concept.guest_positioning}</p>
              </div>
            )}
          </div>

          {/* Procurement preview */}
          <div className="vela-card p-5">
            <div className="flex items-center justify-between">
              <div className="kicker">Procurement</div>
              <button
                onClick={() => navigate(`/upgrade/${propertyId}/${upgradeIndex}`)}
                data-testid="ws-build-upgrade"
                className="text-[10px] font-mono-tight uppercase tracking-[0.22em] text-[#B8956A] hover:text-white flex items-center gap-1.5 transition-colors"
              >
                Open Cart <ArrowUpRight size={10} strokeWidth={1.6} />
              </button>
            </div>
            <p className="text-[12px] text-[#09090B] mt-3 font-light leading-relaxed">
              Real brands, real suppliers, dimensions, dynamic totals — Budget · Premium · Luxury packages.
            </p>
          </div>

          {/* Why this matters — intelligence */}
          {insights.length > 0 && (
            <div className="vela-card p-5" data-testid="workspace-insights">
              <div className="kicker-bronze">Why This Matters</div>
              <ul className="mt-3 space-y-2.5">
                {insights.map((i) => (
                  <li key={i} className="insight-snippet">{i}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Execution Realism — sourced directly from the strategic path */}
          <div className="vela-card p-5" data-testid="execution-realism">
            <div className="kicker">Execution Realism</div>
            <h3 className="font-display text-[13px] tracking-[-0.025em] mt-1.5 mb-3">Real-world implementation read.</h3>
            <div className="grid grid-cols-2 gap-px bg-[#B8956A]/[0.07] border border-[#B8956A]/[0.07]">
              <RealismTile label="Difficulty" value={concept.complexity || '—'} />
              <RealismTile label="Cost Band" value={concept.cost_band || '—'} accent />
              <RealismTile label="Disruption" value={concept.disruption || '—'} />
              <RealismTile label="Execution" value={concept.execution?.split(' · ')?.[0] || '—'} />
            </div>
            {concept.when_to_choose && (
              <div className="mt-3 pt-3 border-t border-[#B8956A]/[0.08]">
                <div className="kicker-bronze">When To Choose This Path</div>
                <p className="text-[11px] text-[#52525B] mt-1.5 font-light leading-relaxed">{concept.when_to_choose}</p>
              </div>
            )}
            {concept.execution && (
              <div className="mt-3 text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.2em]">
                {concept.execution}
              </div>
            )}
          </div>

          {/* Implementation timeline */}
          <div className="vela-card p-5" data-testid="workspace-timeline">
            <div className="kicker">Implementation</div>
            <h3 className="font-display text-[13px] tracking-[-0.025em] mt-1.5 mb-3">Four weeks to live.</h3>
            <ol className="space-y-2.5">
              {DEFAULT_TIMELINE.map((step, i) => (
                <li key={step.week} data-testid={`timeline-step-${i}`} className="flex gap-3 items-baseline border-t border-[#09090B]/[0.08] pt-2.5 first:border-t-0 first:pt-0">
                  <span className="text-[10px] font-mono-tight uppercase tracking-[0.18em] text-[#52525B] shrink-0 w-12">{step.week}</span>
                  <div>
                    <div className="font-display text-[12px] tracking-[-0.02em] leading-tight">{step.label}</div>
                    <p className="text-[10.5px] text-[#52525B] mt-1 leading-relaxed font-light">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="mt-8 vela-card p-5" data-testid="workspace-actions">
        <div className="grid md:grid-cols-3 gap-3">
          <ActionRow
            icon={ShoppingBag}
            label="Build Upgrade"
            desc="Real cart with brands, prices, dimensions, suppliers."
            onClick={() => navigate(`/upgrade/${propertyId}/${upgradeIndex}`)}
            testid="ws-build-upgrade-cta"
          />
          <ActionRow
            icon={Workflow}
            label="Contractor Pack"
            desc="Spec sheet — measurements, materials, lighting, install."
            onClick={() => setTransformState({ recommendation: recCtx, action: 'contractor_pack' })}
            testid="ws-contractor-pack"
          />
          <ActionRow
            icon={Type}
            label="Rewrite Listing"
            desc="Listing copy aligned to the selected direction."
            onClick={() => navigate(`/listing/${propertyId}/${upgradeIndex}`)}
            testid="ws-rewrite-listing-cta"
          />
        </div>
        <div className="mt-4 pt-4 border-t border-[#09090B]/[0.08] flex items-center justify-between flex-wrap gap-3">
          <div className="text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.18em]">
            One studio · operational outputs · ready for execution
          </div>
          <button
            onClick={() => setTransformState({ recommendation: recCtx, action: 'activate_upgrade' })}
            className="vela-btn"
            data-testid="ws-activate-upgrade"
          >
            Activate Full Upgrade <ArrowUpRight size={11} strokeWidth={1.6} />
          </button>
        </div>
      </div>

      <TransformPanel
        open={!!transformState}
        onClose={() => setTransformState(null)}
        recommendation={transformState?.recommendation}
        action={transformState?.action}
        property={propCtx}
      />
    </div>
  );
}

function BreakdownCol({ label, items }) {
  return (
    <div>
      <div className="kicker">{label}</div>
      <ul className="mt-2.5 space-y-1.5">
        {(items || []).slice(0, 3).map((item, i) => (
          <li key={i} className="flex gap-2 text-[11.5px] text-[#09090B] font-light leading-relaxed">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-[#B8956A] shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RevTile({ label, value, accent, green }) {
  const cls = green
    ? 'text-[#B8956A]'
    : accent
      ? 'text-[#B8956A]'
      : 'text-[#09090B]';
  return (
    <div className="bg-[#E4E4E7] p-4">
      <div className="kicker text-[9px]">{label}</div>
      <div className={`font-mono-tight text-[13px] mt-1.5 tracking-[-0.04em] ${cls}`}>
        {value}
      </div>
    </div>
  );
}

function RealismTile({ label, value, accent }) {
  return (
    <div className="bg-[#FAFAFA] p-3.5">
      <div className="kicker text-[9px]">{label}</div>
      <div className={`font-mono-tight text-[12px] mt-1.5 tracking-[-0.02em] ${accent ? 'text-[#B8956A]' : 'text-[#09090B]'}`}>
        {value}
      </div>
    </div>
  );
}

function WorkspaceIntelligenceStrip({ property }) {
  const intel = computePropertyIntelligence(property);
  const confColor =
    intel.market_confidence === 'High' ? 'text-[#B8956A]' :
    intel.market_confidence === 'Medium' ? 'text-[#B8956A]' : 'text-[#52525B]';
  return (
    <div data-testid="workspace-intelligence-strip" className="flex items-center gap-3 flex-wrap pb-3 border-b border-[#B8956A]/[0.08]">
      <span className="text-[10px] font-mono-tight uppercase tracking-[0.22em] text-[#52525B]">
        Asset Intelligence
      </span>
      <span className="text-[10px] font-mono-tight text-[#52525B]">·</span>
      <span className="text-[10px] font-mono-tight uppercase tracking-[0.18em] text-[#52525B]">
        Analysis {intel.analysis_version}
      </span>
      <span className="text-[10px] font-mono-tight text-[#52525B]">·</span>
      <span className="text-[10px] font-mono-tight uppercase tracking-[0.18em] text-[#52525B]">
        {formatAnalyzedAt(intel.analyzed_at)}
      </span>
      <span className="text-[10px] font-mono-tight text-[#52525B]">·</span>
      <span className={`text-[10px] font-mono-tight uppercase tracking-[0.18em] ${confColor}`}>
        {intel.market_confidence} confidence
      </span>
      <span className="text-[10px] font-mono-tight text-[#52525B]">·</span>
      <span className="text-[10px] font-mono-tight uppercase tracking-[0.18em] text-[#52525B]">
        Asset Score {intel.asset_score}/100 · Opportunity {intel.opportunity_strength}/100
      </span>
    </div>
  );
}

function ActionRow({ icon: Icon, label, desc, onClick, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className="text-left vela-card p-4 hover:border-[#B8956A]/40 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <Icon size={13} strokeWidth={1.4} className="text-[#52525B] group-hover:text-[#B8956A] transition-colors" />
        <ArrowUpRight size={11} strokeWidth={1.4} className="text-[#52525B] group-hover:text-[#B8956A] transition-colors" />
      </div>
      <div className="mt-3.5 font-display text-[13.5px] tracking-[-0.02em]">{label}</div>
      <div className="mt-1 text-[10.5px] text-[#52525B] font-light leading-relaxed">{desc}</div>
    </button>
  );
}
