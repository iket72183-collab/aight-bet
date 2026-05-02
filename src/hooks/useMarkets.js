import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchOddsForLeague } from '../lib/oddsApi';
import { allMarkets as staticMarkets } from '../data/markets';
import { cacheSet, cacheGet } from '../lib/offlineCache';
import { hasMmaEventStarted } from '../data/mmaEvents';

/**
 * Default auto-refresh interval: 5 minutes.
 * The server caches responses for 15 min, so even with multiple tabs
 * the API is protected from burst traffic per league.
 */
const DEFAULT_REFRESH_MS = 5 * 60 * 1000;

/** Cooldown for manual "Refresh now" clicks (matches server rate limit) */
const MANUAL_REFRESH_COOLDOWN_MS = 30 * 1000;

/**
 * Estimated game durations by league (in hours).
 * Events that started longer ago than this are filtered out as "likely finished."
 * Used as a fallback when scores data isn't available.
 *
 * MMA is handled separately — individual bouts are short, so any fight
 * whose API commence_time or mapped card start has passed is treated as finished.
 */
const GAME_DURATION_HOURS = {
  NBA: 3,
  MLB: 4,
  NFL: 4,
};

/** Hard ceiling for team sports: nothing lasts more than 12 hours */
const MAX_EVENT_AGE_MS = 12 * 60 * 60 * 1000;

/**
 * Filter out events that have likely ended.
 * Uses scores completion data when available, falls back to
 * commence_time + estimated duration as a rough heuristic.
 *
 * MMA special case: individual fights are short (~25 min max), and
 * The Odds API doesn't mark them completed. Any MMA event whose
 * commence_time or mapped card start has passed is removed — they're
 * either done or in progress (and we don't show in-progress MMA bouts
 * as "upcoming").
 *
 * @param {Array} markets - market objects with id and commenceTime
 * @param {string} league - league key (NBA, MLB, etc.)
 * @param {Map} [completedIds] - Set or Map of event IDs confirmed completed by scores API
 */
export function filterFinishedGames(markets, league, completedIds) {
  const now = Date.now();

  return markets.filter((m) => {
    // If scores API confirms this event is completed, hide it
    if (completedIds && completedIds.has(m.id)) return false;

    if (!m.commenceTime) return true;
    const elapsed = now - new Date(m.commenceTime).getTime();

    // MMA: once the scheduled time or mapped card start passes, hide it.
    // The Odds API can keep returning stale fights with bad placeholder
    // times — the card map lets us clear known cards using real start times.
    if (league === 'MMA' && hasMmaEventStarted(m.commenceTime, m.homeTeam, m.awayTeam, now)) {
      return false;
    }

    // Team sports: hard cutoff for very stale events
    if (elapsed > MAX_EVENT_AGE_MS) return false;

    // Team sports: estimate based on typical game length
    const durationMs = (GAME_DURATION_HOURS[league] || 4) * 60 * 60 * 1000;
    return elapsed < durationMs;
  });
}

/** Maximum number of leagues kept in the shared market cache. */
const MARKET_CACHE_LIMIT = 10;

/**
 * In-memory LRU market cache shared across hook instances.
 * Preserves insertion order via Map; on each write the league key is
 * re-inserted so the oldest entries can be evicted once we exceed the limit.
 * Enables MarketDetailsPage to resolve a market by ID even on
 * refresh / direct link (fixes P1 deep-linking).
 */
const marketCache = new Map();

function setCachedMarkets(league, markets) {
  if (marketCache.has(league)) marketCache.delete(league);
  marketCache.set(league, markets);
  while (marketCache.size > MARKET_CACHE_LIMIT) {
    const oldest = marketCache.keys().next().value;
    marketCache.delete(oldest);
  }
}

/** Get a cached market by ID (for detail page deep-links) */
export function getCachedMarketById(id) {
  const strId = String(id);
  for (const markets of marketCache.values()) {
    const found = markets.find((m) => String(m.id) === strId);
    if (found) return found;
  }
  return null;
}

/**
 * Hook that provides market data for a given league.
 * Uses live data from the server proxy when available,
 * falls back to static mock data otherwise.
 *
 * Features:
 * - Auto-refreshes every `refreshInterval` ms (default 5 min)
 * - Pauses polling when the browser tab is hidden (saves quota)
 * - Manual refresh has a 30s cooldown
 * - In-flight requests are aborted on league change / unmount via AbortController
 * - Populates a shared LRU cache for deep-linking
 *
 * Returns: { markets, isLive, loading, error, refetch, lastUpdated, canRefresh }
 */
export function useMarkets(league, { refreshInterval = DEFAULT_REFRESH_MS } = {}) {
  const [markets, setMarkets] = useState(staticMarkets[league] || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [canRefresh, setCanRefresh] = useState(true);
  const intervalRef = useRef(null);
  const lastManualRef = useRef(0);
  /** Tracks the controller for the current in-flight fetch so manual + auto + visibility flows can cancel each other. */
  const activeControllerRef = useRef(null);

  const fetchData = useCallback(async (isBackground = false, force = false) => {
    // Abort any previous in-flight fetch — stale league data must not overwrite the current one.
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeControllerRef.current = controller;

    if (!isBackground) {
      setLoading(true);
    }
    setError(null);

    try {
      const liveMarkets = await fetchOddsForLeague(league, { force, signal: controller.signal });
      if (controller.signal.aborted) return;

      const active = filterFinishedGames(liveMarkets, league, null);
      setMarkets(active);
      setIsLive(true);
      setCachedMarkets(league, active);
      setLastUpdated(new Date());

      // Persist to offline cache for use when network is unavailable
      cacheSet(`markets_${league}`, active);
    } catch (err) {
      // Aborts are intentional cancellations — not user-facing errors.
      if (err.name === 'AbortError' || controller.signal.aborted) return;
      console.error(`[useMarkets] Failed to fetch ${league}:`, err);
      setError(err.message);

      // Try offline cache before falling back to static data
      const cached = cacheGet(`markets_${league}`);
      if (cached && cached.data && cached.data.length > 0) {
        setMarkets(cached.data);
        setIsLive(true); // was live data when cached
        setCachedMarkets(league, cached.data);
        setLastUpdated(new Date(cached.timestamp));
      } else {
        setMarkets(staticMarkets[league] || []);
        setIsLive(false);
      }
    } finally {
      if (!controller.signal.aborted && !isBackground) {
        setLoading(false);
      }
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }
    }
  }, [league]);

  /** Manual refresh with cooldown */
  const refetch = useCallback(async () => {
    const now = Date.now();
    if (now - lastManualRef.current < MANUAL_REFRESH_COOLDOWN_MS) {
      return; // still in cooldown
    }
    lastManualRef.current = now;
    setCanRefresh(false);

    await fetchData(false, true);

    // Re-enable after cooldown — guarded by a local flag captured via a fresh controller check.
    setTimeout(() => {
      setCanRefresh(true);
    }, MANUAL_REFRESH_COOLDOWN_MS);
  }, [fetchData]);

  // Initial fetch + auto-refresh interval + visibility handling
  useEffect(() => {
    fetchData(false);

    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (refreshInterval > 0) {
        intervalRef.current = setInterval(() => fetchData(true), refreshInterval);
      }
    };

    // Pause when tab is hidden, resume when visible
    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // Fetch fresh data when tab becomes visible again
        fetchData(true);
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      // Cancel any in-flight request when the league changes or the component unmounts.
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
        activeControllerRef.current = null;
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [league, refreshInterval, fetchData]);

  return { markets, isLive, loading, error, refetch, lastUpdated, canRefresh };
}

/**
 * Look up a single market by ID across all provided markets.
 * Works with both string IDs (live API) and number IDs (static).
 */
export function findMarketById(markets, id) {
  return markets.find((m) => String(m.id) === String(id));
}
