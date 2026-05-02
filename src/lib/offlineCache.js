/**
 * Offline cache — persists API responses to localStorage so the app
 * can display stale data when the network is unavailable.
 *
 * Each entry stores { data, timestamp } so consumers can show
 * how old the cached data is.
 */

const PREFIX = 'aight_bet_cache_';

/**
 * Save data to the offline cache.
 * @param {string} key - Cache key (e.g. "markets_NBA", "scores_NBA")
 * @param {any} data - JSON-serializable data to cache
 */
export function cacheSet(key, data) {
  try {
    const entry = { data, timestamp: Date.now() };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // Quota exceeded or private browsing — fail silently
  }
}

/**
 * Read data from the offline cache.
 * @param {string} key - Cache key
 * @returns {{ data: any, timestamp: number } | null}
 */
export function cacheGet(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Get the age of a cached entry in minutes.
 * @param {string} key
 * @returns {number | null} Age in minutes, or null if no cache
 */
export function cacheAge(key) {
  const entry = cacheGet(key);
  if (!entry) return null;
  return Math.floor((Date.now() - entry.timestamp) / 60000);
}

/**
 * Clear all offline cache entries.
 */
export function cacheClear() {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // fail silently
  }
}
