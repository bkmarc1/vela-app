export default function MetricCard({ label, value, suffix, hint, testid }) {
  return (
    <div data-testid={testid} className="vela-card p-6 flex flex-col justify-between min-h-[140px]">
      <div className="kicker">{label}</div>
      <div className="mt-4">
        <div className="font-mono-tight text-3xl md:text-4xl font-medium text-[#09090B]">
          {value}
          {suffix && <span className="text-[#52525B] text-2xl ml-1">{suffix}</span>}
        </div>
        {hint && <div className="text-xs text-[#52525B] mt-2 font-mono-tight">{hint}</div>}
      </div>
    </div>
  );
}
