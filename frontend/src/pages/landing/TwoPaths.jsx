import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

// Propul8 Landing — Two-Paths section.
// Two complementary capabilities: Asset Acquisition + Asset Optimization.
// Renamed per user mandate: "Asset Acquisition, and Asset Optimization,
// name it like that on the landing page down."

const PATHS = [
  {
    id: 'invest',
    kicker: 'Asset Acquisition',
    title: 'Identify high-yield opportunities.',
    line: 'AI-driven market screening and deterministic financial modeling to validate your next move.',
    cta: 'Analyze Acquisition',
    route: '/invest',
    icon: ShieldCheck,
  },
  {
    id: 'operate',
    kicker: 'Asset Optimization',
    title: 'Maximize existing portfolio value.',
    line: 'Uncover hidden operational inefficiencies and reposition assets with data-backed market signals.',
    cta: 'Run Yield Audit',
    route: '/operate',
    icon: Sparkles,
  },
];

export default function TwoPaths() {
  const navigate = useNavigate();

  return (
    <section
      className="py-28 lg:py-36 px-6 md:px-12"
      style={{ background: '#FFFFFF' }}
      data-testid="landing-two-paths"
    >
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-20">
          <span className="ts-kicker" data-testid="landing-paths-eyebrow">
            One Platform · Two Modes
          </span>
          <h2
            className="ts-h2 mt-5"
            data-testid="landing-paths-headline"
          >
            What do you want to do?
          </h2>
        </div>

        <div
          className="grid lg:grid-cols-2 gap-px"
          style={{ background: '#E4E4E7' }}
        >
          {PATHS.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => navigate(p.route)}
                className="group text-left p-10 lg:p-14 transition-all"
                style={{
                  background: '#FAFAFA',
                  border: 'none',
                  cursor: 'pointer',
                  minHeight: 360,
                }}
                data-testid={`landing-path-${p.id}`}
              >
                <div
                  className="w-12 h-12 flex items-center justify-center mb-8"
                  style={{
                    border: '1px solid rgba(184,149,106,0.22)',
                    borderRadius: 12,
                    background: 'rgba(184,149,106,0.06)',
                  }}
                >
                  <Icon size={20} strokeWidth={1.6} style={{ color: '#B8956A' }} />
                </div>
                <span
                  className="ts-kicker"
                  data-testid={`landing-path-${p.id}-kicker`}
                >
                  {p.kicker}
                </span>
                <div
                  className="ts-h3 mt-3"
                  data-testid={`landing-path-${p.id}-title`}
                >
                  {p.title}
                </div>
                <p
                  className="ts-body mt-5 max-w-[440px]"
                  data-testid={`landing-path-${p.id}-line`}
                >
                  {p.line}
                </p>
                <span
                  className="inline-flex items-center gap-2 mt-10 px-5 py-3 text-[12px] tracking-[0.05em] transition-all group-hover:translate-x-0.5"
                  style={{
                    background: '#B8956A',
                    color: '#FFFFFF',
                    borderRadius: 999,
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 500,
                  }}
                  data-testid={`landing-path-${p.id}-cta`}
                >
                  {p.cta} <ArrowRight size={13} strokeWidth={2} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
