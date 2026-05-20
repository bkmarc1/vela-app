import { AlertTriangle } from 'lucide-react';
import { SectionHeader } from '../InvestPrimitives';
import { Section } from './InvestChrome';

// Propul8 STR Comparables — institutional comparable inventory.
// Until Propul8's Apify integration is wired (Phase B), all comps are synthesised
// from Propul8's market model and are clearly labelled "Demo comparable" so
// investors are never misled. Real Airbnb / Booking comps replace these once
// the integration ships.
export default function STRCompsSection({ str_comps }) {
  const isDemo = !!str_comps.is_synthetic;
  return (
    <Section testId="invest-section-comps">
      <SectionHeader
        kicker="STR Comparables"
        title="Comparable inventory."
        sub={`Five comparable STR assets within 3 km · ${str_comps.market_label}.`}
      />

      {isDemo && (
        <div
          className="flex items-start gap-3 px-5 py-4 mb-5"
          style={{
            background: 'rgba(196,167,137,0.06)',
            border: '1px solid rgba(196,167,137,0.30)',
            borderRadius: 4,
          }}
          data-testid="comps-demo-banner"
        >
          <AlertTriangle size={14} strokeWidth={1.6} style={{ color: '#B8956A', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div
              className="font-mono-tight uppercase"
              style={{ color: '#B8956A', fontSize: 10, letterSpacing: '0.20em', marginBottom: 4 }}
            >
              Demo Comparables · Market Support · Limited
            </div>
            <div
              className="text-[12.5px] leading-relaxed"
              style={{ color: 'var(--inv-text-secondary)' }}
            >
              {str_comps.source_note || 'Synthesised from Propul8 market model. Real Airbnb / Booking / Spitogatos comps arrive with our direct API integration.'}
            </div>
          </div>
        </div>
      )}

      <div className="inv-card inv-card--elevated p-0" data-testid="comps-table">
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Source</th>
              <th>Distance</th>
              <th>Occupancy</th>
              <th>ADR</th>
              <th>Monthly Revenue</th>
              <th>Match</th>
            </tr>
          </thead>
          <tbody>
            {str_comps.comps.map((c, i) => (
              <tr key={i} data-testid={`comp-row-${i}`}>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="inv-display text-base">{c.name}</span>
                    {isDemo && (
                      <span
                        className="font-mono-tight uppercase"
                        style={{
                          color: '#B8956A',
                          background: 'rgba(196,167,137,0.10)',
                          border: '1px solid rgba(196,167,137,0.30)',
                          borderRadius: 1,
                          padding: '1px 5px',
                          fontSize: 8.5,
                          letterSpacing: '0.16em',
                        }}
                        data-testid={`comp-row-${i}-demo-badge`}
                      >
                        Demo
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span style={{ color: 'var(--inv-text-muted)', fontSize: 11 }}>
                    {isDemo ? 'Propul8 market model' : (c.source || 'Listing')}
                  </span>
                </td>
                <td><span className="inv-num">{c.distance_km} km</span></td>
                <td><span className="inv-num">{c.occupancy_pct}%</span></td>
                <td><span className="inv-num">€{c.adr_eur}</span></td>
                <td><span className="inv-num">€{c.monthly_rev_eur.toLocaleString()}</span></td>
                <td>
                  <span
                    className="font-mono-tight uppercase"
                    style={{
                      color: c.design_quality === 'Editorial' ? '#B8956A' : 'var(--inv-text-secondary)',
                      fontSize: 10,
                      letterSpacing: '0.14em',
                    }}
                  >
                    {isDemo ? 'Medium' : (c.match || 'Strong')}
                  </span>
                </td>
              </tr>
            ))}
            <tr style={{ background: 'rgba(125,191,143,0.06)' }} data-testid="comp-row-vela">
              <td>
                <span
                  className="inv-display text-base font-medium"
                  style={{ color: 'var(--inv-signal-up)' }}
                >
                  Projected after Propul8 optimization
                </span>
              </td>
              <td>
                <span style={{ color: 'var(--inv-signal-up)', fontSize: 11 }}>Propul8 model</span>
              </td>
              <td><span style={{ color: 'var(--inv-text-muted)' }}>—</span></td>
              <td>
                <span className="inv-num font-medium" style={{ color: 'var(--inv-signal-up)' }}>
                  {str_comps.post_vela.projected_occupancy_pct}%
                </span>
              </td>
              <td>
                <span className="inv-num font-medium" style={{ color: 'var(--inv-signal-up)' }}>
                  €{str_comps.post_vela.projected_adr_eur}
                </span>
              </td>
              <td>
                <span className="inv-num font-medium" style={{ color: 'var(--inv-signal-up)' }}>
                  €{str_comps.post_vela.projected_monthly_rev_eur.toLocaleString()}
                </span>
              </td>
              <td>
                <span style={{ color: 'var(--inv-signal-up)' }}>—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Section>
  );
}
