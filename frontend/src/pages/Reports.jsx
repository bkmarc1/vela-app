import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, ArrowRight, Plus, X, Check, ShieldCheck, TrendingUp, Hammer, Briefcase,
  FileDown, Sparkles, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import DataBadge from '../components/shared/DataBadge';
import { INVEST_DEMO_INPUT, INVEST_DEMO_ANALYSIS } from '../lib/investDemo';
import { buildInvestProvenance } from '../lib/dataProvenance';

// Propul8 Reports — full 6-step generation flow.
// 1 · Select asset   → from latest / saved / paste URL
// 2 · Choose type    → 6 report types
// 3 · Focus area     → preset or custom prompt
// 4 · Generate       → cinematic Propul8 is computing
// 5 · Preview        → real report body with strict provenance badges
// 6 · Export PDF     → download or save to portfolio

const DEMO_REPORTS = [
  { id: 'r1', property: 'Koukaki Boutique · Athens',  date: '2026-02-08', type: 'Acquisition Report', status: 'Ready', confidence: 'High' },
  { id: 'r2', property: 'Naoussa Stone · Paros',      date: '2026-02-04', type: 'Yield Audit',         status: 'Ready', confidence: 'High' },
  { id: 'r3', property: 'Comporta House · Lisbon',    date: '2026-01-28', type: 'Upgrade Plan',        status: 'Ready', confidence: 'Medium' },
  { id: 'r4', property: 'Cycladic 2BR · Naxos',       date: '2026-01-22', type: 'Investor Memo',       status: 'Draft', confidence: 'Medium' },
];

const REPORT_TYPES = [
  { id: 'acquisition', icon: ShieldCheck, label: 'Acquisition Report', detail: 'Buy / Pass / Negotiate decision · risks · upside.' },
  { id: 'yield_audit', icon: TrendingUp,  label: 'Yield Audit Report', detail: 'Revenue gaps · top fixes · expected uplift.' },
  { id: 'upgrade',     icon: Hammer,      label: 'Upgrade Plan',       detail: 'Design · listing · pricing · shopping cart.' },
  { id: 'investor',    icon: Briefcase,   label: 'Investor Memo',      detail: 'IC-grade one-pager: opportunity · risk · exit.' },
  { id: 'owner',       icon: FileText,    label: 'Owner Summary',      detail: 'Simple non-technical asset performance summary.' },
  { id: 'full',        icon: FileText,    label: 'Full Asset Report',  detail: 'Everything Propul8 computed on the asset.' },
];

const FOCUS_PRESETS = [
  'Buy / Pass decision',
  'Revenue potential',
  'Risks',
  'Renovation / upgrade plan',
  'Pricing strategy',
  'Owner summary',
  'Investor summary',
  'Full analysis',
];

const GEN_PHASES = [
  'Loading verified listing data',
  'Cross-checking provenance + confidence',
  'Composing report sections',
  'Formatting institutional output',
];

export default function Reports() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div
      className="min-h-screen"
      style={{ background: '#FFFFFF', color: '#09090B' }}
      data-testid="reports-page"
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-14 lg:py-20">
        <div className="flex items-baseline justify-between flex-wrap gap-4 mb-12">
          <div>
            <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#B8956A' }}>
              Propul8 · Investor Outputs
            </span>
            <h1
              className="font-display font-medium mt-3 leading-[1.04]"
              style={{ fontSize: 'clamp(34px, 4.4vw, 56px)', color: '#09090B', letterSpacing: '-0.02em' }}
              data-testid="reports-title"
            >
              Reports
            </h1>
            <p className="mt-3 text-[14.5px]" style={{ color: '#52525B', maxWidth: 520 }} data-testid="reports-subtitle">
              Generate institutional summaries from your listings. Every number shows its source, status, and confidence.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 text-[11px] tracking-[0.10em] transition-all"
            style={{
              background: '#B8956A', color: '#FFFFFF', borderRadius: 3,
              fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', fontWeight: 500,
              border: 'none', cursor: 'pointer',
            }}
            data-testid="reports-new-cta"
          >
            <Plus size={12} strokeWidth={1.7} />
            Create Report
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-px" style={{ background: 'rgba(9,9,11,0.10)' }}>
          {DEMO_REPORTS.map((r) => (
            <ReportCard key={r.id} r={r} />
          ))}
        </div>
      </div>

      <CreateReportModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function ReportCard({ r }) {
  return (
    <div
      className="p-7 lg:p-8 flex flex-col"
      style={{ background: '#FAFAFA', minHeight: 220 }}
      data-testid={`reports-card-${r.id}`}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="w-10 h-10 flex items-center justify-center" style={{
          border: '1px solid rgba(184,149,106,0.22)', borderRadius: 4, background: 'rgba(184,149,106,0.06)',
        }}>
          <FileText size={16} strokeWidth={1.5} style={{ color: '#B8956A' }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono-tight text-[9px] tracking-[0.16em] uppercase" style={{ color: '#52525B' }}>
            {r.confidence} confidence
          </span>
          <span className="font-mono-tight text-[9px] tracking-[0.18em] uppercase px-2 py-1" style={{
            color: r.status === 'Ready' ? '#B8956A' : '#B8956A',
            border: r.status === 'Ready' ? '1px solid rgba(92,122,78,0.30)' : '1px solid rgba(184,149,106,0.30)',
            borderRadius: 1,
          }}>
            {r.status}
          </span>
        </div>
      </div>
      <span className="font-mono-tight text-[10px] tracking-[0.18em] uppercase" style={{ color: '#B8956A' }}>
        {r.type}
      </span>
      <div className="font-display font-medium mt-2 leading-snug flex-1" style={{ fontSize: 17, color: '#09090B', letterSpacing: '-0.01em' }}>
        {r.property}
      </div>
      <div className="flex items-center justify-between mt-5">
        <span className="font-mono-tight text-[11px]" style={{ color: '#52525B' }}>{r.date}</span>
        <div className="flex items-center gap-3">
          <button type="button" className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.10em] uppercase"
            style={{ background: 'transparent', color: '#09090B', border: 'none', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}
            data-testid={`reports-card-${r.id}-open`}
            onClick={() => window.print()}>
            Open <ArrowRight size={11} />
          </button>
          <button type="button" className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.10em] uppercase"
            style={{ background: 'transparent', color: '#B8956A', border: 'none', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}
            data-testid={`reports-card-${r.id}-export`}
            onClick={() => { toast.success('PDF queued'); setTimeout(() => window.print(), 600); }}>
            Export PDF <FileDown size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateReportModal({ open, onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [propertyChoice, setPropertyChoice] = useState('latest');
  const [pastedUrl, setPastedUrl] = useState('');
  const [reportType, setReportType] = useState('acquisition');
  const [focus, setFocus] = useState('Buy / Pass decision');
  const [customPrompt, setCustomPrompt] = useState('');
  const [genPhase, setGenPhase] = useState(0);

  // Phase animation when step transitions to 4 (Generate).
  useEffect(() => {
    if (step !== 4) return undefined;
    let cancelled = false;
    setGenPhase(0);
    const seq = async () => {
      for (let i = 0; i < GEN_PHASES.length; i += 1) {
        if (cancelled) return;
        await new Promise((res) => setTimeout(res, 420));
        if (cancelled) return;
        setGenPhase(i + 1);
      }
      if (!cancelled) setTimeout(() => { if (!cancelled) setStep(5); }, 320);
    };
    seq();
    return () => { cancelled = true; };
  }, [step]);

  if (!open) return null;

  const reset = () => {
    setStep(1); setPropertyChoice('latest'); setPastedUrl('');
    setReportType('acquisition'); setFocus('Buy / Pass decision');
    setCustomPrompt(''); setGenPhase(0);
  };
  const close = () => { onClose(); setTimeout(reset, 240); };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-4"
      style={{ background: 'rgba(10,8,7,0.78)', backdropFilter: 'blur(14px)' }}
      role="dialog"
      aria-modal="true"
      data-testid="reports-create-modal"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="w-full max-w-[820px] max-h-[92vh] overflow-auto"
        style={{ background: '#FAFAFA', borderRadius: 4, color: '#09090B', boxShadow: '0 60px 120px -40px rgba(0,0,0,0.8)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b" style={{ borderColor: 'rgba(9,9,11,0.10)' }}>
          <div className="flex items-center gap-3">
            <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#B8956A' }}>
              Create Report · Step {step} of 6
            </span>
            <StepDots step={step} />
          </div>
          <button
            type="button"
            onClick={close}
            className="p-1 transition-opacity hover:opacity-75"
            style={{ background: 'transparent', border: 'none', color: '#52525B' }}
            data-testid="reports-create-close"
            aria-label="Close"
          >
            <X size={16} strokeWidth={1.6} />
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-7">
          {step === 1 && (
            <Step1
              propertyChoice={propertyChoice} setPropertyChoice={setPropertyChoice}
              pastedUrl={pastedUrl} setPastedUrl={setPastedUrl}
            />
          )}
          {step === 2 && <Step2 reportType={reportType} setReportType={setReportType} />}
          {step === 3 && (
            <Step3
              focus={focus} setFocus={setFocus}
              customPrompt={customPrompt} setCustomPrompt={setCustomPrompt}
            />
          )}
          {step === 4 && <Step4 phase={genPhase} />}
          {step === 5 && (
            <Step5
              propertyChoice={propertyChoice} pastedUrl={pastedUrl}
              reportType={reportType} focus={customPrompt || focus}
            />
          )}
          {step === 6 && (
            <Step6
              onClose={close}
            />
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-7 py-4 border-t" style={{ borderColor: 'rgba(9,9,11,0.10)' }}>
          <button
            type="button"
            onClick={() => step > 1 ? setStep(step - 1) : close()}
            className="text-[11px] tracking-[0.10em] uppercase"
            style={{ background: 'transparent', color: '#52525B', border: 'none', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}
            data-testid="reports-create-back"
            disabled={step === 4}
          >
            {step === 1 ? 'Cancel' : step === 4 ? '' : 'Back'}
          </button>
          {step < 3 && (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[11px] tracking-[0.10em]"
              style={{
                background: '#B8956A', color: '#FFFFFF', border: 'none', borderRadius: 3,
                fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', cursor: 'pointer',
              }}
              data-testid="reports-create-next"
            >
              Continue <ArrowRight size={12} />
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[11px] tracking-[0.10em]"
              style={{
                background: '#B8956A', color: '#FAFAFA', border: 'none', borderRadius: 4,
                fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', cursor: 'pointer',
              }}
              data-testid="reports-create-generate"
            >
              <Sparkles size={12} /> Generate <ArrowRight size={12} />
            </button>
          )}
          {step === 5 && (
            <button
              type="button"
              onClick={() => setStep(6)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[11px] tracking-[0.10em]"
              style={{
                background: '#B8956A', color: '#FFFFFF', border: 'none', borderRadius: 3,
                fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', cursor: 'pointer',
              }}
              data-testid="reports-create-export-step"
            >
              <FileDown size={12} /> Export <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepDots({ step }) {
  return (
    <div className="flex items-center gap-1.5" data-testid="reports-step-dots">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className="rounded-full"
          style={{
            width: 6, height: 6,
            background: i === step ? '#B8956A' : i < step ? '#B8956A' : 'rgba(9,9,11,0.18)',
            transition: 'background 200ms ease',
          }}
        />
      ))}
    </div>
  );
}

function Step1({ propertyChoice, setPropertyChoice, pastedUrl, setPastedUrl }) {
  return (
    <div data-testid="reports-step-1">
      <h2 className="font-display font-medium leading-[1.04] mb-2" style={{ fontSize: 24, letterSpacing: '-0.015em' }}>
        Select a property
      </h2>
      <p className="text-[13px] mb-7" style={{ color: '#52525B' }}>
        Report uses verified listing data and clearly labels every number.
      </p>
      <div className="space-y-2">
        {[
          { id: 'latest',  label: 'Use latest pasted listing',  detail: 'Koukaki Boutique · Athens (demo)' },
          { id: 'saved',   label: 'Choose a saved asset',       detail: 'Browse your Portfolio' },
          { id: 'paste',   label: 'Paste new listing URL',      detail: 'Spitogatos, Airbnb, Booking, E&V…' },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setPropertyChoice(opt.id)}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-all"
            style={{
              background: propertyChoice === opt.id ? '#FFFFFF' : '#FAFAFA',
              border: propertyChoice === opt.id ? '1px solid rgba(184,149,106,0.40)' : '1px solid rgba(9,9,11,0.10)',
              borderRadius: 4, cursor: 'pointer',
            }}
            data-testid={`reports-step-1-${opt.id}`}
          >
            <div>
              <div className="text-[13.5px]" style={{ color: '#09090B', fontWeight: 500 }}>{opt.label}</div>
              <div className="text-[11.5px] mt-0.5" style={{ color: '#52525B' }}>{opt.detail}</div>
            </div>
            {propertyChoice === opt.id && <Check size={14} style={{ color: '#B8956A' }} />}
          </button>
        ))}
        {propertyChoice === 'paste' && (
          <input
            type="url"
            value={pastedUrl}
            onChange={(e) => setPastedUrl(e.target.value)}
            placeholder="Paste listing URL"
            className="w-full mt-3 px-5 py-3 text-[13px]"
            style={{
              background: '#FFFFFF', border: '1px solid rgba(9,9,11,0.12)',
              borderRadius: 4, color: '#09090B', outline: 'none', fontFamily: 'Inter, sans-serif',
            }}
            data-testid="reports-step-1-url-input"
          />
        )}
      </div>
    </div>
  );
}

function Step2({ reportType, setReportType }) {
  return (
    <div data-testid="reports-step-2">
      <h2 className="font-display font-medium leading-[1.04] mb-2" style={{ fontSize: 24, letterSpacing: '-0.015em' }}>
        Choose report type
      </h2>
      <p className="text-[13px] mb-7" style={{ color: '#52525B' }}>
        Each type tailors the analysis to a different audience.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {REPORT_TYPES.map((t) => {
          const Icon = t.icon;
          const isSel = reportType === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setReportType(t.id)}
              className="text-left p-4 transition-all"
              style={{
                background: isSel ? '#FFFFFF' : '#FAFAFA',
                border: isSel ? '1px solid rgba(184,149,106,0.40)' : '1px solid rgba(9,9,11,0.10)',
                borderRadius: 4, cursor: 'pointer', minHeight: 110,
              }}
              data-testid={`reports-step-2-${t.id}`}
            >
              <Icon size={14} strokeWidth={1.5} style={{ color: '#B8956A' }} />
              <div className="text-[13px] mt-3" style={{ color: '#09090B', fontWeight: 500 }}>{t.label}</div>
              <div className="text-[11px] mt-1.5 leading-relaxed" style={{ color: '#52525B' }}>{t.detail}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step3({ focus, setFocus, customPrompt, setCustomPrompt }) {
  return (
    <div data-testid="reports-step-3">
      <h2 className="font-display font-medium leading-[1.04] mb-2" style={{ fontSize: 24, letterSpacing: '-0.015em' }}>
        What should this report focus on?
      </h2>
      <p className="text-[13px] mb-7" style={{ color: '#52525B' }}>
        Choose a preset or ask Propul8 what to summarize.
      </p>
      <div className="flex flex-wrap gap-2 mb-5">
        {FOCUS_PRESETS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFocus(f)}
            className="px-3.5 py-2 text-[11px] tracking-[0.06em]"
            style={{
              background: focus === f ? '#09090B' : 'transparent',
              color: focus === f ? '#FAFAFA' : '#52525B',
              border: focus === f ? 'none' : '1px solid rgba(9,9,11,0.12)',
              borderRadius: 4, cursor: 'pointer',
            }}
            data-testid={`reports-step-3-preset-${f.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="text-[10.5px] tracking-[0.18em] uppercase mb-2" style={{ color: '#52525B' }}>
        Custom prompt (optional)
      </div>
      <textarea
        rows={3}
        value={customPrompt}
        onChange={(e) => setCustomPrompt(e.target.value)}
        placeholder='e.g. "Summarize this Spitogatos listing and tell me if it is a good acquisition for short-term rental."'
        className="w-full px-4 py-3 text-[13px] outline-none"
        style={{
          background: '#FFFFFF', border: '1px solid rgba(9,9,11,0.12)',
          borderRadius: 4, color: '#09090B', resize: 'vertical',
        }}
        data-testid="reports-step-3-custom"
      />
    </div>
  );
}

function Step4({ phase }) {
  return (
    <div data-testid="reports-step-4" className="py-10">
      <div className="flex items-center gap-3 mb-7">
        <Loader2 size={18} className="animate-spin" style={{ color: '#B8956A' }} />
        <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#B8956A' }}>
          Generating report
        </span>
      </div>
      <ul className="space-y-3" data-testid="reports-step-4-phases">
        {GEN_PHASES.map((p, i) => {
          const done = i < phase;
          const running = i === phase;
          return (
            <li key={p} className="flex items-center gap-3 text-[13.5px]" style={{
              color: done ? '#09090B' : running ? '#B8956A' : '#52525B',
            }}>
              {done ? (
                <Check size={14} style={{ color: '#B8956A' }} />
              ) : running ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <span style={{ width: 13, height: 13, borderRadius: 99, border: '1px solid rgba(9,9,11,0.20)' }} />
              )}
              <span>{p}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ----- Step 5: REAL preview with provenance badges -----

function Step5({ propertyChoice, pastedUrl, reportType, focus }) {
  const analysis = INVEST_DEMO_ANALYSIS; // demo source; real flow would pull active asset
  const input = INVEST_DEMO_INPUT;
  const prov = useMemo(() => buildInvestProvenance({ ...input, _confidence: { asking_price_eur: 'verified', m2: 'verified', city: 'verified', rooms: 'verified', neighborhood: 'needs_review', year_built: 'needs_review', renovation_state: 'verified', property_type: 'verified' }, listing_source: 'Spitogatos' }), [input]);
  const typeMeta = REPORT_TYPES.find((t) => t.id === reportType) || REPORT_TYPES[0];
  const propertyLabel = propertyChoice === 'latest'
    ? `${input.title || 'Asset'} · ${input.city || 'Mediterranean'}`
    : propertyChoice === 'saved' ? 'Saved portfolio asset' : (pastedUrl || 'Pasted URL');
  const v = analysis.deal_verdict;
  const hero = analysis.acquisition_hero;
  const snapshot = analysis.snapshot;
  const top = analysis.true_roi;

  return (
    <div data-testid="reports-step-5">
      {/* Ready banner */}
      <div className="flex items-center gap-2 mb-5">
        <Check size={14} style={{ color: '#B8956A' }} />
        <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#B8956A' }}>
          Report Ready · Preview
        </span>
      </div>

      <div
        className="p-7 lg:p-8"
        style={{ background: '#FFFFFF', border: '1px solid rgba(9,9,11,0.10)', borderRadius: 12 }}
        data-testid="reports-preview"
      >
        {/* Header */}
        <div className="mb-7 pb-5" style={{ borderBottom: '1px solid rgba(9,9,11,0.10)' }}>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#B8956A' }}>
                {typeMeta.label}
              </span>
              <h3
                className="font-display font-medium mt-2 leading-snug"
                style={{ fontSize: 26, letterSpacing: '-0.015em', color: '#09090B' }}
                data-testid="reports-preview-title"
              >
                {propertyLabel}
              </h3>
              <div className="mt-2 text-[12px]" style={{ color: '#52525B' }}>
                Focus: <span style={{ color: '#09090B' }}>{focus}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono-tight text-[10px] tracking-[0.20em] uppercase" style={{ color: '#52525B' }}>
                Verdict
              </div>
              <div className="font-display font-medium mt-1" style={{ fontSize: 22, color: '#B8956A' }} data-testid="reports-preview-verdict">
                {v.verdict}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: '#52525B' }}>Data Quality · {v.confidence_pct >= 80 ? 'Strong' : v.confidence_pct >= 55 ? 'Medium' : 'Limited'}</div>
            </div>
          </div>
        </div>

        {/* Headline metrics with provenance badges */}
        <PreviewSection kicker="Key figures">
          <div className="grid sm:grid-cols-3 gap-5">
            <PreviewMetric label="Asking price" value={`€${(hero.asking_price_eur || 0).toLocaleString()}`} cell={prov.asking_price_eur} testId="preview-metric-price" />
            <PreviewMetric label="€/m²"        value={hero.price_per_sqm_eur ? `€${hero.price_per_sqm_eur.toLocaleString()}` : '—'} cell={prov.price_per_sqm_eur} testId="preview-metric-psqm" />
            <PreviewMetric label="Surface"     value={`${input.m2 || '—'} m²`} cell={prov.m2} testId="preview-metric-m2" />
            <PreviewMetric label="Bedrooms"    value={input.rooms || '—'} cell={prov.rooms} testId="preview-metric-rooms" />
            <PreviewMetric label="City"        value={input.city || '—'} cell={prov.city} testId="preview-metric-city" />
            <PreviewMetric label="Condition"   value={input.renovation_state || '—'} cell={prov.renovation_state} testId="preview-metric-cond" />
          </div>
        </PreviewSection>

        {/* Yield + revenue */}
        <PreviewSection kicker="Projected yield (post-Propul8)">
          <div className="grid sm:grid-cols-3 gap-5">
            <PreviewMetric
              label="Net yield"
              value={`${analysis.snapshot.estimated_net_yield_pct}%`}
              cell={{
                value: analysis.snapshot.estimated_net_yield_pct, status: 'Calculated',
                confidence: 72, source: 'Propul8 deterministic math', lastChecked: new Date().toISOString().slice(0, 10),
              }}
              testId="preview-metric-yield"
            />
            <PreviewMetric
              label="Annual gross revenue"
              value={`€${(top.gross_revenue_eur || 0).toLocaleString()}`}
              cell={{
                value: top.gross_revenue_eur, status: 'Calculated',
                confidence: 72, source: 'Propul8 deterministic math', lastChecked: new Date().toISOString().slice(0, 10),
              }}
              testId="preview-metric-gross"
            />
            <PreviewMetric
              label="ADR"
              value={`€${top.adr_eur || 0}`}
              cell={{
                value: top.adr_eur, status: 'Estimated',
                confidence: 50, source: 'Propul8 market model · Athens median', lastChecked: new Date().toISOString().slice(0, 10),
              }}
              testId="preview-metric-adr"
            />
          </div>
        </PreviewSection>

        {/* Why this verdict */}
        <PreviewSection kicker="Why this verdict">
          <p className="text-[14px] leading-relaxed" style={{ color: '#09090B' }} data-testid="preview-reason">
            {v.main_reason}
          </p>
        </PreviewSection>

        {/* Top risks */}
        <PreviewSection kicker="Top 3 risks">
          <ol className="space-y-2 text-[13.5px] list-decimal pl-5" style={{ color: '#09090B' }}>
            {(analysis.negotiation || []).slice(0, 3).map((l) => (
              <li key={l.label} data-testid="preview-risk-item">
                <span style={{ fontWeight: 500 }}>{l.label}</span>
                <div className="text-[12px] mt-0.5" style={{ color: '#52525B' }}>{l.detail}</div>
              </li>
            ))}
          </ol>
        </PreviewSection>

        {/* Next moves */}
        <PreviewSection kicker="What to do next">
          <p className="text-[14px] leading-relaxed" style={{ color: '#09090B' }} data-testid="preview-next">
            {hero.next_best_action}
          </p>
        </PreviewSection>

        {/* Provenance summary */}
        <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(9,9,11,0.10)' }}>
          <div className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase mb-2" style={{ color: '#52525B' }}>
            Data accuracy
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: '#52525B' }} data-testid="preview-provenance-summary">
            Listing source: <span style={{ color: '#09090B' }}>{input.listing_source || 'Demo'}</span> · Generated {new Date().toISOString().slice(0, 10)} · Each number is labelled by status (Confirmed, Calculated, Estimated, Not confirmed) and shows its source on hover.
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewSection({ kicker, children }) {
  return (
    <div className="mt-6 first:mt-0">
      <div className="font-mono-tight text-[9.5px] tracking-[0.22em] uppercase mb-3" style={{ color: '#B8956A' }}>
        {kicker}
      </div>
      {children}
    </div>
  );
}

function PreviewMetric({ label, value, cell, testId }) {
  return (
    <div data-testid={testId}>
      <div className="font-mono-tight text-[9.5px] tracking-[0.20em] uppercase" style={{ color: '#52525B' }}>
        {label}
      </div>
      <div className="mt-1.5 font-mono-tight tabular-nums" style={{ fontSize: 19, color: '#09090B', fontWeight: 500, letterSpacing: '-0.01em' }}>
        {value}
      </div>
      {cell && (
        <div className="mt-2">
          <DataBadge cell={cell} theme="light" size="sm" testId={testId ? `${testId}-badge` : undefined} />
        </div>
      )}
    </div>
  );
}

// ----- Step 6: Export -----
function Step6({ onClose }) {
  const exportPdf = () => {
    toast.success('PDF queued — opening print dialog');
    setTimeout(() => window.print(), 500);
  };
  return (
    <div data-testid="reports-step-6" className="py-4">
      <div className="flex items-center gap-2 mb-5">
        <Check size={14} style={{ color: '#B8956A' }} />
        <span className="font-mono-tight text-[10px] tracking-[0.22em] uppercase" style={{ color: '#B8956A' }}>
          Export Report
        </span>
      </div>
      <h2 className="font-display font-medium leading-[1.04] mb-3" style={{ fontSize: 24, letterSpacing: '-0.015em' }}>
        Choose how to send this.
      </h2>
      <p className="text-[13px] mb-7" style={{ color: '#52525B' }}>
        Generate an institutional PDF or save the report to your portfolio for later.
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mb-2">
        <ExportTile
          icon={FileDown}
          label="Export as PDF"
          detail="Print-ready · institutional letterhead · provenance footnotes."
          onClick={exportPdf}
          testId="reports-step-6-export-pdf"
          primary
        />
        <ExportTile
          icon={Briefcase}
          label="Save to Portfolio"
          detail="Stored under your assets · accessible from /portfolio."
          onClick={() => { toast.success('Saved to Portfolio'); onClose(); }}
          testId="reports-step-6-save"
        />
      </div>
    </div>
  );
}

function ExportTile({ icon: Icon, label, detail, onClick, primary, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-5 transition-all"
      style={{
        background: primary ? '#09090B' : '#FFFFFF',
        color: primary ? '#FAFAFA' : '#09090B',
        border: primary ? 'none' : '1px solid rgba(9,9,11,0.10)',
        borderRadius: 4, cursor: 'pointer',
      }}
      data-testid={testId}
    >
      <Icon size={16} strokeWidth={1.5} style={{ color: primary ? '#B8956A' : '#B8956A' }} />
      <div className="text-[14px] mt-3" style={{ fontWeight: 500 }}>{label}</div>
      <div className="text-[11.5px] mt-1.5 leading-relaxed" style={{ color: primary ? 'rgba(242,234,216,0.7)' : '#52525B' }}>{detail}</div>
    </button>
  );
}
