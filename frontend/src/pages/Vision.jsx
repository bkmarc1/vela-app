// Propul8 · Vision page — the strategic narrative shipped INTO the product.
//
// Mirrors the pitch deck exactly (slides 11-15): 10 Moves to Build the Dream
// Platform · Product Roadmap · Why Propul8 Wins · Competitive Landscape ·
// Closing manifesto. Dark institutional aesthetic to match the deck.

import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, RefreshCcw, Target, Globe2,
  Sparkles, TrendingUp, Activity, Building2, ShieldCheck, Network,
  FileBarChart, Banknote, Receipt, Wrench, LineChart, Bell,
} from 'lucide-react';

const GOLD       = '#B8956A';
const GOLD_DEEP  = '#8B7355';
const BG         = '#0A0A0A';
const SURFACE    = '#141414';
const LINE       = '#1F1F1F';
const TEXT       = '#F5F1EA';
const TEXT_MUTED = '#7A7268';


// ─── 10 Moves ────────────────────────────────────────────────────────
const MOVES = [
  { n: 1,  title: 'AI Comparable Sales Engine',  icon: LineChart,
    body: 'Auto-find comparables from 50+ sources with actual transaction values and confidence intervals.' },
  { n: 2,  title: 'Predictive Market Cycles',    icon: TrendingUp,
    body: 'Forecast neighborhood price movements 6–12 months ahead using demand–supply signals.' },
  { n: 3,  title: 'Smart Renovation ROI',         icon: Wrench,
    body: 'Upload contractor quotes. Get AI-projected value add and yield impact before committing.' },
  { n: 4,  title: 'Portfolio Optimizer',          icon: Activity,
    body: 'AI-suggested rebalancing: hold, refinance, or exit.' },
  { n: 5,  title: 'Dynamic Pricing Engine',       icon: Sparkles,
    body: 'API integrations with Airbnb, Booking to auto-adjust pricing based on events and seasonality.' },
  { n: 6,  title: 'Regulatory Risk Monitor',      icon: ShieldCheck,
    body: 'Track STR regulations and zoning changes across all portfolio locations with compliance alerts.' },
  { n: 7,  title: 'Investor Network',             icon: Network,
    body: 'Curated network for off-market deals, co-investment opportunities, and verified matching.' },
  { n: 8,  title: 'White-Label Reports',          icon: FileBarChart,
    body: 'One-click institutional-grade investment memos.' },
  { n: 9,  title: 'Mortgage Intelligence',        icon: Banknote,
    body: 'Track rate movements across Greek/EU banks. Alert on optimal refinance windows with break-even analysis.' },
  { n: 10, title: 'Tax Optimization Engine',      icon: Receipt,
    body: 'Model different ownership structures with projected tax impact on yield and exit proceeds.' },
];

// ─── Roadmap ─────────────────────────────────────────────────────────
const ROADMAP = [
  { quarter: 'Q1–Q2 2026', phase: 'Foundation', items: [
    'Multi-market expansion (5 EU cities)',
    'API integrations (Airbnb, Booking)',
    'Native mobile app launch',
    'Enhanced PDF brochure parsing',
    'User onboarding automation',
  ]},
  { quarter: 'Q3–Q4 2026', phase: 'Intelligence', items: [
    'Predictive analytics engine',
    'Dynamic pricing launch',
    'Renovation ROI calculator',
    'Comparable sales engine',
    'Advanced yield forecasting',
  ]},
  { quarter: 'Q1–Q2 2027', phase: 'Network', items: [
    'Investor marketplace',
    'Deal sharing network',
    'White-label reports',
    'Mortgage intelligence',
    'Partner integrations',
  ]},
  { quarter: 'Q3–Q4 2027', phase: 'Platform', items: [
    'Full-stack property management',
    'Tax optimization engine',
    'Institutional dashboard',
    'API marketplace',
    'Enterprise tier launch',
  ]},
];

// ─── Why Propul8 Wins ─────────────────────────────────────────────────
const MOATS = [
  { icon: RefreshCcw, title: 'Data Flywheel',
    body: 'Every analysis improves AI models. More users = more data = better predictions. The gap widens every day.' },
  { icon: Globe2, title: 'European Focus',
    body: 'First-mover in under-served EU markets: Greece, Portugal, Spain. US-centric competitors ignore this.' },
  { icon: Target, title: 'Vertical Depth',
    body: 'Purpose-built for short-term rental and boutique real estate — not a generic tool retrofitted for STR.' },
  { icon: Building2, title: 'Institutional Standard',
    body: 'Single score, single language: the Propul8 Index. Reusable across funds, family offices, and operators.' },
];

const COMP_ROWS = [
  { capability: 'Intelligence + Action',  propul8: true, airdna: 'Data only', zillow: 'US only', hostaway: 'Ops only' },
  { capability: 'European STR coverage',  propul8: true, airdna: 'Partial',   zillow: 'No',      hostaway: 'Partial' },
  { capability: 'Deterministic verdicts', propul8: true, airdna: 'No',        zillow: 'No',      hostaway: 'No' },
  { capability: 'Exit-plan generation',   propul8: true, airdna: 'No',        zillow: 'No',      hostaway: 'No' },
  { capability: 'Negotiation pack',       propul8: true, airdna: 'No',        zillow: 'No',      hostaway: 'No' },
];


export default function Vision() {
  const navigate = useNavigate();

  return (
    <div data-testid="vision-page" style={{ background: BG, color: TEXT, minHeight: '100vh' }}>
      {/* Sticky top bar */}
      <div
        className="sticky top-0 z-10 backdrop-blur-xl"
        style={{ background: 'rgba(10,10,10,0.85)', borderBottom: `1px solid ${LINE}` }}
      >
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <button
            type="button" onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-[12px] hover:opacity-100"
            style={{ color: TEXT_MUTED, background: 'none', border: 'none', cursor: 'pointer' }}
            data-testid="vision-back"
          >
            <ArrowLeft size={13} strokeWidth={1.7} /> Back
          </button>
          <span
            className="font-mono-tight uppercase"
            style={{ color: GOLD, fontSize: 10.5, letterSpacing: '0.32em', fontWeight: 500 }}
          >
            Propul8 · Vision
          </span>
          <nav className="hidden md:flex items-center gap-6 font-mono-tight text-[10px] uppercase"
            style={{ letterSpacing: '0.20em', color: TEXT_MUTED }}>
            <a href="#moves"     style={{ color: 'inherit', textDecoration: 'none' }}>10 Moves</a>
            <a href="#roadmap"   style={{ color: 'inherit', textDecoration: 'none' }}>Roadmap</a>
            <a href="#moats"     style={{ color: 'inherit', textDecoration: 'none' }}>Why We Win</a>
            <a href="#manifesto" style={{ color: 'inherit', textDecoration: 'none' }}>Manifesto</a>
          </nav>
        </div>
      </div>

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <section
        className="px-6 md:px-12 py-32 lg:py-44 relative overflow-hidden"
        data-testid="vision-hero"
      >
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${GOLD} 50%, transparent 100%)`,
            opacity: 0.4,
          }}
        />
        <div className="max-w-[1280px] mx-auto">
          <span
            className="font-mono-tight uppercase"
            style={{ color: GOLD, fontSize: 11, letterSpacing: '0.32em' }}
            data-testid="vision-hero-kicker"
          >
            Vision &amp; Strategy
          </span>
          <h1
            className="font-display mt-7"
            style={{
              color: TEXT,
              fontSize: 'clamp(44px, 6vw, 88px)',
              letterSpacing: '-0.03em',
              fontWeight: 500,
              lineHeight: 1.05,
              maxWidth: 1000,
            }}
            data-testid="vision-hero-title"
          >
            From acquisition to optimization to exit —
            <span style={{ color: GOLD }}> one platform, infinite edge.</span>
          </h1>
          <p
            className="mt-10 max-w-[600px]"
            style={{ color: TEXT_MUTED, fontSize: 16, lineHeight: 1.7 }}
            data-testid="vision-hero-subtitle"
          >
            The strategic narrative behind Propul8. The ten moves that build the
            category. The roadmap to category leader. The moats that compound.
          </p>
        </div>
      </section>

      {/* ─── 10 MOVES ──────────────────────────────────────────────── */}
      <section
        id="moves"
        className="px-6 md:px-12 py-24 lg:py-32"
        style={{ borderTop: `1px solid ${LINE}` }}
        data-testid="vision-moves-section"
      >
        <div className="max-w-[1280px] mx-auto">
          <div className="mb-3">
            <span
              className="font-mono-tight uppercase"
              style={{ color: GOLD, fontSize: 11, letterSpacing: '0.32em' }}
            >
              Vision &amp; Recommendations
            </span>
          </div>
          <h2
            className="font-display"
            style={{ color: TEXT, fontSize: 'clamp(34px, 4.4vw, 56px)', letterSpacing: '-0.025em', fontWeight: 500, lineHeight: 1.1 }}
            data-testid="vision-moves-title"
          >
            10 Moves to Build the Dream Platform
          </h2>
          <div style={{ height: 1, background: GOLD, width: 64, marginTop: 24, marginBottom: 56 }} />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="vision-moves-grid">
            {MOVES.map((m) => {
              const Icon = m.icon;
              return (
                <article
                  key={m.n}
                  className="p-7 lg:p-8 group transition-all duration-300"
                  style={{
                    background: SURFACE,
                    border: `1px solid ${LINE}`,
                    borderRadius: 4,
                  }}
                  data-testid={`vision-move-${m.n}`}
                >
                  <div className="flex items-baseline gap-4 mb-6">
                    <span
                      className="font-mono-tight tabular-nums"
                      style={{ color: GOLD, fontSize: 14, fontWeight: 600, letterSpacing: '0.04em' }}
                    >
                      {String(m.n).padStart(2, '0')}
                    </span>
                    <Icon size={16} strokeWidth={1.5} style={{ color: GOLD, opacity: 0.6 }} />
                  </div>
                  <h3
                    className="font-display"
                    style={{ color: TEXT, fontSize: 20, fontWeight: 500, letterSpacing: '-0.018em', lineHeight: 1.25 }}
                  >
                    {m.title}
                  </h3>
                  <p
                    className="mt-5"
                    style={{ color: TEXT_MUTED, fontSize: 13.5, lineHeight: 1.65 }}
                  >
                    {m.body}
                  </p>
                </article>
              );
            })}

            {/* 11th tile — Mission statement (mirrors deck's gold-bordered tile) */}
            <article
              className="p-7 lg:p-8 flex items-center justify-center text-center"
              style={{
                background: `rgba(184,149,106,0.06)`,
                border: `1px solid ${GOLD}33`,
                borderRadius: 4,
                minHeight: 220,
              }}
              data-testid="vision-move-mission"
            >
              <div>
                <Sparkles size={26} strokeWidth={1.4} style={{ color: GOLD, margin: '0 auto 18px' }} />
                <p
                  style={{ color: TEXT, fontSize: 15, lineHeight: 1.55, maxWidth: 280, margin: '0 auto', fontWeight: 500 }}
                >
                  Each feature compounds the platform's data moat and user lock-in.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ─── ROADMAP ───────────────────────────────────────────────── */}
      <section
        id="roadmap"
        className="px-6 md:px-12 py-24 lg:py-32"
        style={{ borderTop: `1px solid ${LINE}` }}
        data-testid="vision-roadmap-section"
      >
        <div className="max-w-[1280px] mx-auto">
          <span
            className="font-mono-tight uppercase"
            style={{ color: GOLD, fontSize: 11, letterSpacing: '0.32em' }}
          >
            Product Roadmap
          </span>
          <h2
            className="font-display mt-3"
            style={{ color: TEXT, fontSize: 'clamp(34px, 4.4vw, 56px)', letterSpacing: '-0.025em', fontWeight: 500, lineHeight: 1.1 }}
            data-testid="vision-roadmap-title"
          >
            From Now to Category Leader
          </h2>
          <div style={{ height: 1, background: GOLD, width: 64, marginTop: 24, marginBottom: 64 }} />

          {/* Timeline rail */}
          <div className="relative mb-10 hidden md:block">
            <div className="relative h-px w-full" style={{ background: `${GOLD}55` }} />
            <div className="absolute inset-x-0 top-1/2 flex justify-between" style={{ transform: 'translateY(-50%)' }}>
              {ROADMAP.map((p, i) => (
                <div
                  key={p.quarter}
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: i === ROADMAP.length - 1 ? GOLD_DEEP : GOLD,
                    boxShadow: `0 0 0 4px ${BG}`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5" data-testid="vision-roadmap-grid">
            {ROADMAP.map((p, idx) => (
              <article
                key={p.quarter}
                className="p-6 lg:p-7 flex flex-col"
                style={{
                  background: SURFACE,
                  border: `1px solid ${LINE}`,
                  borderRadius: 4,
                  minHeight: 380,
                }}
                data-testid={`vision-roadmap-phase-${idx}`}
              >
                <div
                  className="font-mono-tight uppercase mb-2"
                  style={{ color: GOLD, fontSize: 10.5, letterSpacing: '0.28em', fontWeight: 500 }}
                >
                  {p.quarter}
                </div>
                <h3
                  className="font-display mb-7"
                  style={{ color: TEXT, fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em' }}
                >
                  {p.phase}
                </h3>
                <ul className="space-y-3.5 flex-1">
                  {p.items.map((it) => (
                    <li key={it} className="flex items-baseline gap-3 text-[13px]" style={{ color: TEXT_MUTED, lineHeight: 1.55 }}>
                      <span
                        className="flex-shrink-0 inline-block rounded-full"
                        style={{ width: 6, height: 6, background: GOLD, marginTop: 6 }}
                      />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <p
            className="mt-12 text-center max-w-[760px] mx-auto"
            style={{ color: TEXT_MUTED, fontSize: 13.5, fontStyle: 'italic', letterSpacing: '0.005em' }}
            data-testid="vision-roadmap-footer"
          >
            Each phase builds on the previous — creating compounding data moats and deepening user lock-in.
          </p>
        </div>
      </section>

      {/* ─── WHY PROPUL8 WINS ──────────────────────────────────────── */}
      <section
        id="moats"
        className="px-6 md:px-12 py-24 lg:py-32"
        style={{ borderTop: `1px solid ${LINE}` }}
        data-testid="vision-moats-section"
      >
        <div className="max-w-[1280px] mx-auto">
          <span
            className="font-mono-tight uppercase"
            style={{ color: GOLD, fontSize: 11, letterSpacing: '0.32em' }}
          >
            Competitive Positioning
          </span>
          <h2
            className="font-display mt-3"
            style={{ color: TEXT, fontSize: 'clamp(34px, 4.4vw, 56px)', letterSpacing: '-0.025em', fontWeight: 500, lineHeight: 1.1 }}
            data-testid="vision-moats-title"
          >
            Why Propul8 Wins
          </h2>
          <div style={{ height: 1, background: GOLD, width: 64, marginTop: 24, marginBottom: 56 }} />

          <div className="grid md:grid-cols-2 gap-5 mb-16" data-testid="vision-moats-grid">
            {MOATS.map((m) => {
              const Icon = m.icon;
              return (
                <article
                  key={m.title}
                  className="p-7 lg:p-9"
                  style={{
                    background: SURFACE,
                    border: `1px solid ${LINE}`,
                    borderLeft: `2px solid ${GOLD}`,
                    borderRadius: 4,
                  }}
                  data-testid={`vision-moat-${m.title.toLowerCase().replace(/\s+/g,'-')}`}
                >
                  <div className="flex items-center gap-4 mb-5">
                    <Icon size={22} strokeWidth={1.4} style={{ color: GOLD }} />
                    <h3
                      className="font-display"
                      style={{ color: TEXT, fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em' }}
                    >
                      {m.title}
                    </h3>
                  </div>
                  <p style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.65 }}>{m.body}</p>
                </article>
              );
            })}
          </div>

          {/* Competitive Landscape table */}
          <div>
            <span
              className="font-mono-tight uppercase"
              style={{ color: GOLD, fontSize: 10.5, letterSpacing: '0.28em' }}
            >
              Competitive Landscape
            </span>
            <div
              className="mt-5 overflow-hidden"
              style={{ background: SURFACE, border: `1px solid ${LINE}`, borderRadius: 4 }}
              data-testid="vision-comp-table"
            >
              {/* Header */}
              <div
                className="grid grid-cols-5 px-6 py-4 font-mono-tight uppercase text-[11px]"
                style={{ color: GOLD, letterSpacing: '0.18em', borderBottom: `1px solid ${LINE}`, fontWeight: 500 }}
              >
                <div>Capability</div>
                <div>Propul8</div>
                <div>AirDNA</div>
                <div>Zillow</div>
                <div>Hostaway</div>
              </div>
              {COMP_ROWS.map((r, i) => (
                <div
                  key={r.capability}
                  className="grid grid-cols-5 px-6 py-5 text-[13.5px]"
                  style={{
                    borderBottom: i < COMP_ROWS.length - 1 ? `1px solid ${LINE}` : 'none',
                    color: TEXT,
                  }}
                  data-testid={`vision-comp-row-${i}`}
                >
                  <div style={{ color: TEXT_MUTED }}>{r.capability}</div>
                  <div>
                    {r.propul8 === true
                      ? <span style={{ color: '#16A34A', fontWeight: 600, fontSize: 18 }}>✓</span>
                      : <span style={{ color: TEXT_MUTED }}>{r.propul8}</span>}
                  </div>
                  <div style={{ color: r.airdna   === true ? '#16A34A' : '#EF4444' }}>{r.airdna   === true ? '✓' : r.airdna}</div>
                  <div style={{ color: r.zillow   === true ? '#16A34A' : '#EF4444' }}>{r.zillow   === true ? '✓' : r.zillow}</div>
                  <div style={{ color: r.hostaway === true ? '#16A34A' : '#EF4444' }}>{r.hostaway === true ? '✓' : r.hostaway}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── MANIFESTO (closing slide) ─────────────────────────────── */}
      <section
        id="manifesto"
        className="px-6 md:px-12 py-32 lg:py-44 text-center"
        style={{ borderTop: `1px solid ${LINE}` }}
        data-testid="vision-manifesto-section"
      >
        <div className="max-w-[900px] mx-auto">
          <div style={{ height: 1, background: GOLD, width: 64, margin: '0 auto 56px' }} />
          <h2
            className="font-display"
            style={{
              color: TEXT,
              fontSize: 'clamp(36px, 5vw, 64px)',
              letterSpacing: '-0.025em',
              fontWeight: 500,
              lineHeight: 1.1,
            }}
            data-testid="vision-manifesto-title"
          >
            Let's Build the Future of Real Estate Intelligence
          </h2>
          <p
            className="mt-14 max-w-[640px] mx-auto"
            style={{ color: TEXT_MUTED, fontSize: 16, lineHeight: 1.7 }}
            data-testid="vision-manifesto-body"
          >
            Propul8 turns every property into a better-performing asset. From
            acquisition to optimization to exit — one platform, infinite edge.
          </p>
          <div
            className="mt-12 mb-12 mx-auto max-w-[520px]"
            style={{ color: GOLD, fontSize: 17, fontWeight: 500, lineHeight: 1.6, letterSpacing: '-0.005em' }}
            data-testid="vision-manifesto-tagline"
          >
            <div>The question isn't whether the market needs this.</div>
            <div>It's who builds it first.</div>
          </div>
          <div style={{ height: 1, background: GOLD, width: 64, margin: '56px auto 24px' }} />
          <span
            className="font-mono-tight uppercase"
            style={{ color: GOLD, fontSize: 11, letterSpacing: '0.4em', fontWeight: 500 }}
          >
            Propul8
          </span>

          {/* CTAs */}
          <div className="mt-14 flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button" onClick={() => navigate('/invest')}
              className="inline-flex items-center gap-2 px-6 py-3 text-[13.5px]"
              style={{
                background: GOLD, color: '#0A0A0A', border: 'none',
                borderRadius: 999, fontWeight: 500,
                fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                boxShadow: '0 6px 22px rgba(184,149,106,0.30)',
              }}
              data-testid="vision-cta-analyze"
            >
              Analyze an Acquisition <ArrowRight size={13} strokeWidth={2} />
            </button>
            <button
              type="button" onClick={() => navigate('/index-explained')}
              className="inline-flex items-center gap-2 px-6 py-3 text-[13.5px]"
              style={{
                background: 'transparent', color: GOLD,
                border: `1px solid ${GOLD}55`,
                borderRadius: 999, fontWeight: 500,
                fontFamily: 'Inter, sans-serif', cursor: 'pointer',
              }}
              data-testid="vision-cta-index"
            >
              Read the Propul8 Index <ArrowUpRight size={13} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
