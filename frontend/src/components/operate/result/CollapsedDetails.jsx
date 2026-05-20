// Propul8 · OPERATE — Collapsed Details (progressive disclosure).
// View Numbers / View Comparables / View Data Sources / Generate Report
// All hidden until user opts in.

import { useState } from 'react';
import { ChevronDown, BarChart3, Building2, Database, FileText } from 'lucide-react';

import RevenueLeakSection   from '../RevenueLeakSection';
import TransformationEngine from '../TransformationEngine';
import { OperateSection, OpScoreBar } from '../OperatePrimitives';
import SourceLedger        from '../../shared/SourceLedger';
import { buildOperateProvenance } from '../../../lib/dataProvenance';

const TOGGLES = [
  { id: 'numbers',     label: 'View Numbers',       icon: BarChart3 },
  { id: 'comps',       label: 'View Comparables',   icon: Building2 },
  { id: 'sources',     label: 'View Data Sources',  icon: Database },
  { id: 'report',      label: 'Generate Report',    icon: FileText },
];

export default function CollapsedDetails({ analysis, input, asset_id }) {
  const [open, setOpen] = useState({ numbers: false, comps: false, sources: false, report: false });
  const toggle = (id) => setOpen((s) => ({ ...s, [id]: !s[id] }));

  return (
    <section className="px-6 md:px-12 py-14 border-t" style={{ borderColor: '#E4E4E7' }} data-testid="operate-result-details">
      <div className="max-w-[1180px] mx-auto">
        <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#52525B' }}>
          Optional · Deeper Analysis
        </span>
        <h2
          className="mt-3 font-display"
          style={{
            color: '#09090B',
            fontSize: 'clamp(20px, 2.2vw, 26px)',
            fontWeight: 500,
            letterSpacing: '-0.015em',
          }}
        >
          Open any section.
        </h2>
        <p className="mt-2 text-[13.5px]" style={{ color: '#52525B' }}>
          The summary above is enough. These details are here when you want them.
        </p>

        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {TOGGLES.map((t) => {
            const Icon = t.icon;
            const isOpen = open[t.id];
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className="flex items-center justify-between gap-2 px-5 py-3.5 transition-all"
                style={{
                  background: isOpen ? '#B8956A' : '#FFFFFF',
                  color: isOpen ? '#FFFFFF' : '#09090B',
                  border: isOpen ? '1px solid #B8956A' : '1px solid #E4E4E7',
                  borderRadius: 3,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: 12.5,
                  letterSpacing: '-0.005em',
                }}
                data-testid={`operate-detail-toggle-${t.id}`}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon size={14} strokeWidth={1.6} />
                  {t.label}
                </span>
                <ChevronDown
                  size={14}
                  strokeWidth={1.6}
                  style={{
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 200ms ease',
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* VIEW NUMBERS — listing scores + revenue leak detection */}
        {open.numbers && (
          <div className="space-y-8 mb-12" data-testid="operate-detail-numbers">
            <OperateSection
              kicker="Listing Optimization"
              title="Where the listing leaks revenue."
              testId="operate-section-listing"
            >
              <div className="grid md:grid-cols-3 gap-x-12 gap-y-10">
                <OpScoreBar label="Title Score"       value={analysis.listing_optimization.title_score} testId="op-listing-title-score" />
                <OpScoreBar label="Photo Score"       value={analysis.listing_optimization.photo_score} testId="op-listing-photo-score" />
                <OpScoreBar label="Description Score" value={analysis.listing_optimization.description_score} testId="op-listing-desc-score" />
              </div>
            </OperateSection>
            <RevenueLeakSection
              leaks={analysis.revenue_leaks}
              total_leak_eur={analysis.revenue_leakage_eur_per_year}
              leakage_pct={analysis.revenue_leakage_pct}
            />
            <TransformationEngine
              styles={analysis.transformation_styles}
              current_adr_eur={analysis.snapshot.current_adr_eur}
            />
          </div>
        )}

        {/* VIEW COMPARABLES */}
        {open.comps && (
          <div
            className="p-8 mb-8 text-center"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: 4,
              boxShadow: '0 1px 2px rgba(9,9,11,0.03)',
            }}
            data-testid="operate-detail-comps"
          >
            <div className="font-display text-[18px]" style={{ color: '#09090B', fontWeight: 500 }}>
              No real comparable listings available yet.
            </div>
            <p className="mt-3 max-w-[440px] mx-auto text-[14px]" style={{ color: '#52525B' }}>
              Real Airbnb, Booking, and AirDNA comparables will appear here once external data sources are connected.
              Propul8 never shows synthesized competitors.
            </p>
          </div>
        )}

        {/* VIEW DATA SOURCES — Source Ledger v2 (per-field provenance + Lock) */}
        {open.sources && (
          <div
            className="mb-8 overflow-hidden"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: 4,
              boxShadow: '0 1px 2px rgba(9,9,11,0.03)',
            }}
            data-testid="operate-detail-sources"
          >
            <SourceLedger
              provenance={buildOperateProvenance(input)}
              asset_id={asset_id}
            />
          </div>
        )}

        {/* GENERATE REPORT */}
        {open.report && (
          <div
            className="p-8 mb-8 text-center"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: 4,
              boxShadow: '0 1px 2px rgba(9,9,11,0.03)',
            }}
            data-testid="operate-detail-report"
          >
            <div className="font-display text-[18px]" style={{ color: '#09090B', fontWeight: 500 }}>
              Generate institutional report
            </div>
            <p className="mt-3 max-w-[440px] mx-auto text-[14px]" style={{ color: '#52525B' }}>
              A print-friendly summary of the audit, including data quality, findings, top fixes, and projected uplift.
            </p>
            <button
              onClick={() => window.location.assign(`/reports?asset=${encodeURIComponent(asset_id || 'demo')}`)}
              className="mt-5 inline-flex items-center gap-2 px-5 py-3 text-[13px]"
              style={{
                background: '#B8956A',
                color: '#FFFFFF',
                borderRadius: 3,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
              }}
              data-testid="operate-detail-generate-report-btn"
            >
              Open Reports
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
