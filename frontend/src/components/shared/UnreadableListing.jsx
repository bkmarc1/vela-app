import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, FileText, Upload, Edit3, RefreshCw, ArrowRight, Loader2, X } from 'lucide-react';

// Propul8 — Listing Unreadable Recovery Screen.
// Shown when the scraper detected an anti-bot block OR critical fields are
// missing (asking price + sqm + city + bedrooms) and Propul8 cannot honestly
// underwrite the asset.
//
// Replaces the silent "auto-fill Athens defaults" behaviour, which produced
// fake numbers that fooled users into thinking Propul8 had read the listing.
// Now we surface the problem clearly and give 4 honest recovery paths.
//
// Props:
//   url            — pasted listing URL (or null)
//   source         — listing portal name (Spitogatos / Airbnb / etc.)
//   debug          — backend extraction_debug payload
//   onRetry        — () => void  — re-run extraction with same URL
//   onManualEntry  — (input) => void — user submits manual fields
//   onPasteText    — (text)  => void — user pastes raw listing text
//   onParsedAi     — (parsed) => void — invoked when AI returns a parsed payload
//   apiBase        — base URL for backend (e.g. process.env.REACT_APP_BACKEND_URL)
//   theme          — 'dark' (invest) | 'light' (operate)

export default function UnreadableListing({
  url, source, debug,
  onRetry, onManualEntry, onPasteText, onParsedAi, apiBase, theme = 'light',
}) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // 'paste' | 'manual' | 'upload'
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [screenshots, setScreenshots] = useState([]); // array of {name, base64}
  const [note, setNote] = useState('');
  const [manual, setManual] = useState({
    asking_price_eur: '', m2: '', rooms: '', bathrooms: '',
    city: '', neighborhood: '', property_type: '', renovation_state: '',
    title: '',
  });

  // Unified light shell — Propul8 premium PropTech palette.
  const BG       = '#FAFAFA';
  const PANEL    = '#FFFFFF';
  const BORDER   = 'rgba(9,9,11,0.08)';
  const TEXT     = '#09090B';
  const TEXT_2   = '#52525B';
  const TEXT_M   = '#52525B';
  const INPUT_BG = '#FFFFFF';
  const CTA_BG   = '#B8956A';
  const CTA_TX   = '#FFFFFF';

  const submitManual = () => {
    const coerced = {
      asking_price_eur: manual.asking_price_eur ? Number(manual.asking_price_eur) : null,
      m2:               manual.m2 ? Number(manual.m2) : null,
      rooms:            manual.rooms ? Number(manual.rooms) : null,
      bathrooms:        manual.bathrooms ? Number(manual.bathrooms) : null,
      city:             manual.city || null,
      neighborhood:     manual.neighborhood || null,
      property_type:    manual.property_type || null,
      renovation_state: manual.renovation_state || null,
      title:            manual.title || null,
      url:              url || null,
      _confidence: Object.fromEntries(
        ['asking_price_eur', 'm2', 'rooms', 'bathrooms', 'city', 'neighborhood', 'property_type', 'renovation_state', 'title']
          .filter((k) => manual[k])
          .map((k) => [k, 'user_verified']),
      ),
      listing_source: source || null,
    };
    onManualEntry(coerced);
  };

  // Sends pasted listing text to /api/invest/parse-text. Claude Sonnet 4.5
  // returns a structured payload with `user_pasted_text` confidence flags.
  const submitText = async () => {
    if (!apiBase || text.trim().length < 40) return;
    setParsing(true);
    try {
      const r = await fetch(`${apiBase}/api/invest/parse-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_text: text, source_url: url || null }),
      });
      if (!r.ok) throw new Error(`parse-text ${r.status}`);
      const parsed = await r.json();
      if (onParsedAi) onParsedAi(parsed);
      else if (onPasteText) onPasteText(text);
    } catch (e) {
      // Fallback: pass raw text up to manual flow.
      if (onPasteText) onPasteText(text);
    } finally {
      setParsing(false);
    }
  };

  // Read selected screenshots as base64 strings (max 3).
  const handleFiles = async (files) => {
    const arr = Array.from(files || []).slice(0, 3 - screenshots.length);
    const reads = arr.map((f) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ name: f.name, base64: reader.result });
      reader.readAsDataURL(f);
    }));
    const newOnes = await Promise.all(reads);
    setScreenshots((prev) => [...prev, ...newOnes].slice(0, 3));
  };

  // Sends screenshots to /api/invest/parse-screenshot. Claude vision extracts
  // structured property facts.
  const submitScreenshots = async () => {
    if (!apiBase || screenshots.length === 0) return;
    setParsing(true);
    try {
      const r = await fetch(`${apiBase}/api/invest/parse-screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images_base64: screenshots.map((s) => s.base64),
          source_url: url || null,
          note: note || null,
        }),
      });
      if (!r.ok) throw new Error(`parse-screenshot ${r.status}`);
      const parsed = await r.json();
      if (onParsedAi) onParsedAi(parsed);
    } catch (e) {
      // No silent fake fallback — keep user on screen.
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT }} data-testid="listing-unreadable-screen">
      <div className="max-w-[920px] mx-auto px-6 md:px-12 py-16 lg:py-24">
        {/* Header */}
        <div className="flex items-start gap-4 mb-7">
          <div
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center"
            style={{
              background: 'rgba(160,82,74,0.10)',
              border: '1px solid rgba(160,82,74,0.35)',
              borderRadius: 4,
            }}
          >
            <AlertTriangle size={18} strokeWidth={1.7} style={{ color: '#B8956A' }} />
          </div>
          <div>
            <span
              className="font-mono-tight text-[10px] tracking-[0.24em] uppercase"
              style={{ color: '#B8956A' }}
              data-testid="unreadable-kicker"
            >
              Source Blocked
            </span>
            <h1
              className="font-display font-medium mt-2 leading-[1.05]"
              style={{ fontSize: 'clamp(28px, 3.4vw, 38px)', letterSpacing: '-0.02em' }}
              data-testid="unreadable-title"
            >
              Propul8 could not read this listing automatically.
            </h1>
            <p className="mt-4 text-[14.5px] leading-relaxed" style={{ color: TEXT_2, maxWidth: 580 }}>
              {source || 'The listing portal'} blocked our scraper. Rather than invent numbers,
              Propul8 needs the real data. Choose one of the four paths below.
            </p>
          </div>
        </div>

        {/* URL strip */}
        {url && (
          <div
            className="mb-8 px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
            style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12 }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase flex-shrink-0"
                style={{ color: TEXT_M }}
              >
                URL
              </span>
              <span
                className="font-mono-tight text-[12px] truncate"
                style={{ color: TEXT_2 }}
                data-testid="unreadable-url"
              >
                {url}
              </span>
            </div>
            {source && (
              <span
                className="font-mono-tight text-[9.5px] tracking-[0.18em] uppercase"
                style={{ color: TEXT_M }}
              >
                Source · {source}
              </span>
            )}
          </div>
        )}

        {/* 4 recovery paths */}
        {!mode && (
          <div className="grid sm:grid-cols-2 gap-3" data-testid="unreadable-paths">
            <PathCard
              icon={RefreshCw}
              label="Retry extraction"
              detail="Re-run our scraper. Some portals respond on a second pass."
              onClick={() => onRetry && onRetry()}
              testId="unreadable-path-retry"
              theme={theme}
            />
            <PathCard
              icon={FileText}
              label="Paste listing text"
              detail="Copy the description / price block. Propul8 parses what you paste."
              onClick={() => setMode('paste')}
              testId="unreadable-path-paste"
              theme={theme}
            />
            <PathCard
              icon={Upload}
              label="Upload screenshots"
              detail="Drop in 1–3 screenshots. Propul8 uses vision to read price + facts."
              onClick={() => setMode('upload')}
              testId="unreadable-path-upload"
              theme={theme}
            />
            <PathCard
              icon={Edit3}
              label="Enter manually"
              detail="Type the 4 critical fields. Takes 30 seconds. Most accurate."
              onClick={() => setMode('manual')}
              testId="unreadable-path-manual"
              theme={theme}
              primary
            />
          </div>
        )}

        {/* PASTE TEXT MODE */}
        {mode === 'paste' && (
          <div data-testid="unreadable-paste-form">
            <div
              className="font-mono-tight text-[10px] tracking-[0.22em] uppercase mb-2"
              style={{ color: TEXT_M }}
            >
              Paste listing text
            </div>
            <textarea
              rows={10}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the full listing — price, sqm, bedrooms, description, neighborhood, amenities…"
              className="w-full px-4 py-3 text-[13px] outline-none"
              style={{
                background: INPUT_BG,
                color: TEXT,
                border: `1px solid ${BORDER}`,
                borderRadius: 4,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
              data-testid="unreadable-paste-textarea"
            />
            <div className="mt-5 flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setMode(null)}
                className="px-5 py-3 text-[11px] tracking-[0.12em] uppercase"
                style={{
                  background: 'transparent', color: TEXT_2,
                  border: `1px solid ${BORDER}`, borderRadius: 4,
                  fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                }}
                data-testid="unreadable-paste-back"
              >
                Back
              </button>
              <button
                type="button"
                disabled={text.trim().length < 40 || parsing}
                onClick={submitText}
                className="inline-flex items-center gap-2 px-6 py-3 text-[11px] tracking-[0.12em] uppercase"
                style={{
                  background: text.trim().length < 40 || parsing ? 'rgba(156,143,119,0.30)' : CTA_BG,
                  color: text.trim().length < 40 || parsing ? TEXT_M : CTA_TX,
                  border: 'none', borderRadius: 4,
                  fontFamily: 'Inter, sans-serif',
                  cursor: text.trim().length < 40 || parsing ? 'not-allowed' : 'pointer',
                }}
                data-testid="unreadable-paste-submit"
              >
                {parsing ? <Loader2 size={12} className="animate-spin" /> : null}
                {parsing ? 'Parsing with AI…' : 'Parse listing'} {!parsing && <ArrowRight size={12} />}
              </button>
            </div>
          </div>
        )}

        {/* UPLOAD SCREENSHOTS MODE — Claude vision parses up to 3 images */}
        {mode === 'upload' && (
          <div data-testid="unreadable-upload-form">
            <div
              className="font-mono-tight text-[10px] tracking-[0.22em] uppercase mb-2"
              style={{ color: TEXT_M }}
            >
              Upload screenshots · max 3
            </div>
            <label
              htmlFor="propul8-screenshot-input"
              className="block px-5 py-7 text-center cursor-pointer transition-all"
              style={{
                background: INPUT_BG,
                color: TEXT_2,
                border: `1px dashed ${BORDER}`,
                borderRadius: 4,
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                letterSpacing: '0.06em',
              }}
              data-testid="unreadable-upload-dropzone"
            >
              <Upload size={16} strokeWidth={1.4} style={{ margin: '0 auto 8px', color: TEXT_M }} />
              {screenshots.length === 0
                ? 'Click to add 1–3 listing screenshots (PNG / JPG)'
                : `${screenshots.length} screenshot${screenshots.length > 1 ? 's' : ''} attached · click to add more`}
              <input
                id="propul8-screenshot-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
                data-testid="unreadable-upload-input"
              />
            </label>
            {screenshots.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2" data-testid="unreadable-upload-thumbs">
                {screenshots.map((s, i) => (
                  <div key={i} className="relative" style={{ borderRadius: 4, overflow: 'hidden' }}>
                    <img src={s.base64} alt={s.name} className="w-full h-24 object-cover" />
                    <button
                      type="button"
                      onClick={() => setScreenshots((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 p-1"
                      style={{
                        background: 'rgba(0,0,0,0.55)', border: 'none',
                        borderRadius: 99, cursor: 'pointer',
                      }}
                      data-testid={`unreadable-upload-remove-${i}`}
                      aria-label="Remove screenshot"
                    >
                      <X size={11} color="#FAFAFA" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional hint — e.g. city or neighborhood not visible in shot"
              className="w-full mt-4 px-4 py-2.5 text-[13px] outline-none"
              style={{
                background: INPUT_BG, color: TEXT,
                border: `1px solid ${BORDER}`, borderRadius: 4,
                fontFamily: 'inherit',
              }}
              data-testid="unreadable-upload-note"
            />
            <div className="mt-5 flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setMode(null)}
                className="px-5 py-3 text-[11px] tracking-[0.12em] uppercase"
                style={{
                  background: 'transparent', color: TEXT_2,
                  border: `1px solid ${BORDER}`, borderRadius: 4,
                  fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                }}
                data-testid="unreadable-upload-back"
              >
                Back
              </button>
              <button
                type="button"
                disabled={screenshots.length === 0 || parsing}
                onClick={submitScreenshots}
                className="inline-flex items-center gap-2 px-6 py-3 text-[11px] tracking-[0.12em] uppercase"
                style={{
                  background: (screenshots.length === 0 || parsing) ? 'rgba(156,143,119,0.30)' : CTA_BG,
                  color:      (screenshots.length === 0 || parsing) ? TEXT_M : CTA_TX,
                  border: 'none', borderRadius: 4,
                  fontFamily: 'Inter, sans-serif',
                  cursor: (screenshots.length === 0 || parsing) ? 'not-allowed' : 'pointer',
                }}
                data-testid="unreadable-upload-submit"
              >
                {parsing ? <Loader2 size={12} className="animate-spin" /> : null}
                {parsing ? 'Reading screenshots…' : 'Extract with AI'} {!parsing && <ArrowRight size={12} />}
              </button>
            </div>
          </div>
        )}

        {/* MANUAL ENTRY MODE */}
        {mode === 'manual' && (
          <div data-testid="unreadable-manual-form">
            <div
              className="font-mono-tight text-[10px] tracking-[0.22em] uppercase mb-2"
              style={{ color: TEXT_M }}
            >
              Enter manually · critical fields are marked *
            </div>
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-5"
              style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12 }}
            >
              <ManualField label="Listing title"    value={manual.title}            onChange={(v) => setManual({ ...manual, title: v })} theme={theme} />
              <ManualField label="City *"           value={manual.city}             onChange={(v) => setManual({ ...manual, city: v })} required theme={theme} />
              <ManualField label="Neighborhood"     value={manual.neighborhood}     onChange={(v) => setManual({ ...manual, neighborhood: v })} theme={theme} />
              <ManualField label="Property type"    value={manual.property_type}    onChange={(v) => setManual({ ...manual, property_type: v })} placeholder="Apartment / Villa / House" theme={theme} />
              <ManualField label="Asking price (€) *" type="number" value={manual.asking_price_eur} onChange={(v) => setManual({ ...manual, asking_price_eur: v })} required theme={theme} />
              <ManualField label="Surface (m²) *"   type="number" value={manual.m2}    onChange={(v) => setManual({ ...manual, m2: v })} required theme={theme} />
              <ManualField label="Bedrooms *"       type="number" value={manual.rooms} onChange={(v) => setManual({ ...manual, rooms: v })} required theme={theme} />
              <ManualField label="Bathrooms"        type="number" value={manual.bathrooms} onChange={(v) => setManual({ ...manual, bathrooms: v })} theme={theme} />
              <ManualField label="Condition"        value={manual.renovation_state} onChange={(v) => setManual({ ...manual, renovation_state: v })} placeholder="pristine / refresh / renovation / gut" theme={theme} />
            </div>
            <div className="mt-5 flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setMode(null)}
                className="px-5 py-3 text-[11px] tracking-[0.12em] uppercase"
                style={{
                  background: 'transparent', color: TEXT_2,
                  border: `1px solid ${BORDER}`, borderRadius: 4,
                  fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                }}
                data-testid="unreadable-manual-back"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!manual.asking_price_eur || !manual.m2 || !manual.rooms || !manual.city}
                onClick={submitManual}
                className="inline-flex items-center gap-2 px-6 py-3 text-[11px] tracking-[0.12em] uppercase"
                style={{
                  background: (!manual.asking_price_eur || !manual.m2 || !manual.rooms || !manual.city) ? 'rgba(156,143,119,0.30)' : CTA_BG,
                  color: (!manual.asking_price_eur || !manual.m2 || !manual.rooms || !manual.city) ? TEXT_M : CTA_TX,
                  border: 'none', borderRadius: 4,
                  fontFamily: 'Inter, sans-serif',
                  cursor: (!manual.asking_price_eur || !manual.m2 || !manual.rooms || !manual.city) ? 'not-allowed' : 'pointer',
                }}
                data-testid="unreadable-manual-submit"
              >
                Analyze listing <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Footer escape */}
        <div className="mt-10 pt-6" style={{ borderTop: `1px solid ${BORDER}` }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-[11px] tracking-[0.10em] uppercase"
            style={{
              background: 'transparent', color: TEXT_M, border: 'none',
              fontFamily: 'Inter, sans-serif', cursor: 'pointer',
            }}
            data-testid="unreadable-cancel"
          >
            ← Back to home
          </button>
          {debug && (
            <details className="mt-3">
              <summary
                className="font-mono-tight text-[10px] tracking-[0.18em] uppercase cursor-pointer"
                style={{ color: TEXT_M }}
                data-testid="unreadable-debug-toggle"
              >
                Show extraction debug
              </summary>
              <pre
                className="mt-2 p-3 text-[11px] overflow-auto"
                style={{
                  background: INPUT_BG, color: TEXT_2,
                  border: `1px solid ${BORDER}`, borderRadius: 4,
                  fontFamily: 'Inter, sans-serif', maxHeight: 280,
                }}
                data-testid="unreadable-debug-panel"
              >
{JSON.stringify(debug, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

function PathCard({ icon: Icon, label, detail, onClick, primary, testId }) {
  const BG     = primary ? '#FFFFFF' : '#FAFAFA';
  const BORDER = primary ? 'rgba(184,149,106,0.26)' : 'rgba(9,9,11,0.08)';
  const TEXT   = '#09090B';
  const TEXT_2 = '#52525B';
  const ACCENT = '#B8956A';
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-6 transition-all"
      style={{
        background: BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 3,
        boxShadow: primary ? '0 8px 24px rgba(184,149,106,0.08)' : '0 4px 14px rgba(9,9,11,0.04)',
        cursor: 'pointer',
      }}
      data-testid={testId}
    >
      <div
        className="w-9 h-9 flex items-center justify-center"
        style={{ background: 'rgba(184,149,106,0.08)', borderRadius: 10 }}
      >
        <Icon size={16} strokeWidth={1.6} style={{ color: ACCENT }} />
      </div>
      <div className="text-[14px] mt-4" style={{ color: TEXT, fontWeight: 500, letterSpacing: '-0.005em' }}>{label}</div>
      <div className="text-[12.5px] mt-1.5 leading-relaxed" style={{ color: TEXT_2 }}>{detail}</div>
    </button>
  );
}

function ManualField({ label, value, onChange, type = 'text', required, placeholder }) {
  const TEXT   = '#09090B';
  const TEXT_M = '#52525B';
  const BORDER = 'rgba(9,9,11,0.10)';
  const BG     = '#FFFFFF';
  return (
    <label className="block">
      <span
        className="text-[10.5px] tracking-[0.06em] uppercase"
        style={{ color: TEXT_M, fontWeight: 500 }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1.5 px-3 py-2.5 text-[13px] outline-none"
        style={{
          background: BG, color: TEXT,
          border: `1px solid ${required && !value ? '#B8956A' : BORDER}`,
          borderRadius: 4,
          fontFamily: type === 'number' ? "'Manrope', sans-serif" : 'inherit',
        }}
      />
    </label>
  );
}
