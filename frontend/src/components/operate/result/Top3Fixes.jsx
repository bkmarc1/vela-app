// Propul8 · OPERATE — Top 3 Fixes.
// Minimal action cards. Short why + impact tier + Open button.

import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const IMPACT_DOT = {
  High:   '#B8956A',
  Medium: '#52525B',
  Low:    '#A1A1AA',
};

export default function Top3Fixes({ fixes }) {
  const navigate = useNavigate();
  if (!fixes || fixes.length === 0) return null;

  return (
    <section className="px-6 md:px-12 py-10" data-testid="operate-result-top-fixes">
      <div className="max-w-[1180px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#B8956A' }}>
              Top 3 Fixes
            </span>
            <h2
              className="mt-3 font-display"
              style={{
                color: '#09090B',
                fontSize: 'clamp(22px, 2.4vw, 30px)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
              }}
            >
              The next three moves.
            </h2>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {fixes.map((fix, i) => {
            const dot = IMPACT_DOT[fix.impact] || IMPACT_DOT.Medium;
            return (
              <div
                key={fix.id || i}
                className="p-7 flex flex-col h-full transition-all"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: 4,
                  boxShadow: '0 1px 2px rgba(9,9,11,0.03)',
                }}
                data-testid={`operate-fix-card-${fix.id || i}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono-tight text-[10.5px] px-2 py-0.5"
                      style={{
                        background: 'rgba(184,149,106,0.10)',
                        color: '#B8956A',
                        border: '1px solid rgba(184,149,106,0.25)',
                        borderRadius: 999,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                      }}
                    >
                      P{i + 1}
                    </span>
                    <div className="inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                      <span className="font-mono-tight text-[10px] tracking-[0.18em] uppercase" style={{ color: dot, fontWeight: 500 }}>
                        {fix.impact} Impact
                      </span>
                    </div>
                  </div>
                </div>
                <h3
                  className="mt-5 font-display leading-snug"
                  style={{
                    color: '#09090B',
                    fontSize: 'clamp(18px, 1.9vw, 22px)',
                    fontWeight: 500,
                    letterSpacing: '-0.015em',
                  }}
                >
                  {fix.action}
                </h3>
                <p
                  className="mt-3 text-[14px] leading-relaxed flex-1"
                  style={{ color: '#52525B' }}
                >
                  {fix.why}
                </p>
                <button
                  onClick={() => fix.route && navigate(fix.route)}
                  className="mt-6 inline-flex items-center gap-1.5 self-start text-[12.5px] transition-colors"
                  style={{
                    color: '#B8956A',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 500,
                  }}
                  data-testid={`operate-fix-open-${fix.id || i}`}
                >
                  Open
                  <ArrowUpRight size={13} strokeWidth={1.7} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
