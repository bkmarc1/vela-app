import { ArrowUpRight, MessageSquare, FileText, Bell } from 'lucide-react';

// Propul8 INVEST — What To Do Next™.
// Explicit numerical instructions. Verdict-tilted CTAs.
// "Never just analyze — always tell the user what to do."

export default function WhatToDoNext({ next, verdict }) {
  if (!next) return null;
  const isProceed = verdict === 'PROCEED' || verdict === 'BUY';
  const isWatchlist = verdict === 'WATCHLIST' || verdict === 'NEGOTIATE';
  const isPass = verdict === 'PASS';

  return (
    <section
      className="border-b"
      style={{ borderColor: 'var(--inv-border)', background: 'var(--inv-bg-deep, #FAFAFA)' }}
      data-testid="invest-section-next"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-14 lg:py-16">
        {/* Heading */}
        <div className="mb-10">
          <span className="inv-kicker-bronze">What To Do Next™</span>
          <h2
            className="inv-display font-medium mt-3 leading-[1.04]"
            style={{
              fontSize: 'clamp(28px, 3.4vw, 44px)',
              color: 'var(--inv-text-primary)',
              letterSpacing: '-0.015em',
            }}
            data-testid="invest-next-heading"
          >
            The exact next move.
          </h2>
        </div>

        {/* Primary instruction + walkaway */}
        <div
          className="p-8 lg:p-10 mb-10"
          style={{
            background: 'rgba(196,167,137,0.06)',
            borderLeft: '2px solid var(--inv-accent-bronze)',
          }}
          data-testid="invest-next-primary-card"
        >
          <div className="grid lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-7">
              <div className="inv-kicker">Primary instruction</div>
              <div
                className="inv-display font-medium mt-3 leading-[1.04] tabular-nums"
                style={{
                  fontSize: 'clamp(28px, 3.6vw, 48px)',
                  color: 'var(--inv-accent-bronze)',
                  letterSpacing: '-0.02em',
                }}
                data-testid="invest-next-primary-instruction"
              >
                {next.primary_instruction}
              </div>
              {next.walkaway_ceiling && (
                <div
                  className="mt-4 font-mono-tight text-[13px]"
                  style={{ color: 'var(--inv-signal-down)' }}
                  data-testid="invest-next-walkaway"
                >
                  {next.walkaway_ceiling}
                </div>
              )}
            </div>
            <div className="lg:col-span-5">
              <div className="flex flex-wrap gap-3">
                {isProceed && (
                  <>
                    <NextCTA testId="invest-next-cta-agent-msg"  icon={MessageSquare} label="Generate agent message" />
                    <NextCTA testId="invest-next-cta-memo"       icon={FileText}      label="Build investment memo" />
                  </>
                )}
                {isWatchlist && (
                  <>
                    <NextCTA testId="invest-next-cta-alert"      icon={Bell}          label="Create acquisition alert" />
                    <NextCTA testId="invest-next-cta-memo"       icon={FileText}      label="Save monitoring memo" />
                  </>
                )}
                {isPass && (
                  <>
                    <NextCTA testId="invest-next-cta-find-better" icon={ArrowUpRight} label="Find better deals" />
                    <NextCTA testId="invest-next-cta-alert"       icon={Bell}         label="Create acquisition alert" />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Two columns — agent questions + due diligence */}
        <div className="grid md:grid-cols-2 gap-px" style={{ background: 'var(--inv-border)' }}>
          {/* Agent questions */}
          <div
            className="p-8"
            style={{ background: 'var(--inv-bg-surface, #FAFAFA)' }}
            data-testid="invest-next-agent-questions"
          >
            <div className="inv-kicker mb-4">Ask the agent</div>
            <ul className="space-y-3">
              {next.agent_questions.map((q, i) => (
                <li
                  key={q}
                  className="flex items-baseline gap-3 text-[13.5px] leading-relaxed"
                  style={{ color: 'var(--inv-text-secondary)' }}
                  data-testid={`invest-next-agent-q-${i}`}
                >
                  <span
                    className="font-mono-tight text-[10px] tabular-nums"
                    style={{ color: 'var(--inv-accent-bronze)', minWidth: 22 }}
                  >
                    Q{i + 1}
                  </span>
                  {q}
                </li>
              ))}
            </ul>
          </div>

          {/* Due diligence */}
          <div
            className="p-8"
            style={{ background: 'var(--inv-bg-surface, #FAFAFA)' }}
            data-testid="invest-next-due-diligence"
          >
            <div className="inv-kicker mb-4">Due diligence checklist</div>
            <ul className="space-y-3">
              {next.due_diligence.map((d, i) => (
                <li
                  key={d}
                  className="flex items-baseline gap-3 text-[13.5px] leading-relaxed"
                  style={{ color: 'var(--inv-text-secondary)' }}
                  data-testid={`invest-next-dd-${i}`}
                >
                  <span
                    className="w-1.5 h-1.5 mt-1.5 flex-shrink-0"
                    style={{ background: 'var(--inv-accent-bronze)' }}
                  />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function NextCTA({ icon: Icon, label, testId }) {
  return (
    <button
      onClick={() => {/* placeholder — wired in next sprint */}}
      className="inline-flex items-center gap-2 px-4 py-3 text-[10.5px] tracking-[0.10em] transition-all"
      style={{
        background: 'transparent',
        color: 'var(--inv-text-primary)',
        border: '1px solid rgba(196,167,137,0.30)',
        borderRadius: 4,
        fontFamily: 'Inter, sans-serif',
        textTransform: 'uppercase',
      }}
      data-testid={testId}
    >
      <Icon size={12} strokeWidth={1.6} />
      {label}
    </button>
  );
}
