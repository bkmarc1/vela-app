import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { DEMO_PROPERTY, FALLBACK_CART } from '../lib/demoProperty';

const TIERS = ['budget', 'premium', 'luxury'];
const TIER_LABELS = { budget: 'Budget', premium: 'Premium', luxury: 'Luxury' };

const STAGES = [
  'Sourcing brands…',
  'Calibrating package tiers…',
  'Building procurement spec…',
];

export default function UpgradeCart() {
  const params = useParams();
  const propertyId = params.propertyId || 'demo';
  const upgradeIdxRaw = params.upgradeIdx;
  const upgradeIndex = Math.max(0, Number.isFinite(Number(upgradeIdxRaw)) ? Number(upgradeIdxRaw) : 0);
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [cart, setCart] = useState(null);
  const [stage, setStage] = useState(0);
  const [tier, setTier] = useState('premium');
  // overrides[tier][itemIdx] = { qty?, alt_idx?, removed? }
  const [overrides, setOverrides] = useState({ budget: {}, premium: {}, luxury: {} });
  const [openItem, setOpenItem] = useState(null);

  useEffect(() => {
    if (cart) return;
    const id = setInterval(() => setStage((s) => (s < STAGES.length - 1 ? s + 1 : s)), 1100);
    return () => clearInterval(id);
  }, [cart]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Resolve property — demo always local.
      let prop = DEMO_PROPERTY;
      if (propertyId !== 'demo') {
        try {
          const r = await api.get(`/properties/${propertyId}`);
          prop = r.data || DEMO_PROPERTY;
        } catch (e) { /* fallback to demo shape */ }
      }
      if (cancelled) return;
      setProperty(prop);

      const upgrades = prop?.analysis?.yield_opportunities || [];
      const safeIdx = upgradeIndex < upgrades.length ? upgradeIndex : 0;
      const rec = upgrades[safeIdx] || DEMO_PROPERTY.analysis.yield_opportunities[0];

      try {
        const r = await api.post('/upgrade/cart', { recommendation: rec, property: prop });
        if (!cancelled) setCart(r.data?.packages?.length ? r.data : FALLBACK_CART);
      } catch (e) {
        if (!cancelled) setCart(FALLBACK_CART);
      }
    })();
    return () => { cancelled = true; };
  }, [propertyId, upgradeIndex]);

  const upgrades = property?.analysis?.yield_opportunities || [];
  const recommendation = upgrades[upgradeIndex < upgrades.length ? upgradeIndex : 0]
    || DEMO_PROPERTY.analysis.yield_opportunities[0];

  const pkg = useMemo(
    () => cart?.packages?.find((p) => p.tier === tier) || cart?.packages?.[0],
    [cart, tier]
  );

  // Compute live total accounting for qty + alternative swaps + removals.
  const { liveItems, liveSubtotal } = useMemo(() => {
    if (!pkg) return { liveItems: [], liveSubtotal: 0 };
    const items = pkg.items.map((it, idx) => {
      const o = overrides[tier]?.[idx] || {};
      if (o.removed) return null;
      const qty = o.qty != null ? o.qty : it.qty;
      const altIdx = o.alt_idx;
      let unit = it.unit_price_eur;
      let name = it.name;
      let brand = it.brand;
      if (altIdx != null && it.alternatives?.[altIdx]) {
        const alt = it.alternatives[altIdx];
        unit = alt.unit_price_eur;
        name = alt.name;
        brand = alt.brand;
      }
      return { ...it, idx, qty, unit_price_eur: unit, line_total_eur: qty * unit, name, brand, isAlt: altIdx != null };
    }).filter(Boolean);
    const sub = items.reduce((a, b) => a + b.line_total_eur, 0);
    return { liveItems: items, liveSubtotal: sub };
  }, [pkg, overrides, tier]);

  const shipping = Math.round(liveSubtotal * 0.04);
  const tax = Math.round(liveSubtotal * 0.24);
  const grand = liveSubtotal + shipping + tax;

  function setQty(idx, qty) {
    setOverrides((o) => ({
      ...o,
      [tier]: { ...o[tier], [idx]: { ...(o[tier]?.[idx] || {}), qty: Math.max(0, qty) } },
    }));
  }
  function pickAlt(idx, altIdx) {
    setOverrides((o) => ({
      ...o,
      [tier]: { ...o[tier], [idx]: { ...(o[tier]?.[idx] || {}), alt_idx: altIdx } },
    }));
  }
  function removeItem(idx) {
    setOverrides((o) => ({
      ...o,
      [tier]: { ...o[tier], [idx]: { ...(o[tier]?.[idx] || {}), removed: true } },
    }));
  }

  if (!property) {
    return (
      <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-24 text-[#52525B] font-mono-tight" data-testid="cart-loading">
        Preparing procurement studio…
      </div>
    );
  }

  return (
    <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-10 md:py-14" data-testid="upgrade-cart-page">
      <button
        onClick={() => navigate(`/dashboard/${propertyId}`)}
        className="text-[10px] font-mono-tight uppercase tracking-[0.2em] text-[#52525B] hover:text-white flex items-center gap-2 transition-colors"
        data-testid="back-to-dashboard"
      >
        <ArrowLeft size={11} strokeWidth={1.6} /> Back to dashboard
      </button>

      <div className="kicker mt-7">Build Upgrade</div>
      <h1 className="font-display text-xl md:text-3xl font-medium tracking-[-0.025em] mt-2 leading-[1.1]" data-testid="cart-title">
        {recommendation?.title || 'Procurement Cart'}
      </h1>
      {recommendation?.transformation && (
        <p className="text-[12px] text-[#52525B] mt-2 font-mono-tight tracking-tight">
          {recommendation.transformation}
        </p>
      )}

      {/* Tier toggle */}
      <div className="mt-8 flex items-center justify-between flex-wrap gap-3" data-testid="cart-tier-toggle">
        <div className="flex items-center gap-1 border border-[#09090B]/[0.08] p-0.5">
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              data-testid={`cart-tier-${t}`}
              className={`px-3 py-1.5 text-[10px] font-mono-tight uppercase tracking-[0.14em] transition-colors ${
                tier === t ? 'bg-[#09090B] text-[#FAFAFA]' : 'text-[#52525B] hover:text-white'
              }`}
            >
              {TIER_LABELS[t]} Package
            </button>
          ))}
        </div>
        {pkg && (
          <div className="text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.16em]">
            Lead time · {pkg.lead_time_weeks || 6} weeks
          </div>
        )}
      </div>

      {/* Loading */}
      {!cart && (
        <div className="mt-10 max-w-md space-y-2.5" data-testid="cart-loading-stages">
          {STAGES.map((s, i) => (
            <div key={s} className={`flex items-center gap-3 transition-opacity duration-500 ${i > stage ? 'opacity-25' : 'opacity-100'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${i < stage ? 'bg-[#09090B]' : i === stage ? 'bg-[#09090B] animate-pulse' : 'bg-white/15'}`} />
              <span className={`text-[12px] font-light ${i === stage ? 'text-[#09090B]' : 'text-[#52525B]'}`}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Cart layout */}
      {cart && pkg && (
        <div className="mt-8 grid lg:grid-cols-12 gap-5" data-testid="cart-layout">
          {/* Items */}
          <div className="lg:col-span-8 vela-card overflow-hidden" data-testid="cart-items">
            <div className="px-5 py-4 border-b border-[#09090B]/[0.08] flex items-center justify-between">
              <div className="kicker">Procurement spec</div>
              <div className="text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.14em]">
                {liveItems.length} items
              </div>
            </div>
            <ul>
              {liveItems.map((it) => (
                <li key={it.idx} data-testid={`cart-item-${it.idx}`} className="border-b border-[#09090B]/[0.08] last:border-b-0">
                  <div className="px-5 py-4 flex items-start gap-4">
                    <CategoryBadge label={it.category} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="font-display text-[14px] tracking-[-0.02em] leading-tight truncate">
                          {it.name} {it.isAlt && <span className="text-[9px] text-[#52525B] font-mono-tight uppercase tracking-[0.16em] ml-1">alt</span>}
                        </div>
                        <div className="font-mono-tight text-[13px] text-[#09090B] tracking-[-0.04em] whitespace-nowrap">
                          €{it.line_total_eur.toLocaleString()}
                        </div>
                      </div>
                      <div className="mt-1 text-[11px] text-[#52525B] font-mono-tight tracking-tight truncate">
                        {it.brand} · {it.supplier} · {it.dimensions}
                      </div>
                      <div className="mt-3 flex items-center gap-3 flex-wrap">
                        <QtyStepper qty={it.qty} onChange={(q) => setQty(it.idx, q)} testid={`qty-${it.idx}`} />
                        <span className="text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.14em]">
                          €{it.unit_price_eur.toLocaleString()} · unit
                        </span>
                        {it.alternatives?.length > 0 && (
                          <button
                            onClick={() => setOpenItem(openItem === it.idx ? null : it.idx)}
                            className="text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.14em] hover:text-white flex items-center gap-1"
                            data-testid={`alts-toggle-${it.idx}`}
                          >
                            {openItem === it.idx ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            {it.alternatives.length} alternatives
                          </button>
                        )}
                        <button
                          onClick={() => removeItem(it.idx)}
                          className="text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.14em] hover:text-white ml-auto"
                          data-testid={`remove-${it.idx}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                  {openItem === it.idx && it.alternatives?.length > 0 && (
                    <div className="px-5 pb-4 pl-[68px] grid sm:grid-cols-2 gap-2" data-testid={`alts-${it.idx}`}>
                      <button
                        onClick={() => pickAlt(it.idx, null)}
                        className={`text-left border px-3 py-2.5 transition-colors ${
                          !it.isAlt ? 'border-white/[0.18] bg-[#E4E4E7]' : 'border-[#09090B]/[0.08] hover:border-[#09090B]/[0.16]'
                        }`}
                      >
                        <div className="text-[11px] text-[#09090B] truncate">{pkg.items[it.idx].name}</div>
                        <div className="text-[10px] text-[#52525B] font-mono-tight mt-0.5">
                          {pkg.items[it.idx].brand} · €{pkg.items[it.idx].unit_price_eur.toLocaleString()} <span className="text-[#52525B]">(default)</span>
                        </div>
                      </button>
                      {it.alternatives.map((alt, ai) => (
                        <button
                          key={ai}
                          onClick={() => pickAlt(it.idx, ai)}
                          data-testid={`alt-${it.idx}-${ai}`}
                          className={`text-left border px-3 py-2.5 transition-colors ${
                            it.isAlt && it.name === alt.name ? 'border-white/[0.18] bg-[#E4E4E7]' : 'border-[#09090B]/[0.08] hover:border-[#09090B]/[0.16]'
                          }`}
                        >
                          <div className="text-[11px] text-[#09090B] truncate">{alt.name}</div>
                          <div className="text-[10px] text-[#52525B] font-mono-tight mt-0.5">
                            {alt.brand} · €{alt.unit_price_eur.toLocaleString()}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Sticky summary */}
          <aside className="lg:col-span-4 vela-card p-5 self-start lg:sticky lg:top-6" data-testid="cart-summary">
            <div className="kicker">Cart Total</div>
            <div className="font-mono-tight text-3xl tracking-[-0.04em] mt-2 text-[#09090B]" data-testid="cart-grand-total">
              €{grand.toLocaleString()}
            </div>
            <div className="mt-5 divide-y divide-white/[0.04]">
              <Row label="Subtotal" value={`€${liveSubtotal.toLocaleString()}`} testid="cart-subtotal" />
              <Row label="Shipping (est.)" value={`€${shipping.toLocaleString()}`} />
              <Row label="VAT 24%" value={`€${tax.toLocaleString()}`} />
            </div>
            <div className="mt-5 pt-4 border-t border-[#09090B]/[0.08] flex items-center justify-between">
              <div className="text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.14em]">
                {TIER_LABELS[tier]} · {pkg.lead_time_weeks}-wk lead
              </div>
              <Package size={13} strokeWidth={1.4} className="text-[#52525B]" />
            </div>

            <div className="mt-5 pt-4 border-t border-[#09090B]/[0.08] space-y-2">
              <button
                onClick={() => toast.success('Cart approved · supplier briefs queued')}
                className="vela-btn w-full justify-center"
                data-testid="approve-cart-btn"
              >
                Approve Cart <ArrowUpRight size={12} strokeWidth={1.6} />
              </button>
              <button
                onClick={() => toast('Procurement export coming next iteration')}
                className="vela-btn-ghost w-full justify-center"
              >
                Export to Supplier
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function CategoryBadge({ label }) {
  const letter = (label || 'X')[0];
  return (
    <div className="w-12 h-12 shrink-0 bg-[#E4E4E7] border border-[#09090B]/[0.08] flex items-center justify-center">
      <span className="font-mono-tight text-[10px] uppercase tracking-[0.18em] text-[#52525B]">
        {letter}
      </span>
    </div>
  );
}

function QtyStepper({ qty, onChange, testid }) {
  return (
    <div className="flex items-center border border-[#09090B]/[0.10]" data-testid={testid}>
      <button onClick={() => onChange(qty - 1)} className="px-2.5 py-1 text-[12px] text-[#52525B] hover:text-white" data-testid={`${testid}-dec`}>−</button>
      <span className="px-2 py-1 text-[12px] font-mono-tight text-[#09090B] min-w-[32px] text-center" data-testid={`${testid}-val`}>{qty}</span>
      <button onClick={() => onChange(qty + 1)} className="px-2.5 py-1 text-[12px] text-[#52525B] hover:text-white" data-testid={`${testid}-inc`}>+</button>
    </div>
  );
}

function Row({ label, value, testid }) {
  return (
    <div className="py-2.5 flex items-center justify-between" data-testid={testid}>
      <span className="text-[11px] text-[#52525B] font-mono-tight uppercase tracking-[0.14em]">{label}</span>
      <span className="text-[12px] text-[#09090B] font-mono-tight">{value}</span>
    </div>
  );
}
