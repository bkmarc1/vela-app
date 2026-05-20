import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowUpRight, Sparkles, ArrowRight, Upload, FileText, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PREVIEW_PHASES = [
  'Propul8 is reading the listing',
  'Analyzing acquisition fundamentals',
  'Scanning nearby comparables',
  'Estimating realistic yield',
  'Calculating ideal entry price',
];

// ──────────────────────────────────────────────────────────────────────────
// Propul8 INVEST — Acquisition entry page.
// Mirrors /operate's minimalism. Just: hero kicker + headline + URL paste +
// manual-entry fallback. NO demo content, NO marketing strip, NO clutter.
// ──────────────────────────────────────────────────────────────────────────

export default function InvestLanding() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Live Preview Mode — silently ingest in the background as user pastes.
  // Progressive phase ticks, then a "ready" state once preview cache is warm.
  const [previewState, setPreviewState] = useState({ stage: 'idle', phaseIdx: 0, data: null, draftId: null });
  const debounceRef = useRef(null);
  const phaseTimerRef = useRef(null);

  // Reset preview when URL is cleared.
  useEffect(() => {
    if (!url || url.length < 12) {
      setPreviewState({ stage: 'idle', phaseIdx: 0, data: null, draftId: null });
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
      return undefined;
    }
    // Debounce — fire silent ingest 1.2s after last keystroke.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = url.trim();
      if (!trimmed.startsWith('http')) return;
      setPreviewState({ stage: 'analyzing', phaseIdx: 0, data: null, draftId: null });
      // Phase ticker — advance through the 5 perceived-intelligence phases.
      let i = 0;
      phaseTimerRef.current = setInterval(() => {
        i = Math.min(i + 1, PREVIEW_PHASES.length - 1);
        setPreviewState((p) => ({ ...p, phaseIdx: i }));
      }, 700);
      // Hard stop after 28s — slow portals (E&V) can take >12s to scrape.
      // Promise.race ensures the UI never stays stuck in 'analyzing' forever.
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('preview-timeout')), 28000));
      Promise.race([
        axios.post(`${API}/invest/ingest`, { url: trimmed }),
        timeout,
      ])
        .then((r) => {
          if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
          setPreviewState({ stage: 'ready', phaseIdx: PREVIEW_PHASES.length - 1, data: r.data, draftId: null });
        })
        .catch(() => {
          if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
          setPreviewState((p) => ({ ...p, stage: 'partial', phaseIdx: PREVIEW_PHASES.length - 1 }));
        });
    }, 1200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    };
  }, [url]);

  const handleAnalyze = async () => {
    const trimmed = (url || '').trim();
    if (!trimmed.startsWith('http')) {
      toast.error('Paste a complete listing URL (https://…)');
      return;
    }
    setLoading(true);
    try {
      // Use cached live-preview data if it's already warmed up.
      const d = previewState.data || (await axios.post(`${API}/invest/ingest`, { url: trimmed })).data;
      const draft = await axios.post(`${API}/invest/draft`, {
        url:               d.url,
        title:             d.title,
        city:              d.city,
        property_type:     d.property_type,
        asking_price_eur:  d.asking_price_eur,
        m2:                d.m2,
        rooms:             d.rooms,
        bathrooms:         d.bathrooms,
        floor:             d.floor,
        energy_class:      d.energy_class,
        parking:           d.parking,
        renovation_state:  d.renovation_state,
        listing_source:    d.listing_source,
        images:            d.images,
        raw_excerpt:       d.raw_excerpt,
        provenance:        d._confidence,
      });
      navigate(`/invest/asset/${draft.data.draft_id}`);
    } catch (e) {
      try {
        const draft = await axios.post(`${API}/invest/draft`, { url: trimmed });
        toast.message('Partial extraction — opening Manual Assisted Analysis™.', {
          description: 'Complete the missing fields to continue institutional analysis.',
        });
        navigate(`/invest/asset/${draft.data.draft_id}`);
      } catch (_) {
        toast.error('Could not start an investor session — please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── PDF brochure upload — for off-plan / developer projects ─────────
  const [brochureFile,  setBrochureFile]    = useState(null);
  const [brochureBusy,  setBrochureBusy]    = useState(false);
  const fileInputRef = useRef(null);

  const handleBrochureSelected = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Brochures must be PDF files.');
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error('Brochure too large — keep under 20 MB.');
      return;
    }
    setBrochureFile(f);
  };

  const handleBrochureAnalyze = async () => {
    if (!brochureFile) return;
    setBrochureBusy(true);
    try {
      // Convert to base64
      const b64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',', 2)[1]);
        reader.onerror = reject;
        reader.readAsDataURL(brochureFile);
      });
      const r = await axios.post(`${API}/invest/parse-brochure`, {
        file_base64: b64,
      }, { timeout: 60000 });
      // Persist as a draft so the InvestDashboard can hydrate it identically.
      const draft = await axios.post(`${API}/invest/draft`, {
        ...r.data,
        url: r.data.url || `brochure:${brochureFile.name}`,
      });
      const offPlanLabel = r.data.is_off_plan === true
        ? 'Off-Plan'
        : r.data.is_off_plan === false
          ? 'Ready'
          : 'Project';
      toast.success(`${offPlanLabel} project parsed · opening analysis…`, {
        description: r.data.project_name || r.data.title,
      });
      navigate(`/invest/asset/${draft.data.draft_id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not parse this brochure — try a different PDF.');
    } finally {
      setBrochureBusy(false);
    }
  };

  return (
    <div className="vela-invest" data-testid="invest-landing">
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 inv-grid opacity-[0.40]"
          aria-hidden
        />
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background:
              'radial-gradient(60% 50% at 80% 35%, rgba(196,167,137,0.10), transparent 60%)',
          }}
        />

        <div className="relative max-w-[920px] mx-auto px-6 md:px-12 pt-32 pb-40 lg:pt-40 lg:pb-48">
          <span className="inv-kicker-bronze" data-testid="invest-kicker">
            Propul8 · Acquisition Intelligence
          </span>

          <h1
            className="inv-display font-medium leading-[0.96] tracking-tight mt-7"
            style={{ fontSize: 'clamp(40px, 5.4vw, 80px)' }}
            data-testid="invest-hero-headline"
          >
            Analyze Acquisition.
          </h1>

          <p
            className="mt-8 max-w-[560px] text-[15px] leading-relaxed"
            style={{ color: 'var(--inv-text-secondary)' }}
            data-testid="invest-hero-subtitle"
          >
            Paste a listing. Propul8 checks the asset.
          </p>

          {/* Paste card — institutional minimalism */}
          <div
            className="mt-12 inv-card inv-card--elevated p-6 md:p-7"
            data-testid="invest-paste-card"
          >
            <div
              className="flex items-center gap-3 inv-card p-2 pl-4"
              style={{ background: 'var(--inv-bg-deep)' }}
            >
              <span className="inv-kicker">URL</span>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                placeholder="Paste listing URL"
                disabled={loading}
                className="inv-input flex-1 border-0 px-2"
                style={{ borderColor: 'transparent' }}
                data-testid="invest-url-input"
              />
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="inv-btn"
                data-testid="invest-analyze-btn"
              >
                {loading ? (
                  <><Sparkles size={13} className="animate-pulse" /> Analyzing…</>
                ) : previewState.stage === 'ready' ? (
                  <>Open Decision <ArrowUpRight size={13} /></>
                ) : (
                  <>Analyze Property <ArrowUpRight size={13} /></>
                )}
              </button>
            </div>

            {/* Live Preview Engine — silent micro-progress */}
            {previewState.stage !== 'idle' && (
              <div
                className="mt-5 pt-5"
                style={{ borderTop: '1px solid var(--inv-border)' }}
                data-testid="invest-live-preview"
              >
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <span
                    className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase"
                    style={{ color: 'var(--inv-accent-bronze)' }}
                  >
                    {previewState.stage === 'ready'
                      ? '● Live preview ready'
                      : previewState.stage === 'partial'
                        ? '● Partial extraction'
                        : '● Live preview engine'}
                  </span>
                  {previewState.stage === 'ready' && previewState.data && (
                    <span
                      className="font-mono-tight text-[10px]"
                      style={{ color: 'var(--inv-text-muted)' }}
                    >
                      {previewState.data.title?.slice(0, 38) || 'Listing parsed'}
                    </span>
                  )}
                </div>
                <ul className="space-y-1.5">
                  {PREVIEW_PHASES.map((p, i) => {
                    const isDone = previewState.stage === 'ready'
                      ? true
                      : previewState.stage === 'partial'
                        ? i <= previewState.phaseIdx
                        : i < previewState.phaseIdx;
                    const isActive = previewState.stage === 'analyzing' && i === previewState.phaseIdx;
                    return (
                      <li
                        key={p}
                        className="flex items-baseline gap-3 text-[12px]"
                        style={{
                          color: isDone
                            ? 'var(--inv-text-secondary)'
                            : isActive
                              ? 'var(--inv-text-primary)'
                              : 'var(--inv-text-muted)',
                          opacity: !isDone && !isActive ? 0.4 : 1,
                        }}
                        data-testid={`invest-preview-phase-${i}`}
                      >
                        <span style={{ minWidth: 14, color: isDone ? 'var(--inv-signal-up)' : 'var(--inv-text-muted)' }}>
                          {isDone ? <Check size={11} strokeWidth={2.4} /> : '·'}
                        </span>
                        <span className="font-mono-tight">
                          {p}{isActive ? '…' : ''}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div
              className="mt-5 pt-5"
              style={{ borderTop: '1px solid var(--inv-border)' }}
              data-testid="invest-brochure-section"
            >
              <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                <div>
                  <span
                    className="font-mono-tight text-[10px] tracking-[0.22em] uppercase"
                    style={{ color: 'var(--inv-accent-bronze)' }}
                  >
                    Or upload a developer brochure
                  </span>
                  <p className="mt-1 text-[12px]" style={{ color: 'var(--inv-text-muted)' }}>
                    PDF · we auto-detect Off-Plan vs Ready and benchmark against developments.
                  </p>
                </div>
                <span
                  className="font-mono-tight text-[9.5px] tracking-[0.18em] uppercase px-2 py-0.5"
                  style={{
                    color: 'var(--inv-accent-bronze)',
                    border: '1px solid rgba(184,149,106,0.30)',
                    borderRadius: 999,
                  }}
                >
                  Off-Plan · Ready
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleBrochureSelected}
                className="hidden"
                data-testid="invest-brochure-input"
              />

              {!brochureFile ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={brochureBusy}
                  className="w-full flex items-center justify-center gap-3 py-7 transition-all"
                  style={{
                    background: 'transparent',
                    border: '1.5px dashed var(--inv-border)',
                    borderRadius: 3,
                    color: 'var(--inv-text-secondary)',
                    fontFamily: 'Inter, sans-serif',
                    cursor: 'pointer',
                  }}
                  data-testid="invest-brochure-drop"
                >
                  <Upload size={15} strokeWidth={1.7} style={{ color: 'var(--inv-accent-bronze)' }} />
                  <span className="text-[13px]">Click to upload brochure PDF</span>
                  <span className="font-mono-tight text-[10px] tracking-[0.15em] uppercase"
                    style={{ color: 'var(--inv-text-muted)' }}>
                    PDF · up to 20MB
                  </span>
                </button>
              ) : (
                <div
                  className="flex items-center gap-3 p-4"
                  style={{
                    background: 'var(--inv-bg-deep, #FAFAFA)',
                    border: '1px solid var(--inv-border)',
                    borderRadius: 3,
                  }}
                  data-testid="invest-brochure-staged"
                >
                  <FileText size={16} strokeWidth={1.6} style={{ color: 'var(--inv-accent-bronze)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] truncate" style={{ color: 'var(--inv-text-primary)' }}>
                      {brochureFile.name}
                    </div>
                    <div className="font-mono-tight text-[10.5px] mt-0.5" style={{ color: 'var(--inv-text-muted)' }}>
                      {(brochureFile.size / 1024 / 1024).toFixed(1)} MB · PDF
                    </div>
                  </div>
                  <button
                    onClick={() => setBrochureFile(null)}
                    className="p-1.5"
                    style={{ color: 'var(--inv-text-muted)' }}
                    data-testid="invest-brochure-clear"
                    aria-label="Remove brochure"
                  >
                    <X size={14} />
                  </button>
                  <button
                    onClick={handleBrochureAnalyze}
                    disabled={brochureBusy}
                    className="inv-btn"
                    data-testid="invest-brochure-analyze-btn"
                  >
                    {brochureBusy ? (
                      <><Sparkles size={12} className="animate-pulse" /> Parsing…</>
                    ) : (
                      <>Analyze Brochure <ArrowRight size={12} /></>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Trust line */}
          <p
            className="mt-8 text-[12px] font-mono-tight max-w-[560px]"
            style={{ color: 'var(--inv-text-muted)' }}
            data-testid="invest-trust-line"
          >
            Propul8 never calculates from unverified data. Every field shows its data quality —
            low-quality fields require confirmation before analysis runs.
          </p>

          {/* SMALL Live Demo button (replaces the previous giant demo card) */}
          <div
            className="mt-10 flex items-center justify-center"
            data-testid="invest-demo-section"
          >
            <button
              type="button"
              onClick={() => navigate('/invest/asset/demo')}
              className="inline-flex items-center gap-2 px-5 py-2.5 transition-all"
              style={{
                background: 'transparent',
                color: 'var(--inv-accent-bronze)',
                border: '1px solid rgba(184,149,106,0.25)',
                borderRadius: 999,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                fontSize: 12.5,
                cursor: 'pointer',
              }}
              data-testid="invest-demo-run-btn"
            >
              <Sparkles size={12} strokeWidth={1.6} />
              Try the demo
              <span className="font-mono-tight text-[10px] tracking-[0.15em] uppercase opacity-70">
                Koukaki · 3BR · €485K
              </span>
              <ArrowRight size={11} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
