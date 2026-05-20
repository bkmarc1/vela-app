import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Plus } from 'lucide-react';
import { computeInvestIntelligence } from '../../lib/investIntelligence';
import { SectionHeader } from '../../components/invest/InvestPrimitives';
import { INVEST_DEMO_INPUT } from '../../lib/investDemo';

const DEMO_ASSETS = [
  INVEST_DEMO_INPUT,
  {
    asset_id: 'demo-2',
    title: 'Paros Cliff Maison · Naoussa',
    city: 'Paros',
    property_type: 'Villa',
    asking_price_eur: 485000,
    m2: 145,
    rooms: 3,
    renovation_state: 'renovation',
    elevator: false,
    year_built: 1992,
    images: ['https://images.unsplash.com/photo-1564501049412-61c2a3083791?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600'],
  },
  {
    asset_id: 'demo-3',
    title: 'Lisbon Penthouse · Príncipe Real',
    city: 'Lisbon',
    property_type: 'Loft',
    asking_price_eur: 690000,
    m2: 124,
    rooms: 2,
    renovation_state: 'pristine',
    elevator: true,
    year_built: 2018,
    images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600'],
  },
];

const fmtEUR = (n) => `€${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

export default function InvestPortfolio() {
  const navigate = useNavigate();
  const rows = DEMO_ASSETS.map((a) => ({ input: a, analysis: computeInvestIntelligence(a) }));

  return (
    <div className="vela-invest" data-testid="invest-portfolio">
      <section className="border-b" style={{ borderColor: 'var(--inv-border)' }}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-16">
          <SectionHeader
            kicker="Propul8 INVEST · Investment Portfolio"
            title="Acquisition pipeline."
            sub="Three demonstration assets, deterministic intelligence, ranked by net yield potential."
            testId="invest-portfolio-header"
          />

          <div className="inv-card inv-card--elevated p-0" data-testid="invest-portfolio-table">
            <table>
              <thead>
                <tr>
                  <th data-testid="portfolio-col-asset">Asset</th>
                  <th data-testid="portfolio-col-city">City</th>
                  <th data-testid="portfolio-col-asking">Asking</th>
                  <th data-testid="portfolio-col-str-score">STR Score</th>
                  <th data-testid="portfolio-col-net-yield">Net Yield</th>
                  <th data-testid="portfolio-col-cash-on-cash">Cash-on-Cash</th>
                  <th data-testid="portfolio-col-smart-buy">Smart Buy</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const sb = r.analysis.offer_intelligence.strategies.find((s) => s.label === 'Smart Buy');
                  return (
                    <tr
                      key={r.input.asset_id}
                      data-testid={`portfolio-row-${r.input.asset_id}`}
                      className="cursor-pointer hover:bg-[rgba(196,167,137,0.04)]"
                      onClick={() => navigate(`/invest/asset/${r.input.asset_id === 'demo' ? 'demo' : r.input.asset_id}`)}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          {r.input.images?.[0] && (
                            <img
                              src={r.input.images[0]}
                              alt=""
                              className="w-10 h-10 object-cover"
                              style={{ filter: 'brightness(0.85)' }}
                            />
                          )}
                          <span className="inv-display text-base">{r.input.title}</span>
                        </div>
                      </td>
                      <td><span style={{ color: 'var(--inv-text-secondary)' }}>{r.input.city}</span></td>
                      <td><span className="inv-num">{fmtEUR(r.input.asking_price_eur)}</span></td>
                      <td><span className="inv-num">{r.analysis.snapshot.str_score}</span></td>
                      <td>
                        <span
                          className="inv-num"
                          style={{ color: r.analysis.snapshot.estimated_net_yield_pct >= 9 ? 'var(--inv-signal-up)' : 'var(--inv-text-primary)' }}
                        >
                          {r.analysis.snapshot.estimated_net_yield_pct.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span
                          className="inv-num"
                          style={{ color: r.analysis.snapshot.cash_on_cash_pct >= 12 ? 'var(--inv-signal-up)' : 'var(--inv-text-primary)' }}
                        >
                          {r.analysis.snapshot.cash_on_cash_pct.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span className="inv-num" style={{ color: 'var(--inv-accent-bronze)' }}>
                          {fmtEUR(sb?.price_eur)}
                        </span>
                      </td>
                      <td>
                        <ArrowUpRight size={14} style={{ color: 'var(--inv-text-secondary)' }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={() => navigate('/invest')}
              className="inv-btn"
              data-testid="invest-portfolio-new-asset"
            >
              <Plus size={13} />
              Analyze new acquisition
            </button>
            <span className="inv-kicker">Demo data · deterministic per asset_id</span>
          </div>
        </div>
      </section>
    </div>
  );
}
