import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Sparkles, BarChart3, Briefcase, ArrowUpRight } from 'lucide-react';

// Propul8 — Module picker.
// Replaces the old "Enter Propul8 → /invest" default. Forces the user to
// consciously choose where they want to go: Acquisition (INVEST), Asset
// Optimization (OPERATE), Command Center (DASHBOARD), or Portfolio.

const TILES = [
  {
    id: 'invest',
    kicker: 'Acquisition Intelligence',
    title: 'Propul8 INVEST',
    subtitle: 'Underwrite acquisitions. Verdict-driven. Institutional grade.',
    icon: ShieldCheck,
    route: '/invest',
    testId: 'enter-tile-invest',
  },
  {
    id: 'operate',
    kicker: 'Asset Intelligence',
    title: 'Propul8 OPERATE',
    subtitle: 'Optimize existing assets. Revenue leak detection. Autopilot™.',
    icon: Sparkles,
    route: '/operate',
    testId: 'enter-tile-operate',
  },
  {
    id: 'dashboard',
    kicker: 'Command Center',
    title: 'DASHBOARD',
    subtitle: 'Live signals. Portfolio tape. Market timing.',
    icon: BarChart3,
    route: '/dashboard',
    testId: 'enter-tile-dashboard',
  },
  {
    id: 'portfolio',
    kicker: 'Holdings',
    title: 'PORTFOLIO',
    subtitle: 'Your Propul8 Certified™ assets. Watchlist. P&L.',
    icon: Briefcase,
    route: '/portfolio',
    testId: 'enter-tile-portfolio',
  },
];

export default function EnterVela() {
  const navigate = useNavigate();

  return (
    <div
      className="vela-invest min-h-screen flex flex-col"
      style={{
        background:
          'radial-gradient(85% 65% at 50% 30%, rgba(196,167,137,0.06) 0%, transparent 60%), var(--inv-bg-deep, #FAFAFA)',
        color: 'var(--inv-text-primary)',
      }}
      data-testid="enter-vela-page"
    >
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[1080px]">
          <div className="text-center mb-16">
            <span
              className="font-mono-tight text-[10px] tracking-[0.32em] uppercase"
              style={{ color: 'var(--inv-accent-bronze)' }}
              data-testid="enter-kicker"
            >
              Propul8 · The AI Operating System
            </span>
            <h1
              className="inv-display font-medium mt-7 leading-[1.02]"
              style={{
                color: 'var(--inv-text-primary)',
                fontSize: 'clamp(36px, 5vw, 64px)',
                letterSpacing: '-0.02em',
              }}
              data-testid="enter-headline"
            >
              Where would you like to start?
            </h1>
            <p
              className="mt-6 max-w-[560px] mx-auto text-[14px] leading-relaxed"
              style={{ color: 'var(--inv-text-secondary)' }}
              data-testid="enter-subtitle"
            >
              Two intelligence engines · live command center · your Propul8-Certified portfolio.
            </p>
          </div>

          <div
            className="grid sm:grid-cols-2 gap-px"
            style={{ background: 'var(--inv-border)' }}
          >
            {TILES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => navigate(t.route)}
                  className="group text-left p-8 lg:p-10 transition-all hover:-translate-y-0.5"
                  style={{
                    background: 'var(--inv-bg-deep, #FAFAFA)',
                    border: 'none',
                    cursor: 'pointer',
                    minHeight: 240,
                  }}
                  data-testid={t.testId}
                >
                  <div className="flex items-start justify-between mb-7">
                    <div
                      className="w-12 h-12 flex items-center justify-center"
                      style={{
                        border: '1px solid rgba(196,167,137,0.22)',
                        borderRadius: 4,
                        background: 'rgba(196,167,137,0.06)',
                      }}
                    >
                      <Icon size={20} strokeWidth={1.4} style={{ color: 'var(--inv-accent-bronze)' }} />
                    </div>
                    <ArrowUpRight
                      size={16}
                      strokeWidth={1.4}
                      style={{
                        color: 'var(--inv-text-muted)',
                        transition: 'transform 220ms ease, color 220ms ease',
                      }}
                      className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </div>
                  <span
                    className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
                    style={{ color: 'var(--inv-accent-bronze)' }}
                  >
                    {t.kicker}
                  </span>
                  <div
                    className="inv-display font-medium mt-3 leading-[1.04]"
                    style={{
                      fontSize: 'clamp(24px, 2.6vw, 30px)',
                      color: 'var(--inv-text-primary)',
                      letterSpacing: '-0.015em',
                    }}
                  >
                    {t.title}
                  </div>
                  <p
                    className="mt-4 text-[13px] leading-relaxed"
                    style={{ color: 'var(--inv-text-secondary)', maxWidth: 320 }}
                  >
                    {t.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
