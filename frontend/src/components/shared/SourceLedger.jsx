// Propul8 · Source Ledger v2 — per-field provenance + Lock toggle.
//
// Renders an itemised ledger of every field Propul8 tracks for a single
// listing. For each field the user can see:
//   • the value
//   • the status (Confirmed / Calculated / Estimated / Needs input …)
//   • the source label (e.g. "Airbnb JSON-LD", "User verified")
//   • a Lock toggle — locked values are persisted to the backend and
//     treated as ground truth on subsequent re-ingestions.
//
// Reusable across both INVEST and OPERATE modes by passing a different
// provenance map.

import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Lock, Unlock, Check } from 'lucide-react';
import { toast } from 'sonner';
import { STATUS_THEME } from '../../lib/dataProvenance';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FIELD_ORDER = [
  'title', 'listing_source',
  'city', 'neighborhood',
  'property_type', 'rooms', 'bedrooms', 'bathrooms',
  'm2', 'year_built', 'renovation_state',
  'asking_price_eur', 'price_per_sqm_eur',
  'current_adr', 'current_occupancy',
  'floor', 'energy_class', 'parking',
];

function formatValue(cell) {
  if (cell.value === null || cell.value === undefined || cell.value === '') return '—';
  if (typeof cell.value === 'number') {
    if (cell.unit === 'EUR') return `€${Math.round(cell.value).toLocaleString('en-US')}`;
    if (cell.unit === '€/m²') return `€${Math.round(cell.value).toLocaleString('en-US')}/m²`;
    if (cell.unit === '%') return `${cell.value}%`;
    if (cell.unit === 'm²') return `${cell.value} m²`;
    if (cell.unit === 'EUR/night') return `€${Math.round(cell.value)}/night`;
    return cell.value.toLocaleString('en-US');
  }
  if (typeof cell.value === 'boolean') return cell.value ? 'Yes' : 'No';
  return String(cell.value);
}

export default function SourceLedger({ provenance, asset_id }) {
  const [locks, setLocks] = useState({});       // {field: {value, locked_at}}
  const [busy, setBusy] = useState({});         // {field: true} during req
  const [loaded, setLoaded] = useState(false);

  // Hydrate from backend on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await axios.get(`${API}/sources/${encodeURIComponent(asset_id || 'demo')}`);
        if (cancelled) return;
        const map = {};
        for (const l of (r.data?.locks || [])) {
          map[l.field] = { value: l.value, locked_at: l.locked_at };
        }
        setLocks(map);
      } catch {
        // graceful — empty locks
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [asset_id]);

  const orderedKeys = useMemo(
    () => FIELD_ORDER.filter((k) => provenance[k]).concat(
      Object.keys(provenance).filter((k) => !FIELD_ORDER.includes(k)),
    ),
    [provenance],
  );

  const toggleLock = async (field, cell) => {
    if (busy[field]) return;
    const isLocked = !!locks[field];
    setBusy((b) => ({ ...b, [field]: true }));
    try {
      if (isLocked) {
        await axios.post(`${API}/sources/${encodeURIComponent(asset_id || 'demo')}/unlock`, { field });
        setLocks((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
        toast.success(`Unlocked · ${cell.label || field}`);
      } else {
        const r = await axios.post(`${API}/sources/${encodeURIComponent(asset_id || 'demo')}/lock`, {
          field,
          value: cell.value,
          locked_by: 'demo',
        });
        setLocks((prev) => ({ ...prev, [field]: { value: r.data.value, locked_at: r.data.locked_at } }));
        toast.success(`Locked · ${cell.label || field} as ground truth`);
      }
    } catch (e) {
      toast.error('Lock action failed — try again');
    } finally {
      setBusy((b) => ({ ...b, [field]: false }));
    }
  };

  return (
    <div data-testid="source-ledger" style={{ background: '#FFFFFF' }}>
      {/* Header */}
      <div
        className="px-6 py-5 border-b flex items-center justify-between flex-wrap gap-3"
        style={{ borderColor: '#E4E4E7' }}
      >
        <div>
          <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#B8956A' }}>
            Source Ledger · v2
          </span>
          <h3 className="mt-2 font-display" style={{ color: '#09090B', fontSize: 20, fontWeight: 500, letterSpacing: '-0.015em' }}>
            Every field. Every source. Locked when you say so.
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge>
            {Object.keys(locks).length} locked
          </Badge>
          <Badge muted>
            {Object.values(provenance).filter((c) => c.status === 'Confirmed').length} confirmed
          </Badge>
        </div>
      </div>

      {/* Column headers */}
      <div
        className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 font-mono-tight text-[9.5px] tracking-[0.22em] uppercase border-b"
        style={{ color: '#52525B', borderColor: '#E4E4E7', background: '#FAFAFA' }}
      >
        <div className="col-span-3">Field</div>
        <div className="col-span-3">Value</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-3">Source</div>
        <div className="col-span-1 text-right">Lock</div>
      </div>

      {/* Rows */}
      <ul role="list" className="divide-y" style={{ borderColor: '#E4E4E7' }}>
        {orderedKeys.map((key) => {
          const cell = provenance[key];
          const isLocked = !!locks[key];
          const theme = STATUS_THEME[cell.status] || STATUS_THEME.Estimated;
          return (
            <li
              key={key}
              className="grid grid-cols-2 md:grid-cols-12 gap-4 px-6 py-4 items-center"
              style={{ borderColor: '#E4E4E7' }}
              data-testid={`source-row-${key}`}
            >
              <div className="md:col-span-3 text-[13.5px]" style={{ color: '#09090B' }}>
                {cell.label || key}
              </div>
              <div
                className="md:col-span-3 text-[13.5px] tabular-nums font-display"
                style={{ color: cell.value === null ? '#52525B' : '#09090B', fontWeight: 500 }}
              >
                {formatValue(cell)}
              </div>
              <div className="md:col-span-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10.5px] tracking-[0.06em] font-mono-tight"
                  style={{
                    background: theme.bg,
                    color: theme.color,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 999,
                    fontWeight: 500,
                  }}
                >
                  {isLocked && <Check size={9} strokeWidth={2.2} />}
                  {isLocked ? 'Locked' : cell.status}
                </span>
              </div>
              <div className="md:col-span-3 text-[12px] truncate" style={{ color: '#52525B' }}>
                {isLocked ? (
                  <span>User locked · {new Date(locks[key].locked_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                ) : (
                  <span>{cell.source}</span>
                )}
              </div>
              <div className="md:col-span-1 flex justify-end">
                <button
                  onClick={() => toggleLock(key, cell)}
                  disabled={busy[key] || cell.value === null}
                  data-testid={`source-lock-btn-${key}`}
                  className="inline-flex items-center justify-center w-9 h-9 transition-all"
                  style={{
                    background: isLocked ? '#B8956A' : 'transparent',
                    color: isLocked ? '#FFFFFF' : (cell.value === null ? '#C5BFB3' : '#B8956A'),
                    border: `1px solid ${isLocked ? '#B8956A' : '#E4E4E7'}`,
                    borderRadius: 999,
                    cursor: (busy[key] || cell.value === null) ? 'not-allowed' : 'pointer',
                    opacity: cell.value === null ? 0.5 : 1,
                  }}
                  title={
                    cell.value === null
                      ? 'Cannot lock a missing value'
                      : isLocked
                        ? 'Locked · click to unlock'
                        : 'Click to lock as ground truth'
                  }
                >
                  {isLocked ? <Lock size={13} strokeWidth={1.8} /> : <Unlock size={13} strokeWidth={1.7} />}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="px-6 py-4 text-[11.5px] border-t" style={{ borderColor: '#E4E4E7', color: '#52525B', background: '#FAFAFA' }}>
        Locked values are treated as ground truth — they will NOT be overwritten by future re-scrapes.
        {!loaded && <span className="ml-2 opacity-60">· Syncing…</span>}
      </div>
    </div>
  );
}

function Badge({ children, muted }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-3 py-1 text-[10.5px] tracking-[0.10em] font-mono-tight uppercase"
      style={{
        background: muted ? 'transparent' : 'rgba(184,149,106,0.10)',
        color: muted ? '#52525B' : '#B8956A',
        border: `1px solid ${muted ? '#E4E4E7' : 'rgba(184,149,106,0.25)'}`,
        borderRadius: 999,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}
