// Shared formatters + chrome primitives for the InvestDashboard sections.

export const fmtEUR = (n) => `€${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
export const fmtPct = (n) => `${(Number(n) || 0).toFixed(1)}%`;

export function Section({ children, dark, testId }) {
  return (
    <section
      className="border-b"
      style={{
        borderColor: 'var(--inv-border)',
        background: dark ? 'var(--inv-bg-deep)' : 'transparent',
      }}
      data-testid={testId}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-16 lg:py-20">
        {children}
      </div>
    </section>
  );
}

export function Spec({ label, value }) {
  return (
    <div>
      <div className="inv-kicker">{label}</div>
      <div
        className="inv-num text-base font-medium mt-1"
        style={{ color: 'var(--inv-text-primary)' }}
      >
        {value}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="inv-kicker block mb-2">{label}</span>
      {children}
    </label>
  );
}

export function EditInputsPanel({ draft, onChange, onClose }) {
  const upd = (k, v) => onChange({ ...draft, [k]: v });
  return (
    <div
      className="border-b"
      style={{
        borderColor: 'var(--inv-border)',
        background: 'var(--inv-bg-deep)',
      }}
      data-testid="invest-edit-panel"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-8">
        <div className="flex items-center justify-between mb-6">
          <span className="inv-kicker-bronze">Confirm & Edit · Inputs</span>
          <button
            onClick={onClose}
            className="inv-btn-ghost"
            data-testid="invest-edit-close-btn"
          >
            Apply & close
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Field label="Asking price (€)">
            <input
              type="number"
              className="inv-input"
              value={draft.asking_price_eur || ''}
              onChange={(e) => upd('asking_price_eur', Number(e.target.value) || 0)}
              data-testid="edit-asking-price"
            />
          </Field>
          <Field label="Surface (m²)">
            <input
              type="number"
              className="inv-input"
              value={draft.m2 || ''}
              onChange={(e) => upd('m2', Number(e.target.value) || 0)}
              data-testid="edit-m2"
            />
          </Field>
          <Field label="Rooms">
            <input
              type="number"
              className="inv-input"
              value={draft.rooms || ''}
              onChange={(e) => upd('rooms', Number(e.target.value) || 0)}
              data-testid="edit-rooms"
            />
          </Field>
          <Field label="City">
            <input
              type="text"
              className="inv-input"
              value={draft.city || ''}
              onChange={(e) => upd('city', e.target.value)}
              data-testid="edit-city"
            />
          </Field>
          <Field label="Property type">
            <select
              className="inv-input"
              value={draft.property_type || 'Apartment'}
              onChange={(e) => upd('property_type', e.target.value)}
              data-testid="edit-property-type"
            >
              <option>Apartment</option>
              <option>Loft</option>
              <option>Studio</option>
              <option>Villa</option>
              <option>Townhouse</option>
            </select>
          </Field>
          <Field label="Renovation state">
            <select
              className="inv-input"
              value={draft.renovation_state || 'refresh'}
              onChange={(e) => upd('renovation_state', e.target.value)}
              data-testid="edit-renovation-state"
            >
              <option value="pristine">Pristine — turnkey</option>
              <option value="refresh">Refresh — light upgrade</option>
              <option value="renovation">Renovation — moderate scope</option>
              <option value="gut">Gut renovation — full scope</option>
            </select>
          </Field>
          <Field label="Year built">
            <input
              type="number"
              className="inv-input"
              value={draft.year_built || ''}
              onChange={(e) => upd('year_built', Number(e.target.value) || 0)}
              data-testid="edit-year-built"
            />
          </Field>
          <Field label="Elevator">
            <select
              className="inv-input"
              value={draft.elevator ? 'yes' : 'no'}
              onChange={(e) => upd('elevator', e.target.value === 'yes')}
              data-testid="edit-elevator"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </Field>
        </div>
      </div>
    </div>
  );
}
