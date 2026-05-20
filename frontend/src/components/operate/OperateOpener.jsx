import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

// Propul8 OPERATE — Cinematic Opener.
// Three-phase reveal: loader → Propul8 INDEX score → 3 insights → Continue.
// Architectural, restrained, "Propul8 already understands the property" feel.

export default function OperateOpener({ analysis, onContinue }) {
  const [phase, setPhase] = useState('boot');
  const [displayScore, setDisplayScore] = useState(0);

  // Drive phase transitions
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 1100);
    const t2 = setTimeout(() => setPhase('insights'), 2400);
    const t3 = setTimeout(() => setPhase('ready'), 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Animate the Propul8 INDEX number up to its final value
  useEffect(() => {
    if (phase !== 'reveal' && phase !== 'insights' && phase !== 'ready') return undefined;
    const target = analysis.vela_index;
    let raf;
    const start = performance.now();
    const dur = 950;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, analysis.vela_index]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{
        background:
          'radial-gradient(80% 60% at 50% 30%, rgba(92,122,78,0.06) 0%, transparent 60%), #FFFFFF',
      }}
      data-testid="operate-opener"
    >
      <div className="w-full max-w-[760px] flex flex-col items-center text-center">
        {/* Phase 1: kicker + line */}
        <div
          className="font-mono-tight text-[10px] tracking-[0.32em] uppercase transition-opacity duration-500"
          style={{ color: '#B8956A', opacity: phase === 'boot' ? 1 : 0.66 }}
          data-testid="operate-opener-kicker"
        >
          Propul8 · Asset Intelligence
        </div>

        {/* Loading line — shows during boot */}
        <div
          className={`mt-10 h-[1px] w-[200px] overflow-hidden transition-opacity duration-500 ${phase === 'boot' ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'rgba(9,9,11,0.10)' }}
        >
          <div
            className="h-full"
            style={{
              background: '#B8956A',
              width: phase === 'boot' ? '100%' : '0%',
              transition: 'width 1100ms cubic-bezier(.2,.7,.2,1)',
            }}
          />
        </div>

        {/* Phase 2: Propul8 INDEX score */}
        <div
          className={`mt-14 transition-all duration-700 ${phase === 'boot' ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'}`}
        >
          <div
            className="font-mono-tight text-[10px] tracking-[0.28em] uppercase"
            style={{ color: '#52525B' }}
          >
            Propul8 INDEX
          </div>
          <div
            className="font-display font-medium mt-5 tabular-nums"
            style={{
              fontSize: 'clamp(96px, 14vw, 200px)',
              color: '#09090B',
              lineHeight: 0.92,
              letterSpacing: '-0.04em',
            }}
            data-testid="operate-opener-vela-index"
          >
            {displayScore}
            <span
              className="font-mono-tight"
              style={{
                fontSize: 'clamp(20px, 2vw, 28px)',
                color: '#52525B',
                marginLeft: 12,
                letterSpacing: 0,
              }}
            >
              / 100
            </span>
          </div>
          <div
            className="mt-4 font-mono-tight text-[12px] tracking-[0.16em] uppercase"
            style={{ color: '#B8956A' }}
            data-testid="operate-opener-dna-category"
          >
            {analysis.hospitality_dna.category}
          </div>
        </div>

        {/* Phase 3: top 3 insights */}
        <div
          className={`mt-16 w-full max-w-[520px] transition-all duration-700 ${
            phase === 'insights' || phase === 'ready'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-3'
          }`}
          data-testid="operate-opener-insights"
        >
          <div
            className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase mb-5"
            style={{ color: '#52525B' }}
          >
            Top 3 Immediate Insights
          </div>
          <ul className="space-y-3">
            {analysis.top_insights.map((insight, i) => (
              <li
                key={insight}
                className="flex items-baseline gap-4 text-left text-[14.5px] leading-snug"
                style={{
                  color: '#09090B',
                  paddingBottom: 12,
                  borderBottom: '1px solid rgba(9,9,11,0.08)',
                  transitionDelay: `${i * 100}ms`,
                }}
                data-testid={`operate-opener-insight-${i}`}
              >
                <span
                  className="font-mono-tight text-[11px]"
                  style={{ color: '#B8956A', minWidth: 22 }}
                >
                  0{i + 1}
                </span>
                {insight}
              </li>
            ))}
          </ul>
        </div>

        {/* Phase 4: continue */}
        <div
          className={`mt-14 transition-all duration-500 ${
            phase === 'ready' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <button
            onClick={onContinue}
            data-ready={phase === 'ready' ? 'true' : 'false'}
            className="inline-flex items-center gap-3 px-7 py-3.5 text-[12px] tracking-[0.10em] transition-all"
            style={{
              background: '#B8956A',
              color: '#FAFAFA',
              borderRadius: 4,
              fontFamily: 'Inter, sans-serif',
              textTransform: 'uppercase',
            }}
            data-testid="operate-opener-continue-btn"
          >
            Continue Analysis
            <ArrowRight size={13} />
          </button>
          <div
            className="mt-5 font-mono-tight text-[10.5px]"
            style={{ color: '#52525B' }}
          >
            <Sparkles size={10} className="inline-block mr-1.5 -mt-0.5" style={{ color: '#B8956A' }} />
            Propul8 already understands the property.
          </div>
        </div>
      </div>
    </div>
  );
}
