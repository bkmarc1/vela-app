import { Check, Circle } from 'lucide-react';

// Propul8 INVEST — Deal Roadmap™.
// 7-step horizontal acquisition progression. Each step shows status + one-line detail.
// Premium pixel-perfect timeline component.

export default function DealRoadmap({ roadmap }) {
  if (!roadmap || !roadmap.length) return null;

  return (
    <section
      className="border-b"
      style={{ borderColor: 'var(--inv-border)', background: 'var(--inv-bg-surface, #FAFAFA)' }}
      data-testid="invest-section-roadmap"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-14 lg:py-16">
        {/* Heading */}
        <div className="mb-12">
          <span className="inv-kicker-bronze">Deal Roadmap™</span>
          <h2
            className="inv-display font-medium mt-3 leading-[1.04]"
            style={{
              fontSize: 'clamp(26px, 3vw, 38px)',
              color: 'var(--inv-text-primary)',
              letterSpacing: '-0.015em',
            }}
            data-testid="invest-roadmap-heading"
          >
            From listing to next action.
          </h2>
        </div>

        {/* Steps — horizontal grid on desktop, vertical stack on mobile */}
        <ol
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-px"
          style={{ background: 'var(--inv-border)' }}
        >
          {roadmap.map((step, i) => {
            const isDone = step.status === 'done';
            return (
              <li
                key={step.id}
                className="p-5 lg:p-6 flex flex-col"
                style={{
                  background: 'var(--inv-bg-deep, #FAFAFA)',
                  minHeight: 160,
                  borderTop: isDone ? '2px solid var(--inv-accent-bronze)' : '2px solid rgba(196,167,137,0.18)',
                }}
                data-testid={`invest-roadmap-step-${i}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="font-mono-tight text-[10px] tabular-nums tracking-[0.18em]"
                    style={{ color: isDone ? 'var(--inv-accent-bronze)' : 'var(--inv-text-muted)' }}
                  >
                    0{step.id}
                  </span>
                  <span
                    className="w-5 h-5 flex items-center justify-center"
                    style={{
                      borderRadius: '50%',
                      background: isDone ? 'var(--inv-accent-bronze)' : 'transparent',
                      border: isDone ? 'none' : '1px solid rgba(196,167,137,0.30)',
                    }}
                  >
                    {isDone ? (
                      <Check size={11} strokeWidth={2.6} style={{ color: 'var(--inv-bg-deep, #FAFAFA)' }} />
                    ) : (
                      <Circle size={6} strokeWidth={1.6} style={{ color: 'var(--inv-text-muted)' }} />
                    )}
                  </span>
                </div>
                <div
                  className="inv-display font-medium leading-[1.1]"
                  style={{
                    fontSize: 14.5,
                    color: 'var(--inv-text-primary)',
                    letterSpacing: '-0.01em',
                  }}
                  data-testid={`invest-roadmap-step-${i}-label`}
                >
                  {step.label}
                </div>
                <div
                  className="mt-3 text-[11.5px] font-mono-tight leading-snug flex-1"
                  style={{ color: 'var(--inv-text-secondary)' }}
                  data-testid={`invest-roadmap-step-${i}-detail`}
                >
                  {step.detail}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
