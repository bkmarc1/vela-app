import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Handshake, Eye, XCircle } from 'lucide-react';

// Propul8 INVEST — Cinematic Opener.
// Mirrors OperateOpener but rendered in dark espresso/bronze shell with the
// Propul8 INVEST INDEX™, Acquisition DNA, Top 3 institutional insights, and a
// preview of the Deal Verdict so the user feels the conviction before scroll.

const VERDICT_THEME = {
  BUY:       { color: 'var(--inv-signal-up)',     icon: ShieldCheck, label: 'BUY' },
  NEGOTIATE: { color: 'var(--inv-accent-bronze)', icon: Handshake,   label: 'NEGOTIATE' },
  WATCH:     { color: '#52525B',                  icon: Eye,         label: 'WATCH' },
  PASS:      { color: 'var(--inv-signal-down)',   icon: XCircle,     label: 'PASS' },
  // Legacy fallbacks
  PROCEED:   { color: 'var(--inv-signal-up)',     icon: ShieldCheck, label: 'BUY' },
  WATCHLIST: { color: '#52525B',                  icon: Eye,         label: 'WATCH' },
};

export default function InvestOpener({ analysis, onContinue }) {
  const [phase, setPhase] = useState('boot');
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 900);
    const t2 = setTimeout(() => setPhase('insights'), 2100);
    const t3 = setTimeout(() => setPhase('ready'), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    if (phase === 'boot') return undefined;
    const target = analysis.vela_invest_index;
    const start = performance.now();
    const dur = 950;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, analysis.vela_invest_index]);

  const theme = VERDICT_THEME[analysis.deal_verdict.verdict] || VERDICT_THEME.NEGOTIATE;
  const Icon = theme.icon;

  return (
    <div
      className="vela-invest min-h-screen flex items-center justify-center px-6"
      style={{
        background:
          'radial-gradient(70% 60% at 50% 30%, rgba(196,167,137,0.08) 0%, transparent 60%), var(--inv-bg-deep, #FAFAFA)',
      }}
      data-testid="invest-opener"
    >
      <div className="w-full max-w-[760px] flex flex-col items-center text-center">
        {/* Phase 1 — kicker */}
        <div
          className="font-mono-tight text-[10px] tracking-[0.32em] uppercase transition-opacity duration-500"
          style={{
            color: 'var(--inv-accent-bronze)',
            opacity: phase === 'boot' ? 1 : 0.66,
          }}
          data-testid="invest-opener-kicker"
        >
          Propul8 · Acquisition Intelligence
        </div>

        {/* Loading line */}
        <div
          className={`mt-10 h-[1px] w-[200px] overflow-hidden transition-opacity duration-500 ${phase === 'boot' ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'rgba(196,167,137,0.14)' }}
        >
          <div
            className="h-full"
            style={{
              background: 'var(--inv-accent-bronze)',
              width: phase === 'boot' ? '100%' : '0%',
              transition: 'width 900ms cubic-bezier(.2,.7,.2,1)',
            }}
          />
        </div>

        {/* Phase 2 — Propul8 INVEST INDEX */}
        <div
          className={`mt-14 transition-all duration-700 ${phase === 'boot' ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'}`}
        >
          <div
            className="font-mono-tight text-[10px] tracking-[0.28em] uppercase"
            style={{ color: 'var(--inv-text-muted)' }}
          >
            Propul8 INVEST INDEX
          </div>
          <div
            className="inv-display font-medium mt-5 tabular-nums"
            style={{
              fontSize: 'clamp(96px, 14vw, 200px)',
              color: 'var(--inv-text-primary)',
              lineHeight: 0.92,
              letterSpacing: '-0.04em',
            }}
            data-testid="invest-opener-vela-index"
          >
            {displayScore}
            <span
              className="font-mono-tight"
              style={{
                fontSize: 'clamp(20px, 2vw, 28px)',
                color: 'var(--inv-text-muted)',
                marginLeft: 12,
                letterSpacing: 0,
              }}
            >
              / 100
            </span>
          </div>

          {/* Acquisition DNA */}
          <div
            className="mt-4 font-mono-tight text-[12px] tracking-[0.16em] uppercase"
            style={{ color: 'var(--inv-accent-bronze)' }}
            data-testid="invest-opener-dna-category"
          >
            Acquisition DNA · {analysis.acquisition_dna.category}
          </div>

          {/* Verdict preview */}
          <div
            className="mt-5 inline-flex items-center gap-2.5 px-4 py-2"
            style={{
              border: `1px solid ${theme.color}40`,
              background: `${theme.color}08`,
              borderRadius: 999,
            }}
            data-testid="invest-opener-verdict-preview"
          >
            <Icon size={14} strokeWidth={1.6} style={{ color: theme.color }} />
            <span
              className="font-mono-tight text-[11px] tracking-[0.18em] uppercase"
              style={{ color: theme.color }}
            >
              VERDICT · {theme.label}
            </span>
          </div>
        </div>

        {/* Phase 3 — top 3 insights */}
        <div
          className={`mt-14 w-full max-w-[520px] transition-all duration-700 ${
            phase === 'insights' || phase === 'ready'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-3'
          }`}
          data-testid="invest-opener-insights"
        >
          <div
            className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase mb-5"
            style={{ color: 'var(--inv-text-muted)' }}
          >
            Top 3 Institutional Signals
          </div>
          <ul className="space-y-3">
            {analysis.top_insights.map((insight, i) => (
              <li
                key={insight}
                className="flex items-baseline gap-4 text-left text-[14.5px] leading-snug"
                style={{
                  color: 'var(--inv-text-primary)',
                  paddingBottom: 12,
                  borderBottom: '1px solid var(--inv-border)',
                  transitionDelay: `${i * 100}ms`,
                }}
                data-testid={`invest-opener-insight-${i}`}
              >
                <span
                  className="font-mono-tight text-[11px]"
                  style={{ color: 'var(--inv-accent-bronze)', minWidth: 22 }}
                >
                  0{i + 1}
                </span>
                {insight}
              </li>
            ))}
          </ul>
        </div>

        {/* Phase 4 — continue */}
        <div
          className={`mt-14 transition-all duration-500 ${
            phase === 'ready' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <button
            onClick={onContinue}
            data-ready={phase === 'ready' ? 'true' : 'false'}
            className="inline-flex items-center gap-3 px-7 py-3.5 text-[13px] transition-all"
            style={{
              background: '#B8956A',
              color: '#FFFFFF',
              borderRadius: 3,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              letterSpacing: '-0.005em',
              boxShadow: '0 1px 2px rgba(184,149,106,0.10)',
            }}
            data-testid="invest-opener-continue-btn"
          >
            Open Investor Terminal
            <ArrowRight size={13} />
          </button>
          <div
            className="mt-5 font-mono-tight text-[10.5px]"
            style={{ color: 'var(--inv-text-muted)' }}
          >
            <Sparkles size={10} className="inline-block mr-1.5 -mt-0.5" style={{ color: 'var(--inv-accent-bronze)' }} />
            Acquisition-grade intelligence ready.
          </div>
        </div>
      </div>
    </div>
  );
}
