import { OFFER_ROWS, TH_STYLE } from './_shared';

export default function OfferIntelligence() {
  return (
    <section
      className="border-b"
      style={{ borderColor: 'rgba(9,9,11,0.08)' }}
      data-testid="landing-offer"
    >
      <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-32 lg:py-40">
        <div className="mb-16">
          <span className="kicker-bronze">Offer Intelligence™</span>
          <h2 className="font-display text-3xl md:text-5xl font-medium mt-5 leading-[1.04] max-w-[680px]">
            Acquisition prices that<br />
            <span style={{ color: '#B8956A' }}>maximize hospitality yield.</span>
          </h2>
        </div>

        <div
          className="overflow-hidden"
          style={{ borderTop: '1px solid rgba(9,9,11,0.16)', borderBottom: '1px solid rgba(9,9,11,0.16)' }}
          data-testid="landing-offer-table"
        >
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(9,9,11,0.10)' }}>
                <th className="text-left py-5" style={TH_STYLE}>Strategy</th>
                <th className="text-left py-5" style={TH_STYLE}>Offer Price</th>
                <th className="text-left py-5" style={TH_STYLE}>Net Yield</th>
              </tr>
            </thead>
            <tbody>
              {OFFER_ROWS.map((r) => (
                <tr
                  key={r.label}
                  style={{
                    borderBottom: '1px solid rgba(9,9,11,0.06)',
                    background: r.highlight ? 'rgba(184,149,106,0.06)' : 'transparent',
                  }}
                  data-testid={`landing-offer-row-${r.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <td className="py-6">
                    <div className="flex items-center gap-3">
                      {r.highlight && (
                        <span
                          className="font-mono-tight text-[8.5px] tracking-[0.22em] uppercase px-2 py-1"
                          style={{ background: '#B8956A', color: '#FAFAFA', borderRadius: 1 }}
                        >
                          Best
                        </span>
                      )}
                      <span className="font-display text-lg" style={{ color: '#09090B' }}>
                        {r.label}
                      </span>
                    </div>
                  </td>
                  <td className="py-6 font-mono-tight text-2xl font-medium" style={{ color: '#09090B' }}>
                    {r.price}
                  </td>
                  <td
                    className="py-6 font-mono-tight text-2xl font-medium"
                    style={{ color: r.highlight ? '#B8956A' : '#09090B' }}
                  >
                    {r.yield}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p
          className="mt-10 text-[14px] leading-relaxed max-w-[620px]"
          style={{ color: '#52525B' }}
          data-testid="landing-offer-statement"
        >
          Propul8 identifies acquisition prices that maximize hospitality yield.
        </p>
      </div>
    </section>
  );
}
