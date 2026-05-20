// Propul8 · Pricing — light shell, architect-minimal aesthetic.
// Matches the rest of the app (warm off-white #FAFAFA + olive #B8956A
// + charcoal #09090B). Same 4-tier structure, outcome-led copy, dropped
// dark-mode gradients per user mandate "the pricing section is different
// colors and fonts from the rest of the app and it should not be."

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, Sparkles, Check, Activity,
  TrendingUp, ShieldCheck, Building2, Zap, Globe2,
} from 'lucide-react';
import api from '../lib/api';

const TIERS = [
  {
    id: 'start',
    name: 'Start',
    price: 'Free',
    priceNote: '',
    subtitle: 'Paste a property link and get an instant Propul8 score.',
    outcome: 'Discover what hides inside any listing.',
    icon: Sparkles,
    features: [
      '1 free property analysis',
      'Basic Propul8 score',
      'Market positioning preview',
      'Upside indicators',
      'Limited market insights',
    ],
    cta: 'Start Free',
    checkout: false,
    highlight: false,
  },
  {
    id: 'analyze',
    name: 'Analyze',
    price: '€49',
    priceNote: '/ report',
    subtitle: 'Professional investment + optimization analysis for a single asset.',
    outcome: 'Decide on one asset with institutional rigor.',
    icon: Activity,
    features: [
      'Full property intelligence report',
      'Investment opportunity analysis',
      'Real comparable market data',
      'Revenue + yield projections',
      'Optimization recommendations',
      'Design uplift suggestions',
      'Risk indicators',
      'Premium PDF report',
    ],
    cta: 'Analyze Property',
    checkout: true,
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€149',
    priceNote: '/ month',
    subtitle: 'Built for active investors and hospitality operators.',
    outcome: 'Outperform the market on every asset, every month.',
    icon: TrendingUp,
    features: [
      '10 property analyses per month',
      'Portfolio dashboard',
      'Live Athens market trends',
      'Performance signals (▲▼)',
      'Optimization alerts',
      'Portfolio comparison tools',
      'Advanced analytics',
      'Data export',
    ],
    cta: 'Upgrade to Pro',
    checkout: true,
    highlight: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 'Custom',
    priceNote: '',
    subtitle: 'For operators, developers, funds, and large portfolios.',
    outcome: 'Run a portfolio like an institution.',
    icon: Building2,
    features: [
      'Multi-user team access',
      'Portfolio intelligence',
      'Bulk asset analysis',
      'API integrations',
      'Team collaboration',
      'Advanced reporting',
      'Enterprise-grade analytics',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    checkout: false,
    highlight: false,
  },
];


export default function Pricing() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null);
  const [pollMessage, setPollMessage] = useState(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const session   = url.searchParams.get('session');
    const cancelled = url.searchParams.get('cancelled');
    if (cancelled) {
      toast.error('Payment cancelled.');
      url.searchParams.delete('cancelled');
      window.history.replaceState({}, '', url.pathname);
      return;
    }
    if (!session || session === 'cancelled') return;
    pollStatus(session);
    url.searchParams.delete('session');
    window.history.replaceState({}, '', url.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pollStatus(sessionId, attempts = 0) {
    if (attempts === 0) setPollMessage('Confirming payment…');
    if (attempts >= 6)  { setPollMessage(null); toast.error('Payment confirmation timed out — check your email.'); return; }
    try {
      const res = await api.get(`/payments/status/${sessionId}`);
      const d = res.data || {};
      if (d.payment_status === 'paid') {
        setPollMessage(null);
        toast.success(`${d.tier ? d.tier.toUpperCase() : 'Plan'} active — welcome to Propul8.`);
        return;
      }
      if (d.status === 'expired') { setPollMessage(null); toast.error('Checkout expired.'); return; }
      setTimeout(() => pollStatus(sessionId, attempts + 1), 2000);
    } catch {
      setPollMessage(null);
      toast.error('Could not confirm payment status.');
    }
  }

  async function handleClick(tier) {
    if (tier.id === 'start') { navigate('/invest'); return; }
    if (tier.id === 'scale') {
      window.location.href = 'mailto:sales@propul8.app?subject=Propul8%20Scale%20%E2%80%94%20Sales%20enquiry';
      return;
    }
    if (!tier.checkout) return;
    setBusy(tier.id);
    try {
      const res = await api.post('/payments/checkout', {
        tier: tier.id,
        origin_url: window.location.origin,
      });
      const url = res.data?.url;
      if (!url) throw new Error('No checkout URL');
      window.location.href = url;
    } catch (e) {
      setBusy(null);
      toast.error(e?.response?.data?.detail || 'Could not start checkout.');
    }
  }

  return (
    <div data-testid="pricing-page" style={{ background: '#FAFAFA', minHeight: '100vh' }}>
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 pt-20 pb-24 lg:pt-28 lg:pb-32">

        {/* HERO — minimal architect-style */}
        <header className="text-center max-w-[820px] mx-auto">
          <span
            className="ts-kicker"
            data-testid="pricing-kicker"
          >
            Propul8 · Pricing
          </span>
          <h1
            className="ts-h1 mt-5"
            data-testid="pricing-headline"
          >
            Property intelligence,
            <span style={{ color: '#B8956A' }}> priced to start small.</span>
          </h1>
          <p
            className="ts-body mt-6 max-w-[560px] mx-auto"
            data-testid="pricing-tagline"
          >
            Start free. Pay when the insight matters. Scale when the portfolio grows.
          </p>
        </header>

        {pollMessage && (
          <div
            data-testid="pricing-poll-banner"
            className="mt-8 mx-auto inline-flex items-center gap-2 px-4 py-3"
            style={{
              background: 'rgba(184,149,106,0.08)',
              border: '1px solid rgba(184,149,106,0.20)',
              borderRadius: 4,
              color: '#B8956A',
              fontSize: 12,
            }}
          >
            <Sparkles size={12} className="animate-pulse" />
            {pollMessage}
          </div>
        )}

        {/* PRICING GRID */}
        <section
          className="mt-16 grid lg:grid-cols-4 gap-4"
          data-testid="pricing-grid"
        >
          {TIERS.map((tier) => (
            <PriceCard
              key={tier.id}
              tier={tier}
              busy={busy === tier.id}
              onClick={() => handleClick(tier)}
            />
          ))}
        </section>

        {/* OUTCOME SECTION */}
        <section
          className="mt-24 lg:mt-32 text-center max-w-[820px] mx-auto"
          data-testid="pricing-outcome-section"
        >
          <span className="ts-kicker">
            What you actually get
          </span>
          <h2 className="ts-h2 mt-4">
            Built for modern property intelligence.
          </h2>
          <p className="ts-body mt-5 max-w-[560px] mx-auto">
            Analyze opportunities, optimize assets, and track portfolio performance
            through a live real estate intelligence layer.
          </p>

          <div className="mt-12 grid sm:grid-cols-3 gap-4">
            <OutcomeCard icon={TrendingUp}    label="Discover hidden upside" />
            <OutcomeCard icon={Zap}           label="Optimize asset performance" />
            <OutcomeCard icon={Globe2}        label="Outperform local markets" />
            <OutcomeCard icon={Activity}      label="Increase hospitality revenue" />
            <OutcomeCard icon={ShieldCheck}   label="De-risk acquisitions" />
            <OutcomeCard icon={Building2}     label="Upgrade underperforming assets" />
          </div>
        </section>

        {/* TRUST FOOTER */}
        <footer
          className="mt-20 pt-8 text-center"
          style={{ borderTop: '1px solid #E4E4E7' }}
        >
          <span className="font-mono-tight text-[10px] tracking-[0.18em] uppercase"
            style={{ color: '#52525B' }}>
            Stripe secured · GDPR compliant · No data resale
          </span>
        </footer>
      </div>
    </div>
  );
}


// ─── Pricing card ──────────────────────────────────────────────────────
function PriceCard({ tier, busy, onClick }) {
  const Icon = tier.icon || Sparkles;
  const isHero = tier.highlight;

  return (
    <article
      data-testid={`pricing-card-${tier.id}`}
      className="relative transition-all"
      style={{
        background: '#FFFFFF',
        border: isHero ? '1px solid #B8956A' : '1px solid #E4E4E7',
        borderRadius: 4,
        boxShadow: isHero
          ? '0 1px 2px rgba(184,149,106,0.10)'
          : '0 1px 2px rgba(9,9,11,0.03)',
      }}
    >
      {isHero && (
        <div
          className="absolute -top-3 left-6 inline-flex items-center gap-1 px-2 py-0.5"
          style={{
            background: '#B8956A',
            color: '#FFFFFF',
            borderRadius: 999,
          }}
          data-testid={`pricing-card-${tier.id}-popular`}
        >
          <Sparkles size={9} strokeWidth={1.8} />
          <span className="font-mono-tight text-[9px] tracking-[0.18em] uppercase" style={{ fontWeight: 600 }}>
            Popular
          </span>
        </div>
      )}

      <div className="p-7 lg:p-8 flex flex-col h-full">
        {/* Icon */}
        <div
          className="w-9 h-9 flex items-center justify-center mb-6"
          style={{
            background: 'rgba(184,149,106,0.06)',
            border: '1px solid rgba(184,149,106,0.15)',
            borderRadius: 4,
          }}
        >
          <Icon size={14} strokeWidth={1.6} style={{ color: '#B8956A' }} />
        </div>

        {/* Name */}
        <h3
          className="font-display"
          style={{
            color: '#09090B',
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: '-0.012em',
          }}
          data-testid={`pricing-card-${tier.id}-name`}
        >
          {tier.name}
        </h3>

        {/* Price */}
        <div className="mt-4 flex items-baseline gap-1.5" data-testid={`pricing-card-${tier.id}-price`}>
          <span
            className="font-display tabular-nums"
            style={{
              color: '#09090B',
              fontSize: 'clamp(32px, 3.4vw, 42px)',
              fontWeight: 500,
              letterSpacing: '-0.028em',
              lineHeight: 1,
            }}
          >
            {tier.price}
          </span>
          {tier.priceNote && (
            <span className="font-mono-tight text-[12px]" style={{ color: '#52525B' }}>
              {tier.priceNote}
            </span>
          )}
        </div>

        {/* Subtitle */}
        <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: '#52525B' }}>
          {tier.subtitle}
        </p>

        {/* Outcome */}
        <p
          className="mt-5 leading-snug"
          style={{
            color: '#B8956A',
            fontSize: 12.5,
            fontStyle: 'italic',
            fontWeight: 500,
          }}
        >
          {tier.outcome}
        </p>

        {/* Divider */}
        <div className="my-6" style={{ borderTop: '1px solid #E4E4E7' }} />

        {/* Features */}
        <ul className="space-y-2.5 mb-7 flex-1" data-testid={`pricing-card-${tier.id}-features`}>
          {tier.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[12.5px]" style={{ color: '#09090B' }}>
              <Check size={11} strokeWidth={2.2} style={{ color: '#B8956A', marginTop: 4, flexShrink: 0 }} />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={onClick}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 transition-all"
          style={{
            background: isHero ? '#B8956A' : 'transparent',
            color: isHero ? '#FFFFFF' : '#09090B',
            border: isHero ? 'none' : '1px solid #09090B',
            borderRadius: 4,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            fontSize: 12.5,
            letterSpacing: '-0.005em',
            cursor: busy ? 'wait' : 'pointer',
          }}
          data-testid={`pricing-card-${tier.id}-cta`}
        >
          {busy ? (
            <><Sparkles size={12} className="animate-pulse" /> Routing to Stripe…</>
          ) : (
            <>{tier.cta} {tier.id === 'scale' ? <ArrowUpRight size={13} /> : <ArrowRight size={13} />}</>
          )}
        </button>
      </div>
    </article>
  );
}


function OutcomeCard({ icon: Icon, label }) {
  return (
    <div
      className="p-5 text-left transition-all"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: 4,
      }}
    >
      <Icon size={14} strokeWidth={1.6} style={{ color: '#B8956A' }} />
      <div
        className="mt-4 text-[13px] leading-snug"
        style={{ color: '#09090B', fontWeight: 500 }}
      >
        {label}
      </div>
    </div>
  );
}
