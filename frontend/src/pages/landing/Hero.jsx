import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, TrendingUp, Sparkles } from 'lucide-react';
import { HERO_IMG } from './_shared';

// Propul8 — Landing Hero (premium PropTech aesthetic).
// Warm off-white shell · large hospitality image · big calm headline ·
// one centered URL bar offered later via /invest · 2 primary CTAs · 3
// proof cards. Cuts text density ~60% vs prior dark variant.

const PROOF = [
  { id: 'decision',    icon: ShieldCheck, title: 'Buy / Negotiate / Pass', line: 'A clear decision on the asset.' },
  { id: 'revenue-gap', icon: TrendingUp,  title: 'Revenue Gap',            line: 'Money being left on the table.' },
  { id: 'next-action', icon: Sparkles,    title: 'Next Best Action',       line: 'The one move that moves yield.' },
];

export default function Hero() {
  const navigate = useNavigate();
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: '#FAFAFA', color: '#09090B' }}
      data-testid="landing-hero"
    >
      {/* Soft architectural backdrop — subtle, never noisy */}
      <div className="absolute inset-0 opacity-[0.08]" aria-hidden>
        <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
      </div>
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(70% 60% at 78% 22%, rgba(184,149,106,0.06), transparent 60%), linear-gradient(180deg, rgba(250,250,250,0.4) 0%, #FAFAFA 100%)',
        }}
      />

      <div className="relative max-w-[1280px] mx-auto px-6 md:px-12 pt-24 pb-20 lg:pt-32 lg:pb-28">
        {/* Title — canonical H1 scale */}
        <h1
          className="ts-h1 fade-up"
          style={{ animationDelay: '120ms', maxWidth: '900px' }}
          data-testid="landing-hero-headline"
        >
          Hospitality assets, finally on one operating system.
        </h1>

        <p
          className="ts-body mt-7 max-w-[560px] fade-up"
          style={{ animationDelay: '180ms', color: '#09090B' }}
          data-testid="landing-hero-subtitle"
        >
          Analyze what to buy. Optimize what you own. Execute what improves revenue.
        </p>
        <p
          className="ts-small mt-3 max-w-[520px] fade-up"
          style={{ animationDelay: '240ms' }}
          data-testid="landing-hero-support"
        >
          Paste a listing. Propul8 extracts the data, checks the market, finds the upside,
          and builds the next action — in seconds.
        </p>

        {/* CTAs — pill-shaped, electric primary, ghost secondary */}
        <div className="mt-10 flex items-center gap-3 flex-wrap fade-up" style={{ animationDelay: '300ms' }}>
          <button
            type="button"
            onClick={() => navigate('/invest')}
            className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-medium transition-all"
            style={{
              background: '#B8956A',
              color: '#FFFFFF',
              borderRadius: 999,
              border: 'none',
              boxShadow: '0 4px 14px rgba(184,149,106,0.18)',
              cursor: 'pointer',
            }}
            data-testid="landing-cta-invest"
          >
            Analyze Acquisition
            <ArrowRight size={14} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => navigate('/operate')}
            className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-medium transition-all"
            style={{
              background: 'transparent',
              color: '#09090B',
              border: '1px solid #E4E4E7',
              borderRadius: 999,
              cursor: 'pointer',
            }}
            data-testid="landing-cta-operate"
          >
            Run Yield Audit
            <ArrowRight size={14} strokeWidth={1.7} />
          </button>
        </div>

        {/* 3 proof cards — soft white, rounded, generous padding */}
        <div
          className="mt-20 grid sm:grid-cols-3 gap-5 fade-up"
          style={{ animationDelay: '360ms' }}
          data-testid="landing-proof-cards"
        >
          {PROOF.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                className="p-7 lg:p-8 transition-all"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: 16,
                  boxShadow: '0 1px 2px rgba(9,9,11,0.04)',
                }}
                data-testid={`landing-proof-card-${p.id}`}
              >
                <div
                  className="w-10 h-10 flex items-center justify-center"
                  style={{
                    background: 'rgba(184,149,106,0.08)',
                    borderRadius: 10,
                  }}
                >
                  <Icon size={17} strokeWidth={1.7} style={{ color: '#B8956A' }} />
                </div>
                <div className="ts-h3 mt-6" style={{ fontSize: 19 }}>
                  {p.title}
                </div>
                <p className="ts-small mt-2">
                  {p.line}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
