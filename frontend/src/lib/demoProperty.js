// Shared frontend-only demo property + fallback visual concepts.
// Used so the demo route NEVER depends on a successful DB/API roundtrip.

export const DEMO_PROPERTY = {
  property_id: 'demo',
  is_demo: true,
  name: 'Cycladic Boutique Suite',
  city: 'Koufonisia, Greece',
  location: 'Chora — sea-facing terrace district',
  property_type: 'Boutique Suite',
  sqm: 78,
  bedrooms: 1,
  bathrooms: 1,
  sleeps: 4,
  nightly_rate: 145,
  files: [
    {
      file_id: 'demo-photo-1',
      kind: 'photo',
      external_url:
        'https://images.unsplash.com/photo-1624385688356-7bc5f80f8874?crop=entropy&cs=srgb&fm=jpg&q=85',
    },
  ],
  analysis: {
    summary:
      'Cycladic boutique suite operating below comp-set top decile. Four primary unlocks identified — sleep capacity, evening lighting, outdoor program, editorial photography — combine to lift ADR ~22% and unlock ~€8,900/yr unrealized revenue.',
    metrics: {
      asset_score: 78,
      projected_adr: 145,
      occupancy_pct: 71,
      annual_revenue: 37550,
      net_yield_pct: 6.8,
    },
    yield_opportunities: [
      {
        title: 'Sleep Capacity Expansion',
        transformation: '4 → 5 Guests',
        revenue_impact: '+€1,500/year',
        cost: '€3,530',
        payback: '28 months',
        status: 'Ready to Activate',
      },
      {
        title: 'Layered Evening Lighting',
        transformation: 'Cool → Warm 2700K',
        revenue_impact: '+€2,200/year',
        cost: '€1,500',
        payback: '8 months',
        status: 'Ready to Activate',
      },
      {
        title: 'Outdoor Dining Program',
        transformation: 'Bare → Programmed Terrace',
        revenue_impact: '+€3,400/year',
        cost: '€4,500',
        payback: '16 months',
        status: 'Ready to Activate',
      },
      {
        title: 'Editorial Photography Refresh',
        transformation: 'Static → Editorial',
        revenue_impact: '+€1,800/year',
        cost: '€750',
        payback: '5 months',
        status: 'Ready to Activate',
      },
    ],
  },
};

// Always-renderable fallback concepts — used when /api/visualize fails or
// the network is unavailable. Three premium directions, curated imagery
// (Aman / Edition Hotels / Casa Cook calibre).
const _baseProp = { nightly_rate: 145 };

function _revenue(uplift_pct) {
  const current_adr = _baseProp.nightly_rate;
  const projected_adr = Math.round(current_adr * (1 + uplift_pct / 100));
  const current_occupancy = 71;
  const projected_occupancy = Math.min(92, current_occupancy + Math.max(2, Math.round(uplift_pct * 0.55)));
  const annual_uplift = Math.round((projected_adr - current_adr) * 365 * (projected_occupancy / 100));
  return {
    adr_uplift_pct: uplift_pct,
    adr_impact: `+${uplift_pct}% ADR Potential`,
    current_adr,
    projected_adr,
    current_occupancy,
    projected_occupancy,
    annual_uplift,
  };
}

// Three deliberately different hospitality business directions.
// Each concept differs in lighting, mood, operational positioning, guest
// psychology, spatial strategy, and revenue strategy — not three variations
// of the same idea.
export const FALLBACK_CONCEPTS = [
  {
    key: 'family_premium',
    name: 'Family Premium',
    direction: 'Sleeps-5 design-led family inventory',
    atmosphere:
      'Calm, durable, family-oriented — sleep capacity expanded without compromising restraint.',
    mood:
      'Late-morning light through linen curtains, child-safe finishes, generous storage, layered evening warmth.',
    guest_positioning:
      'Design-led families and small groups — 5–7 night stays, July–August peak demand.',
    spatial_strategy:
      'Mezzanine sleep platform, dual living zones, sleeps-5 footprint without architectural compromise.',
    revenue_strategy:
      'Premium family ADR + 5–7 night minimum stays + shoulder-season family pricing ladder.',
    intel: 'Sleeps-5 inventory under-supplied in Cycladic STR — 18% ADR premium documented Jul–Aug.',
    ...(_revenue(18)),
    budget_low_eur: 12, budget_high_eur: 18,
    budget: '€12k–€18k Estimated Upgrade',
    palette: ['#E4E4E7', '#52525B', '#52525B'],
    hero:
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    furniture: [
      'Built-in oak mezzanine bed — sleep-5 without compromise',
      'B&B Italia Charles sofa-bed — durable, photogenic, family-grade',
      'Carl Hansen wishbone chairs ×4 — heritage, repairable, scalable',
    ],
    lighting: [
      'Dimmable 2700K layered scenes — bedtime + morning rituals programmed',
      'Santa & Cole Cestita portable lamps — child-safe, warm, movable',
      'Recessed cove lighting — calm indirect glow at night',
    ],
    materials: [
      'Honed limestone floors — durable, photogenic, low maintenance',
      'Limewash walls in bone — forgiving, photographs editorial',
      'Solid oak millwork — repairable, generational',
    ],
  },
  {
    key: 'editorial_boutique',
    name: 'Editorial Boutique',
    direction: 'Magazine-grade photographic asset',
    atmosphere:
      'Curated editorial warmth — terracotta, texture, hand-thrown ceramics, deliberate photographic ceiling.',
    mood:
      'Ochre afternoon light, slow rituals, sculptural objects, magazine-ready every frame.',
    guest_positioning:
      'Editorial design audience, high-spend repeat-stay cohort — 3–4 night stays, year-round.',
    spatial_strategy:
      'Single-couple footprint optimised for slow rituals — coffee corner, reading nook, dining theatre.',
    revenue_strategy:
      'Premium editorial ADR + design-platform PR exposure + repeat-guest pricing.',
    intel: 'Warm-palette editorial photography raises booking intent ~22% in boutique Mediterranean comps.',
    ...(_revenue(22)),
    budget_low_eur: 16, budget_high_eur: 24,
    budget: '€16k–€24k Estimated Upgrade',
    palette: ['#B8956A', '#E4E4E7', '#09090B'],
    hero:
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    furniture: [
      'Cassina LC2 in cognac leather — heritage editorial anchor',
      'Hand-thrown stoneware lamps — sculptural terra warmth',
      'Linen banquette — built-in editorial dining intimacy',
    ],
    lighting: [
      'Apparatus Talisman pendant — jewel-like editorial focal',
      'Brass picture lights — gallery rhythm across feature wall',
      'Programmed dim-to-warm LEDs — scene-by-scene evening drift',
    ],
    materials: [
      'Pigmented terracotta tile — saturated warmth underfoot',
      'Lime-plaster walls in clay — tactile editorial depth',
      'Bouclé and raw linen — magazine-ready surface signal',
    ],
  },
  {
    key: 'romantic_escape',
    name: 'Romantic Escape',
    direction: 'Couples-only candlelit retreat',
    atmosphere:
      'Intimate, candlelit, sensual — slow, low-light, fewer-but-richer rituals for two.',
    mood:
      'Twilight bath rituals, candlelit dinners on the terrace, layered 1800K bedside warmth, no overhead light.',
    guest_positioning:
      'Couples honeymoon / anniversary / repeat-romance audience — 2–3 night premium stays.',
    spatial_strategy:
      'Sleeps-2 only, oversized bath as theatre, terrace for two, no second bedroom.',
    revenue_strategy:
      'Premium couples ADR + minimum 2-night peak stays + romance package add-ons.',
    intel: 'Couples-only positioning achieves ~25% ADR premium in low-volume Mediterranean STR — repeat rate 3.4×.',
    ...(_revenue(25)),
    budget_low_eur: 20, budget_high_eur: 28,
    budget: '€20k–€28k Estimated Upgrade',
    palette: ['#09090B', '#B8956A', '#E4E4E7'],
    hero:
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    furniture: [
      'Freestanding stone bath as room theatre — sculptural anchor',
      'Linen-canopied bed — intimate, theatrical, photographic',
      'Two-seat banquette on terrace — candlelit dining for two',
    ],
    lighting: [
      'Davide Groppi Moon — single sculptural ceiling moment',
      'Hand-blown wall sconces — bedside candlelit warmth',
      'Programmed 1800K dim-to-zero — no overhead light scene',
    ],
    materials: [
      'Polished travertine bath surround — Mediterranean luxury signal',
      'Rough-plaster walls in clay — tactile, hand-finished depth',
      'Velvet drapery + heavy linen — sound and light dampening',
    ],
  },
];

// Compact 4-week transformation timeline used on Workspace.
export const DEFAULT_TIMELINE = [
  { week: 'Week 1', label: 'Lighting Upgrade', detail: '2700K layered evening program installed; sculptural focal piece staged.' },
  { week: 'Week 2', label: 'Editorial Photography', detail: 'Golden-hour shoot, 22 hero frames, color graded for listing platforms.' },
  { week: 'Week 3', label: 'Listing Optimization', detail: 'Copy rewritten, amenity hierarchy reset, premium positioning live.' },
  { week: 'Week 4', label: 'Pricing Activation', detail: 'Dynamic ADR ladder + minimum-stay rules for shoulder/peak windows.' },
];

// Always-renderable procurement cart fallback — renders even with zero network.
function _cartItem(category, name, brand, supplier, dimensions, qty, unit, alts) {
  return {
    category, name, brand, supplier, dimensions, qty,
    unit_price_eur: unit,
    line_total_eur: unit * qty,
    alternatives: alts || [],
  };
}

const _BASE_ITEMS = [
  _cartItem('Furniture', 'Built-in Oak Mezzanine Bed', 'Bespoke joinery', 'Local trade', '200×140×80', 1, 2200, [
    { name: 'Modular daybed in linen', brand: 'B&B Italia', unit_price_eur: 2450 },
    { name: 'Charles sofa-bed', brand: 'B&B Italia', unit_price_eur: 2150 },
  ]),
  _cartItem('Furniture', 'Carl Hansen Wishbone Chair', 'Carl Hansen', 'Trade direct', '55×52×76', 4, 720, [
    { name: 'CH88 Chair', brand: 'Carl Hansen', unit_price_eur: 685 },
  ]),
  _cartItem('Lighting', 'Flos String Pendant', 'Flos', 'Flos Trade', '190×Ø22', 1, 1100, [
    { name: 'Castore 25 Pendant', brand: 'Artemide', unit_price_eur: 980 },
  ]),
  _cartItem('Lighting', 'Santa & Cole Cestita', 'Santa & Cole', 'Trade direct', '21×21×24', 4, 220, [
    { name: 'Bellhop portable', brand: 'Flos', unit_price_eur: 245 },
  ]),
  _cartItem('Soft Goods', 'Linen Bedding Set 5pax', 'Society Limonta', 'Trade direct', 'set', 5, 320, [
    { name: 'Washed linen bedding', brand: 'Once Milano', unit_price_eur: 290 },
  ]),
  _cartItem('Materials', 'Honed Limestone Flooring', 'Pierre Bleue', 'Local trade', '60×60×2', 24, 95, []),
];

function _scalePackage(items, factor, altLabel) {
  return items.map((it) => {
    const unit = Math.max(80, Math.round(it.unit_price_eur * factor));
    // Prefer the curated alternatives baked into _BASE_ITEMS; only synthesize
    // a generic swap when the base item didn't ship any.
    const alternatives = it.alternatives && it.alternatives.length > 0
      ? it.alternatives
      : [{ name: altLabel + ' ' + it.name, brand: 'Trade alt', unit_price_eur: Math.round(unit * 0.85) }];
    return {
      ...it,
      unit_price_eur: unit,
      line_total_eur: unit * it.qty,
      alternatives,
    };
  });
}

function _packFromBase(tier, label, items, lead) {
  return {
    tier, label, items,
    subtotal_eur: items.reduce((a, b) => a + b.line_total_eur, 0),
    lead_time_weeks: lead,
  };
}

export const FALLBACK_CART = {
  packages: [
    _packFromBase('budget',  'Budget Package',  _scalePackage(_BASE_ITEMS, 0.55, 'Local equivalent'), 4),
    _packFromBase('premium', 'Premium Package', _scalePackage(_BASE_ITEMS, 1.0,  'Trade alt'),         7),
    _packFromBase('luxury',  'Luxury Package',  _scalePackage(_BASE_ITEMS, 1.55, 'Bespoke commission'), 11),
  ],
};

// Always-renderable listing rewrite fallback — used when /api/upgrade/listing fails.
export const FALLBACK_LISTING = {
  title: 'Whitewashed Suite Above the Aegean',
  subhead: 'Editorial Cycladic suite, calibrated for design-led travellers.',
  description: [
    "A whitewashed boutique suite where soft limewash walls meet sun-bleached oak and warm 2700K evening light — a deliberate counterpoint to chora's bustle.",
    'Materials chosen for tactility — honed limestone underfoot, hand-finished oak millwork, sculptural plaster ceilings, washed linen at the bed, hand-thrown ceramics.',
    'Slow afternoons on the terrace, candlelit dining at dusk, a curated five-minute walk to the harbour — restraint, not spectacle. Built for stays of three nights and longer.',
  ],
  amenities: [
    'Sea-facing terrace',
    '2700K layered lighting',
    'Linen bedding · 5pax',
    'Programmed soundscape',
    'Editorial book curation',
    'Design-led concierge',
  ],
  sleeps_positioning: 'Sleeps 5 · calibrated for design-led families and small groups',
  guest_segment: 'Design-led, low-volume traveller migrating off Mykonos toward editorial Cycladic inventory.',
  pricing_positioning: 'Premium boutique tier · €245+ ADR · top quartile of design-led peers.',
  house_rules: [
    'Quiet hours after 22:00 — neighbouring suites in earshot.',
    'Self check-in via lockbox; concierge on call from 09:00–21:00.',
    'No events; suite calibrated for restorative stays of 3+ nights.',
  ],
};
