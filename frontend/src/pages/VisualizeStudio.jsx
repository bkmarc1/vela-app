import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Heart } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { DEMO_PROPERTY } from '../lib/demoProperty';
import { getPathsForRec, pathFamilyForRec } from '../lib/recommendationPaths';
import { useGeneratedConceptImage } from '../lib/useGeneratedConceptImage';

const STAGES = [
  'Reading recommendation context…',
  'Modeling 3 strategic execution paths…',
  'Calibrating cost / complexity / ADR impact…',
  'Rendering propul8al boards…',
];

export default function VisualizeStudio() {
  const params = useParams();
  // Routes can declare `demo` as a literal segment; treat it as a route param
  // by falling back here. Demo route NEVER touches the DB.
  const propertyId = params.propertyId || 'demo';
  const upgradeIdxRaw = params.upgradeIdx;
  const upgradeIndex = Math.max(0, Number.isFinite(Number(upgradeIdxRaw)) ? Number(upgradeIdxRaw) : 0);
  const navigate = useNavigate();

  const [stage, setStage] = useState(0);
  const [concepts, setConcepts] = useState(null);
  const [property, setProperty] = useState(null);
  const [saved, setSaved] = useState(new Set());

  useEffect(() => {
    let cancelled = false;
    const stageInt = setInterval(
      () => setStage((s) => (s < STAGES.length - 1 ? s + 1 : s)),
      900
    );

    (async () => {
      // 1) Resolve the property — demo always resolves locally, never via DB.
      let resolvedProperty = null;
      if (propertyId === 'demo') {
        resolvedProperty = DEMO_PROPERTY;
        // eslint-disable-next-line no-console
        console.log('[Visualize] demo route → using local DEMO_PROPERTY');
      } else {
        try {
          const propRes = await api.get(`/properties/${propertyId}`);
          resolvedProperty = propRes.data || DEMO_PROPERTY;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[Visualize] property fetch failed, falling back to demo', e?.message);
          resolvedProperty = DEMO_PROPERTY;
        }
      }
      if (cancelled) return;

      const upgrades = resolvedProperty?.analysis?.yield_opportunities || [];
      const safeIdx = upgradeIndex < upgrades.length ? upgradeIndex : 0;
      const resolvedUpgrade = upgrades[safeIdx] || DEMO_PROPERTY.analysis.yield_opportunities[0];

      // eslint-disable-next-line no-console
      console.log('[Visualize] resolved →', {
        propertyId,
        upgradeIndex,
        property: resolvedProperty?.name,
        upgrade: resolvedUpgrade?.title,
      });

      setProperty(resolvedProperty);

      // 2) Try AI concept generation; if it fails, render rec-aware paths.
      const recAwareFallback = getPathsForRec(resolvedUpgrade?.title);
      try {
        const visRes = await api.post('/visualize', {
          recommendation: resolvedUpgrade,
          property: {
            name: resolvedProperty.name,
            city: resolvedProperty.city,
            property_type: resolvedProperty.property_type,
            sqm: resolvedProperty.sqm,
            sleeps: resolvedProperty.sleeps,
            nightly_rate: resolvedProperty.nightly_rate,
          },
        });
        if (cancelled) return;
        const got = visRes.data?.concepts;
        // Backend may still return generic archetypes from old prompt cache —
        // ensure each AI concept inherits the strategic frame from the path
        // family if it doesn't already include strategy/execution fields.
        if (Array.isArray(got) && got.length >= 1) {
          const enriched = got.map((c, i) => {
            const localPath = recAwareFallback[i] || recAwareFallback[0];
            return {
              ...localPath,
              ...c,
              // Strategic fields ALWAYS sourced from the curated rec-aware
              // path so output stays operationally aligned to the rec.
              strategy: c.strategy || localPath.strategy,
              execution: c.execution || localPath.execution,
              cost_band: c.cost_band || localPath.cost_band,
              complexity: c.complexity || localPath.complexity,
              disruption: c.disruption || localPath.disruption,
              when_to_choose: c.when_to_choose || localPath.when_to_choose,
              key: localPath.key, // preserve curated key for image cache
              name: localPath.name, // preserve strategic name (not aesthetic)
            };
          });
          setConcepts(enriched);
        } else {
          setConcepts(recAwareFallback);
        }
      } catch (e) {
        if (!cancelled) setConcepts(recAwareFallback);
      } finally {
        clearInterval(stageInt);
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(stageInt);
    };
  }, [propertyId, upgradeIndex]);

  const upgrades = property?.analysis?.yield_opportunities || [];
  const recommendation = upgrades[upgradeIndex < upgrades.length ? upgradeIndex : 0]
    || DEMO_PROPERTY.analysis.yield_opportunities[0];

  return (
    <div data-testid="visualize-studio">
      {/* Header — DARK editorial spread for institutional depth */}
      <div className="bg-[#FAFAFA] border-b border-[#B8956A]/[0.20]">
        <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-8 md:py-10">
          <button
            onClick={() => navigate(`/dashboard/${propertyId}`)}
            className="text-[10px] font-mono-tight uppercase tracking-[0.22em] text-[#E4E4E7] hover:text-[#FAFAFA] flex items-center gap-2 transition-colors"
            data-testid="back-to-dashboard"
          >
            <ArrowLeft size={11} strokeWidth={1.6} /> Back to dashboard
          </button>

          <div className="kicker-bronze mt-6">Visualize · 3 Strategic Paths</div>
          <h1 className="font-display text-lg md:text-[1.6rem] font-medium tracking-[-0.025em] mt-2 leading-[1.1] text-[#FAFAFA]">
            {recommendation?.title || 'Concept Studio'}
          </h1>
          {recommendation?.transformation && (
            <p className="text-[11px] text-[#B8956A] mt-2 font-mono-tight tracking-tight">
              {recommendation.transformation}
            </p>
          )}
          <p className="mt-4 text-[12px] text-[#E4E4E7] font-light leading-relaxed max-w-md">
            Three different execution paths to solve the SAME operational problem —
            each calibrated to a different cost, complexity, and disruption profile.
            The decision is between strategies, not aesthetics.
          </p>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-9 md:py-12">
        {!concepts && (
          <div className="max-w-md space-y-2.5" data-testid="visualize-loading">
            {STAGES.map((s, i) => (
              <div key={s} className={`flex items-center gap-3 transition-opacity duration-500 ${i > stage ? 'opacity-25' : 'opacity-100'}`}>
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${i < stage ? 'bg-[#B8956A]' : i === stage ? 'bg-[#B8956A] animate-pulse' : 'bg-[#09090B]/15'}`} />
                <span className={`text-[12px] font-light ${i === stage ? 'text-[#09090B]' : 'text-[#52525B]'}`}>{s}</span>
              </div>
            ))}
            <div className="mt-6 h-px w-full bg-[#09090B]/[0.06] relative overflow-hidden max-w-sm">
              <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#B8956A] to-transparent animate-[slide_2.4s_ease-in-out_infinite]" />
            </div>
          </div>
        )}

        {concepts && (
          <div className="grid lg:grid-cols-3 gap-3" data-testid="concept-grid">
            {concepts.map((c, idx) => (
              <ConceptCard
                key={c.key || idx}
                concept={c}
                property={property}
                letter={String.fromCharCode(65 + idx)}
              isSaved={saved.has(c.key)}
              onSave={() => {
                setSaved((prev) => {
                  const next = new Set(prev);
                  next.has(c.key) ? next.delete(c.key) : next.add(c.key);
                  return next;
                });
                toast.success(saved.has(c.key) ? 'Concept removed from saved' : 'Concept saved');
              }}
              onSelect={() => navigate(`/workspace/${propertyId}/${upgradeIndex}/${c.key}`)}
              onCompare={() => toast('Compare flow coming next iteration')}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

function ConceptCard({ concept, property, letter, isSaved, onSave, onSelect, onCompare }) {
  const { src, loading } = useGeneratedConceptImage(concept, property);
  return (
    <article
      data-testid={`concept-card-${concept.key}`}
      data-concept-key={concept.key}
      id={concept.key}
      className="vela-card flex flex-col overflow-hidden hover:translate-y-[-1px] transition-transform"
    >
      {/* Bare-slug marker so external regressions can target by key alone. */}
      <span data-testid={concept.key} className="sr-only">{concept.key}</span>
      <div className="aspect-[4/3] relative overflow-hidden bg-[#E4E4E7]">
        <img src={src} alt={concept.name} className="w-full h-full object-cover transition-opacity duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FAFAFA] via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="font-mono-tight text-[9px] uppercase tracking-[0.22em] text-[#09090B] bg-[#FAFAFA]/70 backdrop-blur-xl border border-white/10 px-2 py-1">
            Concept {letter}
          </span>
          {loading && (
            <span className="font-mono-tight text-[9px] uppercase tracking-[0.22em] text-[#09090B] bg-[#FAFAFA]/70 backdrop-blur-xl border border-white/10 px-2 py-1 flex items-center gap-1.5" data-testid={`generating-${concept.key}`}>
              <span className="w-1 h-1 rounded-full bg-[#B8956A] animate-pulse" />
              Generating
            </span>
          )}
        </div>
        {concept.palette && (
          <div className="absolute bottom-2.5 right-2.5 flex gap-1">
            {concept.palette.map((c, i) => (
              <span key={i} className="w-3 h-3 border border-[#09090B]/15" style={{ background: c }} />
            ))}
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-[14px] tracking-[-0.02em] leading-tight">{concept.name}</h3>
          <span className="text-[9px] font-mono-tight uppercase tracking-[0.18em] text-[#B8956A] shrink-0">
            {concept.adr_uplift_pct ? `+${concept.adr_uplift_pct}%` : ''}
          </span>
        </div>
        {concept.strategy && (
          <p className="text-[11.5px] text-[#09090B] mt-2 leading-relaxed font-light" data-testid={`strategy-${concept.key}`}>
            {concept.strategy}
          </p>
        )}

        {concept.intel && (
          <div className="insight-snippet mt-3" data-testid={`intel-${concept.key}`}>
            {concept.intel}
          </div>
        )}

        {/* Operational read — cost, complexity, disruption */}
        <div className="mt-4 grid grid-cols-3 gap-px bg-[#B8956A]/[0.07] border border-[#B8956A]/[0.07]">
          <PathCell label="Cost" value={concept.cost_band || '—'} accent />
          <PathCell label="Complexity" value={concept.complexity || '—'} />
          <PathCell label="Downtime" value={concept.disruption?.split(' ')?.slice(0, 2).join(' ') || '—'} />
        </div>

        {concept.when_to_choose && (
          <div className="mt-3 pt-3 border-t border-[#B8956A]/[0.08]">
            <div className="kicker-bronze">When To Choose</div>
            <p className="text-[11px] text-[#52525B] mt-1.5 font-light leading-relaxed">
              {concept.when_to_choose}
            </p>
          </div>
        )}

        {/* Financial read */}
        <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-[#B8956A]/[0.08]">
          <div>
            <div className="kicker text-[9px]">Current ADR</div>
            <div className="font-mono-tight text-[11px] text-[#52525B] mt-1">€{concept.current_adr ?? '—'}</div>
          </div>
          <div>
            <div className="kicker text-[9px]">Projected</div>
            <div className="font-mono-tight text-[11px] text-[#09090B] mt-1">€{concept.projected_adr ?? '—'}</div>
          </div>
          <div>
            <div className="kicker text-[9px]">Annual</div>
            <div className="font-mono-tight text-[11px] text-[#B8956A] mt-1">+€{(concept.annual_uplift ?? 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#B8956A]/[0.08] flex flex-wrap items-center gap-2">
          <button onClick={onSelect} data-testid={`select-${concept.key}`} className="vela-btn">
            Select Strategy <ArrowUpRight size={11} strokeWidth={1.6} />
          </button>
          <button onClick={onCompare} className="action-pill" data-testid={`compare-${concept.key}`}>Compare</button>
          <button onClick={onSave} className="action-pill" data-testid={`save-${concept.key}`}>
            <Heart size={10} strokeWidth={1.6} fill={isSaved ? '#09090B' : 'transparent'} />
            {isSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </article>
  );
}

function PathCell({ label, value, accent }) {
  return (
    <div className="bg-[#FAFAFA] p-3">
      <div className="kicker text-[9px]">{label}</div>
      <div className={`font-mono-tight text-[11px] mt-1 tracking-[-0.02em] ${accent ? 'text-[#B8956A]' : 'text-[#09090B]'}`}>
        {value}
      </div>
    </div>
  );
}
