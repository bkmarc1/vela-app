import { useState } from 'react';
import { STATUS_THEME, STATUS_THEME_DARK } from '../../lib/dataProvenance';

// Propul8 — Data Status Badge.
// Tiny inline pill that renders next to every number in the dashboard.
// On hover, expands to show source + data quality + last checked.
//
// Premium label vocabulary (no "Confidence %"):
//   Status pill text  →  Verified · Calculated · Estimated from comps ·
//                        Not available · Needs input · Source blocked
//   Tooltip header    →  Data Quality · Strong / Medium / Limited
//   Tooltip subtitle  →  Source: <where it came from>
//   Tooltip footnote  →  Last checked <YYYY-MM-DD>
//
// Internally a numeric confidence still drives Strong/Medium/Limited buckets,
// but it is never exposed in product UI.

// Map our 6-status taxonomy → premium investor-grade copy.
const LABEL_FOR_STATUS = {
  'Confirmed':       'Verified',
  'Calculated':      'Calculated',
  'Estimated':       'Estimated from comps',
  'Not confirmed':   'Not available',
  'Needs input':     'Needs input',
  'Source blocked':  'Source blocked',
};

// Bucket numeric confidence (0–100) → Strong / Medium / Limited.
const _qualityBucket = (conf, status) => {
  if (status === 'Source blocked' || status === 'Not confirmed') return 'Limited';
  if (status === 'Needs input') return 'Limited';
  if (conf >= 80) return 'Strong';
  if (conf >= 55) return 'Medium';
  return 'Limited';
};

export default function DataBadge({ cell, theme = 'light', size = 'md', testId }) {
  const [hover, setHover] = useState(false);
  if (!cell) return null;

  const palette = theme === 'dark' ? STATUS_THEME_DARK : STATUS_THEME;
  const t = palette[cell.status] || palette['Not confirmed'];
  const label = (LABEL_FOR_STATUS[cell.status] || cell.status).toUpperCase();
  const quality = _qualityBucket(cell.confidence, cell.status);

  const isSm = size === 'sm';
  const dims = {
    pad: isSm ? '2px 6px' : '3px 8px',
    fs:  isSm ? 8.5      : 9.5,
    ls:  isSm ? '0.16em' : '0.18em',
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      data-testid={testId}
    >
      <span
        className="font-mono-tight uppercase whitespace-nowrap"
        style={{
          color: t.color,
          background: t.bg,
          border: `1px solid ${t.border}`,
          borderRadius: 1,
          padding: dims.pad,
          fontSize: dims.fs,
          letterSpacing: dims.ls,
          fontWeight: 500,
          cursor: 'help',
          lineHeight: 1.4,
        }}
        data-testid={testId ? `${testId}-pill` : undefined}
      >
        {label}
      </span>
      {hover && (
        <span
          className="absolute z-50 pointer-events-none"
          style={{
            top: 'calc(100% + 6px)',
            left: 0,
            minWidth: 220,
            padding: '9px 11px',
            background: theme === 'dark' ? '#FAFAFA' : '#FFFFFF',
            border: `1px solid ${t.border}`,
            borderRadius: 4,
            boxShadow: '0 14px 38px -10px rgba(0,0,0,0.30)',
          }}
        >
          <div
            className="font-mono-tight uppercase"
            style={{
              color: t.color,
              fontSize: 9,
              letterSpacing: '0.20em',
              marginBottom: 5,
            }}
          >
            Data Quality · {quality}
          </div>
          <div
            className="font-mono-tight"
            style={{
              color: theme === 'dark' ? '#B8956A' : '#52525B',
              fontSize: 10.5,
              lineHeight: 1.4,
            }}
          >
            Source: {cell.source}
          </div>
          <div
            className="font-mono-tight"
            style={{
              color: theme === 'dark' ? '#52525B' : '#52525B',
              fontSize: 10,
              marginTop: 3,
            }}
          >
            Last checked {cell.lastChecked}
          </div>
        </span>
      )}
    </span>
  );
}

// Convenience: renders the number + badge pair commonly used in metric tiles.
export function ValueWithBadge({ cell, format, fallback = '—', theme = 'light', size = 'md', testId }) {
  const display = cell && cell.value !== null && cell.value !== undefined
    ? (format ? format(cell.value) : String(cell.value))
    : fallback;
  return (
    <div className="inline-flex items-baseline gap-2.5" data-testid={testId}>
      <span className="tabular-nums" style={{ fontWeight: 500 }}>{display}</span>
      <DataBadge cell={cell} theme={theme} size={size} testId={testId ? `${testId}-badge` : undefined} />
    </div>
  );
}
