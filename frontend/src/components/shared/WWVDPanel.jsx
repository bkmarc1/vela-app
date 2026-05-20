import {
  ShieldCheck, Handshake, XOctagon, LayoutGrid, Waves, Building2,
  Hammer, Laptop, CalendarRange, TrendingUp, Sparkles, ArrowUpRight,
  PenLine, LineChart, Camera, Coffee,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Shared "What Would Propul8 Do?" panel.
// Single component, theme prop ('dark' | 'light') flips the palette.
// Replaces the prior dual-component implementation.

const ICON_MAP = {
  ShieldCheck, Handshake, XOctagon, LayoutGrid, Waves, Building2,
  Hammer, Laptop, CalendarRange, TrendingUp, Sparkles, PenLine, LineChart, Camera, Coffee,
};

const THEMES = {
  dark: {
    sectionBg: 'linear-gradient(180deg, rgba(196,167,137,0.04) 0%, rgba(10,8,7,0.0) 100%)',
    cardBg: '#FAFAFA',
    gridBg: 'rgba(196,167,137,0.10)',
    borderColor: 'rgba(196,167,137,0.22)',
    accent: '#B8956A',
    primaryText: '#FAFAFA',
    secondaryText: '#52525B',
    mutedText: '#52525B',
    iconBg: 'rgba(196,167,137,0.06)',
    iconBorder: 'rgba(196,167,137,0.20)',
    impactColor: '#B8956A',
    highConvictionBg: 'rgba(125,191,143,0.30)',
    primaryBtnBg: 'var(--inv-accent-bronze, #B8956A)',
    primaryBtnText: '#FAFAFA',
    ghostBtnBorder: 'rgba(196,167,137,0.30)',
    cardBorderTop: 'rgba(196,167,137,0.12)',
    sectionBorderColor: 'rgba(196,167,137,0.22)',
    headingColor: '#FAFAFA',
    kickerColor: '#B8956A',
  },
  light: {
    sectionBg: 'linear-gradient(180deg, rgba(92,122,78,0.04) 0%, rgba(250,246,236,0) 100%)',
    cardBg: '#FAFAFA',
    gridBg: 'rgba(9,9,11,0.08)',
    borderColor: 'rgba(9,9,11,0.10)',
    accent: '#B8956A',
    primaryText: '#09090B',
    secondaryText: '#52525B',
    mutedText: '#52525B',
    iconBg: 'rgba(92,122,78,0.06)',
    iconBorder: 'rgba(92,122,78,0.22)',
    impactColor: '#B8956A',
    highConvictionBg: 'rgba(92,122,78,0.30)',
    primaryBtnBg: '#B8956A',
    primaryBtnText: '#FAFAFA',
    ghostBtnBorder: 'rgba(92,122,78,0.30)',
    cardBorderTop: 'rgba(9,9,11,0.08)',
    sectionBorderColor: 'rgba(9,9,11,0.10)',
    headingColor: '#09090B',
    kickerColor: '#B8956A',
  },
};

export default function WWVDPanel({ actions, theme = 'light', testIdPrefix = 'wwvd' }) {
  const navigate = useNavigate();
  const t = THEMES[theme] || THEMES.light;
  if (!actions || actions.length === 0) return null;

  const sectionId = `${testIdPrefix}-section-wwvd`;

  return (
    <section
      className="border-b"
      style={{ borderColor: t.sectionBorderColor, background: t.sectionBg }}
      data-testid={sectionId}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-14 lg:py-16">
        {/* Heading */}
        <div className="mb-10 flex items-baseline justify-between flex-wrap gap-4">
          <div>
            <span
              className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
              style={{ color: t.kickerColor }}
            >
              Execution Layer
            </span>
            <h2
              className="font-display font-medium mt-3 leading-[1.04]"
              style={{
                fontSize: 'clamp(28px, 3.4vw, 44px)',
                color: t.headingColor,
                letterSpacing: '-0.015em',
              }}
              data-testid={`${testIdPrefix}-wwvd-heading`}
            >
              What Propul8 would do.
            </h2>
          </div>
          <p
            className="text-[13px] max-w-[360px] leading-relaxed"
            style={{ color: t.secondaryText }}
          >
            Top-3 conviction actions. Ranked by impact and execution clarity.
            One click to activate.
          </p>
        </div>

        {/* Actions grid */}
        <div className="grid lg:grid-cols-3 gap-px" style={{ background: t.gridBg }}>
          {actions.map((a, i) => {
            const Icon = ICON_MAP[a.icon] || Sparkles;
            const isPrimary = i === 0;
            return (
              <div
                key={a.label}
                className="p-8 lg:p-10 flex flex-col"
                style={{
                  background: t.cardBg,
                  minHeight: 280,
                  borderTop: isPrimary ? `2px solid ${t.accent}` : '2px solid transparent',
                }}
                data-testid={`${testIdPrefix}-wwvd-card-${i}`}
              >
                <div className="flex items-center justify-between mb-5">
                  <div
                    className="w-10 h-10 flex items-center justify-center"
                    style={{
                      border: `1px solid ${t.iconBorder}`,
                      borderRadius: 4,
                      background: t.iconBg,
                    }}
                  >
                    <Icon size={18} strokeWidth={1.5} style={{ color: t.accent }} />
                  </div>
                  <span
                    className="font-mono-tight tracking-[0.18em] uppercase px-2 py-1"
                    style={{
                      color: a.confidence === 'HIGH' ? t.impactColor : t.mutedText,
                      border: a.confidence === 'HIGH'
                        ? `1px solid ${t.highConvictionBg}`
                        : `1px solid ${t.borderColor}`,
                      borderRadius: 1,
                      fontSize: 9,
                    }}
                    data-testid={`${testIdPrefix}-wwvd-confidence-${i}`}
                  >
                    {a.confidence} CONVICTION
                  </span>
                </div>

                <div
                  className="font-display font-medium leading-[1.02] tracking-tight"
                  style={{
                    fontSize: 'clamp(22px, 2.2vw, 30px)',
                    color: isPrimary ? t.accent : t.primaryText,
                    letterSpacing: '-0.015em',
                  }}
                  data-testid={`${testIdPrefix}-wwvd-label-${i}`}
                >
                  {a.label}
                </div>

                <p
                  className="mt-4 text-[13px] leading-relaxed flex-1"
                  style={{ color: t.secondaryText }}
                  data-testid={`${testIdPrefix}-wwvd-reason-${i}`}
                >
                  {a.reason}
                </p>

                <div
                  className="mt-6 pt-5 flex items-end justify-between gap-3"
                  style={{ borderTop: `1px solid ${t.cardBorderTop}` }}
                >
                  <div>
                    <div
                      className="font-mono-tight tracking-[0.22em] uppercase"
                      style={{ color: t.mutedText, fontSize: 9 }}
                    >
                      Impact
                    </div>
                    <div
                      className="font-mono-tight font-medium mt-1.5"
                      style={{
                        fontSize: 16,
                        color: t.impactColor,
                        letterSpacing: '-0.01em',
                      }}
                      data-testid={`${testIdPrefix}-wwvd-impact-${i}`}
                    >
                      {a.impact_label}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(a.route)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[10px] tracking-[0.08em] transition-all whitespace-nowrap"
                    style={{
                      background: isPrimary ? t.primaryBtnBg : 'transparent',
                      color: isPrimary ? t.primaryBtnText : t.primaryText,
                      border: isPrimary ? 'none' : `1px solid ${t.ghostBtnBorder}`,
                      borderRadius: 4,
                      fontFamily: 'Inter, sans-serif',
                      textTransform: 'uppercase',
                    }}
                    data-testid={`${testIdPrefix}-wwvd-cta-${i}`}
                  >
                    {a.cta_label}
                    <ArrowUpRight size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
