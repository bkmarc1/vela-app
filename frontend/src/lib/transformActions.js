// Propul8 Execution OS — operational action catalogue.
// Click → real output. No essays.
import {
  Eye,
  ShoppingBag,
  Workflow,
  Type,
  Zap,
  Camera,
  Lamp,
  Sofa,
  Compass,
  LineChart,
  TrendingUp,
  Target,
  FileText,
  Palette,
  Image as ImageIcon,
  Wand2,
  Search,
  Sparkles,
  Download,
  CheckCircle2,
} from 'lucide-react';

// Seven operational primitives — every upgrade card surfaces these.
export const ACTIONS = {
  visualize_layout:  { label: 'Visualize with AI',         icon: Wand2,        bundle: true },
  shopping_cart:     { label: 'Build Upgrade',            icon: ShoppingBag,  bundle: true },
  contractor_pack:   { label: 'Create Contractor Pack',    icon: Workflow,     bundle: true },
  update_listing:    { label: 'Rewrite Listing',           icon: Type,         bundle: true },
  activate_upgrade:  { label: 'Activate Upgrade',          icon: Zap,          bundle: true },
  export_pack:       { label: 'Export Upgrade Pack',       icon: Download,     bundle: true },
  approve_apply:     { label: 'Approve & Apply',           icon: CheckCircle2, frontendOnly: true },

  // ── Legacy keys retained for API back-compat ─────────────────────────────
  photo_package:        { label: 'Create Photo Package',        icon: Camera,    bundle: true },
  lighting_package:     { label: 'Build Lighting Package',      icon: Lamp,      bundle: true },
  listing_optimization: { label: 'Optimize Listing',            icon: Target,    bundle: true },
  pricing_strategy:     { label: 'Launch Pricing Strategy',     icon: TrendingUp, bundle: true },
  outdoor_package:      { label: 'Transform Outdoor',           icon: Sofa,      bundle: true },
  space_transformation: { label: 'Transform Space',             icon: Workflow,  bundle: true },
  execute_upgrade:      { label: 'Execute Upgrade',             icon: Zap,       bundle: true },
  optimize_listing:     { label: 'Apply Optimization',          icon: Sparkles,  bundle: true },
  project_roi:          { label: 'Project ROI Impact',          icon: LineChart, bundle: true },
  execution_plan:       { label: 'Execution Plan',              icon: Workflow },
  shopping_list:        { label: 'Shopping List',               icon: ShoppingBag },
  design_prompt:        { label: 'AI Design Prompt',            icon: Wand2 },
  roi_impact:           { label: 'ROI Impact',                  icon: TrendingUp },
  creative_brief:       { label: 'Creative Brief',              icon: FileText },
  visualize_upgrade:    { label: 'Visualize Upgrade',           icon: Eye },
  shot_list:            { label: 'Shot List',                   icon: Camera },
  photographer_brief:   { label: 'Photographer Brief',          icon: FileText },
  styling_direction:    { label: 'Styling Direction',           icon: Palette },
  airbnb_cover_strategy:{ label: 'Cover Image Strategy',        icon: ImageIcon },
  lighting_plan:        { label: 'Lighting Plan',               icon: Lamp },
  adr_impact:           { label: 'ADR Impact',                  icon: TrendingUp },
  terrace_concept:      { label: 'Terrace Concept',             icon: Eye },
  furniture_package:    { label: 'Furniture Package',           icon: Sofa },
  architect_brief:      { label: 'Architect Brief',             icon: Compass },
  roi_projection:       { label: 'ROI Projection',              icon: LineChart },
  airbnb_title:         { label: 'Listing Title',               icon: Type },
  listing_description:  { label: 'Listing Description',         icon: FileText },
  seo_keywords:         { label: 'SEO Keywords',                icon: Search },
  guest_positioning:    { label: 'Guest Positioning',           icon: Target },
};

// Every upgrade now exposes the operational primitives most relevant to its
// category. We keep the action set small (≤3) so the UI stays calm, and we
// pick the ones that actually map to the upgrade type:
//
//   • Pricing-type      → pricing_strategy + update_listing
//                         (NEVER procurement — pricing isn't a furniture buy)
//   • Listing/Photo     → update_listing + visualize_layout (no cart)
//   • Lighting          → visualize_layout + lighting_package + shopping_cart
//   • Outdoor / Terrace → visualize_layout + outdoor_package + shopping_cart
//   • Default (interior FF&E / sleep / layout) → visualize_layout + shopping_cart + update_listing
//
// All keys above already exist in ACTIONS and are routed by the existing
// TransformPanel + cart/listing pages. Pricing strategy opens TransformPanel
// (no procurement cart route is created — backend `pricing_strategy` directive
// returns a structured pricing plan inside the side panel).
const _DEFAULT = ['visualize_layout', 'shopping_cart', 'update_listing'];

const _CATEGORY_RULES = [
  { match: /(pricing|adr\b|rate\b|seasonal|occupancy)/i, actions: ['pricing_strategy', 'update_listing'] },
  { match: /(photo|photograph|listing|copy|cover|seo|positioning|description)/i, actions: ['update_listing', 'visualize_layout'] },
  { match: /(light|lamp|fixture|kelvin|2700k|illuminat)/i, actions: ['visualize_layout', 'lighting_package', 'shopping_cart'] },
  { match: /(outdoor|terrace|patio|garden|pool|balcony)/i, actions: ['visualize_layout', 'outdoor_package', 'shopping_cart'] },
];

export function actionsForRecommendation(rec) {
  const title = (rec?.title || '').toString();
  for (const rule of _CATEGORY_RULES) {
    if (rule.match.test(title)) return rule.actions;
  }
  return _DEFAULT;
}
