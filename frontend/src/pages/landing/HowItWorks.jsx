import { Clipboard, ShieldCheck, BarChart3, Zap } from 'lucide-react';

// Propul8 Landing — How It Works.
// 4 institutional steps: Paste · Confirm · Compare · Get plan.
// Minimal premium block. No long paragraphs.

const STEPS = [
  { id: 'paste',   n: '01', icon: Clipboard,   title: 'Paste listing',      line: 'Spitogatos, Airbnb, Booking, or any listing URL.' },
  { id: 'confirm', n: '02', icon: ShieldCheck, title: 'Confirm data',       line: 'Propul8 extracts the fields. You verify what matters.' },
  { id: 'compare', n: '03', icon: BarChart3,   title: 'Compare market',     line: 'Comps, ADR range, and revenue benchmarks pull in.' },
  { id: 'execute', n: '04', icon: Zap,         title: 'Get action plan',    line: 'Decision, top risks, next moves — execution-ready.' },
];

export default function HowItWorks() {
  return (
    <section
      className="py-28 lg:py-36 px-6 md:px-12"
      style={{ background: '#FFFFFF' }}
      data-testid="landing-how-it-works"
    >
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-20">
          <span className="ts-kicker">
            How It Works
          </span>
          <h2
            className="ts-h2 mt-5 mx-auto"
            style={{ maxWidth: 700 }}
            data-testid="landing-how-headline"
          >
            From a pasted URL to the next action.
          </h2>
        </div>

        <ol
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px"
          style={{ background: '#E4E4E7' }}
        >
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <li
                key={s.id}
                className="p-7 lg:p-9 flex flex-col"
                style={{ background: '#FAFAFA', minHeight: 240 }}
                data-testid={`landing-how-${s.id}`}
              >
                <div className="flex items-baseline justify-between mb-7">
                  <span
                    className="font-mono-tight text-[12px] tabular-nums"
                    style={{ color: '#B8956A' }}
                  >
                    {s.n}
                  </span>
                  <Icon size={16} strokeWidth={1.6} style={{ color: '#B8956A' }} />
                </div>
                <div className="ts-h3" style={{ fontSize: 19 }}>
                  {s.title}
                </div>
                <p className="ts-small mt-3">
                  {s.line}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
