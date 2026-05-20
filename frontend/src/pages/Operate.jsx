import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Sparkles, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

import { computeOperateAnalysis } from '../lib/operateIntelligence';

import OperateOpener        from '../components/operate/OperateOpener';
import OperateThinking      from '../components/operate/OperateThinking';
import ConfirmPropertyData  from '../components/shared/ConfirmPropertyData';
import OperateResult        from '../components/operate/result/OperateResult';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Demo input — Athens 3BR Apartment (matches user's brief spec).
const DEMO_INPUT = {
  asset_id: 'demo',
  url: 'https://www.airbnb.com/rooms/koukaki-3br-athens',
  title: 'Koukaki 3BR Apartment',
  city: 'Athens',
  neighborhood: 'Koukaki',
  country: 'Greece',
  property_type: 'Apartment',
  bedrooms: 3,
  bathrooms: 2,
  current_adr: 168,
  current_occupancy: 64,
  listing_source: 'Airbnb',
  images: [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
  ],
};

// Cinematic flow stages
const STAGE = {
  LANDING:   'landing',
  CONFIRM:   'confirm',
  OPENER:    'opener',
  THINKING:  'thinking',
  RESULT:    'result',
};

export default function Operate() {
  const navigate = useNavigate();
  const [stage, setStage] = useState(STAGE.LANDING);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzedInput, setAnalyzedInput] = useState(null);
  const [mode, setMode] = useState('live'); // 'live' (URL pasted) | 'demo' (demo button)

  const handleAnalyze = async () => {
    const trimmed = (url || '').trim();
    if (!trimmed.startsWith('http')) {
      toast.error('Paste a complete listing URL (https://…)');
      return;
    }
    setLoading(true);
    try {
      const r = await axios.post(`${API}/invest/ingest`, { url: trimmed });
      const data = r.data;
      const next = {
        asset_id: data.url || trimmed,
        url: trimmed,
        title: data.title || 'Imported listing',
        city: data.city || null,
        neighborhood: data.neighborhood || null,
        description: data.description || '',
        property_type: data.property_type || null,
        bedrooms: data.rooms || null,
        bathrooms: data.bathrooms || null,
        year_built: data.year_built || null,
        renovation_state: data.renovation_state || null,
        listing_source: data.listing_source || null,
        raw_excerpt: data.raw_excerpt || '',
        bot_blocked: data.bot_blocked || false,
        extraction_debug: data.extraction_debug || null,
        _confidence: data._confidence || {},
        images: data.images || [],
      };
      setAnalyzedInput(next);
      setMode('live');
      if (data.bot_blocked) {
        toast.warning('Source blocked the scraper — please confirm the property data manually.');
      }
      setStage(STAGE.CONFIRM);
    } catch (e) {
      toast.error('Could not parse listing — confirm the data manually.');
      setAnalyzedInput({
        asset_id: trimmed, url: trimmed, title: 'Imported listing',
        city: null, property_type: null, bedrooms: null,
        listing_source: null, _confidence: {},
      });
      setStage(STAGE.CONFIRM);
    } finally {
      setLoading(false);
    }
  };

  const showDemo = () => {
    setAnalyzedInput(DEMO_INPUT);
    setMode('demo');
    setStage(STAGE.THINKING);  // demo data is verified-by-design
  };

  const reset = () => {
    setAnalyzedInput(null);
    setStage(STAGE.LANDING);
    setUrl('');
  };

  const analysis = useMemo(
    () => analyzedInput ? computeOperateAnalysis(analyzedInput) : null,
    [analyzedInput],
  );

  // STAGE: CONFIRM
  if (stage === STAGE.CONFIRM && analyzedInput) {
    return (
      <ConfirmPropertyData
        input={analyzedInput}
        mode="operate"
        theme="light"
        onConfirm={(confirmed) => {
          setAnalyzedInput(confirmed);
          setStage(STAGE.THINKING);
        }}
        onBack={reset}
      />
    );
  }

  // STAGE: THINKING
  if (stage === STAGE.THINKING && analysis) {
    return (
      <OperateThinking
        onComplete={() => setStage(STAGE.OPENER)}
        mode={mode}
        city={analyzedInput?.city}
      />
    );
  }

  // STAGE: OPENER
  if (stage === STAGE.OPENER && analysis) {
    return (
      <OperateOpener
        analysis={analysis}
        onContinue={() => setStage(STAGE.RESULT)}
      />
    );
  }

  // STAGE: RESULT — minimal premium audit page
  if (stage === STAGE.RESULT && analysis) {
    return (
      <OperateResult
        analysis={analysis}
        input={analyzedInput}
        onReset={reset}
        asset_id={analyzedInput?.asset_id || 'demo'}
      />
    );
  }

  // STAGE: LANDING — One input, one CTA, one demo card.
  return (
    <div data-testid="operate-landing" style={{ background: '#FAFAFA', minHeight: '100vh' }}>
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.50]"
          aria-hidden
          style={{
            background:
              'radial-gradient(60% 50% at 80% 25%, rgba(184,149,106,0.06), transparent 65%)',
          }}
        />
        <div className="relative max-w-[1180px] mx-auto px-6 md:px-12 pt-28 pb-20 lg:pt-36 lg:pb-28">
          <span
            className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
            style={{ color: '#B8956A' }}
            data-testid="operate-kicker"
          >
            Propul8 · Asset Intelligence
          </span>
          <h1
            className="font-display font-medium mt-7 leading-[0.96] tracking-tight"
            style={{
              color: '#09090B',
              fontSize: 'clamp(44px, 6vw, 88px)',
              letterSpacing: '-0.025em',
              maxWidth: '880px',
            }}
            data-testid="operate-hero-headline"
          >
            Run Yield Audit.
          </h1>
          <p
            className="mt-7 max-w-[560px] text-[18.5px] leading-relaxed"
            style={{ color: '#52525B' }}
            data-testid="operate-hero-subtitle"
          >
            Paste your listing. Propul8 shows what to fix first.
          </p>

          {/* URL input */}
          <div className="mt-12 max-w-[680px]">
            <div
              className="flex items-center gap-3 p-2 pl-5"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: 3,
                boxShadow: '0 1px 2px rgba(9,9,11,0.03)',
              }}
            >
              <span
                className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase"
                style={{ color: '#52525B' }}
              >
                URL
              </span>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                placeholder="Paste Airbnb, Booking, or property listing URL"
                disabled={loading}
                className="flex-1 px-2 py-3 text-[15px] outline-none"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '-0.01em',
                  color: '#09090B',
                  background: 'transparent',
                }}
                data-testid="operate-url-input"
              />
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-3 text-[13px] transition-all"
                style={{
                  background: '#B8956A',
                  color: '#FFFFFF',
                  borderRadius: 4,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  letterSpacing: '-0.005em',
                  boxShadow: '0 1px 2px rgba(184,149,106,0.10)',
                }}
                data-testid="operate-analyze-btn"
              >
                {loading ? (
                  <><Sparkles size={13} className="animate-pulse" /> Analyzing…</>
                ) : (
                  <>Run Yield Audit <ArrowRight size={13} /></>
                )}
              </button>
            </div>
          </div>

          {/* Athens Demo Card */}
          <div className="mt-10 max-w-[680px]">
            <button
              onClick={showDemo}
              className="w-full flex items-center gap-5 p-5 transition-all text-left"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: 4,
                boxShadow: '0 1px 2px rgba(9,9,11,0.03)',
                cursor: 'pointer',
              }}
              data-testid="operate-demo-btn"
            >
              <img
                src={DEMO_INPUT.images[0]}
                alt="Athens demo"
                style={{
                  width: 96, height: 72, objectFit: 'cover', borderRadius: 4,
                }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="font-mono-tight text-[9.5px] tracking-[0.18em] uppercase px-2 py-0.5"
                    style={{
                      background: 'rgba(184,149,106,0.10)',
                      color: '#B8956A',
                      borderRadius: 999,
                      fontWeight: 600,
                    }}
                  >
                    Demo Data
                  </span>
                </div>
                <div className="font-display text-[17px]" style={{ color: '#09090B', fontWeight: 500, letterSpacing: '-0.015em' }}>
                  Try Athens Demo
                </div>
                <div className="mt-0.5 text-[12.5px]" style={{ color: '#52525B' }}>
                  Koukaki 3BR Apartment · 3 bedrooms · Airbnb
                </div>
              </div>
              <ArrowUpRight size={16} style={{ color: '#B8956A' }} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
