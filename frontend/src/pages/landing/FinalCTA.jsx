import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// Propul8 — Final CTA section. Warm off-white shell, terracotta accent.
export default function FinalCTA() {
  const navigate = useNavigate();
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: '#FAFAFA', color: '#09090B' }}
      data-testid="landing-final"
    >
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(50% 60% at 50% 40%, rgba(184,149,106,0.06), transparent 65%)',
        }}
      />
      <div className="relative max-w-[1100px] mx-auto px-6 md:px-12 py-28 lg:py-32 text-center">
        <span className="ts-kicker">
          Propul8
        </span>
        <h2
          className="ts-h2 mt-6 mx-auto"
          style={{ maxWidth: 760 }}
          data-testid="landing-final-headline"
        >
          Turn every property<br />
          <span style={{ color: '#B8956A' }}>into a better-performing asset.</span>
        </h2>
        <div className="mt-14 flex items-center gap-3 flex-wrap justify-center">
          <button
            onClick={() => navigate('/invest')}
            className="inline-flex items-center gap-2 px-7 py-3.5 text-[14px] font-medium"
            style={{
              background: '#B8956A',
              color: '#FFFFFF',
              borderRadius: 999,
              border: 'none',
              boxShadow: '0 4px 14px rgba(184,149,106,0.18)',
              cursor: 'pointer',
            }}
            data-testid="landing-final-cta-invest"
          >
            Analyze Acquisition <ArrowRight size={16} strokeWidth={2} />
          </button>
          <button
            onClick={() => navigate('/operate')}
            className="inline-flex items-center gap-2 px-7 py-3.5 text-[14px] font-medium"
            style={{
              background: 'transparent',
              color: '#09090B',
              border: '1px solid #E4E4E7',
              borderRadius: 999,
              cursor: 'pointer',
            }}
            data-testid="landing-final-cta-operate"
          >
            Run Yield Audit <ArrowRight size={16} strokeWidth={1.7} />
          </button>
        </div>
      </div>
    </section>
  );
}
