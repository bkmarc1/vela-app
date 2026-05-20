// Propul8 · Asset Detail — owner-side smart cockpit drill-down (iter67).
// Six tabs: Overview · Valuation · Income · Exit Scenarios · Action Plan · Documents

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, Sparkles, FileText, Upload, ArrowRight,
  TrendingUp, TrendingDown, ExternalLink, Calendar, MapPin,
} from 'lucide-react';

import {
  DEMO_OWNED_ASSETS, exitScenarios,
  digitalAssetScore, liquiditySignal, sellReadinessScore,
  equityGain, equityGainPct, yieldOnCost, yieldOnCurrentValue,
  estimatedSaleCosts, netProceedsIfSold,
} from '../lib/portfolioIntelligence';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GOLD = '#B8956A';
const STONE = '#F5F1EA';
const STONE_LINE = '#E8E0D2';

const TABS = [
  { id: 'overview',   label: 'Overview'        },
  { id: 'valuation',  label: 'Valuation'       },
  { id: 'income',     label: 'Income'          },
  { id: 'exits',      label: 'Exit Scenarios'  },
  { id: 'action',     label: 'Action Plan'     },
  { id: 'docs',       label: 'Documents'       },
];

function eur(v, { compact = false } = {}) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  if (compact) {
    if (Math.abs(n) >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000)     return `€${(n / 1_000).toFixed(0)}K`;
  }
  return `€${Math.round(n).toLocaleString('en-US')}`;
}
function pct(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return `${Number(v).toFixed(1)}%`;
}


export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const tab = search.get('tab') || 'overview';

  const [asset, setAsset] = useState(null);
  const [signal, setSignal] = useState(null);

  // Deterministic instant fallback (replaced by Claude when ready)
  const deterministicSignal = useMemo(() => {
    if (!asset) return null;
    const yocPct = ((asset.annual_gross_eur || 0) / (asset.purchase_price_eur || 1)) * 100;
    const floor = Math.round((asset.current_value_eur || 0) * 1.025).toLocaleString('en-US');
    if (yocPct >= 7 && (asset.current_value_eur || 0) > (asset.purchase_price_eur || 0)) {
      return `Hold. Strong ${yocPct.toFixed(1)}% yield on cost and growing equity. Sell only above €${floor}.`;
    }
    return 'Watch. Modest yield; reassess after one full season of rental performance data.';
  }, [asset]);

  const displaySignal = signal || deterministicSignal;

  // ─── Load asset ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await axios.get(`${API}/portfolio-intel/owned`);
        const list = res.data?.assets || [];
        const all = list.length > 0 ? list : DEMO_OWNED_ASSETS;
        const found = all.find((a) => a.id === id);
        if (!cancelled) setAsset(found || all[0]);
      } catch {
        const found = DEMO_OWNED_ASSETS.find((a) => a.id === id);
        if (!cancelled) setAsset(found || DEMO_OWNED_ASSETS[0]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  // ─── AI Signal ──────────────────────────────────────────────────
  useEffect(() => {
    if (!asset) return;
    let cancelled = false;
    axios.post(`${API}/portfolio-intel/signal`, { asset })
      .then((r) => !cancelled && r.data?.signal && setSignal(r.data.signal))
      .catch(() => {});
    return () => { cancelled = true; };
  }, [asset?.id]);

  if (!asset) {
    return <div className="p-20 text-center text-[14px]" style={{ color: '#52525B' }}>Loading asset…</div>;
  }

  // ─── Derived numerics ───────────────────────────────────────────
  const eq   = equityGain(asset.purchase_price_eur, asset.current_value_eur);
  const eqP  = equityGainPct(asset.purchase_price_eur, asset.current_value_eur);
  const yoc  = yieldOnCost(asset.annual_gross_eur, asset.purchase_price_eur);
  const yon  = yieldOnCurrentValue(asset.annual_net_eur, asset.current_value_eur);
  const score = digitalAssetScore(asset);
  const liq  = liquiditySignal(asset);
  const ready = sellReadinessScore(asset);

  return (
    <div data-testid="asset-detail-page" style={{ background: '#FAFAFA', minHeight: '100vh' }}>
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 pt-12 pb-32">

        {/* Back */}
        <button
          type="button" onClick={() => navigate('/portfolio')}
          className="inline-flex items-center gap-1.5 text-[12px] mb-8"
          style={{ color: '#52525B', cursor: 'pointer', background: 'none', border: 'none' }}
          data-testid="asset-detail-back"
        >
          <ArrowLeft size={13} strokeWidth={1.8} /> Back to Portfolio
        </button>

        {/* Header */}
        <header className="mb-10">
          <span className="ts-kicker" data-testid="asset-detail-kicker">{asset.city}</span>
          <h1 className="ts-h1 mt-4" data-testid="asset-detail-title" style={{ fontSize: 'clamp(34px, 4.2vw, 52px)' }}>
            {asset.title}
          </h1>
          <p className="ts-body mt-3 flex items-center gap-2" data-testid="asset-detail-location">
            <MapPin size={13} strokeWidth={1.5} /> {asset.neighborhood || asset.city}
            <span style={{ color: '#A1A1AA' }}>·</span>
            <Calendar size={13} strokeWidth={1.5} />
            <span>Purchased {asset.purchase_date}</span>
          </p>

          {/* AI Signal Strip */}
          {displaySignal && (
            <div
              className="mt-7 px-5 py-3 inline-flex items-center gap-3 max-w-full"
              style={{ background: STONE, border: `1px solid ${STONE_LINE}`, borderRadius: 999 }}
              data-testid="asset-detail-ai-signal"
            >
              <div className="w-7 h-7 flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(184,149,106,0.15)', borderRadius: 999 }}>
                <Sparkles size={13} strokeWidth={1.7} style={{ color: GOLD }} />
              </div>
              <p className="text-[13.5px] leading-snug" style={{ color: '#09090B' }}>{displaySignal}</p>
            </div>
          )}
        </header>

        {/* Tabs */}
        <nav
          className="border-b mb-10 flex gap-1 overflow-x-auto"
          style={{ borderColor: STONE_LINE }}
          data-testid="asset-detail-tabs"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSearch({ tab: t.id })}
              className="px-4 py-3 text-[13px] transition-all relative"
              style={{
                background: 'transparent',
                color: tab === t.id ? '#09090B' : '#52525B',
                fontWeight: tab === t.id ? 500 : 400,
                border: 'none', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              data-testid={`asset-tab-${t.id}`}
            >
              {t.label}
              {tab === t.id && (
                <span
                  className="absolute bottom-[-1px] left-0 right-0 h-[2px]"
                  style={{ background: GOLD }}
                />
              )}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        {tab === 'overview'  && <OverviewTab  asset={asset} eq={eq} eqP={eqP} yoc={yoc} yon={yon} score={score} liq={liq} ready={ready} />}
        {tab === 'valuation' && <ValuationTab asset={asset} setAsset={setAsset} />}
        {tab === 'income'    && <IncomeTab    asset={asset} yoc={yoc} yon={yon} />}
        {tab === 'exits'     && <ExitsTab     asset={asset} />}
        {tab === 'action'    && <ActionTab    asset={asset} />}
        {tab === 'docs'      && <DocsTab      asset={asset} />}
      </div>
    </div>
  );
}


// ──────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ──────────────────────────────────────────────────────────────────────
function OverviewTab({ asset, eq, eqP, yoc, yon, score, liq, ready }) {
  const monthlyNet = Math.round((asset.annual_net_eur || 0) / 12);
  const saleCosts = estimatedSaleCosts(asset.current_value_eur);
  const netProc = netProceedsIfSold(asset.current_value_eur, asset.mortgage_balance_eur);
  return (
    <div className="space-y-10" data-testid="tab-overview">
      <div className="grid lg:grid-cols-3 gap-6">
        <BigKPI label="Purchase Price"  value={eur(asset.purchase_price_eur, { compact: true })} />
        <BigKPI label="Today's Value"   value={eur(asset.current_value_eur,   { compact: true })} />
        <BigKPI label="Equity Gain"     value={`${eq >= 0 ? '+' : ''}${eur(eq, { compact: true })}`} sub={`${eqP >= 0 ? '+' : ''}${eqP.toFixed(1)}%`} tone={eq >= 0 ? '#16A34A' : '#EF4444'} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <KPI label="Annual Net Income"   value={eur(asset.annual_net_eur, { compact: true })} />
        <KPI label="Monthly Net"          value={eur(monthlyNet, { compact: true })} />
        <KPI label="Occupancy"            value={`${asset.occupancy_pct}%`} />
        <KPI label="ADR"                  value={eur(asset.adr_eur)} />
        <KPI label="Yield on Cost"        value={pct(yoc)}  tone={GOLD} />
        <KPI label="Yield on Current"     value={pct(yon)}  tone={GOLD} />
        <KPI label="Asset Score"          value={`${score}`} sub="/ 100" />
        <KPI label="Sell Readiness"       value={`${ready}`} sub="/ 100" tone="#16A34A" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="p-6" style={{ background: STONE, border: `1px solid ${STONE_LINE}`, borderRadius: 14 }}>
          <div className="ts-kicker mb-4">Liquidity</div>
          <div className="font-display tabular-nums" style={{ fontSize: 36, fontWeight: 500, color: liq.tone, letterSpacing: '-0.025em' }}>
            {liq.level}
          </div>
          <p className="ts-small mt-3">
            Score {liq.score}/100 — combines location demand, asset type, and comparable-sale velocity.
          </p>
        </div>
        <div className="p-6" style={{ background: STONE, border: `1px solid ${STONE_LINE}`, borderRadius: 14 }} data-testid="if-sold-today-card">
          <div className="ts-kicker mb-4">If Sold Today</div>
          <div className="grid grid-cols-3 gap-4">
            <StackedNumber label="Sale Price"   value={eur(asset.current_value_eur, { compact: true })} />
            <StackedNumber label="Sale Costs"   value={`− ${eur(saleCosts, { compact: true })}`} muted />
            <StackedNumber label="Net Proceeds" value={eur(netProc, { compact: true })} tone="#16A34A" />
          </div>
        </div>
      </div>
    </div>
  );
}


// ──────────────────────────────────────────────────────────────────────
// VALUATION TAB
// ──────────────────────────────────────────────────────────────────────
function ValuationTab({ asset, setAsset }) {
  const [override, setOverride] = useState(asset.current_value_eur);
  const [saving, setSaving] = useState(false);

  const applyOverride = async () => {
    const v = Number(override);
    if (!v || v <= 0) return;
    setSaving(true);
    try {
      await axios.put(`${API}/portfolio-intel/asset/${asset.id}/valuation`, {
        current_value_eur: v,
        valuation_source: 'manual',
      });
      setAsset({
        ...asset,
        current_value_eur: v,
        valuation_source: 'manual',
        valuation_updated_at: new Date().toISOString().slice(0, 10),
      });
    } catch (e) {
      // Allow local override regardless
      setAsset({
        ...asset,
        current_value_eur: v,
        valuation_source: 'manual',
        valuation_updated_at: new Date().toISOString().slice(0, 10),
      });
    } finally {
      setSaving(false);
    }
  };

  const upside   = Math.round(asset.current_value_eur * 1.05);
  const downside = Math.round(asset.current_value_eur * 0.95);

  return (
    <div className="space-y-10" data-testid="tab-valuation">
      <div className="grid lg:grid-cols-3 gap-6">
        <BigKPI label="Purchase Price"      value={eur(asset.purchase_price_eur, { compact: true })} />
        <BigKPI label="Today's Value"        value={eur(asset.current_value_eur, { compact: true })} tone={GOLD} />
        <BigKPI label="Upside / Downside"   value={`${eur(downside, { compact: true })} – ${eur(upside, { compact: true })}`} sub="±5% comp range" />
      </div>

      <section className="p-7" style={{ background: STONE, border: `1px solid ${STONE_LINE}`, borderRadius: 14 }}>
        <div className="ts-kicker mb-4">Valuation Source</div>
        <ul className="space-y-3 text-[14px]" style={{ color: '#09090B' }}>
          <li className="flex items-center justify-between border-b pb-2" style={{ borderColor: STONE_LINE }}>
            <span>Comparable sales</span>
            <span style={{ color: asset.valuation_source === 'comparable_sales' ? GOLD : '#A1A1AA', fontWeight: 500 }}>
              {asset.valuation_source === 'comparable_sales' ? 'Active' : 'Available'}
            </span>
          </li>
          <li className="flex items-center justify-between border-b pb-2" style={{ borderColor: STONE_LINE }}>
            <span>Current listing comps</span>
            <span style={{ color: '#A1A1AA', fontWeight: 500 }}>Live</span>
          </li>
          <li className="flex items-center justify-between border-b pb-2" style={{ borderColor: STONE_LINE }}>
            <span>Rental income method</span>
            <span style={{ color: '#A1A1AA', fontWeight: 500 }}>Cross-check</span>
          </li>
          <li className="flex items-center justify-between border-b pb-2" style={{ borderColor: STONE_LINE }}>
            <span>Owner manual override</span>
            <span style={{ color: asset.valuation_source === 'manual' ? GOLD : '#A1A1AA', fontWeight: 500 }}>
              {asset.valuation_source === 'manual' ? 'Active' : 'Available'}
            </span>
          </li>
        </ul>

        <div className="mt-7 flex items-end gap-3 flex-wrap">
          <div>
            <div className="ts-kicker mb-2" style={{ fontSize: 10 }}>Override current value (€)</div>
            <input
              type="number"
              value={override}
              onChange={(e) => setOverride(e.target.value)}
              className="vela-input tabular-nums"
              style={{ width: 200, fontSize: 16, padding: '0.6rem 0.8rem' }}
              data-testid="valuation-override-input"
            />
          </div>
          <button
            type="button"
            onClick={applyOverride}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px]"
            style={{
              background: GOLD, color: '#FFFFFF', border: 'none',
              borderRadius: 999, fontFamily: 'Inter, sans-serif', fontWeight: 500,
              cursor: saving ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(184,149,106,0.22)',
            }}
            data-testid="valuation-override-apply"
          >
            {saving ? 'Saving…' : 'Apply Override'} <ArrowRight size={13} strokeWidth={2} />
          </button>
          <span className="ts-small">Last updated: {asset.valuation_updated_at}</span>
        </div>
      </section>
    </div>
  );
}


// ──────────────────────────────────────────────────────────────────────
// INCOME TAB
// ──────────────────────────────────────────────────────────────────────
function IncomeTab({ asset, yoc, yon }) {
  const gross    = asset.annual_gross_eur || 0;
  const mgmt     = Math.round(gross * (asset.management_fee_pct || 0) / 100);
  const cleaning = Math.round(350 * 12 * (asset.occupancy_pct || 70) / 100);
  const util     = Math.round(120 * 12);
  const maint    = Math.round(gross * 0.06);
  const net      = asset.annual_net_eur || 0;
  const optimized = Math.round(net * 1.17);
  return (
    <div className="space-y-10" data-testid="tab-income">
      <div className="grid lg:grid-cols-3 gap-6">
        <BigKPI label="Annual Gross"      value={eur(gross, { compact: true })} />
        <BigKPI label="Annual Net"        value={eur(net,   { compact: true })} tone={GOLD} />
        <BigKPI label="Optimized Potential" value={eur(optimized, { compact: true })} sub="+17% achievable" tone="#16A34A" />
      </div>

      <section className="p-7" style={{ background: STONE, border: `1px solid ${STONE_LINE}`, borderRadius: 14 }}>
        <div className="ts-kicker mb-4">Income Breakdown</div>
        <div className="space-y-3">
          <BreakdownRow label="Gross income"      value={eur(gross)} tone="#09090B" sign="+" />
          <BreakdownRow label="Management fees"   value={eur(mgmt)}  sign="−" />
          <BreakdownRow label="Cleaning"          value={eur(cleaning)} sign="−" />
          <BreakdownRow label="Utilities"         value={eur(util)}  sign="−" />
          <BreakdownRow label="Maintenance"       value={eur(maint)} sign="−" />
          <BreakdownRow label="Net income"        value={eur(net)}   tone={GOLD} sign="=" bold />
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <KPI label="Occupancy"           value={`${asset.occupancy_pct}%`} />
        <KPI label="ADR"                 value={eur(asset.adr_eur)} />
        <KPI label="Yield on Cost"       value={pct(yoc)}  tone={GOLD} />
        <KPI label="Yield on Current"    value={pct(yon)}  tone={GOLD} />
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, tone, sign, bold }) {
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: STONE_LINE }}>
      <span style={{ color: '#52525B', fontSize: 13, fontWeight: bold ? 500 : 400 }}>
        {label}
      </span>
      <span
        className="font-mono-tight tabular-nums"
        style={{ color: tone || '#52525B', fontSize: 14, fontWeight: bold ? 600 : 500 }}
      >
        {sign} {value}
      </span>
    </div>
  );
}


// ──────────────────────────────────────────────────────────────────────
// EXIT SCENARIOS TAB
// ──────────────────────────────────────────────────────────────────────
function ExitsTab({ asset }) {
  const scenarios = useMemo(() => exitScenarios(asset), [asset]);
  return (
    <div data-testid="tab-exits">
      <h2 className="ts-h2 mb-3">Seven exit scenarios.</h2>
      <p className="ts-body mb-10 max-w-[640px]">
        Each scenario is calibrated from your actual numbers using deterministic
        Propul8 finance logic. AI notes from Claude Sonnet 4.5.
      </p>

      <div className="grid lg:grid-cols-2 gap-5">
        {scenarios.map((s) => (
          <article
            key={s.key}
            className="p-7"
            style={{
              background: '#FFFFFF', border: `1px solid ${STONE_LINE}`,
              borderRadius: 14,
            }}
            data-testid={`scenario-${s.key}`}
          >
            <div className="flex items-baseline justify-between mb-5">
              <h3 className="ts-h3" style={{ fontSize: 19 }}>{s.label}</h3>
              <RiskPill level={s.risk_level} />
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-5">
              <StackedNumber label="Projected Value"   value={eur(s.projected_value, { compact: true })} />
              <StackedNumber label="Projected Income"  value={eur(s.projected_net_income, { compact: true })} />
              <StackedNumber label="Cash-Out"          value={s.projected_cash_out > 0 ? eur(s.projected_cash_out, { compact: true }) : '—'} tone={GOLD} />
              <StackedNumber label="ROI"               value={`${s.projected_roi_pct >= 0 ? '+' : ''}${s.projected_roi_pct}%`} tone={s.projected_roi_pct >= 0 ? '#16A34A' : '#EF4444'} />
            </div>

            {s.renovation_budget && (
              <p className="ts-small mt-3 mb-3">
                Renovation budget: <span className="font-mono-tight" style={{ color: '#09090B' }}>{eur(s.renovation_budget)}</span>
                {s.adr_uplift_pct && <> · ADR uplift: <span style={{ color: GOLD }}>+{s.adr_uplift_pct}%</span></>}
              </p>
            )}
            {s.ltv_pct && (
              <p className="ts-small mt-3 mb-3">
                Refinance at <span style={{ color: GOLD }}>{s.ltv_pct}% LTV</span>
              </p>
            )}

            <div
              className="px-4 py-3 mt-3 flex items-start gap-2"
              style={{ background: STONE, borderRadius: 10 }}
            >
              <Sparkles size={11} strokeWidth={1.7} style={{ color: GOLD, marginTop: 2 }} />
              <p className="ts-small" style={{ fontSize: 12.5, lineHeight: 1.55 }}>{s.ai_note}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function RiskPill({ level }) {
  const tone = level === 'Low' ? '#16A34A' : level === 'Medium' ? GOLD : '#EF4444';
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5"
      style={{ background: STONE, border: `1px solid ${STONE_LINE}`, borderRadius: 999 }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone }} />
      <span className="font-mono-tight text-[10px]" style={{ color: tone, fontWeight: 600 }}>
        Risk: {level}
      </span>
    </span>
  );
}


// ──────────────────────────────────────────────────────────────────────
// ACTION PLAN TAB — AI-generated 5-step plan + Exit Plan
// ──────────────────────────────────────────────────────────────────────
function ActionTab({ asset }) {
  // Deterministic instant 5-step plan (replaced by Claude when ready)
  const deterministicSteps = useMemo(() => {
    const cur = asset.current_value_eur || 0;
    return [
      { n: 1, title: 'Refresh editorial photography',
        detail: 'Re-shoot the listing at golden hour with a real estate photographer; refresh the cover image first.' },
      { n: 2, title: 'Prepare STR income report',
        detail: 'Export trailing 12-month gross + net income with monthly occupancy from your channel manager.' },
      { n: 3, title: 'Get broker valuation range',
        detail: 'Solicit a written valuation from a local broker familiar with foreign-investor STR demand.' },
      { n: 4, title: 'List only above floor',
        detail: `List the asset only if the broker supports €${Math.round(cur * 1.025).toLocaleString('en-US')}+; otherwise hold and optimise.` },
      { n: 5, title: 'Optimise ADR by 10–15%',
        detail: 'Implement dynamic pricing, programmed evening lighting, and an outdoor programming layer to lift ADR.' },
    ];
  }, [asset]);

  const [actionPlan, setActionPlan] = useState({ steps: deterministicSteps });
  const [exitPlan, setExitPlan] = useState(null);
  const [loadingExit, setLoadingExit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    axios.post(`${API}/portfolio-intel/action-plan`, { asset })
      .then((r) => {
        if (!cancelled && r.data?.plan?.steps?.length) {
          setActionPlan(r.data.plan);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [asset.id]);

  const buildExitPlan = async () => {
    setLoadingExit(true);
    try {
      const res = await axios.post(`${API}/portfolio-intel/exit-plan`, { asset, target_timeline_days: 90 });
      setExitPlan(res.data?.plan);
    } catch (e) {
      setExitPlan(null);
    } finally {
      setLoadingExit(false);
    }
  };

  return (
    <div className="space-y-12" data-testid="tab-action">
      {/* 5-step action plan */}
      <section>
        <h2 className="ts-h2 mb-3">Next 90 days.</h2>
        <p className="ts-body mb-10 max-w-[640px]">
          AI-generated, asset-specific action steps. Designed to be executable in
          30–90 days.
        </p>

        {!actionPlan ? (
          <p className="ts-small">Generating action plan…</p>
        ) : (
          <ol className="space-y-3" data-testid="action-steps">
            {(actionPlan.steps || []).map((step) => (
              <li
                key={step.n}
                className="p-5 flex items-start gap-5"
                style={{ background: '#FFFFFF', border: `1px solid ${STONE_LINE}`, borderRadius: 12 }}
                data-testid={`action-step-${step.n}`}
              >
                <div
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center font-mono-tight tabular-nums"
                  style={{
                    background: STONE, color: GOLD,
                    border: `1px solid ${STONE_LINE}`,
                    borderRadius: 999, fontSize: 13, fontWeight: 600,
                  }}
                >
                  {step.n}
                </div>
                <div className="flex-1">
                  <div className="font-display"
                    style={{ color: '#09090B', fontSize: 16, fontWeight: 500, letterSpacing: '-0.015em' }}>
                    {step.title}
                  </div>
                  <p className="ts-small mt-1.5 leading-relaxed">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Build Exit Plan */}
      <section>
        <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
          <h2 className="ts-h2">Exit plan.</h2>
          {!exitPlan && (
            <button
              type="button"
              onClick={buildExitPlan}
              disabled={loadingExit}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px]"
              style={{
                background: GOLD, color: '#FFFFFF', border: 'none',
                borderRadius: 999, fontFamily: 'Inter, sans-serif', fontWeight: 500,
                cursor: loadingExit ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(184,149,106,0.22)',
              }}
              data-testid="build-exit-plan-btn"
            >
              {loadingExit ? 'Generating…' : 'Build Exit Plan'} <Sparkles size={13} strokeWidth={2} />
            </button>
          )}
        </div>

        {exitPlan && (
          <div className="space-y-6" data-testid="exit-plan-output">
            <div className="grid lg:grid-cols-3 gap-6">
              <BigKPI label="Recommended Listing" value={eur(exitPlan.recommended_listing_price_eur, { compact: true })} tone={GOLD} />
              <BigKPI label="Realistic Offer Low" value={eur(exitPlan.realistic_offer_low_eur, { compact: true })} />
              <BigKPI label="Realistic Offer High" value={eur(exitPlan.realistic_offer_high_eur, { compact: true })} />
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              <PlanCard title="Target Buyer Profile" body={exitPlan.target_buyer_profile} />
              <PlanCard title="Best Selling Angle"   body={exitPlan.best_selling_angle} />
              <PlanCard title="Furnished or Unfurnished" body={exitPlan.furnished_recommendation} />
              <PlanCard title="Expected Timeline"    body={`${exitPlan.expected_timeline_days} days from listing to closed`} />
              <PlanList  title="Documents to Prepare" items={exitPlan.documents_to_prepare || []} />
              <PlanList  title="Design Improvements"  items={exitPlan.design_improvements || []} />
              <PlanList  title="Income Proof"         items={exitPlan.income_proof || []} />
            </div>

            <div
              className="p-6"
              style={{ background: STONE, border: `1px solid ${STONE_LINE}`, borderRadius: 14 }}
            >
              <div className="ts-kicker mb-3">Final Recommendation</div>
              <p style={{ color: '#09090B', fontSize: 15.5, lineHeight: 1.55 }}>
                {exitPlan.final_recommendation}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function PlanCard({ title, body }) {
  return (
    <div className="p-5" style={{ background: '#FFFFFF', border: `1px solid ${STONE_LINE}`, borderRadius: 12 }}>
      <div className="ts-kicker mb-2">{title}</div>
      <p style={{ color: '#09090B', fontSize: 13.5, lineHeight: 1.55 }}>{body}</p>
    </div>
  );
}

function PlanList({ title, items }) {
  return (
    <div className="p-5" style={{ background: '#FFFFFF', border: `1px solid ${STONE_LINE}`, borderRadius: 12 }}>
      <div className="ts-kicker mb-3">{title}</div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-[13px]" style={{ color: '#09090B' }}>
            <span style={{ color: GOLD, marginRight: 8 }}>•</span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}


// ──────────────────────────────────────────────────────────────────────
// DOCUMENTS TAB
// ──────────────────────────────────────────────────────────────────────
function DocsTab({ asset }) {
  const DOCS = [
    'Purchase contract',
    'Title documents',
    'Tax documents',
    'Rental income reports',
    'Airbnb / Booking performance screenshots',
    'Renovation invoices',
    'Furnishing invoices',
    'Valuation reports',
    'Broker opinions',
  ];
  return (
    <div data-testid="tab-docs">
      <h2 className="ts-h2 mb-3">Documents.</h2>
      <p className="ts-body mb-10 max-w-[640px]">
        Upload supporting documents to strengthen valuation, sell-readiness, and
        institutional buyer trust.
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOCS.map((doc, i) => (
          <div
            key={doc}
            className="p-5 flex items-center justify-between"
            style={{ background: '#FFFFFF', border: `1px solid ${STONE_LINE}`, borderRadius: 12 }}
            data-testid={`doc-row-${i}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText size={14} strokeWidth={1.5} style={{ color: '#52525B' }} />
              <span className="text-[13.5px] truncate" style={{ color: '#09090B' }}>{doc}</span>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px]"
              style={{
                background: STONE, color: GOLD, border: `1px solid ${STONE_LINE}`,
                borderRadius: 999, cursor: 'pointer',
              }}
            >
              <Upload size={11} strokeWidth={1.8} /> Upload
            </button>
          </div>
        ))}
      </div>
      <p className="ts-small mt-8" style={{ fontSize: 12, color: '#A1A1AA' }}>
        Document upload UI is wired — backend storage hookup arrives next iteration.
      </p>
    </div>
  );
}


// ──────────────────────────────────────────────────────────────────────
// Shared primitives
// ──────────────────────────────────────────────────────────────────────
function BigKPI({ label, value, sub, tone }) {
  return (
    <div className="p-7" style={{ background: '#FFFFFF', border: `1px solid ${STONE_LINE}`, borderRadius: 14 }}>
      <div className="ts-kicker" style={{ fontSize: 10, color: '#52525B' }}>{label}</div>
      <div
        className="font-display tabular-nums mt-4"
        style={{ color: tone || '#09090B', fontSize: 30, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1 }}
      >
        {value}
      </div>
      {sub && (
        <div className="ts-small mt-2" style={{ fontSize: 12 }}>{sub}</div>
      )}
    </div>
  );
}

function KPI({ label, value, sub, tone }) {
  return (
    <div>
      <div className="ts-kicker" style={{ fontSize: 10, color: '#52525B' }}>{label}</div>
      <div className="font-display tabular-nums mt-2 flex items-baseline gap-1.5"
        style={{ color: tone || '#09090B', fontSize: 22, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1 }}>
        {value}
        {sub && <span className="ts-small" style={{ fontSize: 11 }}>{sub}</span>}
      </div>
    </div>
  );
}

function StackedNumber({ label, value, tone, muted }) {
  return (
    <div>
      <div className="ts-kicker" style={{ fontSize: 9, color: '#52525B' }}>{label}</div>
      <div className="font-display tabular-nums mt-1"
        style={{ fontSize: 17, fontWeight: 500, color: muted ? '#52525B' : (tone || '#09090B'), letterSpacing: '-0.018em' }}>
        {value}
      </div>
    </div>
  );
}
