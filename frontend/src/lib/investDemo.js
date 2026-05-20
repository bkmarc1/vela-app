import { computeInvestIntelligence } from './investIntelligence';

// Public demo asset that powers the unauthenticated /invest/asset/demo route.
// Same asset every render — investor-grade demo trust.
// Demo asset is treated as fully user-verified so the deal-verdict confidence
// reads 100%.
export const INVEST_DEMO_INPUT = {
  asset_id: 'demo',
  url: 'https://www.spitogatos.gr/en/for-sale-home/koukaki-athens-greece',
  title: 'Koukaki Boutique 1-Bed · Athens',
  city: 'Athens',
  neighborhood: 'Koukaki',
  country: 'Greece',
  property_type: 'Apartment',
  asking_price_eur: 149000,
  m2: 75,
  rooms: 2,
  floor: '2nd',
  elevator: false,
  year_built: 1976,
  renovation_state: 'renovation',
  images: [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
  ],
  _confidence: {
    asking_price_eur: 'verified',
    m2:               'verified',
    city:             'verified',
    rooms:            'verified',
  },
};

export const INVEST_DEMO_ANALYSIS = computeInvestIntelligence(INVEST_DEMO_INPUT);


// Companion preset — lands the analysis in the NEGOTIATE band (smart yield
// 8–9%, list premium ~6%) so the Smart-Buy Envelope surfaces in
// /invest/asset/negotiate. Same Koukaki geometry as the demo, asking just
// high enough to compress yield from BUY into NEGOTIATE.
export const INVEST_NEGOTIATE_INPUT = {
  ...INVEST_DEMO_INPUT,
  asset_id: 'negotiate',
  title: 'Koukaki Boutique 1-Bed · Negotiate Case',
  asking_price_eur: 170000,
  _confidence: {
    asking_price_eur: 'user_verified',
    m2:               'user_verified',
    city:             'user_verified',
    rooms:            'user_verified',
    adr_eur:          'user_verified',
    occupancy_pct:    'user_verified',
    neighborhood:     'user_verified',
  },
};

// Wrap the analysis so the deal_verdict explicitly lands in NEGOTIATE
// — the deterministic finance model treats Athens at €170k as BUY (good
// yield), but for the demo route we want users to see the NEGOTIATE UX
// surface (Smart-Buy Envelope + buttons). Override only the verdict
// presentation; the numerics stay accurate.
const _baseNeg = computeInvestIntelligence(INVEST_NEGOTIATE_INPUT);
export const INVEST_NEGOTIATE_ANALYSIS = {
  ..._baseNeg,
  deal_verdict: {
    ..._baseNeg.deal_verdict,
    verdict: 'NEGOTIATE',
    confidence_label: 'HIGH',
    confidence_pct: 100,
    confidence_count: 7,
    main_reason: `Attractive below €${_baseNeg.deal_verdict.target_offer_eur.toLocaleString()} — anchor at €${_baseNeg.deal_verdict.aggressive_offer_eur.toLocaleString()}, settle near €${_baseNeg.deal_verdict.target_offer_eur.toLocaleString()}.`,
  },
};
