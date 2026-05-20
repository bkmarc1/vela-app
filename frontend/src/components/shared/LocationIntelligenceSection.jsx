// Propul8 · Location Intelligence — embedded section.
//
// Drop-in component for the Invest dashboard and the Operate result page.
// Auto-fetches `POST /api/location/analyze` for the property's
// `${title?}, ${neighborhood?}, ${city}` (or explicit lat/lng) and renders
// a premium inline score card: big number, verdict pill, 4 sub-score bars,
// top drivers + weaknesses, optional travel detail behind a toggle.
//
// Identical surface in INVEST and OPERATE so the user gets the same
// location intelligence everywhere the asset lives.

import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  MapPin, ArrowRight, Sparkles,
  UtensilsCrossed, Coffee, ShoppingCart, Train, Waves,
  Anchor, Landmark, Plus, Building2,
} from 'lucide-react';

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


// Build the best-available address string from a property input record.
// Smart heuristics:
//   • Include neighborhood + city when available.
//   • Detect country hint from listing URL TLD (.gr → Greece, .fr → France …).
//   • Otherwise add `country` field if provided.
export function buildAddressFromInput(input) {
  if (!input) return null;

  const parts = [
    input.neighborhood,
    input.city,
  ].filter(Boolean);

  // Country hint from explicit field
  if (input.country) {
    parts.push(input.country);
  } else if (typeof input.url === 'string') {
    // Country hint from URL TLD
    const tldMap = {
      gr: 'Greece', fr: 'France', es: 'Spain', it: 'Italy', pt: 'Portugal',
      de: 'Germany', uk: 'United Kingdom', nl: 'Netherlands', be: 'Belgium',
    };
    const m = input.url.match(/\.([a-z]{2,3})(?:[/:?]|$)/i);
    if (m && tldMap[m[1].toLowerCase()]) {
      parts.push(tldMap[m[1].toLowerCase()]);
    }
  }

  if (!parts.length) return null;
  return parts.join(', ');
}


export default function LocationIntelligenceSection({
  input,
  address: addressOverride,
  lat,
  lng,
  variant = 'embedded',          // 'embedded' (Operate) | 'accordion-inner' (Invest)
}) {
  const address = useMemo(() =>
    addressOverride || buildAddressFromInput(input || {}),
    [addressOverride, input],
  );

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [showDetails, setShowDetails] = useState(false);

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

  // Skeleton state
  if (loading) {
    return <LocationSkeleton variant={variant} />;
  }
  if (error || !data) {
    return (
      <LocationCard variant={variant}>
        <div className="px-6 py-10 text-center" data-testid="loc-section-error">
          <MapPin size={20} strokeWidth={1.5} style={{ color: '#52525B', display: 'inline-block' }} />
          <p className="mt-3 text-[13.5px]" style={{ color: '#52525B' }}>
            {error || 'Location intelligence unavailable for this address.'}
          </p>
        </div>
      </LocationCard>
    );
  }

  const theme = VERDICT_THEME[data.verdict] || VERDICT_THEME.Average;
  const SCORE_BARS = [
    { id: 'walkability',  label: 'Walkability',    value: data.scores.walkability },
    { id: 'tourism',      label: 'Tourism',        value: data.scores.tourism },
    { id: 'beach',        label: 'Beach / Marina', value: data.scores.beach_marina },
    { id: 'convenience',  label: 'Convenience',    value: data.scores.convenience },
  ];

  return (
    <LocationCard variant={variant} testId="loc-section">
      <div className="px-7 lg:px-9 py-8 lg:py-10">
        <div className="grid lg:grid-cols-12 gap-8 items-start">

          {/* LEFT: Score + verdict + resolved address */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2">
              <MapPin size={14} strokeWidth={1.7} style={{ color: '#B8956A' }} />
              <span
                className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
                style={{ color: '#B8956A' }}
              >
                Location Intelligence
              </span>
            </div>

            <div className="mt-5 flex items-baseline gap-2">
              <span
                className="font-display tabular-nums"
                style={{
                  color: '#09090B',
                  fontSize: 'clamp(60px, 7vw, 88px)',
                  fontWeight: 500,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
                data-testid="loc-section-score"
              >
                {data.scores.location.toFixed(1)}
              </span>
              <span className="font-mono-tight text-[14px]" style={{ color: '#52525B' }}>/ 10</span>
            </div>

            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5"
              style={{
                background: theme.tint,
                border: `1px solid ${theme.color}30`,
                borderRadius: 999,
              }}
              data-testid="loc-section-verdict"
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: theme.color }} />
              <span className="font-mono-tight text-[10.5px] tracking-[0.18em] uppercase"
                style={{ color: theme.color, fontWeight: 600 }}>
                {data.verdict}
              </span>
            </div>

            <div className="mt-5 flex items-start gap-2 text-[12.5px]" style={{ color: '#52525B' }}>
              <MapPin size={11} strokeWidth={1.7} style={{ color: '#52525B', marginTop: 3, flexShrink: 0 }} />
              <span data-testid="loc-section-address">
                {data.resolved_address || data.address_input}
              </span>
            </div>
          </div>

          {/* RIGHT: Sub-score bars + drivers/weak summary */}
          <div className="lg:col-span-7 flex flex-col gap-6">

            <div className="grid grid-cols-2 gap-x-7 gap-y-4">
              {SCORE_BARS.map((s) => (
                <ScoreRow key={s.id} label={s.label} value={s.value} testId={`loc-section-sub-${s.id}`} />
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: '#E4E4E7' }}>
              <div data-testid="loc-section-drivers" className="pt-4">
                <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
                  style={{ color: '#B8956A' }}>
                  Top drivers
                </span>
                <ul className="mt-3 space-y-2 text-[12.5px]" style={{ color: '#09090B' }}>
                  {(data.top_drivers || []).slice(0, 4).map((d, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full mt-2 flex-shrink-0"
                        style={{ background: '#B8956A' }} />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div data-testid="loc-section-weaknesses" className="pt-4">
                <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
                  style={{ color: '#52525B' }}>
                  Watch-outs
                </span>
                {data.top_weaknesses && data.top_weaknesses.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-[12.5px]" style={{ color: '#09090B' }}>
                    {data.top_weaknesses.slice(0, 3).map((w, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full mt-2 flex-shrink-0"
                          style={{ background: '#52525B' }} />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-[12.5px]" style={{ color: '#52525B' }}>
                    No major weaknesses detected.
                  </p>
                )}
                {data.noise_risk_notes && data.noise_risk_notes.length > 0 && (
                  <ul className="mt-3 pt-3 border-t space-y-1.5 text-[11px]"
                    style={{ borderColor: '#E4E4E7', color: '#52525B' }}>
                    {data.noise_risk_notes.map((n, i) => (
                      <li key={i} className="italic">⚠ {n}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Toggle nearest-by-category detail */}
            <button
              onClick={() => setShowDetails((s) => !s)}
              className="inline-flex self-start items-center gap-2 px-4 py-2 text-[12px] transition-all"
              style={{
                background: showDetails ? '#B8956A' : 'transparent',
                color: showDetails ? '#FFFFFF' : '#09090B',
                border: '1px solid #E4E4E7',
                borderRadius: 999,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
              }}
              data-testid="loc-section-toggle-details"
            >
              {showDetails ? 'Hide nearby places' : 'See nearest places by category'}
              {!showDetails && <ArrowRight size={11} />}
            </button>
          </div>
        </div>

        {/* Travel summary table under toggle */}
        {showDetails && (
          <div
            className="mt-7 overflow-hidden"
            style={{
              background: '#FAFAFA',
              border: '1px solid #E4E4E7',
              borderRadius: 3,
            }}
            data-testid="loc-section-travel-summary"
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
                  data-testid={`loc-section-travel-row-${p.category}`}
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
        )}

        {/* Footer · provider + cache state */}
        <div
          className="mt-6 pt-4 border-t flex items-center justify-between flex-wrap gap-2 font-mono-tight text-[10px] tracking-[0.18em] uppercase"
          style={{ borderColor: '#E4E4E7', color: '#52525B' }}
        >
          <span>Sourced from {data.source === 'google' ? 'Google Maps' : 'OpenStreetMap'}</span>
          {data.cached && <span style={{ color: '#B8956A' }}>· Cached</span>}
        </div>
      </div>
    </LocationCard>
  );
}


function LocationCard({ children, variant, testId }) {
  // 'accordion-inner' = inside an existing AccordionSection panel (no own
  // chrome). 'embedded' = top-level section with its own card chrome.
  if (variant === 'accordion-inner') {
    return <div data-testid={testId}>{children}</div>;
  }
  return (
    <div
      className="mx-6 md:mx-12 my-2"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: 4,
        boxShadow: '0 1px 2px rgba(9,9,11,0.03)',
      }}
      data-testid={testId}
    >
      {children}
    </div>
  );
}


function LocationSkeleton({ variant }) {
  return (
    <LocationCard variant={variant}>
      <div className="px-7 lg:px-9 py-10" data-testid="loc-section-skeleton">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={13} className="animate-pulse" style={{ color: '#B8956A' }} />
          <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
            style={{ color: '#B8956A' }}>
            Scoring location…
          </span>
        </div>
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="h-16 w-32" style={{ background: '#FAFAFA', borderRadius: 12 }} />
            <div className="h-5 w-24" style={{ background: '#FAFAFA', borderRadius: 999 }} />
            <div className="h-3 w-56" style={{ background: '#FAFAFA', borderRadius: 6 }} />
          </div>
          <div className="lg:col-span-7 space-y-4">
            {[0,1,2,3].map((i) => (
              <div key={i} className="h-3 w-full" style={{ background: '#FAFAFA', borderRadius: 999 }} />
            ))}
          </div>
        </div>
      </div>
    </LocationCard>
  );
}


function ScoreRow({ label, value, testId }) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  return (
    <div data-testid={testId}>
      <div className="flex items-center justify-between mb-1.5 text-[12px]">
        <span style={{ color: '#09090B' }}>{label}</span>
        <span className="font-display tabular-nums" style={{ color: '#09090B', fontWeight: 500 }}>
          {value.toFixed(1)}
        </span>
      </div>
      <div
        className="relative"
        style={{
          height: 5,
          background: '#FAFAFA',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${pct}%`,
            background: '#B8956A',
            borderRadius: 999,
            transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
    </div>
  );
}
