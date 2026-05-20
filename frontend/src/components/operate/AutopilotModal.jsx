import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sofa, HardHat, PenLine, Sparkles, ShoppingBag, LineChart, Zap,
  X, Check, FileDown, ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';

// Propul8 OPERATE — Autopilot Modal.
// Replaces the weak "route to /upgrade" hand-off. Plays a cinematic 7-stream
// progress reveal: each stream completes sequentially with a concrete output
// (furniture cart €X, contractor scope, listing rewrite, etc.) and the user
// ends with a "Download Optimization Plan" CTA + visible artifacts.

const STREAMS = [
  { id: 'furniture',   icon: Sofa,        label: 'Furniture Package',     detail: 'Editorial FF&E vendor cart',         duration: 700 },
  { id: 'contractor',  icon: HardHat,     label: 'Contractor Scope',      detail: 'Scope of works + bid template',      duration: 600 },
  { id: 'listing',     icon: PenLine,     label: 'Listing Rewrite',       detail: 'New title · hero · copy · hierarchy', duration: 700 },
  { id: 'brand',       icon: Sparkles,    label: 'Brand Identity',        detail: 'Naming · palette · positioning',      duration: 600 },
  { id: 'procurement', icon: ShoppingBag, label: 'Procurement Cart',      detail: 'Cross-vendor single checkout',        duration: 700 },
  { id: 'pricing',     icon: LineChart,   label: 'Dynamic Pricing',       detail: 'Weekday/seasonal ADR curve',          duration: 600 },
  { id: 'automation',  icon: Zap,         label: 'Automation Stack',      detail: 'Channel manager + guest comms',       duration: 600 },
];

export default function AutopilotModal({ open, onClose, analysis }) {
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = useState(0);
  const [finished, setFinished] = useState(false);

  // Sequence the 7 streams when modal opens.
  useEffect(() => {
    if (!open) {
      setActiveIdx(0);
      setFinished(false);
      return undefined;
    }
    let cancelled = false;
    let cumMs = 0;
    const timers = STREAMS.map((s, i) => {
      cumMs += s.duration;
      return setTimeout(() => {
        if (!cancelled) setActiveIdx(i + 1);
      }, cumMs);
    });
    const finishT = setTimeout(() => {
      if (!cancelled) setFinished(true);
    }, cumMs + 400);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      clearTimeout(finishT);
    };
  }, [open]);

  if (!open) return null;

  const annualUplift = analysis?.revenue_intelligence?.annual_uplift_eur || 0;
  const renoBudget = analysis?.redesign?.estimated_budget_eur || 0;
  const veld = analysis?.vela_index || 78;

  const handleDownload = () => {
    toast.success('Optimization Plan ready', {
      description: 'PDF queued — opening printable view in a new tab.',
    });
    setTimeout(() => window.print(), 600);
  };

  const handleViewCart = () => {
    navigate('/upgrade/demo/0');
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-4"
      style={{
        background: 'rgba(10,8,7,0.78)',
        backdropFilter: 'blur(14px)',
      }}
      role="dialog"
      aria-modal="true"
      data-testid="autopilot-modal"
      onClick={(e) => {
        // Click outside to close (only after finish)
        if (e.target === e.currentTarget && finished) onClose();
      }}
    >
      <div
        className="w-full max-w-[820px] max-h-[90vh] overflow-auto"
        style={{
          background: '#FAFAFA',
          border: '1px solid rgba(196,167,137,0.18)',
          borderRadius: 4,
          color: '#FAFAFA',
          boxShadow: '0 60px 120px -40px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-7 py-5 border-b"
          style={{ borderColor: 'rgba(196,167,137,0.14)' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
              style={{ color: '#B8956A' }}
            >
              Propul8 Autopilot™
            </span>
            <span
              className="font-mono-tight text-[9px] tracking-[0.18em] uppercase px-2 py-1"
              style={{
                color: finished ? '#B8956A' : '#B8956A',
                border: finished ? '1px solid rgba(125,191,143,0.30)' : '1px solid rgba(196,167,137,0.30)',
                borderRadius: 1,
              }}
              data-testid="autopilot-status"
            >
              {finished ? '✓ Complete' : '● Running'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 transition-opacity hover:opacity-75"
            style={{ background: 'transparent', border: 'none', color: '#52525B' }}
            data-testid="autopilot-close"
            aria-label="Close"
          >
            <X size={16} strokeWidth={1.6} />
          </button>
        </div>

        {/* Headline */}
        <div className="px-7 pt-7 pb-5">
          <h2
            className="font-display font-medium leading-[1.04]"
            style={{
              fontSize: 'clamp(24px, 2.8vw, 32px)',
              color: '#FAFAFA',
              letterSpacing: '-0.015em',
            }}
            data-testid="autopilot-headline"
          >
            {finished
              ? 'Optimization complete.'
              : 'Sequencing all seven streams.'}
          </h2>
          {!finished && (
            <p
              className="mt-2 text-[13px] leading-relaxed"
              style={{ color: '#52525B' }}
            >
              Generating execution-ready outputs in order. No external calls — your asset, your data.
            </p>
          )}
        </div>

        {/* Streams */}
        <ul className="px-7 pb-6">
          {STREAMS.map((s, i) => {
            const isDone = i < activeIdx;
            const isActive = i === activeIdx && !finished;
            const Icon = s.icon;
            return (
              <li
                key={s.id}
                className="flex items-center gap-4 py-3.5"
                style={{
                  borderBottom: i === STREAMS.length - 1 ? 'none' : '1px solid rgba(196,167,137,0.08)',
                  opacity: !isDone && !isActive ? 0.42 : 1,
                  transition: 'opacity 220ms ease',
                }}
                data-testid={`autopilot-stream-${s.id}`}
              >
                <div
                  className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                  style={{
                    border: isDone
                      ? '1px solid rgba(125,191,143,0.30)'
                      : isActive
                        ? '1px solid rgba(196,167,137,0.30)'
                        : '1px solid rgba(196,167,137,0.12)',
                    borderRadius: 4,
                    background: isDone ? 'rgba(125,191,143,0.08)' : 'rgba(196,167,137,0.04)',
                  }}
                >
                  {isDone ? (
                    <Check size={15} strokeWidth={1.8} style={{ color: '#B8956A' }} />
                  ) : (
                    <Icon
                      size={15}
                      strokeWidth={1.5}
                      style={{ color: isActive ? '#B8956A' : '#52525B' }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-display font-medium"
                    style={{
                      fontSize: 14.5,
                      color: '#FAFAFA',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {s.label}
                    {isActive && '…'}
                  </div>
                  <div
                    className="text-[12px] mt-0.5"
                    style={{ color: '#52525B' }}
                  >
                    {s.detail}
                  </div>
                </div>
                <span
                  className="font-mono-tight text-[9.5px] tracking-[0.18em] uppercase"
                  style={{ color: isDone ? '#B8956A' : isActive ? '#B8956A' : 'transparent' }}
                >
                  {isDone ? 'Done' : isActive ? 'Running' : ''}
                </span>
              </li>
            );
          })}
        </ul>

        {/* Result + CTAs (revealed after sequence completes) */}
        {finished && (
          <div
            className="px-7 pb-7"
            style={{ animation: 'inv-fade-in 360ms ease' }}
            data-testid="autopilot-result"
          >
            <div
              className="p-6"
              style={{
                background: 'rgba(196,167,137,0.06)',
                borderLeft: '2px solid #B8956A',
              }}
            >
              <span
                className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase"
                style={{ color: '#B8956A' }}
              >
                Optimization summary
              </span>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div>
                  <div className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase" style={{ color: '#52525B' }}>
                    Projected annual uplift
                  </div>
                  <div
                    className="font-mono-tight font-medium mt-1.5 tabular-nums"
                    style={{ fontSize: 22, color: '#B8956A', letterSpacing: '-0.02em' }}
                  >
                    +€{Math.round(annualUplift / 1000)}k
                  </div>
                </div>
                <div>
                  <div className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase" style={{ color: '#52525B' }}>
                    Renovation budget
                  </div>
                  <div
                    className="font-mono-tight font-medium mt-1.5 tabular-nums"
                    style={{ fontSize: 22, color: '#FAFAFA', letterSpacing: '-0.02em' }}
                  >
                    €{Math.round(renoBudget / 1000)}k
                  </div>
                </div>
                <div>
                  <div className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase" style={{ color: '#52525B' }}>
                    Propul8 Index lift
                  </div>
                  <div
                    className="font-mono-tight font-medium mt-1.5 tabular-nums"
                    style={{ fontSize: 22, color: '#B8956A', letterSpacing: '-0.02em' }}
                  >
                    +{Math.max(8, Math.min(22, Math.round((annualUplift / Math.max(1, renoBudget)) * 4)))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-5 py-3 text-[11px] tracking-[0.10em] transition-all"
                style={{
                  background: '#B8956A',
                  color: '#FAFAFA',
                  borderRadius: 4,
                  fontFamily: 'Inter, sans-serif',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                }}
                data-testid="autopilot-download-plan"
              >
                <FileDown size={12} strokeWidth={1.7} />
                Download Optimization Plan
              </button>
              <button
                type="button"
                onClick={handleViewCart}
                className="inline-flex items-center gap-2 px-5 py-3 text-[11px] tracking-[0.10em] transition-all"
                style={{
                  background: 'transparent',
                  color: '#FAFAFA',
                  border: '1px solid rgba(196,167,137,0.30)',
                  borderRadius: 4,
                  fontFamily: 'Inter, sans-serif',
                  textTransform: 'uppercase',
                }}
                data-testid="autopilot-view-cart"
              >
                Review procurement cart
                <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
