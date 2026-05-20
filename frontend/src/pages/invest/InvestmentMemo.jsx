import { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Printer, Sparkles } from 'lucide-react';
import { computeInvestIntelligence } from '../../lib/investIntelligence';
import { INVEST_DEMO_INPUT, INVEST_DEMO_ANALYSIS } from '../../lib/investDemo';
import { fmtEUR } from '../../components/invest/dashboard/InvestChrome';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const fmtPct = (n) => `${(Number(n) || 0).toFixed(1)}%`;

// AI Investment Memo™ — institutional one-pager generated from the verified
// asset inputs + deterministic intelligence. Print-friendly via window.print().
export default function InvestmentMemo() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialAnalysis =
    assetId === 'demo'
      ? INVEST_DEMO_ANALYSIS
      : (location.state && location.state.analysis) || null;

  const initialInput =
    assetId === 'demo'
      ? INVEST_DEMO_INPUT
      : (location.state && location.state.input) || null;

  // If we don't have state-passed analysis, hydrate from server-side draft.
  useEffect(() => {
    if (initialAnalysis) return;
    if (assetId && assetId.startsWith('dft_')) {
      axios
        .get(`${API}/invest/draft/${assetId}`)
        .then(({ data }) => {
          // Bounce back to dashboard which knows how to compute.
          navigate(`/invest/asset/${assetId}`, {
            state: { autoMemo: true },
            replace: true,
          });
        })
        .catch(() => navigate('/invest'));
    } else {
      navigate('/invest');
    }
  }, [assetId, initialAnalysis, navigate]);

  if (!initialAnalysis || !initialInput) {
    return (
      <div className="vela-invest min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Sparkles size={20} className="mx-auto mb-3 inv-pulse" style={{ color: 'var(--inv-accent-bronze)' }} />
          <div className="inv-kicker">Generating memo…</div>
        </div>
      </div>
    );
  }

  const a = initialAnalysis;
  const input = initialInput;
  const smart = a.offer_intelligence.strategies.find((s) => s.label === 'Smart Buy');
  const aggr  = a.offer_intelligence.strategies.find((s) => s.label === 'Aggressive Buy');
  const top   = a.transformation.scenarios[a.transformation.scenarios.length - 1];

  return (
    <div data-testid="investment-memo" style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      {/* Top bar — hidden on print */}
      <div className="border-b print:hidden" style={{ borderColor: 'rgba(9,9,11,0.08)', background: '#FAFAFA' }}>
        <div className="max-w-[900px] mx-auto px-8 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(`/invest/asset/${assetId}`)}
            className="flex items-center gap-2 text-[12px] font-mono-tight"
            style={{ color: '#52525B' }}
            data-testid="memo-back-btn"
          >
            <ArrowLeft size={13} />
            Back to dashboard
          </button>
          <button
            onClick={() => window.print()}
            className="vela-btn"
            data-testid="memo-print-btn"
          >
            <Printer size={12} strokeWidth={1.6} />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Memo body — print-optimized */}
      <div
        className="max-w-[900px] mx-auto px-10 lg:px-16 py-16 lg:py-20"
        style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(9,9,11,0.06)' }}
      >
        {/* Letterhead */}
        <header className="mb-14" style={{ borderBottom: '2px solid #09090B', paddingBottom: 28 }}>
          <div
            className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
            style={{ color: '#B8956A' }}
          >
            Propul8 Intelligence Engine · AI Investment Memo™
          </div>
          <div className="flex items-end justify-between mt-3 flex-wrap gap-4">
            <h1
              className="font-display font-medium leading-[1.02]"
              style={{ color: '#09090B', fontSize: 'clamp(28px, 3.4vw, 42px)' }}
              data-testid="memo-title"
            >
              {input.title || 'Acquisition Memo'}
            </h1>
            <div
              className="font-mono-tight text-[11px] text-right"
              style={{ color: '#52525B' }}
            >
              <div>{input.city} · {input.property_type}</div>
              <div className="mt-1">{new Date(a.generated_at || Date.now()).toLocaleDateString()}</div>
            </div>
          </div>
        </header>

        {/* Investment Summary */}
        <Block kicker="01 · Investment Summary" testId="memo-summary">
          <p className="text-[13px] leading-relaxed" style={{ color: '#09090B' }}>
            {input.title || 'This asset'} ({input.m2} m² · {input.rooms} bedrooms · {input.city})
            is currently asking <strong>{fmtEUR(input.asking_price_eur)}</strong>.
            Propul8 models a Smart Buy at <strong>{fmtEUR(smart?.price_eur)}</strong> ({fmtPct(smart?.net_yield_pct)} net yield, {fmtPct(smart?.cash_on_cash_pct)} cash-on-cash) —
            an institutional discount of {fmtEUR(input.asking_price_eur - (smart?.price_eur || 0))}{' '}
            below current asking. After Propul8 Transformation™, projected net yield reaches <strong>{fmtPct(top.net_yield_pct)}</strong>.
          </p>
        </Block>

        {/* Snapshot scores */}
        <Block kicker="02 · Investment Snapshot" testId="memo-snapshot">
          <div className="grid grid-cols-3 gap-x-6 gap-y-5">
            <MemoMetric label="STR Score"            value={`${a.snapshot.str_score}/100`} />
            <MemoMetric label="Appreciation"         value={`${a.snapshot.appreciation_potential}/100`} />
            <MemoMetric label="Pricing Power"        value={`${a.snapshot.pricing_power}/100`} />
            <MemoMetric label="Design Upside"        value={`${a.snapshot.design_upside}/100`} />
            <MemoMetric label="Liquidity"            value={`${a.snapshot.liquidity_score}/100`} />
            <MemoMetric label="Seasonality Risk"     value={`${a.snapshot.seasonality_risk}/100`} />
            <MemoMetric label="Estimated Net Yield"  value={fmtPct(a.snapshot.estimated_net_yield_pct)} accent />
            <MemoMetric label="Cash-on-Cash"         value={fmtPct(a.snapshot.cash_on_cash_pct)} accent />
            <MemoMetric label="Occupancy"            value={`${a.true_roi.occupancy_pct}%`} />
          </div>
        </Block>

        {/* Offer Intelligence */}
        <Block kicker="03 · Offer Intelligence™" testId="memo-offer">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(9,9,11,0.16)' }}>
                <th style={memoThStyle}>Strategy</th>
                <th style={memoThStyle}>Offer Price</th>
                <th style={memoThStyle}>Net Yield</th>
                <th style={memoThStyle}>CoC</th>
              </tr>
            </thead>
            <tbody>
              {a.offer_intelligence.strategies.map((s) => (
                <tr key={s.label} style={{ borderBottom: '1px solid rgba(9,9,11,0.06)' }}>
                  <td className="py-3" style={{ color: '#09090B', fontFamily: 'Cabinet Grotesk, sans-serif' }}>{s.label}</td>
                  <td className="py-3 font-mono-tight font-medium" style={{ color: s.label === 'Smart Buy' ? '#B8956A' : '#09090B' }}>
                    {fmtEUR(s.price_eur)}
                  </td>
                  <td className="py-3 font-mono-tight" style={{ color: '#09090B' }}>{fmtPct(s.net_yield_pct)}</td>
                  <td className="py-3 font-mono-tight" style={{ color: '#09090B' }}>{fmtPct(s.cash_on_cash_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>

        {/* Transformation Upside */}
        <Block kicker="04 · Transformation Upside" testId="memo-transformation">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(9,9,11,0.16)' }}>
                <th style={memoThStyle}>Scenario</th>
                <th style={memoThStyle}>ADR</th>
                <th style={memoThStyle}>Occupancy</th>
                <th style={memoThStyle}>Net Yield</th>
              </tr>
            </thead>
            <tbody>
              {a.transformation.scenarios.map((s) => (
                <tr key={s.label} style={{ borderBottom: '1px solid rgba(9,9,11,0.06)' }}>
                  <td className="py-3" style={{ color: '#09090B' }}>{s.label}</td>
                  <td className="py-3 font-mono-tight" style={{ color: '#09090B' }}>€{s.adr}</td>
                  <td className="py-3 font-mono-tight" style={{ color: '#09090B' }}>{s.occupancy_pct}%</td>
                  <td className="py-3 font-mono-tight font-medium" style={{ color: '#B8956A' }}>{fmtPct(s.net_yield_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>

        {/* Risks & Negotiation */}
        <Block kicker="05 · Risks & Negotiation Levers" testId="memo-risks">
          <ul className="space-y-2.5">
            {a.negotiation.slice(0, 4).map((n, i) => (
              <li key={i} className="flex items-baseline gap-3 text-[13px]" style={{ color: '#09090B' }}>
                <span className="w-1 h-1 mt-2" style={{ background: n.severity === 'high' ? '#B8956A' : '#B8956A' }} />
                <div>
                  <strong>{n.label}</strong>
                  <div className="text-[11.5px] mt-1" style={{ color: '#52525B' }}>{n.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        </Block>

        {/* Market Signals */}
        <Block kicker="06 · Market Signals" testId="memo-signals">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            {a.market_signals.slice(0, 6).map((s) => (
              <div key={s.label} className="flex items-baseline justify-between text-[12.5px]">
                <span style={{ color: '#09090B' }}>{s.label}</span>
                <span
                  className="font-mono-tight text-[10px] tracking-[0.18em] uppercase"
                  style={{
                    color: s.level === 'HIGH' ? '#B8956A' : s.level === 'LOW' ? '#52525B' : '#B8956A',
                  }}
                >
                  {s.level}
                </span>
              </div>
            ))}
          </div>
        </Block>

        {/* Recommendation */}
        <Block kicker="07 · Recommendation" testId="memo-recommendation">
          <p className="text-[13px] leading-relaxed" style={{ color: '#09090B' }}>
            Propul8 recommends pursuing acquisition at the <strong>Smart Buy {fmtEUR(smart?.price_eur)}</strong> envelope —
            with a fallback to Aggressive {fmtEUR(aggr?.price_eur)} based on negotiation leverage.
            Post-transformation projected yield: <strong>{fmtPct(top.net_yield_pct)}</strong>.
          </p>
        </Block>

        {/* Footer */}
        <footer
          className="mt-14 pt-6 text-[10px] font-mono-tight"
          style={{ color: '#52525B', borderTop: '1px solid rgba(9,9,11,0.10)' }}
        >
          Generated by Propul8 Intelligence Engine · Asset {a.asset_id} · {a.analysis_version}
          <br />
          All projections assume verified inputs. Default assumptions: Airbnb 15% / Mgmt 18% / Vacancy 8% / Maintenance 6% / Insurance 0.4% / GR Tax 15% / 60% LTV @ 4.5%.
        </footer>
      </div>

      {/* Print stylesheet — letter-friendly */}
      <style>{`
        @media print {
          body { background: #fff; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function Block({ kicker, children, testId }) {
  return (
    <section className="mb-12" data-testid={testId}>
      <div
        className="font-mono-tight text-[10px] tracking-[0.22em] uppercase mb-4"
        style={{ color: '#B8956A' }}
      >
        {kicker}
      </div>
      {children}
    </section>
  );
}

function MemoMetric({ label, value, accent }) {
  return (
    <div>
      <div
        className="font-mono-tight text-[9px] tracking-[0.22em] uppercase"
        style={{ color: '#52525B' }}
      >
        {label}
      </div>
      <div
        className="font-mono-tight text-[18px] font-medium mt-1"
        style={{ color: accent ? '#B8956A' : '#09090B', letterSpacing: '-0.02em' }}
      >
        {value}
      </div>
    </div>
  );
}

const memoThStyle = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 9.5,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: '#52525B',
  fontWeight: 500,
  textAlign: 'left',
  paddingBottom: 8,
  paddingRight: 12,
};
