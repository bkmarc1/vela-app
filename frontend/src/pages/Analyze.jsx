import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowUpRight, RefreshCw, Sparkles, Link2, Pencil } from 'lucide-react';
import api from '../lib/api';

const GOALS = [
  { id: 'higher_adr', label: 'Higher ADR' },
  { id: 'family', label: 'Family Positioning' },
  { id: 'luxury', label: 'Luxury Upgrade' },
  { id: 'occupancy', label: 'Occupancy Optimization' },
];

const INGEST_STAGES = [
  'Reading listing…',
  'Extracting hospitality intelligence…',
  'Filling missing values…',
];

const ANALYSIS_STAGES = [
  'Modelling asset score…',
  'Identifying yield opportunities…',
  'Composing transformation plan…',
];

export default function Analyze() {
  const navigate = useNavigate();
  const [step, setStep] = useState('url'); // 'url' | 'review' | 'running'
  const [url, setUrl] = useState('');
  const [nightlyRate, setNightlyRate] = useState('');
  const [goal, setGoal] = useState(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingestStage, setIngestStage] = useState(0);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Tick the ingestion progress indicator
  useEffect(() => {
    if (!ingesting) return;
    setIngestStage(0);
    const id = setInterval(
      () => setIngestStage((i) => (i < INGEST_STAGES.length - 1 ? i + 1 : i)),
      1300
    );
    return () => clearInterval(id);
  }, [ingesting]);

  useEffect(() => {
    if (!submitting) return;
    setAnalysisStage(0);
    const id = setInterval(
      () => setAnalysisStage((i) => (i < ANALYSIS_STAGES.length - 1 ? i + 1 : i)),
      1700
    );
    return () => clearInterval(id);
  }, [submitting]);

  async function ingest() {
    setError(null);
    if (!url.trim().startsWith('http')) {
      toast.error('Paste a full https:// listing link.');
      return;
    }
    setIngesting(true);
    try {
      const body = { url: url.trim() };
      if (nightlyRate) body.nightly_rate = Number(nightlyRate);
      if (goal) body.goal = goal;
      const res = await api.post('/ingest/listing-url', body);
      setProfile(res.data);
      setStep('review');
    } catch (e) {
      console.error(e);
      setError('Could not read that link. Try another, or skip and enter manually below.');
    } finally {
      setIngesting(false);
    }
  }

  function updateField(k, v) {
    setProfile((p) => {
      const provenance = { ...(p?._provenance || {}), [k]: 'user' };
      return { ...p, [k]: v, _provenance: provenance };
    });
  }

  async function analyze() {
    setError(null);
    setSubmitting(true);
    try {
      const payload = { ...profile };
      delete payload._provenance;
      delete payload._source;
      delete payload._url;
      // Send listing_url so backend retains provenance
      payload.listing_url = profile?._url;
      ['sqm', 'bedrooms', 'bathrooms', 'sleeps', 'nightly_rate'].forEach((k) => {
        if (payload[k] !== undefined && payload[k] !== '' && payload[k] !== null) {
          payload[k] = Number(payload[k]);
        }
      });
      const created = await api.post('/properties', payload).then((r) => r.data);
      const pid = created.property_id;

      // Property-identity dedupe — backend returns _dedupe_match=true when
      // this exact listing URL has been analyzed before. Skip re-running and
      // hand the user the existing analysis with an inline banner.
      if (created._dedupe_match && created.analysis) {
        toast.success('Existing analysis loaded — no re-analysis needed.');
        navigate(`/dashboard/${pid}`, {
          state: {
            dedupeMatch: true,
            lastAnalyzedAt: created.analyzed_at,
            analysisVersion: created.analysis_version,
          },
        });
        return;
      }

      const analyzed = await api.post(`/properties/${pid}/analyze`).then((r) => r.data);
      if (analyzed?.previous_analysis) {
        toast.success('Analysis updated — diff available on the dashboard.');
      } else if (analyzed?.analysis?.is_fallback) {
        toast('Preliminary analysis ready — full intelligence will refresh shortly.');
      }
      navigate(`/dashboard/${pid}`);
    } catch (err) {
      console.error(err);
      setError('Analysis temporarily unavailable. Please retry in a few seconds.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-16 md:py-20" data-testid="analyze-page">
      <div className="kicker">New Analysis</div>
      <h1 className="font-display text-2xl md:text-[2.4rem] font-medium tracking-[-0.025em] mt-3 leading-[1.05]" data-testid="analyze-title">
        Paste a listing. Propul8 does the rest.
      </h1>
      <p className="text-[#52525B] mt-3 max-w-md leading-relaxed font-light text-[13px]">
        Drop an Airbnb, Booking, or VRBO link. We extract the hospitality intelligence,
        fill smart assumptions, and surface unrealized revenue in under a minute.
      </p>

      {step === 'url' && (
        <UrlStep
          url={url}
          setUrl={setUrl}
          nightlyRate={nightlyRate}
          setNightlyRate={setNightlyRate}
          goal={goal}
          setGoal={setGoal}
          onIngest={ingest}
          ingesting={ingesting}
          ingestStage={ingestStage}
          error={error}
        />
      )}

      {step === 'review' && profile && (
        <ReviewStep
          profile={profile}
          updateField={updateField}
          onAnalyze={analyze}
          onBack={() => setStep('url')}
          submitting={submitting}
          analysisStage={analysisStage}
          error={error}
        />
      )}
    </div>
  );
}

function UrlStep({ url, setUrl, nightlyRate, setNightlyRate, goal, setGoal, onIngest, ingesting, ingestStage, error }) {
  return (
    <div className="mt-12" data-testid="analyze-step-url">
      <div className="vela-card p-6 md:p-7">
        <div className="kicker mb-3 flex items-center gap-2">
          <Link2 size={11} strokeWidth={1.6} className="text-[#52525B]" />
          Listing Link
        </div>
        <input
          type="url"
          className="vela-input text-[15px]"
          placeholder="https://www.airbnb.com/rooms/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          data-testid="input-listing-url"
          disabled={ingesting}
          onKeyDown={(e) => { if (e.key === 'Enter') onIngest(); }}
        />

        <div className="mt-6 grid md:grid-cols-2 gap-5">
          <label className="block">
            <div className="kicker mb-2">Nightly rate · optional</div>
            <input
              type="number"
              className="vela-input"
              placeholder="€145"
              value={nightlyRate}
              onChange={(e) => setNightlyRate(e.target.value)}
              data-testid="input-nightly-rate"
              disabled={ingesting}
            />
          </label>
          <div>
            <div className="kicker mb-2">Goal · optional</div>
            <div className="flex flex-wrap gap-1.5" data-testid="goal-chips">
              {GOALS.map((g) => (
                <button
                  type="button"
                  key={g.id}
                  onClick={() => setGoal(goal === g.id ? null : g.id)}
                  data-testid={`goal-${g.id}`}
                  className={`text-[11px] font-mono-tight uppercase tracking-[0.14em] px-3 py-1.5 border transition-colors ${
                    goal === g.id
                      ? 'bg-[#09090B] text-[#FAFAFA] border-transparent'
                      : 'bg-transparent text-[#52525B] border-[#09090B]/[0.12] hover:border-white/[0.16] hover:text-white'
                  }`}
                  disabled={ingesting}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-7 pt-5 border-t border-[#09090B]/[0.08] flex items-center justify-between gap-4">
          <div className="text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.16em]">
            Hospitality intelligence · auto-extracted
          </div>
          <button
            type="button"
            onClick={onIngest}
            disabled={ingesting || !url}
            className="vela-btn"
            data-testid="extract-btn"
          >
            {ingesting ? 'Reading listing…' : 'Extract Listing'}
            <ArrowUpRight size={13} strokeWidth={1.6} />
          </button>
        </div>

        {ingesting && (
          <div className="mt-5 pt-4 border-t border-[#09090B]/[0.08] space-y-2" data-testid="ingest-loading">
            {INGEST_STAGES.map((s, i) => (
              <div key={s} className={`flex items-center gap-3 transition-opacity duration-500 ${i > ingestStage ? 'opacity-25' : 'opacity-100'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${i < ingestStage ? 'bg-[#09090B]' : i === ingestStage ? 'bg-[#09090B] animate-pulse' : 'bg-white/15'}`} />
                <span className={`text-[12px] font-light ${i === ingestStage ? 'text-[#09090B]' : 'text-[#52525B]'}`}>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-5 vela-card p-5 fade-up flex items-start justify-between gap-4" data-testid="ingest-error">
          <div>
            <div className="kicker">Listing unreachable</div>
            <p className="text-[12px] text-[#52525B] mt-2 leading-relaxed font-light max-w-md">{error}</p>
          </div>
          <button type="button" onClick={onIngest} className="vela-btn-ghost shrink-0">
            <RefreshCw size={13} strokeWidth={1.6} /> Retry
          </button>
        </div>
      )}
    </div>
  );
}

const PROVENANCE_LABEL = {
  scraped: 'Extracted from listing',
  inferred: 'Estimated by Propul8',
  user: 'User edited',
};

const PROVENANCE_DOT = {
  scraped: 'bg-[#B8956A]',
  inferred: 'bg-[#52525B]',
  user: 'bg-[#09090B]',
};

function ReviewStep({ profile, updateField, onAnalyze, onBack, submitting, analysisStage, error }) {
  // Real LLM-vision read of the listing's hero image. Fires once on mount.
  const [visionRead, setVisionRead] = useState(null);
  const [visionState, setVisionState] = useState('idle'); // idle | loading | ready | error
  const heroImg = profile?.images?.[0];
  useEffect(() => {
    if (!heroImg) return;
    let cancelled = false;
    setVisionState('loading');
    (async () => {
      try {
        const res = await api.post('/visual-analysis', {
          image_url: heroImg,
          context: { city: profile?.city, property_type: profile?.property_type },
        });
        if (!cancelled) {
          setVisionRead(res.data);
          setVisionState('ready');
        }
      } catch (e) {
        if (!cancelled) setVisionState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [heroImg, profile?.city, profile?.property_type]);
  const fields = [
    { key: 'name', label: 'Property name' },
    { key: 'city', label: 'City / Market' },
    { key: 'property_type', label: 'Property type' },
    { key: 'sleeps', label: 'Sleeps', type: 'number' },
    { key: 'bedrooms', label: 'Bedrooms', type: 'number' },
    { key: 'bathrooms', label: 'Bathrooms', type: 'number' },
    { key: 'sqm', label: 'Square meters', type: 'number' },
    { key: 'nightly_rate', label: 'Nightly rate (€)', type: 'number' },
  ];
  return (
    <div className="mt-10" data-testid="analyze-step-review">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 text-[10px] font-mono-tight uppercase tracking-[0.16em] text-[#52525B]">
          <Sparkles size={11} strokeWidth={1.6} className="text-[#B8956A]" />
          {profile._source === 'scraped'
            ? 'Listing parsed · review and edit any field'
            : 'Listing not directly accessible · review smart assumptions'}
        </div>
        <button onClick={onBack} className="text-[10px] font-mono-tight uppercase tracking-[0.16em] text-[#52525B] hover:text-white">
          ← Different link
        </button>
      </div>

      <div className="vela-card p-6 md:p-7">
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
          {fields.map((f) => {
            const prov = profile?._provenance?.[f.key] || (profile?.[f.key] ? 'inferred' : 'inferred');
            return (
              <label key={f.key} className="block" data-testid={`review-field-${f.key}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="kicker">{f.label}</div>
                  <span className="text-[9px] font-mono-tight uppercase tracking-[0.14em] text-[#52525B] flex items-center gap-1.5" data-testid={`prov-${f.key}`}>
                    <span className={`w-1 h-1 rounded-full ${PROVENANCE_DOT[prov]}`} />
                    {PROVENANCE_LABEL[prov]}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={f.type || 'text'}
                    className="vela-input"
                    value={profile?.[f.key] ?? ''}
                    onChange={(e) => updateField(f.key, f.type === 'number' ? (e.target.value ? Number(e.target.value) : '') : e.target.value)}
                    disabled={submitting}
                  />
                  <Pencil size={11} strokeWidth={1.6} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#09090B] pointer-events-none" />
                </div>
              </label>
            );
          })}
        </div>

        {(profile.design_language || profile.listing_weakness) && (
          <div className="mt-5 pt-5 border-t border-[#09090B]/[0.08] grid md:grid-cols-2 gap-5">
            {profile.design_language && (
              <div>
                <div className="kicker mb-1.5">Design Language</div>
                <div className="text-[12px] text-[#09090B] leading-relaxed font-light">{profile.design_language}</div>
              </div>
            )}
            {profile.listing_weakness && (
              <div>
                <div className="kicker mb-1.5">Sharpest Improvement Vector</div>
                <div className="text-[12px] text-[#B8956A] font-mono-tight tracking-tight leading-relaxed">{profile.listing_weakness}</div>
              </div>
            )}
          </div>
        )}

        {Array.isArray(profile.images) && profile.images.length > 0 && (
          <div className="mt-5 pt-5 border-t border-[#B8956A]/[0.08]" data-testid="ingest-gallery">
            <div className="flex items-end justify-between mb-3 gap-3">
              <div>
                <div className="kicker">Imported Imagery</div>
                <div className="text-[11px] text-[#52525B] mt-1 font-light">
                  {profile.images.length} frame{profile.images.length === 1 ? '' : 's'} extracted from the listing
                </div>
              </div>
              {profile.visual_analysis && (
                <div className="text-right">
                  <div className="kicker-bronze">Visual Quality</div>
                  <div className="font-mono-tight text-[#B8956A] text-[18px] mt-1 tracking-[-0.04em]" data-testid="visual-quality-score">
                    {profile.visual_analysis.overall_score}<span className="text-[#52525B] text-[12px]">/100</span>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
              {profile.images.slice(0, 6).map((src, i) => (
                <div
                  key={src}
                  data-testid={`ingest-photo-${i}`}
                  className="relative aspect-square overflow-hidden border border-[#B8956A]/[0.08]"
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 font-mono-tight text-[8px] uppercase tracking-[0.18em] bg-[#FAFAFA]/75 backdrop-blur-xl px-1.5 py-0.5 text-[#B8956A]">
                      Hero
                    </span>
                  )}
                </div>
              ))}
            </div>
            {profile.visual_analysis && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-px bg-[#B8956A]/[0.07] border border-[#B8956A]/[0.07]">
                <VisTile label="Photo Volume" value={`${profile.visual_analysis.photo_volume_score}/100`} />
                <VisTile label="Aesthetic Consistency" value={`${profile.visual_analysis.consistency_score}/100`} />
                <VisTile label="Thumbnail Strength" value={`${profile.visual_analysis.thumbnail_strength}/100`} />
                <VisTile label="Style" value={profile.visual_analysis.hospitality_style} />
              </div>
            )}
            {profile.visual_analysis?.notes?.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {profile.visual_analysis.notes.map((n) => (
                  <li key={n} className="insight-snippet" data-testid="visual-note">{n}</li>
                ))}
              </ul>
            )}

            {/* Real LLM-vision read of the hero image (Claude Sonnet 4.5) */}
            {(visionState !== 'idle') && (
              <div className="mt-5 pt-5 border-t border-[#B8956A]/[0.08]" data-testid="vision-panel">
                <div className="flex items-end justify-between mb-3 gap-3">
                  <div>
                    <div className="kicker-bronze">Vision Read · Hero Image</div>
                    <div className="text-[11px] text-[#52525B] mt-1 font-light">
                      Claude Sonnet 4.5 vision · hospitality archetype + booking psychology
                    </div>
                  </div>
                  {visionState === 'ready' && visionRead?.overall_score && (
                    <div className="text-right">
                      <div className="kicker-bronze">Propul8 Visual™</div>
                      <div className="font-mono-tight text-[#B8956A] text-[18px] mt-1 tracking-[-0.04em]" data-testid="vela-visual-score">
                        {visionRead.overall_score}<span className="text-[#52525B] text-[12px]">/100</span>
                      </div>
                    </div>
                  )}
                </div>
                {visionState === 'loading' && (
                  <div className="text-[11px] font-mono-tight uppercase tracking-[0.18em] text-[#52525B] flex items-center gap-2" data-testid="vision-loading">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B8956A] animate-pulse" />
                    Reading hero image…
                  </div>
                )}
                {visionState === 'error' && (
                  <div className="text-[11px] text-[#52525B] font-light" data-testid="vision-error">
                    Vision read unavailable — deterministic analysis remains valid.
                  </div>
                )}
                {visionState === 'ready' && visionRead && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-[#B8956A]/[0.07] border border-[#B8956A]/[0.07]">
                      <VisTile label="Luxury Perception" value={`${visionRead.luxury_perception ?? '—'}/100`} />
                      <VisTile label="Warmth" value={`${visionRead.warmth ?? '—'}/100`} />
                      <VisTile label="Lighting Quality" value={`${visionRead.lighting_quality ?? '—'}/100`} />
                      <VisTile label="Design Consistency" value={`${visionRead.design_consistency ?? '—'}/100`} />
                      <VisTile label="Spatial Optimization" value={`${visionRead.spatial_optimization ?? '—'}/100`} />
                      <VisTile label="Click-Through" value={`${visionRead.click_through_potential ?? '—'}/100`} />
                    </div>
                    {visionRead.hospitality_archetype && (
                      <div className="mt-3 text-[11px] text-[#B8956A] font-mono-tight uppercase tracking-[0.18em]" data-testid="vision-archetype">
                        Archetype · {visionRead.hospitality_archetype}
                      </div>
                    )}
                    {visionRead.visual_atmosphere && (
                      <p className="mt-2 text-[12px] text-[#09090B] font-light leading-relaxed">
                        {visionRead.visual_atmosphere}
                      </p>
                    )}
                    {Array.isArray(visionRead.flags) && visionRead.flags.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {visionRead.flags.map((f) => (
                          <li key={f} className="insight-snippet" data-testid="vision-flag">{f}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {Array.isArray(profile.amenities) && profile.amenities.length > 0 && (
          <div className="mt-5 pt-5 border-t border-[#09090B]/[0.08]">
            <div className="kicker mb-2">Amenities</div>
            <div className="flex flex-wrap gap-1.5">
              {profile.amenities.map((a) => (
                <span key={a} className="text-[10px] font-mono-tight uppercase tracking-[0.14em] text-[#52525B] border border-[#09090B]/[0.10] px-2 py-1">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-7 pt-5 border-t border-[#09090B]/[0.08] flex items-center justify-between gap-4">
          <div className="text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.16em]">
            Operational assumptions filled by Propul8 · ADR / occupancy / costs
          </div>
          <button
            onClick={onAnalyze}
            disabled={submitting}
            className="vela-btn"
            data-testid="analyze-btn"
          >
            {submitting ? 'Analyzing…' : 'Generate Asset Intelligence'}
            <ArrowUpRight size={13} strokeWidth={1.6} />
          </button>
        </div>

        {submitting && (
          <div className="mt-5 pt-4 border-t border-[#09090B]/[0.08] space-y-2" data-testid="analysis-loading">
            {ANALYSIS_STAGES.map((s, i) => (
              <div key={s} className={`flex items-center gap-3 transition-opacity duration-500 ${i > analysisStage ? 'opacity-25' : 'opacity-100'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${i < analysisStage ? 'bg-[#09090B]' : i === analysisStage ? 'bg-[#09090B] animate-pulse' : 'bg-white/15'}`} />
                <span className={`text-[12px] font-light ${i === analysisStage ? 'text-[#09090B]' : 'text-[#52525B]'}`}>{s}</span>
              </div>
            ))}
          </div>
        )}

        {error && !submitting && (
          <div className="mt-5 pt-5 border-t border-[#09090B]/[0.08] text-[12px] text-[#52525B] flex items-center justify-between gap-3" data-testid="analyze-error">
            <span>{error}</span>
            <button type="button" onClick={onAnalyze} className="vela-btn-ghost">
              <RefreshCw size={13} strokeWidth={1.6} /> Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


function VisTile({ label, value }) {
  return (
    <div className="bg-[#FAFAFA] p-3 md:p-4">
      <div className="kicker text-[9px]">{label}</div>
      <div className="font-mono-tight text-[12px] mt-1.5 tracking-[-0.02em] text-[#09090B]">
        {value}
      </div>
    </div>
  );
}
