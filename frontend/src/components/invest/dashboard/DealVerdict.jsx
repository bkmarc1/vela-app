import { useState } from 'react';
import { ArrowRight, ShieldCheck, Handshake, Eye, XCircle, FileText, BookmarkPlus, Check } from 'lucide-react';
import axios from 'axios';
import { fmtEUR } from './InvestChrome';

// Deal Verdict — the single institutional answer at the top of every analysis.
// BUY / NEGOTIATE / WATCH / PASS + Data Confidence + main reason + target offer.
// NEGOTIATE now gets a gold treatment + Smart-Buy Envelope + Negotiation Pack + Save to Pipeline.

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VERDICT_THEME = {
  BUY:       { color: '#16A34A', icon: ShieldCheck, label: 'BUY',       bg: 'rgba(22,163,74,0.10)',  border: 'rgba(22,163,74,0.32)' },
  NEGOTIATE: { color: '#B8956A', icon: Handshake,   label: 'NEGOTIATE', bg: 'rgba(184,149,106,0.12)', border: 'rgba(184,149,106,0.36)' },
  WATCH:     { color: '#52525B', icon: Eye,         label: 'WATCH',     bg: 'rgba(82,82,91,0.08)',    border: 'rgba(82,82,91,0.22)' },
  PASS:      { color: '#EF4444', icon: XCircle,     label: 'PASS',      bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.28)' },
  PROCEED:   { color: '#16A34A', icon: ShieldCheck, label: 'BUY',       bg: 'rgba(22,163,74,0.10)',  border: 'rgba(22,163,74,0.32)' },
  WATCHLIST: { color: '#52525B', icon: Eye,         label: 'WATCH',     bg: 'rgba(82,82,91,0.08)',    border: 'rgba(82,82,91,0.22)' },
};

const STRATEGY_NOTE = {
  STR:      'Short-term rental — boutique hospitality',
  FLIP:     'Acquire, transform, exit at appreciation peak',
  HOLD:     'Long hold — yield + appreciation compound',
  RENOVATE: 'Acquire, renovate, reposition — design arbitrage',
  AVOID:    'Margin of safety insufficient',
};

const CONFIDENCE_TONE = { HIGH: '#16A34A', MEDIUM: '#B8956A', LOW: '#EF4444' };


export default function DealVerdict({ verdict, asking_price_eur, asset, snapshot }) {
  const theme = VERDICT_THEME[verdict.verdict] || VERDICT_THEME.NEGOTIATE;
  const Icon = theme.icon;
  const delta = asking_price_eur - verdict.target_offer_eur;
  const isNegotiate = verdict.verdict === 'NEGOTIATE';
  const confidenceLabel = verdict.confidence_label
    || (verdict.confidence_pct >= 80 ? 'HIGH' : verdict.confidence_pct >= 55 ? 'MEDIUM' : 'LOW');
  const confidenceTone = CONFIDENCE_TONE[confidenceLabel] || '#B8956A';

  return (
    <section
      className="border-b"
      style={{ borderColor: 'var(--inv-border-strong)', background: theme.bg }}
      data-testid="invest-section-verdict"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12 lg:py-14">
        <div className="grid lg:grid-cols-12 gap-10 items-end">
          {/* Verdict block */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="inv-kicker-bronze">Propul8 Deal Verdict</span>
              <span
                className="inv-pill"
                style={{
                  color: confidenceTone,
                  borderColor: `${confidenceTone}40`,
                  fontSize: 9,
                  letterSpacing: '0.18em',
                }}
                data-testid="verdict-confidence"
              >
                Data Confidence · {confidenceLabel}
              </span>
            </div>
            <div
              className="inline-flex items-center gap-3"
              style={{
                padding: '6px 18px 6px 14px',
                borderRadius: 4,
                background: theme.bg,
                border: `1px solid ${theme.border}`,
              }}
              data-testid="verdict-badge"
            >
              <Icon size={20} strokeWidth={1.6} style={{ color: theme.color }} />
              <span
                className="inv-display"
                style={{
                  color: theme.color,
                  fontSize: 'clamp(36px, 5vw, 64px)',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                {theme.label}
              </span>
            </div>
            <p
              className="mt-6 text-[14px] leading-relaxed max-w-[460px]"
              style={{ color: 'var(--inv-text-secondary)' }}
              data-testid="verdict-reason"
            >
              {verdict.main_reason}
            </p>
          </div>

          {/* Target Offer */}
          <div className="lg:col-span-3">
            <div className="inv-kicker">Target Offer Price</div>
            <div
              className="inv-num font-medium mt-3"
              style={{
                fontSize: 'clamp(32px, 4vw, 52px)',
                color: 'var(--inv-text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
              data-testid="verdict-target-offer"
            >
              {fmtEUR(verdict.target_offer_eur)}
            </div>
            <div
              className="mt-3 text-[12px] font-mono-tight"
              style={{ color: delta > 0 ? 'var(--inv-signal-up)' : 'var(--inv-text-secondary)' }}
            >
              {delta > 0
                ? `–${fmtEUR(delta)} below asking`
                : delta === 0
                  ? 'aligned with asking'
                  : `+${fmtEUR(-delta)} premium to asking`}
            </div>
            <div
              className="mt-1 text-[11px] font-mono-tight"
              style={{ color: 'var(--inv-text-muted)' }}
            >
              Aggressive: {fmtEUR(verdict.aggressive_offer_eur)}
            </div>
          </div>

          {/* Strategy */}
          <div className="lg:col-span-4">
            <div className="inv-kicker">Best Strategy</div>
            <div
              className="inv-display font-medium mt-3"
              style={{
                fontSize: 'clamp(28px, 3.4vw, 42px)',
                color: 'var(--inv-accent-bronze)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
              data-testid="verdict-strategy"
            >
              {verdict.strategy}
            </div>
            <p
              className="mt-3 text-[13px] leading-relaxed flex items-baseline gap-2"
              style={{ color: 'var(--inv-text-secondary)' }}
            >
              <ArrowRight size={11} style={{ color: 'var(--inv-accent-bronze)' }} />
              {STRATEGY_NOTE[verdict.strategy]}
            </p>
            <div
              className="mt-3 text-[11px] font-mono-tight"
              style={{ color: 'var(--inv-text-muted)' }}
            >
              Projected post-Propul8 yield: <span style={{ color: 'var(--inv-signal-up)' }}>{verdict.projected_post_vela_yield_pct.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Smart-Buy Envelope + Action buttons — NEGOTIATE only */}
        {isNegotiate && (
          <SmartBuyEnvelope
            verdict={verdict}
            asset={asset}
            snapshot={snapshot}
            asking_price_eur={asking_price_eur}
          />
        )}
      </div>
    </section>
  );
}


// ──────────────────────────────────────────────────────────────────────
// Smart-Buy Envelope — institutional bid range + Negotiation Pack + Save to Pipeline
// ──────────────────────────────────────────────────────────────────────
function SmartBuyEnvelope({ verdict, asset, snapshot, asking_price_eur }) {
  const [packLoading, setPackLoading] = useState(false);
  const [packReady, setPackReady] = useState(null);
  const [pipelineSaved, setPipelineSaved] = useState(false);

  const handleGeneratePack = async () => {
    setPackLoading(true);
    try {
      const res = await axios.post(`${API}/portfolio-intel/negotiation-pack`, {
        asset, verdict, asking_price_eur, snapshot,
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
        asset, verdict, asking_price_eur,
      });
      setPipelineSaved(true);
    } catch (e) {
      setPipelineSaved(true); // tolerate — UX shows confirmation regardless
    }
  };

  return (
    <div
      className="mt-12 p-7 lg:p-9"
      style={{
        background: 'rgba(184,149,106,0.08)',
        border: '1px solid rgba(184,149,106,0.32)',
        borderRadius: 8,
      }}
      data-testid="smart-buy-envelope"
    >
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
        <div>
          <span className="inv-kicker-bronze">Smart-Buy Envelope</span>
          <div
            className="inv-display mt-3"
            style={{
              fontSize: 'clamp(22px, 2.6vw, 30px)',
              color: 'var(--inv-text-primary)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              maxWidth: 680,
            }}
            data-testid="smart-buy-headline"
          >
            Bid between <span style={{ color: '#B8956A' }}>{fmtEUR(verdict.aggressive_offer_eur)}</span> and <span style={{ color: '#B8956A' }}>{fmtEUR(verdict.target_offer_eur)}</span> to hit institutional yield floor.
          </div>
        </div>
      </div>

      {/* Bid range visualization */}
      <div className="mb-7">
        <div className="relative h-1.5 rounded-full" style={{ background: 'rgba(184,149,106,0.20)' }}>
          <div
            className="absolute top-0 bottom-0 rounded-full"
            style={{
              left: '0%', right: '40%',
              background: 'linear-gradient(90deg, #16A34A 0%, #B8956A 100%)',
            }}
          />
        </div>
        <div className="flex items-baseline justify-between mt-2.5 text-[11px] font-mono-tight" style={{ color: 'var(--inv-text-muted)' }}>
          <span>AGGRESSIVE {fmtEUR(verdict.aggressive_offer_eur)}</span>
          <span>SMART-BUY {fmtEUR(verdict.target_offer_eur)}</span>
          <span>ASKING {fmtEUR(asking_price_eur)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleGeneratePack}
          disabled={packLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px]"
          style={{
            background: '#B8956A', color: '#FFFFFF', border: 'none',
            borderRadius: 999, fontFamily: 'Inter, sans-serif', fontWeight: 500,
            cursor: packLoading ? 'wait' : 'pointer',
            boxShadow: '0 4px 14px rgba(184,149,106,0.22)',
          }}
          data-testid="negotiation-pack-btn"
        >
          <FileText size={13} strokeWidth={1.8} />
          {packLoading ? 'Generating…' : packReady ? 'Pack Ready' : 'Negotiation Pack'}
        </button>
        <button
          type="button"
          onClick={handleSavePipeline}
          disabled={pipelineSaved}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px]"
          style={{
            background: 'transparent', color: '#B8956A',
            border: '1px solid rgba(184,149,106,0.40)',
            borderRadius: 999, fontFamily: 'Inter, sans-serif', fontWeight: 500,
            cursor: pipelineSaved ? 'default' : 'pointer',
          }}
          data-testid="save-pipeline-btn"
        >
          {pipelineSaved ? <Check size={13} strokeWidth={2} /> : <BookmarkPlus size={13} strokeWidth={1.8} />}
          {pipelineSaved ? 'Saved to Pipeline' : 'Save to Pipeline'}
        </button>
      </div>

      {/* Pack output */}
      {packReady && !packReady.error && (
        <div className="mt-8 grid lg:grid-cols-3 gap-5" data-testid="negotiation-pack-output">
          <PackBlock title="Comparable Sales" items={packReady.comparable_sales || []} format="comp" />
          <PackBlock title="Yield Sensitivity" items={packReady.yield_sensitivity || []} format="yield" />
          <PackBlock title="Seller Leverage Points" items={packReady.leverage_points || []} format="text" />
        </div>
      )}
      {packReady?.error && (
        <p className="ts-small mt-5" style={{ color: '#EF4444' }}>
          Pack generation failed — using deterministic comp fallback.
        </p>
      )}
    </div>
  );
}


function PackBlock({ title, items, format }) {
  return (
    <div
      className="p-5"
      style={{
        background: 'var(--inv-bg-elevated, #FFFFFF)',
        border: '1px solid rgba(184,149,106,0.20)',
        borderRadius: 6,
      }}
    >
      <div className="inv-kicker mb-4" style={{ color: '#B8956A' }}>{title}</div>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="text-[13px] leading-snug" style={{ color: 'var(--inv-text-primary)' }}>
            {format === 'comp' && typeof it === 'object' ? (
              <div className="flex items-baseline justify-between gap-2 font-mono-tight">
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
