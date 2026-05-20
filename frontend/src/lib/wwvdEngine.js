// Propul8 "What Would Propul8 Do?" — deterministic execution-layer engine.
//
// Both INVEST and OPERATE derive their top-3 conviction actions from this engine.
// Same input → same output every render. No LLM in hot path.
//
// Each action carries:
//   - label (large display verb, e.g. "BUY", "CONVERT TO 2BR")
//   - reason (single institutional sentence)
//   - impact_label (€ delta or % uplift)
//   - confidence ('HIGH' | 'MEDIUM')
//   - cta_label  (button label)
//   - route      (router path the cta navigates to)
//   - icon       (lucide-react icon name)
//   - score      (used internally to pick top-3)

const _fmtK = (n) => `€${Math.round((Number(n) || 0) / 1000)}k`;
const _clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ─── INVEST ─────────────────────────────────────────────────────────────
export function computeInvestWWVD({ analysis, input }) {
  const { snapshot, deal_verdict, transformation, true_roi } = analysis;
  const cs = (input.city || '').toLowerCase();
  const isCoastal = ['mykonos', 'santorini', 'paros', 'naxos', 'koufonisia', 'comporta'].some((c) => cs.includes(c));
  const isUrban   = ['athens', 'thessaloniki', 'lisbon', 'riga', 'dubai'].some((c) => cs.includes(c));
  const m2        = Number(input.m2) || 0;
  const rooms     = Number(input.rooms) || 1;
  const renoState = (input.renovation_state || '').toLowerCase();
  const ask       = Number(input.asking_price_eur) || 0;
  const projUplift = Math.round((transformation?.scenarios?.[2]?.adr || 0) - (transformation?.scenarios?.[0]?.adr || 0));
  const annualUplift = Math.round(projUplift * Math.round(365 * (transformation?.scenarios?.[2]?.occupancy_pct || 70) / 100));

  const memoRoute = `/invest/memo/${analysis.asset_id || 'demo'}`;
  const operateRoute = '/operate';
  const upgradeRoute = '/upgrade/demo/0';
  const listingRoute = '/listing/demo/0';

  const actions = [];

  // 1. PRIMARY VERDICT ACTION ──────────────────────────────────────────
  if (deal_verdict.verdict === 'BUY' || deal_verdict.verdict === 'PROCEED') {
    actions.push({
      label: 'BUY',
      icon: 'ShieldCheck',
      reason: `Smart-Buy at ${_fmtK(deal_verdict.target_offer_eur)} clears institutional yield threshold. Move with conviction.`,
      impact_label: `${deal_verdict.projected_post_vela_yield_pct.toFixed(1)}% post-Propul8 yield`,
      confidence: 'HIGH',
      cta_label: 'Generate Memo',
      route: memoRoute,
      score: 100,
    });
  } else if (deal_verdict.verdict === 'NEGOTIATE') {
    actions.push({
      label: `NEGOTIATE BELOW ${_fmtK(deal_verdict.target_offer_eur)}`,
      icon: 'Handshake',
      reason: `Anchor at ${_fmtK(deal_verdict.aggressive_offer_eur)}, settle near ${_fmtK(deal_verdict.target_offer_eur)} — close at Smart-Buy or below.`,
      impact_label: `–${_fmtK(ask - deal_verdict.target_offer_eur)} below asking`,
      confidence: 'HIGH',
      cta_label: 'Generate Offer',
      route: memoRoute,
      score: 100,
    });
  } else if (deal_verdict.verdict === 'WATCH' || deal_verdict.verdict === 'WATCHLIST') {
    actions.push({
      label: `WATCH · TRIGGER ${_fmtK(deal_verdict.target_offer_eur)}`,
      icon: 'Handshake',
      reason: `Asking exceeds Smart-Buy envelope. Set price-drop alert at ${_fmtK(deal_verdict.target_offer_eur)} — re-engage when triggered.`,
      impact_label: `–${_fmtK(ask - deal_verdict.target_offer_eur)} below asking required`,
      confidence: 'HIGH',
      cta_label: 'Set Alert',
      route: memoRoute,
      score: 100,
    });
  } else {
    actions.push({
      label: 'PASS',
      icon: 'XOctagon',
      reason: deal_verdict.main_reason,
      impact_label: 'No margin of safety',
      confidence: 'HIGH',
      cta_label: 'Find Better Deal',
      route: '/invest',
      score: 100,
    });
  }

  // 2. PROPERTY-TYPE STRUCTURAL ACTIONS ────────────────────────────────
  // Strict integrity rules: only suggest a structural change when the
  // confirmed facts allow it. Never contradict the asset.
  //   • "CONVERT TO 2BR" only when listing IS a studio / 1-bed AND room
  //     for a second bedroom is plausible.
  //   • "ADD PLUNGE POOL" only when input.pool is explicitly false. If we
  //     don't know whether there's a pool, we don't recommend adding one.
  //   • "BOUTIQUE HOTEL CONVERSION" only when listing is genuinely large
  //     (m² ≥ 180) AND multi-key plausible.
  const knowsPool = input.pool !== undefined && input.pool !== null;
  const hasNoPool = knowsPool && input.pool === false;

  if (rooms <= 1 && m2 >= 55) {
    actions.push({
      label: 'CONVERT TO 2BR',
      icon: 'LayoutGrid',
      reason: `Currently ${rooms || '1'}-bedroom · ${m2}m² supports a 2-bedroom layout. Adds capacity, lifts ADR ceiling, doubles target audience.`,
      impact_label: '+22–30% ADR uplift',
      confidence: m2 >= 70 ? 'HIGH' : 'MEDIUM',
      cta_label: 'Plan Conversion',
      route: upgradeRoute,
      score: 88,
    });
  }

  if (isCoastal && m2 >= 60 && hasNoPool) {
    actions.push({
      label: 'ADD PLUNGE POOL',
      icon: 'Waves',
      reason: 'Coastal Mediterranean STR with no existing pool — plunge pool unlocks a top-decile editorial price tier.',
      impact_label: `+${_fmtK(18000)} renovation → +€60–90/night`,
      confidence: 'HIGH',
      cta_label: 'Plan Pool Build',
      route: upgradeRoute,
      score: 86,
    });
  }

  if (m2 >= 180 && rooms >= 4) {
    actions.push({
      label: 'BOUTIQUE HOTEL CONVERSION',
      icon: 'Building2',
      reason: `${m2}m² · ${rooms}-bedroom envelope — multi-unit boutique conversion outperforms single-family STR by 2–3×.`,
      impact_label: 'Multi-unit yield envelope',
      confidence: m2 >= 240 ? 'HIGH' : 'MEDIUM',
      cta_label: 'Plan Conversion',
      route: upgradeRoute,
      score: 82,
    });
  }

  // 3. POSITIONING ACTIONS ─────────────────────────────────────────────
  if (snapshot.design_upside >= 78 && (renoState === 'renovation' || renoState === 'gut' || renoState === 'refresh')) {
    actions.push({
      label: 'RAISE ADR THROUGH REDESIGN',
      icon: 'Hammer',
      reason: `Design upside score ${snapshot.design_upside}/100 — editorial FF&E + lighting refresh is the asymmetric ADR lever.`,
      impact_label: annualUplift ? `+${_fmtK(annualUplift * 0.3)}/yr` : '+22–30% ADR',
      confidence: 'HIGH',
      cta_label: 'Plan Redesign',
      route: upgradeRoute,
      score: 85,
    });
  }

  if (isUrban && rooms <= 2 && m2 >= 35) {
    actions.push({
      label: 'TARGET DIGITAL NOMADS',
      icon: 'Laptop',
      reason: 'Urban core + workspace narrative captures the rising mid-week mid-term remote-work cohort.',
      impact_label: '+8–14pp occupancy in shoulder season',
      confidence: 'MEDIUM',
      cta_label: 'Reposition Listing',
      route: listingRoute,
      score: 70,
    });
  }

  if (snapshot.seasonality_risk >= 60) {
    actions.push({
      label: 'MID-TERM RENTAL INSTEAD OF STR',
      icon: 'CalendarRange',
      reason: `Seasonality risk ${snapshot.seasonality_risk}/100 — hedge with 30-day lets in shoulder season; STR for peak only.`,
      impact_label: 'Floors revenue at 60–70% peak',
      confidence: 'MEDIUM',
      cta_label: 'Plan Hybrid Strategy',
      route: listingRoute,
      score: 72,
    });
  }

  if (snapshot.appreciation_potential >= 76 && deal_verdict.projected_post_vela_yield_pct < 10) {
    actions.push({
      label: 'STABILIZE THEN EXIT',
      icon: 'TrendingUp',
      reason: `Appreciation score ${snapshot.appreciation_potential}/100 — stabilize 18–24mo, exit at peak rather than long-hold.`,
      impact_label: '12–18% appreciation runway',
      confidence: 'MEDIUM',
      cta_label: 'Plan Exit',
      route: memoRoute,
      score: 68,
    });
  }

  // 4. ALWAYS-AVAILABLE FALLBACK
  if (actions.length < 3) {
    actions.push({
      label: 'OPTIMIZE EXISTING ASSET',
      icon: 'Sparkles',
      reason: 'Ship to OPERATE module to unlock listing rewrite, dynamic pricing, and design transformation cart.',
      impact_label: 'Execution-ready scope',
      confidence: 'MEDIUM',
      cta_label: 'Open Propul8 OPERATE',
      route: operateRoute,
      score: 50,
    });
  }

  return actions
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// ─── OPERATE ────────────────────────────────────────────────────────────
export function computeOperateWWVD({ analysis, input }) {
  const { snapshot, listing_optimization: lo, redesign, optimization_verdict, revenue_intelligence: rev } = analysis;
  const cs = (input.city || snapshot.location || '').toLowerCase();
  const isCoastal = ['mykonos', 'santorini', 'paros', 'naxos', 'comporta'].some((c) => cs.includes(c));
  const isUrban   = ['athens', 'thessaloniki', 'lisbon'].some((c) => cs.includes(c));
  const bedrooms  = Number(input.bedrooms) || snapshot.bedrooms || 1;
  const adrGap    = (rev.optimized_adr_eur - snapshot.current_adr_eur);
  const annualUplift = rev.annual_uplift_eur || 0;

  const upgradeRoute = '/upgrade/demo/0';
  const listingRoute = '/listing/demo/0';
  const visualizeRoute = '/visualize/demo/0';

  const actions = [];

  // 1. PRIMARY VERDICT-ALIGNED ACTION ──────────────────────────────────
  if (optimization_verdict.verdict === 'LIFT') {
    actions.push({
      label: 'REWRITE LISTING THIS WEEK',
      icon: 'PenLine',
      reason: `Title score ${lo.title_score}/100, photos ${lo.photo_score}/100 — fastest-cycling lever. Wins land in 7 days.`,
      impact_label: `+${_fmtK(annualUplift * 0.4)}/yr (Week 1)`,
      confidence: 'HIGH',
      cta_label: 'Rewrite Listing',
      route: listingRoute,
      score: 100,
    });
  } else if (optimization_verdict.verdict === 'REPRICE') {
    actions.push({
      label: 'ACTIVATE DYNAMIC PRICING',
      icon: 'LineChart',
      reason: `Listing presents well — ADR is leaving ${rev.adr_uplift_pct}% on the table. Calibrate weekday/weekend curve.`,
      impact_label: `+${_fmtK(annualUplift * 0.6)}/yr`,
      confidence: 'HIGH',
      cta_label: 'Set Pricing Curve',
      route: listingRoute,
      score: 100,
    });
  } else if (optimization_verdict.verdict === 'REDESIGN') {
    actions.push({
      label: 'INSTALL EDITORIAL FF&E',
      icon: 'Hammer',
      reason: `Design arbitrage dominates — ${_fmtK(redesign.estimated_budget_eur)} budget unlocks +${redesign.expected_adr_uplift_pct}% ADR.`,
      impact_label: `+${_fmtK(annualUplift)}/yr`,
      confidence: 'HIGH',
      cta_label: 'Build Upgrade Cart',
      route: upgradeRoute,
      score: 100,
    });
  } else {
    actions.push({
      label: 'REPOSITION OR DIVEST',
      icon: 'XOctagon',
      reason: optimization_verdict.main_reason,
      impact_label: 'Fundamentals limit upside',
      confidence: 'HIGH',
      cta_label: 'Plan Exit',
      route: visualizeRoute,
      score: 100,
    });
  }

  // 2. STRUCTURAL ACTIONS ──────────────────────────────────────────────
  // Same integrity rules as INVEST. Never contradict the asset's facts.
  const knowsPoolOp = input.pool !== undefined && input.pool !== null;
  const hasNoPoolOp = knowsPoolOp && input.pool === false;

  if (bedrooms <= 1 && adrGap >= 30) {
    actions.push({
      label: 'CONVERT TO 2BR',
      icon: 'LayoutGrid',
      reason: `Currently ${bedrooms}-bedroom — layout supports a second bedroom. Capacity + ADR ceiling rise simultaneously.`,
      impact_label: `+${_fmtK(annualUplift * 0.5)}/yr capacity uplift`,
      confidence: 'MEDIUM',
      cta_label: 'Plan Conversion',
      route: upgradeRoute,
      score: 86,
    });
  }

  if (isCoastal && hasNoPoolOp) {
    actions.push({
      label: 'ADD PLUNGE POOL',
      icon: 'Waves',
      reason: 'Coastal market and no existing pool — plunge pool moves the asset into the editorial photographic tier.',
      impact_label: '+€60–90/night peak ADR',
      confidence: 'HIGH',
      cta_label: 'Plan Pool Build',
      route: upgradeRoute,
      score: 88,
    });
  }

  // 3. POSITIONING ACTIONS ─────────────────────────────────────────────
  if (lo.photo_score < 65) {
    actions.push({
      label: 'RESHOOT HERO PHOTOS',
      icon: 'Camera',
      reason: `Photo score ${lo.photo_score}/100 — hero image alone drives 70% of click-through. Golden-hour reshoot.`,
      impact_label: '+9–14pp click-through',
      confidence: 'HIGH',
      cta_label: 'Visualize Concepts',
      route: visualizeRoute,
      score: 90,
    });
  }

  if (isUrban) {
    actions.push({
      label: 'TARGET DIGITAL NOMADS',
      icon: 'Laptop',
      reason: 'Urban + workspace narrative captures mid-week mid-term remote-work demand.',
      impact_label: '+8–12pp shoulder occupancy',
      confidence: 'MEDIUM',
      cta_label: 'Reposition Listing',
      route: listingRoute,
      score: 72,
    });
  }

  if (snapshot.current_occupancy_pct < 60 || (rev.occ_uplift_pp >= 12)) {
    actions.push({
      label: 'MID-TERM RENTAL HYBRID',
      icon: 'CalendarRange',
      reason: 'Occupancy gaps in shoulder season — sell 30-day blocks to floor revenue, hold STR for peak.',
      impact_label: 'Floors revenue at 65% peak',
      confidence: 'MEDIUM',
      cta_label: 'Plan Hybrid Strategy',
      route: listingRoute,
      score: 70,
    });
  }

  if (lo.amenity_gaps && lo.amenity_gaps.length >= 2) {
    actions.push({
      label: 'UPGRADE AMENITY STACK',
      icon: 'Coffee',
      reason: `${lo.amenity_gaps.length} amenity gaps detected — coffee station + linen tier are the highest-conversion fixes.`,
      impact_label: '+5–8% conversion',
      confidence: 'MEDIUM',
      cta_label: 'Build Cart',
      route: upgradeRoute,
      score: 76,
    });
  }

  if (actions.length < 3) {
    actions.push({
      label: 'GENERATE UPGRADE CART',
      icon: 'Sparkles',
      reason: 'Execution-ready scope, vendor list, and timeline — one-click activation.',
      impact_label: `+${_fmtK(annualUplift)}/yr`,
      confidence: 'MEDIUM',
      cta_label: 'Build Cart',
      route: upgradeRoute,
      score: 50,
    });
  }

  return actions
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
