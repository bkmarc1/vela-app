import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

function SystemBlock({ kicker, subtitle, tagline, bullets, cta, onCta, ctaTestId, testId }) {
  return (
    <div
      data-testid={testId}
      className="p-12 lg:p-16 flex flex-col"
      style={{ background: '#FAFAFA', minHeight: 360 }}
    >
      <span className="kicker-bronze">{kicker}</span>
      <h3
        className="font-display text-3xl md:text-4xl font-medium mt-4 leading-tight"
        style={{ color: '#09090B' }}
      >
        {subtitle}
      </h3>
      {tagline && (
        <p
          className="mt-5 max-w-[440px] text-[14px] leading-relaxed"
          style={{ color: '#52525B' }}
        >
          {tagline}
        </p>
      )}

      <ul className="mt-12 space-y-3.5">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-center gap-3 text-[15px]"
            style={{ color: '#09090B' }}
          >
            <span className="w-1 h-1" style={{ background: '#B8956A' }} />
            {b}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-14">
        <button onClick={onCta} className="vela-btn" data-testid={ctaTestId}>
          {cta}
          <ArrowUpRight size={13} />
        </button>
      </div>
    </div>
  );
}

export default function TwoSystems() {
  const navigate = useNavigate();
  return (
    <section
      className="border-b"
      style={{ borderColor: 'rgba(9,9,11,0.08)' }}
      data-testid="landing-what-is"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-32 lg:py-40">
        <div className="text-center mb-20">
          <span className="kicker-bronze">Architecture</span>
          <h2 className="font-display text-3xl md:text-5xl font-medium mt-5 leading-[1.04] max-w-[640px] mx-auto">
            Two Intelligence Engines.<br />
            <span style={{ color: '#B8956A' }}>One Operating System.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-px" style={{ background: 'rgba(184,149,106,0.16)' }}>
          <SystemBlock
            testId="landing-engine-invest"
            kicker="Propul8 INVEST"
            subtitle="Acquisition Intelligence"
            tagline="Analyze hospitality acquisitions using AI-powered investment intelligence."
            bullets={['True Net ROI', 'Offer Intelligence', 'STR Comparables', 'Transformation Upside']}
            cta="Analyze Acquisition"
            ctaTestId="landing-engine-invest-cta"
            onCta={() => navigate('/invest')}
          />
          <SystemBlock
            testId="landing-engine-operate"
            kicker="Propul8 OPERATE"
            subtitle="Asset Intelligence"
            tagline="Optimize existing hospitality assets through AI-powered operational intelligence."
            bullets={['Revenue Intelligence', 'Listing Optimization', 'Redesign Engine', 'Portfolio Operations']}
            cta="Optimize Existing Asset"
            ctaTestId="landing-engine-operate-cta"
            onCta={() => navigate('/operate')}
          />
        </div>
      </div>
    </section>
  );
}
