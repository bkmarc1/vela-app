// Propul8 · OPERATE — Build Action Plan CTA.
// Single primary button. Routes to upgrade cart (full execution).

import { useNavigate } from 'react-router-dom';
import { ArrowRight, Rocket } from 'lucide-react';

export default function ActionPlanCTA({ asset_id }) {
  const navigate = useNavigate();

  return (
    <section className="px-6 md:px-12 py-10" data-testid="operate-result-action-plan">
      <div className="max-w-[1180px] mx-auto flex flex-col items-center text-center">
        <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#B8956A' }}>
          One Click
        </span>
        <h2
          className="mt-3 font-display"
          style={{
            color: '#09090B',
            fontSize: 'clamp(24px, 2.8vw, 36px)',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            maxWidth: 640,
          }}
        >
          Build the full action plan.
        </h2>
        <p className="mt-3 text-[14.5px] max-w-[520px]" style={{ color: '#52525B' }}>
          Photo plan, listing rewrite, pricing review, and procurement —
          generated in one pass and ready to execute.
        </p>
        <button
          onClick={() => navigate(`/upgrade/${asset_id || 'demo'}/0`)}
          className="mt-8 inline-flex items-center gap-2.5 px-7 py-4 text-[14.5px] transition-all"
          style={{
            background: '#B8956A',
            color: '#FFFFFF',
            borderRadius: 3,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            letterSpacing: '-0.005em',
            boxShadow: '0 2px 6px rgba(184,149,106,0.12)',
          }}
          data-testid="operate-build-action-plan-btn"
        >
          <Rocket size={16} strokeWidth={1.6} />
          Build Action Plan
          <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}
