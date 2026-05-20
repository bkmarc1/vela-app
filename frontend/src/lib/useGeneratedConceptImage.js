import { useEffect, useState } from 'react';
import api from './api';

// In-memory cache so navigating away/back doesn't refetch.
const _memCache = new Map();

/**
 * Returns { src, loading } — src is the curated placeholder URL until the
 * real Gemini-generated image arrives. Cached in-memory across mounts.
 */
export function useGeneratedConceptImage(concept, property) {
  const placeholder = concept?.hero;
  const cacheKey = [
    'v4-strategic',
    concept?.key || '',
    property?.city || '',
    property?.property_type || '',
    concept?.name || '',
  ].join('|');

  const cached = _memCache.get(cacheKey);
  const [src, setSrc] = useState(cached || placeholder);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (!concept) return;
    if (_memCache.has(cacheKey)) {
      setSrc(_memCache.get(cacheKey));
      setLoading(false);
      return;
    }
    setLoading(true);
    setSrc(placeholder);
    let cancelled = false;
    (async () => {
      // Retry up to 2 times — Nano Banana can 502 on cold concurrent loads.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await api.post('/visualize/image', { concept, property });
          const url = res.data?.data_url;
          if (cancelled) return;
          if (url) {
            _memCache.set(cacheKey, url);
            setSrc(url);
            setLoading(false);
            return;
          }
        } catch (e) {
          if (cancelled) return;
          if (attempt === 1) break;
          // Backoff before retry — gives upstream time to recover.
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return { src, loading };
}
