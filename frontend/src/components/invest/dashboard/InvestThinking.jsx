import { useEffect, useState } from 'react';

// Propul8 INVEST — Live AI thinking sequence.
// Dark espresso/bronze parallel of OperateThinking.
// 7 INVEST-specific phases reveal acquisition-grade analysis depth.

const PHASES = [
  'Extracting listing data',
  'Cross-validating metadata vs DOM',
  'Reading visual positioning',
  'Calculating hidden yield',
  'Scanning local demand signals',
  'Detecting revenue leakage',
  'Building transformation pathways',
];

export default function InvestThinking({ onComplete, durationMs = 4200 }) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const stepMs = durationMs / PHASES.length;
    const timers = PHASES.map((_, i) =>
      setTimeout(() => setActiveIdx(i + 1), stepMs * (i + 1)),
    );
    const finish = setTimeout(onComplete, durationMs + 300);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finish);
    };
  }, [onComplete, durationMs]);

  return (
    <div
      className="vela-invest min-h-screen flex items-center justify-center px-6"
      style={{
        background:
          'radial-gradient(70% 50% at 50% 35%, rgba(196,167,137,0.06) 0%, transparent 60%), var(--inv-bg-deep, #FAFAFA)',
      }}
      data-testid="invest-thinking"
    >
      <div className="w-full max-w-[640px]">
        <div
          className="font-mono-tight text-[10px] tracking-[0.32em] uppercase mb-12 text-center"
          style={{ color: 'var(--inv-accent-bronze)' }}
        >
          Propul8 · Acquisition Intelligence
        </div>

        <ul className="space-y-1.5">
          {PHASES.map((p, i) => {
            const isActive = i === activeIdx;
            const isDone = i < activeIdx;
            const isPending = i > activeIdx;
            return (
              <li
                key={p}
                className="flex items-baseline gap-5 px-4 py-3.5 transition-all duration-400"
                style={{
                  borderLeft: isActive
                    ? '2px solid var(--inv-accent-bronze)'
                    : isDone
                      ? '2px solid rgba(196,167,137,0.30)'
                      : '2px solid rgba(196,167,137,0.08)',
                  background: isActive ? 'rgba(196,167,137,0.04)' : 'transparent',
                  opacity: isPending ? 0.42 : 1,
                }}
                data-testid={`invest-thinking-phase-${i}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className="font-mono-tight text-[10px] tabular-nums"
                  style={{
                    color: isDone ? 'var(--inv-accent-bronze)'
                          : isActive ? 'var(--inv-text-primary)'
                          : 'var(--inv-text-muted)',
                    minWidth: 28,
                    letterSpacing: '0.18em',
                  }}
                >
                  0{i + 1}
                </span>
                <span
                  className="inv-display flex-1"
                  style={{
                    fontSize: 16,
                    color: isPending ? 'var(--inv-text-muted)' : 'var(--inv-text-primary)',
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {p}
                  {isActive && '…'}
                </span>
                <span
                  className="font-mono-tight text-[10px] tracking-[0.18em] uppercase"
                  style={{
                    color: isDone || isActive ? 'var(--inv-accent-bronze)' : 'transparent',
                  }}
                >
                  {isDone ? '✓ done' : isActive ? 'running' : ''}
                </span>
              </li>
            );
          })}
        </ul>

        <div
          className="mt-12 font-mono-tight text-[11px] text-center"
          style={{ color: 'var(--inv-text-muted)' }}
        >
          {activeIdx >= PHASES.length ? 'Acquisition intelligence ready — preparing investor terminal…' : 'Computing.'}
        </div>
      </div>
    </div>
  );
}
