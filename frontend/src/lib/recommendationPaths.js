// Propul8 Recommendation-Aware Concept Paths
// =======================================
//
// CRITICAL ARCHITECTURE: For every operational upgrade, Propul8 presents THREE
// different STRATEGIC EXECUTION PATHS that SOLVE THE SAME BUSINESS PROBLEM —
// they are NOT three aesthetic moodboards. The user's decision is between
// strategies (cost, complexity, disruption, archetype fit), not vibes.
//
// Each path has:
//   • key            — unique slug used by image generator + routes
//   • name           — strategy headline (e.g. "Mezzanine Sleep Platform")
//   • strategy       — the operational solution in 1 line
//   • atmosphere     — visual / spatial read of THIS path
//   • mood           — supporting sensory line
//   • execution      — operational path: what physically changes
//   • cost_band      — relative cost vs the other two paths
//   • complexity     — implementation difficulty (Low/Medium/High)
//   • disruption     — guest-facing downtime
//   • when_to_choose — institutional reasoning ("Pick this when…")
//   • intel          — hospitality benchmark insight
//   • adr_uplift_pct — financial impact of THIS path
//   • furniture/lighting/materials — operational specs
//
// The visualization page renders these as propul8al-board cards. The
// Workspace renders one selected path as full studio.
//
// `getPathsForRec(recTitle)` is the entry point. It uses a fuzzy title match
// so AI-generated rec titles still resolve to a coherent strategic set.

function _r(uplift_pct, base_adr = 145, base_occ = 71) {
  const projected_adr = Math.round(base_adr * (1 + uplift_pct / 100));
  const projected_occupancy = Math.min(92, base_occ + Math.max(2, Math.round(uplift_pct * 0.55)));
  const annual_uplift = Math.round((projected_adr - base_adr) * 365 * (projected_occupancy / 100));
  return {
    adr_uplift_pct: uplift_pct,
    adr_impact: `+${uplift_pct}% ADR Potential`,
    current_adr: base_adr,
    projected_adr,
    current_occupancy: base_occ,
    projected_occupancy,
    annual_uplift,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// SLEEP CAPACITY EXPANSION — three paths to "sleep one more guest" without
// breaking the architectural read or doubling capex.
// ──────────────────────────────────────────────────────────────────────────
const _SLEEP_PATHS = [
  {
    key: 'mezzanine_loft',
    name: 'Mezzanine Sleep Platform',
    strategy: 'Built-in oak loft above living area · sleeps +1 with full-height ceiling preserved below.',
    atmosphere: 'Architectural addition: a built-in oak mezzanine reads as bookshelf-height millwork, opening sleeps-5 with zero living-area compromise.',
    mood: 'Calm honey-oak millwork, ladder-rung detail, cream linen above, soft 2700K cove glow.',
    execution: 'Carpenter + structural anchor · 5–7 day install · oak veneer millwork with integrated guard rail.',
    cost_band: '€8–12k',
    complexity: 'Medium',
    disruption: '5–7 day downtime',
    when_to_choose: 'Pick when ceiling height ≥ 3.0m and operator wants the sleeps-5 read to look intentional, not improvised.',
    intel: 'Mezzanine sleeps-5 builds in Cycladic STR earn 18% ADR premium Jul–Aug; under-supplied vs demand.',
    palette: ['#E4E4E7', '#52525B', '#52525B'],
    hero: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    furniture: [
      'Bespoke oak mezzanine bed platform — 200×140×80, integrated guard',
      'Rung ladder in solid oak — flush wall mount',
      'Built-in storage drawer below mezzanine — luggage + linen',
    ],
    lighting: [
      'Cove LED at mezzanine deck underside — 2700K dim-to-warm',
      'Bedside reading sconce — Vibia Sticks, warm amber',
      'Floor lamp below — Santa & Cole Cestita',
    ],
    materials: [
      'Solid European oak — sun-bleached honey finish',
      'Cream linen mattress cover + bedding',
      'Microcement floor — seamless with existing living zone',
    ],
    ..._r(18),
  },
  {
    key: 'convertible_living',
    name: 'Convertible Living Zone',
    strategy: 'Modular sofa-bed + curtain-divided nook · sleeps +1 with zero structural change.',
    atmosphere: 'Living zone reconfigures at dusk: B&B Italia Charles sofa-bed unfolds, linen curtain partitions a private nook, daytime read undisturbed.',
    mood: 'Soft slow afternoon, washed linen curtain in clay, 2700K bedside warmth, tactile editorial restraint.',
    execution: 'Furniture-only · 1 week lead · zero contractor work · ceiling-mounted curtain track only.',
    cost_band: '€4–7k',
    complexity: 'Low',
    disruption: 'Same-day swap · zero downtime',
    when_to_choose: 'Pick when capex is constrained, ceiling height is limited, or operator wants reversibility.',
    intel: 'Sofa-bed sleeps-5 listings without architectural change still capture 12–14% of family-segment ADR uplift.',
    palette: ['#E4E4E7', '#52525B', '#09090B'],
    hero: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    furniture: [
      'B&B Italia Charles sofa-bed in cream linen — 250×100',
      'Ceiling-mounted heavy linen curtain — clay tone, 280cm drop',
      'Integrated under-sofa drawer for daytime bedding',
    ],
    lighting: [
      'Bedside sconce on swing-arm — Flos Bellhop',
      'Floor lamp anchored to sofa zone — Davide Groppi',
      'Dim-to-warm cove behind curtain track',
    ],
    materials: [
      'Heavy linen curtain — sound-dampening clay weave',
      'Cream wool throw + linen bedding',
      'Existing flooring preserved — zero floor work',
    ],
    ..._r(13),
  },
  {
    key: 'bunk_millwork',
    name: 'Day-Bed Bunk Wall',
    strategy: 'Built-in millwork bunks against existing wall · sleeps +2 with integrated storage.',
    atmosphere: 'Single wall becomes a sculptural sleep + storage system: stacked oak bunks read as joinery, every cubic inch monetized for kids/teens.',
    mood: 'Hand-finished oak, brass reading rails, warm tungsten reading bulbs, child-safe edge softening.',
    execution: 'Carpenter only · 3–4 day install · zero plumbing / structural · bonded to existing wall.',
    cost_band: '€6–9k',
    complexity: 'Low',
    disruption: '3–4 day downtime',
    when_to_choose: 'Pick when target audience is families with children (teens / pre-teens) and storage is also under-served.',
    intel: 'Bunk-wall sleeps-6 conversions outperform sofa-bed equivalents by 22% on family-listing conversion in Mediterranean STR.',
    palette: ['#E4E4E7', '#52525B', '#09090B'],
    hero: 'https://images.unsplash.com/photo-1631049552240-59c37f38802b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    furniture: [
      'Bespoke oak bunk wall — 220×100×220, integrated storage drawers',
      'Brass reading rails per bunk — 1800K tungsten clip-on',
      'Linen-upholstered headboards — clay tone',
    ],
    lighting: [
      'Per-bunk reading sconce — Anglepoise mini in brass',
      'Cove LED above bunk wall — 2700K',
      'Recessed downlight at bunk-side floor',
    ],
    materials: [
      'Solid oak millwork — child-safe radiused edges',
      'Heavy linen bunk curtains — privacy + softness',
      'Brass hardware throughout',
    ],
    ..._r(15),
  },
];

// ──────────────────────────────────────────────────────────────────────────
// LAYERED EVENING LIGHTING — three execution strategies for warm-hospitality
// nighttime atmosphere.
// ──────────────────────────────────────────────────────────────────────────
const _LIGHTING_PATHS = [
  {
    key: 'programmed_scenes',
    name: 'Programmed Scenes',
    strategy: 'DALI controller + 5 preset scenes (morning / day / sunset / dinner / night) — every fixture dim-to-warm.',
    atmosphere: 'Whole asset shifts atmosphere by scene: morning fresh, sunset warm, dinner candlelit, night minimal.',
    mood: 'Programmed dim-to-warm 2700K → 1800K, every fixture orchestrated, no random switching.',
    execution: 'Electrician + DALI integration · 2 days · existing fixtures retained where compatible.',
    cost_band: '€3–5k',
    complexity: 'Low',
    disruption: '2 day downtime',
    when_to_choose: 'Pick when most fixtures are already in place — controller is the missing layer.',
    intel: 'Properties with programmed scenes earn 14% higher booking conversion on listing-photo tests.',
    palette: ['#FAFAFA', '#52525B', '#09090B'],
    hero: 'https://images.unsplash.com/photo-1631049552057-403cdb8f0658?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    furniture: [
      'Existing furniture retained — no FF&E change',
      'In-wall scene-control panel — single matte brass tile',
      'Bedside dimmer override — discrete brass nub',
    ],
    lighting: [
      'DALI / Lutron controller integration — 5 preset scenes',
      'Existing fixtures swapped to dim-to-warm bulbs (1800–2700K)',
      'Bedside scene-aware switching — auto fade in/out',
    ],
    materials: [
      'Matte brass switch plates — replace plastic',
      'Warm-bias bulbs throughout',
      'Cable management hidden in existing tracks',
    ],
    ..._r(12),
  },
  {
    key: 'sculptural_focals',
    name: 'Sculptural Focals',
    strategy: 'Replace ceiling fixtures with sculptural pieces — each room has ONE hero light that becomes the photograph.',
    atmosphere: 'Each room organized around a single sculptural light — Davide Groppi Moon in living, Apparatus Talisman in dining, Flos String over bed.',
    mood: 'Jewel-like fixtures glowing 2700K — everything else stays restrained, the light IS the design.',
    execution: 'Electrician + 3 fixture installs · 1 day · ceiling boxes already exist.',
    cost_band: '€6–9k',
    complexity: 'Low',
    disruption: '1 day downtime',
    when_to_choose: 'Pick when listing photos are flat — sculptural focals lift hero-frame editorial scoring instantly.',
    intel: 'Editorial pendant focal points lift hero-photo click-through ~16% on listing-conversion tests.',
    palette: ['#E4E4E7', '#52525B', '#09090B'],
    hero: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    furniture: [
      'Existing furniture retained — no FF&E change',
      'Optional matching brass-frame mirror — anchors light reflection',
      'Slim console below sculptural fixture — material echo',
    ],
    lighting: [
      'Davide Groppi Moon — living room sculptural focal',
      'Apparatus Talisman pendant — dining theatre',
      'Flos String Light — bedroom hero',
    ],
    materials: [
      'Brass canopy plates — match fixture finishes',
      'Matte plaster ceiling — quiet backdrop for fixtures',
      'No additional finish work',
    ],
    ..._r(15),
  },
  {
    key: 'architectural_cove',
    name: 'Architectural Cove',
    strategy: 'Recessed cove lighting at every wall-ceiling junction · no visible fixtures · pure architectural glow.',
    atmosphere: 'Walls glow from above, no visible source — light becomes architecture, mood is consistent everywhere.',
    mood: 'Indirect 2700K wash, plaster ceilings glowing, never harsh, never visible — quiet luxury.',
    execution: 'Electrician + plasterer · 3–4 days · cove channels routed at ceiling perimeters.',
    cost_band: '€5–8k',
    complexity: 'Medium',
    disruption: '3–4 day downtime',
    when_to_choose: 'Pick when operator wants restraint above all — cove is the most architecturally pure expression.',
    intel: 'Cove-only lit interiors photograph evenly — boutique listings score consistent across ALL frames.',
    palette: ['#E4E4E7', '#52525B', '#09090B'],
    hero: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    furniture: [
      'Existing furniture retained — no FF&E change',
      'Optional minimal table lamp — Santa & Cole Cestita as accent',
      'Removed: any decorative ceiling fixtures',
    ],
    lighting: [
      'Recessed cove LED tape at ceiling perimeter — 2700K, dim-to-warm',
      'Hidden 24V driver in service void',
      'Wall switch with dimmer — single brass tile',
    ],
    materials: [
      'Plaster cove detail at ceiling perimeter — handworked',
      'Re-paint ceiling in warm chalk plaster',
      'Concealed cable channels',
    ],
    ..._r(14),
  },
];

// ──────────────────────────────────────────────────────────────────────────
// OUTDOOR DINING PROGRAM — three operational paths to monetize the terrace.
// ──────────────────────────────────────────────────────────────────────────
const _OUTDOOR_PATHS = [
  {
    key: 'sunset_theatre',
    name: 'Programmed Sunset Theatre',
    strategy: 'Raised dining platform + built-in bench + planted edge + 1800K candlelit lighting — sunset hospitality scripted.',
    atmosphere: 'Platform raises diners above the floor plane, dinner becomes theatre, planted edge frames the view, candles do the lighting.',
    mood: 'Slow Mediterranean sunset, hand-thrown stoneware on linen runner, candles only, perfumed garden.',
    execution: 'Joiner + planter + electrician · 2 weeks · outdoor platform 4×3m with built-in bench seating.',
    cost_band: '€5–8k',
    complexity: 'Medium',
    disruption: '10–14 day downtime',
    when_to_choose: 'Pick when terrace has the depth and the operator can program the sundown moment intentionally.',
    intel: 'Programmed sunset terraces outperform bare ones by 22% on Mediterranean boutique inventory.',
    palette: ['#E4E4E7', '#B8956A', '#09090B'],
    hero: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    furniture: [
      'Built-in oak bench seating — 240cm, integrated cushion storage',
      'Outdoor dining table — Carl Hansen oak, 200×90',
      'Chairs ×4 — Kettal Maia in natural rope',
    ],
    lighting: [
      'Festoon line — single warm 1800K bulb cluster overhead',
      'Hand-blown candle hurricanes ×6 — table cluster',
      'In-planter recessed warm uplights',
    ],
    materials: [
      'Raised cedar platform — naturally weathered',
      'Planted edge — rosemary + olive + lavender',
      'Linen table runner + hand-thrown ceramics',
    ],
    ..._r(20),
  },
  {
    key: 'indoor_outdoor_flow',
    name: 'Indoor-Outdoor Flow',
    strategy: 'Folding glass + single-material continuum — kitchen reads through to terrace as one continuous hospitality zone.',
    atmosphere: 'Kitchen-to-terrace barrier dissolves: same flooring, same ceiling line, same warm material palette flows through.',
    mood: 'Daylight glides through glass, slow afternoon coffee, breakfast outside without effort.',
    execution: 'Glazier + flooring + electrician · 3 weeks · folding glass install + microcement floor extension outside.',
    cost_band: '€12–18k',
    complexity: 'High',
    disruption: '3 week downtime',
    when_to_choose: 'Pick when operator wants the FLOOR PLAN to feel 30% larger and breakfast is the hero moment.',
    intel: 'Indoor-outdoor flow conversions raise perceived footprint ~28% in listing photography.',
    palette: ['#E4E4E7', '#52525B', '#09090B'],
    hero: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    furniture: [
      'Movable kitchen island — wheeled, oak with marble top',
      'Outdoor dining set — Tribu, weather-resistant',
      'Outdoor lounge — Paola Lenti Aqua sofa',
    ],
    lighting: [
      'Continuous cove LED inside-to-outside — single track',
      'Sculptural pendant over outdoor dining — Bocci 14',
      'Hidden under-eave wall washers',
    ],
    materials: [
      'Folding glass doors — bronze frames, 4 panel',
      'Microcement floor — continuous from kitchen to terrace',
      'Single ceiling line — plaster inside, painted concrete outside',
    ],
    ..._r(25),
  },
  {
    key: 'modular_outdoor',
    name: 'Modular Outdoor Living',
    strategy: 'Premium freestanding furniture set · zero construction · operator can reconfigure seasonally.',
    atmosphere: 'High-end outdoor living set defines the zone — sofa, dining, lounge — without permanent intervention.',
    mood: 'Casual luxury, seasonal flexibility, FF&E does the work, photo-ready in days.',
    execution: 'Furniture only · 1 week lead · 1 day setup · zero structural / electrical / planting.',
    cost_band: '€4–7k',
    complexity: 'Low',
    disruption: 'Same-day swap',
    when_to_choose: 'Pick when budget is constrained or asset is leased — every piece is portable and resaleable.',
    intel: 'Premium FF&E-only outdoor zones still capture ~15% of the bare-terrace ADR uplift gap.',
    palette: ['#E4E4E7', '#52525B', '#09090B'],
    hero: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    furniture: [
      'Paola Lenti Frame outdoor sofa — natural rope',
      'Kettal Bitta dining set — table + 4 chairs',
      'Tribu Branch lounge ×2 — teak frame',
    ],
    lighting: [
      'Freestanding floor lamps — Roda solar-powered',
      'Portable lanterns ×4 — Audoux-Minet style',
      'Wireless table lamp — Flos Bellhop outdoor',
    ],
    materials: [
      'Existing terrace surface — no flooring change',
      'All-weather rope + teak + powder-coated steel',
      'Cushions in performance linen — beach white',
    ],
    ..._r(15),
  },
];

// ──────────────────────────────────────────────────────────────────────────
// EDITORIAL PHOTOGRAPHY — three shoot strategies, same goal: lift conversion.
// ──────────────────────────────────────────────────────────────────────────
const _PHOTO_PATHS = [
  {
    key: 'golden_hour_editorial',
    name: 'Golden-Hour Editorial Shoot',
    strategy: 'Single-day sunset shoot · 22 hero frames · color graded · magazine-grade editorial output.',
    atmosphere: 'Single golden hour, every frame at peak warmth, no flat midday, no harsh shadows.',
    mood: 'Sunset light flooding rooms, warm long shadows, editorial grading, magazine-ready every frame.',
    execution: 'Photographer + stylist · 1 shoot day + 3 days post · 22 hero + 18 supporting frames.',
    cost_band: '€1.5–2.5k',
    complexity: 'Very low',
    disruption: 'Zero downtime',
    when_to_choose: 'Pick when listing copy is fine but photos read flat — single biggest ROI move in hospitality.',
    intel: 'Golden-hour reshoots raise booking conversion ~14% within 30 days of upload.',
    palette: ['#E4E4E7', '#52525B', '#52525B'],
    hero: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    furniture: ['No FF&E change — staging only', 'Linen styling layer added per frame', 'Flowers + ceramics + curated objects'],
    lighting: ['Existing fixtures retained', 'Candlelight added at dusk frames', 'Available golden-hour daylight only'],
    materials: ['Existing material palette photographed', 'Editorial color grading in post', 'JPEG + RAW deliverables'],
    ..._r(14),
  },
  {
    key: 'lifestyle_storytelling',
    name: 'Lifestyle Storytelling',
    strategy: 'Models in frame · candid hospitality moments · narrative sequence — listing reads as a stay, not a unit.',
    atmosphere: 'Guests reading on the terrace, breakfast on linen, swimming at sunset — story not specs.',
    mood: 'Editorial editorial — Vogue Living energy, candid not staged, premium guest archetype implied.',
    execution: 'Photographer + 2 models + stylist · 2 shoot days · 24 narrative + 14 detail frames.',
    cost_band: '€3–5k',
    complexity: 'Low',
    disruption: 'Zero downtime',
    when_to_choose: 'Pick when target audience is editorial / aspirational and the property has narrative-rich moments.',
    intel: 'Lifestyle imagery converts 22% higher on luxury STR vs empty-room photography.',
    palette: ['#E4E4E7', '#52525B', '#09090B'],
    hero: 'https://images.unsplash.com/photo-1610530460358-dc7af7b22ef5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    furniture: ['Existing furniture · staging only', 'Lifestyle props (books, ceramics, robes)', 'Breakfast styling on linen'],
    lighting: ['Available daylight + candles', 'Editorial color grade', 'Soft natural light only'],
    materials: ['Linen wardrobe styling', 'Hand-thrown ceramics', 'Curated personal-touch objects'],
    ..._r(20),
  },
  {
    key: 'architectural_studio',
    name: 'Architectural Detail Studio',
    strategy: 'Material close-ups + light/texture details · no wide shots — listing reads as a design portfolio.',
    atmosphere: 'Macro details: oak grain, plaster texture, brass patina, linen weave — design-led travelers respond.',
    mood: 'Norm-Architects-feed energy, deliberate restraint, every frame a material study.',
    execution: 'Photographer · 1 day · macro + tripod work · 28 detail + 8 wide reference frames.',
    cost_band: '€1.5–2.5k',
    complexity: 'Very low',
    disruption: 'Zero downtime',
    when_to_choose: 'Pick when the asset is design-rich and the audience is design-led travelers / press.',
    intel: 'Architectural-detail listings are picked up 4× more often by design press / hospitality blogs.',
    palette: ['#E4E4E7', '#52525B', '#09090B'],
    hero: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    furniture: ['Existing furniture as composition', 'Sculptural objects highlighted', 'Material samples styled in-frame'],
    lighting: ['Available daylight only', 'Hard light for material texture', 'No artificial lighting'],
    materials: ['Macro shots of all surfaces', 'Texture studies', 'Light-on-material studies'],
    ..._r(11),
  },
];

// ──────────────────────────────────────────────────────────────────────────
// DYNAMIC PRICING — three pricing architectures (visualization here is a
// conceptual diagram-style render — pricing is operational, not aesthetic).
// ──────────────────────────────────────────────────────────────────────────
const _PRICING_PATHS = [
  {
    key: 'four_band_seasonal',
    name: '4-Band Seasonal Architecture',
    strategy: 'Peak / shoulder / off / off-shoulder bands · weekend uplift · holiday multipliers · last-minute floor.',
    atmosphere: 'Pricing reads as an architecture — clear bands, predictable rules, no ad-hoc resets.',
    mood: 'Operationally calm, owner sleeps better, demand pacing handled by rules not panic.',
    execution: 'Pricing tool config (PriceLabs / Wheelhouse) · 2 hours · zero physical work.',
    cost_band: '€0–500',
    complexity: 'Very low',
    disruption: 'Zero downtime',
    when_to_choose: 'Pick when operator is currently running flat year-round pricing — biggest fast win.',
    intel: 'Seasonal-band properties capture ~16% more annual revenue than flat-rate equivalents in Mediterranean STR.',
    palette: ['#E4E4E7', '#B8956A', '#09090B'],
    hero: 'https://images.unsplash.com/photo-1631049552057-403cdb8f0658?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    furniture: ['No physical change', 'Pricing tool dashboard live', 'Calendar import/export'],
    lighting: ['No lighting change'],
    materials: ['Operational tool only'],
    ..._r(16),
  },
  {
    key: 'length_of_stay',
    name: 'Length-of-Stay Rules',
    strategy: '3-night minimum peak · 2-night shoulder · last-minute single-night floor · gap-filler logic.',
    atmosphere: 'Calendar fills with longer stays in peak — fewer turnover days, higher per-stay revenue.',
    mood: 'Less operational chaos, fewer cleaning days, more guest-facing time.',
    execution: 'Pricing rules + Airbnb / VRBO calendar config · 1 hour.',
    cost_band: '€0–300',
    complexity: 'Very low',
    disruption: 'Zero downtime',
    when_to_choose: 'Pick when turnover days are eating margin or operator hates the cleaning logistics.',
    intel: 'Properties with smart LOS rules earn ~12% higher net (after cleaning costs) on Mediterranean STR.',
    palette: ['#E4E4E7', '#52525B', '#09090B'],
    hero: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    furniture: ['No physical change'],
    lighting: ['No lighting change'],
    materials: ['Operational rule only'],
    ..._r(12),
  },
  {
    key: 'demand_premium',
    name: 'Demand-Based Premium',
    strategy: 'Weekend / holiday / event multipliers · live booking-pace driven · automatic adjustments.',
    atmosphere: 'Rates flex with demand without owner intervention — capture peaks fully, soften troughs.',
    mood: 'Confident pricing, no left-money-on-table feeling, owner free of weekly resets.',
    execution: 'Smart pricing tool integration · API calendar sync · 4 hours setup.',
    cost_band: '€500–1k',
    complexity: 'Low',
    disruption: 'Zero downtime',
    when_to_choose: 'Pick when operator is running multiple properties or wants pricing to be hands-off.',
    intel: 'Demand-priced inventory captures ~22% more peak revenue than rule-based seasonal banding alone.',
    palette: ['#E4E4E7', '#52525B', '#09090B'],
    hero: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    furniture: ['No physical change'],
    lighting: ['No lighting change'],
    materials: ['Operational tool only'],
    ..._r(22),
  },
];

// Default fallback paths — generic interior upgrade with three execution
// strategies (single-piece vs full refresh vs lighting+styling-only).
const _DEFAULT_PATHS = _SLEEP_PATHS;

// Title-aware path resolver. Returns the right strategic set for the
// recommendation, falling back to sleep paths if nothing matches.
export function getPathsForRec(recTitle) {
  const t = (recTitle || '').toLowerCase();
  if (/(sleep|capacity|mezzanine|family|sleeps|bunk)/.test(t)) return _SLEEP_PATHS;
  if (/(light|lamp|fixture|2700k|kelvin|illuminat|evening)/.test(t)) return _LIGHTING_PATHS;
  if (/(outdoor|terrace|patio|garden|dining|balcony)/.test(t)) return _OUTDOOR_PATHS;
  if (/(photo|photograph|cover|hero|thumbnail|editorial.*photo|listing.*photo)/.test(t)) return _PHOTO_PATHS;
  if (/(pricing|adr|rate|seasonal|occupancy|demand)/.test(t)) return _PRICING_PATHS;
  return _DEFAULT_PATHS;
}

// Used by image-generation cache key.
export function pathFamilyForRec(recTitle) {
  const t = (recTitle || '').toLowerCase();
  if (/(sleep|capacity|mezzanine|family|sleeps|bunk)/.test(t)) return 'sleep';
  if (/(light|lamp|fixture|2700k|kelvin|illuminat|evening)/.test(t)) return 'lighting';
  if (/(outdoor|terrace|patio|garden|dining|balcony)/.test(t)) return 'outdoor';
  if (/(photo|photograph|cover|hero|thumbnail|editorial.*photo|listing.*photo)/.test(t)) return 'photo';
  if (/(pricing|adr|rate|seasonal|occupancy|demand)/.test(t)) return 'pricing';
  return 'default';
}
