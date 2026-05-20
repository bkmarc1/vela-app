# Propul8 — Changelog

> Historical iteration log. Live PRD lives in `/app/memory/PRD.md`.

---

## 2026-02 · Iter 68-70 — Phase 1 of 8-feature mandate (5 features shipped)

**User mandate:** 8-feature spec — institutional rebrand + acquisition flow upgrades. Phased delivery: ship 🔴 P0 + 🟢 quick wins now, larger 🟠 P1 items next iter.

**5 features shipped this iteration:**

1. **FIX 1 · Removed "Made with Emergent" badge + institutional Footer rebrand** — deleted the Emergent badge anchor from `public/index.html` (defensive `#emergent-badge { display: none !important; }` rule also added to `index.css`). Footer rewritten as minimal black bar (`#0A0A0A`) with gold logomark + small-caps tracking-wide brand line `PROPUL8 · HOSPITALITY ASSET INTELLIGENCE` (color `#8B7355`) + copyright row + link to /index-explained.

2. **FIX 2 · "Data Quality" → "Data Confidence" with verified-field logic** — `investIntelligence.js` now counts user-verified critical inputs from 7 keys (price, sqm, city, rooms, ADR, occupancy, neighborhood). >5 verified → `HIGH` (green #16A34A) · 3-5 → `MEDIUM` (gold #B8956A) · <3 → `LOW` (red #EF4444). `AcquisitionHero.jsx` renders `testid='invest-hero-confidence'` with the new label + tone.

3. **FIX 3 · NEGOTIATE branch with Smart-Buy Envelope** — `AcquisitionHero.jsx` appended a `SmartBuyEnvelope` component that surfaces ONLY when verdict === 'NEGOTIATE'. Gold panel with: `Bid between €X and €Y to hit the institutional yield floor.` headline, gradient bid-range bar (aggressive → smart-buy → asking), `Negotiation Pack` CTA + `Save to Pipeline` CTA. New backend endpoints `POST /api/portfolio-intel/negotiation-pack` (deterministic 3 comps + 3-row sensitivity table + Claude-generated 3 leverage points) and `POST/GET /api/portfolio-intel/pipeline` (persists buyer pipeline). New demo route `/invest/asset/negotiate` with seeded `INVEST_NEGOTIATE_INPUT` + wrapped `INVEST_NEGOTIATE_ANALYSIS` so the NEGOTIATE UX is always reachable.

4. **FIX 7 · Propul8 Index explainer page (`/index-explained`)** — `pages/Propul8Index.jsx` (~170 lines). Hero "The FICO score for hospitality assets." + 0-100 gradient scale + 4 verdict zone cards (Avoid 0-59 red · Negotiate 60-74 gold · Buy 75-89 green · Exceptional 90-100 gold-yellow) + 5 scoring pillars (Location 20pts · Yield 25pts · Design Upside 20pts · Market Momentum 20pts · Risk Profile 15pts) + adoption trust line "Used by boutique funds, family offices, and independent operators across 12 markets." Linked from new Footer.

5. **FIX 8 · Live data scraper UI** — `OperateThinking.jsx` rewritten. Modes: `live` (URL pasted) shows 4-phase scrape (Scraping listing 1s · Extracting photos+pricing+amenities 1s · Benchmarking against 47 {city} comparables 1.5s · Calculating Propul8 Index 0.5s) + green pulsing `LIVE DATA` badge + freshness footer `DATA REFRESHED EVERY 6 HOURS · LAST UPDATE: HH:MM`. Demo button shows 6-phase legacy with `DEMO DATA` badge. `Operate.jsx` tracks `mode` state and passes it to Thinking + Result.

**Tested · iter68/69/70 — backend 14/14 pytest green · frontend 100% across 7 review items · 0 bugs · 0 action items in final retest.**
Test reports `iteration_68.json` (Phase 1 first pass · 75% with NEGOTIATE flow unreachable), `iteration_69.json` (intermediate · 70% on UI race conditions), `iteration_70.json` (RETEST · 100%).

**Phase 2 backlog (next iter):**
- 🟠 FIX 4: Yield Audit Execution Rail — task cards · 16-shot photo list · photographer finder · title auto-optimize · revenue recovery accordion
- 🟠 FIX 5: Pipeline dashboard at `/pipeline` — 5 mock assets · filter bar · multi-state tracking (Evaluating · In Negotiation · Owned · Rejected)
- 🟠 FIX 6: Investor Terminal Bloomberg-style modal — Valuation tab (sensitivity table) · Financing tab (DSCR/IRR) · Comps tab (price/sqm + market velocity)

---


## 2026-02 · Iter 67 — Portfolio Intelligence Phase 1 + Gold palette pivot

**User mandate:** *"Upgrade Portfolio + Market Trends to feel like a real estate asset intelligence platform. Apple-level simplicity + Bloomberg-style asset intelligence + modern proptech."* User choices confirmed: pivot global accent from electric blue → muted gold; synthesized data with `Demo · sample` labels; Claude Sonnet 4.5 AI signals + narratives; phase delivery (Portfolio Intelligence this iter, Market Pulse next iter); keep both `/invest` (acquisition) + new `/portfolio/add` (owned cockpit).

**Global palette pivot (4th change · final)** — electric ultramarine `#0F52FF` → muted gold `#B8956A` (hover `#A07F56`, muted bg `#F5F1EA`, stone line `#E8E0D2`). Bulk hex sed across `.jsx/.js/.css`. Zinc neutrals (#FAFAFA bg, #09090B text, #52525B sub, #E4E4E7 default border) retained. Status colors refreshed to emerald `#16A34A` for "in the money" outcomes.

**Backend** — new `/app/backend/routers/portfolio_intel.py` (~300 lines) mounted at `/api/portfolio-intel`. Seven endpoints: `POST /asset` (create), `GET /owned` (list), `PUT /asset/{id}/valuation` (owner override), `POST /signal` (Claude per-asset AI sentence), `POST /portfolio-signal` (Claude top-of-page summary signal), `POST /exit-plan` (Claude 11-field structured exit plan), `POST /action-plan` (Claude 5-step plan). All Claude calls have deterministic fallbacks so the API never fails.

**Frontend deterministic engine** — `/app/frontend/src/lib/portfolioIntelligence.js` (~370 lines): `equityGain/equityGainPct/yieldOnCost/yieldOnCurrentValue/estimatedSaleCosts/netProceedsIfSold` finance primitives + `digitalAssetScore/sellReadinessScore/liquiditySignal/valuationConfidence` scoring (0-100 weighted) + `exitScenarios` (7 canonical scenarios: sell-today/hold-12m/hold-3y/renovate-sell/renovate-rent/refinance-hold/optimize-str) + `aggregatePortfolio` (12 KPI roll-up) + `decisionPicks` (8 "Best Asset to X" picks) + `DEMO_OWNED_ASSETS` (3 synthesized assets: Koukaki STR / Glyfada coastal / Paros stone cottage).

**Frontend pages**
- **`/portfolio` — PortfolioIntelligence** (~610 lines). Header with kicker + `Demo · synthesized` badge + massive H1 + Claude AI Signal bar (instant deterministic fallback, Claude replaces in background). 4 CTAs (Add Asset · Update Valuation · Build Exit Plan · Compare Scenarios). 12-KPI Portfolio Summary card. 8 horizontally-scrollable Decision Cards. Three full **AssetIntelCard** asset cockpits with: AI Action Strip · Asset Value Pulse (purchase → today + equity pill + confidence) · Equity Trajectory SVG (Purchase/Today/12M/3Y) · 4 score widgets (Asset Score circle / Sell Readiness circle / Liquidity badge / Confidence badge) · 8 MiniStats (Annual Gross/Net/Monthly/Occ/ADR/YoC/YoCV/Mortgage) · "If Sold Today" stone panel · Smart Comparison Bars (purchase vs current; yield on cost vs now) · Open Asset Detail CTA.
- **`/asset/:id` — AssetDetail** (~620 lines). 6 tabs (Overview · Valuation · Income · Exit Scenarios · Action Plan · Documents). Overview: 3 BigKPIs + 8 KPIs + Liquidity + If Sold Today. Valuation: source list + override input. Income: gross/net/optimized + breakdown rows + yield grid. Exit Scenarios: 7 cards each with RiskPill + 4 stacked numbers + AI note. Action Plan: instant deterministic 5-step plan replaced by Claude; "Build Exit Plan" button generates 11-field plan via Claude. Documents: 9 doc-row UI with Upload buttons (storage hookup next iter).
- **`/portfolio/add` — AddAsset** (~220 lines). 5-section form (basics · purchase · current value · rental performance · financing & mgmt). "Analyze Asset" submit → POST + redirect to detail page.

**Custom geometric Propul8 logomark** auto-inherited new gold #B8956A bars (4 ascending) — no separate fix needed.

**Tested · iter67 + retest iter68 — backend 20/20 pytest · frontend 100% across 5 targeted retest fixes · 0 bugs · 0 action items.** Test reports `/app/test_reports/iteration_67.json` (initial) + `iteration_68.json` (retest). Backend regression `/app/backend/tests/test_iter67_portfolio_intel.py`. Original iter67 found 5 frontend gaps (missing simple testids, AI signal stuck-on-loading, H1 whitespace, action-step testids inside conditional) — all fixed via deterministic-instant-fallback pattern (`displaySignal = ai || deterministicFallback`) + simpler testid scheme.

**Phase 2 (next iter):** Market Pulse — 12 modules (Hot Markets Map · Trend Cards · Demand/Supply Meter · Market Heat Index · Portfolio Impact · Opportunity Radar · What Changed This Month · Scenario Slider · Market Alerts · AI Market Narratives · Market Timing Signal · Micro-Market Comparison).

---


## 2026-02 · Iter 66 — Backend modular refactor + Custom SVG logomark

**User mandate (verbatim):** *"Backend refactor — extract auth, invest, operate, checkout from server.py (~4500 lines) into /app/backend/routers/. Custom SVG Propul8 logomark — replace plain text brand in Nav/Footer."*

**Backend refactor**
- **server.py: 4523 → 1055 lines (-77%).** Now focused on storage helpers, properties CRUD, /analyze, root, and lifecycle hooks.
- **`routers/auth.py` (157 lines)** — User model, `get_current_user`, `require_user`, `/auth/session`, `/auth/me`, `/auth/logout`. Imported EARLY in server.py so legacy `Depends(require_user)` chains resolve.
- **`routers/checkout.py` (162 lines)** — `PRICING_TIERS`, `StripeCheckoutRequest`, `/payments/checkout`, `/payments/status/{id}`, `/webhook/stripe`. Tier IDs unchanged.
- **`routers/invest.py` (1574 lines)** — All `/invest/*` endpoints (ingest, parse-text, parse-screenshot, parse-brochure, draft GET/POST/PUT, analyze) + `_extract_*` deterministic helpers + `_invest_hash/_clamp`.
- **`routers/operate.py` (1791 lines)** — `/visualize`, `/visualize/image`, `/upgrade/cart`, `/upgrade/listing`, `/visual-analysis*`, `/ingest/listing-url`, `/transform`, `/sync/*` + their helpers (`_scrape_listing`, `_quick_visual_analysis`, `_slug_hints`, `_family_for_rec`, `_VISUAL_PRIMER`, `_cart_fallback`, `_listing_fallback`, `_advance_sync_status`).
- **Circular-import resolution** via lazy-forwarder pattern: routers/invest.py forwards `_scrape_listing` / `_quick_visual_analysis` / `_slug_hints` from `routers.operate`, and `_parse_ai_json` from `server`. routers/operate.py forwards `_parse_ai_json` from `server`. All resolved at call-time, never at module-import time.

**Custom SVG logomark** (`/app/frontend/src/components/Logomark.jsx`)
- Geometric mark: **4 ascending vertical bars in electric ultramarine #0F52FF + accent dot**. Reads as a yield curve / propulsion signature AND the digit 8. Scales crisply 16-64px, pure SVG (no runtime deps).
- Wired into Nav.jsx (22px, left of "Propul8." wordmark) and Footer.jsx (28px next to wordmark). Light shell only — no dark variant needed.
- Testids: `propul8-logomark`, `propul8-wordmark`.

**Tested · iter66 — backend 24/24 green (18 iter66 + 6 iter65 regression) · frontend 100% across all 6 routes · 1 regression caught + fixed in-place by testing agent (`_short_id` was missing in operate.py post-refactor; testing agent added a local definition; uuid was already imported).**
Test report `/app/test_reports/iteration_66.json` · backend regression `/app/backend/tests/test_iter66_regression.py`.

**Minor cleanup deferred (P3):** `_short_id` is now duplicated in invest.py + operate.py — could be extracted into `routers/_helpers.py`. Both router files are 1574 / 1791 lines — could be split further (invest_parse / invest_analyze; visualize / upgrade / visual-analysis / ingest / transform / sync) in a future iteration.

---


## 2026-02 · Iter 65 — Startup-friendly design refresh · 5 mandates

**User mandate (verbatim):** *"Asset Acquisition and Asset Optimization — name it like that on the landing page down. Make fonts all the same sizes to be smooth on all pages. Portfolio page to neater, minimal. Market trends should be refreshed, on a live basis. Change the style and colors to make it more startup friendly."*

**What changed:**

1. **TwoPaths rename (`pages/landing/TwoPaths.jsx`)** — left path kicker `ASSET ACQUISITION` + title *"Identify high-yield opportunities."* + line *"AI-driven market screening and deterministic financial modeling to validate your next move."* / right path kicker `ASSET OPTIMIZATION` + title *"Maximize existing portfolio value."* + line *"Uncover hidden operational inefficiencies and reposition assets with data-backed market signals."*

2. **Canonical type scale (`index.css`)** — six utility classes used uniformly across every page: `.ts-h1` (clamp 40-64px, 600, -0.04em), `.ts-h2` (clamp 28-40px, 500, -0.03em), `.ts-h3` (clamp 20-26px, 500, -0.02em), `.ts-body` (15px, 400, -0.005em), `.ts-small` (13px, 400), `.ts-kicker` (11px, 500, 0.18em uppercase, JetBrains Mono). Applied to Hero / TwoPaths / HowItWorks / FinalCTA / Pricing / Portfolio / Market Trends headlines + eyebrows.

3. **Startup-friendly palette refresh** — moved away from warm parchment (#F7F4EF) + olive (#3F5F4A) to **zinc-50 #FAFAFA bg + electric ultramarine #0F52FF accent + #09090B/#52525B zinc text + #E4E4E7 zinc borders**. Status pills refreshed to emerald #10B981 / amber #F59E0B / red #EF4444. Bulk hex swap touched ~80 .jsx/.js + index.css + App.css. CSS variables `--vela-bg-primary`, `--vela-text-primary`, `--vela-accent-bronze`, `--vela-border` all remapped — every legacy inline reference still resolves without code churn.

4. **Portfolio rebuilt minimal (`pages/Portfolio.jsx`)** — massive H1 displaying total portfolio value (e.g., €1.7M, clamp 48-96px) + green `+€XK upside` pill + minimal 4-cell KPI strip (Assets · AvgScore · AnnualRevenue · Upside) + breathable single-line asset rows (image+title+location+Value+Monthly+Score+SignalIcon). Dropped the dense 3-highlight tiles + 8-col aggregate-position card.

5. **Market Trends LIVE refresh (`pages/DashboardHome.jsx`)** — auto-poll every 30s via setInterval; green pulsing `LIVE` pill (testid `dashboard-live-pill`); `Updated Xs ago` timestamp ticking every 1s (testid `dashboard-last-updated`); manual refresh button with spinning RotateCw icon (testid `dashboard-refresh-btn`); subtle background flash on newly arrived headlines (`rgba(15,82,255,0.04)` → `#FFFFFF` over 1.5s).

**Tested · iter65 — backend 6/6 pytest · frontend 100% across all 6 routes · 0 bugs · 0 action items.**
Test report `/app/test_reports/iteration_65.json` · backend regression file `/app/backend/tests/test_iter65_regression.py`.
Testing agent also fixed `App.css` line 3 (dead `background: #F7F4EF` missed by the bulk sed) — now zero legacy palette hexes in `src/`.

**Brand language:** Propul8 — "The Operating System for Hospitality Assets." Light shell everywhere. ONE strong accent: electric ultramarine #0F52FF.

---


## 2026-02 · Iter 64 — Pricing rebuilt as LIGHT architect-minimal shell + Nav unified

**User mandate:** *"The pricing section is different colors and fonts from the rest of the app and it should not be."*

**What changed:**
- **`Pricing.jsx` rewritten as LIGHT architect-minimal shell** — bg `#F7F4EF` warm off-white, olive `#3F5F4A` accents, charcoal `#171717` text, `#E7E0D6` hairline borders, 4px tile radius. Same 4 tiers (Start / Analyze / Pro / Scale), same testids, same CTA wiring; just unified to the app's design language. Pro retains the green `POPULAR` ribbon.
- **`Nav.jsx` line 33**: `isDarkShell = false` unconditionally (was `isPricing`). The dark Bloomberg shell is fully retired — every route uses the same light parchment nav now.

**Tested · iter64 — backend 12/12 pytest · frontend 100% · 0 bugs · 0 action items.**
Test report `/app/test_reports/iteration_64.json` · backend regression suite `/app/backend/tests/test_iter63_pricing.py` (still green — PRICING_TIERS + checkout mapping unchanged).

**Reviewer-flagged cleanup (optional, deferred):** `Nav.jsx` still carries the dead dark-shell theme-token branches (logoClass/dotClass/inactive/active/hoverCls dark variants + `isPricing`/`isInvest` consts) — unreachable but harmless. Safe to delete next pass.

---


## 2026-02 · Iter 63 — Pricing page complete redesign (dark · glass · outcome-led)

**Mandate:** *"Completely redesign the Pricing page for Propul8. Premium, modern, minimal, startup-level. Dark mode. Stripe + Robinhood + Vercel + Linear feel. Outcome-led copy. Four tiers: START · ANALYZE · PRO · SCALE."*

**What changed:**

### A · Backend tier table
- `PRICING_TIERS` rewritten: `start` (€0), `analyze` (€49 one-off), `pro` (€149/mo), `scale` (custom · contact sales). Legacy aliases `free` / `investor` / `developer` retained so old links keep working.

### B · Pricing page rewrite (`Pricing.jsx` · ~470 lines)
- **Dark canvas** (#0A0B0F) with soft olive radial glows + subtle grid texture overlay.
- **Hero**: pulsing olive `● PROPUL8 · PRICING` glass pill + gradient-text headline *"Property intelligence, priced to start small."* + tagline *"Start free. Pay when the insight matters. Scale when the portfolio grows."*
- **4-column responsive grid** of `PriceCard` components — glass-morphic (backdrop-blur 14px), 1px white-tinted borders, animated parallax spotlight on hover (CSS variable `--mx/--my` driven by mouseMove).
- **Pro tier visually heroed**: olive gradient background + `Popular` ribbon + olive glow shadow + solid olive CTA.
- Every card has: glass icon tile · tier name · big tabular price · subtitle · italic **outcome line** ("Discover what hides inside any listing.", "Decide on one asset with institutional rigor.", "Outperform the market on every asset, every month.", "Run a portfolio like an institution.") · feature checklist with olive ticks · CTA.
- **CTA wiring**: `start` → `/invest`; `scale` → `mailto:sales@propul8.app`; `analyze` + `pro` → Stripe checkout via `/api/payments/checkout`.
- **Outcome section** below the cards: kicker + headline *"Built for modern property intelligence."* + subheadline + 6 outcome cards (Discover hidden upside · Optimize asset performance · Outperform local markets · Increase hospitality revenue · De-risk acquisitions · Upgrade underperforming assets).
- **Trust footer** with mono-tight `Stripe secured · GDPR compliant · No data resale`.

### C · Adaptive Nav + Footer for dark Pricing shell
- `Nav.jsx`: `isDarkShell` now scoped to `/pricing` only (was `/invest` + `/dashboard/demo`). All other routes stay on the warm-off-white shell. Nav adapts colors: dark backdrop bg-[rgba(10,11,15,0.78)], lighter text, olive dot, lighter active state.
- `Footer.jsx`: now adaptive — dark variant (#0A0B0F bg, olive accent dot, lighter type) on `/pricing`; warm-off-white everywhere else. Removes the parchment-vs-dark seam at the bottom of the Pricing canvas.

**Test result:** `/app/test_reports/iteration_63.json` — **Backend 12/12 PASS · Frontend 100% PASS · 0 bugs · 0 critical action items.** New pytest `test_iter63_pricing.py` covers tier table, Stripe-session creation for paid tiers, free-tier short-circuit, legacy alias preservation. CTA wiring verified via Playwright network interception. Visual: dark bg confirmed (#0A0B0F), pulsing kicker, gradient headline, hover spotlight (opacity 0→100 on group-hover), nav theming regression-checked across all 5 routes.

---

## 2026-02 · Iter 62 — Portfolio purpose lock · Market Trends content filter · `/market-trends` route

**Mandate (single user paste, three structural fixes):**
1. *"Remove the entire Live Market Pulse card from /portfolio. Portfolio should ONLY show user-owned or scored assets."*
2. *"Move Live Market Pulse to /market-trends only. Market Trends should contain ONLY real-estate-related Greek market news and property signals."*
3. *"Add strict keyword filtering. Bad example: 'Joint Suicide Attempt by 17-Year-Olds' should never appear anywhere in the app."*

**What changed:**

### A · Strict news filter (`dashboard_news.py`)
- `REAL_ESTATE_KEYWORDS` expanded 16 → 35 weighted terms (real estate=6, property prices=6, STR=6, Golden Visa=6, Ellinikon=5).
- **NEW `EXCLUDED_KEYWORDS`** tuple — 60+ blacklisted terms (crime / violence / politics-not-investment / celebrity / sports / health / school / misc).
- `_score_relevance()` HARD returns 0 if ANY excluded keyword matches — bullet-proof veto before scoring.
- `MIN_RELEVANCE` raised 4 → 5. Cache bumped `v1` → `v2`. Baseline fallback items rewritten RE-only.

### B · Portfolio rewrite — "My assets. My performance. My upside."
- **Removed entirely**: Live Market Pulse block, news fetch, all RSS content from `/portfolio`.
- **NEW**: header copy, KPI overview (Assets / Avg Score / Value / Revenue), Best/Underperforming/Risk highlight tiles, Aggregate Position card, empty state with exact user copy ("Build your portfolio view." + "Analyze an Asset" CTA).

### C · `/market-trends` route + nav
- New React Router alias `/market-trends` → `DashboardHome`. Nav link points to `/market-trends`. News limit cap raised `le=12` → `le=20`.

**Verified live:** Market Trends shows 5 strictly RE articles (Tourism Spatial Framework, MARE MED III, Four Seasons Mykonos, Airbnb Gen Z trends, Athens visitors). Zero banned keywords. Portfolio shows 4 asset cards + KPIs + zero news.

**Test result:** `/app/test_reports/iteration_62.json` — **Backend 9/9 PASS · Frontend 100% PASS · 0 bugs · 0 blockers.** New pytest `test_iter62_news_filter.py`.

---

## 2026-02 · Iter 61 — Invest brochure upload · Operate priority pills · Portfolio signals · Market Trends rename

**Mandate (five parallel asks in one user message):**
1. *"For Analyze acquisition…we should be able to upload a brochure, a pdf of an upcoming project and it will have to analyze everything…So it should automatically catch if its a new project off plan or not. Maybe we can separate off plan from ready as well. Remove manual assisted analysis (put the upload pdf there). Under that hide demo, make it a clickable button."*
2. *"when we press operate as well when you get into analysis Give actions in also a minimal way like where the listing stands, in order of priority."*
3. *"in Portfolio show a dummy live where you stand with signs going up or down compared to the market to see it."*
4. *"dashboard should be named market trends or something and it should be live news based on the market we want, athens."*
5. *"also it confused portfolio with dashboard. Dashboard should be changed into live market trends. and portfolio should be where you stand compared to the live competition, like signals."*

**What changed:**

### A · Invest landing — PDF brochure upload + off-plan detection
- **NEW backend endpoint** `POST /api/invest/parse-brochure` (~120 LOC) using `pypdf` for text extraction + Claude Sonnet 4.5 with an extended brochure-aware system prompt. Response adds `is_off_plan`, `completion_year`, `developer_name`, `project_name`, `price_from_eur`, `price_to_eur`, `unit_count` alongside the standard property facts.
- **Frontend rewrite of `InvestLanding.jsx`**:
  - **Removed** `Manual Assisted Analysis` CTA entirely.
  - **Removed** the giant demo card (with image, stats grid, big CTA).
  - **Added** "OR UPLOAD A DEVELOPER BROCHURE" section under the URL paste row: kicker + subtitle + olive `OFF-PLAN · READY` pill + dashed dropzone (`Click to upload brochure PDF · PDF · UP TO 20MB`) + staged file preview (filename/size + X clear button + green `Analyze Brochure ↗` CTA).
  - **Added** small slim demo pill at the bottom: `✨ Try the demo · KOUKAKI · 3BR · €485K →`.
- Off-plan vs Ready auto-detected by Claude from brochure keywords (`off-plan`, `pre-construction`, `delivery 202X`, `phase 1/2/3`, `reservation`, `ready to move in`, `fully furnished` etc).

### B · Operate result — minimal priority list
- `Top3Fixes.jsx` numbering changed from neutral `01/02/03` to olive **`P1`/`P2`/`P3`** priority pills. Action card still shows impact tier (High/Medium/Low) + 1-line why + Open link.

### C · Portfolio — live ticker-style signals (▲▼)
- Added `DEMO_ASSETS` fallback (4 hardcoded Athens demo properties — Koukaki / Glyfada / Plaka / Exarcheia) so signals UX is always visible.
- Each `AssetVsSurroundings` card now has a **stock-ticker signal block** on the right: deterministic `▲`/`·`/`▼` arrow + `1.6%` daily delta + `24H VS MARKET` mono-tight label.
- Signal direction tints: green olive for up, neutral for flat, terracotta for down (only color usage outside the green+white palette — semantic ticker convention).

### D · Dashboard → Market Trends rename + concept clarification
- Nav label `Dashboard` → `Market Trends`. Route `/dashboard/demo` preserved for backward compat.
- **Full rewrite of `DashboardHome.jsx`** — pure market-news focus:
  - Header kicker `PROPCYCLE · MARKET TRENDS` + pulsing `● LIVE · ATHENS` pill.
  - Title: *"Athens real estate — live."*
  - **`PROPCYCLE MARKET READ`** AI summary band (Compass icon).
  - **Featured `LEAD STORY` card** showcasing the latest article (~22-32px headline) with full description preview + `Read full story →` link.
  - **`TODAY · MORE` grid** with secondary news cards.
  - Bottom hint banner: *"Want to see how your assets compare? Open Portfolio — your live signals →"*.
- **Competition graph removed** from Dashboard (it was confusing the Portfolio purpose). The graph's intent now lives entirely in Portfolio via the per-asset signals + aggregate position panel.

**Test result:** `/app/test_reports/iteration_61.json` — **Backend 12/12 pytest PASS · Frontend 100% PASS · 0 production bugs · 0 action items.** New pytest suite at `/app/backend/tests/test_iter61_brochure.py` covers empty-body 400, image-only-PDF 422 (with helpful screenshot suggestion), full off-plan round-trip success returning all 7 new fields.

---

## 2026-02 · Iter 60 — Propcycle rebrand · Operate hero · Portfolio rebuild · Landing typography

**Mandate (four parallel asks in one user message):**
1. *"In Operate, where your listing stands should be at the top, in a very nice and attractive layout, with the score attached to it. That page is all over the place, fix it in a way where its eye catching and beautiful."*
2. *"The name of the app is not propos anymore its Propcycle."*
3. *"Portfolio needs to focus on live market changes and where your assets stand comparing to all the rest in your surroundings."*
4. *"The landing page should be more user friendly, and font sizes more minimal. They are huge."*

**What changed:**

### A · Brand rename PropOS → Propcycle
- Bulk sed across **83 frontend files** (.jsx/.js/.css) replacing `PropOS` / `propos` / `PROPOS` → `Propcycle` / `propcycle` / `PROPCYCLE` (preserves case).
- Backend Python files: user-facing copy + email user agents updated. Router prefixes / env vars unchanged.
- `/app/frontend/public/index.html` `<title>` + meta-description updated.

### B · Operate result page restructured around a unified Market Position HERO
- **NEW `MarketPositionHero.jsx`** (~360 lines) — single editorial spread that merges the previous 4 sections (ResultHero + MainFinding + KeyCards + MarketPositionBar) into ONE eye-catching surface:
  - Left half: tall 4:5 property image + title + location.
  - Right half: huge `60 / 100` tabular score + verdict pill + one-sentence Main Finding + premium positioning bar (Below Market → Competitive → Top Performer with YOU/MARKET/TARGET/TOP markers) + `+20 pts to target` headline + green "Close the Gap" CTA + slim Location pill all in one row + data-quality footer.
  - Close-the-Gap modal still works (same 3-step gain breakdown).
- **`OperateResult.jsx`** rewrite (~70 lines, was ~80) — new clean order: utility bar → `MarketPositionHero` → `NextBestAction` → `Top3Fixes` → `ActionImpactSimulator` → `ActionPlanCTA` → `CollapsedDetails`.
- Removed components (still in repo but no longer mounted in result page): `ResultHero`, `MainFinding`, `KeyCards`, `MarketPositionBar`.

### C · Portfolio rebuilt around "live market + assets vs surroundings"
- **Full rewrite of `Portfolio.jsx`** (~430 lines, was ~629).
- **Live Market Pulse** at top: 4 real Athens RE headlines from RSS feeds (Greek Reporter, GTP Headlines, Ekathimerini) with relative time + clickable external links.
- **Aggregate Position panel** (right side): portfolio average score + delta-vs-Athens-market pill + three horizontal bars (your portfolio / market avg / top quartile). Graceful empty state when no scored assets.
- **Assets vs Surroundings**: per-asset cards each with image + title + neighborhood + delta-vs-neighbors pill (+N AHEAD / -N BEHIND) + 3-column mini market position (You / Market / Top).
- Removed: old terminal-style filter pills (All/Owned/Targets/Upgrade/Upside/Needs), decision-themed tags, "Market Open" headers.

### D · Landing page softened
- Hero font: `clamp(44px, 6vw, 96px)` → `clamp(34px, 4.4vw, 64px)` (~33% smaller max).
- Subtitle: `text-[20px]` → `text-[16px]`.
- Support text: `text-[15px]` → `text-[13.5px]`.
- CTA buttons: `px-7 py-3.5 text-[14px]` → `px-6 py-3 text-[13.5px]`.
- All landing sub-page (ScorePreview, TwoPaths, FinalCTA, HowItWorks, PortfolioPreview, ValueFlow) heading clamps sed-reduced ~25–30%.
- New user-friendly headline: *"Hospitality assets, finally on one operating system."*

**Test result:** `/app/test_reports/iteration_60.json` — **Backend 5/5 PASS · Frontend 100% PASS · 0 production bugs · 0 action items.** Iter60 verified live: brand rename complete (no PropOS substring anywhere user-facing), Operate hero score=60 verdict=Below Market with all sub-testids, simulator live update verified (€+14,148 → €+16,848 after 10× ArrowRight on ADR slider), Portfolio market pulse rendering 4 live news items.

---

## 2026-02 · Iter 59 — Score-sheet compression + Action Simulator + Dashboard rebuild + Backend refactor

**Mandate (four parallel asks in one message):**
1. *"Do not want another section for location intelligence add it to the score sheet or somewhere close."*
2. *"Action Impact Simulator — interactive ADR/Occupancy sliders → real-time yield delta."*
3. *"Remove dashboard and replace it with the latest live real estate news about athens and add the summary and professional graph of where we stand compared to competition in acquisition and operate."*
4. *"Backend refactor — split server.py (>4400 lines) into modular routers."*

**What changed:**

### A · Location compressed into score sheets
- **Removed standalone embedded sections** from both Operate and Invest.
- **New reusable `LocationScoreCard.jsx`** (~360 lines):
  - `variant='card'` → fits into Operate's 5-card Key Cards row (testid `operate-keycard-location`).
  - `variant='pill'` → slim rounded pill under the Invest Why/Risk strip (testid `invest-location-pill`).
  - Both open the same `loc-details-modal` with the full breakdown (sub-scores, drivers, watch-outs, nearest-by-category table).
- **Operate Key Cards** now `grid-cols-2 lg:grid-cols-5` (was `lg:grid-cols-4`).

### B · Action Impact Simulator (new interactive section)
- **`ActionImpactSimulator.jsx`** (~230 lines) inserted between Top 3 Fixes and Build Action Plan in Operate result page.
- Two native range sliders with custom-painted tracks + baseline tick markers:
  - **ADR** — bounds `±35%` of baseline.
  - **Occupancy** — bounds `30%..92%`.
- Live Yield Impact panel: huge `ANNUAL Δ` number (e.g. `€+14,148 +36%`) + Monthly Δ + Sim annual + Baseline + Sim nights/yr. Updates in real time on every input event (verified: keyboard ArrowRight × 15 on ADR slider moved Δ from €+14,148 → €+18,198 instantly).
- "Reset to recommended" button restores defaults to the analysis's recommended uplift targets.
- ADR / Occupancy moves hint surfaces matching fixes from `analysis.top_3_fixes` below each slider.

### C · Dashboard fully rebuilt
- **Old Asset Command Center deleted** (KPI tiles, watchlist, portfolio commands all gone).
- **New `/dashboard/demo` page** (`DashboardHome.jsx` rewrite, ~350 lines):
  - Header: "PropOS · Hospitality Intelligence" kicker + "Athens market · today." headline.
  - **AI summary card** ("Today's Read" with Compass icon): renders a single calm sentence about portfolio position vs market.
  - **Competitive Position graph** — two side-by-side groups (Acquisition · Operate). Each group: 3 horizontal bars (Your Portfolio thick olive, Market Average thin muted, Top Quartile thin charcoal) with values 0-100 + a `+N pts AHEAD OF MARKET` headline + "Open Invest" / "Open Operate" green CTA.
  - **News feed** — 3-6 cards of live Athens real-estate headlines from ekathimerini.com, gtp.gr, greekreporter.com. Each card: source tag + relative time + title + description preview + "Read full story" external link.
- **Backend** `dashboard_news.py` (~200 lines) fetches 4 free RSS feeds in parallel, filters by relevance keywords, dedupes, ranks by `relevance × source_weight × recency`, caches in `news_cache` Mongo collection for 30 min. Graceful baseline fallback if every feed fails.

### D · Backend refactor (kickoff)
- **New `/app/backend/routers/` package** with 3 extracted routers:
  - `sources.py` — `GET/POST /api/sources/{asset_id}/{lock,unlock}` (Source Ledger v2).
  - `location.py` — `POST /api/location/analyze` + `GET /api/location/provider`.
  - `dashboard.py` — `GET /api/dashboard/news` + `GET /api/dashboard/competition`.
- Each router exposes `set_db(motor_db)` which `server.py` calls at startup to share the single Mongo client.
- `server.py` shrunk modestly (~70 lines removed from the tail). Future iters can keep extracting (assets, invest, operate) toward the <700-line target.

**Test result:** `/app/test_reports/iteration_59.json` — **Backend 7/7 pytest PASS · Frontend 100% PASS · 0 bugs · 0 action items.** Verified live slider interactivity via ArrowRight keyboard events. New pytest suite at `/app/backend/tests/test_iter59_routers.py`.

---

## 2026-02 · Iter 58 — Location Intelligence: Deep Integration (standalone removed · embedded in Invest + Operate)

**Mandate:** "Location should be in invest and acquire not alone. Make it super integrated."

**What changed:**
- **Removed standalone Location surface**: deleted `/app/frontend/src/pages/Location.jsx`, removed `<Route path='/location' …>` from `App.js`, removed the 'Location' link from `Nav.jsx CENTER_LINKS`.
- **New reusable component `/app/frontend/src/components/shared/LocationIntelligenceSection.jsx`** (~415 lines):
  - Auto-fetches `POST /api/location/analyze` on mount for the property's `${neighborhood}, ${city}, ${country}` (country auto-derived from listing URL TLD via `buildAddressFromInput` helper — `.gr → Greece`, `.fr → France`, `.es → Spain`, `.it → Italy`, etc).
  - Renders a premium inline card: large `7.5 / 10` score · verdict pill · resolved address · 4 sub-score progress bars (Walkability/Tourism/Beach-Marina/Convenience) · top drivers + watch-outs · noise/risk notes · footer (provider + cache state) · "See nearest places by category" progressive-disclosure toggle revealing a 9-row categorized travel table.
  - Two variants: `embedded` (own card chrome) and `accordion-inner` (no chrome).
  - Graceful skeleton on load · error fallback if geocoding miss.
- **Mounted in Invest dashboard**: top-level always-visible section between `<WhyVerdict />` and `<DetailToggles />`. Wrapper testid: `invest-section-location`. Sits in the always-visible portion of the page (NOT hidden behind any accordion).
- **Mounted in Operate result page**: between `MarketPositionBar` and `NextBestAction`. Wrapper testid: `operate-result-location`. Same always-visible placement.
- **Smart `buildAddressFromInput(input)`**: composes the best-available address from `neighborhood + city + country`. Country hints: explicit `input.country` first, else regex-extract TLD from `input.url` and look up against a built-in country map (gr/fr/es/it/pt/de/uk/nl/be).
- **Demo input enrichment**: `INVEST_DEMO_INPUT` and Operate's `DEMO_INPUT` now include `neighborhood: 'Koukaki'` and `country: 'Greece'` — fixes prior Nominatim ambiguity that resolved "Athens" to Athens, GA, USA. Now correctly resolves to Athens, Greece.
- **Catch-all redirect**: added `<Route path='*' element={<Navigate to='/' replace />} />` so legacy `/location` bookmarks now gracefully land on the homepage instead of a blank page (addresses iter58 testing-agent's only minor design note).

**Visual proof:**
- **Invest /invest/asset/demo** → 7.5/10 · STRONG · "Κουκάκι, 1st District of Athens... Greece" · real Greek POIs ("Heroon of Mousaios", "Syngrou-Fix" metro) · "6 bars/clubs within 5 min walk — potential weekend noise" risk note. Section sits between Why/Risk strip and Full Analysis.
- **Operate /operate (Athens demo)** → identical 7.5 STRONG card, embedded between Market Position bar and Next Best Action.

**Test result:** `/app/test_reports/iteration_58.json` — **Backend 4/4 PASS · Frontend 100% PASS · 0 production bugs · 0 action items remaining** (added catch-all redirect immediately after the testing agent's only non-blocking observation). New pytest at `/app/backend/tests/test_iter58_location_embed.py`.

---

## 2026-02 · Iter 57 — VELA Location Intelligence (dual-provider · OSM default + Google upgrade path)

**Mandate:** "Start VELA with Google Maps API integration first. Build a location intelligence service. Backend env var `GOOGLE_MAPS_API_KEY`. Frontend never sees the key. Return a 0–10 Location Score plus sub-scores, top drivers, weaknesses, verdict."

**Design decision:** The user opted to let me 'add the recommended api' rather than provision a GCP account. I built **dual-provider** architecture:
- **Default:** OpenStreetMap stack (Nominatim geocoding + Overpass POI search, with 3-mirror failover: kumi.systems → openstreetmap.fr → overpass-api.de). 100% free, real data, no key.
- **Auto-upgrade:** the moment `GOOGLE_MAPS_API_KEY` is set in `/app/backend/.env`, the service automatically switches to Google Geocoding + Places API (New) + field-mask-trimmed responses. Same Pydantic contract on both paths.

**What changed:**
- **Backend `/app/backend/location_intelligence.py`** (~600 lines) — full Location Intelligence service:
  - 11 POI categories (restaurant, cafe, supermarket, metro, beach, marina, landmark, nightlife, hospital, pharmacy, airport) with per-category search radius (1.5km → 35km for airport) and per-category OSM tag pairs + Google place types.
  - **Single batched Overpass query** instead of 11 parallel calls — fetches all categories in one HTTPS roundtrip (~3-15s cold, ~22ms cached).
  - **Empirical travel-time model** (`distance × 1.25 / 80 m/min` walk, `/ 500 m/min` drive) avoids per-POI routing API calls.
  - **Deterministic scoring formula**: walkability (food density within 10min walk) · tourism (cultural sites within 25min walk) · beach/marina (walk-time to nearest coast feature) · convenience (supermarket + pharmacy + metro + hospital reachability) → weighted composite 0-10.
  - **Drivers + weaknesses + noise/risk** generated from the same POI buckets (e.g. "10 min walk to beach (Παραλία Γλυφάδας Ακτή Δ)", "5 bars/clubs within 5 min walk — potential weekend noise").
  - **MongoDB cache** (`location_cache` collection) keyed on both `address_key` (skip geocoding on repeat lookups) AND `(rounded_lat, rounded_lng)` (skip the heavy POI fetch). 30-day TTL.
- **Backend endpoints** (`location_router` mounted at `/api/location`):
  - `POST /api/location/analyze` — accepts `{address}` OR `{lat, lng}`, returns full `LocationIntelligence` payload. Bad address → 400. Service down → 502.
  - `GET  /api/location/provider` — lightweight status: `{provider: 'google' | 'openstreetmap', google_configured: bool}`.
- **Frontend `/app/frontend/src/pages/Location.jsx`** (~400 lines) — minimal premium one-input page:
  - Landing: kicker · headline "Where is it, really?" · subtitle · single URL input · green Analyze CTA · 3 demo chips (Glyfada / Koukaki / Plaka).
  - Result: huge tabular "8.6 / 10" hero · PRIME/STRONG/AVERAGE/WEAK verdict pill · resolved address · 4 sub-score progress bars · top 5 value drivers · top 3 weaknesses · italic noise/risk notes · "OpenStreetMap · Cached" provider pill · "See nearest places by category" progressive disclosure toggle → categorized travel table with icons + walk/drive minutes per category.
- **App.js**: new `/location` route. **Nav.jsx**: 'Location' link added between Operate and Portfolio.

**Verified live data:**
- **Glyfada, Athens** → 8.6/10 · PRIME · walkability 10 · tourism 8.1 · beach/marina 8.7 · convenience 7. Real drivers: *"10 min walk to beach (Παραλία Γλυφάδας Ακτή Δ)"*, *"1 min drive to marina (1η Μαρίνα Γλυφάδας)"*. Real risk: *"5 bars/clubs within 5 min walk — potential weekend noise"*.
- **Koukaki, Athens** → 7.5/10 · STRONG · walkability 10 · beach 0 (correctly inland). Real driver: *"7 min walk to Heroon of Mousaios"*.
- **Le Marais, Paris** → 7.5/10 · STRONG · walkability 10 · tourism 10 · beach 0. Real driver: *"9 min walk to Maison européenne de la Photographie"*.

**Test result:** `/app/test_reports/iteration_57.json` — **Backend 6/6 pytest PASS · Frontend 100% PASS · 0 bugs · 0 action items.** New pytest suite at `/app/backend/tests/test_iter57_location.py`. Bad address now returns semantic 400 (was 502 — fixed per testing-agent reviewer note).

**To upgrade to Google Maps later:** add `GOOGLE_MAPS_API_KEY=AIza...` to `/app/backend/.env`, restart backend. Zero frontend changes needed; same Pydantic contract — just `source: 'google'` in the response.

---

## 2026-02 · Iter 56 — Source Ledger v2 + Data Lock

**Mandate:** "Source Ledger v2 + Data Lock — per-listing source transparency surface + 'Lock verified data' toggle." (User deferred the external-API wiring until they grab an Apify token; this iter ships the internal UX/transparency layer.)

**What changed:**
- **Backend** (3 new endpoints, MongoDB-backed; no _id leakage; idempotent upsert on `(asset_id, field)`):
  - `GET  /api/sources/{asset_id}` → returns all locks for an asset.
  - `POST /api/sources/{asset_id}/lock` → upserts a `{field, value, locked_at, locked_by}` lock.
  - `POST /api/sources/{asset_id}/unlock` → deletes a lock.
  - Storage: collection `source_locks` with composite key `(asset_id, field)`.
- **New `SourceLedger.jsx`** (200+ lines, reusable across Invest and Operate):
  - Renders header "Source Ledger · v2" with two summary badges (X LOCKED · Y CONFIRMED).
  - 5-column table: FIELD / VALUE / STATUS / SOURCE / LOCK.
  - One row per field from the provenance map (`buildInvestProvenance` or `buildOperateProvenance`).
  - Each row shows: field label, formatted value with unit, status pill (Confirmed / Calculated / Estimated / Not confirmed / Source blocked, plus a new **Locked** state with check icon), source label (or "User locked · {day} {month}" when locked), and a Lock/Unlock toggle button.
  - Lock button disabled for fields with null value (cannot lock missing values).
  - Hydrates from `GET /api/sources/{asset_id}` on mount; toggles persist via backend; toast on each action.
  - Footer note: *"Locked values are treated as ground truth — they will NOT be overwritten by future re-scrapes."*
- **Mounted in OPERATE result page**: replaces the old 6-row provider list inside the "View Data Sources" collapsed-detail toggle. Asset_id = the property's asset_id.
- **Mounted in INVEST dashboard**: new `invest-section-source-ledger` accordion under the Underwriting · Asset snapshot section. Asset_id = listing URL (so each unique listing has its own lock state).

**Test result:** `/app/test_reports/iteration_56.json` — **Backend 10/10 PASS · Frontend 100% PASS · 0 production bugs · 0 action items.** Pytest test file added at `/app/backend/tests/test_iter56_sources.py`. Lock persistence verified end-to-end via curl + UI reload. Visual palette strictly olive/white/charcoal — no terracotta or bronze surfaced.

**Pending (user-blocked):**
- **External APIs (AirDNA / PriceLabs / Apify / Booking)** — user opted to ship Source Ledger first while they grab an Apify token. When token arrives, wire `/api/comps/airbnb` + `/api/comps/booking` via Apify actors `tri_angle/airbnb-scraper` + `pratikdani/booking-com-scraper`. AirDNA / PriceLabs flip from "NOT CONNECTED" to "USED" once keys land. `has_real_comparables=true` once Apify returns >0 results.

---

## 2026-02 · Iter 55 — OPERATE UX rebuild (minimal · action-first · Market Position bar)

**Mandate:** "Operate is too complicated. Make the first result screen show ONLY: Property Hero · Main Finding · 4 Key Cards · Market Position bar · Next Best Action · Top 3 Fixes · Build Action Plan button. Hide everything else under collapsed toggles. The user should understand the full audit in 10 seconds."

**What changed:**
- **Removed `Launch Market · Athens` badge** from Hero and Dashboard kicker (kept in Footer only).
  - Hero now opens directly with the headline (no pre-headline pill).
  - Dashboard kicker reads `PropOS · Asset Command Center`.
- **`/operate` landing page redesigned to 1-input minimal:**
  - Kicker `PropOS · Asset Intelligence`, headline `Run Yield Audit.`, subtitle `Paste your listing. PropOS shows what to fix first.`
  - One URL input + green `Run Yield Audit` CTA.
  - **NEW Athens Demo card** below the input (image · `DEMO DATA` badge · `Try Athens Demo` · `Koukaki 3BR Apartment · 3 bedrooms · Airbnb`).
  - Removed marketing copy, removed `PropOS Network™ · trained on thousands of analyzed hospitality assets.` helper line.
- **`/operate` result page completely rebuilt** (`OperateResult.jsx` orchestrator + 8 child components in `/components/operate/result/`). Order:
  1. **Property Hero** — image + name + meta strip (bedrooms · guests · type · source) + Data Quality badge + "View original listing" link.
  2. **Main Finding** — one sentence (e.g. *"This listing is underperforming mainly because of weak photos and a flat title."*).
  3. **4 Key Cards** — PropOS Score / Revenue Gap / Main Issue / Market Support. Missing values render honest `Needs data`.
  4. **Market Position bar** (innovative new feature) — horizontal positioning visual from `Below Market` → `Competitive` → `Top Performer`. Markers: YOU (charcoal), MARKET (avg=72), TARGET (olive), TOP (86). Below: message, Data Quality, "Real comparables not connected yet" honest note, GAP TO TARGET, **Close the Gap** green CTA.
     - **Close-the-Gap modal**: `Move from {current} → {target}`, 3 numbered steps each with `Expected gain · +N pts`, TOTAL TARGET GAIN summary, green Build Action Plan CTA.
  5. **Next Best Action** — single large card (action verb · why · impact pill · `Build {action} Plan` CTA).
  6. **Top 3 Fixes** — 3 minimal cards (numbered 01/02/03 + impact dot + 1-sentence why + Open link).
  7. **Build Action Plan** — single primary green CTA to `/upgrade/:id/0`.
  8. **Collapsed Details (progressive disclosure)** — 4 toggle buttons: View Numbers (expands listing scores + revenue leak + transformation engine), View Comparables (honest *"No real comparable listings available yet."* empty state, no fake comps), View Data Sources (Airbnb/Booking/AirDNA/PriceLabs/PMS with USED/LIMITED/NOT CONNECTED tags), Generate Report (Open Reports CTA).
- **`operateIntelligence.js` extensions:**
  - `market_position`: `{current, current_label, market_average, top_listings, target, gap, data_quality, message, closes_gap[], has_real_comparables}`. Score blends listing-quality dimensions; when ADR + occupancy missing the score falls back to listing-quality-only.
  - `main_finding`: one short sentence from a 7-rule decision tree.
  - `key_cards`: `{propos_score, revenue_gap_monthly_eur, main_issue, market_support}` — null-safe; main_issue derived from the dominant gap; market_support from market.adr_median tier.
  - `top_3_fixes`: deterministic from listing scores, sorted by score, padded with safe defaults so always 3 cards. Each `{id, action, why, impact, route}`.
  - `next_best_action`: top entry from top_3_fixes.
- **Demo input updated** to match user brief: `Koukaki 3BR Apartment · Athens · 3 bedrooms · 2 bathrooms · ADR €168 · 64% occupancy · Airbnb`.

**Test result:** `/app/test_reports/iteration_55.json` — **16/16 review checks PASS · 100% frontend · 100% backend regression · 0 production bugs · 0 action items.** Section ordering verified via DOM bounding rects. Close-the-Gap modal interactions verified. Iter54 false-positive on invest opener confirmed not reproducible.

**Outstanding:**
- `/api/invest/parse-text` does not extract `Athens` city from very short pasted text (returns `city=null` while `neighborhood=Koukaki`). Pre-existing minor edge case from iter54.
- Real comparables not connected (deterministic Market Position values until AirDNA / PriceLabs / Apify wire in).

---

## 2026-02 · Iter 53 — Unified Green + White Design System

**Mandate:** "All pages need the same colors and tones — green and white only."

**What changed:**
- **Color palette purged to 6 tokens** across all .jsx/.js/.css files:
  - `#3F5F4A` — muted olive (primary accent / CTAs / active states)
  - `#171717` — charcoal (primary text)
  - `#6F6A63` — muted (secondary text)
  - `#F7F4EF` — warm off-white (page bg)
  - `#FFFFFF` — white (cards / surfaces)
  - `#E7E0D6` — warm taupe (borders)
- **611 → 0 off-palette hex codes** eliminated via bulk sed:
  - All bronze / terracotta / parchment / dark-espresso / brown shades remapped.
  - All beige border variants (`#D4C7B0`, `#DCC9AA`, etc.) → `#E7E0D6`.
  - All dark text browns (`#3D2F22`, `#2D2218`, etc.) → `#171717`.
  - All medium browns (`#5C4A36`, `#7A6F5C`, etc.) → `#6F6A63`.
- **JetBrains Mono** retired from all 21 source files — every reference now resolves to `Manrope`.
- **Sharp corners eliminated** — 81 instances of `borderRadius: 2` raised to `12px` (cards) or `14px` (buttons).
- **Primary CTAs unified to olive green** with pill rounded shape and soft elevation shadow:
  - Nav `Demo` pill + mobile `Enter PropOS` + `Add Asset` (Portfolio) + Invest hero `Find better deals` (PASS) + Operate `Optimize This Asset`.
  - Dark `#171717` CTA backgrounds replaced with `#3F5F4A`.
- **Active filter pills** (Portfolio search filter strip) — black active state → olive green active state.
- **InvestOpener button** — was sharp-edge `borderRadius: 2` with `var(--inv-accent-bronze)` (remapped olive); now consistent pill-rounded green button matching the rest of the app.

**Files touched:** ~56 .jsx files, 1 .css file (bulk sed); ~10 manual search_replace edits on `Nav.jsx`, `AcquisitionHero.jsx`, `InvestOpener.jsx`, `Portfolio.jsx`.

**Verified visually across 5 main pages:** Landing `/`, Dashboard `/dashboard/demo`, Portfolio `/portfolio/demo`, Operate `/operate`, Invest Dashboard `/invest/asset/demo`. Every page reads as a single cohesive PropTech product (warm off-white shell + olive green accents + charcoal type + Manrope app-wide).

**Outstanding (lower priority):**
- Verdict pill background tints (BUY/PASS/NEGOTIATE/WATCH) still use soft pastel washes (`rgba(125,191,143,0.10)` etc.) for semantic differentiation — readable as text, not jarring.
- 2 `--inv-signal-down: #8A4A3F` (terracotta-red) and `--inv-accent-gold: #B58A4B` (warm clay) CSS variables retained for verdict signal tints, but no CTAs reference them directly anymore.
- `server.py` (>4300 lines) still needs splitting into modular routers — deferred again.
