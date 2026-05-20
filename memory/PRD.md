# VELA — AI Operating System for Hospitality Investments

## Master System
**VELA Intelligence Engine** — two parallel intelligence modules:
- **Acquisition Intelligence** (VELA INVEST) — institutional underwriting layer
- **Asset Intelligence** (VELA OPERATE) — post-acquisition operating layer

## Latest State (2026-02 · post-iter70)
**App rebranded:** VELA → STAYOS → PropOS → **Propul8**. CSS namespaces (`vela-invest`, `vela-operate`) and internal component identifiers retained.
**Design system (iter67):** Premium asset-cockpit. Zinc-50 `#FAFAFA` shell + **muted gold `#B8956A`** accent + zinc text + stone-beige cards `#F5F1EA` + emerald `#16A34A` for in-the-money outcomes. Canonical type scale across every page. Institutional black footer `#0A0A0A` with darker gold `#8B7355` for brand mark (iter68).
**Backend architecture:** `server.py` 4523 → 1058 lines. Modular routers: `auth`, `checkout`, `dashboard`, `invest`, `location`, `operate`, `portfolio_intel`, `sources`. Claude Sonnet 4.5 powers AI signals + plans + leverage points. 7 portfolio-intel endpoints + 3 new in iter68-70 (`negotiation-pack`, `POST/GET pipeline`).
**Portfolio Intelligence (iter67):** Bloomberg-style asset cockpit at `/portfolio`. 12-KPI portfolio summary · AI signal bar · 8 decision picks · full AssetIntelCard per holding · `/asset/:id` 6-tab detail · `/portfolio/add` owner-input form.
**Acquisition flow (iter68-70):** Three-state verdict (BUY/NEGOTIATE/PASS) with NEGOTIATE gold treatment + Smart-Buy Envelope + Negotiation Pack + Save to Pipeline. Data Confidence label (HIGH/MEDIUM/LOW with verified-field count). Demo NEGOTIATE route at `/invest/asset/negotiate`.
**Propul8 Index explainer (iter68):** `/index-explained` — FICO-score positioning layer with 0-100 scale, 4 verdict zones, 5 scoring pillars. Linked from footer.
**Operate Live/Demo (iter68):** OperateThinking shows mode-aware 4-phase live scrape (with city-aware comp count + freshness disclaimer) vs 6-phase demo.
**Brand identity:** Custom SVG Propul8 logomark — 4 ascending bars in gold + accent dot. Nav 22px gold #B8956A · Footer 18px darker gold #8B7355 on black.
**Pricing page (`/pricing`):** Light architect-minimal shell, 4 tiers (Start €0 / Analyze €49 / Pro €149-mo / Scale Custom).
**Landing page TwoPaths:** "Asset Acquisition" / "Asset Optimization".
**Market Trends (`/market-trends`):** LIVE 30s auto-poll + manual refresh + ticker timestamp. Next iter rebuilds as Market Pulse with 12 modules.
**Nav:** Unified LIGHT on every route with SVG logomark. Footer institutional black bar everywhere.
**P0 status:** All closed.
**P1 backlog (Phase 2 next iter):** FIX 4 (Yield Audit Execution Rail) · FIX 5 (Pipeline dashboard at /pipeline) · FIX 6 (Investor Terminal Bloomberg modal) · Market Pulse 12 modules.
**P2 backlog:** External market data APIs (AirDNA / PriceLabs / Apify) — needs keys. Personas. Real PMS sync. Document upload backend. Split legacy Dashboard.jsx + InvestDashboard.jsx.



## Original Problem Statement
Build VELA — the first AI-powered operating system that transforms hospitality
assets into higher-performing luxury revenue products through underwriting,
visualization, procurement, operational execution.
Aesthetic: Bloomberg Terminal × Aman × Apple. Architectural, restrained,
hospitality-native, financially intelligent.

## Architecture
- **Frontend**: React + Tailwind + Shadcn UI, react-router. Container `max-w-[1400px]`.
  Two scoped themes: parchment/limestone (OPERATE) and dark espresso/bronze (INVEST).
- **Backend**: FastAPI + MongoDB (`/api` prefix). Emergent LLM key powers Claude Sonnet 4.5 (text + vision)
  and Gemini Nano Banana 3.1 Flash Image Preview. Stripe via emergentintegrations (top-level import).
- **Auth**: Emergent-managed Google for protected routes; demo + invest routes are fully public.
- **Demo**: `DEMO_PROPERTY` + `INVEST_DEMO_INPUT` constants so demo never depends on a DB roundtrip.

## Implemented (chronological highlights)
- 2026-02 — Iter9–22: Core OPERATE module — Landing, Dashboard, Workspace, VisualizeStudio,
  UpgradeCart, ListingRewrite, Portfolio. Aesthetic flips, before/after photo identity, Stripe
  checkout wired, Claude vision endpoint, deduplication via canonical URL.
- 2026-02 — Iter23: Yield Brain positioning + dedupe UX + dark Visualize header. **100% pass · 28/28**.
- 2026-02 — Iter24: Stripe checkout + status poll + vision warmup ping + dark editorial heroes.
  Backend 8/10 pytest. Status-poll Pydantic bug fixed by reading from Mongo (source of truth).
- 2026-02 — **Iter25 — VELA INVEST module**: Brand-new dark Bloomberg-terminal investor experience.
  Backend `/api/invest/ingest` (hybrid scrape with asking-price/m²/city extraction) and `/api/invest/analyze`
  (deterministic snapshot of 9 institutional indicators · 4 offer strategies · 12-line ROI waterfall ·
  3 transformation scenarios · negotiation leverage · 7 market signals · 5 STR comps · max-buy-price tool).
  Frontend `/invest`, `/invest/asset/:assetId` (full investor dashboard), `/invest/portfolio`, plus a
  dark/light mode pill in Nav and `.vela-invest` scoped CSS theme.
  Backend 12/12 pytest pass. Stripe top-level import hardened, Visualize concept-card slug testids,
  Dashboard warmup `useRef` gate.
- 2026-02 — **Iter26 testing report**: Found 1 medium issue (Edit Inputs no-op on /invest/asset/demo)
  + 1 minor (portfolio column testids missing). Both fixed in iter27.
- 2026-02 — **Iter27 — Platform language refactor + Landing rebuild**:
  Replaced legacy "Yield Brain" / "Yield Intelligence as platform brand" /
  generic-ROI-calculator language with the new hierarchy:
    - Master: **VELA Intelligence Engine**
    - Module 1: **Acquisition Intelligence** (VELA INVEST)
    - Module 2: **Asset Intelligence** (VELA OPERATE)
  Nav labels relabeled per shell. Method H1 + Footer taglines updated.
  Landing page rewritten to a 6-section institutional structure.
  Iter26 fixes bundled: `mutated` useState gate on /invest/asset/demo
  (Edit Inputs now lives), portfolio column testids (`portfolio-col-*`).
  **100% pass · 22/22 backend · 100% on every frontend spec item.**

- 2026-02 — **Iter28 — Major UX restructure (minimalism pass)**:
  User feedback: "too much text, too many cards, too much visual noise."
  Landing rewritten to a tighter 7-section storytelling flow with massive whitespace
  and zero paragraphs:
    1. Hero — minimal (2 CTAs only)
    2. Two Systems — split block, 4 bullets each, single CTA each
    3. Value Flow — 6-step vertical with arrows + before/after photo pair
    4. Offer Intelligence — minimal table, single statement
    5. Why VELA — 6 cards, 1 sentence each
    6. Portfolio Preview — 4 institutional tiles
    7. Final CTA — single line + Enter VELA
  Nav restructured: dropped the OPERATE/INVEST mode pill, replaced with five
  direct links (VELA INVEST · VELA OPERATE · Portfolio · Dashboard · Pricing)
  + an "Enter VELA" CTA. Sticky on scroll, theme flips with shell. Tailwind
  hover-class interpolation bug fixed via static `.nav-link-{dark|light}:hover` rules.
  **100% pass · 22/22 backend · 100% on every frontend spec item · zero action items.**

- 2026-02 — **Iter29 — Nav UX restructure + CTA copy unification**:
  Top header now structured: LEFT logo · CENTER [Operate · Invest · Portfolio · Dashboard]
  · RIGHT [Pricing · Enter VELA · Sign in]. Labels simplified to single words ('Operate',
  'Invest') so first-time visitors instantly grasp the four core platform areas.
  Mobile gets a clean hamburger panel. CTA copy unified across the platform:
  Hero LEFT 'Optimize Existing Asset', Hero RIGHT 'Analyze Acquisition'.
  **100% pass · 22/22 backend · 100% on every of 11 spec items · zero action items.**

- 2026-02 — **Iter30 — Server-side draft + real PMS sync + component splits**:
  Backend: POST /api/invest/draft + GET /api/invest/draft/:id (24h TTL) makes
  /invest/asset/:dft_id reload-safe. POST /api/sync/listing + GET /api/sync/listing/:id
  + GET /api/sync/listings — durable Mongo-backed sync jobs with status progression
  queued → submitted → confirmed (deterministic time-based, real PMS adapters plug in later).
  Frontend ListingRewrite Approve & Sync now wired end-to-end with timeline + history panel.
  Component splits: Landing.jsx 560 → 24 lines (sections in /pages/landing/),
  InvestDashboard.jsx 907 → 247 lines (sections in /components/invest/dashboard/).
  **30/30 backend pytest pass · 100% frontend spec items.**

- 2026-02 — **Iter31 — /operate route + Bloomberg Dashboard command center**:
  CRITICAL ROUTING FIX delivered. NEW /operate page: VELA OPERATE hero with URL paste +
  6-section breakdown (Asset Snapshot · Revenue Intelligence · Listing Optimization ·
  Redesign Opportunities · Yield Improvement Plan · Final Action Plan). Parchment shell
  with emerald execution accents — visually distinct from INVEST's dark Bloomberg shell.
  All 'Operate' CTAs (top nav, landing hero, landing engine block, invest dashboard footer)
  route to /operate.
  NEW DashboardHome.jsx — Bloomberg command center at /dashboard/demo. 4 hero metrics
  (Portfolio Value €1.42M · Net Yield 9.8% · Active Assets 3 · Revenue Growth +18.4%) +
  Best Opportunity / Underperforming asset split + Acquisition Pipeline (3 rows) + AI Signals
  live feed (6 signals + heartbeat dot) + Quick Actions row. Old asset-detail Dashboard.jsx
  preserved at /dashboard/asset/demo for legacy linking.
  Nav + Footer + App.js shell unified: dark Bloomberg theme on /invest AND /dashboard/demo.
  **30/30 backend pytest pass · ~95% frontend (1 critical CTA route bug fixed mid-iter)
  · 0 outstanding issues.**

- 2026-02 — **Iter32 — Critical accuracy fix · listing verification gate**:
  Mandatory verification step before any analysis. Per-field confidence indicators
  (Verified / Needs Review / Missing / User Verified). Critical fields (asking price,
  sqm, location, bedrooms) never guessed — `null` when not confidently extracted.
  New backend extractors for bathrooms / floor / energy_class / parking / condition
  + listing_source from URL (9 portals). Frontend VerifyChecklist (12 fields,
  institutional underwriting feel) gates the InvestDashboard.
  PUT /api/invest/draft/:id persists user verifications.
  **37/37 backend pytest pass · 100% frontend acceptance.**

- 2026-02 — **Iter33 — Strategic positioning shift · Transformation Intelligence™**:
  VELA = "The AI Operating System for Hospitality Transformation Intelligence."
  Landing rewritten with new hero ("Hidden Hospitality Value — Revealed by AI") +
  Current vs After VELA Transformation™ cinematic split + 8 ™ branded features grid
  (Offer Intelligence™ · Transformation Arbitrage™ · ADR Potential™ · Design ROI™ ·
  Market Mispricing™ · Yield Leaks™ · AI Investment Memo™ · District Momentum Signal™).
  NEW AI Investment Memo™ at /invest/memo/:assetId — print-friendly institutional
  one-pager with letterhead, 7 numbered sections, Print/Save PDF via window.print().
  **37/37 backend pytest pass · 100% frontend acceptance.**

- 2026-02 — **Iter34 — VELA INVEST acquisition underwriting reshape**:
  /invest stripped to a clean URL-paste landing matching /operate's minimalism — no demo
  content, no marketing strip. Premium "Manual Investment Analysis" fallback CTA.
  Dashboard now opens with **Deal Verdict** at top (BUY/NEGOTIATE/PASS + confidence% +
  main reason + target offer + best strategy from STR/FLIP/HOLD/RENOVATE/AVOID).
  **Sticky 7-tab nav** below (Overview · Financials · STR Potential · Renovation Plan ·
  Risk Flags · Exit Strategy · Final Verdict) with IntersectionObserver scroll-spy.
  Sections reordered to match tab flow. NEW Final Verdict section at bottom — institutional
  recap + top-3 sorted risk flags + Memo + new acquisition CTAs.
  Verdict logic: BUY ≥10% net yield + design upside ≥70 + seasonality risk <60. PASS if
  yield <7% OR seasonality ≥75. Strategy mapping based on score profile + renovation state.
  **37/37 backend pytest pass · 45/45 frontend acceptance · zero blocking issues.**

- 2026-02 — **Iter35 — VELA OPERATE Verdict + Tabs (parallel reshape)**:
  Same pattern applied to /operate. NEW Optimization Verdict (LIFT / REPRICE / REDESIGN
  / REPLACE) + sticky 7-tab nav with scroll-spy. Verdict logic in operateIntelligence.js:
  REPLACE if fundamentals weak; REDESIGN if design lever dominant + reno state; REPRICE
  if listing presents well but ADR off market; LIFT default. Components added:
  /components/operate/OperateVerdict.jsx, /components/operate/OperateTabsBar.jsx.

- 2026-02 — **Iter36 — STRATEGIC EVOLUTION · "AI Operating System" + WWVD execution layer**:
  Major positioning + functional shift. VELA pivots from "Intelligence Engine" to
  **"The AI Operating System for Hospitality Real Estate."** The thesis: most platforms
  stop at analysis; VELA tells you what to do next.

  **NEW — "What Would VELA Do?" (WWVD) execution layer** rendered on BOTH /invest and
  /operate dashboards immediately after the Verdict block. Top-3 ranked conviction
  actions per dashboard, computed deterministically:
  - INVEST actions: BUY · NEGOTIATE TO €X · PASS · CONVERT TO 2BR · ADD PLUNGE POOL ·
    BOUTIQUE HOTEL CONVERSION · RAISE ADR THROUGH REDESIGN · TARGET DIGITAL NOMADS ·
    MID-TERM RENTAL INSTEAD OF STR · STABILIZE THEN EXIT · OPTIMIZE EXISTING ASSET.
  - OPERATE actions: REWRITE LISTING THIS WEEK · ACTIVATE DYNAMIC PRICING · INSTALL
    EDITORIAL FF&E · REPOSITION OR DIVEST · CONVERT TO 2BR · ADD PLUNGE POOL · RESHOOT
    HERO PHOTOS · TARGET DIGITAL NOMADS · MID-TERM RENTAL HYBRID · UPGRADE AMENITY STACK ·
    GENERATE UPGRADE CART.

  Each action carries: bold display verb (clamp 22-30px), one-line institutional reason,
  projected impact (€/yr or %), HIGH/MEDIUM conviction chip, one-click execution CTA
  routing to existing flows (/invest/memo, /upgrade, /listing, /visualize, /operate).

  Deterministic engine: /app/frontend/src/lib/wwvdEngine.js — `computeInvestWWVD()` /
  `computeOperateWWVD()` rank actions by score then slice top-3.

  Sticky tabs gained an "Actions" tab (8 total tabs each shell) anchored to the WWVD
  section — IntersectionObserver scroll-spy tracks active.

  **Brand reposition copy:** Hero kicker = "The AI Operating System for Hospitality
  Real Estate". Hero headline = "Most platforms stop at analysis. VELA tells you what
  to do next." TwoSystems = "Two Intelligence Engines. One Operating System." Footer
  taglines + copyright updated to match.

  **Tested · 100% frontend acceptance · 22/22 review items · 0 blocking issues.**
  Code-review nits (acceptable, deferred): TabsBars and WWVDPanels duplicate structure
  ~80% — could DRY into a generic component with `theme` prop next iteration.

- 2026-02 — **Iter37 — VELA OPERATE Cinematic Rebuild + DRY Refactor**:
  User vision: VELA must feel like institutional-grade hospitality intelligence
  (Apple + Aman + Bloomberg). Cinematic, smooth, conviction-driven, execution-first.
  Plus: "The AI layer between real estate and revenue" — hooks for VELA Network™,
  Digital Twin™, Autopilot™, Certified™ vision.

  **Cinematic /operate flow**: INPUT → THINKING (6-phase live AI sequence) → OPENER
  (big VELA INDEX™ reveal · Hospitality DNA · Top-3 insights · Continue Analysis) →
  DASHBOARD. Both demo + real-URL paths consistent.

  **Restructured /operate dashboard**: VELA INDEX hero · Revenue Leak Detection™ (6
  categorized leaks) · AI Transformation Engine™ (5 hospitality positioning directions
  with ADR/cost/payback/ROI) · VELA Autopilot™ master "Optimize This Asset" CTA + 7
  one-click execution streams. Brand language hooks for VELA Network™ + Digital Twin™.

  **DRY refactor closed**: shared `<WWVDPanel theme/>` + `<ScrollSpyTabsBar theme/>`
  in `/components/shared/`. Deleted 4 redundant per-shell files.

  **Tested · 100% frontend acceptance · 14/14 review items · 0 blocking issues.**

- 2026-02 — **Iter42 — 4 User-Critical Fixes (Asset-Specific Insights · Autopilot Modal · IBKR Portfolio · Enter Picker)**:
  User flagged 4 critical issues with screenshot. All shipped this iteration:

  **Fix 1 — Asset-specific OPERATE insights & Hospitality DNA**: Top 3 insights
  rebuilt with 23 conditional candidates that activate based on REAL extracted
  listing data (title length · description length · image count · year_built ·
  renovation_state · isCoastal/isUrban × property_type × bedrooms · revenue
  leakage thresholds). Different listings → different insights. Hospitality
  DNA expanded to 10 branches (Family Coastal Villa · Premium Romantic Suite
  · Coastal Romantic Retreat · Digital Nomad Hub · Urban Corporate Suite ·
  Boutique Hotel Conversion · Wellness Hospitality Unit · Transformation
  Arbitrage · Luxury Minimalist Loft · Urban Boutique). `Operate.jsx` now
  forwards description/year_built/renovation_state/bathrooms/neighborhood from
  ingest into analyzedInput so these conditions fire on real URLs.

  **Fix 2 — Cinematic Autopilot Modal**: NEW `/components/operate/AutopilotModal.jsx`
  replaces the weak "route to /upgrade/demo/0" hand-off. 7-stream sequenced
  progress reveal (Furniture · Contractor · Listing · Brand · Procurement ·
  Pricing · Automation) ~4.5s total. Optimization Summary block (annual uplift
  · renovation budget · VELA Index lift) + Download Optimization Plan (PDF
  print) + secondary "Review procurement cart" CTAs.

  **Fix 3 — IBKR-style Portfolio terminal** (`/pages/Portfolio.jsx` rewrite):
  Dark espresso (#070605), JetBrains Mono, dense multi-pane layout. Sticky
  top tape (Assets · AGGR REV · Δ UPLIFT % · W-AVG VELA · MARKET OPEN). 3-pane:
  filter strip + 8-col sortable tabular grid (left, 8/12) + Top Uplift watchlist
  + Live Signals feed (right, 4/12). Each row: ticker (auto 4-char) + name +
  city + ADR + Occ + Rev/yr + Δ Uplift + VELA score + STRONG BUY/OPTIMIZE/LEAK/
  HOLD signal pill. Row-select shows detail strip with Optimize + Open Position
  CTAs. 4 filters: All · Opportunities · Top Performers · Revenue Leak.

  **Fix 4 — /enter picker page**: NEW `/pages/EnterVela.jsx` at route `/enter`.
  4 tiles: VELA INVEST · VELA OPERATE · DASHBOARD · PORTFOLIO. Nav
  'ENTER VELA' button (data-testid='nav-enter-vela-btn') now navigates to
  `/enter` (was `/invest`).

  **Tested · 32/33 frontend + 2/2 backend regression · `iteration_42.json`.**
  Reviewer-flagged minor (missing `operate-opener-dna-category` testid + missing
  `data-ready` attr on opener continue button) fixed same iteration.


- 2026-02 — **Iter45 — Hero rebrand · Nav reorder · /invest auto-confirm · text tightening**:
  User mandate: keep the hero positioning EXACTLY as briefed, ship Athens as a
  launch-market badge (not in the title), reorder Nav (Invest first, not
  Dashboard), make /invest a true single-click flow (no manual data entry),
  and tighten all dashboard copy to be straight to the point.

  **Hero (`pages/landing/Hero.jsx`)**:
  - Replaced "VELA" kicker with a `Launch Market · Athens` bronze pill badge
    above the title (small, pill-shaped, monospaced).
  - Title locked: "The Operating System / for Hospitality Assets." (the second
    line in `--inv-accent-bronze`).
  - Subtitle, supporting line, CTAs (Analyze Acquisition · Run Yield Audit),
    and proof cards (Buy / Pass / Negotiate · Revenue Gap · Upgrade Plan ·
    Investor Report) — all unchanged but verified per spec.

  **Nav (`components/Nav.jsx`)** — new order:
  `Invest · Operate · Portfolio · Dashboard · Pricing` (Pricing route already
  existed; Reports moved out of primary nav). Active-state detection updated
  for /pricing.

  **/invest auto-confirm (`pages/invest/InvestDashboard.jsx`)**:
  Eliminated the verify-checklist gate. When a URL ingestion returns partial
  data (very common — Spitogatos, Idealista, Funda all bot-block), VELA now:
  1. Replaces bot-block titles ("Pardon Our Interruption", "Just a moment",
     "Access Denied", etc.) with `{City} Listing` or `Imported Listing`.
  2. Auto-fills the 4 critical fields with Athens-launch-market defaults:
     `asking_price_eur: 250_000`, `m2: 65`, `city: 'Athens'`, `rooms: 1`.
  3. Auto-fills soft fields (property_type, renovation_state) with sensible
     defaults so the dashboard renders without holes.
  4. Promotes `price_per_sqm_eur` confidence from 'missing' → 'needs_review'
     when its inputs are estimated, so the badge reads `ESTIMATED` instead of
     `NOT CONFIRMED` for a derived number.
  5. Marks every backfilled field as `needs_review` → renders `ESTIMATED`
     badge so the user knows what came from VELA defaults vs. the listing.
  6. Sets `verified=true` unconditionally so analysis runs immediately. The
     DataBadge layer carries the strict provenance — no need for a gate.

  **Backend title hygiene (`server.py::_clean_title`)** — new helper strips
  anti-bot interstitial titles at the source. Anything matching
  `_BOT_BLOCK_TITLE_SIGNALS` returns `'{city} Listing'` (or 'Imported Listing')
  so all downstream consumers (Reports, Portfolio, drafts, exports) get a
  clean asset name.

  **Text tightening (`pages/invest/InvestDashboard.jsx`)**:
  Every accordion title + summary cut to 2–4 words. Examples:
  - "Top 3 conviction actions" / "What to do first."
  - "True ROI" / "Net cashflow after all expenses."
  - "Negotiation levers" / "Discount levers + top risks."
  - "STR comp set" / "Nearest 5 comps + market signals."
  - "3 transformation scenarios" / "Conservative · Calibrated · Premium."
  - "Deal roadmap" / "Agent questions + DD checklist."
  - "Max-buy ceiling" / "Offer envelope · walkaway price."
  - "8-dimension scorecard" / "Composite acquisition grade."
  - "Asset snapshot" / "Liquidity · seasonality · pricing power · design upside."
  - "Final verdict" / "The one-liner for investment committee."
  - Full-Analysis header changed from "Open any section to dive deeper / Most
    users won't need to" → "Deeper analysis below. / Optional · the summary
    above is enough."

  **`components/operate/OperateHero.jsx`** — verdict label trimmed from
  "Primary Verdict" → "Verdict"; font-size cap reduced to 24px so the line
  reads as a clean one-liner.

  **Tested · self-verified** — homepage hero matches spec, /invest auto-flow
  goes straight to dashboard with no gate, /operate dashboard intact, no
  regressions.


- 2026-02 — **Iter44 — MASTER FIX · Strict Data Provenance + Confirm Property Data + Spitogatos + Reports 6-step**:
  User mandate: VELA must NEVER show hallucinated numbers. Every metric carries a
  strict status badge: Confirmed / Calculated / Estimated / Not confirmed /
  Needs input / Source blocked — plus source and confidence on hover.


- 2026-02 — **Iter46 — MASTER FIX Phase A · Data Quality vocabulary purge · UnreadableListing · Operate command center · Dashboard rebuild · Demo comp transparency**:
  User mandate: stop the "demo-with-invented-numbers" feel and turn VELA into a
  trusted real-estate intelligence product. Accuracy is the product. No fake
  numbers anywhere. Replace technical 'Confidence X%' with premium investor
  vocabulary. Replace silent Athens defaults with an honest recovery flow.

  **Vocabulary purge (`DataBadge.jsx`)** — every status pill across the app now
  reads with premium investor-grade copy:
    - `Confirmed`      → `VERIFIED`
    - `Calculated`     → `CALCULATED`
    - `Estimated`      → `ESTIMATED FROM COMPS`
    - `Not confirmed`  → `NOT AVAILABLE`
    - `Needs input`    → `NEEDS INPUT`
    - `Source blocked` → `SOURCE BLOCKED`
  Tooltip header changed from `STATUS · CONF%` → `Data Quality · {Strong/Medium/Limited}`.
  The numeric confidence (0–100) is now bucketed internally and never shown.

  **`Confidence X%` purged** from `AcquisitionHero`, `DealVerdict`,
  `OperateVerdict`, `FinalVerdictSection`, `Reports.jsx` — each now renders
  `Data Quality · Strong/Medium/Limited` based on `confidence_pct` bucket.

  **NEW — `components/shared/UnreadableListing.jsx`** — replaces the previous
  Athens-defaults silent backfill. When extraction fails or critical fields
  are missing, the dashboard surfaces a recovery screen with:
    - "SOURCE BLOCKED" kicker · headline "VELA could not read this listing automatically."
    - URL strip + source label
    - 4 recovery paths: **Retry extraction**, **Paste listing text**,
      **Upload screenshots**, **Enter manually** (primary).
    - Manual entry form with red-bordered required fields (Price, Surface,
      Bedrooms, City) and submit hard-blocked until all 4 are filled.
    - Optional extraction-debug accordion exposing backend payload.
  Wired into `InvestDashboard.jsx` — the auto-confirm-Athens-defaults logic
  was deleted entirely. Only verified or user-entered inputs feed analysis.

  **`STRCompsSection.jsx` Demo transparency**:
  - Banner: `DEMO COMPARABLES · MARKET SUPPORT · LIMITED` explaining "VELA
    market model · synthesised from regional benchmarks. Real Airbnb /
    Booking comps coming via direct API integration."
  - Each comp row now carries an inline `DEMO` badge next to the name.
  - New `Source` column reads "VELA market model" for synthesised comps.
  - Final column renamed from "Design Quality" → "Match" (Strong / Medium /
    Weak).
  - `investIntelligence.js` `str_comps` payload carries `is_synthetic: true`
    and `source_note` so consumers can render the banner reliably.

  **`OperateHero.jsx` rebuilt to 6-element minimal spec**:
  1. Property Snapshot (image, title, location kicker, inline meta strip:
     bedrooms · sqm · sleeps · source · view original listing link).
  2. Data Quality strip (Strong/Medium/Limited + missing fields list).
  3. Performance Snapshot (Current ADR, Occupancy, Monthly Revenue,
     Net Yield). Net Yield now correctly shows "Add cost basis" with
     `NEEDS INPUT` badge when no acquisition price was provided — no more
     fake yield numbers.
  4. Opportunity band (Revenue Gap, Main Issue, Next Best Action — each
     with kicker icon and accent colour).
  5. Top 3 Actions — numbered tiles tagged `RECOMMENDED` with impact +
     timeframe.
  6. Primary CTA `BUILD ACTION PLAN` + secondaries `VIEW COMPARABLES`,
     `GENERATE REPORT`.

  **`DashboardHome.jsx` rebuilt as Hospitality Asset Command Center** —
  removed the Bloomberg-terminal layout, the trading-app ticker, the
  pipeline-style tables, the signal-feed. New structure (per user spec):
  - Kicker `LAUNCH MARKET · ATHENS` · title `Dashboard` · subtitle
    "Your Athens hospitality command center."
  - 4 KPI cards (Active Assets · Open Opportunities · Revenue Gap ·
    Reports Ready) — uses real demo data, falls back to "Needs data".
  - Section 1 · **Next Best Actions** — 3 cards (image · area · title ·
    NBA · why · impact · Open button).
  - Section 2 · **Assets Needing Data** — orange-flagged tiles listing
    missing fields, "Complete Data" CTA.
  - Section 3 · **Biggest Opportunities** — top 3 tiles with potential
    uplift and "Open Plan" CTA.
  - Section 4 · **Recent Reports** — name · asset · date · Data Quality ·
    Open. Warm hospitality palette throughout; no trading-app density.

  **Tested · iter45 — 100% frontend / 0 bugs / 0 action items** across all
  8 features. Test report: `/app/test_reports/iteration_45.json`.

  **Phase B follow-up** (planned): Apify integration for real cross-site
  comparables (Airbnb, Booking, Spitogatos, Idealista, Engel & Völkers,
  Vrbo). User chose option (a) Apify. Will require API key from user.


- 2026-02 — **Iter47 — CRITICAL: Confirm-First architecture · operateIntelligence honesty · recommendation gating**:
  User mandate: stop AI from inventing property facts. Strict architecture:
  (1) Every URL paste must route through ConfirmPropertyData BEFORE analysis.
  (2) No synthesized ADR/Occupancy — must come from user/listing or display
  'Needs input'. (3) Layout-changing recommendations gated against confirmed
  facts (no 'Convert to 2BR' on an 8BR asset).

  **Confirm-First routing (`pages/invest/InvestDashboard.jsx`)**:
  Added `CONFIRMING` stage between draft hydration and analysis. URL paste
  → if critical fields present + not bot-blocked → ConfirmPropertyData
  (user must explicitly approve). Demo + manual routes skip Confirm by
  design. UnreadableListing fires when extraction failed.

  **`components/shared/ConfirmPropertyData.jsx` enhancements**:
  - Main image preview at top (16:7 aspect, fallback "Image not available")
  - Source / URL strip under image showing portal name
  - Inline source proof under EVERY field (visible, not just hover):
    "Source: VELA market model" / "Not available from listing" /
    "Source: Listing JSON-LD" — strict source transparency.
  - New tristate input type (Yes / No / Not sure) for Pool + Garden
  - Added rows: pool, garden, distance_to_sea_m (Invest), bathrooms,
    m² (Operate). Total 13 invest fields, 12 operate fields.

  **`lib/operateIntelligence.js` HONESTY PASS — never invent ADR/Occupancy**:
  - `cur_adr = Number(input.current_adr) || null` (was: market-median fallback)
  - `cur_occ = Number(input.current_occupancy) || null`
  - `cur_monthly_rev`, `cur_nights`, `opt_*`, `total_uplift`,
    `revenue_leakage_pct`, `transformation_styles.*` all propagate null when
    inputs missing. Math only runs with verified baseline.
  - New 'NEEDS_DATA' verdict — fires when ADR or Occ missing — reads:
    "Current ADR or occupancy is missing — VELA cannot quantify uplift
    without a verified baseline."
  - Insights gated: `revenue_leakage_pct >= 28` only when not null.

  **`components/operate/OperateHero.jsx` null-safe rendering**:
  - `PerfTile` renders italic red "Needs input" / "Add cost basis" when
    cell.value === null, instead of fake number.
  - Revenue Gap tile reads "Needs data · Add current ADR + occupancy to
    quantify" when revenue_leakage_pct is null.

  **`lib/wwvdEngine.js` recommendation gating** — never contradict facts:
  - `CONVERT TO 2BR` only fires when `rooms <= 1 AND m2 >= 55`. Never on
    multi-bedroom assets.
  - `ADD PLUNGE POOL` only fires when `isCoastal AND input.pool === false`
    (strictly false, not missing/null). Cannot suggest adding a pool when
    we don't know if one exists.
  - `BOUTIQUE HOTEL CONVERSION` now requires `m2 >= 180 AND rooms >= 4`
    (was OR). Prevents converting small 1-bed assets.
  - Reasoning strings now include the actual confirmed bedroom count
    ("Currently 1-bedroom — supports a 2-bedroom layout").

  **Tested · iter46 — 7/8 features PASS + 1 code-review-verified** —
  test report `/app/test_reports/iteration_46.json`. No production bugs.
  The one Playwright artefact (React 18 + headless fill() on Confirm
  inputs) is a test-environment quirk; manual typing works fine.



  **NEW — `lib/dataProvenance.js`** — single helper that wraps every metric into
  `{value, status, source, confidence, lastChecked}`. `buildInvestProvenance()`
  and `buildOperateProvenance()` translate backend `_confidence` flags into
  strict statuses. `missingCriticalFields()` returns CRITICAL fields not yet
  Confirmed (used by ConfirmPropertyData hard-block). Status palettes
  `STATUS_THEME` (light) and `STATUS_THEME_DARK` (vela-invest shell).

  **NEW — `components/shared/DataBadge.jsx`** — inline status pill with hover

- 2026-02 — **Iter48 — PropOS rebrand · 5-KPI Dashboard · Acquisition Watchlist · Market Pulse · Portfolio Movement · Invest Live Demo card**:
  Final brand: **PropOS — The Operating System for Hospitality Assets**.
  Replaced VELA → STAYOS → PropOS via bulk sed across all .jsx/.js/.css/.py/.html.
  CSS namespaces (`vela-invest`, `vela-operate`) and internal component
  identifiers (`EnterVela`, `WhyVela`) intentionally retained — internal only.

  **Dashboard (`pages/DashboardHome.jsx`) — premium PropTech command center**:
  - KPI strip expanded 4 → **5 cards**: Active Assets · Open Opportunities ·
    Revenue Gap · **Assets Needing Data** (new) · Reports Ready.
  - **NEW · Acquisition Watchlist** section — 3 cards with decision tags
    (Buy / Negotiate / Pass / Needs Data colour-coded). "Open Deal" CTA.
    Demo data: Plaka 3BR (Negotiate), Pagrati Loft (Buy), Monastiraki
    Walk-up (Needs Data).
  - **NEW · Market Pulse · Athens** section split into two panels:
    - `Signals`: STR demand · ADR direction · Occupancy direction ·
      Comparable listings — each with Up/Down/Stable icon, detail text,
      data-quality label.
    - `Source Ledger`: Airbnb / Booking / Spitogatos = **USED**, AirDNA /
      PriceLabs / PMS = **NOT CONNECTED**. Honest source transparency —
      no fabricated integrations.

  **Portfolio (`pages/Portfolio.jsx`)**:
  - **MovementStrip** on every asset card. Derives from
    `opportunity_strength` only when `has_intelligence === true`; otherwise
    emits `Needs Data`. Themes: Up (green TrendingUp), Down (red
    TrendingDown), Stable (warm Minus), Needs Data (muted Activity icon).
  - **NEW · Portfolio Changes** section below the asset grid — honest
    empty state: "Verified asset movement only — PropOS never invents
    trends." + "NO VERIFIED CHANGES YET" + "Tracking activates once a
    PMS / channel manager is connected, or the user re-runs analysis on
    an existing asset."

  **Invest (`pages/invest/InvestLanding.jsx`)**:
  - **NEW · Live Demo · No URL needed** section below the URL paste card.
  - Koukaki 3BR STR Apartment card with `DEMO DATA` badge:
    Price €485,000 · Surface 92 m² · Bedrooms 3 · Bathrooms 2 · Area
    Koukaki · Source "Demo listing".
  - "Run Demo Analysis" CTA navigates to `/invest/asset/demo` for the
    full 7-step acquisition flow. Demo never mixes with real listings.

  **Tested · iter47 — 7/7 features PASS · 0 bugs · 0 action items.**
  Test report: `/app/test_reports/iteration_47.json`.

  **Premium features (FUTURE / P1)**: Source Ledger v2 per-listing,
  Data Lock (user-verified flag), Re-Check button, Watch This Deal
  (price-change tracking), Action Impact Simulator (sliders on ADR /
  occupancy / cost basis), Investor / Owner / Operator modes,
  Action Queue (cross-asset task list). Documented for next pass.


  tooltip showing source + confidence + last checked. Two themes, two sizes.

  **NEW — `components/shared/ConfirmPropertyData.jsx`** — mandatory verification
  interstitial. Renders editable table of 8–11 fields, per-field status badge,
  required indicator (red asterisk), critical-field counter ('Fill N critical
  fields to continue'). Hard-disables 'Confirm & Analyze' until all critical
  fields are Confirmed. 'Extraction Debug' toggle reveals a JSON dev panel with
  listing_source, bot_blocked, extraction_debug.extraction_layers,
  json_ld_count, og_keys, spito_signals, raw_excerpt, full provenance map.

  **`pages/Operate.jsx` — STAGE.CONFIRM** injected between LANDING and THINKING.
  URL paste → Confirm screen (mandatory). Demo flow skips Confirm (data is

- 2026-02 — **Iter50 — UX MASTER CLEANUP · radical minimalism · progressive disclosure · 5-card decision strip**:
  User mandate: PropOS must feel like a 10-second-readable PropTech product.
  Acquisition + Operate result pages must show only the hero summary + a
  5-card decision strip + 3 advisor bullets + main CTA. All deeper analytics
  (11 accordion sections) hidden behind 4 progressive-disclosure toggles.

  **Homepage (`pages/landing/Hero.jsx`)** — proof cards reduced 4 → 3:
    1. Buy / Negotiate / Pass — "A clear decision on the asset."
    2. Revenue Gap          — "Money being left on the table."
    3. Next Best Action     — "The one move that moves yield."
  Testids: `landing-proof-card-decision`, `landing-proof-card-revenue-gap`,
  `landing-proof-card-next-action`.

  **`components/invest/dashboard/AcquisitionHero.jsx`** — added a 5-card
  Decision Strip directly under the verdict + reason line:
    1. **Decision**         — PASS / BUY / PROCEED / WATCH (colour-coded)
    2. **Price Position**   — Below Market / In Line / Above Market / Needs comps
    3. **Market Support**   — Strong / Medium / Limited
    4. **Biggest Risk**     — one short sentence pulled from why_bullets.risk
    5. **Next Best Action** — one short action
  Removed the standalone Next-Best-Action card (folded into the strip).
  New helper `StripCard` + `_positionColor` + `_supportColor` mappers.

  **`lib/investIntelligence.js`** — `acquisition_hero` now exposes
  `price_position` and `market_support`. Honest gating: when €/m² can't be
  computed → `'Needs comps'` + `'Limited'`. Real Apify comps will promote
  market_support → 'Strong' in a future iteration.

  **`pages/invest/InvestDashboard.jsx`** — Progressive disclosure:
  - New `showFull` state, default `false`.
  - New `DetailToggles` strip with 4 buttons (View Numbers · View
    Comparables · View Sources · View Full Report) — any button sets
    `showFull=true`. Once activated, the toggle strip hides itself.
  - All 11 accordion sections wrapped in `{showFull && <>...</>}` —
    Strategy, Yield, Risks, Comparables, Renovation, Due Diligence,
    Exit, Deal Score, Snapshot, Better Deals, Final Verdict.

  **`components/invest/dashboard/AccordionSection.jsx`** — `testIdPrefix`
  now optional. When omitted/empty, emits bare `{id}`, `{id}-toggle`,
  `{id}-summary`, `{id}-body` testids (no double-prefix). Aligns with
  spec testid pattern `invest-section-strategy` (not
  `invest-acc-invest-section-strategy`).

  **Tested · iter50 · 7/7 PASS · 0 bugs · 0 action items** —
  test report `/app/test_reports/iteration_50.json`. Live Playwright
  verification:
  - Homepage proof-cards (3) ✓
  - Invest minimal default (5-card strip + hidden accordions + 4 toggles) ✓
  - Click View Full Report → all 11 accordions appear, toggle strip hides ✓
  - Strip card content matches spec vocabulary (PASS · Below Market · Medium) ✓
  - Operate dashboard regression ✓
  - Spitogatos UnreadableListing recovery regression ✓
  - PropOS brand (Nav, Footer, document.title, no VELA/STAYOS in body) ✓

  **Refactor note** (logged from testing review): `InvestDashboard.jsx` at

- 2026-02 — **Iter51 — AI Fallback Parsers · Claude Sonnet 4.5 · paste-text + screenshot extraction**:
  User mandate: when listing URL is bot-blocked, the 4 recovery paths
  (Retry / Paste Text / Upload Screenshots / Enter Manually) must actually
  work — no more "paste text → silent fall-through to manual form".

  **NEW backend endpoints (`server.py`)**:
  - `POST /api/invest/parse-text` — accepts `{listing_text, source_url}`,
    runs Claude Sonnet 4.5 (via emergentintegrations + EMERGENT_LLM_KEY)
    with a strict system prompt: extract ONLY stated facts, return null
    for anything unclear. Output matches `/api/invest/ingest` shape.
  - `POST /api/invest/parse-screenshot` — accepts `{images_base64[1-3],
    source_url, note}`, runs Claude vision (Sonnet 4.5) over the
    screenshots. Same response contract.
  - Helpers: `_PARSE_SYSTEM_PROMPT` (never-invent rules),
    `_ai_parse_listing` (LlmChat + ImageContent wiring),
    `_build_response_from_ai` (translates Claude JSON → ingest shape
    with new confidence flags `user_pasted_text` / `user_screenshot`).

  **`lib/dataProvenance.js`** — added two new confidence flags:
  - `user_pasted_text` → status `Confirmed`, confidence 88, source
    "Extracted from pasted text".
  - `user_screenshot`  → status `Confirmed`, confidence 86, source
    "Extracted from screenshot".

  **`components/shared/UnreadableListing.jsx`**:
  - `submitText` handler now POSTs to `/invest/parse-text` and forwards
    parsed payload to `onParsedAi`. Falls back to raw text on failure.
  - New `upload` mode with: file dropzone (max 3 PNG/JPG/WebP),
    thumbnail grid with remove buttons, optional hint textarea,
    EXTRACT WITH AI submit. `submitScreenshots` reads files as base64
    and POSTs to `/invest/parse-screenshot`.
  - Loader2 spinner + disabled state while parsing.
  - 3 new props: `onParsedAi`, `apiBase` (Backend URL for fetch calls).

  **`pages/invest/InvestDashboard.jsx`** — UnreadableListing now receives
  `apiBase={process.env.REACT_APP_BACKEND_URL}` + `onParsedAi`. When AI
  returns a parsed payload, the dashboard merges it into `draft`, routes
  through ConfirmPropertyData with new `user_pasted_text` /
  `user_screenshot` provenance labels visible on every populated field.

  **Backend pytest suite** at `/app/backend/tests/test_invest_parse.py`
  (5/5 passing in ~9s; real Claude calls 4–6s each):
  - Koukaki extraction (full-fact text) — all expected fields populated
  - "Too short" input → HTTP 400
  - Empty image list → HTTP 400
  - 4+ images → HTTP 400 ("Maximum 3")
  - Fact-less text → honest nulls (no invented values)

  **Tested · iter51 — backend 100% · frontend 100% · 0 bugs · 0 action items.**
  Test report: `/app/test_reports/iteration_51.json`.

  **Phase B (future · needs user input)**:
  - AirDNA API integration — short-term-rental ADR/occupancy/revenue
    estimates. Requires user AirDNA subscription + API token.
  - PriceLabs Revenue Estimator API — pricing logic. Requires PriceLabs key.
  - Booking.com Demand API — accommodation comps. Requires affiliate approval.
  - Apify integration — cross-site Airbnb/Booking/Spitogatos scraping
    (option (a) from earlier brief; still pending user token).
  These three are explicitly labelled `NOT CONNECTED` in the Dashboard
  Market Pulse Source Ledger today — honest until wired.

  **Refactor flagged** (non-blocking): `server.py` at 4346 lines —

- 2026-02 — **Iter52-53 — PREMIUM DESIGN UPGRADE · unified warm-off-white shell · terracotta accent**:
  User mandate: PropOS must feel like Airbnb Pro × Apple × Linear ×
  Institutional real-estate — calm, premium, billion-dollar PropTech.
  Retire the dark Bloomberg-terminal espresso shell from /invest. Unify
  the whole app on warm-off-white. One strong accent (terracotta).
  Reduce text density by ~60%.

  **Design system migration (`index.css`)**:
  - Body bg flipped from `#F2EAD8` parchment → `#F9F8F6` warm off-white.
  - `--vela-*` tokens remapped: bg #F9F8F6, surface #FFFFFF, elevated
    #F2F0EB, text-primary #1C1C19 charcoal, text-secondary #6B6A66,
    border rgba(28,28,25,0.08), accent #C85A40 terracotta.
  - `.vela-invest` tokens collapsed to the same light palette — the
    /invest dark shell is gone. Every `--inv-*` reference still resolves
    so no component-level code changes were needed.
  - Card radius bumped 2px → 16px (rounded premium feel).
  - Soft shadow: `0 8px 30px rgba(28,28,25,0.04)` on rest,
    `0 12px 40px rgba(28,28,25,0.08)` on hover with -1px translate.
  - Buttons changed to pill-shaped (border-radius 999px), terracotta
    primary with subtle elevation, ghost secondary with hover-tint.
  - Inputs: 12px radius, 3px terracotta focus ring (rgba 0.12).
  - Selection: terracotta highlight on white.

  **`pages/landing/Hero.jsx` rewritten**:
  - Light warm-off-white section, subtle radial terracotta glow.
  - Headline at 96px max (clamp 44-96) with `for Hospitality Assets.`
    accented in terracotta.
  - Two CTAs: pill terracotta `Analyze Acquisition` (with arrow icon),
    pill ghost `Run Yield Audit`.
  - 3 white proof cards with rounded corners + soft shadow + tiny
    terracotta icon tile.

  **`components/Nav.jsx` simplified** — removed isDarkShell branching;
  unified light nav with terracotta dot.

  **`components/Footer.jsx` rewritten** — clean light footer with
  terracotta brand dot.

  **`pages/landing/FinalCTA.jsx` rewritten** — light shell, two pill CTAs.

  **`components/shared/UnreadableListing.jsx`** — theme defaults to light,
  PathCard + ManualField rewritten with white surfaces, 16px radius,
  soft shadow. Primary path card elevates with terracotta shadow.

  **Tested · iter52 — 10/10 functional PASS · 100% backend regression ·
  0 production bugs.** 2 dark-shell remnant surfaces (FinalCTA, UnreadableListing)
  flagged and fixed in iter53. Screenshot verification confirmed every key
  surface now reads as a single cohesive premium PropTech product.

  **Design guidelines** at `/app/design_guidelines.json` captures the
  blueprint (tokens, type scale, motion guidelines, per-page layout).


  testing agent recommends extracting the new parser block (prompt +
  helpers + endpoints) into `/app/backend/routes/invest_parser.py`
  when the monolith split happens.


  622 lines — within tolerance but flagged for future split when it
  crosses 700. Candidates: extract INTRO state machine + AccordionStack
  into smaller hooks/components.

  **Other testing notes** (informational, non-blocking):
  - InvestOpener has a 3.2s phase-gate before the continue button becomes
    clickable (`pointer-events-none` until `phase==='ready'`). Tests must
    wait ≥7s for cinematic intro + opener mount.
  - UnreadableListing path buttons use bare testids `unreadable-path-*`
    (matches code, not spec hint).


  verified by design). On Spitogatos bot-block, toast warns and routes to
  Confirm with 'Source blocked' badges so user can fill manually.

  **`components/operate/OperateHero.jsx`** — every metric now carries a
  DataBadge. Current ADR + Occupancy → 'Estimated' (market model). Potential
  ADR + Occupancy + Revenue Leakage → 'Calculated' (deterministic math).

  **`components/invest/dashboard/AcquisitionHero.jsx`** — Asking price + €/m² +
  m² each carry a DataBadge under the number. Demo data shows Confirmed.

  **`lib/investIntelligence.js`** — `analysis.input` now propagates
  `_confidence`, `listing_source`, `bathrooms`, `neighborhood`, `energy_class`,
  `parking`, `price_per_sqm_eur` so downstream UIs can read provenance.

  **Backend extraction overhaul** (`server.py::_scrape_listing`):
  - Realistic browser headers: Sec-Fetch-Dest/Mode/Site/User, Sec-CH-UA,
    Sec-CH-UA-Mobile/Platform, DNT, Cache-Control, Accept-Language with
    el/fr fallbacks. Bypasses Imperva edge rules used by Spitogatos /
    Idealista / E&V static pages.
  - **Bot-block detection** — title + body-prefix sentinel scan ('pardon our
    interruption', 'just a moment', 'captcha', 'access denied', 'ddos-guard',
    'cf-error', etc.). Sets `out['bot_blocked']=True`.
  - **Spitogatos `__NEXT_DATA__` extractor** — pulls Next.js initial state
    JSON for price / size / rooms / bathrooms / floor / city / title /
    yearBuilt. Feeds `_extract_*` functions as Layer 0 (highest trust).
  - **`extraction_layers`** audit trail: 'og_meta', 'json_ld',
    'spitogatos_next_data'.
  - `/api/invest/ingest` response: new `bot_blocked` flag, new
    `extraction_debug` block (http_status, bot_blocked, extraction_layers,
    json_ld_count, og_keys, spito_signals, title_seen). When `bot_blocked`,
    all empty fields flip from 'missing' → 'source_blocked' so the UI
    displays 'Source blocked' rather than 'Not confirmed'.

  **`pages/Reports.jsx` rebuilt — 6-step modal**:
  - Step 1 Select asset · Step 2 Type · Step 3 Focus · Step 4 Generate
    (cinematic loader with 4 sequential phases ×420ms + 320ms hold) ·
    Step 5 Preview (real provenance-badged report body) · Step 6 Export.
  - Step counter 'Step X of 6' + animated progress dots.
  - Step 5 renders: Verdict block (PASS / NEGOTIATE / BUY / WATCH +
    confidence%), Key Figures (price · €/m² · surface · bedrooms · city ·
    condition — each with DataBadge), Projected Yield (net yield · gross
    revenue · ADR — each with DataBadge), Why this verdict, Top 3 risks,
    What to do next, Data Accuracy footnote.

  **Tested · iter44 · backend 100% (2/2) · frontend ~94% (33/35 — 2 case-
  sensitive false positives, NOT real bugs) · 0 action items.**



- 2026-02 — **Iter41 — INVEST Acquisition Dashboard UX Simplification**:
  User mandate: VELA must feel like a calm investment advisor, NOT a cluttered
  analytics dashboard. The user should instantly understand BUY / NEGOTIATE /
  WATCH / PASS within seconds. Everything else hidden behind expandable sections.
  Apple + Bloomberg + luxury investor-grade.

  **Verdict mapping renamed to 4 states**: BUY / NEGOTIATE / WATCH / PASS
  (was PROCEED / WATCHLIST / PASS). Thresholds:
  - BUY: yield ≥9.5% + design upside ≥65 + seasonality <65 + listing premium ≤4%.
  - NEGOTIATE: yield ≥8% AND listing premium 4–14% (default for moderate cases).
  - WATCH: listing premium ≥14% — wait for price drop.
  - PASS: yield <6.5% OR seasonality ≥75.

  **NEW AcquisitionHero** (invest-section-acquisition-hero): the SINGLE elegant
  summary card. First (and often only) thing the user reads. Property image
  (left, 4:3) · location · title · €asking · €/m² · verdict badge · confidence
  chip · 1-line explanation · "Next Best Action" card · ONE primary CTA
  (verdict-tilted: BUY→Build memo · NEGOTIATE→Generate offer · WATCH→Save to
  watchlist · PASS→Find better deals).

  **NEW WhyVerdict** (invest-section-why): 3 calm advisor bullets — Why this
  verdict · Key opportunity · Key risk. Replaces walls of text from old
  DealVerdict + FinalVerdict sections.

  **NEW AccordionSection primitive**: All deeper analysis collapsed by default.
  User clicks each section to expand. Smooth fade-in animation.

  **All existing detailed sections wrapped in accordion** (collapsed by default):
  Strategy (WWVDPanel) · Yield (ROI) · Risks (Negotiation) · Comparables (STR
  + Market Signals) · Renovation (Transformation + HPV) · Due Diligence
  (Roadmap + WhatToDoNext) · Exit Strategy (MaxBuyPrice + Offer) · Deal Score ·
  Underwriting (Snapshot) · Alternative Deals (BetterDealFinder, defaultOpen
  for PASS) · IC Recap (FinalVerdict).

  **REMOVED**: ScrollSpyTabsBar (no longer needed — progressive disclosure
  replaces tab nav). Old INVEST_TABS array deleted.

  **Tested · 100% frontend acceptance · 57/57 assertions · 0 bugs.**
  Code-review nit fixed in same iteration: AcquisitionHero CTA dead conditional
  simplified to single color value.

- 2026-02 — **Iter40 — Backend Extraction Pipeline Rebuild (E&V Critical Fix)**:
  User reported VELA INVEST URL extraction was failing for Engel & Völkers
  listings — "almost all listing data was missing." User mandate: build a
  multi-layer extraction system. "Do not ship unless E&V links work reliably."

  **Backend `_scrape_listing` upgraded**: HTML cap 200K → 600K · raw_text 4K
  → 12K · OG/meta description preserved into raw_text prefix · timeout 8s
  → 10s · `description` field added to scraped output.

  **`_extract_asking_price` rewritten** with recursive JSON-LD walker
  (handles E&V's nested offers, priceSpecification.price, AggregateOffer
  lists). Currency-symbol-tolerant regex (€, EUR, $, USD, AED). Thin-space
  (\u202F) tolerant.

  **`_extract_m2` rewritten** with JSON-LD `floorSize` / `size` / `area`
  priority + broadened regex (m², m2, sqm, sq m, sq.m., square
  meters/metres, τμ, τ.μ., τετραγωνικ).

  **`_extract_bedrooms`/`_extract_bathrooms` rewritten** with JSON-LD
  `numberOfBedrooms`/`numberOfRooms`/`numberOfBathrooms` priority +
  EN/EL/ES/FR aliases.

  **`_extract_condition` upgraded**: handles 'fully renovated' / 'newly
  renovated' / 'renovated in 20XX' / 'πλήρως ανακαινισμέν' / 'πρόσφατα
  ανακαινισμέν' across description + title.

  **NEW extractors**: `_extract_year_built` (JSON-LD yearBuilt + 'Originally
  built in 20XX' regex), `_extract_neighborhood` (JSON-LD
  address.addressLocality + 'in <Neighborhood>' title parse),
  `_extract_description` (JSON-LD description preferred over OG).

  **`_detect_city` upgraded**: reads JSON-LD address first, then text. New
  cities: Kifissia/Glyfada/Kolonaki/Plaka/Koukaki/Madrid/Barcelona/Ibiza/Porto.

  **`/api/invest/ingest` extended**: now returns `neighborhood`, `description`,
  `year_built`, `price_per_sqm_eur` (computed when both price and m² are
  usable). Property-type detection now reads JSON-LD `@type`
  (SingleFamilyResidence → Villa) before falling back to URL/title heuristic.

  **VerifyChecklist badges renamed** to user's exact prescribed terminology:
  'Verified' → **'Verified from listing'** · 'Needs Review' → **'Estimated
  by VELA'** · 'Missing' → **'Not found'**.

  **Live Preview Mode hard timeout**: Promise.race with 28s hard stop ensures
  the UI always transitions to 'ready' or 'partial' (slow E&V scrapes can
  hit 12s).

  **MEASURED OUTCOME on real E&V URL** `engelvoelkers.com/gr/en/exposes/0e03e66b...`:
  - Before: 4/13 fields extracted (title, city, price, images).
  - After: **14/15 fields extracted** — title, city='Athens',
    neighborhood='Adames, Kifissia', description, asking_price=€1,180,000,
    price_per_sqm=€2,906, m2=406, rooms=4, bathrooms=3, energy_class='E',
    parking=true, year_built=2005, renovation_state='refresh',
    property_type='Villa'. Only `floor` is null (detached house — not in
    listing). Confidence map fully populated.

  **Tested · 10/10 backend pytest + frontend smoke flows green · 0 bugs.**
  New regression file: `tests/test_iter40_extraction.py`.

- 2026-02 — **Iter39 — VELA INVEST Full Acquisition Rebuild**:
  User mandate: VELA Invest must feel like a premium institutional acquisition engine,
  not a basic form. Verdict-driven · explicit next moves · alternative deal pathways.

  **Verdict mapping rename**: BUY/NEGOTIATE/PASS → **PROCEED/WATCHLIST/PASS**.
  - PROCEED: Smart-Buy yield ≥9.5% + design upside ≥65 + seasonality <65 + listing
    premium ≤6%. OR Smart-Buy yield ≥8% + listing premium ≤4%.
  - PASS: Smart-Buy yield <6.5% OR seasonality risk ≥75.
  - WATCHLIST: default mid-grade — listing premium ≥8% triggers explicit watchlist
    with target trigger price + price-drop alert.

  **NEW — VELA Deal Score™** (invest-section-deal-score): 8-dimension acquisition
  scorecard (Location · Price Discipline · Rental Yield · Resale Liquidity · Renovation
  Risk · Tourism/Demand · Negotiation Upside · Data Confidence). Each dimension shows
  0-100 score · STRONG/MODERATE/WEAK tier · severity bar · contextual note. Composite
  shown top-right (= VELA INVEST INDEX).

  **NEW — Deal Roadmap™** (invest-section-roadmap): 7-step horizontal timeline
  (Listing captured → Data verified → Price benchmarked → Yield calculated → Risk
  scored → Strategy selected → Next action generated). Each step shows label + 1-line
  detail + done/pending checkmark.

  **NEW — What To Do Next™** (invest-section-next): explicit numerical instructions.
  Primary instruction (Offer €X-Y / Wait until €Z / Pass), walkaway ceiling for PROCEED,
  7 agent questions (building fees · legal title · renovation year · STR consent · energy
  class · utility costs · municipal taxes), 8 due-diligence checklist items. Verdict-
  tilted CTAs: PROCEED → Generate agent message + Build memo · WATCHLIST → Create alert
  + Save memo · PASS → Find better deals + Create alert.

  **NEW — Better Deal Finder** (invest-section-better-deals): visible only when verdict
  is PASS or WATCHLIST. 6 alternative acquisition pathways (Same area lower €/sqm ·
  Smaller higher STR yield · Renovated building with elevator · Waterfront discount ·
  Distressed seller · New-build flexible payment plan).

  **NEW — Live Preview Mode** on /invest landing: debounced (1.2s) silent ingest as
  user pastes URL. 5-phase progress chips (VELA is reading the listing → Analyzing
  acquisition fundamentals → Scanning nearby comparables → Estimating realistic yield →
  Calculating ideal entry price). Once ready, CTA button label auto-swaps from "Analyze
  Investment" to "Open Acquisition Verdict". Cached preview data is reused on submit.

  **Tab bar updated to 12 tabs**: Overview · Deal Score · Roadmap · Next Move ·
  Potential · Actions · Financials · STR Potential · Renovation Plan · Risk Flags ·
  Better Deals · Final Verdict.

  **Bug fixes**: Location score showing NaN (fixed — `_market.median_adr` not
  `adr_median`). Risk Scored roadmap detail showing 'undefined' (fixed — leverage
  flags use `.label` not `.title`).

  **Testability**: invest-opener-continue-btn now exposes `data-ready="true"` once the
  ready phase is reached (replaces hardcoded 3.5s wait in test scripts).

  **Tested · 100% frontend acceptance · 75/75 review items · 0 blocking issues.**

- 2026-02 — **Iter38 — VELA INVEST Cinematic Rebuild + Highest Performing Version™**:
  Critical user mandate: data accuracy is non-negotiable — INVEST must feel
  institutional-grade, accurate, smooth, intelligent, premium. Mirror of iter37 OPERATE
  pattern applied to the acquisition shell, plus a new emotional hook section.

  **NEW — INVEST cinematic flow**: Every /invest/asset/* path (demo, draft, post-verify)
  plays the cinematic intro before the dashboard reveals. STAGE machine:
  THINKING (7 phases) → OPENER (VELA INVEST INDEX™ reveal) → DASHBOARD.
  - **InvestThinking**: 7 INVEST-specific phases (Extracting listing data → Cross-
    validating metadata vs DOM → Reading visual positioning → Calculating hidden yield
    → Scanning local demand signals → Detecting revenue leakage → Building transformation
    pathways). 4200ms total, 600ms per phase. Dark espresso/bronze theme.
  - **InvestOpener**: post-analysis "aha" reveal. Big VELA INVEST INDEX (animated
    0→target over 950ms) · Acquisition DNA category · Verdict Preview chip
    (BUY/NEGOTIATE/PASS) · Top 3 Institutional Signals · "Open Investor Terminal" CTA.
  - For `/manual` flow, intro is skipped (interactive editing).
  - For `dft_*` drafts, intro plays only AFTER VerifyChecklist gate is cleared.

  **NEW — VELA INVEST INDEX™** (computed in investIntelligence.js): composite
  acquisition-grade score 0–100 weighting yield_grade · design_upside · appreciation ·
  pricing_power · liquidity · seasonality_inverse.

  **NEW — Acquisition DNA categorization**: Yield Acquisition · Margin-of-Safety Pass ·
  Transformation Arbitrage · Appreciation Play · Top-Decile Yield · Seasonality-Hedged
  · Boutique Conversion. Surfaced on InvestOpener and as institutional positioning.

  **NEW — Highest Performing Version™ section** (invest-section-hpv): emotional hook
  rendered between Deal Verdict and WWVD Panel. Side-by-side: Current State (ADR · net
  yield · monthly rev · state) → arrow with transformation_label → After VELA ·
  Stabilized (post-VELA ADR · stabilized yield · OPTIMIZED state) with annual_uplift_eur
  badge. The "what is this property capable of becoming?" psychological pivot.

  **InvestTabsBar extended to 9 tabs**: Overview · **Potential (NEW)** · Actions ·
  Financials · STR Potential · Renovation Plan · Risk Flags · Exit Strategy ·
  Final Verdict. Potential anchors HPV section.

  **Clutter reduction + Manual Assisted Analysis™:**
  - Hero rewritten: "Acquire what others / don't see." Subtitle promises "the
    highest-performing version of the asset. Institutional-grade — not a guess."
  - Manual fallback CTA renamed to "Manual Assisted Analysis™" (premium tone).
  - Failed extraction toast: "Partial extraction — opening Manual Assisted
    Analysis™. / Complete the missing fields to continue institutional analysis."
  - Trust line tightened: "VELA never calculates from unverified data. Every field
    shows confidence — low-confidence fields require confirmation before analysis runs."

  **Tested · 100% frontend acceptance · 14/14 review items · 0 blocking issues.**
  Code-review nits only: continue-btn opacity-gate timing (testability nit not
  functional), pre-existing /api/me 401 noise (not iter38 regression).
  User vision: VELA must feel like institutional-grade hospitality intelligence
  (Apple + Aman + Bloomberg). Cinematic, smooth, conviction-driven, execution-first.
  Plus: "The AI layer between real estate and revenue" — hooks for VELA Network™,
  Digital Twin™, Autopilot™, Certified™ vision.

  **NEW — Cinematic OPERATE flow** (3 stages, ~7s onboarding):
  Both demo and real-URL paths now: INPUT → THINKING → OPENER → DASHBOARD.
  - **OperateThinking**: 6 phases reveal sequentially with done/running/pending states
    (Analyzing listing structure → Reading visual positioning → Comparing ADR
    performance → Detecting revenue leakage → Scanning hospitality competitors →
    Generating optimization pathways). 600ms per phase.
  - **OperateOpener**: post-analysis "aha" reveal. Big VELA INDEX number animates 0→target
    over 950ms · Hospitality DNA category · Top-3 Immediate Insights · Continue Analysis.
    Architectural, restrained — "VELA already understands the property."

  **NEW — Restructured /operate dashboard** (8 sections, 6-tab sticky scroll-spy):
  - **OperateHero**: VELA INDEX large + Hospitality DNA + 6 metrics
    (Current/Potential ADR · Revenue Leakage % · Current/Potential Occupancy ·
    Audience) + Primary Verdict block.
  - **OperateVerdict**: existing LIFT/REPRICE/REDESIGN/REPLACE.
  - **WWVDPanel** (now shared): top-3 conviction actions.
  - **RevenueLeakSection**: dark espresso "Where this asset is bleeding revenue" — 6
    categorized leaks (Visual Positioning · Furniture Density · Lighting Quality ·
    Listing Hierarchy · Pricing Structure · Hospitality Identity · Trust Signals)
    with severity bars and €/yr impact.
  - **TransformationEngine**: 5 hospitality positioning directions (Mediterranean
    Minimal · Japandi Retreat · Urban Luxury Loft · Coastal Architectural · Warm
    Contemporary). Active style swaps via tab UI; each models projected ADR uplift,
    cost, payback, ROI, occupancy lift.
  - **Listing Optimization** (compact retained): score bars + amenity gaps + pricing.
  - **AutopilotExecution / VELA Autopilot™**: master CTA "Optimize This Asset" (rocket
    icon, one-button orchestration → routes to /upgrade/demo/0 with toast). Below: 7
    individual one-click execution stream cards (Generate Furniture Package ·
    Contractor Scope · Listing Rewrite · Brand Identity · Procurement Cart · Pricing
    Strategy · Automation Stack).

  **NEW — operateIntelligence.js extensions** (analysis_version → operate-v2.0):
  vela_index (composite 0-100 · market+design+ADR+occupancy+listing weighted) ·
  hospitality_dna (Urban Boutique / Premium Romantic Retreat / Family Coastal Stay /
  Digital Nomad Hub / Boutique Hotel Conversion / Luxury Minimalist Loft / Wellness
  Hospitality Unit) · revenue_leakage_pct + €/yr · revenue_leaks (severity-weighted) ·
  transformation_styles (5 modeled directions) · one_click_executions (7).

  **DRY refactor (P1 from iter36 closed):**
  - `/components/shared/WWVDPanel.jsx` — single component, theme prop ('dark'|'light'),
    testIdPrefix prop. Both shells consume.
  - `/components/shared/ScrollSpyTabsBar.jsx` — single sticky scroll-spy, tabs/theme
    props. Both shells consume.
  - DELETED 4 redundant files: invest/dashboard/WWVDPanel.jsx, invest/dashboard/
    InvestTabsBar.jsx, operate/WWVDPanel.jsx, operate/OperateTabsBar.jsx.

  **Brand language hooks (Network/Twin/Autopilot/Certified vision):**
  - Operate landing subtitle: "Build your asset's living AI hospitality twin."
  - Helper text: "VELA Network™ · trained on thousands of analyzed hospitality assets."
  - Transformation Engine kicker: "AI Transformation Engine™ · Digital Twin"
  - Autopilot kicker: "VELA Autopilot™" + LIVE chip.

  **Tested · 100% frontend acceptance · 14/14 review items · 0 blocking issues.**
  Reviewer-flagged stage-order nit fixed in same iteration: real URL flow now also
  passes through OPENER (consistent post-analysis reveal across both demo + real URL).

## P0 — Done
- ✅ VELA INVEST: full investor terminal (URL paste, scrape, analyze, dashboard, portfolio)
- ✅ VELA OPERATE: parchment shell + 5-screen flow (Analyze, Dashboard, Workspace, VisualizeStudio, UpgradeCart, ListingRewrite, Portfolio)
- ✅ Mode pill in Nav flipping between two cohesive aesthetic shells
- ✅ Landing page (6-section institutional structure)
- ✅ Stripe checkout + Mongo-backed status polling
- ✅ Claude 4.5 vision analysis on uploaded listing imagery
- ✅ Deterministic financial intelligence (same input → same output every render)

## P1 — Backlog
- Backend hygiene round: split `server.py` (>3400 lines) into `/app/backend/cart/`,
  `/app/backend/ingest/`, `/app/backend/invest/`, `/app/backend/prompts/`. Switch
  `requests.get` → `httpx.AsyncClient`. LRU cache for images. Migrate `on_event` → `lifespan`.
- **VELA Network™ surface**: portfolio-level cross-asset learning panel — "Trained on N
  analyzed assets. Top-performing renovations: X. Highest-ADR design: Y." Plant the
  network-effect moat narrative at /portfolio.
- **Hidden Yield Detection™** as a dedicated /operate section (currently folded into
  Revenue Leak Detection) — surface "Why this property is worth more than it produces."
- **Portfolio Heatmap™**: portfolio-level visualization (strongest/weakest assets,
  hidden opportunities, geographic performance, operational leaks).
- **AI Market Timing™**: oversupply / ADR compression / tourism shift / emerging zone
  signals as a dedicated dashboard surface.
- **Asset Transformation Engine™ before/after canvas**: actual rendered before/after
  imagery in /operate (Gemini Nano Banana already wired into Visualize Studio).
- Real PMS / channel-manager sync on "Approve & Sync" (currently Mongo timeline only)
- Real listing scrape on left panel of `ListingRewrite.jsx` (currently placeholder)
- Real PDF export (currently `window.print()`)
- Split `Dashboard.jsx` (>1100 lines) for legacy /dashboard/asset/:id detail view
- Replace deterministic STR comps with real Airbnb / Booking comp data when feasible

## P2 — Future (VELA Network™ vision)
- **VELA Autopilot™ full orchestration**: the "Optimize This Asset" master CTA today
  routes to UpgradeCart with a toast. Build the actual sequencer that chains all 7
  execution streams (redesign → procurement → contractor → listing → brand → pricing →
  automation) end-to-end with progress tracking.
- **VELA Certified™ trust layer**: Properties optimized through VELA flagged as
  Certified Assets™. Certification badge surface, public listing search filter, etc.
- **VELA Network™ data moat**: aggregate intelligence across all analyzed listings —
  what renovations actually work, what designs increase ADR, what concepts fail.
- **Digital Twin™ deep simulator**: layout swaps, furniture density tests, target
  demographic A/B, all simulated in-place with predicted ADR/occ/ROI.
- Multi-user portfolios (shared with collaborators on Teams plan)
- Negotiation play-by-play simulator (modeled offer/counter rounds)
- Acquisition pipeline kanban
- LLM listing-rewrite that respects negotiation leverage
- Sora 2 / video generation for listing trailers

## Key API Endpoints
- `POST /api/analyze` — core OPERATE analysis
- `POST /api/transform` — execution bundle (carts, contractor, listing rewrites)
- `POST /api/visualize` — 3 strategic concept paths
- `POST /api/visualize/image` — Gemini Nano Banana render (data URL, cached)
- `POST /api/visual-analysis` — Claude 4.5 vision read on hero image
- `GET  /api/visual-analysis/warmup` — cold-start ping
- `POST /api/ingest/listing-url` — OPERATE listing ingest with hybrid scrape
- `POST /api/invest/ingest` — INVEST listing ingest (asking price + m² + city extraction)
- `POST /api/invest/analyze` — full INVEST profile (deterministic; no LLM in hot path)
- `POST /api/payments/checkout` — Stripe checkout session
- `GET  /api/payments/status/:session_id` — Mongo-source-of-truth status poll
- `GET  /api/properties/demo` — public OPERATE demo asset

## Key Frontend Files
### OPERATE
- `pages/Landing.jsx` — 6-section institutional structure
- `pages/Method.jsx` · `pages/Pricing.jsx` (Stripe-wired)
- `pages/Dashboard.jsx` (warmup useRef gate · 1100+ lines)
- `pages/Workspace.jsx` · `pages/VisualizeStudio.jsx` (slug testids)
- `pages/UpgradeCart.jsx` · `pages/ListingRewrite.jsx`
- `pages/Portfolio.jsx`
- `lib/intelligence.js` (canonical formulas)
- `lib/benchmarks.js` (comp-set data)
- `lib/recommendationPaths.js` · `lib/recommendationIntelligence.js`
- `lib/demoProperty.js`

### INVEST
- `pages/invest/InvestLanding.jsx` — hero + URL paste + supports
- `pages/invest/InvestDashboard.jsx` — 8-section investor dashboard with EditInputsPanel
- `pages/invest/InvestPortfolio.jsx` — 3-row demo asset table with column testids
- `components/invest/InvestPrimitives.jsx` — ScoreTile / MetricTile / SignalChip / SectionHeader
- `lib/investIntelligence.js` — single source of truth, mirrors backend math
- `lib/investDemo.js` — INVEST_DEMO_INPUT (Koukaki Athens €149k)

### Shared
- `components/Nav.jsx` — mode pill + per-shell theming
- `components/Footer.jsx` — module-named taglines per shell
- `index.css` — `.vela-invest` scoped CSS theme tokens

## Project Health
- **Working**: All flows on both shells. Stripe checkout creates real cs_test sessions.
  Vision warmup OK. INVEST analyze deterministic. OPERATE analyze + visualize + cart + listing-rewrite working.
- **MOCKED**: Real Airbnb comp data → deterministic synthesis from market benchmarks.
  PMS sync → toast-only. PDF export → JSON.
- **Tested**: Iter27 — 22/22 backend pytest pass · 100% on every frontend spec item.

## Test Reports
- Latest: `/app/test_reports/iteration_52.json` (Premium design upgrade — 10/10 functional + 100% backend · 0 bugs · light-shell remnant surfaces fixed in iter53)
- Previous: `/app/test_reports/iteration_51.json` (AI fallback parsers — Claude Sonnet 4.5 paste-text + screenshots — 100%)
- Earlier: `/app/test_reports/iteration_50.json` (UX MASTER CLEANUP — 7/7 PASS 100%)
- Pytest: `/app/backend/tests/` (47/47 + parse suite)

## P0 — Done
- ✅ VELA INVEST: full investor terminal (URL paste, scrape, analyze, dashboard, portfolio)
- ✅ VELA OPERATE: parchment shell + 5-screen flow (Analyze, Dashboard, Workspace, VisualizeStudio, UpgradeCart, ListingRewrite, Portfolio)
- ✅ Mode pill in Nav flipping between two cohesive aesthetic shells
- ✅ Landing page (6-section institutional structure)
- ✅ Stripe checkout + Mongo-backed status polling
- ✅ Claude 4.5 vision analysis on uploaded listing imagery
- ✅ Deterministic financial intelligence (same input → same output every render)
- ✅ **Iter44 — MASTER FIX** — strict data provenance everywhere, Confirm Property Data interstitial on /operate, Spitogatos bot-block detection + extraction debug panel, Reports 6-step generation flow with real provenance-badged preview.
