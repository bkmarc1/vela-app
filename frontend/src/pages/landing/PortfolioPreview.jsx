import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

function PreviewTile({ label, value, sub, accent }) {
  return (
    <div className="p-10 lg:p-12" style={{ background: '#FAFAFA' }}>
      <div
        className="font-mono-tight text-[9px] tracking-[0.22em] uppercase"
        style={{ color: '#52525B' }}
      >
        {label}
      </div>
      <div
        className="font-mono-tight font-medium mt-3"
        style={{
          fontSize: 'clamp(24px, 3.0vw, 36px)',
          color: accent ? '#B8956A' : '#09090B',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
      <div
        className="font-mono-tight text-[11px] mt-3"
        style={{ color: '#52525B' }}
      >
        {sub}
      </div>
    </div>
  );
}

export default function PortfolioPreview() {
  const navigate = useNavigate();
  return (
    <section
      className="border-b"
      style={{ borderColor: 'rgba(9,9,11,0.08)' }}
      data-testid="landing-portfolio-preview"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-32 lg:py-40">
        <div className="grid lg:grid-cols-12 gap-16 items-end">
          <div className="lg:col-span-4">
            <span className="kicker-bronze">Institutional Read</span>
            <h2 className="font-display text-3xl md:text-5xl font-medium mt-5 leading-[1.04]">
              Portfolio<br />
              <span style={{ color: '#B8956A' }}>at a glance.</span>
            </h2>
            <p className="mt-6 text-[14px] leading-relaxed" style={{ color: '#52525B' }}>
              Acquisition pipeline. Yield performance. Net cashflow. One screen.
            </p>
            <button
              onClick={() => navigate('/portfolio/demo')}
              className="vela-btn-ghost mt-10"
              data-testid="landing-portfolio-cta"
            >
              Open the demo portfolio
              <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 gap-px" style={{ background: 'rgba(184,149,106,0.16)' }}>
            <PreviewTile label="Assets Under Management" value="3" sub="2 acquisition · 1 operating" />
            <PreviewTile label="Average Net Yield"       value="9.8%" sub="vs 7.2% comp-set median" accent />
            <PreviewTile label="Unrealized Upside"       value="€48k/yr" sub="Across active assets" />
            <PreviewTile label="Smart Buy Discount"      value="–8.4%" sub="vs current asking" accent />
          </div>
        </div>
      </div>
    </section>
  );
}
