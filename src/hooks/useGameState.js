import { useState, useEffect, useRef, useCallback } from 'react';
import { cacheSet, cacheGet } from '../lib/offlineCache';

/**
 * Fetches game period/clock state from the ESPN scoreboard proxy.
 *
 * Returns a Map<oddsApiEventId, { detail, state, period, clock }>
 * by matching ESPN events to Odds API markets via team names.
 *
 * Polls every 30s when live games exist.
 */

const PROXY_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
const POLL_INTERVAL_MS = 30 * 1000; // 30 seconds — ESPN data is fresher
const EMPTY_GAME_STATES = new Map();

function buildMarketsKey(markets) {
  return markets
    .map((market) => `${market.id}:${market.homeTeam || ''}:${market.awayTeam || ''}`)
    .join('|');
}

/**
 * Normalize a team name for fuzzy matching.
 * ESPN uses "LA Clippers" while Odds API uses "Los Angeles Clippers", etc.
 */
function normalizeTeam(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/^la /, 'los angeles ')
    .replace(/^ny /, 'new york ')
    .replace(/^sf /, 'san francisco ')
    .trim();
}

/**
 * Try to match an ESPN game to an Odds API market by team names.
 * Returns the market ID if matched, null otherwise.
 */
function matchGame(espnGame, markets) {
  const espnHome = normalizeTeam(espnGame.homeTeam);
  const espnAway = normalizeTeam(espnGame.awayTeam);

  for (const market of markets) {
    const mHome = normalizeTeam(market.homeTeam);
    const mAway = normalizeTeam(market.awayTeam);

    // Match if both team names align (home/away might be swapped in some edge cases)
    if (
      (espnHome.includes(mHome) || mHome.includes(espnHome)) &&
      (espnAway.includes(mAway) || mAway.includes(espnAway))
    ) {
      return market.id;
    }
    // Try swapped
    if (
      (espnHome.includes(mAway) || mAway.includes(espnHome)) &&
      (espnAway.includes(mHome) || mHome.includes(espnAway))
    ) {
      return market.id;
    }
  }
  return null;
}

async function fetchGameState(league, signal) {
  const res = await fetch(`${PROXY_BASE}/api/gamestate/${league}`, { signal });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

/**
 * Hook: provides game state (period, clock) for live markets.
 *
 * @param {string} league - NBA, MLB, NFL, MMA
 * @param {Array} markets - current markets array (used for matching)
 * @param {boolean} hasLiveGames - only polls when true
 * @returns {{ gameStates: Map<marketId, { detail, state, period, clock }> }}
 */
export function useGameState(league, markets, hasLiveGames = false) {
  const [gameStates, setGameStates] = useState(new Map());
  const intervalRef = useRef(null);
  const controllerRef = useRef(null);
  const marketsRef = useRef(markets);
  const marketsKey = buildMarketsKey(markets);
  const hasMarkets = marketsKey.length > 0;

  useEffect(() => {
    marketsRef.current = markets;
  }, [markets]);

  const load = useCallback(async () => {
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const espnGames = await fetchGameState(league, controller.signal);
      if (controller.signal.aborted) return;

      const map = new Map();
      for (const game of espnGames) {
        const marketId = matchGame(game, marketsRef.current);
        if (marketId) {
          map.set(marketId, {
            detail: game.detail,
            state: game.state,
            period: game.period,
            clock: game.clock,
            completed: game.completed,
          });
        }
      }
      setGameStates(map);
      cacheSet(`gamestate_${league}`, Array.from(map.entries()));
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(`[useGameState] ${league}:`, err.message);
      // Fall back to cache
      const cached = cacheGet(`gamestate_${league}`);
      if (cached && cached.data) {
        setGameStates(new Map(cached.data));
      }
    }
  }, [league]);

  useEffect(() => {
    if (!hasLiveGames || !hasMarkets) {
      return;
    }

    const initialLoadId = setTimeout(load, 0);
    intervalRef.current = setInterval(load, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      } else {
        load();
        intervalRef.current = setInterval(load, POLL_INTERVAL_MS);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(initialLoadId);
      if (controllerRef.current) { controllerRef.current.abort(); controllerRef.current = null; }
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [league, hasLiveGames, hasMarkets, marketsKey, load]);

  return { gameStates: hasLiveGames && hasMarkets ? gameStates : EMPTY_GAME_STATES };
}
