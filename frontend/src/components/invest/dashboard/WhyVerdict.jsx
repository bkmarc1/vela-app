import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

// Propul8 INVEST — Why · Strength · Risk.
// Three calm advisor bullets that answer "why this verdict" in 6 seconds.
// Replaces the wall of text from the old DealVerdict + Final Verdict sections.

const ROWS = [
  { id: 'why',      icon: Info,         color: 'var(--inv-accent-bronze)', label: 'Why this verdict' },
  { id: 'strength', icon: CheckCircle2, color: 'var(--inv-signal-up)',     label: 'Key opportunity' },
  { id: 'risk',     icon: AlertCircle,  color: 'var(--inv-signal-down)',   label: 'Key risk' },
];

export default function WhyVerdict({ bullets }) {
  if (!bullets) return null;

  return (
    <section
      className="border-b"
      style={{
        background: 'var(--inv-bg-deep, #FAFAFA)',
        borderColor: 'var(--inv-border)',
      }}
      data-testid="invest-section-why"
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-12 lg:py-14">
        <div className="grid md:grid-cols-3 gap-px" style={{ background: 'var(--inv-border)' }}>
          {ROWS.map((row) => {
            const Icon = row.icon;
            const text = bullets[row.id] || '—';
            return (
              <div
                key={row.id}
                className="p-7 lg:p-8 flex flex-col"
                style={{ background: 'var(--inv-bg-deep, #FAFAFA)' }}
                data-testid={`invest-why-${row.id}`}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <Icon size={14} strokeWidth={1.7} style={{ color: row.color }} />
                  <span
                    className="font-mono-tight text-[10px] tracking-[0.20em] uppercase"
                    style={{ color: row.color }}
                  >
                    {row.label}
                  </span>
                </div>
                <p
                  className="text-[14px] leading-relaxed flex-1"
                  style={{ color: 'var(--inv-text-primary)' }}
                  data-testid={`invest-why-${row.id}-text`}
                >
                  {text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
