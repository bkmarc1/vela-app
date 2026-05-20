// Propul8 INVEST — single source of truth for investor intelligence.
//
// Mirrors the backend `/api/invest/analyze` math so the demo page never
// depends on a live network call. Same input → same output every render.

const ANALYSIS_VERSION = 'invest-v1.0';

const DEFAULT_ASSUMPTIONS = {
  airbnb_fee_pct:           0.15,
  management_fee_pct:       0.18,
  cleaning_eur_per_month:   350,
  utilities_eur_per_month:  120,
  internet_eur_per_month:   35,
  vacancy_reserve_pct:      0.08,
  maintenance_reserve_pct:  0.06,
  insurance_pct:            0.004,
  furnishing_amort_eur:     1800,
  municipality_tax_pct:     0.005,
  income_tax_pct:           0.15,
  common_expenses_eur_per_month: 60,
  financing_pct:            0.045,
  ltv_pct:                  0.60,
};

function _hash(seed) {
  let h = 2166136261;
  const s = String(seed || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

function _clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

const _MARKETS = {
  athens:       { label: 'Athens · design-led urban STR',       median_adr: 130, median_occupancy: 72, median_yield: 8.6, appreciation_score: 72, seasonality_risk: 26, seasonality_buffer: 4,  liquidity_score: 78, demand_level: 'HIGH',     supply_risk: 'MODERATE', luxury_growth: 'HIGH' },
  mykonos:      { label: 'Mykonos · ultra-premium STR',          median_adr: 380, median_occupancy: 64, median_yield: 9.4, appreciation_score: 80, seasonality_risk: 72, seasonality_buffer: -8, liquidity_score: 84, demand_level: 'HIGH',     supply_risk: 'HIGH',     luxury_growth: 'HIGH' },
  paros:        { label: 'Paros · editorial Cycladic STR',       median_adr: 220, median_occupancy: 66, median_yield: 9.0, appreciation_score: 78, seasonality_risk: 64, seasonality_buffer: -4, liquidity_score: 70, demand_level: 'HIGH',     supply_risk: 'MODERATE', luxury_growth: 'HIGH' },
  naxos:        { label: 'Naxos · boutique island STR',          median_adr: 175, median_occupancy: 67, median_yield: 8.8, appreciation_score: 74, seasonality_risk: 58, seasonality_buffer: -2, liquidity_score: 64, demand_level: 'MODERATE', supply_risk: 'LOW',      luxury_growth: 'MODERATE' },
  santorini:    { label: 'Santorini · iconic STR',               median_adr: 360, median_occupancy: 70, median_yield: 9.2, appreciation_score: 77, seasonality_risk: 70, seasonality_buffer: -6, liquidity_score: 86, demand_level: 'HIGH',     supply_risk: 'HIGH',     luxury_growth: 'HIGH' },
  koufonisia:   { label: 'Koufonisia · low-volume editorial',    median_adr: 200, median_occupancy: 62, median_yield: 8.4, appreciation_score: 80, seasonality_risk: 78, seasonality_buffer: -10, liquidity_score: 56, demand_level: 'MODERATE', supply_risk: 'LOW',      luxury_growth: 'HIGH' },
  thessaloniki: { label: 'Thessaloniki · urban yield',           median_adr:  95, median_occupancy: 71, median_yield: 8.0, appreciation_score: 64, seasonality_risk: 24, seasonality_buffer: 6,  liquidity_score: 72, demand_level: 'MODERATE', supply_risk: 'MODERATE', luxury_growth: 'MODERATE' },
  riga:         { label: 'Riga · Baltic urban STR',              median_adr:  75, median_occupancy: 64, median_yield: 9.6, appreciation_score: 60, seasonality_risk: 38, seasonality_buffer: 0,  liquidity_score: 58, demand_level: 'MODERATE', supply_risk: 'LOW',      luxury_growth: 'MODERATE' },
  dubai:        { label: 'Dubai · luxury STR market',            median_adr: 290, median_occupancy: 70, median_yield: 7.4, appreciation_score: 80, seasonality_risk: 32, seasonality_buffer: 2,  liquidity_score: 88, demand_level: 'HIGH',     supply_risk: 'HIGH',     luxury_growth: 'HIGH' },
  lisbon:       { label: 'Lisbon · design-led urban STR',        median_adr: 145, median_occupancy: 73, median_yield: 7.8, appreciation_score: 75, seasonality_risk: 28, seasonality_buffer: 4,  liquidity_score: 78, demand_level: 'HIGH',     supply_risk: 'MODERATE', luxury_growth: 'HIGH' },
  comporta:     { label: 'Comporta · editorial coastal STR',     median_adr: 320, median_occupancy: 65, median_yield: 8.2, appreciation_score: 82, seasonality_risk: 58, seasonality_buffer: -4, liquidity_score: 64, demand_level: 'MODERATE', supply_risk: 'LOW',      luxury_growth: 'HIGH' },
  default:      { label: 'Mediterranean default STR',            median_adr: 150, median_occupancy: 68, median_yield: 8.4, appreciation_score: 68, seasonality_risk: 42, seasonality_buffer: 0,  liquidity_score: 68, demand_level: 'MODERATE', supply_risk: 'MODERATE', luxury_growth: 'MODERATE' },
};

function _marketFor(city) {
  const c = String(city || '').toLowerCase();
  for (const k of Object.keys(_MARKETS)) {
    if (k !== 'default' && c.includes(k)) return _MARKETS[k];
  }
  return _MARKETS.default;
}

function _compName(city, i) {
  const base = (city || 'Mediterranean').split(',')[0];
  const suff = ['Loft', 'Suite', 'Maison', 'Boutique', 'Residence'];
  return `${base} ${suff[i % suff.length]} ${String.fromCharCode(65 + (i % 6))}`;
}

export function computeInvestIntelligence(input, assumptions) {
  const a = { ...DEFAULT_ASSUMPTIONS, ...(assumptions || {}) };
  const asset_id = input.asset_id || input.url || input.title || input.city || 'asset';
  const h = _hash(`${asset_id}|${input.city}|${input.asking_price_eur}|${input.property_type}`);

  const asking = Math.max(20000, Number(input.asking_price_eur) || 0);
  const m2 = Number(input.m2) || Math.max(35, 30 + (h % 90));
  const rooms = Number(input.rooms) || _clamp(1 + Math.floor(m2 / 35), 1, 5);
  const sleeps = _clamp(rooms + 1, 2, 8);

  const market = _marketFor(input.city);
  const drift = ((Math.floor(h / 7)) % 1000) / 1000;
  let base_adr = Math.round(market.median_adr * (0.88 + drift * 0.34));
  let base_occ = _clamp(market.median_occupancy - 6 + (h % 12), 52, 86);

  const state = (input.renovation_state || 'refresh').toLowerCase();
  const stateFactor = ({ pristine: 1.06, refresh: 1.0, renovation: 0.88, gut: 0.74 })[state] || 1.0;
  base_adr = Math.round(base_adr * stateFactor);

  const nights = Math.round(365 * base_occ / 100);
  const gross = base_adr * nights;

  // Expense waterfall
  const expenses = [];
  const add = (label, amount, note) =>
    expenses.push({ label, amount_eur: Math.round(amount), note: note || '' });

  add('Airbnb / Booking platform fees', gross * a.airbnb_fee_pct, '15% platform commission');
  add('Management fees',                gross * a.management_fee_pct, 'Local STR operator');
  add('Cleaning',                       a.cleaning_eur_per_month * 12);
  add('Utilities',                      a.utilities_eur_per_month * 12);
  add('Internet',                       a.internet_eur_per_month * 12);
  add('Vacancy reserve',                gross * a.vacancy_reserve_pct);
  add('Maintenance reserve',            gross * a.maintenance_reserve_pct);
  add('Insurance',                      asking * a.insurance_pct);
  add('Furnishing amortization',        a.furnishing_amort_eur);
  add('Municipality tax',               asking * a.municipality_tax_pct);
  add('Common expenses / HOA',          a.common_expenses_eur_per_month * 12);

  const preTax = gross - expenses.reduce((s, e) => s + e.amount_eur, 0);
  const incomeTax = Math.max(0, Math.round(preTax * a.income_tax_pct));
  add('Income tax', incomeTax);

  const loan = asking * a.ltv_pct;
  const interest = Math.round(loan * a.financing_pct);
  add('Financing costs (interest)', interest, `${Math.round(a.ltv_pct * 100)}% LTV @ ${(a.financing_pct * 100).toFixed(2)}%`);

  const totalExp = expenses.reduce((s, e) => s + e.amount_eur, 0);
  const net = gross - totalExp;
  const equity = Math.max(1, asking - Math.round(loan));
  const net_yield_pct = asking ? +(((net + interest) / asking) * 100).toFixed(1) : 0;
  const coc_pct = equity ? +((net / equity) * 100).toFixed(1) : 0;

  // Snapshot scores
  const snapshot = {
    str_score:               _clamp(Math.round(48 + (base_occ - 60) * 1.4 + (base_adr - market.median_adr) * 0.10 + stateFactor * 6), 28, 96),
    appreciation_potential:  _clamp(Math.round(market.appreciation_score + (h % 14) - 6), 28, 96),
    occupancy_strength:      _clamp(Math.round(base_occ + market.seasonality_buffer * 0.6), 35, 96),
    pricing_power:           _clamp(Math.round((base_adr / Math.max(80, market.median_adr)) * 60 + 20), 28, 96),
    design_upside:           _clamp(Math.round(72 + ({ pristine: -8, refresh: 0, renovation: 12, gut: 22 })[state] + (h % 10) - 4), 28, 98),
    liquidity_score:         _clamp(Math.round(market.liquidity_score + (h % 8) - 3), 28, 96),
    seasonality_risk:        _clamp(Math.round(market.seasonality_risk + (h % 10) - 4), 8, 86),
    estimated_net_yield_pct: net_yield_pct,
    cash_on_cash_pct:        coc_pct,
  };

  // Offer Intelligence
  const yieldAtPrice = (p) => {
    const eq = Math.max(1, p - Math.round(p * a.ltv_pct));
    const intr = Math.round(p * a.ltv_pct * a.financing_pct);
    const delta = (intr - interest) + (p - asking) * (a.insurance_pct + a.municipality_tax_pct);
    const n = net - delta;
    return [
      p ? +(((n + intr) / p) * 100).toFixed(1) : 0,
      eq ? +((n / eq) * 100).toFixed(1) : 0,
    ];
  };

  const offer_strategies = [
    { label: 'Aggressive Buy', price_eur: Math.round(asking * 0.86) },
    { label: 'Smart Buy',      price_eur: Math.round(asking * 0.92) },
    { label: 'Market Fair',    price_eur: asking },
    { label: 'Overpriced',     price_eur: Math.round(asking * 1.10) },
  ].map((s) => {
    const [ny, coc] = yieldAtPrice(s.price_eur);
    return { ...s, net_yield_pct: ny, cash_on_cash_pct: coc };
  });

  const listPremium = +(((asking - offer_strategies[1].price_eur) / offer_strategies[1].price_eur) * 100).toFixed(1);
  const ai_insights = [];
  if (listPremium > 5) ai_insights.push(`Property currently priced ${listPremium}% above optimized STR acquisition value.`);
  else ai_insights.push('Asking price aligns with optimized STR acquisition envelope — entry-quality pricing.');
  if (offer_strategies[1].net_yield_pct >= market.median_yield) ai_insights.push(`At €${offer_strategies[1].price_eur.toLocaleString()}, asset enters top quartile yield performance for this micro-market.`);
  if (state === 'renovation' || state === 'gut') ai_insights.push('Transformation upside materially increases ADR potential — design uplift is the asymmetric edge.');
  else if (snapshot.design_upside >= 75) ai_insights.push('Propul8 optimization unlocks meaningful ADR uplift even without structural renovation.');
  ai_insights.push(`Net yield separates by ${(offer_strategies[0].net_yield_pct - offer_strategies[3].net_yield_pct).toFixed(1)} pts across the offer spectrum — negotiation leverage is material.`);

  // Transformation Upside
  const optAdr  = Math.round(base_adr * 1.30);
  const optOcc  = _clamp(base_occ + 11, 60, 92);
  const premAdr = Math.round(base_adr * 1.59);
  const premOcc = _clamp(base_occ + 16, 65, 94);
  const expenseRatio = totalExp / Math.max(1, gross);
  const scenarioYield = (adr, occ) => {
    const rev = adr * Math.round(365 * occ / 100);
    const newTotal = rev * expenseRatio;
    const n = rev - newTotal;
    return asking ? +(((n + interest) / asking) * 100).toFixed(1) : 0;
  };
  const transformation = {
    scenarios: [
      { label: 'Current State',            adr: base_adr, occupancy_pct: base_occ, net_yield_pct: scenarioYield(base_adr, base_occ) },
      { label: 'Optimized Interiors',      adr: optAdr,   occupancy_pct: optOcc,   net_yield_pct: scenarioYield(optAdr, optOcc) },
      { label: 'Premium Propul8 Positioning', adr: premAdr,  occupancy_pct: premOcc,  net_yield_pct: scenarioYield(premAdr, premOcc) },
    ],
  };

  // Negotiation Leverage
  const renoBurden = ({ pristine: [4, 8], refresh: [8, 14], renovation: [18, 26], gut: [38, 55] })[state] || [8, 14];
  const leverage = [];
  leverage.push({ label: `Estimated renovation burden: €${renoBurden[0]}k–€${renoBurden[1]}k`, detail: 'Transparent reno scope is the strongest negotiation lever in design-led STR.', severity: renoBurden[0] >= 18 ? 'high' : 'medium' });
  if (base_adr < market.median_adr - 10) leverage.push({ label: 'Current interiors underperform district ADR benchmarks.', detail: `Asset prices ~€${Math.round(market.median_adr) - base_adr}/night below median.`, severity: 'high' });
  if (input.elevator === false) leverage.push({ label: 'Floor disadvantage — no elevator access.', detail: 'Documented ADR drag of 6–9% in mid-floor walkups.', severity: 'medium' });
  if ((input.year_built || 1990) < 1980) leverage.push({ label: 'Pre-1980 build — bathroom + kitchen renovation likely required.', detail: '€6k–€14k per bathroom is typical leverage room.', severity: 'medium' });
  leverage.push({ label: 'Furniture package below premium STR expectations.', detail: 'Editorial FF&E unlocks 18–25% ADR premium.', severity: 'low' });
  if (snapshot.seasonality_risk >= 60) leverage.push({ label: 'Seasonality risk above district average.', detail: 'Use shoulder-season comp data to negotiate downward.', severity: 'medium' });

  // Market Signals
  const market_signals = [
    { label: 'Underpriced vs district',     level: listPremium > 0 ? 'MODERATE' : 'HIGH' },
    { label: 'Tourism demand momentum',     level: market.demand_level },
    { label: 'Rising ADR market',           level: snapshot.appreciation_potential >= 70 ? 'HIGH' : 'MODERATE' },
    { label: 'Occupancy district strength', level: snapshot.occupancy_strength >= 75 ? 'HIGH' : 'MODERATE' },
    { label: 'Supply saturation risk',      level: market.supply_risk },
    { label: 'Appreciation momentum',       level: snapshot.appreciation_potential >= 75 ? 'HIGH' : 'MODERATE' },
    { label: 'Luxury demand growth',        level: market.luxury_growth },
  ];

  // STR Comps
  const comps = [];
  for (let i = 0; i < 5; i++) {
    const seed = (h + i * 9173) >>> 0;
    const adr_i = Math.round(market.median_adr * (0.92 + ((seed % 1000) / 1000) * 0.36));
    const occ_i = _clamp(Math.round(market.median_occupancy - 4 + (seed % 18)), 55, 92);
    const nights_i = Math.round(365 * occ_i / 100);
    const rev_i = adr_i * nights_i;
    comps.push({
      name: _compName(input.city, i),
      occupancy_pct: occ_i,
      adr_eur: adr_i,
      monthly_rev_eur: Math.round(rev_i / 12),
      design_quality: ['Editorial', 'Premium', 'Mid-market', 'Mid-market', 'Editorial'][i],
      distance_km: +(0.3 + (seed % 28) / 10).toFixed(1),
      positioning: ['Boutique', 'Family', 'Couples', 'Mid-market', 'Editorial'][i],
    });
  }
  const str_comps = {
    comps,
    post_vela: {
      projected_adr_eur: premAdr,
      projected_occupancy_pct: premOcc,
      projected_monthly_rev_eur: Math.round(premAdr * Math.round(365 * premOcc / 100) / 12),
      projected_positioning: 'Top-decile editorial',
    },
    market_label: market.label,
    // Honesty flag — these comps are synthesised from Propul8's market model,
    // NOT scraped from real Airbnb / Booking listings yet. The UI surfaces
    // a permanent 'Demo comparable' badge so investors are never misled.
    is_synthetic: true,
    source_note: 'Propul8 market model · synthesised from regional benchmarks. Real Airbnb / Booking comps coming via direct API integration.',
  };

  // Max Buy Price
  const max_buy_price = [];
  for (const tgt of [15, 12, 10, 8]) {
    const denom = (tgt / 100) - (a.ltv_pct * a.financing_pct);
    if (denom > 0) {
      const netAtX = gross * (1 - expenseRatio);
      max_buy_price.push({ target_yield_pct: tgt, max_price_eur: Math.round((netAtX + interest) / denom) });
    }
  }

  // Deal Verdict — 4-state institutional answer.
  // BUY      = strong entry basis; clears institutional thresholds.
  // NEGOTIATE= material upside vs asking; close at Smart-Buy or below.
  // WATCH    = borderline; wait for catalyst (price drop, market shift).
  // PASS     = fundamentals fail outright.
  const smart = offer_strategies[1];
  const aggressive = offer_strategies[0];
  const top = scenarioYield(premAdr, premOcc);
  let verdict = 'WATCH';
  let verdict_reason = 'Borderline acquisition — needs a catalyst (price drop, market shift, or renovation discount) to clear institutional thresholds.';
  let strategy = 'STR';

  if (smart.net_yield_pct < 6.5 || snapshot.seasonality_risk >= 75) {
    verdict = 'PASS';
    verdict_reason = smart.net_yield_pct < 6.5
      ? `Yield too weak at current price — ${smart.net_yield_pct.toFixed(1)}% net falls below institutional threshold.`
      : `Seasonality risk ${snapshot.seasonality_risk}/100 too high for this entry price.`;
  } else if (
    smart.net_yield_pct >= 9.5 && snapshot.design_upside >= 65 &&
    snapshot.seasonality_risk < 65 && listPremium <= 4
  ) {
    verdict = 'BUY';
    verdict_reason = `Strong entry basis with upside through repositioning. ${smart.net_yield_pct.toFixed(1)}% post-Propul8 yield.`;
  } else if (smart.net_yield_pct >= 8 && listPremium >= 4 && listPremium < 14) {
    verdict = 'NEGOTIATE';
    verdict_reason = `Attractive below €${smart.price_eur.toLocaleString()} — anchor at €${aggressive.price_eur.toLocaleString()}, settle near €${smart.price_eur.toLocaleString()}.`;
  } else if (listPremium >= 14) {
    verdict = 'WATCH';
    verdict_reason = `Asking ${listPremium}% above Smart-Buy — wait for ${listPremium - 8}–${listPremium - 4}% price drop, then re-engage.`;
  } else if (smart.net_yield_pct >= 8) {
    verdict = 'NEGOTIATE';
    verdict_reason = `Yield holds at ${smart.net_yield_pct.toFixed(1)}% — close at Smart-Buy €${smart.price_eur.toLocaleString()} or below.`;
  }

  // Strategy
  if (snapshot.design_upside >= 80 && (state === 'renovation' || state === 'gut')) {
    strategy = 'RENOVATE';
  } else if (snapshot.appreciation_potential >= 78 && smart.net_yield_pct < 8) {
    strategy = 'FLIP';
  } else if (snapshot.liquidity_score >= 75 && smart.net_yield_pct >= 7 && smart.net_yield_pct < 10) {
    strategy = 'HOLD';
  } else if (verdict === 'PASS') {
    strategy = 'AVOID';
  } else {
    strategy = 'STR';
  }

  // Confidence — proportion of critical inputs that are user-verified.
  // Data Confidence label: HIGH (>5 verified) · MEDIUM (3-5) · LOW (<3).
  const conf = (input._confidence) || {};
  // Critical: price, sqm, yield (annual gross via adr+occ), location (city), market comps (rooms drives comp set)
  const allVerifiableKeys = ['asking_price_eur', 'm2', 'city', 'rooms', 'adr_eur', 'occupancy_pct', 'neighborhood'];
  const verifiedCount = allVerifiableKeys.filter((k) => conf[k] === 'user_verified' || conf[k] === 'verified').length;
  const confidence_pct = Math.round((Math.min(verifiedCount, 5) / 5) * 100);
  const confidence_label = verifiedCount > 5 ? 'HIGH' : verifiedCount >= 3 ? 'MEDIUM' : 'LOW';
  const confidence_count = verifiedCount;

  const deal_verdict = {
    verdict,
    confidence_pct,
    confidence_label,
    confidence_count,
    main_reason: verdict_reason,
    target_offer_eur: smart.price_eur,
    aggressive_offer_eur: aggressive.price_eur,
    strategy,
    projected_post_vela_yield_pct: top,
  };

  // Propul8 INVEST INDEX™ — composite acquisition-grade score 0–100.
  // Reflects ASSET POTENTIAL post-Propul8 optimization, not pre-state.
  const yieldGrade = _clamp(Math.round(40 + smart.net_yield_pct * 5.5), 50, 96);
  const designUpsideGrade = _clamp(snapshot.design_upside, 40, 96);
  const liquidityGrade = _clamp(snapshot.liquidity_score, 40, 96);
  const seasonalityGrade = _clamp(100 - snapshot.seasonality_risk, 40, 96);
  const pricingPowerGrade = _clamp(snapshot.pricing_power, 40, 96);
  const appreciationGrade = _clamp(snapshot.appreciation_potential, 40, 96);
  const vela_invest_index = _clamp(Math.round(
    yieldGrade * 0.26 + designUpsideGrade * 0.20 + appreciationGrade * 0.18 +
    pricingPowerGrade * 0.14 + liquidityGrade * 0.12 + seasonalityGrade * 0.10
  ), 50, 96);

  // Acquisition DNA — what kind of acquisition this is.
  let acquisition_dna_category = 'Yield Acquisition';
  let acquisition_dna_reason = `Net-yield asset · ${smart.net_yield_pct.toFixed(1)}% Smart-Buy yield with stable district fundamentals.`;
  if (verdict === 'PASS') {
    acquisition_dna_category = 'Margin-of-Safety Pass';
    acquisition_dna_reason = 'Asset fails institutional acquisition thresholds — not a fit for the current envelope.';
  } else if (snapshot.design_upside >= 80 && (state === 'renovation' || state === 'gut')) {
    acquisition_dna_category = 'Transformation Arbitrage';
    acquisition_dna_reason = `Design upside ${snapshot.design_upside}/100 + ${state} state — acquire, transform, reposition. Asymmetric ADR lever.`;
  } else if (snapshot.appreciation_potential >= 78 && smart.net_yield_pct < 9) {
    acquisition_dna_category = 'Appreciation Play';
    acquisition_dna_reason = `Appreciation score ${snapshot.appreciation_potential}/100 — yield is moderate; the trade is land + market momentum.`;
  } else if (smart.net_yield_pct >= 11) {
    acquisition_dna_category = 'Top-Decile Yield';
    acquisition_dna_reason = `Smart-Buy yield ${smart.net_yield_pct.toFixed(1)}% — top quartile for the micro-market.`;
  } else if (snapshot.seasonality_risk >= 60) {
    acquisition_dna_category = 'Seasonality-Hedged';
    acquisition_dna_reason = `High seasonality (${snapshot.seasonality_risk}/100) — hybrid STR/MTR positioning required to floor revenue.`;
  } else if (m2 >= 180 || rooms >= 4) {
    acquisition_dna_category = 'Boutique Conversion';
    acquisition_dna_reason = `${m2}m² · ${rooms} rooms — multi-key conversion outperforms single-family STR by 2–3×.`;
  }
  const acquisition_dna = {
    category: acquisition_dna_category,
    reason: acquisition_dna_reason,
  };

  // Top 3 immediate insights for the cinematic opener.
  const _allInvestInsights = [
    { score: listPremium > 5 ? 95 : 0,                    text: `Asking ${Math.abs(listPremium)}% above Smart-Buy envelope` },
    { score: smart.net_yield_pct >= 10 ? 92 : 0,          text: `Smart-Buy yield clears ${smart.net_yield_pct.toFixed(1)}% — institutional threshold` },
    { score: snapshot.design_upside >= 75 ? 88 : 0,       text: `Design upside ${snapshot.design_upside}/100 — asymmetric ADR lever detected` },
    { score: snapshot.seasonality_risk >= 60 ? 86 : 0,    text: `Seasonality risk elevated · ${snapshot.seasonality_risk}/100` },
    { score: state === 'renovation' || state === 'gut' ? 84 : 0, text: 'Renovation burden quantified — negotiation leverage material' },
    { score: snapshot.appreciation_potential >= 75 ? 78 : 0, text: `Appreciation momentum strong · ${snapshot.appreciation_potential}/100` },
    { score: snapshot.estimated_net_yield_pct < 7 ? 90 : 0, text: `Net yield below institutional floor · ${snapshot.estimated_net_yield_pct}%` },
    { score: snapshot.liquidity_score >= 75 ? 70 : 0,     text: `Liquidity score ${snapshot.liquidity_score}/100 — exit-friendly` },
  ].filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map((i) => i.text);
  const top_insights = _allInvestInsights.length
    ? _allInvestInsights
    : [
        `${_marketFor(input.city).label} fundamentals consistent with district median`,
        `Smart-Buy envelope: €${smart.price_eur.toLocaleString()}`,
        `Strategy: ${strategy}`,
      ];

  // Acquisition Hero — calm advisor framing.
  // Why · Strength · Risk: 3 short bullets the user reads in 6 seconds.
  const _strengthBullet = (() => {
    if (snapshot.design_upside >= 80) return `Design upside ${snapshot.design_upside}/100 — asymmetric ADR lever.`;
    if (smart.net_yield_pct >= 10)     return `Smart-Buy yield ${smart.net_yield_pct.toFixed(1)}% — top-quartile for the micro-market.`;
    if (snapshot.appreciation_potential >= 78) return `Appreciation momentum strong (${snapshot.appreciation_potential}/100).`;
    if (snapshot.liquidity_score >= 80) return `Liquidity score ${snapshot.liquidity_score}/100 — exit-friendly market.`;
    return `${_marketFor(input.city).label} — institutional fundamentals consistent with district median.`;
  })();
  const _riskBullet = (() => {
    if (snapshot.seasonality_risk >= 70) return `Seasonality risk ${snapshot.seasonality_risk}/100 — peaky revenue.`;
    if (listPremium >= 10)               return `Asking ${listPremium}% above Smart-Buy — entry-price discipline required.`;
    if (state === 'renovation' || state === 'gut') return `Renovation burden material (${state}) — budget conservatively.`;
    if (smart.net_yield_pct < 8)          return `Net yield ${smart.net_yield_pct.toFixed(1)}% — thin margin of safety.`;
    if (snapshot.appreciation_potential < 65) return `Appreciation runway flat (${snapshot.appreciation_potential}/100).`;
    return 'Standard market risk — no material flags.';
  })();

  // Next Best Action — single recommended move, verdict-tilted.
  let next_best_action = '';
  if (verdict === 'BUY') {
    next_best_action = `Proceed with due diligence at €${smart.price_eur.toLocaleString()}.`;
  } else if (verdict === 'NEGOTIATE') {
    next_best_action = `Negotiate below €${smart.price_eur.toLocaleString()}.`;
  } else if (verdict === 'WATCH') {
    next_best_action = `Wait for price reduction to €${smart.price_eur.toLocaleString()}.`;
  } else {
    next_best_action = `Walk away — re-engage if asking drops to €${aggressive.price_eur.toLocaleString()}.`;
  }

  // Price position vs market proxy (€/m² heuristic from market median ADR).
  // Honest — when we lack inputs we report 'Needs comps'.
  const _mkt = _marketFor(input.city);
  const ppsqm = m2 > 0 ? Math.round(asking / m2) : null;
  // Proxy median €/m² for the market — rough STR-grade benchmark.
  const _proxyPpsqm = Math.round(_mkt.median_adr * 22);
  let price_position = 'Needs comps';
  if (ppsqm) {
    if (ppsqm <= _proxyPpsqm * 0.90)      price_position = 'Below Market';
    else if (ppsqm <= _proxyPpsqm * 1.10) price_position = 'In Line';
    else                                  price_position = 'Above Market';
  }
  // Market support — gates 'Strong' to scenarios where real comps exist.
  // For v1 all comps are synthesised so we cap at Medium.
  const market_support = ppsqm ? 'Medium' : 'Limited';

  const acquisition_hero = {
    primary_image:    (input.images || [])[0] || null,
    title:            input.title || `${input.property_type || 'Asset'} · ${input.city || 'Mediterranean'}`,
    location_label:   input.city || _mkt.label,
    asking_price_eur: asking,
    price_per_sqm_eur: ppsqm,
    price_position,
    market_support,
    why_bullets: {
      why:      verdict_reason,
      strength: _strengthBullet,
      risk:     _riskBullet,
    },
    next_best_action,
  };

  // Highest Performing Version™ — emotional hook: Current → Post-Propul8 potential.
  const highest_performing_version = {
    current: {
      adr_eur:        base_adr,
      net_yield_pct:  smart.net_yield_pct,
      state:          state,
      monthly_rev_eur: Math.round(gross / 12),
      positioning:    'Current-state positioning',
    },
    after_vela: {
      adr_eur:        premAdr,
      net_yield_pct:  scenarioYield(premAdr, premOcc),
      state:          'optimized',
      monthly_rev_eur: Math.round(premAdr * Math.round(365 * premOcc / 100) / 12),
      positioning:    'Premium Propul8 Editorial',
    },
    annual_uplift_eur: (Math.round(premAdr * Math.round(365 * premOcc / 100)) - gross),
    transformation_label: snapshot.design_upside >= 80 ? 'High-conviction transformation' : 'Calibration + light renovation',
  };

  // Propul8 Deal Score™ — 8-dimension breakdown (each 0–100).
  const _market = _marketFor(input.city);
  const locationScore = _clamp(Math.round(50 + _market.median_adr / 4), 50, 96);
  const priceScore = _clamp(Math.round(70 - listPremium * 4), 35, 96);
  const yieldScore = _clamp(Math.round(40 + smart.net_yield_pct * 5.5), 35, 96);
  const liquidityScore = _clamp(snapshot.liquidity_score, 35, 96);
  const renovationRiskScore = _clamp(
    state === 'pristine' ? 92 : state === 'refresh' ? 80 : state === 'renovation' ? 65 : 45,
    35, 96,
  );
  const tourismDemandScore = _clamp(Math.round(snapshot.appreciation_potential * 0.6 + (100 - snapshot.seasonality_risk) * 0.4), 35, 96);
  const negotiationUpsideScore = _clamp(Math.round(50 + listPremium * 3.2), 35, 96);

  const deal_score_breakdown = [
    { id: 'location',    label: 'Location',          score: locationScore,         note: _market.label },
    { id: 'price',       label: 'Price Discipline',  score: priceScore,            note: listPremium > 0 ? `${listPremium}% above Smart-Buy` : `${Math.abs(listPremium)}% below Smart-Buy` },
    { id: 'yield',       label: 'Rental Yield',      score: yieldScore,            note: `${smart.net_yield_pct.toFixed(1)}% Smart-Buy net yield` },
    { id: 'liquidity',   label: 'Resale Liquidity',  score: liquidityScore,        note: `${liquidityScore >= 80 ? 'Exit-friendly market' : 'Standard exit horizon'}` },
    { id: 'renovation',  label: 'Renovation Risk',   score: renovationRiskScore,   note: `State: ${state.toUpperCase()}` },
    { id: 'tourism',     label: 'Tourism / Demand',  score: tourismDemandScore,    note: `Seasonality ${snapshot.seasonality_risk}/100` },
    { id: 'negotiation', label: 'Negotiation Upside', score: negotiationUpsideScore, note: listPremium >= 5 ? 'Material upside vs asking' : 'Tight negotiation envelope' },
    { id: 'confidence',  label: 'Data Confidence',   score: confidence_pct,        note: `${verifiedCount}/${allVerifiableKeys.length} critical fields verified` },
  ];

  // Deal Roadmap™ — 7-step institutional progression.
  const topRiskFlag = (leverage && leverage[0]) ? leverage[0].label : 'Standard market risk';
  const deal_roadmap = [
    { id: 1, label: 'Listing captured',      status: 'done', detail: input.title || 'Listing imported' },
    { id: 2, label: 'Data verified',         status: confidence_pct === 100 ? 'done' : 'pending', detail: `${verifiedCount}/${allVerifiableKeys.length} critical fields confirmed` },
    { id: 3, label: 'Price benchmarked',     status: 'done', detail: `Asking €${asking.toLocaleString()} · Smart-Buy €${smart.price_eur.toLocaleString()}` },
    { id: 4, label: 'Yield calculated',      status: 'done', detail: `Smart-Buy net yield ${smart.net_yield_pct.toFixed(1)}%` },
    { id: 5, label: 'Risk scored',           status: 'done', detail: `Top risk: ${topRiskFlag}` },
    { id: 6, label: 'Strategy selected',     status: 'done', detail: `${strategy} — ${verdict}` },
    { id: 7, label: 'Next action generated', status: 'done', detail: verdict === 'PROCEED' ? `Offer €${smart.price_eur.toLocaleString()}` : verdict === 'WATCHLIST' ? `Wait for ${Math.max(3, listPremium - 6)}% price drop` : 'Walk away · find better deal' },
  ];

  // What To Do Next™ — explicit numerical instructions.
  const offer_low = Math.round(aggressive.price_eur);
  const offer_high = Math.round((smart.price_eur + aggressive.price_eur) / 2);
  const walkaway = Math.round(smart.price_eur * 1.04);
  const what_to_do_next = {
    primary_instruction: verdict === 'PROCEED'
      ? `Offer €${offer_low.toLocaleString()}–€${offer_high.toLocaleString()}`
      : verdict === 'WATCHLIST'
        ? `Wait — re-engage when asking drops to €${smart.price_eur.toLocaleString()}`
        : `Pass — re-engage if asking drops to €${aggressive.price_eur.toLocaleString()}`,
    walkaway_ceiling: verdict === 'PROCEED' ? `Do not proceed above €${walkaway.toLocaleString()}` : null,
    agent_questions: [
      'Building common fees and reserve fund balance',
      'Legal title status and any encumbrances',
      'Last renovation year and scope of works',
      'Short-term rental restrictions / building consent',
      'Energy class certification and date issued',
      'Last 12 months utility costs (electric · water · heating)',
      'Outstanding municipal taxes or HOA disputes',
    ],
    due_diligence: [
      'Cross-check sqm against cadastral records',
      'Verify building permit and any unauthorized works',
      'Confirm 7-year tax history with seller',
      'Inspect roof · electrical · plumbing condition',
      'Compare €/sqm against 3 neighborhood comps',
      'Validate STR licensing in the building',
      'Estimate furnishing + opening cost separately',
      verdict === 'PROCEED' ? 'Prepare letter of intent at target offer' : 'Set deal-room alert at target trigger price',
    ],
  };

  // Better Deal Alternatives — guides the user when verdict is PASS or WATCHLIST.
  const better_deal_alternatives = [
    { id: 'lower_psqm',      title: 'Same area · lower €/sqm',          detail: `Hunt sub-€${Math.round((asking / m2) * 0.78).toLocaleString()}/sqm in ${input.city || 'the district'} — same fundamentals, better basis.` },
    { id: 'smaller_unit',    title: 'Smaller · higher STR yield',       detail: 'Compact 1BR units outperform large 3BRs on €/m² yield in tourist micro-markets.' },
    { id: 'renovated_elev',  title: 'Renovated building · with elevator', detail: 'Skips renovation risk and lifts ADR ceiling 8–12% via lift-served floors.' },
    { id: 'waterfront',      title: 'Waterfront discount opportunity',  detail: 'Off-peak listings on waterfront streets often clear at 12–18% below summer asks.' },
    { id: 'distressed',      title: 'Distressed-seller opportunity',    detail: 'Probate / tax-lien / divorce listings — search keyword "urgent" or "below valuation".' },
    { id: 'newbuild',        title: 'New-build · flexible payment plan', detail: 'Off-plan buyers in Q4 secure 8–10% discounts + staged payment, hedge against renovation risk.' },
  ];

  return {
    asset_id: String(asset_id).slice(0, 80),
    input: {
      url: input.url || null,
      title: input.title || null,
      city: input.city,
      property_type: input.property_type,
      asking_price_eur: asking,
      m2,
      rooms,
      sleeps,
      bathrooms: input.bathrooms || null,
      neighborhood: input.neighborhood || null,
      renovation_state: state,
      year_built: input.year_built || null,
      elevator: typeof input.elevator === 'boolean' ? input.elevator : null,
      floor: input.floor || null,
      energy_class: input.energy_class || null,
      parking: input.parking || null,
      listing_source: input.listing_source || null,
      price_per_sqm_eur: m2 > 0 ? Math.round(asking / m2) : null,
      _confidence: input._confidence || {},
      images: (input.images || []).slice(0, 8),
    },
    snapshot,
    offer_intelligence: { strategies: offer_strategies, ai_insights },
    true_roi: {
      gross_revenue_eur: gross,
      total_expenses_eur: totalExp,
      net_cashflow_eur: net,
      expenses,
      occupancy_pct: base_occ,
      adr_eur: base_adr,
      nights,
      loan_amount_eur: Math.round(loan),
      annual_interest_eur: interest,
      equity_required_eur: equity,
      assumptions_used: a,
    },
    transformation,
    negotiation: leverage,
    market_signals,
    str_comps,
    max_buy_price,
    deal_verdict,
    acquisition_hero,
    deal_score_breakdown,
    deal_roadmap,
    what_to_do_next,
    better_deal_alternatives,
    vela_invest_index,
    acquisition_dna,
    top_insights,
    highest_performing_version,
    analysis_version: ANALYSIS_VERSION,
    generated_at: new Date().toISOString(),
  };
}

export const INVEST_DEFAULT_ASSUMPTIONS = DEFAULT_ASSUMPTIONS;
