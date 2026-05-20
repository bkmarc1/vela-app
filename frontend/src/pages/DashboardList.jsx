import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { ArrowUpRight, Plus } from 'lucide-react';

export default function DashboardList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/properties');
        setItems(res.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20" data-testid="dashboard-list-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="kicker">Your portfolio</div>
          <h1 className="font-display text-4xl md:text-5xl font-medium tracking-tighter mt-3">Dashboard</h1>
        </div>
        <Link to="/analyze" data-testid="new-analysis-btn" className="vela-btn">
          New Analysis <Plus size={14} strokeWidth={1.6} />
        </Link>
      </div>

      <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          to="/dashboard/demo"
          data-testid="card-demo"
          className="vela-card p-7 flex flex-col justify-between min-h-[180px]"
        >
          <div>
            <div className="kicker">Sample asset</div>
            <div className="font-display text-xl mt-3 tracking-tight">Cycladic Boutique Suite</div>
            <div className="text-xs text-[#52525B] mt-1 font-mono-tight">Koufonisia, Greece</div>
          </div>
          <div className="text-xs text-[#52525B] mt-6 flex items-center gap-1">
            Open dashboard <ArrowUpRight size={12} />
          </div>
        </Link>

        {loading && (
          <div className="vela-card p-7 text-sm text-[#52525B] font-mono-tight">Loading…</div>
        )}

        {!loading && items.length === 0 && (
          <div className="vela-card p-7 text-sm text-[#52525B]">
            <div className="kicker mb-3">Empty</div>
            No assets yet. Run your first analysis to populate this dashboard.
          </div>
        )}

        {items.map((p) => (
          <Link
            key={p.property_id}
            to={`/dashboard/${p.property_id}`}
            data-testid={`card-${p.property_id}`}
            className="vela-card p-7 flex flex-col justify-between min-h-[180px]"
          >
            <div>
              <div className="kicker">{p.property_type || 'Asset'}</div>
              <div className="font-display text-xl mt-3 tracking-tight">{p.name}</div>
              <div className="text-xs text-[#52525B] mt-1 font-mono-tight">{p.city}</div>
            </div>
            <div className="flex items-center justify-between mt-6 text-xs">
              <div className="text-[#52525B] font-mono-tight">
                {p.analysis ? `Score ${p.analysis.metrics?.asset_score}` : 'Pending'}
              </div>
              <span className="text-[#52525B] flex items-center gap-1">
                Open <ArrowUpRight size={12} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
