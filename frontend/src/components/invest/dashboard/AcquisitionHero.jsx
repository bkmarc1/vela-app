import { ArrowUpRight, ShieldCheck, Handshake, Eye, XCircle, FileText, Bell, Compass, BookmarkPlus, Check } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { fmtEUR } from './InvestChrome';
import DataBadge from '../../shared/DataBadge';
import { buildInvestProvenance } from '../../../lib/dataProvenance';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CONFIDENCE_TONE = { HIGH: '#16A34A', MEDIUM: '#B8956A', LOW: '#EF4444' };

// Propul8 INVEST — Acquisition Hero.
// The single elegant summary card. First (and often only) thing the user reads:
//   property image · location · price · €/sqm · verdict · confidence · 1-line · ONE CTA.
// All deeper analysis lives below in collapsed accordion sections.

const VERDICT_THEME = {
  BUY: {
    color: 'var(--inv-signal-up)',
    icon: ShieldCheck,
    cta_icon: FileText,
    cta_label: 'Build investment memo',
    cta_route: 'memo',
    bg_glow: 'rgba(125,191,143,0.10)',
    border: 'rgba(125,191,143,0.32)',
  },
  NEGOTIATE: {
    color: 'var(--inv-accent-bronze)',
    icon: Handshake,
    cta_icon: Handshake,
    cta_label: 'Generate offer strategy',
    cta_route: 'memo',
    bg_glow: 'rgba(196,167,137,0.10)',
    border: 'rgba(196,167,137,0.32)',
  },
  WATCH: {
    color: '#52525B',
    icon: Eye,
    cta_icon: Bell,
    cta_label: 'Save to watchlist',
    cta_route: 'memo',
    bg_glow: 'rgba(155,176,194,0.10)',
    border: 'rgba(155,176,194,0.32)',
  },
  PASS: {
    color: 'var(--inv-signal-down)',
    icon: XCircle,
    cta_icon: Compass,
    cta_label: 'Find better deals',
    cta_route: 'invest',
    bg_glow: 'rgba(201,122,106,0.10)',
    border: 'rgba(201,122,106,0.32)',
  },
};

export default function AcquisitionHero({ analysis, asset_id }) {
  const navigate = useNavigate();
  const hero = analysis.acquisition_hero;
  const v = analysis.deal_verdict;
  const theme = VERDICT_THEME[v.verdict] || VERDICT_THEME.WATCH;
  const Icon = theme.icon;
  const CTAIcon = theme.cta_icon;

  // Provenance — surfaces strict status next to every number.
  const prov = buildInvestProvenance(analysis.input || {});

  const handleCTA = () => {
    if (theme.cta_route === 'memo') navigate(`/invest/memo/${asset_id || 'demo'}`);
    else navigate('/invest');
  };

  return (
    <section
      className="border-b"
      style={{
        background: 'var(--inv-bg-deep, #FAFAFA)',
        borderColor: 'var(--inv-border)',
      }}
      data-testid="invest-section-acquisition-hero"
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-12 lg:py-16">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14">
          {/* LEFT — property image */}
          <div className="lg:col-span-5">
            {hero.primary_image ? (
              <div
                className="aspect-[4/3] w-full overflow-hidden"
                style={{
                  borderRadius: 4,
                  border: '1px solid var(--inv-border)',
                }}
                data-testid="invest-hero-image-wrap"
              >
                <img
                  src={hero.primary_image}
                  alt={hero.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.015]"
                  data-testid="invest-hero-image"
                />
              </div>
            ) : (
              <div
                className="aspect-[4/3] w-full flex items-center justify-center"
                style={{
                  background: 'rgba(196,167,137,0.04)',
                  border: '1px solid var(--inv-border)',
                  borderRadius: 4,
                }}
              >
                <span className="inv-kicker">No image available</span>
              </div>
            )}
          </div>

          {/* RIGHT — verdict block */}
          <div className="lg:col-span-7 flex flex-col">
            {/* Location kicker */}
            <span
              className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
              style={{ color: 'var(--inv-text-muted)' }}
              data-testid="invest-hero-location"
            >
              {hero.location_label}
            </span>

            {/* Title */}
            <h1
              className="inv-display font-medium mt-3 leading-[1.04]"
              style={{
                color: 'var(--inv-text-primary)',
                fontSize: 'clamp(26px, 3.2vw, 38px)',
                letterSpacing: '-0.015em',
                maxWidth: 600,
              }}
              data-testid="invest-hero-title"
            >
              {hero.title}
            </h1>

            {/* Price + €/sqm */}
            <div className="flex items-end gap-5 mt-6 flex-wrap">
              <div className="flex flex-col">
                <span
                  className="font-mono-tight font-medium tabular-nums"
                  style={{
                    fontSize: 'clamp(28px, 3.4vw, 40px)',
                    color: 'var(--inv-text-primary)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                  data-testid="invest-hero-asking-price"
                >
                  {fmtEUR(hero.asking_price_eur)}
                </span>
                <div className="mt-2">
                  <DataBadge cell={prov.asking_price_eur} theme="dark" size="sm" testId="invest-hero-price-badge" />
                </div>
              </div>
              {hero.price_per_sqm_eur && (
                <div className="flex flex-col">
                  <span
                    className="font-mono-tight text-[12px]"
                    style={{ color: 'var(--inv-text-muted)' }}
                    data-testid="invest-hero-price-per-sqm"
                  >
                    €{hero.price_per_sqm_eur.toLocaleString()}/m²
                  </span>
                  <div className="mt-2">
                    <DataBadge cell={prov.price_per_sqm_eur} theme="dark" size="sm" testId="invest-hero-psqm-badge" />
                  </div>
                </div>
              )}
              <div className="flex flex-col">
                <span
                  className="font-mono-tight text-[12px]"
                  style={{ color: 'var(--inv-text-muted)' }}
                  data-testid="invest-hero-m2"
                >
                  {analysis.input?.m2 ? `${analysis.input.m2} m²` : '— m²'}
                </span>
                <div className="mt-2">
                  <DataBadge cell={prov.m2} theme="dark" size="sm" testId="invest-hero-m2-badge" />
                </div>
              </div>
            </div>

            {/* Verdict + confidence row */}
            <div
              className="mt-7 flex items-center gap-4 flex-wrap"
              data-testid="invest-hero-verdict-row"
            >
              <div
                className="inline-flex items-center gap-2.5 px-4 py-2.5"
                style={{
                  background: theme.bg_glow,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 4,
                }}
                data-testid="invest-hero-verdict-badge"
              >
                <Icon size={15} strokeWidth={1.7} style={{ color: theme.color }} />
                <span
                  className="font-mono-tight text-[12px] tracking-[0.20em] uppercase"
                  style={{ color: theme.color, fontWeight: 500 }}
                >
                  {v.verdict}
                </span>
              </div>
              <span
                className="font-mono-tight text-[10.5px] tracking-[0.16em] uppercase"
                style={{
                  color: CONFIDENCE_TONE[v.confidence_label] || (v.confidence_pct >= 80 ? '#16A34A' : v.confidence_pct >= 55 ? '#B8956A' : '#EF4444'),
                }}
                data-testid="invest-hero-confidence"
              >
                Data Confidence · {v.confidence_label || (v.confidence_pct >= 80 ? 'HIGH' : v.confidence_pct >= 55 ? 'MEDIUM' : 'LOW')}
              </span>
            </div>

            {/* 1-line explanation */}
            <p
              className="mt-5 text-[14.5px] leading-relaxed max-w-[560px]"
              style={{ color: 'var(--inv-text-secondary)' }}
              data-testid="invest-hero-reason"
            >
              {hero.why_bullets?.why || v.main_reason}
            </p>

            {/* Smart-Buy Envelope — surfaces ONLY when verdict is NEGOTIATE */}
            {v.verdict === 'NEGOTIATE' && (
              <SmartBuyEnvelope verdict={v} analysis={analysis} asset_id={asset_id} />
            )}

            {/* 5-card Decision Strip — the minimalist summary the user
                wants to see in 10 seconds. */}
            <div
              className="mt-7 grid grid-cols-2 lg:grid-cols-5 gap-px"
              style={{ background: 'var(--inv-border)' }}
              data-testid="invest-decision-strip"
            >
              <StripCard label="Decision"        value={v.verdict}              accent={theme.color}                 testId="strip-decision" />
              <StripCard label="Price Position"  value={hero.price_position}    accent={_positionColor(hero.price_position)} testId="strip-price-position" />
              <StripCard label="Market Support"  value={hero.market_support}    accent={_supportColor(hero.market_support)}  testId="strip-market-support" />
              <StripCard label="Biggest Risk"    value={hero.why_bullets?.risk?.split('.')[0] || 'Needs data'} testId="strip-risk" small />
              <StripCard label="Next Best Action" value={hero.next_best_action} accent="var(--inv-accent-bronze)"   testId="strip-next-action" small />
            </div>

            {/* Primary CTA — unified green per design system */}
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <button
                onClick={handleCTA}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 text-[13px] transition-all"
                style={{
                  background: '#B8956A',
                  color: '#FFFFFF',
                  borderRadius: 3,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  letterSpacing: '-0.005em',
                  boxShadow: '0 1px 2px rgba(184,149,106,0.10)',
                }}
                data-testid="invest-hero-primary-cta"
              >
                <CTAIcon size={13} strokeWidth={1.7} />
                {theme.cta_label}
                <ArrowUpRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const _positionColor = (p) => p === 'Below Market' ? '#B8956A' : p === 'Above Market' ? '#B8956A' : p === 'In Line' ? 'var(--inv-text-secondary)' : 'var(--inv-text-muted)';
const _supportColor  = (s) => s === 'Strong' ? '#B8956A' : s === 'Medium' ? 'var(--inv-accent-bronze)' : 'var(--inv-text-muted)';

function StripCard({ label, value, accent, testId, small }) {
  return (
    <div
      className="p-5"
      style={{ background: 'var(--inv-bg)' }}
      data-testid={testId}
    >
      <div
        className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase"
        style={{ color: 'var(--inv-text-muted)' }}
      >
        {label}
      </div>
      <div
        className={small ? 'mt-2 leading-snug' : 'mt-2 font-mono-tight tabular-nums'}
        style={{
          fontSize: small ? 13.5 : 'clamp(15px, 1.6vw, 19px)',
          color: accent || 'var(--inv-text-primary)',
          fontWeight: 500,
          letterSpacing: small ? '-0.005em' : '-0.01em',
        }}
      >
        {value || '—'}
      </div>
    </div>
  );
}



// ──────────────────────────────────────────────────────────────────────
// Smart-Buy Envelope — gold institutional bid range + Negotiation Pack
// + Save to Pipeline. Renders ONLY when verdict === 'NEGOTIATE'.
// ──────────────────────────────────────────────────────────────────────
function SmartBuyEnvelope({ verdict, analysis, asset_id }) {
  const [packLoading, setPackLoading] = useState(false);
  const [packReady, setPackReady] = useState(null);
  const [pipelineSaved, setPipelineSaved] = useState(false);
  const asking = analysis.input?.asking_price_eur || 0;

  const handleGeneratePack = async () => {
    setPackLoading(true);
    try {
      const res = await axios.post(`${API}/portfolio-intel/negotiation-pack`, {
        asset: analysis.input || {}, verdict, asking_price_eur: asking,
        snapshot: analysis.acquisition_hero,
      });
      setPackReady(res.data?.pack || {});
    } catch (e) {
      setPackReady({ error: true });
    } finally {
      setPackLoading(false);
    }
  };

  const handleSavePipeline = async () => {
    try {
      await axios.post(`${API}/portfolio-intel/pipeline`, {
        asset: analysis.input || {}, verdict, asking_price_eur: asking, asset_id,
      });
    } catch {/* tolerate */}
    setPipelineSaved(true);
  };

  return (
    <div
      className="mt-7 p-6 lg:p-7"
      style={{
        background: 'rgba(184,149,106,0.10)',
        border: '1px solid rgba(184,149,106,0.32)',
        borderRadius: 6,
      }}
      data-testid="smart-buy-envelope"
    >
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-5">
        <span
          className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
          style={{ color: '#B8956A', fontWeight: 500 }}
        >
          Smart-Buy Envelope
        </span>
        <span
          className="font-mono-tight text-[10px]"
          style={{ color: 'var(--inv-text-muted)' }}
        >
          Institutional yield floor
        </span>
      </div>
      <div
        className="text-[16px] lg:text-[18px] leading-snug max-w-[680px]"
        style={{ color: 'var(--inv-text-primary)', fontWeight: 500, letterSpacing: '-0.015em' }}
        data-testid="smart-buy-headline"
      >
        Bid between <span style={{ color: '#B8956A' }}>{fmtEUR(verdict.aggressive_offer_eur)}</span>
        {' '}and <span style={{ color: '#B8956A' }}>{fmtEUR(verdict.target_offer_eur)}</span>
        {' '}to hit the institutional yield floor.
      </div>

      {/* Range visualization */}
      <div className="mt-6 mb-5">
        <div className="relative h-1.5 rounded-full" style={{ background: 'rgba(184,149,106,0.18)' }}>
          <div
            className="absolute top-0 bottom-0 rounded-full"
            style={{ left: '0%', right: '40%', background: 'linear-gradient(90deg, #16A34A 0%, #B8956A 100%)' }}
          />
        </div>
        <div className="flex items-baseline justify-between mt-2.5 font-mono-tight text-[10.5px]"
          style={{ color: 'var(--inv-text-muted)' }}>
          <span>AGGRESSIVE {fmtEUR(verdict.aggressive_offer_eur)}</span>
          <span>SMART-BUY {fmtEUR(verdict.target_offer_eur)}</span>
          <span>ASKING {fmtEUR(asking)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button" onClick={handleGeneratePack} disabled={packLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-[12.5px]"
          style={{
            background: '#B8956A', color: '#FFFFFF', border: 'none',
            borderRadius: 999, fontFamily: 'Inter, sans-serif', fontWeight: 500,
            cursor: packLoading ? 'wait' : 'pointer',
            boxShadow: '0 4px 14px rgba(184,149,106,0.22)',
          }}
          data-testid="negotiation-pack-btn"
        >
          <FileText size={12} strokeWidth={1.9} />
          {packLoading ? 'Generating…' : (packReady && !packReady.error) ? 'Pack Ready' : 'Negotiation Pack'}
        </button>
        <button
          type="button" onClick={handleSavePipeline} disabled={pipelineSaved}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-[12.5px]"
          style={{
            background: 'transparent', color: '#B8956A',
            border: '1px solid rgba(184,149,106,0.40)',
            borderRadius: 999, fontFamily: 'Inter, sans-serif', fontWeight: 500,
            cursor: pipelineSaved ? 'default' : 'pointer',
          }}
          data-testid="save-pipeline-btn"
        >
          {pipelineSaved ? <Check size={12} strokeWidth={2} /> : <BookmarkPlus size={12} strokeWidth={1.9} />}
          {pipelineSaved ? 'Saved to Pipeline' : 'Save to Pipeline'}
        </button>
      </div>

      {packReady && !packReady.error && (
        <div className="mt-7 grid md:grid-cols-3 gap-4" data-testid="negotiation-pack-output">
          <PackBlock title="Comparable Sales"  items={packReady.comparable_sales  || []} format="comp" />
          <PackBlock title="Yield Sensitivity" items={packReady.yield_sensitivity || []} format="yield" />
          <PackBlock title="Leverage Points"   items={packReady.leverage_points   || []} format="text" />
        </div>
      )}
      {packReady?.error && (
        <p className="mt-5 text-[12px]" style={{ color: '#EF4444' }} data-testid="negotiation-pack-error">
          Pack generation failed — please retry.
        </p>
      )}
    </div>
  );
}

function PackBlock({ title, items, format }) {
  return (
    <div
      className="p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(184,149,106,0.22)', borderRadius: 5 }}
    >
      <div
        className="font-mono-tight text-[9.5px] tracking-[0.20em] uppercase mb-3"
        style={{ color: '#B8956A', fontWeight: 500 }}
      >
        {title}
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="text-[12.5px] leading-snug" style={{ color: 'var(--inv-text-primary)' }}>
            {format === 'comp' && typeof it === 'object' ? (
              <div className="flex items-baseline justify-between gap-3 font-mono-tight">
                <span style={{ color: 'var(--inv-text-secondary)' }}>{it.address}</span>
                <span style={{ color: '#B8956A' }}>{it.price}</span>
              </div>
            ) : format === 'yield' && typeof it === 'object' ? (
              <div className="flex items-baseline justify-between font-mono-tight">
                <span style={{ color: 'var(--inv-text-secondary)' }}>{it.scenario}</span>
                <span style={{ color: '#B8956A' }}>{it.yield_pct}%</span>
              </div>
            ) : (
              <span>{typeof it === 'string' ? it : JSON.stringify(it)}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
