// Propul8 · Portfolio — minimal, breathable, single source of truth.
//
// Per user mandate: "Portfolio page to neater, minimal."
// Per design blueprint: drop dense 3-highlight tiles; massive typographic
// header; minimal KPI strip; clean asset list; generous spacing.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, ArrowUpRight, TrendingUp, TrendingDown, Activity, Plus,
} from 'lucide-react';
import api from '../lib/api';
import { computePropertyIntelligence } from '../lib/intelligence';


// Dummy live demo assets used when the API returns an empty portfolio.
const DEMO_ASSETS = [
  {
    id: 'demo-koukaki-3br', title: 'Koukaki 3BR Apartment',
    city: 'Athens', neighborhood: 'Koukaki',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',
    adr: 168, occupancy: 64, asset_score: 78,
    monthly_eur: 3220, annual_revenue: 38640, asset_value_eur: 485000,
    annual_uplift: 14148, has_intelligence: true,
  },
  {
    id: 'demo-glyfada-2br', title: 'Glyfada Beachside 2BR',
    city: 'Athens', neighborhood: 'Glyfada',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',
    adr: 215, occupancy: 71, asset_score: 86,
    monthly_eur: 4575, annual_revenue: 54900, asset_value_eur: 720000,
    annual_uplift: 9200, has_intelligence: true,
  },
  {
    id: 'demo-plaka-studio', title: 'Plaka Heritage Studio',
    city: 'Athens', neighborhood: 'Plaka',
    image: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',
    adr: 145, occupancy: 78, asset_score: 81,
    monthly_eur: 3390, annual_revenue: 40680, asset_value_eur: 295000,
    annual_uplift: 5800, has_intelligence: true,
  },
  {
    id: 'demo-exarchia-loft', title: 'Exarcheia Industrial Loft',
    city: 'Athens', neighborhood: 'Exarcheia',
    image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',
    adr: 122, occupancy: 58, asset_score: 66,
    monthly_eur: 2123, annual_revenue: 25476, asset_value_eur: 220000,
    annual_uplift: 11800, has_intelligence: true,
  },
];


function fmtEUR(v, opts = {}) {
  if (v == null || !Number.isFinite(v)) return '—';
  const compact = opts.compact && Math.abs(v) >= 1000;
  if (compact) {
    if (Math.abs(v) >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  }
  return `€${Math.round(v).toLocaleString('en-US')}`;
}


export default function Portfolio() {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      try {
        const list = await api.get('/properties').then((r) => r.data).catch(() => []);
        const enriched = (Array.isArray(list) ? list : []).slice(0, 12).map((p) => {
          let inteli = null;
          try { inteli = computePropertyIntelligence(p); } catch { /* tolerate */ }
          const monthly = inteli?.monthly_baseline_eur || (p.adr ? Math.round(p.adr * (p.occupancy || 60) / 100 * 30) : null);
          return {
            id: p.id || p._id || p.url,
            title: p.title || p.name || 'Untitled asset',
            city: p.city || 'Athens',
            neighborhood: p.neighborhood || null,
            image: (p.images && p.images[0]) || null,
            adr: p.adr || null,
            occupancy: p.occupancy || null,
            monthly_eur: monthly,
            annual_uplift: inteli?.annual_uplift_eur || 0,
            annual_revenue: inteli?.annual_baseline_eur || 0,
            asset_value_eur: p.asking_price_eur || p.value_eur || null,
            asset_score: inteli?.vela_index ?? null,
            has_intelligence: !!inteli,
          };
        });
        if (!cancelled) {
          setRows(enriched.length > 0 ? enriched : DEMO_ASSETS);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setRows(DEMO_ASSETS);
          setLoaded(true);
        }
      }
    }
    hydrate();
    return () => { cancelled = true; };
  }, []);

  // Aggregate KPIs — minimal: portfolio value + projected revenue + avg score
  const kpis = useMemo(() => {
    if (!rows.length) return null;
    const scored = rows.filter((r) => Number.isFinite(r.asset_score));
    const avgScore   = scored.length ? Math.round(scored.reduce((s, r) => s + r.asset_score, 0) / scored.length) : null;
    const totalValue = rows.reduce((s, r) => s + (r.asset_value_eur || 0), 0);
    const totalRev   = rows.reduce((s, r) => s + (r.annual_revenue   || 0), 0);
    const totalUpsd  = rows.reduce((s, r) => s + (r.annual_uplift || 0), 0);
    return {
      total: rows.length, scored: scored.length,
      avgScore, totalValue, totalRev, totalUpsd,
      delta_vs_market: avgScore != null ? avgScore - 72 : 0,
    };
  }, [rows]);

  return (
    <div data-testid="portfolio-page" style={{ background: '#FAFAFA', minHeight: '100vh' }}>
      <div className="max-w-[1200px] mx-auto px-6 md:px-12 pt-24 pb-32">

        {/* ─── Massive typographic header ─────────────────────────── */}
        <header className="mb-20">
          <span className="ts-kicker" data-testid="portfolio-kicker">
            Portfolio
          </span>
          {kpis && (
            <div className="mt-6 flex items-baseline gap-5 flex-wrap" data-testid="portfolio-hero-value">
              <span
                className="ts-h1"
                style={{ fontSize: 'clamp(48px, 7vw, 96px)' }}
              >
                {fmtEUR(kpis.totalValue, { compact: true })}
              </span>
              {kpis.totalUpsd > 0 && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1"
                  style={{
                    background: 'rgba(16,185,129,0.10)',
                    border: '1px solid rgba(16,185,129,0.30)',
                    borderRadius: 999,
                  }}
                  data-testid="portfolio-uplift-pill"
                >
                  <TrendingUp size={11} strokeWidth={2} style={{ color: '#10B981' }} />
                  <span
                    className="font-mono-tight text-[11px]"
                    style={{ color: '#10B981', fontWeight: 600 }}
                  >
                    +{fmtEUR(kpis.totalUpsd, { compact: true })} upside
                  </span>
                </span>
              )}
            </div>
          )}
          <p className="ts-body mt-6 max-w-[640px]" data-testid="portfolio-subtitle">
            {kpis ? `${kpis.total} assets · ${fmtEUR(kpis.totalRev, { compact: true })} projected revenue` : 'Your hospitality portfolio at a glance.'}
          </p>
          {rows.length > 0 && (
            <div className="mt-10">
              <Link
                to="/invest"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px]"
                style={{
                  background: '#B8956A', color: '#FFFFFF',
                  borderRadius: 999, fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  boxShadow: '0 4px 14px rgba(184,149,106,0.18)',
                }}
                data-testid="portfolio-analyze-new-btn"
              >
                <Plus size={13} strokeWidth={2} />
                Analyze new asset
              </Link>
            </div>
          )}
        </header>

        {/* ─── Empty State ────────────────────────────────────────── */}
        {loaded && rows.length === 0 && <EmptyState />}

        {/* ─── Minimal KPI strip ──────────────────────────────────── */}
        {kpis && (
          <section className="mb-20" data-testid="portfolio-kpi-strip">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px"
              style={{ background: '#E4E4E7', borderRadius: 16, overflow: 'hidden', border: '1px solid #E4E4E7' }}>
              <KPI label="Assets" value={kpis.total} testId="kpi-assets" />
              <KPI label="Avg Score" value={kpis.avgScore ?? '—'} sub="/ 100" testId="kpi-avg-score" />
              <KPI label="Annual Revenue" value={fmtEUR(kpis.totalRev, { compact: true })} testId="kpi-total-rev" />
              <KPI label="Upside" value={fmtEUR(kpis.totalUpsd, { compact: true })} accent="#10B981" testId="kpi-upside" />
            </div>
          </section>
        )}

        {/* ─── Asset list ─────────────────────────────────────────── */}
        {rows.length > 0 && (
          <section data-testid="portfolio-assets">
            <div className="mb-10">
              <span className="ts-kicker">Holdings</span>
              <h2 className="ts-h2 mt-3" data-testid="portfolio-assets-headline">
                Your assets.
              </h2>
            </div>

            <div className="space-y-4">
              {rows.map((asset) => (
                <AssetRow key={asset.id} asset={asset} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}


// ─── Empty state ────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <section
      className="p-16 text-center"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: 16,
      }}
      data-testid="portfolio-empty"
    >
      <h2 className="ts-h3">
        Build your portfolio view.
      </h2>
      <p className="ts-small mt-4 max-w-[460px] mx-auto">
        Analyze or add assets to see your aggregate position and upside.
      </p>
      <Link
        to="/invest"
        className="mt-8 inline-flex items-center gap-2 px-6 py-3 text-[13.5px]"
        style={{
          background: '#B8956A', color: '#FFFFFF',
          borderRadius: 999, fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          boxShadow: '0 4px 14px rgba(184,149,106,0.18)',
        }}
        data-testid="portfolio-empty-cta"
      >
        Analyze an asset
        <ArrowUpRight size={14} strokeWidth={2} />
      </Link>
    </section>
  );
}


// ─── Minimal KPI cell ───────────────────────────────────────────────────
function KPI({ label, value, sub, accent, testId }) {
  return (
    <div className="p-7 bg-white" data-testid={testId}>
      <div className="ts-kicker" style={{ color: '#52525B' }}>
        {label}
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span
          className="font-display tabular-nums"
          style={{
            color: accent || '#09090B',
            fontSize: 32, fontWeight: 500,
            letterSpacing: '-0.03em', lineHeight: 1,
          }}
        >
          {value}
        </span>
        {sub && (
          <span className="ts-small">
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}


// ─── Asset row — wide tabular card, minimal ─────────────────────────────
function AssetRow({ asset }) {
  // Synthetic deterministic daily signal (kept for visual continuity)
  const idHash = Array.from(String(asset.id || asset.title || '')).reduce((s, c) => s + c.charCodeAt(0), 0);
  const dailyDelta = ((idHash % 17) - 8) * 0.4;
  const movingUp = dailyDelta >= 0.2;
  const movingFlat = dailyDelta >= -0.2 && dailyDelta < 0.2;
  const signalIcon = movingUp ? TrendingUp : (movingFlat ? Activity : TrendingDown);
  const SignalIcon = signalIcon;
  const signalColor = movingUp ? '#10B981' : (movingFlat ? '#52525B' : '#EF4444');
  const score = asset.asset_score ?? null;
  const monthly = asset.monthly_eur ?? null;

  return (
    <Link
      to={`/asset/${encodeURIComponent(asset.id)}`}
      className="group block p-6 transition-all"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: 16,
      }}
      data-testid={`portfolio-asset-card-${asset.id}`}
    >
      <div className="grid grid-cols-12 gap-6 items-center">
        {/* Image + title — 6 cols */}
        <div className="col-span-12 md:col-span-6 flex items-center gap-5 min-w-0">
          {asset.image ? (
            <img
              src={asset.image} alt={asset.title}
              className="flex-shrink-0 object-cover"
              style={{ width: 64, height: 64, borderRadius: 12 }}
            />
          ) : (
            <div
              className="flex-shrink-0 flex items-center justify-center"
              style={{ width: 64, height: 64, background: '#F4F4F5', borderRadius: 12 }}
            >
              <MapPin size={18} strokeWidth={1.5} style={{ color: '#A1A1AA' }} />
            </div>
          )}
          <div className="min-w-0">
            <h3
              className="font-display truncate"
              style={{
                color: '#09090B', fontSize: 17, fontWeight: 500,
                letterSpacing: '-0.02em',
              }}
              data-testid={`portfolio-asset-title-${asset.id}`}
            >
              {asset.title}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 ts-small" style={{ fontSize: 12 }}>
              <MapPin size={10} strokeWidth={1.5} />
              <span>{asset.neighborhood ? `${asset.neighborhood}, ` : ''}{asset.city}</span>
            </div>
          </div>
        </div>

        {/* Metric tiles — 3 cells × 2 cols on md+ */}
        <Metric label="Value"   value={fmtEUR(asset.asset_value_eur, { compact: true })} />
        <Metric label="Monthly" value={monthly != null ? fmtEUR(monthly, { compact: true }) : '—'} />
        <div className="col-span-4 md:col-span-2 flex items-center justify-end gap-3">
          <div className="text-right">
            <div className="ts-kicker" style={{ fontSize: 9, color: '#52525B' }}>Score</div>
            <div className="font-display tabular-nums mt-1"
              style={{ color: '#09090B', fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em' }}>
              {score ?? '—'}
            </div>
          </div>
          <div
            className="flex items-center justify-center"
            style={{
              width: 36, height: 36,
              background: signalColor === '#10B981' ? 'rgba(16,185,129,0.10)'
                : signalColor === '#EF4444' ? 'rgba(239,68,68,0.10)'
                : 'rgba(82,82,91,0.08)',
              border: `1px solid ${signalColor}30`,
              borderRadius: 999,
            }}
            data-testid={`portfolio-signal-${asset.id}`}
          >
            <SignalIcon size={14} strokeWidth={2} style={{ color: signalColor }} />
          </div>
        </div>
      </div>
    </Link>
  );
}


function Metric({ label, value }) {
  return (
    <div className="col-span-4 md:col-span-2">
      <div className="ts-kicker" style={{ fontSize: 9, color: '#52525B' }}>{label}</div>
      <div className="font-display tabular-nums mt-1"
        style={{ color: '#09090B', fontSize: 18, fontWeight: 500, letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  );
}
