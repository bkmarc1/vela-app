// Propul8 · Add Owned Asset — simple owner-input flow (iter67).
// Per user mandate: keep both. /invest is for acquisition due-diligence;
// this form is for the owned-asset cockpit.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Sparkles, ArrowRight } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GOLD = '#B8956A';
const STONE = '#F5F1EA';
const STONE_LINE = '#E8E0D2';

export default function AddAsset() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', city: '', neighborhood: '', property_type: 'Apartment',
    sqm: 0, condition: 'Good',
    purchase_price_eur: 0, purchase_date: '',
    current_value_eur: 0, valuation_source: 'manual',
    annual_gross_eur: 0, annual_net_eur: 0,
    occupancy_pct: 0, adr_eur: 0,
    mortgage_balance_eur: 0, management_fee_pct: 0,
    management_company: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const analyze = async () => {
    if (!form.title || !form.city || !form.purchase_price_eur) {
      setError('Title, city, and purchase price are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      // Derive current value if missing
      if (!payload.current_value_eur) payload.current_value_eur = payload.purchase_price_eur;
      const res = await axios.post(`${API}/portfolio-intel/asset`, payload);
      navigate(`/asset/${encodeURIComponent(res.data.id)}`);
    } catch (e) {
      setError(e.response?.data?.detail || 'Save failed. Please retry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="add-asset-page" style={{ background: '#FAFAFA', minHeight: '100vh' }}>
      <div className="max-w-[840px] mx-auto px-6 md:px-12 pt-12 pb-32">
        <button
          type="button" onClick={() => navigate('/portfolio')}
          className="inline-flex items-center gap-1.5 text-[12px] mb-8"
          style={{ color: '#52525B', cursor: 'pointer', background: 'none', border: 'none' }}
          data-testid="add-asset-back"
        >
          <ArrowLeft size={13} strokeWidth={1.8} /> Back to Portfolio
        </button>

        <header className="mb-10">
          <span className="ts-kicker" data-testid="add-asset-kicker">Add Owned Asset</span>
          <h1 className="ts-h1 mt-5" data-testid="add-asset-title" style={{ fontSize: 'clamp(34px, 4vw, 48px)' }}>
            Tell Propul8 about your asset.
          </h1>
          <p className="ts-body mt-5 max-w-[560px]">
            Just the basics. We'll generate the asset score, valuation estimate,
            yield, liquidity signal, and the best action plan automatically.
          </p>
        </header>

        <form
          className="space-y-10"
          onSubmit={(e) => { e.preventDefault(); analyze(); }}
          data-testid="add-asset-form"
        >
          <Section title="Asset basics">
            <Field label="Property name">
              <input className="vela-input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Athens Koukaki STR Apartment" data-testid="field-title" />
            </Field>
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="City">
                <input className="vela-input" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Athens" data-testid="field-city" />
              </Field>
              <Field label="Neighborhood">
                <input className="vela-input" value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} placeholder="Koukaki" data-testid="field-neighborhood" />
              </Field>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              <Field label="Type">
                <select className="vela-input" value={form.property_type} onChange={(e) => set('property_type', e.target.value)} data-testid="field-property-type">
                  <option>Apartment</option><option>Studio</option><option>Townhouse</option>
                  <option>Villa</option><option>Loft</option><option>Cabin</option>
                </select>
              </Field>
              <Field label="Size (sqm)">
                <input type="number" className="vela-input" value={form.sqm} onChange={(e) => set('sqm', Number(e.target.value))} data-testid="field-sqm" />
              </Field>
              <Field label="Condition">
                <select className="vela-input" value={form.condition} onChange={(e) => set('condition', e.target.value)} data-testid="field-condition">
                  <option>Renovated</option><option>Good</option><option>Average</option>
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Purchase">
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Purchase price (€)" required>
                <input type="number" className="vela-input tabular-nums" value={form.purchase_price_eur} onChange={(e) => set('purchase_price_eur', Number(e.target.value))} data-testid="field-purchase-price" />
              </Field>
              <Field label="Purchase date">
                <input type="date" className="vela-input" value={form.purchase_date} onChange={(e) => set('purchase_date', e.target.value)} data-testid="field-purchase-date" />
              </Field>
            </div>
          </Section>

          <Section title="Current value">
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Today's estimated value (€)">
                <input type="number" className="vela-input tabular-nums" value={form.current_value_eur} onChange={(e) => set('current_value_eur', Number(e.target.value))} data-testid="field-current-value" />
              </Field>
              <Field label="Confidence">
                <select className="vela-input" value={form.valuation_source} onChange={(e) => set('valuation_source', e.target.value)} data-testid="field-confidence">
                  <option value="comparable_sales">Comparable sales — High</option>
                  <option value="manual">Manual estimate — Medium</option>
                  <option value="rental_income">Rental income method — Medium</option>
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Rental performance">
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Annual gross income (€)">
                <input type="number" className="vela-input tabular-nums" value={form.annual_gross_eur} onChange={(e) => set('annual_gross_eur', Number(e.target.value))} data-testid="field-annual-gross" />
              </Field>
              <Field label="Annual net income (€)">
                <input type="number" className="vela-input tabular-nums" value={form.annual_net_eur} onChange={(e) => set('annual_net_eur', Number(e.target.value))} data-testid="field-annual-net" />
              </Field>
              <Field label="Occupancy %">
                <input type="number" className="vela-input tabular-nums" value={form.occupancy_pct} onChange={(e) => set('occupancy_pct', Number(e.target.value))} data-testid="field-occupancy" />
              </Field>
              <Field label="ADR (€/night)">
                <input type="number" className="vela-input tabular-nums" value={form.adr_eur} onChange={(e) => set('adr_eur', Number(e.target.value))} data-testid="field-adr" />
              </Field>
            </div>
          </Section>

          <Section title="Financing & management">
            <div className="grid md:grid-cols-3 gap-5">
              <Field label="Mortgage balance (€)">
                <input type="number" className="vela-input tabular-nums" value={form.mortgage_balance_eur} onChange={(e) => set('mortgage_balance_eur', Number(e.target.value))} data-testid="field-mortgage" />
              </Field>
              <Field label="Mgmt fee %">
                <input type="number" className="vela-input tabular-nums" value={form.management_fee_pct} onChange={(e) => set('management_fee_pct', Number(e.target.value))} data-testid="field-mgmt-fee" />
              </Field>
              <Field label="Management company">
                <input className="vela-input" value={form.management_company} onChange={(e) => set('management_company', e.target.value)} placeholder="Self-managed" data-testid="field-mgmt-company" />
              </Field>
            </div>
          </Section>

          {error && (
            <div className="px-4 py-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 10 }}>
              <p className="text-[13px]" style={{ color: '#EF4444' }} data-testid="add-asset-error">{error}</p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 text-[14px]"
              style={{
                background: GOLD, color: '#FFFFFF', border: 'none',
                borderRadius: 999, fontFamily: 'Inter, sans-serif', fontWeight: 500,
                cursor: saving ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(184,149,106,0.22)',
              }}
              data-testid="add-asset-submit"
            >
              {saving ? 'Analyzing…' : 'Analyze Asset'} <Sparkles size={13} strokeWidth={2} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section
      className="p-6 lg:p-8 space-y-5"
      style={{ background: '#FFFFFF', border: `1px solid ${STONE_LINE}`, borderRadius: 14 }}
    >
      <div className="ts-kicker">{title}</div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, children, required }) {
  return (
    <label className="block">
      <span className="ts-kicker block mb-2" style={{ fontSize: 10, color: '#52525B' }}>
        {label}
        {required && <span style={{ color: GOLD }}> *</span>}
      </span>
      {children}
    </label>
  );
}
