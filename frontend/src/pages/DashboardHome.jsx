// Propul8 · MARKET TRENDS — live news dashboard.
//
// Per user mandate: "Market trends should be refreshed, on a live basis."
// - Auto-poll /api/dashboard/news every 30 seconds.
// - LIVE indicator with last-updated timestamp + manual refresh button (spins).
// - New headlines fade in with a subtle background flash.

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ExternalLink, Compass, RotateCw, Activity } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const POLL_MS = 30000; // 30s


function fmtRelativeTime(iso) {
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 60)         return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)          return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)          return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}


function fmtSecondsAgo(ts) {
  if (!ts) return '—';
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}


export default function DashboardHome() {
  const [news, setNews] = useState({ items: [], loading: true });
  const [comp, setComp] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  // bump every second so the "updated Xs ago" label stays live.
  const [tickKey, setTickKey] = useState(0);
  // track previous URLs so newly arrived headlines can flash subtly.
  const seenUrlsRef = useRef(new Set());
  const [newUrls, setNewUrls] = useState(new Set());

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setRefreshing(true);
    try {
      const [n, c] = await Promise.all([
        axios.get(`${API}/dashboard/news?limit=10`).catch(() => ({ data: { items: [] } })),
        axios.get(`${API}/dashboard/competition`).catch(() => ({ data: null })),
      ]);
      const items = n.data?.items || [];
      // detect newly arrived items
      const incomingUrls = new Set(items.map((i) => i.url));
      const fresh = new Set();
      items.forEach((i) => {
        if (!seenUrlsRef.current.has(i.url)) fresh.add(i.url);
      });
      seenUrlsRef.current = incomingUrls;
      setNews({ items, loading: false });
      setComp(c.data);
      setLastUpdated(Date.now());
      if (fresh.size && seenUrlsRef.current.size > fresh.size) {
        // skip the very first load — only flash on subsequent polls.
        setNewUrls(fresh);
        setTimeout(() => setNewUrls(new Set()), 2200);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  // initial load + poll loop
  useEffect(() => {
    fetchData({ silent: true });
    const id = setInterval(() => fetchData({ silent: true }), POLL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  // 1s ticker so "updated Xs ago" stays accurate
  useEffect(() => {
    const id = setInterval(() => setTickKey((k) => k + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const headline = news.items[0] || null;
  const restItems = news.items.slice(1);

  return (
    <div data-testid="dashboard-home" style={{ background: '#FAFAFA', minHeight: '100vh' }}>
      <div className="max-w-[1200px] mx-auto px-6 md:px-12 pt-24 pb-32">

        {/* Header */}
        <header className="mb-16">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="ts-kicker" data-testid="dashboard-kicker">
                  Propul8 · Market Trends
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5"
                  style={{
                    background: 'rgba(16,185,129,0.10)',
                    border: '1px solid rgba(16,185,129,0.30)',
                    borderRadius: 999,
                  }}
                  data-testid="dashboard-live-pill"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: '#10B981', animation: 'pulse 1.6s ease-in-out infinite' }}
                  />
                  <span
                    className="font-mono-tight text-[10px]"
                    style={{ color: '#10B981', fontWeight: 600 }}
                  >
                    LIVE
                  </span>
                </span>
              </div>
              <h1 className="ts-h1 mt-5" data-testid="dashboard-title">
                Athens real estate — live.
              </h1>
              <p className="ts-body mt-6 max-w-[600px]">
                Headlines, regulation, demand signals — refreshed every 30 seconds from Greek and EU sources.
              </p>
            </div>

            {/* Live refresh control */}
            <div className="flex items-center gap-3" data-testid="dashboard-refresh-control">
              <span
                key={tickKey}
                className="font-mono-tight text-[11px]"
                style={{ color: '#52525B' }}
                data-testid="dashboard-last-updated"
              >
                Updated {fmtSecondsAgo(lastUpdated)}
              </span>
              <button
                type="button"
                onClick={() => fetchData()}
                disabled={refreshing}
                className="inline-flex items-center justify-center w-9 h-9 transition-all"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: 999,
                  color: '#B8956A',
                  cursor: refreshing ? 'wait' : 'pointer',
                }}
                aria-label="Refresh market trends"
                data-testid="dashboard-refresh-btn"
              >
                <RotateCw
                  size={14}
                  strokeWidth={2}
                  style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}
                />
              </button>
            </div>
          </div>
        </header>

        {/* AI summary band — minimal */}
        {comp?.summary && (
          <section
            className="mb-12 p-7 flex items-start gap-4"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: 16,
            }}
            data-testid="dashboard-summary"
          >
            <div
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center"
              style={{ background: 'rgba(184,149,106,0.08)', borderRadius: 999 }}
            >
              <Compass size={14} strokeWidth={1.6} style={{ color: '#B8956A' }} />
            </div>
            <div>
              <span className="ts-kicker">
                Propul8 Market Read
              </span>
              <p
                className="ts-body mt-2"
                style={{ color: '#09090B', fontSize: 16 }}
                data-testid="dashboard-summary-text"
              >
                {comp.summary}
              </p>
            </div>
          </section>
        )}

        {/* HEADLINE story (latest article highlighted) */}
        {!news.loading && headline && (
          <a
            href={headline.url}
            target="_blank"
            rel="noreferrer"
            className="block mb-12 p-8 lg:p-10 transition-all news-card"
            style={{
              background: newUrls.has(headline.url) ? 'rgba(184,149,106,0.04)' : '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: 16,
              transition: 'background-color 1.5s ease',
            }}
            data-testid="dashboard-headline-story"
          >
            <div className="flex items-center gap-3 mb-5 font-mono-tight text-[10.5px]">
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5"
                style={{
                  background: 'rgba(184,149,106,0.10)',
                  border: '1px solid rgba(184,149,106,0.25)',
                  borderRadius: 999,
                  color: '#B8956A', fontWeight: 600,
                }}
              >
                <Activity size={9} strokeWidth={1.8} />
                Lead Story
              </span>
              <span style={{ color: '#B8956A', fontWeight: 600 }}>{headline.source}</span>
              <span style={{ color: '#52525B' }}>{fmtRelativeTime(headline.published_at)}</span>
            </div>
            <h2 className="ts-h2" style={{ fontSize: 'clamp(22px, 2.8vw, 32px)' }}>
              {headline.title}
            </h2>
            {headline.description && (
              <p className="ts-body mt-4 max-w-[820px]">
                {headline.description}
              </p>
            )}
            <div
              className="mt-6 inline-flex items-center gap-1.5 text-[12px]"
              style={{ color: '#B8956A', fontWeight: 500 }}
            >
              Read full story
              <ExternalLink size={12} strokeWidth={1.8} />
            </div>
          </a>
        )}

        {/* MORE HEADLINES */}
        <section data-testid="dashboard-news">
          <div className="mb-10">
            <span className="ts-kicker">More from the market</span>
            <h2 className="ts-h2 mt-3">
              Today's headlines.
            </h2>
          </div>

          {news.loading ? (
            <NewsSkeletons />
          ) : restItems.length === 0 ? (
            <div
              className="p-8 text-center"
              style={{ background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: 16 }}
            >
              <p className="ts-small">
                No more headlines right now — refreshing every 30 seconds.
              </p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-5">
              {restItems.map((item, i) => (
                <a
                  key={item.url + i}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-6 transition-all news-card"
                  style={{
                    background: newUrls.has(item.url) ? 'rgba(184,149,106,0.04)' : '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    borderRadius: 16,
                    transition: 'background-color 1.5s ease, border-color 0.2s ease',
                  }}
                  data-testid={`dashboard-news-card-${i}`}
                >
                  <div className="flex items-center justify-between mb-3 font-mono-tight text-[10.5px]">
                    <span style={{ color: '#B8956A', fontWeight: 600 }}>{item.source}</span>
                    <span style={{ color: '#52525B' }}>{fmtRelativeTime(item.published_at)}</span>
                  </div>
                  <h3 className="ts-h3" style={{ fontSize: 17 }}>
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="ts-small mt-3 line-clamp-3">
                      {item.description}
                    </p>
                  )}
                  <div
                    className="mt-5 inline-flex items-center gap-1.5 text-[11.5px]"
                    style={{ color: '#B8956A', fontWeight: 500 }}
                  >
                    Read full story
                    <ExternalLink size={11} strokeWidth={1.8} />
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Hint that competitive context lives in Portfolio */}
        <section className="mt-20 text-center" data-testid="dashboard-to-portfolio-hint">
          <p className="ts-kicker mb-4" style={{ color: '#52525B' }}>
            Want to see how your assets compare?
          </p>
          <a
            href="/portfolio/demo"
            className="inline-flex items-center gap-2 px-5 py-3 text-[13px]"
            style={{
              background: '#B8956A',
              color: '#FFFFFF',
              borderRadius: 999,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              boxShadow: '0 4px 14px rgba(184,149,106,0.18)',
            }}
          >
            Open Portfolio — your live signals →
          </a>
        </section>
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
        @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}


function NewsSkeletons() {
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {[0,1,2,3].map((i) => (
        <div
          key={i}
          className="p-6 space-y-3 animate-pulse"
          style={{ background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: 16 }}
        >
          <div style={{ background: '#F4F4F5', borderRadius: 999, height: 8, width: '40%' }} />
          <div style={{ background: '#F4F4F5', borderRadius: 4,   height: 18, width: '92%' }} />
          <div style={{ background: '#F4F4F5', borderRadius: 4,   height: 18, width: '78%' }} />
          <div style={{ background: '#F4F4F5', borderRadius: 999, height: 8, width: '60%' }} />
        </div>
      ))}
    </div>
  );
}
