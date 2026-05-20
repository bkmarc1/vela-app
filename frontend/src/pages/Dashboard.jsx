import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../lib/api';
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Sparkles,
  Layers,
  MapPin,
  Activity,
  Compass,
  Building2,
  Target,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import TransformPanel from '../components/TransformPanel';
import { ACTIONS, actionsForRecommendation } from '../lib/transformActions';
import {
  computeBenchmarkRows,
  computeHospitalityArchetype,
  computeConversionRead,
  computeOperationalFriction,
} from '../lib/benchmarks';
import { intelForRec } from '../lib/recommendationIntelligence';
import { computePropertyIntelligence, formatAnalyzedAt } from '../lib/intelligence';

const TABS = [
  { id: 'quick_wins', label: 'Quick Wins' },
  { id: 'medium_upgrades', label: 'Medium Upgrades' },
  { id: 'high_roi_renovations', label: 'High ROI Renovations' },
];

const BREAKDOWN_LABELS = {
  yield_potential: 'Yield Potential',
  design_quality: 'Design Quality',
  layout_efficiency: 'Layout Efficiency',
  market_position: 'Market Position',
  guest_experience: 'Guest Experience',
  operational_efficiency: 'Operational Efficiency',
};

// Micro-intelligence snippets — concise hospitality benchmarks, financially relevant.
const YIELD_INTEL = {
  'Sleep Capacity Expansion': 'Sleeps-5 inventory in Cycladic STR achieves 18% higher ADR Jul–Aug.',
  'Layered Evening Lighting': 'Warm 2700K lighting lifts perceived luxury scoring by ~14%.',
  'Outdoor Dining Program': 'Programmed terraces outperform bare ones by 22% in boutique Med inventory.',
  'Editorial Photography Refresh': 'Editorial photography raises booking conversion ~14% within 30 days.',
};

// Opportunity Strength™ — composite institutional score per recommendation.
const OPPORTUNITY_STRENGTH = {
  'Sleep Capacity Expansion': { score: 88, confidence: 'High' },
  'Layered Evening Lighting': { score: 86, confidence: 'High' },
  'Outdoor Dining Program': { score: 92, confidence: 'High' },
  'Editorial Photography Refresh': { score: 95, confidence: 'High' },
};

// "Why This Matters" — concise institutional reasoning behind the score.
const WHY_REASONS = {
  'Sleep Capacity Expansion': [
    'Family-group conversion uplift in Jul–Aug',
    'Mezzanine adds sleep without architectural compromise',
    'Sleeps-5 inventory under-supplied in Koufonisia',
  ],
  'Layered Evening Lighting': [
    'Evening photography under-programmed vs. comp-set',
    '2700K lifts perceived luxury scoring',
    'Cheapest single move with measurable ADR impact',
  ],
  'Outdoor Dining Program': [
    'Underutilized sea-view terrace zone',
    'Mediterranean outdoor dining premium documented',
    'Competitor ADR advantage closes in 8 weeks',
  ],
  'Editorial Photography Refresh': [
    '5-month payback, lowest-capex highest-ROI move',
    'Conversion lift across listing platforms ~14%',
    'Color grading inconsistency caps editorial cohesion',
  ],
};

export default function Dashboard() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Banner from Analyze flow when an existing analysis was loaded via dedupe.
  // Shown once · dismissable · uses persisted analyzed_at from the backend.
  const [dedupeBanner, setDedupeBanner] = useState(() => location.state?.dedupeMatch ? {
    lastAnalyzedAt: location.state.lastAnalyzedAt,
    analysisVersion: location.state.analysisVersion,
  } : null);

  // Vision warmup — fire once on mount. Pre-imports the vision library on the
  // backend so the first /api/visual-analysis from /analyze isn't a 30s cold
  // start. Fire-and-forget; we don't block render on the result.
  // Gated with a ref so React StrictMode's intentional double-effect in dev
  // doesn't fire two warmup requests.
  const warmedRef = useRef(false);
  useEffect(() => {
    if (warmedRef.current) return;
    warmedRef.current = true;
    api.post('/visual-analysis/warmup').catch(() => { /* silent */ });
  }, []);
  const isDemo = !propertyId || propertyId === 'demo';
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('quick_wins');
  const [error, setError] = useState(null);
  const [revealKey, setRevealKey] = useState(0);
  const [transformState, setTransformState] = useState(null); // {recommendation, action}

  const handleAction = (rec, action) => {
    if (action === 'visualize_layout') {
      const idx = a.yield_opportunities.indexOf(rec);
      navigate(`/visualize/${propertyId || 'demo'}/${Math.max(0, idx)}`);
      return;
    }
    if (action === 'shopping_cart') {
      const idx = a.yield_opportunities.indexOf(rec);
      navigate(`/upgrade/${propertyId || 'demo'}/${Math.max(0, idx)}`);
      return;
    }
    if (action === 'update_listing') {
      const idx = a.yield_opportunities.indexOf(rec);
      navigate(`/listing/${propertyId || 'demo'}/${Math.max(0, idx)}`);
      return;
    }
    setTransformState({ recommendation: rec, action });
  };

  useEffect(() => {
    setData(null);
    setError(null);
    (async () => {
      try {
        const url = isDemo ? '/properties/demo' : `/properties/${propertyId}`;
        const res = await api.get(url);
        setData(res.data);
        setRevealKey((k) => k + 1);
      } catch (e) {
        setError(e?.response?.data?.detail || 'Could not load property');
      }
    })();
  }, [propertyId, isDemo]);

  // Restrict action-plan tabs to those that have data
  const availableTabs = useMemo(() => {
    const ap = data?.analysis?.action_plan || {};
    return TABS.filter((t) => Array.isArray(ap[t.id]) && ap[t.id].length > 0);
  }, [data]);

  useEffect(() => {
    if (availableTabs.length && !availableTabs.some((t) => t.id === tab)) {
      setTab(availableTabs[0].id);
    }
  }, [availableTabs, tab]);

  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-24 text-[#52525B]" data-testid="dashboard-error">
        {error}
      </div>
    );
  }
  if (!data) return <DashboardSkeleton />;
  const a = data.analysis;
  if (!a) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-24 text-[#52525B]" data-testid="dashboard-no-analysis">
        Analysis not yet available for this asset.
      </div>
    );
  }
  const heroPhoto = data.files?.[0]?.external_url || data.files?.[0]?.storage_path;

  return (
    <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-9 md:py-12" data-testid="dashboard-page" key={revealKey}>
      {/* Dedupe banner — shown once when an existing analysis was loaded */}
      {dedupeBanner && (
        <div
          data-testid="dedupe-banner"
          className="mb-4 flex items-center gap-3 px-4 py-3 border border-[#B8956A]/[0.30] bg-[#FAFAFA]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#B8956A]" />
          <span className="text-[11px] font-mono-tight uppercase tracking-[0.18em] text-[#09090B]">
            Existing analysis loaded
          </span>
          <span className="text-[10px] font-mono-tight uppercase tracking-[0.18em] text-[#52525B]">
            · last analyzed {formatAnalyzedAt(dedupeBanner.lastAnalyzedAt) || '—'}
            {dedupeBanner.analysisVersion ? ` · ${dedupeBanner.analysisVersion}` : ''}
          </span>
          <button
            onClick={() => setDedupeBanner(null)}
            data-testid="dedupe-banner-close"
            className="ml-auto text-[10px] font-mono-tight uppercase tracking-[0.22em] text-[#52525B] hover:text-[#09090B] transition-colors"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* INTELLIGENCE PROFILE — institutional metadata strip · same property always reads the same */}
      <IntelligenceProfileStrip property={data} />

      <Reveal delay={0}>
        <div className="grid lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 vela-card overflow-hidden">
            <div className="aspect-[16/9] relative">
              {heroPhoto ? (
                <img src={heroPhoto} alt={data.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#E4E4E7] flex items-center justify-center text-[#52525B] text-xs font-mono-tight">
                  No imagery
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA]/55 to-[#FAFAFA]/15" />
              <div className="absolute bottom-4 left-5 right-5">
                <div className="kicker-bronze">{data.is_demo ? 'Sample Asset' : 'Asset'}</div>
                <h1 className="font-display text-lg md:text-2xl font-medium tracking-[-0.025em] mt-2 leading-[1.05] text-[#FAFAFA]" data-testid="dashboard-title">
                  {data.name}
                </h1>
                <div className="text-[11px] text-[#E4E4E7] mt-1.5 flex items-center gap-2 font-mono-tight">
                  <MapPin size={11} strokeWidth={1.4} /> {data.city}
                </div>
              </div>
            </div>
          </div>

          <div className="vela-card p-5 flex flex-col">
            <div className="flex items-start justify-between">
              <div className="kicker">Asset Score™</div>
              <div className="text-[10px] text-[#52525B] font-mono-tight">Propul8 Index</div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <CountUp
                target={a.metrics.asset_score}
                className="font-mono-tight text-[2.5rem] md:text-[3rem] font-medium leading-none tracking-[-0.04em]"
                testid="metric-asset-score"
              />
              <div className="text-[#52525B] font-mono-tight text-base">/100</div>
            </div>
            <p className="text-[12px] text-[#52525B] mt-3 leading-relaxed font-light flex-1">{a.summary}</p>
            {a.is_fallback && (
              <div data-testid="fallback-badge" className="mt-4 text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.14em] border border-[#09090B]/[0.12] px-2.5 py-1 self-start">
                Preliminary mode · live AI refresh pending
              </div>
            )}
          </div>
        </div>
      </Reveal>

      {/* HOSPITALITY ARCHETYPE — institutional identity read */}
      <Reveal delay={40}>
        <HospitalityArchetype property={data} />
      </Reveal>

      {/* MARKET BENCHMARK POSITION — moat: comp-set ranking across 7 axes */}
      <Reveal delay={60}>
        <MarketBenchmarkPosition property={data} />
      </Reveal>

      {/* MARKET INTELLIGENCE — section 1 per spec */}
      <Reveal delay={80}>
        <SectionHeader kicker="Market Intelligence" title="Where the asset sits in its market." icon={Building2} />
        <div data-testid="market-intelligence" className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#09090B]/[0.06] border border-[#09090B]/[0.08] overflow-hidden">
          {[
            ['ADR range', a.market_intelligence?.adr_range],
            ['Pricing gap', a.market_intelligence?.pricing_gap],
            ['Premium potential', a.market_intelligence?.premium_potential],
            ['Seasonal performance', a.market_intelligence?.seasonal_performance || a.market_intelligence?.seasonality],
            ['Competitor positioning', a.market_intelligence?.competitor_positioning || a.market_intelligence?.competitors],
            ['Neighborhood intelligence', a.market_intelligence?.neighborhood_intelligence],
          ].filter(([, v]) => !!v).slice(0, 4).map(([k, v]) => (
            <div key={k} className="bg-[#E4E4E7] p-5">
              <div className="kicker">{k}</div>
              <div className="text-[12.5px] mt-2 leading-relaxed text-[#09090B] font-light">{v}</div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* UNREALIZED REVENUE POTENTIAL — section 2 per spec */}
      <Reveal delay={120}>
        <UnrealizedRevenue analysis={a} property={data} />
      </Reveal>

      {/* CONVERSION INTELLIGENCE + OPERATIONAL FRICTION — moat layers */}
      <Reveal delay={150}>
        <div className="grid md:grid-cols-2 gap-3 mt-12">
          <ConversionIntelligence property={data} />
          <OperationalFriction property={data} />
        </div>
      </Reveal>

      {/* PRIMARY OPPORTUNITIES — section 3 per spec */}
      <Reveal delay={180}>
        <SectionHeader kicker="Primary Opportunities" title="The unlocks, ranked." icon={TrendingUp} />
        {(() => {
          const sorted = [...a.yield_opportunities].sort(
            (a1, b1) => (OPPORTUNITY_STRENGTH[b1.title]?.score || 70) - (OPPORTUNITY_STRENGTH[a1.title]?.score || 70)
          );
          const hero = sorted[0];
          const rest = sorted.slice(1);
          return (
            <>
              {hero && (
                <YieldHeroCard
                  rec={hero}
                  index={a.yield_opportunities.indexOf(hero)}
                  onTrigger={(action) => handleAction(hero, action)}
                />
              )}
              <div className="grid md:grid-cols-3 gap-3 mt-3">
                {rest.map((y) => {
                  const i = a.yield_opportunities.indexOf(y);
                  return (
                    <YieldCard
                      key={y.title}
                      rec={y}
                      index={i}
                      onTrigger={(action) => handleAction(y, action)}
                    />
                  );
                })}
              </div>
            </>
          );
        })()}
      </Reveal>

      {/* SCORE COMPOSITION */}
      <Reveal delay={240}>
        <SectionHeader kicker="Score Composition" title="Six axes of institutional analysis." icon={Compass} />
        <div className="vela-card p-5 md:p-6" data-testid="score-breakdown">
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-4">
            {Object.entries(a.score_breakdown || {}).map(([key, v]) => (
              <BreakdownRow key={key} label={BREAKDOWN_LABELS[key] || key} score={v.score} weight={v.weight} hint={v.hint} testid={`breakdown-${key}`} />
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-[#09090B]/[0.08] text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.16em]">
            Weights sum to 100% · Computed against the design-led boutique comp-set
          </div>
        </div>
      </Reveal>

      {/* PERFORMANCE METRICS */}
      <Reveal delay={300}>
        <SectionHeader kicker="Performance Overview" title="The four operating numbers." icon={Activity} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#09090B]/[0.06] border border-[#09090B]/[0.08] overflow-hidden">
          <Tile testid="metric-adr" label="Projected ADR" value={`€${a.metrics.projected_adr}`} hint="per night" />
          <Tile testid="metric-occupancy" label="Estimated Occupancy" value={`${a.metrics.occupancy_pct}%`} hint="annualised" />
          <Tile testid="metric-revenue" label="Annual Revenue" value={`€${a.metrics.annual_revenue.toLocaleString()}`} hint="gross, modelled" />
          <Tile testid="metric-yield" label="Net Yield" value={`${a.metrics.net_yield_pct}%`} hint="post-cost" />
        </div>
      </Reveal>

      {/* CHART */}
      <Reveal delay={340}>
        <div className="vela-card mt-3 p-5 md:p-6" data-testid="chart-card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="kicker">Monthly revenue & ADR curve</div>
              <div className="text-[11px] text-[#52525B] mt-1 font-mono-tight">12-month modelled — EUR</div>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono-tight text-[#52525B] uppercase tracking-[0.16em]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-px bg-[#09090B]" /> Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-px bg-[#52525B]" /> ADR</span>
            </div>
          </div>
          <div className="h-48 md:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={a.performance_overview.monthly_revenue} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#09090B" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="#09090B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" vertical={false} />
                <XAxis dataKey="m" axisLine={false} tickLine={false} tickMargin={10} />
                <YAxis axisLine={false} tickLine={false} width={42} />
                <Tooltip
                  cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
                  contentStyle={{
                    background: '#E4E4E7',
                    border: '1px solid #E4E4E7',
                    borderRadius: 4,
                    fontFamily: 'Inter',
                    fontSize: 11,
                    color: '#09090B',
                    padding: '10px 12px',
                  }}
                  labelStyle={{ color: '#52525B', marginBottom: 4 }}
                />
                <Area type="monotone" dataKey="adr" stroke="#52525B" strokeWidth={1} fill="transparent" dot={false} />
                <Area type="monotone" dataKey="rev" stroke="#09090B" strokeWidth={1.25} fill="url(#revFill)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Reveal>

      {/* DESIGN + LAYOUT */}
      {(a.design_intelligence || a.layout_intelligence) && (
        <Reveal delay={380}>
          <div className="grid md:grid-cols-2 gap-3 mt-12">
            {a.design_intelligence && (
              <IntelPanel
                icon={Sparkles}
                title="Design Intelligence"
                score={a.metrics.design_score}
                rows={[
                  ['Hospitality positioning', a.design_intelligence.hospitality_positioning],
                  ['Perceived luxury', a.design_intelligence.perceived_luxury],
                  ['Furnishing cohesion', a.design_intelligence.furnishing_cohesion],
                  ['Material palette', a.design_intelligence.material_palette],
                  ['Lighting quality', a.design_intelligence.lighting_quality || a.design_intelligence.lighting],
                  ['Guest emotional perception', a.design_intelligence.guest_emotional_perception],
                  ['Photo quality', a.design_intelligence.photo_quality],
                  ['Spatial flow', a.design_intelligence.spatial_flow],
                  ['Color palette', a.design_intelligence.color_palette],
                  ['Furniture quality', a.design_intelligence.furniture_quality],
                ].filter(([, v]) => !!v)}
                testid="design-intel"
              />
            )}
            {a.layout_intelligence && (
              <IntelPanel
                icon={Layers}
                title="Layout Intelligence"
                score={a.metrics.layout_efficiency}
                rows={[
                  ['Sleeps per sqm', a.layout_intelligence.sleeps_per_sqm],
                  ['Circulation', a.layout_intelligence.circulation],
                  ['Wasted space', a.layout_intelligence.wasted_space],
                  ['Storage', a.layout_intelligence.storage],
                  ['Bedroom privacy', a.layout_intelligence.bedroom_privacy],
                  ['Loft / mezzanine opportunity', a.layout_intelligence.loft_opportunity],
                ].filter(([, v]) => !!v)}
                testid="layout-intel"
              />
            )}
          </div>
        </Reveal>
      )}

      {/* ACTION PLAN */}
      <Reveal delay={320}>
        <div className="mt-12" data-testid="action-plan">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-5">
            <div>
              <div className="kicker">Action Plan</div>
              <h3 className="font-display text-lg md:text-xl tracking-[-0.025em] font-medium mt-2">
                Capital allocation, ranked.
              </h3>
            </div>
            <div className="flex items-center gap-1 border border-[#09090B]/[0.08] p-0.5">
              {(availableTabs.length ? availableTabs : TABS).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  data-testid={`action-tab-${t.id}`}
                  className={`px-3 py-1.5 text-[10px] font-mono-tight uppercase tracking-[0.14em] transition-colors ${
                    tab === t.id ? 'bg-[#09090B] text-[#FAFAFA]' : 'text-[#52525B] hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3" key={tab}>
            {(a.action_plan?.[tab] || []).map((item, i) => (
              <div
                key={i}
                data-testid={`action-${tab}-${i}`}
                className="vela-card p-5 fade-up flex flex-col"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-[#52525B]">{item.difficulty}</span>
                  <span className="font-mono-tight text-[10px] text-[#09090B]">P {item.priority}</span>
                </div>
                <h4 className="font-display text-[15px] tracking-[-0.02em] mt-2.5 leading-tight">{item.title}</h4>
                <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-[#09090B]/[0.08]">
                  <div>
                    <div className="kicker text-[9px]">Cost</div>
                    <div className="font-mono-tight mt-1 text-[13px]">€{item.cost.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="kicker text-[9px]">Revenue Impact</div>
                    <div className="font-mono-tight mt-1 text-[13px] text-[#09090B]">+€{item.revenue_impact.toLocaleString()}</div>
                  </div>
                </div>
                <ActionPills
                  rec={{ title: item.title, detail: `Capex €${item.cost}, projected uplift €${item.revenue_impact}, difficulty ${item.difficulty}` }}
                  onTrigger={(action) => setTransformState({
                    recommendation: { title: item.title, detail: `Capex €${item.cost}; projected uplift €${item.revenue_impact}; difficulty ${item.difficulty}.` },
                    action,
                  })}
                  testidPrefix={`action-${tab}-${i}-cta`}
                  max={2}
                  className="mt-5"
                />
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* TRANSFORM PANEL */}
      <TransformPanel
        open={!!transformState}
        onClose={() => setTransformState(null)}
        recommendation={transformState?.recommendation}
        action={transformState?.action}
        property={{
          name: data.name,
          city: data.city,
          property_type: data.property_type,
          sqm: data.sqm,
          sleeps: data.sleeps,
          nightly_rate: data.nightly_rate,
        }}
      />
    </div>
  );
}

/* ----------------------- helpers ----------------------- */

function ActionPills({ rec, onTrigger, testidPrefix, max = 4, className = '' }) {
  const keys = actionsForRecommendation(rec).slice(0, max);
  return (
    <div className={`flex flex-wrap gap-2 mt-5 pt-4 border-t border-[#09090B]/[0.08] ${className}`}>
      {keys.map((k) => {
        const meta = ACTIONS[k];
        const Icon = meta?.icon;
        return (
          <button
            key={k}
            onClick={() => onTrigger(k)}
            className="action-pill"
            data-testid={`${testidPrefix}-${k}`}
          >
            {Icon && <Icon size={11} strokeWidth={1.6} />}
            {meta?.label || k}
          </button>
        );
      })}
    </div>
  );
}

function UnrealizedRevenue({ analysis, property }) {
  // SINGLE SOURCE OF TRUTH — `computePropertyIntelligence` is deterministic.
  // Same property → same numbers across Portfolio, Dashboard, Workspace.
  const intel = computePropertyIntelligence(property);
  const cityShort = (property?.city || 'Mediterranean').split(',')[0];

  return (
    <div data-testid="unrealized-revenue" className="vela-card mt-12 p-6 md:p-7">
      <div className="grid md:grid-cols-12 gap-6 items-end">
        <div className="md:col-span-7">
          <div className="kicker-bronze">Unrealized Revenue Potential™</div>
          <h3 className="font-display text-[1.55rem] md:text-[1.85rem] tracking-[-0.025em] leading-[1.1] mt-3">
            Operating at
            <span className="text-[#B8956A]"> {intel.pct_of_potential}% </span>
            of projected potential.
          </h3>
          <p className="mt-3 text-[12px] text-[#52525B] font-light max-w-md leading-relaxed">
            Estimated unrealized annual revenue:{' '}
            <span className="text-[#B8956A] font-mono-tight" data-testid="unrealized-uplift">+€{intel.uplift_eur.toLocaleString()}/year</span>.
            Asset value uplift:{' '}
            <span className="text-[#09090B] font-mono-tight">+€{intel.asset_value_uplift_eur.toLocaleString()}</span>.
          </p>
        </div>
        <div className="md:col-span-5">
          <div className="h-1 w-full bg-[#09090B]/[0.06] overflow-hidden">
            <div className="h-full bg-[#B8956A]" style={{ width: `${intel.pct_of_potential}%`, transition: 'width 1100ms cubic-bezier(0.16,1,0.3,1)' }} />
          </div>
          <div className="mt-2 flex items-center justify-between font-mono-tight text-[10px] uppercase tracking-[0.18em] text-[#52525B]">
            <span>{intel.pct_of_potential}% Current</span>
            <span>100% Projected</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-px bg-[#09090B]/[0.06] border border-[#09090B]/[0.08] overflow-hidden">
        <SummaryTile label="Current Revenue" value={`€${intel.annual_revenue.toLocaleString()}`} hint="this year" />
        <SummaryTile label="Projected Revenue" value={`€${intel.projected_revenue.toLocaleString()}`} hint="post-upgrade" accent />
        <SummaryTile label="Projected ADR" value={`€${intel.nightly_rate} → €${intel.projected_adr}`} />
        <SummaryTile label="Occupancy" value={`${intel.occupancy_pct}% → ${intel.projected_occupancy}%`} />
        <SummaryTile label="Market Position" value={`Top 12% in ${cityShort}`} accent />
      </div>
    </div>
  );
}

function SummaryTile({ label, value, hint, accent }) {
  return (
    <div className="bg-[#E4E4E7] p-5 min-h-[100px] flex flex-col justify-between">
      <div className="kicker">{label}</div>
      <div>
        <div className={`font-mono-tight text-[15px] md:text-base font-medium tracking-[-0.04em] ${accent ? 'text-[#B8956A]' : 'text-[#09090B]'}`}>
          {value}
        </div>
        {hint && <div className="text-[10px] text-[#52525B] mt-1.5 font-mono-tight uppercase tracking-[0.16em]">{hint}</div>}
      </div>
    </div>
  );
}

function YieldHeroCard({ rec, index, onTrigger }) {
  const intel = intelForRec(rec);
  const reasons = WHY_REASONS[rec.title] || [];
  return (
    <div
      data-testid={`yield-${index}`}
      className="vela-card p-6 md:p-7 grid md:grid-cols-12 gap-6 hover:border-[#09090B]/[0.14] transition-colors"
    >
      <div className="md:col-span-7 flex flex-col">
        <div className="flex items-center gap-2">
          <span className="kicker-bronze">Hero Opportunity</span>
          <span className="text-[10px] font-mono-tight uppercase tracking-[0.18em] text-[#52525B]">·</span>
          <span className="text-[10px] font-mono-tight uppercase tracking-[0.18em] text-[#52525B]">{intel.confidence} confidence</span>
        </div>
        <h4 className="font-display text-lg md:text-[1.4rem] tracking-[-0.025em] leading-[1.12] mt-2.5">{rec.title}</h4>
        {rec.transformation && (
          <div className="mt-2 font-mono-tight text-[12px] text-[#09090B] tracking-tight">
            {rec.transformation}
          </div>
        )}

        {/* Benchmark Insight + Guest Psychology — moat layer */}
        {intel.benchmark_insight && (
          <div data-testid={`yield-${index}-benchmark`} className="insight-snippet mt-3">
            {intel.benchmark_insight}
          </div>
        )}
        {intel.guest_psychology && (
          <div className="mt-4 pt-3 border-t border-[#B8956A]/[0.08]">
            <div className="kicker-bronze">Guest Psychology</div>
            <p className="text-[12px] text-[#09090B] mt-1.5 leading-relaxed font-light" data-testid={`yield-${index}-psychology`}>
              {intel.guest_psychology}
            </p>
          </div>
        )}

        {reasons.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#B8956A]/[0.08]">
            <div className="kicker text-[9px]">Why Top Performers Use It</div>
            <ul className="mt-2 space-y-1.5">
              {(intel.why_top_performers ? [intel.why_top_performers, ...reasons] : reasons).slice(0, 3).map((r) => (
                <li key={r} className="flex gap-2 text-[12px] text-[#09090B] font-light leading-relaxed">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-[#B8956A] shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ActionPills
          rec={rec}
          onTrigger={onTrigger}
          testidPrefix={`yield-${index}-action`}
          max={3}
        />
      </div>

      <div className="md:col-span-5 flex flex-col justify-between gap-5 md:border-l md:border-[#B8956A]/[0.08] md:pl-6">
        <div>
          <div className="kicker">Opportunity Strength™</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <div className="font-mono-tight text-[2.4rem] md:text-[2.6rem] tracking-[-0.04em] text-[#09090B] leading-none">{intel.opportunity_strength}</div>
            <div className="font-mono-tight text-[#52525B] text-sm">/100</div>
          </div>
          <div className="mt-3 h-[2px] w-full bg-[#B8956A]/[0.08] overflow-hidden">
            <div className="h-full bg-[#B8956A]" style={{ width: `${intel.opportunity_strength}%`, transition: 'width 900ms cubic-bezier(0.16,1,0.3,1)' }} />
          </div>
        </div>

        {/* 4-field operational read */}
        <div className="grid grid-cols-2 gap-px bg-[#B8956A]/[0.07] border border-[#B8956A]/[0.07]">
          <IntelMicroTile label="Revenue Impact" value={intel.revenue_impact} accent />
          <IntelMicroTile label="Payback" value={intel.payback} />
          <IntelMicroTile label="Cost" value={intel.cost} />
          <IntelMicroTile label="Complexity" value={intel.operational_complexity?.split(' · ')[0] || '—'} />
        </div>

        {intel.operational_complexity && (
          <div className="text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.18em] leading-relaxed">
            {intel.operational_complexity}
          </div>
        )}
      </div>
    </div>
  );
}

function IntelMicroTile({ label, value, accent }) {
  return (
    <div className="bg-[#FAFAFA] p-3.5">
      <div className="kicker text-[9px]">{label}</div>
      <div className={`mt-1 font-mono-tight text-[12px] tracking-[-0.02em] leading-tight ${accent ? 'text-[#B8956A]' : 'text-[#09090B]'}`}>
        {value}
      </div>
    </div>
  );
}

function YieldCard({ rec, index, onTrigger }) {
  const opp = OPPORTUNITY_STRENGTH[rec.title] || { score: 76, confidence: 'Medium' };
  return (
    <div
      data-testid={`yield-${index}`}
      className="vela-card p-5 flex flex-col hover:translate-y-[-1px] transition-transform"
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-display text-[15px] tracking-[-0.02em] leading-tight">{rec.title}</h4>
        <div className="text-right">
          <div className="font-mono-tight text-[#09090B] text-base tracking-[-0.04em]">{opp.score}</div>
          <div className="text-[9px] font-mono-tight uppercase tracking-[0.16em] text-[#52525B]">/100</div>
        </div>
      </div>
      {rec.transformation && (
        <div className="mt-2 font-mono-tight text-[12px] text-[#09090B] tracking-tight">
          {rec.transformation}
        </div>
      )}
      {YIELD_INTEL[rec.title] && (
        <div data-testid={`yield-${index}-intel`} className="insight-snippet mt-2 text-[10px]">
          {YIELD_INTEL[rec.title]}
        </div>
      )}
      <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-[#09090B]/[0.08]">
        <Stat label="Revenue" value={rec.revenue_impact || rec.impact || '—'} accent />
        <Stat label="Cost" value={rec.cost || '—'} />
        <Stat label="Payback" value={rec.payback || '—'} />
      </div>
      <ActionPills
        rec={rec}
        onTrigger={onTrigger}
        testidPrefix={`yield-${index}-action`}
        max={3}
      />
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div className="kicker text-[9px]">{label}</div>
      <div className={`mt-1 font-mono-tight text-[13px] ${accent ? 'text-[#09090B]' : 'text-[#09090B]'}`}>
        {value}
      </div>
    </div>
  );
}

function Reveal({ children, delay = 0 }) {
  return (
    <div className="fade-up" style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function SectionHeader({ kicker, title, icon: Icon }) {
  return (
    <div className="flex items-end justify-between mt-10 mb-3">
      <div>
        <div className="kicker">{kicker}</div>
        <h3 className="font-display text-base md:text-[1.15rem] tracking-[-0.025em] font-medium mt-1.5">{title}</h3>
      </div>
      {Icon && <Icon size={13} strokeWidth={1.4} className="text-[#52525B]" />}
    </div>
  );
}

function Tile({ label, value, hint, testid }) {
  return (
    <div data-testid={testid} className="bg-[#E4E4E7] p-5 min-h-[100px] flex flex-col justify-between">
      <div className="kicker">{label}</div>
      <div>
        <div className="font-mono-tight text-lg md:text-[1.4rem] font-medium tracking-[-0.04em] text-[#09090B]">{value}</div>
        {hint && <div className="text-[10px] text-[#52525B] mt-1.5 font-mono-tight uppercase tracking-[0.18em]">{hint}</div>}
      </div>
    </div>
  );
}

function BreakdownRow({ label, score, weight, hint, testid }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div data-testid={testid} className="grid grid-cols-12 items-center gap-3">
      <div className="col-span-12 sm:col-span-4">
        <div className="text-[12px] text-[#09090B]">{label}</div>
        <div className="text-[10px] text-[#52525B] mt-0.5 font-mono-tight uppercase tracking-[0.16em]">Weight {weight}%</div>
      </div>
      <div className="col-span-9 sm:col-span-6">
        <div className="h-[2px] w-full bg-[#09090B]/[0.06] overflow-hidden">
          <div
            className="h-full bg-[#09090B]"
            style={{ width: `${pct}%`, transition: 'width 900ms cubic-bezier(0.16,1,0.3,1)' }}
          />
        </div>
        {hint && <div className="text-[11px] text-[#52525B] mt-2 font-light leading-snug">{hint}</div>}
      </div>
      <div className="col-span-3 sm:col-span-2 text-right font-mono-tight text-[#09090B] text-[13px]">
        {score}
        <span className="text-[#52525B] text-[11px]">/100</span>
      </div>
    </div>
  );
}

function IntelPanel({ icon: Icon, title, score, rows, testid }) {
  return (
    <div className="vela-card p-5" data-testid={testid}>
      <div className="flex items-start justify-between">
        <div>
          <div className="kicker">{title}</div>
          <div className="font-mono-tight text-2xl mt-2 tracking-[-0.04em]">
            {score}<span className="text-[#52525B] text-base">/100</span>
          </div>
        </div>
        <Icon size={14} strokeWidth={1.4} className="text-[#52525B]" />
      </div>
      <div className="mt-5 divide-y divide-white/[0.04]">
        {rows.map(([k, v]) => (
          <div key={k} className="py-2.5 grid grid-cols-3 gap-3">
            <div className="text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.14em] col-span-1">{k}</div>
            <div className="text-[12px] text-[#09090B] col-span-2 font-light leading-relaxed">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CountUp({ target, className, testid }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const dur = 900;
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <div className={className} data-testid={testid}>{val}</div>;
}

function DashboardSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-16" data-testid="dashboard-loading">
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 vela-card aspect-[16/8] shimmer" />
        <div className="vela-card p-7 min-h-[260px] shimmer" />
      </div>
      <div className="mt-12 vela-card h-44 shimmer" />
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-px bg-[#09090B]/[0.06] rounded-2xl overflow-hidden">
        {[0,1,2,3].map(i => <div key={i} className="bg-[#E4E4E7] h-32 shimmer" />)}
      </div>
      <div className="mt-4 vela-card h-72 shimmer" />
    </div>
  );
}


/* ----------------------- New moat components ----------------------- */

function IntelligenceProfileStrip({ property }) {
  const intel = computePropertyIntelligence(property);
  const prev = property?.previous_analysis;
  const confColor =
    intel.market_confidence === 'High' ? 'text-[#B8956A]' :
    intel.market_confidence === 'Medium' ? 'text-[#B8956A]' : 'text-[#52525B]';

  // Identify the largest absolute delta — the headline change since prior version.
  let primaryChange = null;
  if (prev?.deltas) {
    const entries = Object.entries(prev.deltas).filter(([, v]) => Math.abs(Number(v) || 0) > 0);
    if (entries.length > 0) {
      const [k, v] = entries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
      const labelMap = {
        asset_score: 'asset score',
        occupancy_pct: 'occupancy',
        projected_adr: 'projected ADR',
        annual_revenue: 'revenue',
      };
      const sign = Number(v) >= 0 ? '+' : '';
      const unit = k === 'occupancy_pct' ? '%' : k === 'projected_adr' || k === 'annual_revenue' ? '€' : '';
      primaryChange = `${labelMap[k] || k} ${sign}${unit === '€' ? unit : ''}${v}${unit === '%' ? unit : ''}`;
    }
  }

  return (
    <div data-testid="intelligence-profile" className="mb-4 flex items-center gap-3 flex-wrap pb-3 border-b border-[#B8956A]/[0.08]">
      <span className="text-[10px] font-mono-tight uppercase tracking-[0.22em] text-[#52525B]">
        Intelligence Profile
      </span>
      <span className="text-[10px] font-mono-tight text-[#52525B]">·</span>
      <span className="text-[10px] font-mono-tight uppercase tracking-[0.18em] text-[#52525B]" data-testid="intel-version">
        Analysis {intel.analysis_version}
      </span>
      <span className="text-[10px] font-mono-tight text-[#52525B]">·</span>
      <span className="text-[10px] font-mono-tight uppercase tracking-[0.18em] text-[#52525B]" data-testid="intel-date">
        {formatAnalyzedAt(intel.analyzed_at)}
      </span>
      <span className="text-[10px] font-mono-tight text-[#52525B]">·</span>
      <span className={`text-[10px] font-mono-tight uppercase tracking-[0.18em] ${confColor}`} data-testid="intel-confidence">
        {intel.market_confidence} confidence
      </span>
      <span className="text-[10px] font-mono-tight text-[#52525B]">·</span>
      <span className="text-[10px] font-mono-tight uppercase tracking-[0.18em] text-[#52525B]" data-testid="intel-coverage">
        {intel.comp_set_coverage}-axis comp-set
      </span>
      <span className="text-[10px] font-mono-tight text-[#52525B]">·</span>
      <span className="text-[10px] font-mono-tight uppercase tracking-[0.18em] text-[#52525B]">
        {intel.benchmark_depth} benchmark depth
      </span>
      {prev && (
        <span
          data-testid="updated-analysis-badge"
          className="ml-auto text-[10px] font-mono-tight uppercase tracking-[0.18em] text-[#FAFAFA] bg-[#B8956A] px-2 py-1 flex items-center gap-1.5"
          title={`Re-analyzed ${formatAnalyzedAt(intel.analyzed_at)} · prior ${formatAnalyzedAt(prev.previous_analyzed_at)}`}
        >
          <span className="w-1 h-1 bg-[#FAFAFA] rounded-full" />
          Updated · {primaryChange || 'profile refreshed'}
        </span>
      )}
    </div>
  );
}

function HospitalityArchetype({ property }) {
  const arch = computeHospitalityArchetype(property);
  return (
    <div data-testid="hospitality-archetype" className="vela-card mt-12 p-6 md:p-7">
      <div className="grid md:grid-cols-12 gap-5 items-center">
        <div className="md:col-span-7">
          <div className="kicker-bronze">Hospitality Archetype</div>
          <h3 className="font-display text-[1.4rem] md:text-[1.55rem] tracking-[-0.025em] leading-[1.15] mt-2">
            <span className="text-[#52525B]">Currently:</span> {arch.current}.
          </h3>
          <h3 className="font-display text-[1.4rem] md:text-[1.55rem] tracking-[-0.025em] leading-[1.15] mt-1.5">
            <span className="text-[#B8956A]">Potential:</span> {arch.potential}.
          </h3>
          <p className="mt-3 text-[12px] text-[#52525B] font-light max-w-md leading-relaxed">
            Propul8 reads the asset's positioning today and the identity it can credibly hold post-transformation —
            the gap between the two is where revenue lives.
          </p>
        </div>
        <div className="md:col-span-5 flex md:justify-end">
          <div className="font-mono-tight text-[10px] uppercase tracking-[0.22em] text-[#52525B] flex items-center gap-2">
            <Target size={12} strokeWidth={1.4} className="text-[#B8956A]" />
            Identity Transformation
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketBenchmarkPosition({ property }) {
  const rows = useMemo(() => computeBenchmarkRows(property), [property]);
  const market = rows[0]?.market_label || 'Mediterranean';
  const lagging = rows.filter((r) => r.status === 'lagging').length;

  return (
    <>
      <SectionHeader kicker="Market Benchmark Position" title="Where the asset ranks vs comp-set." icon={Compass} />
      <div data-testid="benchmark-position" className="vela-card p-5 md:p-6">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
          <p className="text-[12px] text-[#52525B] font-light max-w-md leading-relaxed">
            7 operational axes, ranked against the local <span className="text-[#B8956A]">{market}</span> top-decile.
          </p>
          <span className="text-[10px] font-mono-tight uppercase tracking-[0.22em] text-[#52525B]">
            {lagging > 0 ? `${lagging} axes below median — recoverable` : 'Within boutique parameters'}
          </span>
        </div>
        <div className="space-y-3.5">
          {rows.map((r) => (
            <BenchmarkRow key={r.id} row={r} />
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-[#B8956A]/[0.08] text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.22em]">
          Benchmarks computed from Propul8's curated comp-set · refreshed quarterly
        </div>
      </div>
    </>
  );
}

function BenchmarkRow({ row }) {
  const pct = row.percentile;
  const statusColor =
    row.status === 'leader' ? 'text-[#B8956A]' :
    row.status === 'strong' ? 'text-[#09090B]' : 'text-[#B8956A]';
  const barColor =
    row.status === 'leader' ? 'bg-[#B8956A]' :
    row.status === 'strong' ? 'bg-[#09090B]' : 'bg-[#B8956A]';
  return (
    <div className="grid grid-cols-12 items-center gap-3" data-testid={`benchmark-${row.id}`}>
      <div className="col-span-12 md:col-span-3">
        <div className="text-[12px] text-[#09090B]">{row.label}</div>
        <div className="text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.18em] mt-0.5">
          Median {row.unit}{row.median} · Top10 {row.unit}{row.top10}
        </div>
      </div>
      <div className="col-span-9 md:col-span-7">
        <div className="h-[3px] w-full bg-[#B8956A]/[0.08] overflow-hidden relative">
          <div
            className={`h-full ${barColor}`}
            style={{ width: `${pct}%`, transition: 'width 900ms cubic-bezier(0.16,1,0.3,1)' }}
          />
          {/* Top-10% marker */}
          <span className="absolute top-0 bottom-0 w-px bg-[#52525B]" style={{ left: '90%' }} />
        </div>
      </div>
      <div className="col-span-3 md:col-span-2 text-right">
        <span className={`font-mono-tight text-[13px] tracking-[-0.02em] ${statusColor}`}>
          {row.unit}{row.value}{row.unit === '%' ? '' : ''}
        </span>
        <div className="text-[9px] text-[#52525B] font-mono-tight uppercase tracking-[0.2em]">
          P{pct}
        </div>
      </div>
    </div>
  );
}

function ConversionIntelligence({ property }) {
  const heroPhoto = property?.files?.[0]?.external_url || property?.files?.[0]?.storage_path || '';
  const read = computeConversionRead(heroPhoto);
  return (
    <div data-testid="conversion-intelligence" className="vela-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="kicker">Conversion Intelligence</div>
          <h3 className="font-display text-[1.05rem] md:text-[1.15rem] tracking-[-0.025em] mt-1.5">
            Hero image · booking psychology read.
          </h3>
        </div>
        <Eye size={13} strokeWidth={1.4} className="text-[#52525B]" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-px bg-[#B8956A]/[0.07] border border-[#B8956A]/[0.07]">
        <ConvTile label="Clickability" value={`${read.clickability}/100`} />
        <ConvTile label="Warmth" value={`${read.warmth}/100`} />
        <ConvTile label="Luxury Signal" value={`${read.luxury_signal}/100`} accent />
      </div>
      <div className="mt-4 pt-3 border-t border-[#B8956A]/[0.08]">
        <div className="kicker-bronze">Read</div>
        <ul className="mt-2 space-y-1.5">
          {read.flags.map((f) => (
            <li key={f} className="insight-snippet">{f}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ConvTile({ label, value, accent }) {
  return (
    <div className="bg-[#FAFAFA] p-4">
      <div className="kicker text-[9px]">{label}</div>
      <div className={`font-mono-tight text-[14px] mt-1.5 tracking-[-0.04em] ${accent ? 'text-[#B8956A]' : 'text-[#09090B]'}`}>
        {value}
      </div>
    </div>
  );
}

function OperationalFriction({ property }) {
  const rows = computeOperationalFriction(property);
  const dot = (sev) => sev === 'high' ? 'bg-[#B8956A]' : sev === 'medium' ? 'bg-[#52525B]' : 'bg-[#52525B]';
  return (
    <div data-testid="operational-friction" className="vela-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="kicker">Operational Friction</div>
          <h3 className="font-display text-[1.05rem] md:text-[1.15rem] tracking-[-0.025em] mt-1.5">
            Detected hospitality inefficiencies.
          </h3>
        </div>
        <AlertTriangle size={13} strokeWidth={1.4} className="text-[#52525B]" />
      </div>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-12 gap-2.5 border-t border-[#B8956A]/[0.06] pt-3 first:border-t-0 first:pt-0" data-testid={`friction-${r.severity}`}>
            <span className={`mt-1.5 col-span-1 w-1.5 h-1.5 rounded-full ${dot(r.severity)} self-start`} />
            <div className="col-span-11">
              <div className="text-[12.5px] text-[#09090B] leading-snug">{r.label}</div>
              <div className="text-[11px] text-[#52525B] mt-1 font-light leading-relaxed">{r.detail}</div>
              <div className={`text-[9px] font-mono-tight uppercase tracking-[0.2em] mt-1.5 ${r.severity === 'high' ? 'text-[#B8956A]' : 'text-[#52525B]'}`}>
                {r.severity} severity
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
