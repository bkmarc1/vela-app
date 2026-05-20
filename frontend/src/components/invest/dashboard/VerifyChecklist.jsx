import { useMemo, useState } from 'react';
import axios from 'axios';
import { Lock, Check, AlertTriangle, Shield, ArrowUpRight } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ──────────────────────────────────────────────────────────────────────────
// Propul8 INVEST — institutional verification step.
//
// Propul8 never calculates from unverified data. Critical fields (asking price,
// sqm, location, bedrooms) MUST be confirmed by the user before any analysis
// is shown. This component renders a Bloomberg-style underwriting checklist
// — clean, fast, premium — and gates the dashboard behind it.
// ──────────────────────────────────────────────────────────────────────────

const CRITICAL_FIELDS = ['asking_price_eur', 'm2', 'rooms', 'city'];

const FIELDS = [
  // [key, label, type, options?, critical, hint]
  { key: 'asking_price_eur', label: 'Asking Price (€)',  type: 'number', critical: true,  hint: 'From listing source' },
  { key: 'm2',               label: 'Property Size (m²)', type: 'number', critical: true,  hint: 'From listing source' },
  { key: 'city',             label: 'Location',           type: 'text',   critical: true,  hint: 'City / district' },
  { key: 'rooms',            label: 'Bedrooms',           type: 'number', critical: true,  hint: 'Bedrooms only' },
  { key: 'bathrooms',        label: 'Bathrooms',          type: 'number', critical: false, hint: 'Total count' },
  { key: 'floor',            label: 'Floor',              type: 'text',   critical: false, hint: '0 = ground' },
  { key: 'renovation_state', label: 'Condition',          type: 'select', critical: false, options: [
    { value: 'pristine',   label: 'Pristine — turnkey'           },
    { value: 'refresh',    label: 'Refresh — light upgrade'      },
    { value: 'renovation', label: 'Renovation — moderate scope'  },
    { value: 'gut',        label: 'Gut — full scope'             },
  ] },
  { key: 'property_type',    label: 'Property Type',      type: 'select', critical: false, options: [
    'Apartment', 'Loft', 'Studio', 'Villa', 'Townhouse', 'Penthouse',
  ].map((v) => ({ value: v, label: v })) },
  { key: 'parking',          label: 'Parking',            type: 'select', critical: false, options: [
    { value: 'true',  label: 'Yes' },
    { value: 'false', label: 'No'  },
    { value: '',      label: '—'   },
  ] },
  { key: 'energy_class',     label: 'Energy Class',       type: 'text',   critical: false, hint: 'A+ – G' },
  { key: 'listing_source',   label: 'Listing Source',     type: 'text',   critical: false, readOnly: true },
  { key: 'url',              label: 'Listing URL',        type: 'text',   critical: false, readOnly: true },
];

const BADGE = {
  verified:      { label: 'Verified from listing', color: '#B8956A', icon: Shield,       bg: 'rgba(125,191,143,0.10)', border: 'rgba(125,191,143,0.25)' },
  user_verified: { label: 'User Verified',         color: '#B8956A', icon: Check,        bg: 'rgba(125,191,143,0.14)', border: 'rgba(125,191,143,0.30)' },
  needs_review:  { label: 'Estimated by Propul8',     color: '#B8956A', icon: AlertTriangle, bg: 'rgba(196,167,137,0.10)', border: 'rgba(196,167,137,0.30)' },
  missing:       { label: 'Not found',             color: '#B8956A', icon: Lock,         bg: 'rgba(201,122,106,0.10)', border: 'rgba(201,122,106,0.28)' },
};

export default function VerifyChecklist({ draft, draftId, onVerified }) {
  // Working copy — user edits update this state immediately, persisted on Confirm.
  const [working, setWorking] = useState(() => ({ ...draft }));
  const [confidence, setConfidence] = useState(() => ({ ...(draft._confidence || {}) }));
  const [saving, setSaving] = useState(false);

  const upd = (key, value) => {
    setWorking((w) => ({ ...w, [key]: value }));
    setConfidence((c) => ({ ...c, [key]: 'user_verified' }));
  };

  const criticalReady = useMemo(
    () => CRITICAL_FIELDS.every((k) => {
      const v = working[k];
      const has = v !== null && v !== undefined && v !== '' && v !== 0;
      const conf = confidence[k];
      return has && (conf === 'verified' || conf === 'user_verified');
    }),
    [working, confidence],
  );

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const payload = {};
      for (const f of FIELDS) {
        // Only send fields the user has touched (confidence === user_verified)
        // OR the previously verified fields. Skip purely missing fields.
        if (confidence[f.key] === 'user_verified' || confidence[f.key] === 'verified') {
          let v = working[f.key];
          if (f.key === 'parking' && typeof v === 'string') {
            v = v === 'true' ? true : v === 'false' ? false : null;
          }
          if (f.type === 'number' && typeof v === 'string') {
            v = Number(v) || null;
          }
          payload[f.key] = v;
        }
      }
      await axios.put(`${API}/invest/draft/${draftId}`, payload);
      onVerified({ ...working, _confidence: confidence });
    } catch (e) {
      // Even if the API write fails (e.g. demo route), continue with local
      // verification so the user is never blocked.
      onVerified({ ...working, _confidence: confidence });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="invest-verify-checklist">
      {/* Header */}
      <section className="border-b" style={{ borderColor: 'var(--inv-border)' }}>
        <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-16">
          <span className="inv-kicker-bronze">Step 1 of 2 · Listing Verification</span>
          <h1
            className="inv-display text-3xl md:text-5xl font-medium mt-4 leading-[1.04]"
            data-testid="verify-title"
          >
            Confirm listing data.<br />
            <span style={{ color: 'var(--inv-accent-bronze)' }}>
              Then Propul8 calculates.
            </span>
          </h1>
          <p
            className="mt-4 max-w-[560px] text-sm leading-relaxed"
            style={{ color: 'var(--inv-text-secondary)' }}
          >
            Propul8 does not calculate from unverified data.
            Confirm the four critical fields below to unlock investment analysis.
          </p>
        </div>
      </section>

      {/* Checklist */}
      <section className="border-b" style={{ borderColor: 'var(--inv-border)' }}>
        <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-12">
          <div className="grid md:grid-cols-2 gap-px" style={{ background: 'var(--inv-border)' }}>
            {FIELDS.map((f) => (
              <FieldRow
                key={f.key}
                f={f}
                value={working[f.key]}
                confidence={confidence[f.key]}
                onChange={(v) => upd(f.key, v)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Action footer */}
      <section style={{ background: 'var(--inv-bg-deep)' }}>
        <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-12 flex items-center justify-between flex-wrap gap-6">
          <div>
            <div className="inv-kicker">
              {criticalReady ? 'All critical fields verified' : 'Verify the 4 critical fields to continue'}
            </div>
            <div
              className="mt-2 text-[12px] font-mono-tight"
              style={{ color: criticalReady ? 'var(--inv-signal-up)' : 'var(--inv-text-muted)' }}
            >
              {CRITICAL_FIELDS.filter((k) => {
                const v = working[k];
                const has = v !== null && v !== undefined && v !== '' && v !== 0;
                const c = confidence[k];
                return has && (c === 'verified' || c === 'user_verified');
              }).length}/4 verified · price · m² · location · bedrooms
            </div>
          </div>
          <button
            onClick={handleConfirm}
            disabled={!criticalReady || saving}
            className="inv-btn"
            data-testid="verify-confirm-btn"
            style={{
              opacity: criticalReady ? 1 : 0.4,
              cursor:  criticalReady ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Saving…' : 'Confirm & Generate Investment Analysis'}
            <ArrowUpRight size={13} />
          </button>
        </div>
      </section>
    </div>
  );
}

function FieldRow({ f, value, confidence, onChange }) {
  const conf = BADGE[confidence] || BADGE.missing;
  const Icon = conf.icon;
  const isReadOnly = f.readOnly;
  const renderInput = () => {
    if (isReadOnly) {
      return (
        <span
          className="inv-num text-[14px] block truncate"
          style={{ color: 'var(--inv-text-secondary)' }}
        >
          {String(value || '—')}
        </span>
      );
    }
    if (f.type === 'select') {
      const v = value === true ? 'true' : value === false ? 'false' : (value || '');
      return (
        <select
          value={v}
          onChange={(e) => onChange(e.target.value)}
          className="inv-input"
          data-testid={`verify-input-${f.key}`}
        >
          <option value="">— Select —</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }
    return (
      <input
        type={f.type}
        value={value ?? ''}
        onChange={(e) => onChange(f.type === 'number' ? (Number(e.target.value) || '') : e.target.value)}
        placeholder={f.hint || ''}
        className="inv-input"
        data-testid={`verify-input-${f.key}`}
      />
    );
  };

  return (
    <div
      className="p-6"
      style={{ background: 'var(--inv-bg-surface)' }}
      data-testid={`verify-row-${f.key}`}
    >
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <span className="inv-kicker">
          {f.label}
          {f.critical && (
            <span
              className="ml-2 font-mono-tight text-[8.5px] tracking-[0.16em]"
              style={{ color: 'var(--inv-accent-bronze)' }}
            >
              · CRITICAL
            </span>
          )}
        </span>
        <span
          className="inv-pill flex items-center gap-1.5"
          style={{
            background: conf.bg,
            border: `1px solid ${conf.border}`,
            color: conf.color,
          }}
          data-testid={`verify-badge-${f.key}`}
        >
          <Icon size={9} strokeWidth={1.8} />
          {conf.label}
        </span>
      </div>
      {renderInput()}
      {f.hint && !isReadOnly && (
        <div className="mt-2 font-mono-tight text-[10px]" style={{ color: 'var(--inv-text-muted)' }}>
          {f.hint}
        </div>
      )}
    </div>
  );
}
