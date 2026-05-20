// Propul8 · Compact Location Score card + click-to-expand modal.
// Replaces the previous standalone embedded section. Fits into the same
// row as the OPERATE Key Cards and INVEST Decision Strip.
//
// • Compact tile: kicker "Location" · big 7.5/10 · verdict pill.
// • Click → premium modal with full breakdown (sub-scores, drivers,
//   weaknesses, noise/risk, travel summary by category).

import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  MapPin, X, ArrowUpRight,
  UtensilsCrossed, Coffee, ShoppingCart, Train, Waves,
  Anchor, Landmark, Plus, Building2,
} from 'lucide-react';
import { buildAddressFromInput } from './LocationIntelligenceSection';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VERDICT_THEME = {
  Prime:   { color: '#B8956A', tint: 'rgba(184,149,106,0.12)' },
  Strong:  { color: '#B8956A', tint: 'rgba(184,149,106,0.08)' },
  Average: { color: '#52525B', tint: 'rgba(111,106,99,0.10)' },
  Weak:    { color: '#52525B', tint: 'rgba(111,106,99,0.12)' },
};

const CATEGORY_ICON = {
  restaurant: UtensilsCrossed,
  cafe:       Coffee,
  supermarket:ShoppingCart,
  metro:      Train,
  beach:      Waves,
  marina:     Anchor,
  landmark:   Landmark,
  hospital:   Plus,
  pharmacy:   Plus,
  airport:    Building2,
};


function useLocationFetch({ input, addressOverride, lat, lng }) {
  const address = useMemo(() =>
    addressOverride || buildAddressFromInput(input || {}),
    [addressOverride, input],
  );

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!address && (lat === undefined || lng === undefined)) return;
      setLoading(true);
      setError(null);
      try {
        const body = (lat !== undefined && lng !== undefined)
          ? { lat, lng }
          : { address };
        const r = await axios.post(`${API}/location/analyze`, body, { timeout: 60000 });
        if (!cancelled) setData(r.data);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.detail || 'Could not analyze location.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [address, lat, lng]);

  return { data, loading, error };
}


// Compact card — visual sibling to a Key Card / Decision Strip tile.
// Use `variant='card'` for square Operate KeyCard slot, `variant='pill'`
// for the slim Invest under-strip placement.
export default function LocationScoreCard({
  input, addressOverride, lat, lng,
  variant = 'card',
  testId   = 'loc-score-card',
}) {
  const { data, loading, error } = useLocationFetch({ input, addressOverride, lat, lng });
  const [open, setOpen] = useState(false);

  if (variant === 'pill') {
    return (
      <>
        <PillTile data={data} loading={loading} error={error} onClick={() => setOpen(true)} testId={testId} />
        {open && data && (
          <LocationDetailsModal data={data} onClose={() => setOpen(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <CardTile data={data} loading={loading} error={error} onClick={() => setOpen(true)} testId={testId} />
      {open && data && (
        <LocationDetailsModal data={data} onClose={() => setOpen(false)} />
      )}
    </>
  );
}


// ─── Compact CARD variant (Operate Key Cards row) ────────────────────────
function CardTile({ data, loading, error, onClick, testId }) {
  const theme = data ? (VERDICT_THEME[data.verdict] || VERDICT_THEME.Average) : VERDICT_THEME.Average;

  return (
    <button
      onClick={data ? onClick : undefined}
      disabled={!data}
      className="text-left p-6 lg:p-7 transition-all"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: 4,
        boxShadow: '0 1px 2px rgba(9,9,11,0.03)',
        cursor: data ? 'pointer' : 'default',
      }}
      data-testid={testId}
    >
      <div className="flex items-center justify-between">
        <span
          className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
          style={{ color: '#52525B' }}
        >
          Location
        </span>
        {data && (
          <ArrowUpRight size={11} strokeWidth={1.7} style={{ color: '#B8956A' }} />
        )}
      </div>
      {data ? (
        <>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className="font-display tabular-nums"
              style={{
                color: '#09090B',
                fontSize: 'clamp(24px, 2.6vw, 32px)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
              }}
              data-testid={`${testId}-score`}
            >
              {data.scores.location.toFixed(1)}
            </span>
            <span className="font-mono-tight text-[11px]" style={{ color: '#52525B' }}>
              / 10
            </span>
          </div>
          <div
            className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5"
            style={{
              background: theme.tint,
              border: `1px solid ${theme.color}30`,
              borderRadius: 999,
            }}
          >
            <span className="w-1 h-1 rounded-full" style={{ background: theme.color }} />
            <span
              className="font-mono-tight text-[9.5px] tracking-[0.18em] uppercase"
              style={{ color: theme.color, fontWeight: 600 }}
            >
              {data.verdict}
            </span>
          </div>
        </>
      ) : (
        <div className="mt-3 font-display" style={{ color: '#52525B', fontSize: 22, fontWeight: 400 }}>
          {loading ? 'Scoring…' : (error ? 'Unavailable' : 'Pending')}
        </div>
      )}
    </button>
  );
}


// ─── PILL variant (Invest — slim row under Decision Strip) ───────────────
function PillTile({ data, loading, error, onClick, testId }) {
  const theme = data ? (VERDICT_THEME[data.verdict] || VERDICT_THEME.Average) : VERDICT_THEME.Average;
  return (
    <button
      onClick={data ? onClick : undefined}
      disabled={!data}
      data-testid={testId}
      className="inline-flex items-center gap-3 px-4 py-2.5 transition-all"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: 999,
        cursor: data ? 'pointer' : 'default',
      }}
    >
      <MapPin size={12} strokeWidth={1.7} style={{ color: '#B8956A' }} />
      <span
        className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
        style={{ color: '#52525B' }}
      >
        Location
      </span>
      {data ? (
        <>
          <span
            className="font-display tabular-nums"
            style={{ color: '#09090B', fontSize: 14, fontWeight: 500 }}
            data-testid={`${testId}-score`}
          >
            {data.scores.location.toFixed(1)}<span className="text-[10px]" style={{ color: '#52525B' }}>/10</span>
          </span>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5"
            style={{
              background: theme.tint,
              border: `1px solid ${theme.color}30`,
              borderRadius: 999,
            }}
          >
            <span className="w-1 h-1 rounded-full" style={{ background: theme.color }} />
            <span
              className="font-mono-tight text-[9.5px] tracking-[0.18em] uppercase"
              style={{ color: theme.color, fontWeight: 600 }}
            >
              {data.verdict}
            </span>
          </span>
          <ArrowUpRight size={11} strokeWidth={1.7} style={{ color: '#B8956A' }} />
        </>
      ) : (
        <span className="text-[12px]" style={{ color: '#52525B' }}>
          {loading ? 'Scoring…' : (error ? 'Unavailable' : 'Pending')}
        </span>
      )}
    </button>
  );
}


// ─── Click-through MODAL with full breakdown ─────────────────────────────
function LocationDetailsModal({ data, onClose }) {
  const theme = VERDICT_THEME[data.verdict] || VERDICT_THEME.Average;
  const SUB_BARS = [
    { id: 'walkability',  label: 'Walkability',    value: data.scores.walkability },
    { id: 'tourism',      label: 'Tourism',        value: data.scores.tourism },
    { id: 'beach',        label: 'Beach / Marina', value: data.scores.beach_marina },
    { id: 'convenience',  label: 'Convenience',    value: data.scores.convenience },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto"
      style={{ background: 'rgba(9,9,11,0.42)' }}
      onClick={onClose}
      data-testid="loc-details-modal"
    >
      <div
        className="w-full max-w-[860px] my-auto"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E4E4E7',
          borderRadius: 4,
          boxShadow: '0 28px 80px rgba(9,9,11,0.20)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 lg:px-10 py-7 border-b flex items-start justify-between gap-4" style={{ borderColor: '#E4E4E7' }}>
          <div>
            <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#B8956A' }}>
              Location Intelligence
            </span>
            <div className="mt-3 flex items-baseline gap-3">
              <span
                className="font-display tabular-nums"
                style={{
                  color: '#09090B', fontSize: 60, fontWeight: 500,
                  letterSpacing: '-0.03em', lineHeight: 1,
                }}
                data-testid="loc-modal-score"
              >
                {data.scores.location.toFixed(1)}
              </span>
              <span className="font-mono-tight text-[13px]" style={{ color: '#52525B' }}>/ 10</span>
              <span
                className="ml-3 inline-flex items-center gap-1.5 px-3 py-1"
                style={{
                  background: theme.tint,
                  border: `1px solid ${theme.color}30`,
                  borderRadius: 999,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: theme.color }} />
                <span className="font-mono-tight text-[10.5px] tracking-[0.18em] uppercase"
                  style={{ color: theme.color, fontWeight: 600 }}>
                  {data.verdict}
                </span>
              </span>
            </div>
            <div className="mt-4 flex items-start gap-2 text-[12.5px]" style={{ color: '#52525B' }}>
              <MapPin size={11} strokeWidth={1.7} style={{ marginTop: 3, flexShrink: 0 }} />
              <span data-testid="loc-modal-address">{data.resolved_address || data.address_input}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2"
            style={{ color: '#52525B' }}
            data-testid="loc-modal-close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sub-scores + drivers/weaknesses */}
        <div className="px-8 lg:px-10 py-7 grid lg:grid-cols-2 gap-7 border-b" style={{ borderColor: '#E4E4E7' }}>
          <div>
            <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#52525B' }}>
              Sub-scores
            </span>
            <div className="mt-4 space-y-4">
              {SUB_BARS.map((s) => (
                <SubBar key={s.id} {...s} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5">
            <div>
              <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#B8956A' }}>
                Top drivers
              </span>
              <ul className="mt-3 space-y-2 text-[13px]" style={{ color: '#09090B' }}>
                {(data.top_drivers || []).slice(0, 5).map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ background: '#B8956A' }} />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#52525B' }}>
                Watch-outs
              </span>
              {data.top_weaknesses && data.top_weaknesses.length > 0 ? (
                <ul className="mt-3 space-y-2 text-[13px]" style={{ color: '#09090B' }}>
                  {data.top_weaknesses.slice(0, 3).map((w, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ background: '#52525B' }} />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[13px]" style={{ color: '#52525B' }}>No major weaknesses detected.</p>
              )}
              {data.noise_risk_notes && data.noise_risk_notes.length > 0 && (
                <ul className="mt-3 pt-3 border-t space-y-1.5 text-[11.5px] italic"
                  style={{ borderColor: '#E4E4E7', color: '#52525B' }}>
                  {data.noise_risk_notes.map((n, i) => <li key={i}>⚠ {n}</li>)}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Travel summary */}
        <div className="px-8 lg:px-10 py-7">
          <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#52525B' }}>
            Nearest places by category
          </span>
          <div
            className="mt-4 overflow-hidden"
            style={{ background: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: 14 }}
            data-testid="loc-modal-travel"
          >
            <div
              className="px-5 py-3 font-mono-tight text-[9.5px] tracking-[0.22em] uppercase border-b grid grid-cols-12 gap-3"
              style={{ color: '#52525B', borderColor: '#E4E4E7' }}
            >
              <div className="col-span-3">Category</div>
              <div className="col-span-5">Nearest place</div>
              <div className="col-span-2 text-right">Walk</div>
              <div className="col-span-2 text-right">Drive</div>
            </div>
            {(data.travel_summary || []).map((p, i) => {
              const Icon = CATEGORY_ICON[p.category] || MapPin;
              return (
                <div
                  key={`${p.category}-${i}`}
                  className="px-5 py-3 grid grid-cols-12 gap-3 items-center text-[12.5px] border-b last:border-b-0"
                  style={{ borderColor: '#E4E4E7', color: '#09090B' }}
                >
                  <div className="col-span-3 flex items-center gap-2">
                    <Icon size={12} strokeWidth={1.7} style={{ color: '#B8956A' }} />
                    <span style={{ textTransform: 'capitalize' }}>{p.category}</span>
                  </div>
                  <div className="col-span-5 truncate" style={{ color: '#52525B' }}>{p.name}</div>
                  <div className="col-span-2 text-right tabular-nums">{p.walk_min} min</div>
                  <div className="col-span-2 text-right tabular-nums">{p.drive_min} min</div>
                </div>
              );
            })}
          </div>
          <div
            className="mt-4 font-mono-tight text-[10px] tracking-[0.18em] uppercase text-right"
            style={{ color: '#52525B' }}
          >
            Sourced from {data.source === 'google' ? 'Google Maps' : 'OpenStreetMap'}
            {data.cached && <span style={{ marginLeft: 8, color: '#B8956A' }}>· Cached</span>}
          </div>
        </div>
      </div>
    </div>
  );
}


function SubBar({ label, value }) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-[12.5px]">
        <span style={{ color: '#09090B' }}>{label}</span>
        <span className="font-display tabular-nums" style={{ color: '#09090B', fontWeight: 500 }}>
          {value.toFixed(1)}
        </span>
      </div>
      <div className="relative" style={{ height: 5, background: '#FAFAFA', borderRadius: 999, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${pct}%`,
            background: '#B8956A',
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}
