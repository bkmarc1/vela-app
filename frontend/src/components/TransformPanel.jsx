import { useEffect, useRef, useState } from 'react';
import { X, Sparkles, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { ACTIONS } from '../lib/transformActions';

const STAGES = [
  'Parsing recommendation context…',
  'Cross-referencing hospitality intelligence…',
  'Composing operational output…',
  'Compressing to ≤80-char lines…',
];

export default function TransformPanel({ open, onClose, recommendation, action, property }) {
  const [stage, setStage] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const reqRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    setData(null);
    setError(null);
    setStage(0);
    const reqId = ++reqRef.current;
    const stageInt = setInterval(
      () => setStage((s) => (s < STAGES.length - 1 ? s + 1 : s)),
      900
    );
    (async () => {
      try {
        const res = await api.post('/transform', {
          action,
          recommendation,
          property: property || {},
        });
        if (reqId !== reqRef.current) return;
        setData(res.data);
      } catch (e) {
        if (reqId !== reqRef.current) return;
        setError(e?.response?.data?.detail || 'Generation failed.');
      } finally {
        clearInterval(stageInt);
      }
    })();
    return () => clearInterval(stageInt);
  }, [open, action, recommendation, property]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const actionMeta = ACTIONS[action] || { label: action };
  const Icon = actionMeta.icon || Sparkles;
  const isCart = action === 'shopping_cart';

  return (
    <div data-testid="transform-panel" className="fixed inset-0 z-[200]">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[#FAFAFA]/70 backdrop-blur-2xl transition-opacity"
        data-testid="transform-overlay"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="absolute right-0 top-0 h-full w-full max-w-[680px] bg-[#E4E4E7] border-l border-[#09090B]/[0.10] flex flex-col panel-slide-in"
      >
        <header className="px-7 md:px-9 pt-7 pb-5 border-b border-[#09090B]/[0.08] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 kicker">
              <Icon size={11} strokeWidth={1.6} /> {actionMeta.label}
            </div>
            <h3 className="font-display text-2xl md:text-3xl tracking-[-0.025em] mt-2 leading-tight truncate">
              {recommendation?.title}
            </h3>
            {recommendation?.transformation && (
              <p className="text-[12px] text-[#52525B] mt-1.5 font-mono-tight tracking-tight">
                {recommendation.transformation}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            data-testid="transform-close"
            className="shrink-0 w-9 h-9 rounded-full border border-[#09090B]/[0.10] hover:border-white/30 flex items-center justify-center text-[#52525B] hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={14} strokeWidth={1.6} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-7 md:px-9 py-8">
          {!data && !error && <LoadingStages stage={stage} />}
          {error && <ErrorState error={error} />}
          {data && (isCart ? <CartOutput data={data} /> : <Output data={data} />)}
        </div>

        <footer className="border-t border-[#09090B]/[0.08] px-7 md:px-9 py-4 flex items-center justify-between text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.18em]">
          <span>Propul8 · Execution Engine</span>
          <span>Claude Sonnet 4.5</span>
        </footer>
      </aside>
    </div>
  );
}

function LoadingStages({ stage }) {
  return (
    <div className="space-y-3" data-testid="transform-loading">
      <div className="kicker">Generating</div>
      {STAGES.map((s, i) => (
        <div key={s} className={`flex items-center gap-3 transition-opacity duration-500 ${i > stage ? 'opacity-25' : 'opacity-100'}`}>
          <span className={`w-1.5 h-1.5 rounded-full transition-all ${i < stage ? 'bg-[#09090B]' : i === stage ? 'bg-[#09090B] animate-pulse' : 'bg-white/15'}`} />
          <span className={`text-[13px] font-light ${i === stage ? 'text-[#09090B]' : 'text-[#52525B]'}`}>{s}</span>
        </div>
      ))}
      <div className="mt-6 h-px w-full bg-[#09090B]/[0.08] relative overflow-hidden">
        <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#09090B] to-transparent animate-[slide_2.4s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div data-testid="transform-error" className="vela-card p-6">
      <div className="kicker">Unable to generate</div>
      <p className="text-[13px] text-[#52525B] mt-3 font-light leading-relaxed">{error}</p>
    </div>
  );
}

function copyText(text, label = 'Copied') {
  try {
    navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error('Could not copy');
  }
}

function Output({ data }) {
  return (
    <div className="space-y-7 fade-up" data-testid="transform-output">
      <div>
        <h4 className="font-display text-2xl md:text-[1.7rem] tracking-[-0.025em] leading-tight">{data.headline}</h4>
        {data.tldr && <p className="text-[14px] text-[#09090B] mt-3 leading-relaxed font-light">{data.tldr}</p>}
      </div>

      <div className="space-y-6">
        {(data.sections || []).map((s, i) => {
          const heading = (s.heading || '').toUpperCase();
          const isPrompt = /MIDJOURNEY|DALL|STABLE\s*DIFFUSION/.test(heading);
          const blockText = (s.items || []).join('\n');
          return (
            <div key={i} className="border-t border-[#09090B]/[0.08] pt-5">
              <div className="flex items-center justify-between mb-3">
                <div className="kicker">{s.heading}</div>
                <button
                  onClick={() => copyText(blockText, `${s.heading} copied`)}
                  className="text-[10px] font-mono-tight uppercase tracking-[0.14em] text-[#52525B] hover:text-white flex items-center gap-1.5 transition-colors"
                  data-testid={`copy-${(s.heading || '').toLowerCase().replace(/[^a-z0-9]+/g,'-')}`}
                >
                  <Copy size={11} strokeWidth={1.6} /> Copy
                </button>
              </div>
              {isPrompt ? (
                <div className="vela-card p-4 bg-[#E4E4E7] font-mono-tight text-[12px] text-[#09090B] leading-relaxed whitespace-pre-wrap break-words">
                  {blockText}
                </div>
              ) : (
                <ul className="space-y-2">
                  {(s.items || []).map((item, j) => (
                    <li key={j} className="flex gap-3 text-[13.5px] text-[#09090B] font-light leading-relaxed">
                      <span className="mt-2 w-1 h-1 rounded-full bg-[#52525B] shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {data.metric && (
        <div className="border-t border-[#09090B]/[0.08] pt-5">
          <div className="kicker mb-2">Impact</div>
          <div className="text-[14px] text-[#09090B] font-light leading-relaxed">{data.metric}</div>
        </div>
      )}
    </div>
  );
}

function CartOutput({ data }) {
  // Special renderer for shopping_cart: parse "product · brand · qty · €price · WxDxH cm · supplier"
  const itemsSection = (data.sections || []).find((s) => /ITEMS/i.test(s.heading || ''));
  const altsSection = (data.sections || []).find((s) => /ALTERNAT/i.test(s.heading || ''));
  const otherSections = (data.sections || []).filter((s) => s !== itemsSection && s !== altsSection);

  const parsed = (itemsSection?.items || []).map((line) => {
    const parts = line.split(/\s*·\s*|\s*\u00B7\s*|\s*\|\s*|\s*-\s+/);
    return {
      raw: line,
      product: parts[0] || line,
      brand: parts[1],
      qty: parts[2],
      price: parts[3],
      dims: parts[4],
      supplier: parts[5],
    };
  });

  // Compute crude cart total from "€XXX" tokens
  let total = 0;
  parsed.forEach((p) => {
    const m = (p.price || '').match(/€\s*(\d[\d.,]*)/);
    const q = parseInt(p.qty || '1', 10) || 1;
    if (m) total += parseFloat(m[1].replace(/[.,]/g, '')) * q;
  });

  return (
    <div className="space-y-7 fade-up" data-testid="transform-output">
      <div>
        <h4 className="font-display text-2xl md:text-[1.7rem] tracking-[-0.025em] leading-tight">{data.headline}</h4>
        {data.tldr && <p className="text-[14px] text-[#09090B] mt-3 leading-relaxed font-light">{data.tldr}</p>}
      </div>

      {parsed.length > 0 && (
        <div className="border-t border-[#09090B]/[0.08] pt-5">
          <div className="flex items-center justify-between mb-4">
            <div className="kicker">Cart · {parsed.length} items</div>
            <button
              onClick={() => copyText(parsed.map((p) => p.raw).join('\n'), 'Cart copied')}
              className="text-[10px] font-mono-tight uppercase tracking-[0.14em] text-[#52525B] hover:text-white flex items-center gap-1.5 transition-colors"
              data-testid="copy-cart"
            >
              <Copy size={11} strokeWidth={1.6} /> Copy Cart
            </button>
          </div>
          <div className="space-y-2">
            {parsed.map((p, i) => {
              const search = encodeURIComponent(`${p.brand || ''} ${p.product}`.trim());
              const supplier = (p.supplier || '').trim();
              const supplierUrl = supplier
                ? `https://www.google.com/search?q=${search}+site%3A${encodeURIComponent(supplier.toLowerCase().replace(/\s+/g, ''))}.com`
                : `https://www.google.com/search?q=${search}`;
              return (
                <div key={i} data-testid={`cart-item-${i}`} className="grid grid-cols-12 gap-3 items-center bg-[#E4E4E7] border border-[#09090B]/[0.08] rounded-xl p-4 hover:border-[#09090B]/15 transition-colors">
                  <div className="col-span-12 md:col-span-5">
                    <div className="text-[13px] text-[#09090B]">{p.product}</div>
                    {p.brand && <div className="text-[11px] text-[#52525B] font-mono-tight mt-0.5">{p.brand}</div>}
                  </div>
                  <div className="col-span-4 md:col-span-2 text-[11px] text-[#52525B] font-mono-tight">
                    {p.qty || '1'}× <span className="text-[#52525B]">{p.dims || ''}</span>
                  </div>
                  <div className="col-span-4 md:col-span-2 font-mono-tight text-[13px] text-[#09090B]">{p.price || '—'}</div>
                  <div className="col-span-4 md:col-span-3 flex items-center justify-end gap-2">
                    {supplier && <span className="text-[10px] uppercase tracking-[0.14em] text-[#52525B] font-mono-tight">{supplier}</span>}
                    <a
                      href={supplierUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="action-pill"
                      data-testid={`cart-item-${i}-open`}
                    >
                      <ExternalLink size={11} strokeWidth={1.6} /> Open
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
          {total > 0 && (
            <div className="mt-4 flex items-center justify-between border-t border-[#09090B]/[0.08] pt-4">
              <div className="kicker">Estimated Total</div>
              <div className="font-mono-tight text-[15px] text-[#09090B]">€{Math.round(total).toLocaleString()}</div>
            </div>
          )}
        </div>
      )}

      {altsSection && (
        <div className="border-t border-[#09090B]/[0.08] pt-5">
          <div className="kicker mb-3">Alternatives</div>
          <ul className="space-y-2">
            {(altsSection.items || []).map((item, j) => (
              <li key={j} className="flex gap-3 text-[12.5px] text-[#52525B] font-light leading-relaxed">
                <Check size={11} strokeWidth={1.6} className="mt-1 text-[#52525B]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {otherSections.map((s, i) => (
        <div key={i} className="border-t border-[#09090B]/[0.08] pt-5">
          <div className="kicker mb-3">{s.heading}</div>
          <ul className="space-y-2">
            {(s.items || []).map((item, j) => (
              <li key={j} className="text-[13px] text-[#09090B] font-light leading-relaxed">{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
