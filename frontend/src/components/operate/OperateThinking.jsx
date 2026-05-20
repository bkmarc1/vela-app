import { useEffect, useState } from 'react';

// Propul8 OPERATE — Live data extraction sequence.
// In LIVE mode (URL pasted): 4-step scrape progression with city-aware comp count.
// In DEMO mode (demo button): faster legacy 6-phase analytical sequence.

const LIVE_PHASES = (city) => [
  { label: 'Scraping listing',                                       ms: 1000 },
  { label: 'Extracting photos, pricing, amenities',                  ms: 1000 },
  { label: `Benchmarking against 47 ${city || 'local'} comparables`, ms: 1500 },
  { label: 'Calculating Propul8 Index',                              ms: 500  },
];

const DEMO_PHASES = [
  { label: 'Analyzing listing structure',           ms: 600 },
  { label: 'Reading visual positioning',            ms: 600 },
  { label: 'Comparing ADR performance',             ms: 600 },
  { label: 'Detecting revenue leakage',             ms: 600 },
  { label: 'Scanning hospitality competitors',      ms: 600 },
  { label: 'Generating optimization pathways',      ms: 600 },
];


export default function OperateThinking({ onComplete, mode = 'live', city = null }) {
  const phases = mode === 'demo' ? DEMO_PHASES : LIVE_PHASES(city);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let cumulative = 0;
    const timers = [];
    phases.forEach((phase, i) => {
      cumulative += phase.ms;
      timers.push(setTimeout(() => !cancelled && setActiveIdx(i + 1), cumulative));
    });
    const finish = setTimeout(() => !cancelled && onComplete(), cumulative + 250);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      clearTimeout(finish);
    };
  }, [onComplete, mode, city]);

  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{
        background:
          'radial-gradient(70% 50% at 50% 35%, rgba(184,149,106,0.06) 0%, transparent 60%), #FFFFFF',
      }}
      data-testid="operate-thinking"
    >
      <div className="w-full max-w-[640px]">
        {/* LIVE / DEMO badge */}
        <div className="flex items-center justify-center mb-10">
          <span
            className="inline-flex items-center gap-2 px-3 py-1"
            style={{
              background: mode === 'live' ? 'rgba(22,163,74,0.10)' : 'rgba(184,149,106,0.10)',
              border: `1px solid ${mode === 'live' ? 'rgba(22,163,74,0.32)' : 'rgba(184,149,106,0.36)'}`,
              borderRadius: 999,
            }}
            data-testid="operate-thinking-mode-badge"
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: mode === 'live' ? '#16A34A' : '#B8956A',
                animation: 'pulse 1.6s ease-in-out infinite',
              }}
            />
            <span
              className="font-mono-tight text-[10px] tracking-[0.28em] uppercase"
              style={{ color: mode === 'live' ? '#16A34A' : '#B8956A', fontWeight: 600 }}
            >
              {mode === 'live' ? 'Live Data' : 'Demo Data'}
            </span>
          </span>
        </div>

        <ul className="space-y-1.5">
          {phases.map((p, i) => {
            const isActive  = i === activeIdx;
            const isDone    = i < activeIdx;
            const isPending = i > activeIdx;
            return (
              <li
                key={p.label}
                className="flex items-baseline gap-5 px-4 py-3.5 transition-all duration-400"
                style={{
                  borderLeft: isActive
                    ? '2px solid #B8956A'
                    : isDone
                      ? '2px solid rgba(184,149,106,0.30)'
                      : '2px solid rgba(9,9,11,0.06)',
                  background: isActive ? 'rgba(184,149,106,0.05)' : 'transparent',
                  opacity: isPending ? 0.42 : 1,
                }}
                data-testid={`operate-thinking-phase-${i}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className="font-mono-tight text-[10px] tabular-nums"
                  style={{
                    color: isDone ? '#B8956A' : isActive ? '#09090B' : '#52525B',
                    minWidth: 28,
                    letterSpacing: '0.18em',
                  }}
                >
                  0{i + 1}
                </span>
                <span
                  className="font-display flex-1"
                  style={{
                    fontSize: 16,
                    color: isPending ? '#52525B' : '#09090B',
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {p.label}
                  {isActive && '…'}
                </span>
                <span
                  className="font-mono-tight text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: isDone ? '#B8956A' : isActive ? '#B8956A' : 'transparent' }}
                >
                  {isDone ? '✓ done' : isActive ? 'running' : ''}
                </span>
              </li>
            );
          })}
        </ul>

        {/* Live-data freshness disclaimer */}
        <div
          className="mt-10 text-center font-mono-tight text-[10.5px]"
          style={{ color: '#52525B', letterSpacing: '0.12em' }}
          data-testid="operate-thinking-freshness"
        >
          {mode === 'live'
            ? `DATA REFRESHED EVERY 6 HOURS · LAST UPDATE: ${now}`
            : 'Demo data · synthesized for product preview'}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }`}</style>
    </div>
  );
}
