// Propul8 · OPERATE — Next Best Action (single big card).
// The one move that moves yield. Heart of the result page.

import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

const IMPACT_THEME = {
  High:   { color: '#B8956A', label: 'High Impact' },
  Medium: { color: '#52525B', label: 'Medium Impact' },
  Low:    { color: '#52525B', label: 'Lower Impact' },
};

export default function NextBestAction({ action }) {
  const navigate = useNavigate();
  if (!action) return null;
  const theme = IMPACT_THEME[action.impact] || IMPACT_THEME.Medium;

  return (
    <section className="px-6 md:px-12 py-6" data-testid="operate-result-nba">
      <div className="max-w-[1180px] mx-auto">
        <div
          className="p-8 lg:p-12"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E4E4E7',
            borderRadius: 24,
            boxShadow: '0 1px 2px rgba(9,9,11,0.04)',
          }}
        >
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 flex items-center justify-center"
                  style={{
                    background: 'rgba(184,149,106,0.08)',
                    borderRadius: 4,
                  }}
                >
                  <Sparkles size={16} strokeWidth={1.6} style={{ color: '#B8956A' }} />
                </div>
                <span
                  className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
                  style={{ color: '#B8956A' }}
                >
                  Next Best Action
                </span>
              </div>

              <h2
                className="mt-6 font-display leading-[1.05] tracking-tight"
                style={{
                  color: '#09090B',
                  fontSize: 'clamp(32px, 4.2vw, 52px)',
                  fontWeight: 500,
                  letterSpacing: '-0.025em',
                }}
                data-testid="operate-nba-action"
              >
                {action.action}
              </h2>

              <p
                className="mt-6 text-[15.5px] leading-relaxed max-w-[640px]"
                style={{ color: '#52525B' }}
                data-testid="operate-nba-why"
              >
                {action.why}
              </p>

              <div className="mt-7 inline-flex items-center gap-2 px-3.5 py-2"
                style={{
                  background: `${theme.color}10`,
                  border: `1px solid ${theme.color}30`,
                  borderRadius: 999,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: theme.color }} />
                <span className="font-mono-tight text-[10.5px] tracking-[0.18em] uppercase" style={{ color: theme.color, fontWeight: 500 }}>
                  {theme.label}
                </span>
              </div>
            </div>

            <div className="lg:col-span-4 flex lg:justify-end items-start">
              <button
                onClick={() => action.route && navigate(action.route)}
                className="inline-flex items-center gap-2 px-6 py-4 text-[14px] transition-all"
                style={{
                  background: '#B8956A',
                  color: '#FFFFFF',
                  borderRadius: 3,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  letterSpacing: '-0.005em',
                  boxShadow: '0 1px 3px rgba(184,149,106,0.10)',
                }}
                data-testid="operate-nba-cta"
              >
                Build {action.action.replace(/^(Improve|Rewrite|Review|Close|Strengthen|Reshoot|Add|Activate)\s+/i, '')}
                {' '}Plan
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
