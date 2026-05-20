import { useMemo, useState } from 'react';
import { ArrowRight, ShieldCheck, AlertTriangle, Pencil, Lock } from 'lucide-react';
import DataBadge from './DataBadge';
import {
  buildInvestProvenance, buildOperateProvenance,
  missingCriticalFields, CRITICAL_FIELDS,
} from '../../lib/dataProvenance';

// Propul8 — Confirm Property Data interstitial.
// Mandatory verification gate between extraction and analysis.
//
// Purpose: Propul8 never calculates from unverified data. The user MUST verify or
// edit every critical field (price, sqm, beds, city) before the cinematic
// "thinking" stage runs. Soft fields (year built, condition, etc.) display a
// status and can be left as-is.
//
// Props:
//   input     — scraped/raw input object (must include _confidence map)
//   mode      — 'invest' | 'operate' — chooses provenance + shell
//   onConfirm — callback(updatedInput) when user clicks Confirm & Analyze
//   onBack    — back to landing
//   theme     — 'dark' (invest) | 'light' (operate)

const INVEST_ROWS = [
  { key: 'asking_price_eur', label: 'Asking price',     type: 'number',   prefix: '€',     required: true },
  { key: 'm2',               label: 'Surface area',     type: 'number',   suffix: 'm²',    required: true },
  { key: 'rooms',            label: 'Bedrooms',          type: 'number',   suffix: '',      required: true },
  { key: 'bathrooms',        label: 'Bathrooms',         type: 'number',   suffix: '',      required: false },
  { key: 'city',             label: 'City',              type: 'text',                    required: true },
  { key: 'neighborhood',     label: 'Neighborhood',      type: 'text',                    required: false },
  { key: 'property_type',    label: 'Property type',     type: 'select',
    options: ['Apartment', 'Villa', 'House', 'Loft', 'Studio', 'Penthouse'], required: false },
  { key: 'year_built',       label: 'Year built',        type: 'number',                  required: false },
  { key: 'renovation_state', label: 'Condition',         type: 'select',
    options: ['pristine', 'refresh', 'renovation', 'gut'], required: false },
  { key: 'floor',            label: 'Floor',             type: 'text',                    required: false },
  { key: 'energy_class',     label: 'Energy class',      type: 'text',                    required: false },
  { key: 'pool',             label: 'Pool',              type: 'tristate', required: false },
  { key: 'garden',           label: 'Garden',            type: 'tristate', required: false },
  { key: 'distance_to_sea_m',label: 'Distance to sea (m)', type: 'number', suffix: 'm',   required: false },
];

const OPERATE_ROWS = [
  { key: 'title',             label: 'Listing title',      type: 'text',   required: true },
  { key: 'city',              label: 'City',               type: 'text',   required: true },
  { key: 'property_type',     label: 'Property type',      type: 'select',
    options: ['Apartment', 'Villa', 'House', 'Loft', 'Studio', 'Penthouse'], required: false },
  { key: 'bedrooms',          label: 'Bedrooms',           type: 'number', required: true },
  { key: 'bathrooms',         label: 'Bathrooms',          type: 'number', required: false },
  { key: 'm2',                label: 'Surface area (m²)',  type: 'number', suffix: 'm²', required: false },
  { key: 'current_adr',       label: 'Current ADR (€/night)', type: 'number', prefix: '€', required: false },
  { key: 'current_occupancy', label: 'Current occupancy %', type: 'number', suffix: '%',  required: false },
  { key: 'year_built',        label: 'Year built',         type: 'number', required: false },
  { key: 'renovation_state',  label: 'Condition',          type: 'select',
    options: ['pristine', 'refresh', 'renovation', 'gut'], required: false },
  { key: 'pool',              label: 'Pool',               type: 'tristate', required: false },
  { key: 'garden',            label: 'Garden',             type: 'tristate', required: false },
];

export default function ConfirmPropertyData({ input, mode = 'invest', onConfirm, onBack, theme }) {
  const t = theme || (mode === 'invest' ? 'dark' : 'light');
  const rows = mode === 'invest' ? INVEST_ROWS : OPERATE_ROWS;
  const criticalKeys = mode === 'invest'
    ? CRITICAL_FIELDS
    : ['title', 'city', 'bedrooms'];

  // Local editable state
  const [draft, setDraft] = useState(() => ({ ...input }));
  const [debugOpen, setDebugOpen] = useState(false);

  // Re-compute provenance whenever the user edits a field; user-edited fields
  // are marked as user_verified.
  const provenance = useMemo(() => {
    if (mode === 'invest') return buildInvestProvenance(draft);
    return buildOperateProvenance(draft);
  }, [draft, mode]);

  const missing = missingCriticalFields(provenance, criticalKeys);
  const canProceed = missing.length === 0;

  const updateField = (key, value) => {
    setDraft((prev) => {
      const c = { ...(prev._confidence || {}) };
      const hadValue = prev[key] !== null && prev[key] !== undefined && prev[key] !== '';
      const valueChanged = String(value || '') !== String(prev[key] || '');
      if (valueChanged || !hadValue) c[key] = 'user_verified';
      return { ...prev, [key]: value, _confidence: c };
    });
  };

  const handleConfirm = () => {
    if (!canProceed) return;
    // Coerce numeric strings → numbers for the analysis engine.
    const coerced = { ...draft };
    rows.forEach((r) => {
      if (r.type === 'number' && coerced[r.key] !== null && coerced[r.key] !== undefined && coerced[r.key] !== '') {
        const n = Number(coerced[r.key]);
        coerced[r.key] = Number.isNaN(n) ? null : n;
      }
    });
    onConfirm(coerced);
  };

  // Shell colors
  const BG    = t === 'dark' ? '#FAFAFA' : '#FFFFFF';
  const PANEL = t === 'dark' ? 'rgba(196,167,137,0.04)' : '#FAFAFA';
  const BORDER= t === 'dark' ? 'rgba(196,167,137,0.18)' : 'rgba(9,9,11,0.10)';
  const TEXT  = t === 'dark' ? '#FAFAFA' : '#09090B';
  const TEXT_2= t === 'dark' ? '#B8956A' : '#52525B';
  const TEXT_M= t === 'dark' ? '#52525B' : '#52525B';
  const ACCENT= t === 'dark' ? '#B8956A' : '#B8956A';
  const CTA_BG= t === 'dark' ? '#B8956A' : '#B8956A';
  const CTA_TX= t === 'dark' ? '#FAFAFA' : '#FAFAFA';

  return (
    <div
      className="min-h-screen"
      style={{ background: BG, color: TEXT }}
      data-testid="confirm-data-screen"
    >
      <div className="max-w-[1080px] mx-auto px-6 md:px-12 py-12 lg:py-20">
        {/* Header */}
        <div className="mb-10">
          <span
            className="font-mono-tight text-[10px] tracking-[0.24em] uppercase"
            style={{ color: ACCENT }}
            data-testid="confirm-kicker"
          >
            Step 1 of 2 · Confirm Property Data
          </span>
          <h1
            className="font-display font-medium mt-3 leading-[1.04]"
            style={{ fontSize: 'clamp(32px, 4.2vw, 52px)', letterSpacing: '-0.02em', color: TEXT }}
            data-testid="confirm-title"
          >
            Verify what we read.
          </h1>
          <p
            className="mt-4 text-[14.5px] leading-relaxed max-w-[640px]"
            style={{ color: TEXT_2 }}
            data-testid="confirm-subtitle"
          >
            Propul8 never calculates from unverified data. Confirm or edit each field. Critical
            fields must be filled before we compute the verdict.
          </p>
        </div>

        {/* Image preview — surfaces the main listing image so the user can
            quickly verify Propul8 is reading the right asset. */}
        {(() => {
          const img = (draft.images || [])[0] || null;
          return (
            <div className="mb-10" data-testid="confirm-image-preview">
              <div
                className="aspect-[16/7] w-full overflow-hidden flex items-center justify-center"
                style={{
                  background: PANEL,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 4,
                }}
              >
                {img ? (
                  <img
                    src={img}
                    alt={draft.title || 'Listing'}
                    className="w-full h-full object-cover"
                    data-testid="confirm-image"
                  />
                ) : (
                  <span
                    className="font-mono-tight uppercase"
                    style={{ color: TEXT_M, fontSize: 10.5, letterSpacing: '0.20em' }}
                    data-testid="confirm-image-fallback"
                  >
                    Image not available
                  </span>
                )}
              </div>
              {draft.url && (
                <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                  <span
                    className="font-mono-tight text-[10.5px] truncate"
                    style={{ color: TEXT_M }}
                  >
                    {draft.url}
                  </span>
                  <span
                    className="font-mono-tight uppercase"
                    style={{ color: ACCENT, fontSize: 10, letterSpacing: '0.18em' }}
                  >
                    {draft.listing_source ? `Source · ${draft.listing_source}` : ''}
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Summary strip */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-px mb-10"
          style={{ background: BORDER }}
        >
          {[
            { label: 'Fields confirmed', value: Object.values(provenance).filter(c => c.status === 'Confirmed').length },
            { label: 'Estimated',         value: Object.values(provenance).filter(c => c.status === 'Estimated').length },
            { label: 'Not confirmed',     value: Object.values(provenance).filter(c => c.status === 'Not confirmed').length },
            { label: 'Critical missing',  value: missing.length },
          ].map((m) => (
            <div key={m.label} className="p-5" style={{ background: PANEL }} data-testid={`confirm-summary-${m.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <div
                className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase"
                style={{ color: TEXT_M }}
              >
                {m.label}
              </div>
              <div
                className="font-mono-tight font-medium mt-2 tabular-nums"
                style={{ fontSize: 28, color: m.label === 'Critical missing' && m.value > 0 ? '#B8956A' : TEXT, lineHeight: 1 }}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Editable table */}
        <div
          style={{
            background: PANEL,
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
          }}
          data-testid="confirm-fields-table"
        >
          {rows.map((row, i) => {
            const cell = provenance[row.key] || { status: 'Not confirmed', confidence: 0, source: '—' };
            const isMissing = row.required && cell.status === 'Not confirmed';
            return (
              <div
                key={row.key}
                className="grid grid-cols-12 gap-3 px-5 py-4 items-center"
                style={{ borderTop: i === 0 ? 'none' : `1px solid ${BORDER}` }}
                data-testid={`confirm-row-${row.key}`}
              >
                <div className="col-span-12 md:col-span-4">
                  <div
                    className="text-[13px]"
                    style={{ color: TEXT, fontWeight: 500 }}
                  >
                    {row.label}
                    {row.required && (
                      <span style={{ color: '#B8956A', marginLeft: 6, fontSize: 12 }}>*</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <DataBadge
                      cell={isMissing ? { ...cell, status: 'Needs input', confidence: 0, source: 'Required field' } : cell}
                      theme={t}
                      size="sm"
                      testId={`confirm-badge-${row.key}`}
                    />
                    <span
                      className="font-mono-tight"
                      style={{ color: TEXT_M, fontSize: 10, letterSpacing: '0.10em' }}
                      data-testid={`confirm-source-${row.key}`}
                    >
                      {cell.confidence > 0 ? `Source: ${cell.source}` : 'Not available from listing'}
                    </span>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-8">
                  {row.type === 'select' ? (
                    <select
                      value={draft[row.key] || ''}
                      onChange={(e) => updateField(row.key, e.target.value)}
                      className="w-full px-4 py-2.5 text-[13.5px] outline-none"
                      style={{
                        background: t === 'dark' ? '#FAFAFA' : '#FFFFFF',
                        color: TEXT,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 4,
                        fontFamily: 'inherit',
                      }}
                      data-testid={`confirm-input-${row.key}`}
                    >
                      <option value="">Select…</option>
                      {row.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : row.type === 'tristate' ? (
                    <div className="flex items-center gap-1.5" data-testid={`confirm-input-${row.key}`}>
                      {[
                        { v: true,  l: 'Yes' },
                        { v: false, l: 'No' },
                        { v: null,  l: 'Not sure' },
                      ].map((opt) => {
                        const sel = draft[row.key] === opt.v;
                        return (
                          <button
                            key={String(opt.l)}
                            type="button"
                            onClick={() => updateField(row.key, opt.v)}
                            className="px-3 py-2 text-[11.5px] tracking-[0.06em]"
                            style={{
                              background: sel ? (t === 'dark' ? '#B8956A' : '#09090B') : 'transparent',
                              color: sel ? (t === 'dark' ? '#FAFAFA' : '#FAFAFA') : TEXT_2,
                              border: `1px solid ${sel ? 'transparent' : BORDER}`,
                              borderRadius: 4,
                              fontFamily: 'Inter, sans-serif',
                              cursor: 'pointer',
                            }}
                            data-testid={`confirm-input-${row.key}-${opt.l.replace(/\s+/g, '-').toLowerCase()}`}
                          >
                            {opt.l}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {row.prefix && <span style={{ color: TEXT_M, fontSize: 13 }}>{row.prefix}</span>}
                      <input
                        type={row.type === 'number' ? 'number' : 'text'}
                        value={draft[row.key] ?? ''}
                        onChange={(e) => updateField(row.key, row.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
                        placeholder={row.required ? 'Required — enter value' : 'Optional'}
                        className="flex-1 px-4 py-2.5 text-[13.5px] outline-none"
                        style={{
                          background: t === 'dark' ? '#FAFAFA' : '#FFFFFF',
                          color: TEXT,
                          border: `1px solid ${isMissing ? '#B8956A' : BORDER}`,
                          borderRadius: 4,
                          fontFamily: row.type === 'number' ? 'Inter, sans-serif' : 'inherit',
                        }}
                        data-testid={`confirm-input-${row.key}`}
                      />
                      {row.suffix && <span style={{ color: TEXT_M, fontSize: 13 }}>{row.suffix}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Extraction debug (developer panel) */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setDebugOpen((v) => !v)}
            className="text-[10.5px] tracking-[0.18em] uppercase"
            style={{
              color: TEXT_M,
              background: 'transparent',
              border: 'none',
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer',
            }}
            data-testid="confirm-debug-toggle"
          >
            {debugOpen ? '— Hide extraction debug' : '+ Show extraction debug'}
          </button>
          {debugOpen && (
            <pre
              className="mt-3 p-4 text-[11px] leading-relaxed overflow-auto"
              style={{
                background: t === 'dark' ? '#FAFAFA' : '#FFFFFF',
                color: TEXT_2,
                border: `1px solid ${BORDER}`,
                borderRadius: 4,
                fontFamily: 'Inter, sans-serif',
                maxHeight: 360,
              }}
              data-testid="confirm-debug-panel"
            >
{JSON.stringify({
  listing_source: draft.listing_source || null,
  url: draft.url || null,
  bot_blocked: draft.bot_blocked || false,
  extraction_debug: draft.extraction_debug || null,
  confidence: draft._confidence || {},
  raw_excerpt: (draft.raw_excerpt || '').slice(0, 600),
  provenance: Object.fromEntries(
    Object.entries(provenance).map(([k, v]) => [k, { status: v.status, confidence: v.confidence, source: v.source, value: v.value }]),
  ),
}, null, 2)}
            </pre>
          )}
        </div>

        {/* Footer CTAs */}
        <div className="mt-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {missing.length > 0 ? (
              <div
                className="inline-flex items-center gap-2.5 px-4 py-2.5"
                style={{
                  background: 'rgba(160,82,74,0.08)',
                  border: '1px solid rgba(160,82,74,0.30)',
                  color: '#B8956A',
                  borderRadius: 4,
                }}
                data-testid="confirm-missing-warning"
              >
                <AlertTriangle size={13} strokeWidth={1.6} />
                <span
                  className="font-mono-tight text-[10.5px] tracking-[0.14em] uppercase"
                >
                  Fill {missing.length} critical {missing.length === 1 ? 'field' : 'fields'} to continue
                </span>
              </div>
            ) : (
              <div
                className="inline-flex items-center gap-2.5 px-4 py-2.5"
                style={{
                  background: t === 'dark' ? 'rgba(125,191,143,0.08)' : 'rgba(92,122,78,0.10)',
                  border: t === 'dark' ? '1px solid rgba(125,191,143,0.32)' : '1px solid rgba(92,122,78,0.30)',
                  color: t === 'dark' ? '#B8956A' : '#B8956A',
                  borderRadius: 4,
                }}
                data-testid="confirm-ready-badge"
              >
                <ShieldCheck size={13} strokeWidth={1.6} />
                <span
                  className="font-mono-tight text-[10.5px] tracking-[0.14em] uppercase"
                >
                  All critical fields confirmed · ready to analyze
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-3 text-[11px] tracking-[0.12em] uppercase"
              style={{
                background: 'transparent', color: TEXT_2,
                border: `1px solid ${BORDER}`,
                borderRadius: 4,
                fontFamily: 'Inter, sans-serif',
                cursor: 'pointer',
              }}
              data-testid="confirm-back-btn"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canProceed}
              className="inline-flex items-center gap-2.5 px-6 py-3 text-[11px] tracking-[0.12em] uppercase transition-all"
              style={{
                background: canProceed ? CTA_BG : 'rgba(156,143,119,0.30)',
                color: canProceed ? CTA_TX : TEXT_M,
                border: 'none', borderRadius: 4,
                fontFamily: 'Inter, sans-serif',
                cursor: canProceed ? 'pointer' : 'not-allowed',
                opacity: canProceed ? 1 : 0.7,
              }}
              data-testid="confirm-analyze-btn"
            >
              {canProceed ? <ShieldCheck size={13} strokeWidth={1.7} /> : <Lock size={13} strokeWidth={1.7} />}
              Confirm & Analyze
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
