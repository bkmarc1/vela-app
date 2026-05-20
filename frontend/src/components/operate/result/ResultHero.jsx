// Propul8 · OPERATE — Result Property Hero (minimal, premium).
// Image + name + facts strip. Replaces dense terminal-style hero.

import { ExternalLink } from 'lucide-react';
import DataBadge from '../../shared/DataBadge';
import { buildOperateProvenance } from '../../../lib/dataProvenance';

const META_SEP = '·';

export default function ResultHero({ analysis, input }) {
  const snap = analysis.snapshot;
  const img = (input.images && input.images[0]) || null;
  const sourceLabel = input.listing_source
    || (input.url ? new URL(input.url).hostname.replace(/^www\./, '') : 'Demo listing');
  const prov = buildOperateProvenance(input || {});
  const sleeps = snap.capacity || (snap.bedrooms ? snap.bedrooms * 2 : null);

  return (
    <section
      className="border-b"
      style={{ background: '#FAFAFA', borderColor: '#E4E4E7' }}
      data-testid="operate-result-hero"
    >
      <div className="max-w-[1180px] mx-auto px-6 md:px-12 py-12 lg:py-16">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14">
          {/* LEFT — image */}
          <div className="lg:col-span-5">
            {img ? (
              <img
                src={img}
                alt={input.title || 'Property'}
                className="w-full object-cover"
                style={{
                  aspectRatio: '4 / 3',
                  borderRadius: 4,
                  boxShadow: '0 1px 2px rgba(9,9,11,0.03)',
                }}
                data-testid="operate-hero-image"
              />
            ) : (
              <div
                className="w-full flex items-center justify-center text-[12px]"
                style={{
                  aspectRatio: '4 / 3',
                  background: '#E4E4E7',
                  color: '#52525B',
                  borderRadius: 4,
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Image not available
              </div>
            )}
          </div>

          {/* RIGHT — content */}
          <div className="lg:col-span-7 flex flex-col">
            <span
              className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
              style={{ color: '#B8956A' }}
              data-testid="operate-hero-kicker"
            >
              {snap.location || 'Location'}
            </span>
            <h1
              className="font-display font-medium mt-4 leading-[1.05] tracking-tight"
              style={{
                color: '#09090B',
                fontSize: 'clamp(30px, 3.6vw, 46px)',
                letterSpacing: '-0.02em',
              }}
              data-testid="operate-hero-title"
            >
              {input.title || 'Imported listing'}
            </h1>

            {/* Meta strip */}
            <div
              className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13.5px]"
              style={{ color: '#52525B' }}
              data-testid="operate-hero-meta"
            >
              {snap.bedrooms && <span>{snap.bedrooms} bedroom{snap.bedrooms !== 1 ? 's' : ''}</span>}
              {snap.bedrooms && sleeps && <span>{META_SEP}</span>}
              {sleeps && <span>{sleeps} guests</span>}
              {snap.property_type && <span>{META_SEP}</span>}
              {snap.property_type && <span>{snap.property_type}</span>}
              <span>{META_SEP}</span>
              <span>{sourceLabel}</span>
            </div>

            {/* Data Quality + Source */}
            <div className="mt-6 flex items-center gap-4">
              <DataBadge
                provenance={prov.title || { status: 'Verified', source: 'Listing', confidence: 75 }}
                label="Data Quality"
                size="sm"
              />
              {input.url && (
                <a
                  href={input.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] transition-colors"
                  style={{ color: '#B8956A' }}
                  data-testid="operate-hero-source-link"
                >
                  View original listing
                  <ExternalLink size={11} strokeWidth={1.7} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
