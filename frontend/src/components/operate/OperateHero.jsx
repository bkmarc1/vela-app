import { ArrowUpRight, ArrowRight, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import { opFmtEUR } from './OperatePrimitives';
import DataBadge from '../shared/DataBadge';
import { buildOperateProvenance } from '../../lib/dataProvenance';

// Propul8 OPERATE — Hero block (minimal spec).
// 6 elements only:
//   1. Property Snapshot   (image · title · location · bedrooms · size · source)
//   2. Data Quality        (Strong / Medium / Limited + missing fields)
//   3. Performance Snapshot (Current ADR · Occupancy · Revenue · Net Yield)
//   4. Opportunity         (Revenue Gap · Main issue · Next Best Action)
//   5. Top 3 Actions
//   6. Build Action Plan CTA

export default function OperateHero({ analysis, input }) {
  const {
    hospitality_dna, revenue_leakage_pct, revenue_leakage_eur_per_year,
    snapshot, revenue_intelligence: rev, optimization_verdict, action_plan,
    top_insights,
  } = analysis;

  const prov = buildOperateProvenance(input || {});
  const inputsConfirmed = prov.city?.status === 'Confirmed' && prov.bedrooms?.status === 'Confirmed';
  const calcCell = (value, label, unit) => ({
    value, status: inputsConfirmed ? 'Calculated' : 'Estimated',
    confidence: inputsConfirmed ? 72 : 50,
    source: inputsConfirmed ? 'Propul8 deterministic math' : 'Propul8 market model',
    lastChecked: new Date().toISOString().slice(0, 10),
    label, unit,
  });

  // Data Quality bucket — based on how many critical fields are Confirmed.
  const fieldsConfirmed = Object.values(prov).filter((c) => c.status === 'Confirmed').length;
  const totalFields = Object.values(prov).length;
  const dataQuality = fieldsConfirmed / totalFields >= 0.75 ? 'Strong'
                    : fieldsConfirmed / totalFields >= 0.45 ? 'Medium' : 'Limited';
  const missingLabels = Object.entries(prov)
    .filter(([, c]) => c.status === 'Not confirmed' || c.status === 'Source blocked' || c.status === 'Needs input')
    .map(([, c]) => c.label || '')
    .filter(Boolean)
    .slice(0, 4);

  // Net Yield — requires acquisition price to compute. Operate flow doesn't
  // capture purchase price by default; show "Needs input" rather than fake.
  const acquisitionCost = Number(input.acquisition_price_eur) || null;
  const netYieldCell = acquisitionCost
    ? calcCell(
        Math.round((snapshot.current_monthly_rev_eur * 12 / acquisitionCost) * 1000) / 10,
        'Net yield', '%',
      )
    : {
        value: null, status: 'Needs input', confidence: 0,
        source: 'Add acquisition cost to compute', lastChecked: new Date().toISOString().slice(0, 10),
        label: 'Net yield', unit: '%',
      };

  const primary_image = (input.images || [])[0] || null;
  const sourceLabel = input.listing_source || 'Listing';
  const top3 = (top_insights || []).slice(0, 3);

  return (
    <section
      className="border-b"
      style={{ borderColor: 'rgba(9,9,11,0.10)', background: '#FAFAFA' }}
      data-testid="operate-section-hero"
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-14 lg:py-18">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14">
          {/* 1 · PROPERTY SNAPSHOT — image + facts */}
          <div className="lg:col-span-5">
            {primary_image ? (
              <div
                className="aspect-[4/3] w-full overflow-hidden"
                style={{ borderRadius: 4, border: '1px solid rgba(9,9,11,0.10)' }}
                data-testid="operate-hero-image-wrap"
              >
                <img
                  src={primary_image}
                  alt={input.title || 'Asset'}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.015]"
                  data-testid="operate-hero-image"
                />
              </div>
            ) : (
              <div
                className="aspect-[4/3] w-full flex items-center justify-center"
                style={{ background: 'rgba(184,149,106,0.04)', border: '1px solid rgba(9,9,11,0.10)', borderRadius: 12 }}
                data-testid="operate-hero-no-image"
              >
                <span
                  className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
                  style={{ color: '#52525B' }}
                >
                  Image not available
                </span>
              </div>
            )}
          </div>

          {/* RIGHT — facts + data quality + performance */}
          <div className="lg:col-span-7">
            <span
              className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
              style={{ color: '#B8956A' }}
              data-testid="operate-hero-location"
            >
              {snapshot.location} · {snapshot.property_type} · {snapshot.bedrooms}BR
            </span>
            <h1
              className="font-display font-medium mt-3 leading-[1.04]"
              style={{
                color: '#09090B',
                fontSize: 'clamp(28px, 3.4vw, 42px)',
                letterSpacing: '-0.02em',
                maxWidth: 640,
              }}
              data-testid="operate-hero-title"
            >
              {input.title || 'Existing asset'}
            </h1>

            {/* Inline meta strip: bedrooms · sqm · sleeps · source */}
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px]" style={{ color: '#52525B' }}>
              <span><b style={{ color: '#09090B' }}>{snapshot.bedrooms}</b> bedroom{snapshot.bedrooms === 1 ? '' : 's'}</span>
              {input.m2 && <span><b style={{ color: '#09090B' }}>{input.m2}</b> m²</span>}
              <span>Sleeps <b style={{ color: '#09090B' }}>{snapshot.capacity}</b></span>
              <span>Source · <b style={{ color: '#09090B' }}>{sourceLabel}</b></span>
            </div>

            {input.url && (
              <a
                href={input.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2.5 text-[11px] font-mono-tight transition-opacity hover:opacity-70"
                style={{ color: '#B8956A' }}
                data-testid="operate-hero-url"
              >
                View original listing <ArrowUpRight size={11} />
              </a>
            )}

            {/* 2 · DATA QUALITY strip */}
            <div
              className="mt-7 px-5 py-4 flex items-start justify-between gap-4 flex-wrap"
              style={{
                background: dataQuality === 'Strong' ? 'rgba(92,122,78,0.06)'
                          : dataQuality === 'Medium' ? 'rgba(184,149,106,0.06)'
                          : 'rgba(160,82,74,0.06)',
                border: dataQuality === 'Strong' ? '1px solid rgba(92,122,78,0.30)'
                      : dataQuality === 'Medium' ? '1px solid rgba(184,149,106,0.30)'
                      : '1px solid rgba(160,82,74,0.30)',
                borderRadius: 4,
              }}
              data-testid="operate-hero-data-quality"
            >
              <div>
                <span
                  className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
                  style={{
                    color: dataQuality === 'Strong' ? '#B8956A'
                         : dataQuality === 'Medium' ? '#B8956A' : '#B8956A',
                  }}
                >
                  Data Quality · {dataQuality}
                </span>
                <div className="text-[12.5px] mt-1.5" style={{ color: '#52525B' }}>
                  {fieldsConfirmed} of {totalFields} fields verified from {sourceLabel}
                  {missingLabels.length > 0 && (
                    <span style={{ color: '#52525B' }}> · Missing: {missingLabels.join(', ')}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 · PERFORMANCE SNAPSHOT — 4 KPIs in a clean band */}
        <div
          className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-px"
          style={{ background: 'rgba(9,9,11,0.08)' }}
        >
          <PerfTile
            label="Current ADR"
            value={snapshot.current_adr_eur !== null ? `€${snapshot.current_adr_eur}` : 'Needs input'}
            cell={prov.current_adr}
            isMissing={snapshot.current_adr_eur === null}
            testId="operate-perf-adr"
          />
          <PerfTile
            label="Current Occupancy"
            value={snapshot.current_occupancy_pct !== null ? `${snapshot.current_occupancy_pct}%` : 'Needs input'}
            cell={prov.current_occupancy}
            isMissing={snapshot.current_occupancy_pct === null}
            testId="operate-perf-occ"
          />
          <PerfTile
            label="Monthly Revenue"
            value={snapshot.current_monthly_rev_eur !== null ? `€${snapshot.current_monthly_rev_eur.toLocaleString()}` : 'Needs input'}
            cell={snapshot.current_monthly_rev_eur !== null
              ? calcCell(snapshot.current_monthly_rev_eur, 'Monthly revenue', 'EUR')
              : { value: null, status: 'Needs input', confidence: 0, source: 'Requires ADR + occupancy', lastChecked: new Date().toISOString().slice(0, 10), label: 'Monthly revenue' }}
            isMissing={snapshot.current_monthly_rev_eur === null}
            testId="operate-perf-rev"
          />
          <PerfTile
            label="Net Yield"
            value={netYieldCell.value !== null ? `${netYieldCell.value}%` : 'Add cost basis'}
            cell={netYieldCell}
            isMissing={netYieldCell.value === null}
            testId="operate-perf-yield"
          />
        </div>

        {/* 4 · OPPORTUNITY — Revenue Gap + Main issue + Next Best Action */}
        <div
          className="mt-10 grid lg:grid-cols-3 gap-px"
          style={{ background: 'rgba(9,9,11,0.08)' }}
          data-testid="operate-hero-opportunity"
        >
          <OppTile
            kicker="Revenue Gap"
            value={revenue_leakage_pct !== null ? `${revenue_leakage_pct}%` : 'Needs data'}
            sub={revenue_leakage_pct !== null
              ? `${opFmtEUR(revenue_leakage_eur_per_year || 0)} / yr unrealized`
              : 'Add current ADR + occupancy to quantify'}
            accent={revenue_leakage_pct !== null ? '#B8956A' : '#52525B'}
            icon={TrendingUp}
            testId="operate-opp-gap"
          />
          <OppTile
            kicker="Main Issue"
            value={top3[0] || 'Listing optimization'}
            sub={`Hospitality DNA · ${hospitality_dna.category}`}
            icon={AlertCircle}
            testId="operate-opp-main"
            valueSize={16}
          />
          <OppTile
            kicker="Next Best Action"
            value={(action_plan.fix_first[0] || {}).action || 'Audit listing'}
            sub={`Impact · ${(action_plan.fix_first[0] || {}).impact || 'Medium'}`}
            accent="#B8956A"
            icon={Sparkles}
            testId="operate-opp-next"
            valueSize={16}
          />
        </div>

        {/* 5 · TOP 3 ACTIONS */}
        <div className="mt-12" data-testid="operate-hero-top-actions">
          <div className="flex items-baseline justify-between mb-5">
            <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#B8956A' }}>
              Top 3 Actions
            </span>
            <span className="font-mono-tight text-[11px]" style={{ color: '#52525B' }}>
              Ranked by yield impact
            </span>
          </div>
          <div className="grid lg:grid-cols-3 gap-px" style={{ background: 'rgba(9,9,11,0.08)' }}>
            {action_plan.fix_first.slice(0, 3).map((a, i) => (
              <ActionTile key={i} idx={i + 1} action={a} testId={`operate-action-${i}`} />
            ))}
          </div>
        </div>

        {/* 6 · BUILD ACTION PLAN CTA */}
        <div className="mt-12 flex items-center gap-3 flex-wrap" data-testid="operate-hero-ctas">
          <button
            type="button"
            onClick={() => { /* parent handles via existing autopilot button */ }}
            className="inline-flex items-center gap-2.5 px-6 py-3 text-[11px] tracking-[0.10em] uppercase transition-all"
            style={{
              background: '#B8956A', color: '#FFFFFF', border: 'none', borderRadius: 3,
              fontFamily: 'Inter, sans-serif', fontWeight: 500, cursor: 'pointer',
            }}
            data-testid="operate-build-plan-cta"
          >
            <Sparkles size={13} strokeWidth={1.6} />
            Build Action Plan
            <ArrowRight size={12} />
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-5 py-3 text-[11px] tracking-[0.10em] uppercase"
            style={{
              background: 'transparent', color: '#52525B',
              border: '1px solid rgba(9,9,11,0.18)', borderRadius: 4,
              fontFamily: 'Inter, sans-serif', cursor: 'pointer',
            }}
            data-testid="operate-view-comps-btn"
          >
            View Comparables
          </button>
          <button
            type="button"
            onClick={() => window.location.assign('/reports')}
            className="inline-flex items-center gap-2 px-5 py-3 text-[11px] tracking-[0.10em] uppercase"
            style={{
              background: 'transparent', color: '#52525B',
              border: '1px solid rgba(9,9,11,0.18)', borderRadius: 4,
              fontFamily: 'Inter, sans-serif', cursor: 'pointer',
            }}
            data-testid="operate-gen-report-btn"
          >
            Generate Report
          </button>
        </div>
      </div>
    </section>
  );
}

function PerfTile({ label, value, cell, isMissing, testId }) {
  return (
    <div className="p-5 lg:p-6" style={{ background: '#FAFAFA' }} data-testid={testId}>
      <div className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase" style={{ color: '#52525B' }}>
        {label}
      </div>
      <div
        className="font-mono-tight font-medium mt-2 tabular-nums"
        style={{
          fontSize: isMissing ? 14 : 'clamp(22px, 2.4vw, 30px)',
          color: isMissing ? '#B8956A' : '#09090B',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          fontStyle: isMissing ? 'italic' : 'normal',
        }}
      >
        {value}
      </div>
      {cell && (
        <div className="mt-2">
          <DataBadge cell={cell} theme="light" size="sm" testId={testId ? `${testId}-badge` : undefined} />
        </div>
      )}
    </div>
  );
}

function OppTile({ kicker, value, sub, accent, icon: Icon, testId, valueSize }) {
  return (
    <div className="p-6 lg:p-7" style={{ background: '#FAFAFA' }} data-testid={testId}>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={13} strokeWidth={1.6} style={{ color: accent || '#B8956A' }} />}
        <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: accent || '#B8956A' }}>
          {kicker}
        </span>
      </div>
      <div
        className="font-display font-medium leading-snug"
        style={{
          color: accent || '#09090B',
          fontSize: valueSize || 'clamp(22px, 2.4vw, 28px)',
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-2 text-[12px]" style={{ color: '#52525B' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function ActionTile({ idx, action, testId }) {
  return (
    <div className="p-5 lg:p-6" style={{ background: '#FAFAFA' }} data-testid={testId}>
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="font-mono-tight font-medium"
          style={{
            fontSize: 11, color: '#B8956A', background: 'rgba(184,149,106,0.10)',
            border: '1px solid rgba(184,149,106,0.30)', borderRadius: 999,
            width: 22, height: 22, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', letterSpacing: 0,
          }}
        >
          {idx}
        </span>
        <span className="font-mono-tight text-[9.5px] tracking-[0.18em] uppercase" style={{ color: '#B8956A' }}>
          Recommended
        </span>
      </div>
      <div className="text-[14px] leading-snug" style={{ color: '#09090B', fontWeight: 500 }}>
        {action.action}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11.5px]" style={{ color: '#52525B' }}>
        <span>Impact <b style={{ color: '#09090B' }}>{action.impact}</b></span>
        <span>{action.timeframe}</span>
      </div>
    </div>
  );
}
