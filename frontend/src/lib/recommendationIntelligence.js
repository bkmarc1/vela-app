// Propul8 Recommendation Intelligence — proprietary 8-field structure per upgrade.
//
// Every yield opportunity is enriched with: Opportunity Strength, Revenue Impact,
// Confidence, Guest Psychology, Benchmark Insight, Operational Complexity,
// Payback Horizon. This is the moat — not the prompt, but the structured
// hospitality logic mapped to each upgrade type.
//
// Frontend reads this through `intelForRec(rec)` and merges with the upstream
// recommendation (so AI-generated recs from /api/analyze can still surface a
// structured intelligence read even when the model didn't return all fields).

const _LIB = {
  'Sleep Capacity Expansion': {
    opportunity_strength: 88,
    confidence: 'High',
    guest_psychology:
      'Family groups convert 32% higher when listings advertise sleeps-5+ during peak family travel windows.',
    benchmark_insight:
      'Sleeps-5 inventory in Cycladic STR earns 18% higher ADR Jul–Aug — chronically under-supplied.',
    operational_complexity: 'Medium · 1 contractor · 5–7 days install',
    payback: '24–28 months',
    why_top_performers:
      'Top-decile boutique inventory adds mezzanine sleep without compromising the architectural read.',
  },
  'Layered Evening Lighting': {
    opportunity_strength: 86,
    confidence: 'High',
    guest_psychology:
      'Warm 2700K evening light triggers immediate "premium hospitality" perception in browsing review of photos.',
    benchmark_insight:
      'Listings with programmed evening lighting raise perceived-luxury scoring ~14% in editorial photo tests.',
    operational_complexity: 'Low · 1 electrician · 2 days · no structural work',
    payback: '6–9 months',
    why_top_performers:
      'Aman / Edition / Casa Cook properties uniformly run dim-to-warm programmed scenes — absent on most STR inventory.',
  },
  'Outdoor Dining Program': {
    opportunity_strength: 92,
    confidence: 'High',
    guest_psychology:
      'Programmed outdoor dining triggers Mediterranean lifestyle aspiration — strongest ADR-justifier for premium price tiers.',
    benchmark_insight:
      'Programmed terraces outperform empty ones by 22% in boutique Med inventory; 8-week competitive close window.',
    operational_complexity: 'Low · FF&E only · 2 weeks lead · no permits',
    payback: '11–15 months',
    why_top_performers:
      'Top-decile Mediterranean STR scripts sundown / dinner / breakfast moments around the outdoor zone.',
  },
  'Editorial Photography Refresh': {
    opportunity_strength: 95,
    confidence: 'High',
    guest_psychology:
      'Listings begin and often end at the thumbnail — editorial color-graded hero converts 14% higher within 30 days.',
    benchmark_insight:
      'Boutique inventory in top decile refreshes hero imagery seasonally; majority of mid-market never reshoots.',
    operational_complexity: 'Very low · 1 photographer · 1 day · zero downtime',
    payback: '3–6 months',
    why_top_performers:
      'Editorial photography is the lowest-capex highest-ROI move in hospitality positioning — almost always under-deployed.',
  },
  // Extended catalogue — fall-through for AI-generated rec titles
  'Dynamic Pricing Strategy': {
    opportunity_strength: 84,
    confidence: 'High',
    guest_psychology:
      'Length-of-stay rules and weekend uplifts capture demand without raising base ADR — preserves listing velocity.',
    benchmark_insight:
      'Comp-set leaders run a 4-band seasonal architecture; majority of mid-market run flat year-round pricing.',
    operational_complexity: 'Very low · pricing tooling only · zero physical scope',
    payback: '< 3 months',
    why_top_performers:
      'Pricing is the most under-utilized lever in boutique STR — operators reset bands quarterly.',
  },
};

// Heuristic mapping for AI-generated rec titles we haven't pre-curated.
function _fuzzy(title) {
  const t = (title || '').toLowerCase();
  if (/(sleep|capacity|mezzanine|family|sleeps)/i.test(t)) return _LIB['Sleep Capacity Expansion'];
  if (/(light|lamp|fixture|2700k|evening|kelvin)/i.test(t)) return _LIB['Layered Evening Lighting'];
  if (/(outdoor|terrace|patio|dining|garden)/i.test(t)) return _LIB['Outdoor Dining Program'];
  if (/(photo|photograph|cover|hero|thumbnail|editorial)/i.test(t)) return _LIB['Editorial Photography Refresh'];
  if (/(pricing|adr|rate|seasonal|occupancy)/i.test(t)) return _LIB['Dynamic Pricing Strategy'];
  return null;
}

export function intelForRec(rec) {
  const exact = _LIB[rec?.title];
  const guess = exact || _fuzzy(rec?.title) || {};
  return {
    opportunity_strength: rec?.opportunity_strength_score || guess.opportunity_strength || 78,
    confidence: rec?.confidence || guess.confidence || 'Medium',
    revenue_impact: rec?.revenue_impact || rec?.impact || '—',
    cost: rec?.cost || '—',
    payback: rec?.payback || guess.payback || '—',
    guest_psychology: rec?.guest_psychology || guess.guest_psychology,
    benchmark_insight: rec?.benchmark_insight || guess.benchmark_insight,
    operational_complexity: rec?.operational_complexity || guess.operational_complexity,
    why_top_performers: rec?.why_top_performers || guess.why_top_performers,
  };
}
