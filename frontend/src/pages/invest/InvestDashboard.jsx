import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Sparkles, Pencil, Shield } from 'lucide-react';

import { computeInvestIntelligence } from '../../lib/investIntelligence';
import { computeInvestWWVD } from '../../lib/wwvdEngine';
import { INVEST_DEMO_INPUT, INVEST_DEMO_ANALYSIS, INVEST_NEGOTIATE_INPUT, INVEST_NEGOTIATE_ANALYSIS } from '../../lib/investDemo';
import {
  EditInputsPanel, fmtEUR,
} from '../../components/invest/dashboard/InvestChrome';
import VerifyChecklist     from '../../components/invest/dashboard/VerifyChecklist';
import InvestThinking      from '../../components/invest/dashboard/InvestThinking';
import InvestOpener        from '../../components/invest/dashboard/InvestOpener';
import UnreadableListing   from '../../components/shared/UnreadableListing';
import ConfirmPropertyData from '../../components/shared/ConfirmPropertyData';
import AcquisitionHero       from '../../components/invest/dashboard/AcquisitionHero';
import WhyVerdict            from '../../components/invest/dashboard/WhyVerdict';
import AccordionSection      from '../../components/invest/dashboard/AccordionSection';
import HighestPerformingVersion from '../../components/invest/dashboard/HighestPerformingVersion';
import DealScoreBreakdown   from '../../components/invest/dashboard/DealScoreBreakdown';
import DealRoadmap          from '../../components/invest/dashboard/DealRoadmap';
import WhatToDoNext         from '../../components/invest/dashboard/WhatToDoNext';
import BetterDealFinder     from '../../components/invest/dashboard/BetterDealFinder';
import WWVDPanel             from '../../components/shared/WWVDPanel';
import FinalVerdictSection   from '../../components/invest/dashboard/FinalVerdictSection';
import SnapshotSection       from '../../components/invest/dashboard/SnapshotSection';
import OfferSection          from '../../components/invest/dashboard/OfferSection';
import ROISection            from '../../components/invest/dashboard/ROISection';
import TransformationSection from '../../components/invest/dashboard/TransformationSection';
import NegotiationSection    from '../../components/invest/dashboard/NegotiationSection';
import MarketSignalsSection  from '../../components/invest/dashboard/MarketSignalsSection';
import STRCompsSection       from '../../components/invest/dashboard/STRCompsSection';
import MaxBuyPriceSection    from '../../components/invest/dashboard/MaxBuyPriceSection';
import SourceLedger          from '../../components/shared/SourceLedger';
import LocationScoreCard     from '../../components/shared/LocationScoreCard';
import { buildAddressFromInput } from '../../components/shared/LocationIntelligenceSection';
import { buildInvestProvenance } from '../../lib/dataProvenance';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MANUAL_DEFAULTS = {
  asset_id: 'manual',
  url: '',
  title: '',
  city: 'Athens',
  property_type: 'Apartment',
  asking_price_eur: 149000,
  m2: 75,
  rooms: 2,
  renovation_state: 'refresh',
  elevator: false,
  year_built: 1980,
  images: [],
};

export default function InvestDashboard() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  // Demo route bypasses verification — its data is fully verified by design.
  const [verified, setVerified] = useState(assetId === 'demo' || assetId === 'manual' || assetId === 'negotiate');
  // CONFIRMING stage — user must approve extracted data before analysis.
  // Demo + manual routes skip this; URL paste must traverse it.
  const [confirming, setConfirming] = useState(false);
  // Progressive disclosure — Full analysis hidden behind toggles by default.
  const [showFull, setShowFull] = useState(false);
  // Once the user mutates inputs on /demo, fall through the regular compute
  // path instead of returning the cached INVEST_DEMO_ANALYSIS.
  const [mutated, setMutated] = useState(false);
  // Cinematic intro stages. Skipped for `manual` (interactive editing flow).
  const INTRO = { THINKING: 'thinking', OPENER: 'opener', DONE: 'done' };
  const [introStage, setIntroStage] = useState(
    assetId === 'manual' ? INTRO.DONE : INTRO.THINKING,
  );
  const handleDraftChange = (next) => { setDraft(next); setMutated(true); };

  // Hydrate input from route param.
  useEffect(() => {
    if (assetId === 'demo') {
      setDraft({ ...INVEST_DEMO_INPUT, _confidence: { asking_price_eur: 'verified', m2: 'verified', city: 'verified', rooms: 'verified' } });
      return undefined;
    }
    if (assetId === 'negotiate') {
      // NEGOTIATE-band preset — surfaces the Smart-Buy Envelope flow.
      setDraft(INVEST_NEGOTIATE_INPUT);
      return undefined;
    }
    if (assetId === 'manual') {
      setDraft(MANUAL_DEFAULTS);
      setEditing(true);
      return undefined;
    }
    if (assetId && assetId.startsWith('dft_')) {
      let cancelled = false;
      (async () => {
        try {
          const { data } = await axios.get(`${API}/invest/draft/${assetId}`);
          if (cancelled) return;
          const d = data || {};
          const next = {
            asset_id: assetId,
            url: d.url || '',
            title: d.title || 'Untitled property',
            city: d.city ?? null,
            property_type: d.property_type ?? null,
            asking_price_eur: d.asking_price_eur ?? null,
            m2: d.m2 ?? null,
            rooms: d.rooms ?? null,
            bathrooms: d.bathrooms ?? null,
            floor: d.floor ?? null,
            energy_class: d.energy_class ?? null,
            parking: d.parking ?? null,
            renovation_state: d.renovation_state ?? null,
            elevator: typeof d.elevator === 'boolean' ? d.elevator : null,
            year_built: d.year_built ?? null,
            listing_source: d.listing_source ?? 'Listing source',
            images: d.images || [],
            _confidence: d._confidence || {},
          };
          // Honest extraction — Propul8 never invents numbers. If critical
          // fields (price · sqm · city · rooms) are missing OR the source
          // was bot-blocked, surface the UnreadableListing recovery flow
          // with 4 honest paths: Retry · Paste text · Upload screenshots ·
          // Enter manually. No more silent Athens defaults.
          const BLOCK_TITLES = [
            'pardon our interruption', 'just a moment', 'access denied',
            'are you a robot', 'captcha', 'checking your browser',
          ];
          if (next.title && BLOCK_TITLES.some((s) => next.title.toLowerCase().includes(s))) {
            next.title = null;
          }
          // €/m² only computes when both inputs are present + trustworthy.
          if (next.asking_price_eur && next.m2) {
            next.price_per_sqm_eur = Math.round(next.asking_price_eur / next.m2);
            const priceFlag = next._confidence.asking_price_eur;
            const m2Flag    = next._confidence.m2;
            next._confidence.price_per_sqm_eur =
              (priceFlag === 'verified' || priceFlag === 'user_verified') &&
              (m2Flag === 'verified' || m2Flag === 'user_verified')
                ? 'calculated'
                : 'needs_review';
          }
          // Read backend bot_blocked + critical-field state from the draft.
          next.bot_blocked = !!d.bot_blocked;
          next.extraction_debug = d.extraction_debug || null;
          const critOk = ['asking_price_eur', 'm2', 'city', 'rooms'].every((k) => {
            const v = next[k];
            return v !== null && v !== undefined && v !== '' && v !== 0;
          });
          setDraft(next);
          // Strict CONFIRM-FIRST flow:
          //   • extraction succeeded → show ConfirmPropertyData (user verifies)
          //   • extraction failed    → show UnreadableListing (4 recovery paths)
          // Never auto-analyse without explicit user confirmation.
          if (critOk && !next.bot_blocked) {
            setConfirming(true);
            setVerified(false);
          } else {
            setVerified(false);
          }
        } catch (e) {
          if (!cancelled) navigate('/invest');
        }
      })();
      return () => { cancelled = true; };
    }
    navigate('/invest');
    return undefined;
  }, [assetId, navigate]);

  // Compute the analysis deterministically every time draft changes.
  // Only after verification — Propul8 never calculates from unverified data.
  const analysis = useMemo(() => {
    if (!draft || !verified) return null;
    if (assetId === 'demo' && !mutated) return INVEST_DEMO_ANALYSIS;
    if (assetId === 'negotiate' && !mutated) return INVEST_NEGOTIATE_ANALYSIS;
    // Provide safe defaults for compute (only after verification, so price/m2 are present).
    return computeInvestIntelligence({
      ...draft,
      // Backfill non-critical defaults for compute. These are clearly labelled
      // as 'default assumption' in the source-transparency layer below.
      renovation_state: draft.renovation_state || 'refresh',
      property_type:    draft.property_type || 'Apartment',
      year_built:       draft.year_built || 1985,
      elevator:         draft.elevator ?? false,
    });
  }, [assetId, draft, verified, mutated]);

  if (!draft) {
    return (
      <div className="vela-invest min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Sparkles size={20} className="mx-auto mb-3 inv-pulse" style={{ color: 'var(--inv-accent-bronze)' }} />
          <div className="inv-kicker">Loading investor intelligence…</div>
        </div>
      </div>
    );
  }

  // GATE — verification step is mandatory for non-demo / non-manual routes.
  // CONFIRM FIRST — user must explicitly approve extracted data before
  // analysis runs. Skipped for /demo and /manual routes.
  if (confirming && draft) {
    return (
      <ConfirmPropertyData
        input={draft}
        mode="invest"
        theme="dark"
        onConfirm={(confirmed) => {
          setDraft({ ...draft, ...confirmed });
          setConfirming(false);
          setVerified(true);
          setIntroStage(INTRO.THINKING);
        }}
        onBack={() => navigate('/invest')}
      />
    );
  }

  if (!verified) {
    // Honest path: when extraction failed OR critical fields are missing,
    // show the UnreadableListing recovery. No fake numbers.
    if (draft && draft.url && (draft.bot_blocked || !draft.asking_price_eur || !draft.m2 || !draft.city || !draft.rooms)) {
      return (
        <UnreadableListing
          url={draft.url}
          source={draft.listing_source}
          debug={draft.extraction_debug}
          theme="dark"
          apiBase={process.env.REACT_APP_BACKEND_URL}
          onParsedAi={(parsed) => {
            // AI returned structured data → route through ConfirmPropertyData.
            const next = {
              ...draft,
              title: parsed.title || draft.title,
              city: parsed.city || draft.city,
              neighborhood: parsed.neighborhood || draft.neighborhood,
              asking_price_eur: parsed.asking_price_eur || draft.asking_price_eur,
              m2: parsed.m2 || draft.m2,
              rooms: parsed.rooms || draft.rooms,
              bathrooms: parsed.bathrooms || draft.bathrooms,
              year_built: parsed.year_built || draft.year_built,
              property_type: parsed.property_type || draft.property_type,
              renovation_state: parsed.renovation_state || draft.renovation_state,
              pool: typeof parsed.pool === 'boolean' ? parsed.pool : draft.pool,
              garden: typeof parsed.garden === 'boolean' ? parsed.garden : draft.garden,
              listing_source: parsed.listing_source || draft.listing_source,
              raw_excerpt: parsed.raw_excerpt || draft.raw_excerpt,
              bot_blocked: false,
              extraction_debug: parsed.extraction_debug || draft.extraction_debug,
              _confidence: { ...(draft._confidence || {}), ...(parsed._confidence || {}) },
            };
            setDraft(next);
            setConfirming(true);
            setVerified(false);
          }}
          onRetry={async () => {
            try {
              const r = await axios.post(`${API}/invest/ingest`, { url: draft.url });
              const d = r.data || {};
              const next = {
                ...draft,
                title: d.title || draft.title,
                city: d.city || draft.city,
                asking_price_eur: d.asking_price_eur || draft.asking_price_eur,
                m2: d.m2 || draft.m2,
                rooms: d.rooms || draft.rooms,
                bathrooms: d.bathrooms || draft.bathrooms,
                bot_blocked: !!d.bot_blocked,
                extraction_debug: d.extraction_debug || null,
                _confidence: { ...(draft._confidence || {}), ...(d._confidence || {}) },
                images: d.images && d.images.length ? d.images : (draft.images || []),
              };
              setDraft(next);
              const ok = ['asking_price_eur', 'm2', 'city', 'rooms'].every((k) => next[k]);
              setVerified(ok);
              if (ok) setIntroStage(INTRO.THINKING);
            } catch (e) {
              /* keep user on screen */
            }
          }}
          onManualEntry={(entered) => {
            setDraft({ ...draft, ...entered });
            setVerified(true);
            setIntroStage(INTRO.THINKING);
          }}
          onPasteText={(text) => {
            // Stub: route user to manual entry pre-filled with whatever
            // heuristics we can pull from the pasted text. For Phase A we
            // just open the EditInputsPanel.
            setDraft({ ...draft, raw_pasted_text: text });
            setEditing(true);
            setVerified(true);
          }}
        />
      );
    }
    return (
      <div className="vela-invest" data-testid="invest-dashboard">
        <TopUtilityBar
          navigate={navigate}
          analysisVersion="invest-v1.0 · pending verification"
          editing={false}
          onEdit={() => {}}
          showEdit={false}
        />
        <VerifyChecklist
          draft={draft}
          draftId={assetId}
          onVerified={(updated) => {
            setDraft(updated);
            setVerified(true);
            // After verification, run the cinematic intro before dashboard reveal.
            setIntroStage(INTRO.THINKING);
          }}
        />
      </div>
    );
  }

  // CINEMATIC INTRO — Live AI thinking (7 phases) → Propul8 INDEX opener.
  // Shown post-verification (or immediately for /demo) before dashboard reveal.
  if (analysis && introStage === INTRO.THINKING) {
    return (
      <InvestThinking onComplete={() => setIntroStage(INTRO.OPENER)} />
    );
  }
  if (analysis && introStage === INTRO.OPENER) {
    return (
      <InvestOpener
        analysis={analysis}
        onContinue={() => setIntroStage(INTRO.DONE)}
      />
    );
  }

  const { input, snapshot, offer_intelligence, true_roi, transformation, negotiation, market_signals, str_comps, max_buy_price } = analysis;

  return (
    <div className="vela-invest" data-testid="invest-dashboard">
      {/* TOP UTILITY BAR ─────────────────────────────────────────────── */}
      <TopUtilityBar
        navigate={navigate}
        analysisVersion={analysis.analysis_version}
        editing={editing}
        onEdit={() => setEditing((e) => !e)}
        showEdit
        verified={verified}
      />

      {editing && (
        <EditInputsPanel
          draft={draft}
          onChange={handleDraftChange}
          onClose={() => setEditing(false)}
        />
      )}

      {/* ACQUISITION HERO — the single elegant summary card */}
      <AcquisitionHero analysis={analysis} asset_id={analysis.asset_id} />

      {/* WHY · STRENGTH · RISK — 3 calm advisor bullets */}
      <WhyVerdict bullets={analysis.acquisition_hero?.why_bullets} />

      {/* LOCATION SCORE PILL — sits visually adjacent to the verdict strip */}
      {(buildAddressFromInput(input) || input?.lat) && (
        <section
          className="py-4 border-b"
          style={{ borderColor: 'var(--inv-border)', background: 'var(--inv-bg-deep, #FAFAFA)' }}
        >
          <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex items-center gap-3 flex-wrap">
            <LocationScoreCard input={input} variant="pill" testId="invest-location-pill" />
          </div>
        </section>
      )}

      {/* PROGRESSIVE DISCLOSURE — by default the user sees ONLY the
          hero + 5-card decision strip + 3 advisor bullets above.
          Deeper accordion analysis is locked behind 4 minimal toggles:
            View Numbers · View Comparables · View Sources · View Full Report.
          This matches the user's "10-second read" minimalism brief. */}
      <DetailToggles
        showFull={showFull}
        onShow={() => setShowFull(true)}
      />

      {showFull && (
        <>
          <FullAnalysisHeader />

          <AccordionSection
            id="invest-section-strategy"
            kicker="Strategy"
            title="Top 3 conviction actions"
            summary="What to do first."
            testIdPrefix=""
          >
            <WWVDPanel
              actions={computeInvestWWVD({ analysis, input })}
              theme="dark"
              testIdPrefix="invest"
            />
          </AccordionSection>

          <AccordionSection
            id="invest-section-yield"
            kicker="Yield"
            title="True ROI"
            summary="Net cashflow after all expenses."
            testIdPrefix=""
          >
            <ROISection true_roi={true_roi} snapshot={snapshot} />
          </AccordionSection>

          <AccordionSection
            id="invest-section-risks"
            kicker="Risks"
            title="Negotiation levers"
            summary="Discount levers + top risks."
            testIdPrefix=""
      >
        <NegotiationSection negotiation={negotiation} />
      </AccordionSection>

      <AccordionSection
        id="invest-section-comparables"
        kicker="Comparables"
        title="STR comp set"
        summary="Nearest 5 comps + market signals."
        testIdPrefix=""
      >
        <STRCompsSection      str_comps={str_comps} />
        <MarketSignalsSection market_signals={market_signals} />
      </AccordionSection>

      <AccordionSection
        id="invest-section-renovation"
        kicker="Renovation"
        title="3 transformation scenarios"
        summary="Conservative · Calibrated · Premium."
        testIdPrefix=""
      >
        <TransformationSection transformation={transformation} />
        <HighestPerformingVersion hpv={analysis.highest_performing_version} />
      </AccordionSection>

      <AccordionSection
        id="invest-section-due-diligence"
        kicker="Due Diligence"
        title="Deal roadmap"
        summary="Agent questions + DD checklist."
        testIdPrefix=""
      >
        <DealRoadmap roadmap={analysis.deal_roadmap} />
        <WhatToDoNext
          next={analysis.what_to_do_next}
          verdict={analysis.deal_verdict.verdict}
        />
      </AccordionSection>

      <AccordionSection
        id="invest-section-exit"
        kicker="Exit Strategy"
        title="Max-buy ceiling"
        summary="Offer envelope · walkaway price."
        testIdPrefix=""
      >
        <MaxBuyPriceSection max_buy_price={max_buy_price} input={input} />
        <OfferSection       offer_intelligence={offer_intelligence} input={input} />
      </AccordionSection>

      <AccordionSection
        id="invest-section-deal-score"
        kicker="Deal Score"
        title="8-dimension scorecard"
        summary="Composite acquisition grade."
        testIdPrefix=""
      >
        <DealScoreBreakdown
          scores={analysis.deal_score_breakdown}
          composite={analysis.vela_invest_index}
        />
      </AccordionSection>

      <AccordionSection
        id="invest-section-snapshot"
        kicker="Underwriting"
        title="Asset snapshot"
        summary="Liquidity · seasonality · pricing power · design upside."
        testIdPrefix=""
      >
        <SnapshotSection snapshot={snapshot} />
      </AccordionSection>

      <AccordionSection
        id="invest-section-source-ledger"
        kicker="Source Ledger"
        title="Per-field provenance · lock verified data"
        summary="Every field. Every source. Locked when you say so."
        testIdPrefix=""
      >
        <SourceLedger
          provenance={buildInvestProvenance(input)}
          asset_id={analysis.asset_id || 'demo'}
        />
      </AccordionSection>

      {(analysis.deal_verdict.verdict === 'PASS' || analysis.deal_verdict.verdict === 'WATCH') && (
        <AccordionSection
          id="invest-section-better-deals"
          kicker="Alternative Deals"
          title="Where the trade clears"
          summary="Six better acquisition pathways."
          defaultOpen={analysis.deal_verdict.verdict === 'PASS'}
          testIdPrefix=""
        >
          <BetterDealFinder
            alternatives={analysis.better_deal_alternatives}
            verdict={analysis.deal_verdict.verdict}
          />
        </AccordionSection>
      )}

      <AccordionSection
            id="invest-section-final-verdict"
            kicker="IC Recap"
            title="Final verdict"
            summary="The one-liner for investment committee."
            testIdPrefix=""
          >
            <FinalVerdictSection
              verdict={analysis.deal_verdict}
              analysis={analysis}
              input={input}
            />
          </AccordionSection>
        </>
      )}
    </div>
  );
}

function FullAnalysisHeader() {
  return (
    <div
      className="border-b"
      style={{
        background: 'var(--inv-bg-deep, #FAFAFA)',
        borderColor: 'var(--inv-border)',
      }}
      data-testid="invest-full-analysis-header"
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-7 flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <span
            className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
            style={{ color: 'var(--inv-accent-bronze)' }}
          >
            Full Analysis
          </span>
          <div
            className="inv-display font-medium mt-1.5"
            style={{
              fontSize: 'clamp(18px, 1.9vw, 22px)',
              color: 'var(--inv-text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            Deeper analysis below.
          </div>
        </div>
        <span
          className="font-mono-tight text-[11px]"
          style={{ color: 'var(--inv-text-muted)' }}
        >
          Optional · the summary above is enough.
        </span>
      </div>
    </div>
  );
}

// Minimal toggle strip — 4 expand options matching the user's brief:
//   View Numbers · View Comparables · View Sources · View Full Report.
// Each toggle simply unfolds the existing accordion stack. Once any toggle
// fires we set showFull=true and the stack renders below. No multi-state
// drawer logic; staying simple keeps the brand minimal.
function DetailToggles({ showFull, onShow }) {
  if (showFull) return null;
  const OPTS = [
    { id: 'numbers',     label: 'View Numbers' },
    { id: 'comparables', label: 'View Comparables' },
    { id: 'sources',     label: 'View Sources' },
    { id: 'full',        label: 'View Full Report' },
  ];
  return (
    <div
      className="border-b border-t"
      style={{ borderColor: 'var(--inv-border)', background: 'var(--inv-bg-deep, #FAFAFA)' }}
      data-testid="invest-detail-toggles"
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-6 flex flex-wrap items-center gap-3">
        <span
          className="font-mono-tight text-[10px] tracking-[0.22em] uppercase mr-3"
          style={{ color: 'var(--inv-text-muted)' }}
        >
          Details
        </span>
        {OPTS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={onShow}
            className="px-4 py-2 text-[11px] tracking-[0.10em] uppercase transition-colors hover:opacity-80"
            style={{
              background: 'transparent',
              color: 'var(--inv-text-secondary)',
              border: '1px solid var(--inv-border)',
              borderRadius: 4,
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer',
            }}
            data-testid={`invest-toggle-${o.id}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TopUtilityBar({ navigate, analysisVersion, editing, onEdit, showEdit, verified }) {
  return (
    <div className="border-b" style={{ borderColor: 'var(--inv-border)' }}>
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-14 flex items-center justify-between">
        <button
          onClick={() => navigate('/invest')}
          className="flex items-center gap-2 text-[12px] font-mono-tight"
          style={{ color: 'var(--inv-text-secondary)' }}
          data-testid="invest-back-btn"
        >
          <ArrowLeft size={13} />
          Propul8 INVEST · INDEX
        </button>
        <div className="flex items-center gap-3">
          {verified && (
            <span
              className="inv-pill"
              style={{
                color: 'var(--inv-signal-up)',
                borderColor: 'rgba(125,191,143,0.30)',
              }}
              data-testid="invest-verified-pill"
            >
              <Shield size={9} strokeWidth={1.8} />
              Listing verified
            </span>
          )}
          <span className="inv-pill inv-pill--neutral">
            <span
              className="inline-block w-1 h-1 rounded-full inv-pulse"
              style={{ background: 'var(--inv-accent-bronze)' }}
            />
            {analysisVersion}
          </span>
          {showEdit && (
            <button
              onClick={onEdit}
              className="inv-btn-ghost"
              data-testid="invest-edit-input-btn"
            >
              <Pencil size={11} />
              {editing ? 'Close' : 'Edit Inputs'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
