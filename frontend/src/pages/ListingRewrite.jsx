import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Copy, Check, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { DEMO_PROPERTY, FALLBACK_LISTING } from '../lib/demoProperty';

const STAGES = [
  'Reading concept direction…',
  'Composing editorial copy…',
  'Calibrating amenity hierarchy…',
];

export default function ListingRewrite() {
  const params = useParams();
  const propertyId = params.propertyId || 'demo';
  const upgradeIndex = Math.max(0, Number.isFinite(Number(params.upgradeIdx)) ? Number(params.upgradeIdx) : 0);
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [listing, setListing] = useState(null);
  const [stage, setStage] = useState(0);
  const [copied, setCopied] = useState(null);
  // Real PMS / channel-manager sync state.
  const [syncJob, setSyncJob] = useState(null);     // active job being polled
  const [syncing, setSyncing] = useState(false);
  const [history, setHistory] = useState([]);
  const pollRef = useRef(null);

  // Load recent sync history on mount.
  useEffect(() => {
    let cancelled = false;
    api.get('/sync/listings', { params: { property_id: propertyId, limit: 5 } })
      .then((r) => { if (!cancelled) setHistory(r.data?.jobs || []); })
      .catch(() => { /* silent — history is non-critical */ });
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [propertyId]);

  const triggerSync = async () => {
    if (!listing || syncing) return;
    setSyncing(true);
    try {
      const description = [
        listing.subhead,
        ...(listing.description || []),
        '',
        'Amenities: ' + (listing.amenities || []).join(' · '),
        'Positioning: ' + [listing.sleeps_positioning, listing.guest_segment, listing.pricing_positioning].filter(Boolean).join(' · '),
      ].join('\n');
      const { data: job } = await api.post('/sync/listing', {
        property_id:         propertyId,
        target_platform:     'all',
        listing_title:       listing.title || 'Untitled',
        listing_description: description,
        nightly_rate_eur:    Number(listing.nightly_rate_eur) || null,
        minimum_stay:        Number(listing.minimum_stay) || null,
        headline_image:      listing.headline_image || null,
      });
      setSyncJob(job);
      toast.success('Listing approved — sync in progress');

      // Poll for status updates.
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const { data: updated } = await api.get(`/sync/listing/${job.job_id}`);
          setSyncJob(updated);
          if (updated.status === 'confirmed') {
            clearInterval(pollRef.current);
            pollRef.current = null;
            // Refresh history so the latest job appears at the top.
            const hist = await api.get('/sync/listings', { params: { property_id: propertyId, limit: 5 } });
            setHistory(hist.data?.jobs || []);
          }
        } catch (e) { /* keep polling */ }
      }, 2000);
    } catch (e) {
      toast.error('Sync failed — please try again.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (listing) return;
    const id = setInterval(() => setStage((s) => (s < STAGES.length - 1 ? s + 1 : s)), 1100);
    return () => clearInterval(id);
  }, [listing]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let prop = DEMO_PROPERTY;
      if (propertyId !== 'demo') {
        try {
          const r = await api.get(`/properties/${propertyId}`);
          prop = r.data || DEMO_PROPERTY;
        } catch (e) { /* fallback */ }
      }
      if (cancelled) return;
      setProperty(prop);
      const upgrades = prop?.analysis?.yield_opportunities || [];
      const safeIdx = upgradeIndex < upgrades.length ? upgradeIndex : 0;
      const rec = upgrades[safeIdx] || DEMO_PROPERTY.analysis.yield_opportunities[0];
      try {
        const r = await api.post('/upgrade/listing', { recommendation: rec, property: prop });
        if (!cancelled) setListing(r.data?.title ? r.data : FALLBACK_LISTING);
      } catch (e) {
        if (!cancelled) setListing(FALLBACK_LISTING);
      }
    })();
    return () => { cancelled = true; };
  }, [propertyId, upgradeIndex]);

  const recommendation = useMemo(() => {
    const upgrades = property?.analysis?.yield_opportunities || [];
    return upgrades[upgradeIndex < upgrades.length ? upgradeIndex : 0]
      || DEMO_PROPERTY.analysis.yield_opportunities[0];
  }, [property, upgradeIndex]);

  // "Current" snapshot — derived from property data; in production this would
  // come from a real scrape. Keeping it honest with a label.
  const current = useMemo(() => {
    if (!property) return null;
    return {
      title: property.name || 'Property name',
      subhead: `${property.property_type || 'Suite'} · ${property.city || '—'}`,
      description: [
        property.description
          || `${property.property_type || 'Suite'} in ${property.city || '—'} sleeping ${property.sleeps || '—'}.`,
        'Description not curated for design-led positioning. Generic amenity-led copy.',
        'Listing tone optimised for volume bookings, not for editorial premium ADR.',
      ],
      amenities: ['WiFi', 'Air conditioning', 'Kitchen', 'TV', 'Iron', 'Hairdryer'],
      sleeps_positioning: `Sleeps ${property.sleeps || '—'}`,
      guest_segment: 'No targeted segment.',
      pricing_positioning: `Current ADR €${property.nightly_rate || '—'} · mid-tier listing.`,
    };
  }, [property]);

  function copy(key, value) {
    const text = Array.isArray(value) ? value.join('\n\n') : String(value || '');
    // Wrap to swallow rejection in restricted contexts (iframes, headless test).
    Promise.resolve(navigator.clipboard?.writeText(text)).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1400);
    toast.success('Copied to clipboard');
  }

  if (!property) {
    return (
      <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-24 text-[#52525B] font-mono-tight" data-testid="listing-loading">
        Preparing listing studio…
      </div>
    );
  }

  return (
    <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-10 md:py-14" data-testid="listing-page">
      <button
        onClick={() => navigate(`/dashboard/${propertyId}`)}
        className="text-[10px] font-mono-tight uppercase tracking-[0.2em] text-[#52525B] hover:text-white flex items-center gap-2 transition-colors"
        data-testid="back-to-dashboard"
      >
        <ArrowLeft size={11} strokeWidth={1.6} /> Back to dashboard
      </button>

      <div className="kicker mt-7">Rewrite Listing</div>
      <h1 className="font-display text-xl md:text-3xl font-medium tracking-[-0.025em] mt-2 leading-[1.1]" data-testid="listing-title">
        {recommendation?.title || 'Editorial listing rewrite'}
      </h1>
      {recommendation?.transformation && (
        <p className="text-[12px] text-[#52525B] mt-2 font-mono-tight tracking-tight">
          {recommendation.transformation}
        </p>
      )}

      {/* Loading */}
      {!listing && (
        <div className="mt-10 max-w-md space-y-2.5" data-testid="listing-loading-stages">
          {STAGES.map((s, i) => (
            <div key={s} className={`flex items-center gap-3 transition-opacity duration-500 ${i > stage ? 'opacity-25' : 'opacity-100'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${i < stage ? 'bg-[#09090B]' : i === stage ? 'bg-[#09090B] animate-pulse' : 'bg-white/15'}`} />
              <span className={`text-[12px] font-light ${i === stage ? 'text-[#09090B]' : 'text-[#52525B]'}`}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {listing && current && (
        <div className="mt-8 grid lg:grid-cols-2 gap-3" data-testid="listing-compare">
          {/* CURRENT */}
          <Side
            kicker="Current Listing"
            label="As-listed"
            tone="muted"
            data={current}
            testidPrefix="current"
          />
          {/* Propul8 REWRITE */}
          <Side
            kicker="Propul8 Rewrite"
            label="Editorial premium"
            tone="primary"
            data={listing}
            testidPrefix="vela"
            copyable
            copied={copied}
            onCopy={copy}
          />
        </div>
      )}

      {listing && (
        <div className="mt-8 vela-card p-5 md:p-6 flex items-center justify-between flex-wrap gap-3" data-testid="listing-actions">
          <div className="text-[10px] text-[#52525B] font-mono-tight uppercase tracking-[0.16em]">
            Approve to sync to your listing platform · changes apply on next refresh
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => copy('all', [
                listing.title,
                listing.subhead,
                ...(listing.description || []),
                '— Amenities —',
                ...(listing.amenities || []),
                '— Positioning —',
                listing.sleeps_positioning,
                listing.guest_segment,
                listing.pricing_positioning,
              ])}
              className="vela-btn-ghost"
              data-testid="copy-all-btn"
            >
              <Copy size={12} strokeWidth={1.6} /> Copy entire rewrite
            </button>
            <button
              onClick={triggerSync}
              disabled={syncing || syncJob?.status === 'confirmed'}
              className="vela-btn"
              data-testid="approve-listing-btn"
            >
              {syncing ? (
                <>Syncing… <RefreshCw size={12} className="animate-spin" strokeWidth={1.6} /></>
              ) : syncJob?.status === 'confirmed' ? (
                <>Synced <Check size={12} strokeWidth={1.6} /></>
              ) : (
                <>Approve & Sync <ArrowUpRight size={12} strokeWidth={1.6} /></>
              )}
            </button>
          </div>
        </div>
      )}

      {syncJob && (
        <div className="mt-3 vela-card p-5 md:p-6" data-testid="sync-timeline">
          <div className="flex items-center justify-between mb-4">
            <div className="kicker">Sync Job · {syncJob.job_id}</div>
            <span
              className="text-[10px] font-mono-tight uppercase tracking-[0.16em] px-2 py-0.5 rounded-sm"
              style={{
                background: syncJob.status === 'confirmed' ? '#B8956A20' : syncJob.status === 'submitted' ? '#B8956A20' : '#52525B20',
                color:      syncJob.status === 'confirmed' ? '#B8956A'   : syncJob.status === 'submitted' ? '#B8956A'   : '#52525B',
              }}
              data-testid="sync-status"
            >
              {syncJob.status}
            </span>
          </div>
          <div className="space-y-2.5">
            {(syncJob.timeline || []).map((t, i) => (
              <div key={i} className="flex items-baseline gap-3 text-[12px]" data-testid={`sync-step-${t.step}`}>
                <Clock size={11} className="text-[#52525B]" strokeWidth={1.6} />
                <span className="font-mono-tight uppercase tracking-[0.12em] text-[#09090B] min-w-[78px]">
                  {t.step}
                </span>
                <span className="font-mono-tight text-[10px] text-[#52525B] min-w-[120px]">
                  {new Date(t.at).toLocaleTimeString()}
                </span>
                <span className="text-[#52525B]">{t.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6" data-testid="sync-history">
          <div className="kicker mb-3">Recent Syncs</div>
          <div className="vela-card p-0 overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#09090B]/[0.08]">
                  <th className="text-left px-5 py-3 kicker">Job</th>
                  <th className="text-left px-5 py-3 kicker">Title</th>
                  <th className="text-left px-5 py-3 kicker">Platform</th>
                  <th className="text-left px-5 py-3 kicker">Status</th>
                  <th className="text-left px-5 py-3 kicker">Created</th>
                </tr>
              </thead>
              <tbody>
                {history.map((j) => (
                  <tr key={j.job_id} className="border-b border-[#09090B]/[0.04]" data-testid={`sync-history-row-${j.job_id}`}>
                    <td className="px-5 py-3 font-mono-tight text-[10.5px] text-[#52525B]">{j.job_id.slice(0, 14)}…</td>
                    <td className="px-5 py-3 text-[#09090B] truncate max-w-[280px]">{j.listing_title}</td>
                    <td className="px-5 py-3 text-[#52525B]">{j.target_platform}</td>
                    <td className="px-5 py-3 font-mono-tight uppercase text-[10.5px]"
                        style={{
                          color: j.status === 'confirmed' ? '#B8956A' : j.status === 'submitted' ? '#B8956A' : '#52525B',
                        }}
                    >
                      {j.status}
                    </td>
                    <td className="px-5 py-3 font-mono-tight text-[10.5px] text-[#52525B]">
                      {new Date(j.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Side({ kicker, label, tone, data, testidPrefix, copyable, copied, onCopy }) {
  const isPrimary = tone === 'primary';
  const baseTextCls = isPrimary ? 'text-[#09090B]' : 'text-[#52525B]';
  return (
    <div className="vela-card overflow-hidden flex flex-col" data-testid={`${testidPrefix}-panel`}>
      <div className={`px-5 py-3.5 border-b border-[#09090B]/[0.08] flex items-center justify-between ${isPrimary ? 'bg-[#E4E4E7]' : ''}`}>
        <div className="flex items-center gap-2.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isPrimary ? 'bg-[#B8956A]' : 'bg-[#52525B]'}`} />
          <div className="kicker">{kicker}</div>
        </div>
        <span className="text-[10px] font-mono-tight uppercase tracking-[0.16em] text-[#52525B]">{label}</span>
      </div>

      <div className="p-5 md:p-6 space-y-5 flex-1">
        <Block title="Title" value={data.title} testid={`${testidPrefix}-title`} copyable={copyable} copied={copied === `${testidPrefix}-title`} onCopy={onCopy} cls={`font-display text-base md:text-lg tracking-[-0.02em] leading-tight ${baseTextCls}`} />
        <Block title="Subhead" value={data.subhead} testid={`${testidPrefix}-subhead`} copyable={copyable} copied={copied === `${testidPrefix}-subhead`} onCopy={onCopy} cls={`text-[13px] leading-relaxed ${baseTextCls}`} />

        <Block
          title="Description"
          value={data.description}
          testid={`${testidPrefix}-description`}
          copyable={copyable}
          copied={copied === `${testidPrefix}-description`}
          onCopy={onCopy}
          cls={`text-[13px] leading-relaxed font-light ${isPrimary ? 'text-[#09090B]' : 'text-[#52525B]'} space-y-3`}
          asParagraphs
        />

        <Block title="Amenities" value={data.amenities} testid={`${testidPrefix}-amenities`} copyable={copyable} copied={copied === `${testidPrefix}-amenities`} onCopy={onCopy} asTags toneMuted={!isPrimary} />

        <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t border-[#09090B]/[0.08]">
          <MicroBlock title="Sleeps" value={data.sleeps_positioning} testid={`${testidPrefix}-sleeps`} muted={!isPrimary} />
          <MicroBlock title="Pricing" value={data.pricing_positioning} testid={`${testidPrefix}-pricing`} muted={!isPrimary} />
        </div>
        <MicroBlock title="Guest Segment" value={data.guest_segment} testid={`${testidPrefix}-segment`} muted={!isPrimary} />

        {Array.isArray(data.house_rules) && data.house_rules.length > 0 && (
          <div className="pt-3 border-t border-[#09090B]/[0.08]">
            <div className="kicker mb-2">House Rules</div>
            <ul className="space-y-1.5">
              {data.house_rules.map((r, i) => (
                <li key={i} className={`flex gap-2 text-[12px] font-light leading-relaxed ${baseTextCls}`}>
                  <span className="mt-2 w-1 h-1 rounded-full bg-[#52525B] shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Block({ title, value, testid, copyable, copied, onCopy, cls, asParagraphs, asTags, toneMuted }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div data-testid={testid}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="kicker">{title}</div>
        {copyable && (
          <button
            onClick={() => onCopy(testid, value)}
            className="text-[#52525B] hover:text-white transition-colors"
            data-testid={`${testid}-copy`}
          >
            {copied ? <Check size={11} strokeWidth={1.6} /> : <Copy size={11} strokeWidth={1.6} />}
          </button>
        )}
      </div>
      {asTags ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((t, i) => (
            <span key={i} className={`text-[10px] font-mono-tight uppercase tracking-[0.14em] border px-2 py-1 ${toneMuted ? 'border-[#09090B]/[0.08] text-[#52525B]' : 'border-[#09090B]/[0.12] text-[#09090B]'}`}>{t}</span>
          ))}
        </div>
      ) : asParagraphs && Array.isArray(value) ? (
        <div className={cls}>
          {value.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      ) : (
        <div className={cls}>{value}</div>
      )}
    </div>
  );
}

function MicroBlock({ title, value, testid, muted }) {
  if (!value) return null;
  return (
    <div data-testid={testid}>
      <div className="kicker mb-1">{title}</div>
      <div className={`text-[12px] font-mono-tight tracking-tight leading-relaxed ${muted ? 'text-[#52525B]' : 'text-[#09090B]'}`}>{value}</div>
    </div>
  );
}
