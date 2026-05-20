// Propul8 · OPERATE — Result orchestrator.
//
// Cleaned-up structure per user mandate "where your listing stands should
// be at the top, in a very nice and attractive layout, with the score
// attached to it":
//
//   1. UNIFIED Market Position Hero — score + verdict + positioning bar
//      + property image + main finding + Close-the-Gap CTA + Location pill
//   2. Next Best Action (single big card)
//   3. Top 3 Fixes
//   4. Action Impact Simulator (interactive ADR/Occ sliders)
//   5. Build Action Plan CTA
//   6. Collapsed Details (View Numbers / Comparables / Sources / Report)

import { ArrowLeft } from 'lucide-react';

import MarketPositionHero    from './MarketPositionHero';
import NextBestAction        from './NextBestAction';
import Top3Fixes             from './Top3Fixes';
import ActionImpactSimulator from './ActionImpactSimulator';
import ActionPlanCTA         from './ActionPlanCTA';
import CollapsedDetails      from './CollapsedDetails';

export default function OperateResult({ analysis, input, onReset, asset_id = 'demo' }) {
  return (
    <div data-testid="operate-result" style={{ background: '#FAFAFA' }}>
      {/* Slim utility bar */}
      <div className="border-b" style={{ borderColor: '#E4E4E7', background: '#FFFFFF' }}>
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 h-14 flex items-center justify-between">
          <button
            onClick={onReset}
            className="flex items-center gap-2 text-[12.5px] transition-colors"
            style={{ color: '#52525B', fontFamily: 'Inter, sans-serif' }}
            data-testid="operate-result-back-btn"
          >
            <ArrowLeft size={13} />
            Propul8 · Yield Audit
          </button>
          <span
            className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
            style={{ color: '#B8956A' }}
            data-testid="operate-result-version-pill"
          >
            {analysis.analysis_version}
          </span>
        </div>
      </div>

      {/* 1 — Market Position HERO (eye-catching unified surface) */}
      <MarketPositionHero analysis={analysis} input={input} asset_id={asset_id} />

      {/* 2 — Next Best Action */}
      <NextBestAction action={analysis.next_best_action} />

      {/* 3 — Top 3 Fixes */}
      <Top3Fixes fixes={analysis.top_3_fixes} />

      {/* 4 — Action Impact Simulator (interactive ADR/Occ → live yield Δ) */}
      <ActionImpactSimulator analysis={analysis} />

      {/* 5 — Build Action Plan */}
      <ActionPlanCTA asset_id={asset_id} />

      {/* 6 — Collapsed Details (progressive disclosure) */}
      <CollapsedDetails analysis={analysis} input={input} asset_id={asset_id} />
    </div>
  );
}
