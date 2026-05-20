import {
  Sofa, HardHat, PenLine, Sparkles, ShoppingBag, LineChart, Zap,
  ArrowUpRight, Rocket,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AutopilotModal from './AutopilotModal';

// Propul8 OPERATE — Propul8 Autopilot™.
// Master "Optimize This Asset" CTA + 7 individual one-click execution triggers.
// Each fans out to existing flows (UpgradeCart, ListingRewrite, VisualizeStudio).

const ICON_MAP = {
  Sofa, HardHat, PenLine, Sparkles, ShoppingBag, LineChart, Zap,
};

export default function AutopilotExecution({ executions, analysis }) {
  const navigate = useNavigate();
  const [autopilotOpen, setAutopilotOpen] = useState(false);

  const launchAutopilot = () => {
    setAutopilotOpen(true);
  };

  return (
    <section
      className="border-b"
      style={{ borderColor: 'rgba(9,9,11,0.10)', background: '#FAFAFA' }}
      data-testid="operate-section-autopilot"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 lg:py-24">
        {/* Master CTA — "Optimize This Asset" */}
        <div
          className="p-10 lg:p-14 mb-12 relative overflow-hidden"
          style={{
            background: '#B8956A',
            color: '#FAFAFA',
            borderLeft: '3px solid #B8956A',
          }}
          data-testid="operate-autopilot-master"
        >
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            aria-hidden
            style={{
              background: 'radial-gradient(60% 80% at 90% 30%, #B8956A 0%, transparent 60%)',
            }}
          />
          <div className="relative grid lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2 mb-5">
                <span
                  className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
                  style={{ color: '#B8956A' }}
                >
                  Propul8 Autopilot™
                </span>
                <span
                  className="font-mono-tight text-[9px] tracking-[0.18em] uppercase px-2 py-1"
                  style={{
                    color: '#B8956A',
                    border: '1px solid rgba(125,191,143,0.30)',
                    borderRadius: 1,
                  }}
                >
                  ● LIVE
                </span>
              </div>
              <h2
                className="font-display font-medium leading-[1.02]"
                style={{
                  color: '#FAFAFA',
                  fontSize: 'clamp(32px, 4vw, 56px)',
                  letterSpacing: '-0.02em',
                  maxWidth: 720,
                }}
                data-testid="operate-autopilot-headline"
              >
                One button. Seven execution streams.<br />
                <span style={{ color: '#B8956A' }}>Turn-key hospitality optimization.</span>
              </h2>
              <p
                className="mt-5 max-w-[520px] text-[14px] leading-relaxed"
                style={{ color: '#52525B' }}
              >
                Propul8 Autopilot™ orchestrates redesign, procurement, contractor brief,
                listing rewrite, brand identity, dynamic pricing, and operational
                automation — sequenced and executed in one chain.
              </p>
            </div>
            <div className="lg:col-span-5 flex lg:justify-end">
              <button
                onClick={launchAutopilot}
                className="inline-flex items-center gap-3 px-7 py-5 text-[13px] tracking-[0.10em] transition-all"
                style={{
                  background: '#B8956A',
                  color: '#FAFAFA',
                  borderRadius: 4,
                  fontFamily: 'Inter, sans-serif',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                }}
                data-testid="operate-autopilot-master-btn"
              >
                <Rocket size={15} strokeWidth={1.8} />
                Optimize This Asset
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Heading for individual streams */}
        <div className="mb-10">
          <span
            className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
            style={{ color: '#B8956A' }}
          >
            One-Click Execution™
          </span>
          <h3
            className="font-display font-medium mt-3 leading-[1.04]"
            style={{
              color: '#09090B',
              fontSize: 'clamp(22px, 2.6vw, 32px)',
              letterSpacing: '-0.015em',
              maxWidth: 720,
            }}
          >
            Or activate streams individually.
          </h3>
        </div>

        {/* 7 execution stream cards */}
        <div
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px"
          style={{ background: 'rgba(9,9,11,0.10)' }}
        >
          {executions.map((ex, i) => {
            const Icon = ICON_MAP[ex.icon] || Sparkles;
            return (
              <button
                key={ex.id}
                onClick={() => navigate(ex.route)}
                className="text-left p-7 lg:p-8 transition-all hover:-translate-y-0.5"
                style={{
                  background: ex.primary ? '#FFFFFF' : '#FAFAFA',
                  borderTop: ex.primary ? '2px solid #B8956A' : '2px solid transparent',
                }}
                data-testid={`operate-execution-${ex.id}`}
              >
                <div className="flex items-center justify-between mb-5">
                  <div
                    className="w-10 h-10 flex items-center justify-center"
                    style={{
                      border: '1px solid rgba(92,122,78,0.22)',
                      borderRadius: 4,
                      background: 'rgba(92,122,78,0.06)',
                    }}
                  >
                    <Icon size={17} strokeWidth={1.5} style={{ color: '#B8956A' }} />
                  </div>
                  {ex.primary && (
                    <span
                      className="font-mono-tight text-[8.5px] tracking-[0.18em] uppercase"
                      style={{ color: '#B8956A' }}
                    >
                      Primary
                    </span>
                  )}
                </div>
                <div
                  className="font-display font-medium leading-snug mb-2"
                  style={{ fontSize: 16, color: '#09090B', letterSpacing: '-0.01em' }}
                  data-testid={`operate-execution-${ex.id}-label`}
                >
                  {ex.label}
                </div>
                <div
                  className="text-[12.5px] leading-relaxed mb-5"
                  style={{ color: '#52525B' }}
                >
                  {ex.detail}
                </div>
                <div
                  className="flex items-center gap-1.5 font-mono-tight text-[10px] tracking-[0.10em] uppercase"
                  style={{ color: '#B8956A' }}
                >
                  Activate <ArrowUpRight size={11} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <AutopilotModal
        open={autopilotOpen}
        onClose={() => setAutopilotOpen(false)}
        analysis={analysis}
      />
    </section>
  );
}
