// Propul8 · Portfolio Intelligence — deterministic financial engine.
//
// All numerics on the Portfolio Intelligence cockpit are derived from this
// single file. AI signals (Claude Sonnet 4.5) live in the backend; numbers
// live here so the frontend is fast and never lies.

// ─── Core financial primitives ────────────────────────────────────────

export function equityGain(purchase, current) {
  if (!purchase || !current) return null;
  return current - purchase;
}

export function equityGainPct(purchase, current) {
  if (!purchase || purchase <= 0 || !current) return null;
  return ((current - purchase) / purchase) * 100;
}

export function yieldOnCost(annualGross, purchase) {
  if (!purchase || purchase <= 0 || !annualGross) return null;
  return (annualGross / purchase) * 100;
}

export function yieldOnCurrentValue(annualNet, currentValue) {
  if (!currentValue || currentValue <= 0 || !annualNet) return null;
  return (annualNet / currentValue) * 100;
}

export function estimatedSaleCosts(currentValue, mortgageBalance = 0) {
  if (!currentValue) return 0;
  // Greek standard: ~4% transfer + ~3% broker + ~1% legal/notary
  const transactionCost = currentValue * 0.04;
  const brokerFee       = currentValue * 0.03;
  const legalFee        = currentValue * 0.01;
  // No early-mortgage fee here (most modern GR mortgages don't penalize).
  return Math.round(transactionCost + brokerFee + legalFee);
}

export function netProceedsIfSold(currentValue, mortgageBalance = 0) {
  if (!currentValue) return null;
  return Math.round(currentValue - estimatedSaleCosts(currentValue) - (mortgageBalance || 0));
}


// ─── Scoring system (0–100) ───────────────────────────────────────────

export function digitalAssetScore(asset) {
  const inc = incomeStrengthScore(asset);
  const app = capitalAppreciationScore(asset);
  const liq = liquidityScoreRaw(asset);
  const dem = locationDemandScore(asset);
  const sel = sellReadinessScore(asset);
  const mgr = managementQualityScore(asset);
  // weighted: 25% income, 20% appreciation, 15% liquidity, 15% location demand,
  // 15% sell readiness, 10% management
  return Math.round(
    inc * 0.25 + app * 0.20 + liq * 0.15 + dem * 0.15 + sel * 0.15 + mgr * 0.10
  );
}

export function incomeStrengthScore(asset) {
  const yoc = yieldOnCost(asset.annual_gross_eur, asset.purchase_price_eur) || 0;
  // 8% YOC → 95, 5% → 65, 3% → 40
  const score = Math.min(100, Math.max(0, 25 + yoc * 10));
  return Math.round(score);
}

export function capitalAppreciationScore(asset) {
  const pct = equityGainPct(asset.purchase_price_eur, asset.current_value_eur) || 0;
  // +20% in 1y → 95, +10% → 75, 0% → 50, -10% → 25
  const score = Math.min(100, Math.max(0, 50 + pct * 2.5));
  return Math.round(score);
}

export function liquidityScoreRaw(asset) {
  // Heuristic by location + asset type. Real model would consume AirDNA
  // + comparable-sale velocity from Apify. Mocked but deterministic.
  const cityHeat = {
    'athens':     85, 'koukaki': 88, 'glyfada': 82, 'piraeus': 78, 'plaka': 92,
    'syros': 70, 'tinos': 65, 'mykonos': 86, 'paros': 80, 'koufonisia': 62,
    'lisbon': 80, 'porto': 72, 'comporta': 68,
    'dubai': 88, 'meydan': 84,
    'riga': 64,
  };
  const cityKey = (asset.city || '').toLowerCase().split(',')[0].trim();
  const baseHeat = cityHeat[cityKey] || 60;
  const neigh = (asset.neighborhood || '').toLowerCase();
  const neighBoost = Object.keys(cityHeat).find((k) => neigh.includes(k));
  return Math.min(95, baseHeat + (neighBoost ? 5 : 0));
}

export function locationDemandScore(asset) {
  // Currently mirrors liquidity, slightly adjusted by asset type.
  const base = liquidityScoreRaw(asset);
  const type = (asset.property_type || '').toLowerCase();
  const typeMul =
    type.includes('villa')  ? 1.05 :
    type.includes('studio') ? 1.02 :
    type.includes('loft')   ? 1.03 : 1.0;
  return Math.round(Math.min(98, base * typeMul));
}

export function sellReadinessScore(asset) {
  // Composite of: value confidence, rental proof, photos, docs, condition,
  // occupancy, legal, buyer demand, pricing, furnishing, mgmt.
  // For synthesized assets, we approximate from asset condition + occupancy.
  const occ = Math.min(100, (asset.occupancy_pct || 60));
  const cond =
    (asset.condition || '').toLowerCase().includes('renovated') ? 90 :
    (asset.condition || '').toLowerCase().includes('good')      ? 78 :
    (asset.condition || '').toLowerCase().includes('average')   ? 60 : 70;
  const dem = locationDemandScore(asset);
  return Math.round(occ * 0.20 + cond * 0.35 + dem * 0.45);
}

export function managementQualityScore(asset) {
  // Mocked. Higher if a management entry exists, lower if missing.
  if (asset.management_company)          return 84;
  if ((asset.management_fee_pct || 0))   return 76;
  return 64;
}

export function liquiditySignal(asset) {
  const s = liquidityScoreRaw(asset);
  if (s >= 80) return { level: 'High',   tone: '#16A34A', score: s };
  if (s >= 65) return { level: 'Medium', tone: '#B8956A', score: s };
  return         { level: 'Low',    tone: '#EF4444', score: s };
}

export function valuationConfidence(asset) {
  // Real-world: derived from # of comparable sales, recency, range tightness.
  // Mocked: based on presence of explicit current_value.
  if (asset.valuation_source === 'comparable_sales') return 'High';
  if (asset.valuation_source === 'manual')           return 'Medium';
  if (asset.current_value_eur)                       return 'Medium';
  return 'Low';
}


// ─── Exit Scenarios (deterministic) ───────────────────────────────────

/** Returns the 7 canonical exit scenarios for an owned asset. */
export function exitScenarios(asset) {
  const cur     = asset.current_value_eur   || 0;
  const purch   = asset.purchase_price_eur  || 0;
  const grossA  = asset.annual_gross_eur    || 0;
  const netA    = asset.annual_net_eur      || (grossA * 0.65);
  const mort    = asset.mortgage_balance_eur || 0;

  const saleCost   = estimatedSaleCosts(cur, mort);
  const netProc    = cur - saleCost - mort;
  const baseROIpct = purch > 0 ? ((netProc - purch) / purch) * 100 : 0;

  const v12  = Math.round(cur * 1.035);                          // base case 3.5% upside
  const v36  = Math.round(cur * Math.pow(1.045, 3));              // 4.5% compounded
  const renoBudget = Math.round(cur * 0.085);                     // ~8.5% capex
  const renoVal    = Math.round((cur + renoBudget * 1.45) * 1.02); // value uplift
  const renoIncome = Math.round(netA * 1.18);                     // 18% income lift
  const refi  = Math.round(cur * 0.60);                           // 60% LTV pull-out

  return [
    {
      key: 'sell-today',
      label: 'Sell Today',
      projected_value: cur,
      projected_net_income: 0,
      projected_cash_out: netProc,
      projected_roi_pct: round2(baseROIpct),
      risk_level: 'Low',
      ai_note: 'Clean exit, but you lose strong recurring income unless reinvested into a higher-yield asset.',
    },
    {
      key: 'hold-12m',
      label: 'Hold 12 Months',
      projected_value: v12,
      projected_net_income: netA,
      projected_cash_out: v12 - saleCost - mort + netA,
      projected_roi_pct: round2(((v12 + netA - cur) / cur) * 100),
      risk_level: 'Medium',
      ai_note: 'Outperforms selling today if tourism demand stays stable; modest value uplift expected.',
    },
    {
      key: 'hold-3y',
      label: 'Hold 3 Years',
      projected_value: v36,
      projected_net_income: netA * 3,
      projected_cash_out: v36 - saleCost - mort + (netA * 3),
      projected_roi_pct: round2(((v36 + netA * 3 - cur) / cur) * 100),
      risk_level: 'Medium',
      ai_note: 'Strongest wealth-building scenario if regulations and tourism remain favourable.',
    },
    {
      key: 'renovate-sell',
      label: 'Renovate Then Sell',
      projected_value: renoVal,
      projected_net_income: 0,
      projected_cash_out: renoVal - estimatedSaleCosts(renoVal) - mort - renoBudget,
      projected_roi_pct: round2(((renoVal - cur - renoBudget) / cur) * 100),
      risk_level: 'Medium',
      ai_note: 'Worth it only if comparable renovated comps support the projected value above current asking range.',
      renovation_budget: renoBudget,
    },
    {
      key: 'renovate-rent',
      label: 'Renovate Then Rent',
      projected_value: renoVal,
      projected_net_income: renoIncome,
      projected_cash_out: 0,
      projected_roi_pct: round2((renoIncome / cur) * 100),
      risk_level: 'Medium',
      ai_note: 'Best if a design upgrade moves the asset into a more premium STR category.',
      renovation_budget: renoBudget,
      adr_uplift_pct: 18,
    },
    {
      key: 'refinance-hold',
      label: 'Refinance and Hold',
      projected_value: cur,
      projected_net_income: netA,
      projected_cash_out: refi - mort,
      projected_roi_pct: round2((refi - mort) / (purch || 1) * 100),
      risk_level: 'Low',
      ai_note: 'Pulls out 60% LTV liquidity while keeping the income stream — best for portfolio expansion.',
      ltv_pct: 60,
    },
    {
      key: 'optimize-str',
      label: 'Optimize STR Performance',
      projected_value: cur,
      projected_net_income: Math.round(netA * 1.17),
      projected_cash_out: 0,
      projected_roi_pct: round2(((netA * 0.17) / cur) * 100),
      risk_level: 'Low',
      ai_note: 'Improve photography, pricing calendar, amenities, and listing copy before considering a sale.',
      monthly_uplift: Math.round(netA * 0.17 / 12),
    },
  ];
}


// ─── Portfolio aggregation ────────────────────────────────────────────

export function aggregatePortfolio(assets) {
  if (!Array.isArray(assets) || !assets.length) return null;
  const purchaseTotal  = sum(assets, 'purchase_price_eur');
  const currentTotal   = sum(assets, 'current_value_eur');
  const grossAnnual    = sum(assets, 'annual_gross_eur');
  const netAnnual      = sum(assets, 'annual_net_eur');
  const mortgageTotal  = sum(assets, 'mortgage_balance_eur');

  const equity      = currentTotal - purchaseTotal;
  const equityPct   = purchaseTotal ? (equity / purchaseTotal) * 100 : 0;
  const yocPct      = purchaseTotal ? (grossAnnual / purchaseTotal) * 100 : 0;
  const yonowPct    = currentTotal  ? (netAnnual / currentTotal)  * 100 : 0;
  const netCashOut  = currentTotal
    ? currentTotal - assets.reduce((s, a) => s + estimatedSaleCosts(a.current_value_eur, a.mortgage_balance_eur), 0) - mortgageTotal
    : 0;

  const avgScore    = round0(
    assets.reduce((s, a) => s + digitalAssetScore(a), 0) / assets.length
  );
  const avgLiqRaw   = round0(
    assets.reduce((s, a) => s + liquidityScoreRaw(a), 0) / assets.length
  );
  const portfolioLiq = avgLiqRaw >= 80 ? 'High' : avgLiqRaw >= 65 ? 'Medium' : 'Low';

  return {
    asset_count:       assets.length,
    purchase_total:    purchaseTotal,
    current_total:     currentTotal,
    equity_total:      equity,
    equity_pct:        round2(equityPct),
    annual_gross:      grossAnnual,
    annual_net:        netAnnual,
    yield_on_cost_pct: round2(yocPct),
    yield_on_now_pct:  round2(yonowPct),
    net_cash_out:      Math.round(netCashOut),
    portfolio_score:   avgScore,
    portfolio_liquidity: portfolioLiq,
    portfolio_liquidity_score: avgLiqRaw,
  };
}


// ─── Decision picker — best to hold/sell/renovate/etc ─────────────────

export function decisionPicks(assets) {
  if (!Array.isArray(assets) || !assets.length) return [];

  const scored = assets.map((a) => ({
    asset: a,
    score: digitalAssetScore(a),
    yoc: yieldOnCost(a.annual_gross_eur, a.purchase_price_eur) || 0,
    equityPct: equityGainPct(a.purchase_price_eur, a.current_value_eur) || 0,
    liq: liquidityScoreRaw(a),
    sell: sellReadinessScore(a),
  }));

  const pick = (sorter, label, reasonFn) => {
    const top = [...scored].sort(sorter)[0];
    if (!top) return null;
    return {
      label,
      asset_id: top.asset.id || top.asset.property_id,
      asset_name: top.asset.title || top.asset.name,
      reason: reasonFn(top),
    };
  };

  return [
    pick(
      (a, b) => b.score - a.score,
      'Best Asset to Hold',
      (t) => `Strong asset score (${t.score}/100) with ${round1(t.yoc)}% yield on cost and stable equity growth.`
    ),
    pick(
      (a, b) => b.sell - a.sell || b.liq - a.liq,
      'Best Asset to Sell',
      (t) => `Highest sell-readiness (${t.sell}/100) with strong liquidity (${t.liq}/100) — clean exit window.`
    ),
    pick(
      (a, b) => (b.equityPct < 8 ? 1 : 0) - (a.equityPct < 8 ? 1 : 0) || a.score - b.score,
      'Best Asset to Renovate',
      (t) => `Below-average equity gain (${round1(t.equityPct)}%) — capex upgrade can lift comp-set positioning.`
    ),
    pick(
      (a, b) => b.equityPct - a.equityPct,
      'Best Asset to Refinance',
      (t) => `Largest equity gain (+${round1(t.equityPct)}%) — strong candidate to pull liquidity at 60% LTV.`
    ),
    pick(
      (a, b) => a.score - b.score,
      'Underperforming Asset',
      (t) => `Lowest asset score (${t.score}/100); review yield, occupancy, or photography to lift performance.`
    ),
    pick(
      (a, b) => b.yoc - a.yoc,
      'Highest Yield on Cost',
      (t) => `${round1(t.yoc)}% yield on cost — strongest cash-on-cash performer in the portfolio.`
    ),
    pick(
      (a, b) => b.equityPct - a.equityPct,
      'Highest Equity Gain',
      (t) => `+${round1(t.equityPct)}% appreciation since purchase — strongest capital growth.`
    ),
    pick(
      (a, b) => b.liq - a.liq,
      'Highest Liquidity Asset',
      (t) => `Liquidity ${t.liq}/100 — easiest to sell quickly at fair price.`
    ),
  ].filter(Boolean);
}


// ─── Small helpers ────────────────────────────────────────────────────

function sum(arr, key) {
  return (arr || []).reduce((s, a) => s + (Number(a[key]) || 0), 0);
}
function round0(v) { return Math.round(v); }
function round1(v) { return Math.round(v * 10) / 10; }
function round2(v) { return Math.round(v * 100) / 100; }


// ─── Curated owned-asset demo set ─────────────────────────────────────
// Synthesized for the cockpit preview; clearly labeled as "Demo · sample".

export const DEMO_OWNED_ASSETS = [
  {
    id: 'owned-koukaki-str',
    title: 'Athens Koukaki STR Apartment',
    city: 'Athens',
    neighborhood: 'Koukaki — near Acropolis / Syggrou-Fix metro',
    property_type: 'Apartment',
    sqm: 62,
    condition: 'Renovated',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200',
    purchase_price_eur: 185000,
    purchase_date: '2024-03-15',
    current_value_eur: 215000,
    valuation_source: 'comparable_sales',
    valuation_updated_at: new Date().toISOString().slice(0, 10),
    annual_gross_eur: 24000,
    annual_net_eur:   15600,
    occupancy_pct: 74,
    adr_eur: 89,
    mortgage_balance_eur: 0,
    management_fee_pct: 18,
    management_company: 'Self-managed via Hostaway',
    demo: true,
  },
  {
    id: 'owned-glyfada-flat',
    title: 'Glyfada Coastal 2BR',
    city: 'Athens',
    neighborhood: 'Glyfada — 4 min to Asteras Beach',
    property_type: 'Apartment',
    sqm: 95,
    condition: 'Good',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200',
    purchase_price_eur: 295000,
    purchase_date: '2022-09-08',
    current_value_eur: 348000,
    valuation_source: 'comparable_sales',
    valuation_updated_at: new Date().toISOString().slice(0, 10),
    annual_gross_eur: 32400,
    annual_net_eur:   20100,
    occupancy_pct: 68,
    adr_eur: 132,
    mortgage_balance_eur: 142000,
    management_fee_pct: 16,
    management_company: null,
    demo: true,
  },
  {
    id: 'owned-paros-cottage',
    title: 'Paros Naoussa Stone Cottage',
    city: 'Naoussa, Paros',
    neighborhood: 'Old harbour — 90s heritage block',
    property_type: 'Townhouse',
    sqm: 88,
    condition: 'Average',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200',
    purchase_price_eur: 165000,
    purchase_date: '2021-06-22',
    current_value_eur: 224000,
    valuation_source: 'manual',
    valuation_updated_at: new Date().toISOString().slice(0, 10),
    annual_gross_eur: 19800,
    annual_net_eur:   11200,
    occupancy_pct: 56,
    adr_eur: 156,
    mortgage_balance_eur: 0,
    management_fee_pct: 22,
    management_company: null,
    demo: true,
  },
];
