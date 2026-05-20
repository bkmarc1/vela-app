import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Propul8 INVEST — Accordion section primitive.
// Wraps any deeper analysis section so it stays collapsed by default.
// Smooth expand reveal, premium minimal styling.

export default function AccordionSection({
  id,
  title,
  kicker,
  summary,
  defaultOpen = false,
  forceOpen,
  onToggle,
  children,
  testIdPrefix = 'invest-accordion',
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = forceOpen ?? internalOpen;

  const toggle = () => {
    if (forceOpen !== undefined) {
      // Parent controls — let it know
      onToggle?.(!open);
      return;
    }
    setInternalOpen((prev) => {
      const next = !prev;
      onToggle?.(next);
      return next;
    });
  };

  return (
    <section
      id={id}
      className="border-b"
      style={{ borderColor: 'var(--inv-border)', background: 'var(--inv-bg-deep, #FAFAFA)' }}
      data-testid={testIdPrefix ? `${testIdPrefix}-${id}` : id}
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        {/* Header — always visible, click to toggle */}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-4 py-6 lg:py-7 transition-colors"
          style={{
            color: 'var(--inv-text-primary)',
            cursor: 'pointer',
            background: 'transparent',
            border: 'none',
            textAlign: 'left',
          }}
          data-testid={testIdPrefix ? `${testIdPrefix}-${id}-toggle` : `${id}-toggle`}
        >
          <div className="flex-1 min-w-0">
            {kicker && (
              <span
                className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase"
                style={{ color: 'var(--inv-accent-bronze)' }}
              >
                {kicker}
              </span>
            )}
            <div
              className="inv-display font-medium mt-1.5 leading-snug"
              style={{
                fontSize: 'clamp(18px, 1.9vw, 22px)',
                color: 'var(--inv-text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </div>
            {summary && !open && (
              <div
                className="mt-1.5 text-[13px] leading-relaxed"
                style={{ color: 'var(--inv-text-muted)' }}
                data-testid={testIdPrefix ? `${testIdPrefix}-${id}-summary` : `${id}-summary`}
              >
                {summary}
              </div>
            )}
          </div>
          <ChevronDown
            size={18}
            strokeWidth={1.6}
            style={{
              color: 'var(--inv-text-muted)',
              transition: 'transform 300ms ease',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              flexShrink: 0,
            }}
          />
        </button>

        {/* Body — expandable */}
        {open && (
          <div
            className="pb-8 lg:pb-10 -mx-6 md:-mx-12 px-0 md:px-0"
            style={{ animation: 'inv-fade-in 320ms ease' }}
            data-testid={testIdPrefix ? `${testIdPrefix}-${id}-body` : `${id}-body`}
          >
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
