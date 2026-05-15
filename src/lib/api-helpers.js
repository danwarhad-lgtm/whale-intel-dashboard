/**
 * Lightweight in-memory cache + response envelope helpers used by API routes.
 */

const cache = new Map();

export function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet(key, value, ttlMs = 60_000) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheClear() {
  const size = cache.size;
  cache.clear();
  return size;
}

export function envelope({ data, status, error = null, provider, lastUpdated }) {
  return {
    data,
    status,
    error,
    lastUpdated: lastUpdated ?? new Date().toISOString(),
    provider: provider ?? null,
  };
}
