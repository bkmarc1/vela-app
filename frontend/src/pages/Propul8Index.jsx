// Propul8 Index — the positioning layer. "FICO score for hospitality assets."
//
// Marketing-grade explainer with a 0-100 scale graphic, 4 verdict zones, and a
// breakdown of the 5 scoring pillars. Linked from any "?" tooltip + footer.

import { ArrowLeft, ShieldCheck, Handshake, Eye, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PILLARS = [
  { key: 'location',  label: 'Location',        points: 20, body: 'Distance to landmark, metro access, neighbourhood demand, planning trajectory.' },
  { key: 'yield',     label: 'Yield',           points: 25, body: 'Net yield on cost vs the institutional 6.5% floor; ADR & occupancy depth-of-market.' },
  { key: 'design',    label: 'Design Upside',   points: 20, body: 'Renovation arbitrage potential, photo quality lift, repositioning headroom.' },
  { key: 'momentum',  label: 'Market Momentum', points: 20, body: 'YoY price + ADR trend, comparable-sale velocity, buyer-side liquidity.' },
  { key: 'risk',      label: 'Risk Profile',    points: 15, body: 'Regulatory, structural, title, and seasonality risk — applied as a discount.' },
];

const ZONES = [
  { range: '0–59',   label: 'Avoid',       tone: '#EF4444', icon: Eye,         desc: 'Margin of safety insufficient. Look elsewhere.' },
  { range: '60–74',  label: 'Negotiate',   tone: '#B8956A', icon: Handshake,   desc: 'Buyable at the right price — bid into the Smart-Buy Envelope.' },
  { range: '75–89',  label: 'Buy',         tone: '#16A34A', icon: ShieldCheck, desc: 'Institutional-grade asset. Move with conviction.' },
  { range: '90–100', label: 'Exceptional', tone: '#D4AF37', icon: Award,       desc: 'Trophy-class opportunity. Pre-empt before it hits market.' },
];

export default function Propul8Index() {
  const navigate = useNavigate();
  return (
    <div data-testid="propul8-index-page" style={{ background: '#FAFAFA', minHeight: '100vh' }}>
      <div className="max-w-[1100px] mx-auto px-6 md:px-12 pt-12 pb-28">
        <button
          type="button" onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[12px] mb-10"
          style={{ color: '#52525B', cursor: 'pointer', background: 'none', border: 'none' }}
          data-testid="index-back"
        >
          <ArrowLeft size={13} strokeWidth={1.8} /> Back
        </button>

        {/* HERO */}
        <header className="mb-20">
          <span className="ts-kicker" data-testid="index-kicker">The Propul8 Index</span>
          <h1 className="ts-h1 mt-5" data-testid="index-headline" style={{ maxWidth: 880 }}>
            The FICO score for hospitality assets.
          </h1>
          <p className="ts-body mt-6 max-w-[640px]" data-testid="index-tagline">
            One number captures the institutional thesis on any short-term-rental,
            boutique-hotel, or income-producing asset — across location, yield, design,
            momentum, and risk.
          </p>
        </header>

        {/* SCORE SCALE GRAPHIC */}
        <section className="mb-24" data-testid="index-scale-section">
          <span className="ts-kicker">Score Scale</span>
          <h2 className="ts-h2 mt-3 mb-10">0 to 100. One verdict per asset.</h2>

          {/* Gradient bar */}
          <div className="relative">
            <div
              className="h-3 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #EF4444 0%, #EF4444 35%, #B8956A 45%, #B8956A 60%, #16A34A 65%, #16A34A 85%, #D4AF37 92%, #D4AF37 100%)',
              }}
            />
            <div className="flex justify-between mt-3 font-mono-tight text-[10.5px]" style={{ color: '#52525B' }}>
              <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
            </div>
          </div>

          {/* Zone cards */}
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {ZONES.map((z) => {
              const Icon = z.icon;
              return (
                <div
                  key={z.range}
                  className="p-6"
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid ${z.tone}26`,
                    borderRadius: 14,
                  }}
                  data-testid={`index-zone-${z.label.toLowerCase()}`}
                >
                  <div
                    className="w-10 h-10 flex items-center justify-center mb-5"
                    style={{ background: `${z.tone}1A`, borderRadius: 10 }}
                  >
                    <Icon size={17} strokeWidth={1.6} style={{ color: z.tone }} />
                  </div>
                  <div
                    className="font-mono-tight tabular-nums text-[13px]"
                    style={{ color: z.tone, fontWeight: 600, letterSpacing: '0.04em' }}
                  >
                    {z.range}
                  </div>
                  <div
                    className="font-display mt-2"
                    style={{ color: '#09090B', fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em' }}
                  >
                    {z.label}
                  </div>
                  <p className="ts-small mt-3 leading-relaxed">{z.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* PILLARS */}
        <section className="mb-24" data-testid="index-pillars-section">
          <span className="ts-kicker">5 Scoring Pillars</span>
          <h2 className="ts-h2 mt-3 mb-3 max-w-[680px]">
            What goes into the score.
          </h2>
          <p className="ts-body max-w-[600px] mb-12">
            Five weighted pillars sum to 100 points. The same model runs against every
            asset, every market — comparison stays apples-to-apples.
          </p>

          <ol className="space-y-px" style={{ background: '#E8E0D2', border: '1px solid #E8E0D2', borderRadius: 14, overflow: 'hidden' }}>
            {PILLARS.map((p, i) => (
              <li
                key={p.key}
                className="p-6 lg:p-7 grid grid-cols-12 gap-5 items-baseline"
                style={{ background: '#FFFFFF' }}
                data-testid={`index-pillar-${p.key}`}
              >
                <div className="col-span-1 font-mono-tight tabular-nums text-[12px]" style={{ color: '#A1A1AA' }}>
                  0{i + 1}
                </div>
                <div className="col-span-12 md:col-span-3">
                  <div className="font-display"
                    style={{ color: '#09090B', fontSize: 19, fontWeight: 500, letterSpacing: '-0.02em' }}>
                    {p.label}
                  </div>
                </div>
                <div className="col-span-3 md:col-span-2">
                  <span
                    className="font-mono-tight tabular-nums"
                    style={{
                      color: '#B8956A', fontSize: 22, fontWeight: 500,
                      letterSpacing: '-0.025em',
                    }}
                  >
                    {p.points}
                  </span>
                  <span style={{ color: '#52525B', fontSize: 11, marginLeft: 4 }}>pts</span>
                </div>
                <p className="col-span-12 md:col-span-6 ts-small leading-relaxed">{p.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* TRUST */}
        <section className="mb-12" data-testid="index-trust-section">
          <div
            className="p-7 lg:p-9"
            style={{ background: '#F5F1EA', border: '1px solid #E8E0D2', borderRadius: 14 }}
          >
            <span className="ts-kicker">Adoption</span>
            <p
              className="mt-4 font-display"
              style={{
                color: '#09090B',
                fontSize: 'clamp(20px, 2.6vw, 28px)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
                lineHeight: 1.3,
                maxWidth: 720,
              }}
              data-testid="index-trust-line"
            >
              Used by boutique funds, family offices, and independent operators across 12 markets.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
