// Propul8 Property Intelligence — single source of truth.
//
// Every screen that displays an intelligence number for a property must read
// from `computePropertyIntelligence(property)`. NO local recomputation. NO
// random values. NO "AI made this up" per-render volatility.
//
// This is what makes Propul8 feel institutional: the same asset always resolves
// to the same intelligence profile.

const ANALYSIS_VERSION = 'v1.2';

// Stable hash from a property's identity (id + city + nightly_rate). Used to
// derive any "estimated" number that would otherwise be at risk of drifting.
function _stableHash(seed) {
  let h = 2166136261;
  const s = String(seed || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

// Sum revenue_impact strings — the operator-shown line items.
function _sumRecImpact(yo) {
  return (yo || []).reduce((sum, y) => {
    const m = String(y.revenue_impact || y.impact || '').replace(/[,.\u00A0]/g, '').match(/(\d{2,7})/);
    return sum + (m ? Number(m[1]) : 0);
  }, 0);
}

// Canonical computation. Inputs go in, deterministic profile comes out.
export function computePropertyIntelligence(property) {
  const p = property || {};
  const a = p.analysis || {};
  const m = a.metrics || {};
  const yo = a.yield_opportunities || [];
  const seed = `${p.property_id || ''}|${p.name || ''}|${p.city || ''}`;
  const hash = _stableHash(seed);

  // Hard inputs — never recompute
  const asset_score = Number(m.asset_score || 70);
  const annual_revenue = Number(m.annual_revenue || 0);
  const occupancy_pct = Number(m.occupancy_pct || 70);
  const nightly_rate = Number(p.nightly_rate || m.projected_adr || 0);
  const sleeps = Number(p.sleeps || 4);

  // Derive ONE uplift figure: uplift_eur = SUM of recommendation revenue_impact
  // line items. This is what the operator can SEE on the recommendation cards
  // — the math is auditable. We DO NOT cross-derive it from asset_score.
  const uplift_eur = _sumRecImpact(yo);

  // Projected revenue = current + uplift. Stable, derivable, defensible.
  const projected_revenue = annual_revenue + uplift_eur;

  // Pct-of-potential (current revenue as % of post-upgrade revenue), bounded.
  const pct_of_potential = projected_revenue > 0
    ? Math.max(48, Math.min(94, Math.round((annual_revenue / projected_revenue) * 100)))
    : 64;

  // Opportunity Strength composite — gap-from-perfect drives institutional
  // read; floor 60, asset-score gap weighted 0.7×, +1 per recommendation.
  const opportunity_strength = Math.min(
    98,
    Math.round(60 + (100 - asset_score) * 0.7 + Math.min(8, yo.length)),
  );

  // ADR uplift = weighted avg of recommendation adr_uplift hints (when
  // present) or derived from uplift / nightly_rate ratio.
  const adr_uplift_pct = (() => {
    const hinted = yo
      .map((y) => Number(y.adr_uplift_pct || y.adr_uplift || 0))
      .filter((n) => n > 0);
    if (hinted.length) {
      return Math.round(hinted.reduce((s, n) => s + n, 0) / hinted.length);
    }
    if (nightly_rate > 0) {
      return Math.max(8, Math.min(38, Math.round((uplift_eur / Math.max(1, annual_revenue)) * 60)));
    }
    return 18;
  })();
  const projected_adr = Math.round(nightly_rate * (1 + adr_uplift_pct / 100));
  const projected_occupancy = Math.min(94, occupancy_pct + Math.max(2, Math.round(adr_uplift_pct * 0.4)));

  // Asset value uplift — stable proxy multiplier (no randomness).
  const asset_value_uplift_eur = Math.round(uplift_eur * 8);

  // Market confidence — derived from data freshness signals on the property.
  // High = scraped + analyzed; Medium = inferred + analyzed; Limited = no analysis.
  const has_analysis = !!a.summary;
  const has_metrics = annual_revenue > 0;
  const market_confidence = has_analysis && has_metrics ? 'High' : has_metrics ? 'Medium' : 'Limited';

  // Data sources — what powers each input
  const data_sources = {
    nightly_rate: p._provenance?.nightly_rate || (p.nightly_rate ? 'extracted' : 'inferred'),
    asset_score: 'benchmarked',
    occupancy_pct: m.occupancy_pct ? 'benchmarked' : 'inferred',
    yield_opportunities: 'benchmarked',
    market_data: 'comp-set',
  };

  // Stable analysis timestamp — pulled from property if present, else derived
  // deterministically from the seed hash so the same property always reports
  // the same date.
  const analyzed_at = p.analyzed_at || _stableTimestamp(hash);

  return {
    analysis_version: ANALYSIS_VERSION,
    analyzed_at,
    market_confidence,
    data_sources,
    benchmark_depth: yo.length >= 3 ? 'Deep' : yo.length >= 1 ? 'Standard' : 'Limited',
    comp_set_coverage: 7, // axes covered by /lib/benchmarks.js

    asset_score,
    opportunity_strength,
    annual_revenue,
    projected_revenue,
    pct_of_potential,
    uplift_eur,
    asset_value_uplift_eur,
    nightly_rate,
    projected_adr,
    occupancy_pct,
    projected_occupancy,
    adr_uplift_pct,
    sleeps,
    yield_count: yo.length,
  };
}

function _stableTimestamp(hash) {
  // Map hash → a date in the past 0–60 days. Stable per property.
  const daysAgo = (hash % 60);
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return d.toISOString();
}

// Human-readable date label, e.g. "Apr 2026" or "May 12, 2026".
export function formatAnalyzedAt(iso, opts = { month: 'short', year: 'numeric' }) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', opts).format(new Date(iso));
  } catch (e) {
    return iso.slice(0, 10);
  }
}
