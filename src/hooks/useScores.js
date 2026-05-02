import { useState, useEffect, useRef, useCallback } from 'react';
import { cacheSet, cacheGet } from '../lib/offlineCache';

/**
 * Scores API client + polling hook.
 *
 * Fetches live scores from our Express proxy at /api/scores/:league.
 * Polls every 60s but ONLY when at least one market is live — if no
 * games are in progress, we skip the call entirely to save quota.
 *
 * Returns a Map<eventId, { home, away }> where home/away are score strings.
 */

const PROXY_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds

/**
 * Fetch scores for a league from the server proxy.
 */
async function fetchScores(league, signal) {
  const res = await fetch(`${PROXY_BASE}/api/scores/${league}`, { signal });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

/**
 * Build a lookup map from event ID → score data.
 * The Odds API scores response shape:
 *   { id, scores: [{ name: "Team A", score: "102" }, ...], completed, last_update }
 */
function buildScoreMap(events) {
  const map = new Map();
  for (const event of events) {
    if (!event.scores || event.scores.length < 2) continue;
    const home = event.scores.find((s) => s.name === event.home_team);
    const away = event.scores.find((s) => s.name === event.away_team);
    map.set(event.id, {
      homeScore: home?.score ?? '—',
      awayScore: away?.score ?? '—',
      completed: event.completed || false,
      lastUpdate: event.last_update || null,
    });
  }
  return map;
}

/**
 * Format a last_update ISO timestamp into a human-friendly relative string.
 * e.g. "Just now", "2m ago", "15m ago", "1h ago"
 */
export function formatScoreAge(lastUpdate) {
  if (!lastUpdate) return null;
  const diff = Date.now() - new Date(lastUpdate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

/**
 * Hook: provides live scores for a given league.
 *
 * @param {string} league - NBA, MLB, NFL, or MMA
 * @param {boolean} hasLiveGames - pass true when at least one market.isLive;
 *                                 polling is paused when false.
 * @returns {{ scores: Map, loading: boolean }}
 *   scores is a Map<eventId, { homeScore, awayScore, completed }>
 */
export function useScores(league, hasLiveGames = false) {
  const [scores, setScores] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);
  const controllerRef = useRef(null);

  const load = useCallback(async (bg = false) => {
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    if (!bg) setLoading(true);

    try {
      const events = await fetchScores(league, controller.signal);
      if (controller.signal.aborted) return;
      const scoreMap = buildScoreMap(events);
      setScores(scoreMap);
      // Cache the raw events for offline use
      cacheSet(`scores_${league}`, events);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(`[useScores] ${league}:`, err.message);
      // Fall back to cached scores when offline
      const cached = cacheGet(`scores_${league}`);
      if (cached && cached.data) {
        setScores(buildScoreMap(cached.data));
      }
    } finally {
      if (!controller.signal.aborted && !bg) setLoading(false);
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [league]);

  useEffect(() => {
    // Only fetch when there are live games
    if (!hasLiveGames) {
      setScores(new Map());
      return;
    }

    load(false);

    intervalRef.current = setInterval(() => load(true), POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      } else {
        load(true);
        intervalRef.current = setInterval(() => load(true), POLL_INTERVAL_MS);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (controllerRef.current) { controllerRef.current.abort(); controllerRef.current = null; }
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [league, hasLiveGames, load]);

  return { scores, loading };
}
