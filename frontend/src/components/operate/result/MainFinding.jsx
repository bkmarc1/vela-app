// Propul8 · OPERATE — Main Finding (one sentence, premium card).
// Single calm headline of what's wrong (or what's missing).

import { Compass } from 'lucide-react';

export default function MainFinding({ finding }) {
  return (
    <section className="px-6 md:px-12 py-10" data-testid="operate-result-finding">
      <div className="max-w-[1180px] mx-auto">
        <div
          className="p-7 lg:p-9 flex items-start gap-5"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E4E4E7',
            borderRadius: 4,
            boxShadow: '0 1px 2px rgba(9,9,11,0.03)',
          }}
        >
          <div
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center"
            style={{
              background: 'rgba(184,149,106,0.08)',
              borderRadius: 3,
            }}
          >
            <Compass size={18} strokeWidth={1.6} style={{ color: '#B8956A' }} />
          </div>
          <div>
            <div
              className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
              style={{ color: '#52525B' }}
            >
              Main Finding
            </div>
            <p
              className="mt-2 font-display leading-snug"
              style={{
                color: '#09090B',
                fontSize: 'clamp(20px, 2.4vw, 28px)',
                fontWeight: 500,
                letterSpacing: '-0.015em',
              }}
              data-testid="operate-finding-text"
            >
              {finding}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
