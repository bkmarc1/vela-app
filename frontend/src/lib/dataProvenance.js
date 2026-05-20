// Propul8 — Data Provenance Layer.
// Single source of truth for "what is this number, where did it come from, and
// how much do we trust it?" Every metric flows through this helper so the UI
// can render a strict status badge: Confirmed / Calculated / Estimated /
// Not confirmed / Needs input / Source blocked.
//
// Status taxonomy (institutional underwriting rigour):
//   Confirmed      — pulled from structured listing data OR user-verified
//   Calculated     — deterministic math on Confirmed inputs (e.g. €/sqm)
//   Estimated      — Propul8 market model / regex extraction (regex hit only)
//   Not confirmed  — extraction yielded nothing; user has not filled it in
//   Needs input    — field is mandatory for analysis but missing
//   Source blocked — listing portal blocked the scraper (HTTP error / JS-only)
//
// confidence (0–100) is a rough trust score:
//   100 — user-verified
//    95 — JSON-LD / structured data
//    72 — calculated from two Confirmed inputs
//    55 — calculated from one Confirmed and one Estimated input
//    50 — regex / OG / heuristic (needs_review)
//    32 — Propul8 market model fallback
//     0 — missing entirely

const TODAY = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

// Map raw backend confidence flag → strict status + numeric confidence.
const _flagToStatus = (flag, hasValue) => {
  if (!hasValue) {
    if (flag === 'source_blocked') return { status: 'Source blocked', confidence: 0 };
    return { status: 'Not confirmed', confidence: 0 };
  }
  switch (flag) {
    case 'user_verified':      return { status: 'Confirmed',     confidence: 100 };
    case 'user_pasted_text':   return { status: 'Confirmed',     confidence: 88 };
    case 'user_screenshot':    return { status: 'Confirmed',     confidence: 86 };
    case 'verified':           return { status: 'Confirmed',     confidence: 95 };
    case 'needs_review':       return { status: 'Estimated',     confidence: 50 };
    case 'calculated':         return { status: 'Calculated',    confidence: 72 };
    case 'market_model':       return { status: 'Estimated',     confidence: 32 };
    case 'missing':            return { status: 'Not confirmed', confidence: 0 };
    case 'source_blocked':     return { status: 'Source blocked', confidence: 0 };
    default:                   return { status: 'Estimated',     confidence: 50 };
  }
};

const _sourceFor = (flag, listingSource) => {
  if (flag === 'user_verified')    return 'User verified';
  if (flag === 'user_pasted_text') return 'Extracted from pasted text';
  if (flag === 'user_screenshot')  return 'Extracted from screenshot';
  if (flag === 'verified')         return listingSource || 'Listing JSON-LD';
  if (flag === 'needs_review')     return listingSource ? `${listingSource} (text)` : 'Listing text';
  if (flag === 'calculated')       return 'Propul8 deterministic math';
  if (flag === 'market_model')     return 'Propul8 market model';
  if (flag === 'source_blocked')   return 'Source blocked';
  return 'Unknown';
};

// Build a single `{value, status, source, confidence, lastChecked}` cell.
export function buildCell(value, flag, opts = {}) {
  const hasValue = value !== null && value !== undefined && value !== '' && !(typeof value === 'number' && Number.isNaN(value));
  const { status, confidence } = _flagToStatus(flag, hasValue);
  return {
    value: hasValue ? value : null,
    status,
    source: opts.source || _sourceFor(flag, opts.listingSource),
    confidence: opts.confidence !== undefined ? opts.confidence : confidence,
    lastChecked: opts.lastChecked || TODAY(),
    label: opts.label || null,
    unit: opts.unit || null,
  };
}

// Marker constants for critical fields. UI hard-blocks confirmation when these
// are 'Not confirmed' or 'Needs input'.
export const CRITICAL_FIELDS = ['asking_price_eur', 'm2', 'rooms', 'city'];

// Build provenance map for an INVEST input (with backend _confidence flags).
// Returns { fieldKey: cell } for every listing field Propul8 tracks.
export function buildInvestProvenance(input) {
  const c = input?._confidence || {};
  const src = input?.listing_source || null;
  const opts = { listingSource: src };

  const cells = {
    asking_price_eur: buildCell(input.asking_price_eur, c.asking_price_eur || 'missing', { ...opts, unit: 'EUR', label: 'Asking price' }),
    price_per_sqm_eur: buildCell(input.price_per_sqm_eur, c.price_per_sqm_eur || (input.price_per_sqm_eur ? 'calculated' : 'missing'), { ...opts, unit: '€/m²', label: 'Price per m²' }),
    m2:               buildCell(input.m2, c.m2 || 'missing', { ...opts, unit: 'm²', label: 'Surface area' }),
    rooms:            buildCell(input.rooms, c.rooms || 'missing', { ...opts, unit: '', label: 'Bedrooms' }),
    bathrooms:        buildCell(input.bathrooms, c.bathrooms || 'missing', { ...opts, unit: '', label: 'Bathrooms' }),
    city:             buildCell(input.city, c.city || 'missing', { ...opts, label: 'City' }),
    neighborhood:     buildCell(input.neighborhood, c.neighborhood || 'missing', { ...opts, label: 'Neighborhood' }),
    property_type:    buildCell(input.property_type, c.property_type || 'missing', { ...opts, label: 'Property type' }),
    year_built:       buildCell(input.year_built, c.year_built || 'missing', { ...opts, label: 'Year built' }),
    renovation_state: buildCell(input.renovation_state, c.renovation_state || 'missing', { ...opts, label: 'Condition' }),
    floor:            buildCell(input.floor, c.floor || 'missing', { ...opts, label: 'Floor' }),
    energy_class:     buildCell(input.energy_class, c.energy_class || 'missing', { ...opts, label: 'Energy class' }),
    parking:          buildCell(input.parking, c.parking || 'missing', { ...opts, label: 'Parking' }),
    listing_source:   buildCell(input.listing_source, c.listing_source || (input.listing_source ? 'verified' : 'missing'), { ...opts, label: 'Source portal' }),
  };
  return cells;
}

// Provenance for OPERATE inputs. ADR / occupancy are typically estimated from
// market unless the user supplied them. Bedrooms / city / type are from scrape.
export function buildOperateProvenance(input) {
  const c = input?._confidence || {};
  const src = input?.listing_source || null;
  const opts = { listingSource: src };

  const adrFlag = input.current_adr_user ? 'user_verified' : (input.current_adr ? 'market_model' : 'missing');
  const occFlag = input.current_occupancy_user ? 'user_verified' : (input.current_occupancy ? 'market_model' : 'missing');

  return {
    title:            buildCell(input.title, input.title ? 'verified' : 'missing', { ...opts, label: 'Listing title' }),
    city:             buildCell(input.city, c.city || (input.city ? 'verified' : 'missing'), { ...opts, label: 'City' }),
    property_type:    buildCell(input.property_type, c.property_type || (input.property_type ? 'verified' : 'missing'), { ...opts, label: 'Property type' }),
    bedrooms:         buildCell(input.bedrooms, c.rooms || (input.bedrooms ? 'verified' : 'missing'), { ...opts, label: 'Bedrooms' }),
    current_adr:      buildCell(input.current_adr, adrFlag, { ...opts, unit: 'EUR/night', label: 'Current ADR' }),
    current_occupancy:buildCell(input.current_occupancy, occFlag, { ...opts, unit: '%', label: 'Current occupancy' }),
    year_built:       buildCell(input.year_built, c.year_built || (input.year_built ? 'verified' : 'missing'), { ...opts, label: 'Year built' }),
    renovation_state: buildCell(input.renovation_state, c.renovation_state || (input.renovation_state ? 'verified' : 'missing'), { ...opts, label: 'Condition' }),
  };
}

// Returns the list of CRITICAL fields that are not yet Confirmed.
// Used by ConfirmPropertyData to hard-block the user.
export function missingCriticalFields(provenance, criticalKeys = CRITICAL_FIELDS) {
  return criticalKeys.filter((k) => {
    const cell = provenance[k];
    if (!cell) return true;
    return cell.status !== 'Confirmed';
  });
}

// Style tokens per status — used by DataBadge.
export const STATUS_THEME = {
  Confirmed:       { color: '#B8956A', bg: 'rgba(92,122,78,0.10)',  border: 'rgba(92,122,78,0.30)' },
  Calculated:      { color: '#52525B', bg: 'rgba(123,123,87,0.10)', border: 'rgba(123,123,87,0.30)' },
  Estimated:       { color: '#B8956A', bg: 'rgba(184,149,106,0.10)', border: 'rgba(184,149,106,0.30)' },
  'Not confirmed': { color: '#52525B', bg: 'rgba(156,143,119,0.10)', border: 'rgba(156,143,119,0.30)' },
  'Needs input':   { color: '#B8956A', bg: 'rgba(160,82,74,0.12)',  border: 'rgba(160,82,74,0.35)' },
  'Source blocked':{ color: '#52525B', bg: 'rgba(107,123,140,0.10)', border: 'rgba(107,123,140,0.30)' },
};

// Dark-shell variant (vela-invest)
export const STATUS_THEME_DARK = {
  Confirmed:       { color: '#B8956A', bg: 'rgba(125,191,143,0.10)', border: 'rgba(125,191,143,0.32)' },
  Calculated:      { color: '#B8956A', bg: 'rgba(196,167,137,0.10)', border: 'rgba(196,167,137,0.30)' },
  Estimated:       { color: '#B8956A', bg: 'rgba(196,167,137,0.10)', border: 'rgba(196,167,137,0.30)' },
  'Not confirmed': { color: '#52525B', bg: 'rgba(138,128,118,0.10)', border: 'rgba(138,128,118,0.30)' },
  'Needs input':   { color: '#B8956A', bg: 'rgba(201,122,106,0.12)', border: 'rgba(201,122,106,0.35)' },
  'Source blocked':{ color: '#52525B', bg: 'rgba(155,176,194,0.10)', border: 'rgba(155,176,194,0.30)' },
};
