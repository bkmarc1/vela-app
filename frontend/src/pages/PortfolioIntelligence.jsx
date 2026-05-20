// Propul8 · PORTFOLIO INTELLIGENCE — owner-side asset cockpit (iter67).
//
// Per user mandate: "Apple-level simplicity + Bloomberg-style asset
// intelligence + modern proptech dashboard." Off-white bg, charcoal text,
// stone cards, muted gold accents, large clean numbers, AI signals,
// no neon, no SaaS-fluff.

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, ArrowRight, RefreshCcw, FileBarChart, LayoutGrid,
  Sparkles, TrendingUp, TrendingDown, Activity, ChevronRight,
} from 'lucide-react';
import axios from 'axios';

import {
  DEMO_OWNED_ASSETS, aggregatePortfolio, decisionPicks,
  digitalAssetScore, liquiditySignal, sellReadinessScore,
  equityGain, equityGainPct, yieldOnCost, yieldOnCurrentValue,
  estimatedSaleCosts, netProceedsIfSold,
} from '../lib/portfolioIntelligence';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const GOLD       = '#B8956A';
const GOLD_HOVER = '#A07F56';
const STONE      = '#F5F1EA';
const STONE_LINE = '#E8E0D2';

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


export default function PortfolioIntelligence() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [aiSignal, setAiSignal] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [signalLoading, setSignalLoading] = useState(false);

  // ─── Hydrate owned assets ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await axios.get(`${API}/portfolio-intel/owned`);
        const owned = res.data?.assets || [];
        const merged = owned.length > 0 ? owned : DEMO_OWNED_ASSETS;
        if (!cancelled) {
          setAssets(merged);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setAssets(DEMO_OWNED_ASSETS);
          setLoaded(true);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ─── Aggregates + decisions (deterministic) ────────────────────────
  const summary  = useMemo(() => aggregatePortfolio(assets), [assets]);
  const picks    = useMemo(() => decisionPicks(assets), [assets]);
  const topAsset = useMemo(
    () => [...assets].sort((a, b) => digitalAssetScore(b) - digitalAssetScore(a))[0],
    [assets]
  );

  // ─── Deterministic INSTANT fallback (so AI signal is never blank) ──
  const deterministicSignal = useMemo(() => {
    if (!summary) return null;
    const p = summary.equity_pct;
    if (p >= 8) {
      return `AI Signal: Portfolio up ${p}% from purchase value. Best action: hold income-producing assets unless exit prices exceed current valuation by 5–8%.`;
    }
    return `AI Signal: Modest appreciation at ${p || 0}%. Focus on yield optimisation — improve photography, pricing calendar, and channel coverage before any exit.`;
  }, [summary]);

  // ─── Claude AI portfolio signal (replaces deterministic when ready) ─
  useEffect(() => {
    if (!summary) return;
    let cancelled = false;
    async function gen() {
      setSignalLoading(true);
      try {
        const res = await axios.post(`${API}/portfolio-intel/portfolio-signal`, {
          summary,
          top_asset_name: topAsset?.title || null,
        });
        if (!cancelled && res.data?.signal) setAiSignal(res.data.signal);
      } catch {
        // Keep deterministic fallback
      } finally {
        if (!cancelled) setSignalLoading(false);
      }
    }
    gen();
    return () => { cancelled = true; };
  }, [summary?.equity_pct, summary?.portfolio_score, topAsset?.id]);

  const displaySignal = aiSignal || deterministicSignal;

  return (
    <div data-testid="portfolio-intel-page" style={{ background: '#FAFAFA', minHeight: '100vh' }}>
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 pt-20 pb-32">

        {/* ─── Header ──────────────────────────────────────────────── */}
        <header className="mb-14">
          <div className="flex items-center gap-2">
            <span className="ts-kicker" data-testid="portfolio-intel-kicker">
              Portfolio Intelligence
            </span>
            <span
              className="font-mono-tight text-[10px] px-2 py-0.5"
              style={{
                color: GOLD, borderRadius: 999,
                border: `1px solid ${STONE_LINE}`,
                background: STONE,
              }}
              data-testid="demo-data-badge"
            >
              Demo · synthesized sample data
            </span>
          </div>

          <h1 className="ts-h1 mt-5 max-w-[840px]" data-testid="portfolio-intel-title">
            Know what you paid, what it is worth today,
            {' '}and what to do next.
          </h1>
          <p className="ts-body mt-6 max-w-[640px]" data-testid="portfolio-intel-subtitle">
            See what you paid, what your assets are worth today, and the smartest
            action plan for every property.
          </p>

          {/* AI Signal bar */}
          <AISignalBar
            text={displaySignal}
            loading={signalLoading && !aiSignal}
          />

          {/* Main CTAs */}
          <div className="mt-10 flex flex-wrap gap-3" data-testid="portfolio-intel-ctas">
            <PillButton primary onClick={() => navigate('/portfolio/add')} testId="cta-add-asset">
              <Plus size={14} strokeWidth={2} /> Add Asset
            </PillButton>
            <PillButton onClick={() => window.location.reload()} testId="cta-update-valuation">
              <RefreshCcw size={13} strokeWidth={1.8} /> Update Valuation
            </PillButton>
            {topAsset && (
              <PillButton
                onClick={() => navigate(`/asset/${encodeURIComponent(topAsset.id)}?tab=action`)}
                testId="cta-build-exit-plan"
              >
                <FileBarChart size={13} strokeWidth={1.8} /> Build Exit Plan
              </PillButton>
            )}
            {topAsset && (
              <PillButton
                onClick={() => navigate(`/asset/${encodeURIComponent(topAsset.id)}?tab=exits`)}
                testId="cta-compare-scenarios"
              >
                <LayoutGrid size={13} strokeWidth={1.8} /> Compare Scenarios
              </PillButton>
            )}
          </div>
        </header>

        {/* ─── Portfolio Summary (12 KPIs) ─────────────────────────── */}
        {summary && <PortfolioSummary s={summary} />}

        {/* ─── Decision Cards ──────────────────────────────────────── */}
        {picks.length > 0 && <DecisionCards picks={picks} />}

        {/* ─── Holdings ────────────────────────────────────────────── */}
        <section className="mt-24" data-testid="portfolio-intel-holdings">
          <div className="flex items-baseline justify-between mb-8 flex-wrap gap-3">
            <div>
              <span className="ts-kicker">Holdings</span>
              <h2 className="ts-h2 mt-3" data-testid="holdings-headline">Your assets.</h2>
            </div>
            {loaded && (
              <span className="font-mono-tight text-[11px]" style={{ color: '#52525B' }}>
                {assets.length} owned · live cockpit
              </span>
            )}
          </div>

          <div className="space-y-8">
            {assets.map((asset) => (
              <AssetIntelCard key={asset.id} asset={asset} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}


// ──────────────────────────────────────────────────────────────────────
// PortfolioSummary — 12 KPIs in a stone-card grid
// ──────────────────────────────────────────────────────────────────────
function PortfolioSummary({ s }) {
  const equityTone = s.equity_total >= 0 ? '#16A34A' : '#EF4444';
  return (
    <section
      className="mb-20 p-8 lg:p-10"
      style={{
        background: STONE,
        border: `1px solid ${STONE_LINE}`,
        borderRadius: 16,
      }}
      data-testid="portfolio-summary"
    >
      <div className="flex items-baseline justify-between mb-7 flex-wrap gap-3">
        <span className="ts-kicker">Portfolio Summary</span>
        <span className="font-mono-tight text-[10px]" style={{ color: '#52525B' }}>
          {s.asset_count} assets · {s.portfolio_liquidity_score}/100 liquidity
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-10 gap-y-8">
        <KPI label="Total Purchase Price"     value={eur(s.purchase_total, { compact: true })} testId="kpi-purchase-total" />
        <KPI label="Current Estimated Value"  value={eur(s.current_total,  { compact: true })} testId="kpi-current-total" />
        <KPI label="Equity Gain"              value={eur(s.equity_total,   { compact: true })} tone={equityTone} testId="kpi-equity-total" />
        <KPI label="Equity Gain %"            value={pct(s.equity_pct)}                       tone={equityTone} testId="kpi-equity-pct" />
        <KPI label="Annual Gross Income"      value={eur(s.annual_gross, { compact: true })} testId="kpi-annual-gross" />
        <KPI label="Annual Net Income"        value={eur(s.annual_net,   { compact: true })} testId="kpi-annual-net" />
        <KPI label="Yield on Cost"            value={pct(s.yield_on_cost_pct)}                  tone={GOLD} testId="kpi-yoc" />
        <KPI label="Yield on Current Value"   value={pct(s.yield_on_now_pct)}                   tone={GOLD} testId="kpi-yonow" />
        <KPI label="Net Cash-Out If Sold"     value={eur(s.net_cash_out, { compact: true })}   tone="#16A34A" testId="kpi-net-cashout" />
        <KPI label="Portfolio Asset Score"    value={`${s.portfolio_score}`} sub="/ 100"        tone="#09090B" testId="kpi-portfolio-score" />
        <KPI label="Portfolio Liquidity"      value={s.portfolio_liquidity}                     tone={GOLD} testId="kpi-portfolio-liq" />
        <KPI label="Best Position"            value={s.equity_pct >= 8 ? 'Strong' : 'Building'} tone={s.equity_pct >= 8 ? '#16A34A' : '#B8956A'} testId="kpi-position" />
      </div>
    </section>
  );
}

function KPI({ label, value, sub, tone, testId }) {
  return (
    <div data-testid={testId}>
      <div className="ts-kicker" style={{ fontSize: 10, color: '#52525B' }}>{label}</div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className="font-display tabular-nums"
          style={{
            color: tone || '#09090B',
            fontSize: 26, fontWeight: 500,
            letterSpacing: '-0.03em', lineHeight: 1,
          }}
        >
          {value}
        </span>
        {sub && <span className="ts-small" style={{ fontSize: 12 }}>{sub}</span>}
      </div>
    </div>
  );
}


// ──────────────────────────────────────────────────────────────────────
// DecisionCards — 8 horizontal "Best Asset to X" cards (carousel-style)
// ──────────────────────────────────────────────────────────────────────
function DecisionCards({ picks }) {
  return (
    <section className="mt-16" data-testid="portfolio-decision-cards">
      <div className="mb-7">
        <span className="ts-kicker">AI Decision Picks</span>
        <h2 className="ts-h2 mt-3">The best move per category.</h2>
      </div>
      <div
        className="overflow-x-auto pb-3 -mx-6 px-6 md:-mx-12 md:px-12"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
          {picks.map((p, i) => (
            <Link
              key={p.label}
              to={`/asset/${encodeURIComponent(p.asset_id)}`}
              className="flex-shrink-0 p-6 transition-all hover:-translate-y-0.5"
              style={{
                width: 320, background: '#FFFFFF',
                border: `1px solid ${STONE_LINE}`,
                borderRadius: 14, scrollSnapAlign: 'start',
              }}
              data-testid={`decision-card-${i}`}
            >
              <div className="ts-kicker" style={{ fontSize: 10, color: GOLD }}>{p.label}</div>
              <div
                className="font-display mt-3 leading-snug"
                style={{ color: '#09090B', fontSize: 17, fontWeight: 500, letterSpacing: '-0.015em' }}
              >
                {p.asset_name}
              </div>
              <p className="ts-small mt-3 leading-relaxed">{p.reason}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-[11.5px]" style={{ color: GOLD, fontWeight: 500 }}>
                Open <ChevronRight size={12} strokeWidth={2} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}


// ──────────────────────────────────────────────────────────────────────
// AssetIntelCard — full smart-cockpit card
// ──────────────────────────────────────────────────────────────────────
function AssetIntelCard({ asset }) {
  const navigate = useNavigate();

  // ─── Instant deterministic signal (replaced by Claude when it arrives) ─
  const deterministicSignal = useMemo(() => {
    const purch = asset.purchase_price_eur || 0;
    const cur   = asset.current_value_eur  || 0;
    const yocPct = ((asset.annual_gross_eur || 0) / (purch || 1)) * 100;
    const saleFloor = Math.round(cur * 1.025).toLocaleString('en-US');
    if (yocPct >= 7 && cur > purch) {
      return `Hold. Strong ${yocPct.toFixed(1)}% yield on cost and growing equity. Sell only above €${saleFloor}.`;
    }
    if (cur < purch) {
      return 'Hold. Below entry — wait for recovery or optimise occupancy before any exit.';
    }
    return 'Watch. Modest yield; reassess after one full season of rental performance data.';
  }, [asset]);

  const [signal, setSignal] = useState(null);

  useEffect(() => {
    let cancelled = false;
    axios.post(`${API}/portfolio-intel/signal`, { asset })
      .then((r) => !cancelled && r.data?.signal && setSignal(r.data.signal))
      .catch(() => {});
    return () => { cancelled = true; };
  }, [asset.id]);

  const displaySignal = signal || deterministicSignal;

  const equity     = equityGain(asset.purchase_price_eur, asset.current_value_eur);
  const equityPct  = equityGainPct(asset.purchase_price_eur, asset.current_value_eur);
  const yoc        = yieldOnCost(asset.annual_gross_eur, asset.purchase_price_eur);
  const yonow      = yieldOnCurrentValue(asset.annual_net_eur, asset.current_value_eur);
  const saleCosts  = estimatedSaleCosts(asset.current_value_eur);
  const netProc    = netProceedsIfSold(asset.current_value_eur, asset.mortgage_balance_eur);
  const score      = digitalAssetScore(asset);
  const liq        = liquiditySignal(asset);
  const sellReady  = sellReadinessScore(asset);
  const monthlyNet = Math.round((asset.annual_net_eur || 0) / 12);
  const equityTone = equity >= 0 ? '#16A34A' : '#EF4444';

  return (
    <article
      className="overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: `1px solid ${STONE_LINE}`,
        borderRadius: 18,
      }}
      data-testid={`asset-intel-${asset.id}`}
    >
      {/* AI Action Strip (gold, full width) */}
      <div
        className="px-6 py-3 flex items-center gap-3"
        style={{
          background: STONE,
          borderBottom: `1px solid ${STONE_LINE}`,
        }}
        data-testid={`asset-intel-action-strip-${asset.id}`}
      >
        <div
          className="w-7 h-7 flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(184,149,106,0.15)',
            borderRadius: 999,
          }}
        >
          <Sparkles size={12} strokeWidth={1.7} style={{ color: GOLD }} />
        </div>
        <p
          className="ts-small flex-1 leading-snug"
          style={{ fontSize: 13, color: '#09090B' }}
          data-testid={`asset-intel-signal-${asset.id}`}
        >
          {displaySignal}
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-0">
        {/* LEFT — image + title + meta */}
        <div className="lg:col-span-5 p-7 lg:border-r" style={{ borderColor: STONE_LINE }}>
          {asset.image && (
            <img
              src={asset.image} alt={asset.title}
              className="w-full object-cover mb-6"
              style={{ height: 200, borderRadius: 12 }}
            />
          )}
          <h3
            className="font-display leading-tight"
            style={{ color: '#09090B', fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em' }}
            data-testid={`asset-intel-title-${asset.id}`}
          >
            {asset.title}
          </h3>
          <p className="ts-small mt-2">{asset.neighborhood || asset.city}</p>

          {/* Asset Value Pulse */}
          <div className="mt-7" data-testid={`asset-value-pulse-${asset.id}`}>
            <div className="ts-kicker mb-3" style={{ fontSize: 10 }}>Asset Value Pulse</div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-display tabular-nums" style={{ fontSize: 22, fontWeight: 500, color: '#52525B', letterSpacing: '-0.02em' }}>
                {eur(asset.purchase_price_eur, { compact: true })}
              </span>
              <ArrowRight size={14} strokeWidth={1.6} style={{ color: '#A1A1AA' }} />
              <span className="font-display tabular-nums" style={{ fontSize: 28, fontWeight: 500, color: '#09090B', letterSpacing: '-0.025em' }}>
                {eur(asset.current_value_eur, { compact: true })}
              </span>
              <EquityPill pct={equityPct} value={equity} tone={equityTone} />
            </div>
            <div className="mt-3 flex items-center gap-3 text-[11px] font-mono-tight" style={{ color: '#52525B' }}>
              <ConfidencePill level={asset.valuation_source === 'comparable_sales' ? 'High' : 'Medium'} />
              <span>Updated {asset.valuation_updated_at}</span>
            </div>
          </div>

          {/* Equity Graph (mini 4-point) */}
          <EquityGraph asset={asset} />
        </div>

        {/* RIGHT — metrics + scores + scenarios */}
        <div className="lg:col-span-7 p-7">
          {/* Top row: 4 score circles */}
          <div className="grid grid-cols-4 gap-4 mb-7" data-testid="asset-intel-scores">
            <ScoreCircle  label="Asset Score"     value={score}     max={100} tone={GOLD}    testId="score-asset"  />
            <ScoreCircle  label="Sell Readiness"  value={sellReady} max={100} tone="#16A34A" testId="score-sell"   />
            <ScoreBadge   label="Liquidity"       value={liq.level} tone={liq.tone}           testId="score-liq"    />
            <ScoreBadge   label="Confidence"      value={asset.valuation_source === 'comparable_sales' ? 'High' : 'Medium'} tone="#09090B" testId="score-conf" />
          </div>

          {/* Income + yield row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6 mb-7" data-testid="asset-intel-stats">
            <MiniStat label="Annual Gross"  value={eur(asset.annual_gross_eur, { compact: true })} testId="stat-gross" />
            <MiniStat label="Annual Net"    value={eur(asset.annual_net_eur,   { compact: true })} testId="stat-net" />
            <MiniStat label="Monthly Net"   value={eur(monthlyNet, { compact: true })}              testId="stat-monthly" />
            <MiniStat label="Occupancy"     value={`${asset.occupancy_pct}%`}                       testId="stat-occ" />
            <MiniStat label="ADR"           value={eur(asset.adr_eur)}                              testId="stat-adr" />
            <MiniStat label="Yield on Cost" value={pct(yoc)}                       tone={GOLD}      testId="stat-yoc" />
            <MiniStat label="Yield on Now"  value={pct(yonow)}                     tone={GOLD}      testId="stat-yonow" />
            <MiniStat label="Mortgage"      value={eur(asset.mortgage_balance_eur, { compact: true })} testId="stat-mortgage" />
          </div>

          {/* If Sold Today panel */}
          <div
            className="p-5 mb-6"
            style={{
              background: STONE,
              border: `1px solid ${STONE_LINE}`,
              borderRadius: 12,
            }}
            data-testid={`if-sold-today-${asset.id}`}
          >
            <div className="ts-kicker mb-4" style={{ fontSize: 10 }}>If Sold Today</div>
            <div className="grid grid-cols-3 gap-4">
              <StackedNumber label="Sale Price"    value={eur(asset.current_value_eur, { compact: true })} />
              <StackedNumber label="Sale Costs"    value={`− ${eur(saleCosts, { compact: true })}`} muted />
              <StackedNumber label="Net Proceeds"  value={eur(netProc, { compact: true })} tone="#16A34A" />
            </div>
          </div>

          {/* Comparison Bars */}
          <ComparisonBars asset={asset} />

          {/* Open detail */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => navigate(`/asset/${encodeURIComponent(asset.id)}`)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] transition-all"
              style={{
                background: '#09090B', color: '#FFFFFF',
                border: 'none', borderRadius: 999,
                fontFamily: 'Inter, sans-serif', fontWeight: 500,
                cursor: 'pointer',
              }}
              data-testid={`asset-intel-open-${asset.id}`}
            >
              Open Asset Detail
              <ArrowRight size={13} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}


// ──────────────────────────────────────────────────────────────────────
// Small primitives
// ──────────────────────────────────────────────────────────────────────
function PillButton({ children, onClick, primary, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] transition-all"
      style={{
        background: primary ? GOLD : 'transparent',
        color: primary ? '#FFFFFF' : '#09090B',
        border: primary ? 'none' : `1px solid ${STONE_LINE}`,
        borderRadius: 999,
        fontFamily: 'Inter, sans-serif', fontWeight: 500,
        boxShadow: primary ? '0 4px 14px rgba(184,149,106,0.22)' : 'none',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function AISignalBar({ text, loading }) {
  if (!text && !loading) return null;
  return (
    <div
      className="mt-10 px-5 py-3 inline-flex items-center gap-3 max-w-full"
      style={{
        background: STONE,
        border: `1px solid ${STONE_LINE}`,
        borderRadius: 999,
      }}
      data-testid="ai-portfolio-signal"
    >
      <div
        className="w-7 h-7 flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(184,149,106,0.15)', borderRadius: 999 }}
      >
        <Sparkles size={13} strokeWidth={1.7} style={{ color: GOLD }} />
      </div>
      <p
        className="text-[13.5px] leading-snug"
        style={{ color: '#09090B' }}
        data-testid="ai-portfolio-signal-text"
      >
        {text}
      </p>
    </div>
  );
}

function EquityPill({ pct: p, value, tone }) {
  if (p == null) return null;
  const Icon = p >= 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1"
      style={{
        background: p >= 0 ? 'rgba(22,163,74,0.10)' : 'rgba(239,68,68,0.10)',
        border: `1px solid ${tone}30`,
        borderRadius: 999,
      }}
    >
      <Icon size={11} strokeWidth={2} style={{ color: tone }} />
      <span className="font-mono-tight tabular-nums text-[11px]" style={{ color: tone, fontWeight: 600 }}>
        {p >= 0 ? '+' : ''}{p.toFixed(1)}%
      </span>
    </span>
  );
}

function ConfidencePill({ level }) {
  const tone = level === 'High' ? '#16A34A' : level === 'Medium' ? GOLD : '#52525B';
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5" style={{
      background: STONE, border: `1px solid ${STONE_LINE}`, borderRadius: 999,
    }}>
      <span className="w-1 h-1 rounded-full" style={{ background: tone }} />
      <span style={{ color: tone, fontWeight: 500, fontSize: 10 }}>Confidence: {level}</span>
    </span>
  );
}

function ScoreCircle({ label, value, max, tone, testId }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const radius = 24;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-start" data-testid={testId}>
      <div className="relative" style={{ width: 56, height: 56 }}>
        <svg width="56" height="56">
          <circle cx="28" cy="28" r={radius} fill="none" stroke={STONE_LINE} strokeWidth="3" />
          <circle cx="28" cy="28" r={radius} fill="none" stroke={tone} strokeWidth="3"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            transform="rotate(-90 28 28)" />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center font-mono-tight tabular-nums"
          style={{ fontSize: 13, fontWeight: 600, color: '#09090B' }}
        >
          {value}
        </div>
      </div>
      <div className="ts-kicker mt-2" style={{ fontSize: 9, color: '#52525B' }}>{label}</div>
    </div>
  );
}

function ScoreBadge({ label, value, tone, testId }) {
  return (
    <div data-testid={testId}>
      <div
        className="inline-flex items-center px-3 py-1.5"
        style={{
          background: STONE,
          border: `1px solid ${STONE_LINE}`,
          borderRadius: 999,
        }}
      >
        <span style={{ color: tone, fontSize: 12, fontWeight: 500 }}>{value}</span>
      </div>
      <div className="ts-kicker mt-2" style={{ fontSize: 9, color: '#52525B' }}>{label}</div>
    </div>
  );
}

function MiniStat({ label, value, tone, testId }) {
  return (
    <div data-testid={testId}>
      <div className="ts-kicker" style={{ fontSize: 9, color: '#52525B' }}>{label}</div>
      <div
        className="font-display tabular-nums mt-1"
        style={{
          fontSize: 17, fontWeight: 500,
          color: tone || '#09090B', letterSpacing: '-0.015em',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StackedNumber({ label, value, tone, muted }) {
  return (
    <div>
      <div className="ts-kicker" style={{ fontSize: 9, color: '#52525B' }}>{label}</div>
      <div
        className="font-display tabular-nums mt-1"
        style={{
          fontSize: 18, fontWeight: 500,
          color: muted ? '#52525B' : (tone || '#09090B'),
          letterSpacing: '-0.018em',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ComparisonBars({ asset }) {
  const purch = asset.purchase_price_eur || 0;
  const curr  = asset.current_value_eur  || 0;
  const max   = Math.max(purch, curr, 1);
  const yoc   = yieldOnCost(asset.annual_gross_eur, asset.purchase_price_eur) || 0;
  const yonow = yieldOnCurrentValue(asset.annual_net_eur, asset.current_value_eur) || 0;
  const yMax  = Math.max(yoc, yonow, 1);

  return (
    <div data-testid={`comparison-bars-${asset.id}`}>
      <div className="ts-kicker mb-3" style={{ fontSize: 10 }}>Smart Comparison</div>
      <BarRow label="Purchase vs Current Value" a={purch} b={curr} max={max} aLabel={eur(purch, { compact: true })} bLabel={eur(curr, { compact: true })} />
      <BarRow label="Yield on Cost vs Now"      a={yoc}   b={yonow} max={yMax} aLabel={pct(yoc)} bLabel={pct(yonow)} />
    </div>
  );
}

function BarRow({ label, a, b, max, aLabel, bLabel }) {
  const aPct = max ? (a / max) * 100 : 0;
  const bPct = max ? (b / max) * 100 : 0;
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2 text-[11px] font-mono-tight" style={{ color: '#52525B' }}>
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-3 mb-1">
        <div className="flex-1 h-2 relative" style={{ background: STONE_LINE, borderRadius: 999 }}>
          <div style={{ width: `${aPct}%`, height: '100%', background: '#52525B', borderRadius: 999 }} />
        </div>
        <span className="font-mono-tight tabular-nums text-[11px] w-14 text-right" style={{ color: '#52525B' }}>{aLabel}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 relative" style={{ background: STONE_LINE, borderRadius: 999 }}>
          <div style={{ width: `${bPct}%`, height: '100%', background: GOLD, borderRadius: 999 }} />
        </div>
        <span className="font-mono-tight tabular-nums text-[11px] w-14 text-right" style={{ color: GOLD }}>{bLabel}</span>
      </div>
    </div>
  );
}

function EquityGraph({ asset }) {
  const purch = asset.purchase_price_eur || 0;
  const curr  = asset.current_value_eur  || 0;
  const proj12  = Math.round(curr * 1.035);
  const proj36  = Math.round(curr * Math.pow(1.045, 3));
  const points = [
    { label: 'Purchase', value: purch },
    { label: 'Today',    value: curr  },
    { label: '12M',      value: proj12 },
    { label: '3Y',       value: proj36 },
  ];
  const max  = Math.max(...points.map((p) => p.value), 1);
  const min  = Math.min(...points.map((p) => p.value), 0);
  const span = Math.max(max - min, 1);
  const W = 280, H = 70;
  const x = (i) => (i / (points.length - 1)) * (W - 24) + 12;
  const y = (v) => H - 14 - ((v - min) / span) * (H - 28);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ');

  return (
    <div className="mt-7" data-testid={`equity-graph-${asset.id}`}>
      <div className="ts-kicker mb-3" style={{ fontSize: 10 }}>Equity Trajectory</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="80" preserveAspectRatio="none">
        <line x1="0" y1={H - 14} x2={W} y2={H - 14} stroke={STONE_LINE} strokeWidth="1" />
        <path d={d} fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={p.label} cx={x(i)} cy={y(p.value)} r="3" fill={GOLD} stroke="#FFFFFF" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] font-mono-tight mt-1.5" style={{ color: '#52525B' }}>
        {points.map((p) => <span key={p.label}>{p.label}</span>)}
      </div>
    </div>
  );
}
