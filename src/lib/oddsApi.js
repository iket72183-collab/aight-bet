/**
 * Odds API client — talks to our Express proxy at /api/odds/:league.
 *
 * The API key never touches the browser. The proxy handles caching,
 * rate limiting, and bookmaker filtering.
 */

import { lookupMmaEvent } from '../data/mmaEvents';
import { formatGameTime } from './timezone';

/** Proxy base URL — same origin in production, localhost:3001 in dev */
const PROXY_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

/** Retry config */
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1s, 2s, 4s

/**
 * Fetch with exponential backoff retry.
 * Retries on network errors and 5xx responses. Throws immediately on
 * 4xx (client errors) or abort signals — retrying those won't help.
 */
async function fetchWithRetry(url, opts = {}) {
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, opts);

      // Don't retry client errors (400-499) — only server/network issues
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        return res;
      }

      // Server error (5xx) — worth retrying
      lastError = new Error(`Proxy returned ${res.status}`);
    } catch (err) {
      // Abort signal — don't retry, bail immediately
      if (err.name === 'AbortError') throw err;
      lastError = err;
    }

    // Wait before next attempt (exponential: 1s, 2s, 4s)
    if (attempt < MAX_RETRIES - 1) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

/** Bookmakers used for best-odds selection on the frontend */
const TARGET_BOOKMAKERS = ['fanduel', 'draftkings', 'betmgm'];

/** Supported leagues */
const SUPPORTED_LEAGUES = ['NBA', 'MLB', 'NFL', 'MMA'];

/**
 * Fetch live + upcoming odds for a given league via our server proxy.
 * Returns normalized market objects that match our app's data shape.
 *
 * Throws on HTTP errors so the hook can display an error banner
 * and fall back to static data correctly (fixes P1 null-swallowing bug).
 *
 * @param {string} league - NBA, MLB, NFL, or MMA
 * @param {object} opts
 * @param {boolean} opts.force - bypass server cache
 * @param {AbortSignal} [opts.signal] - abort the in-flight request when set
 */
export async function fetchOddsForLeague(league, { force = false, signal } = {}) {
  if (!SUPPORTED_LEAGUES.includes(league)) return [];

  const url = `${PROXY_BASE}/api/odds/${league}${force ? '?force=1' : ''}`;
  const res = await fetchWithRetry(url, { signal });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Proxy returned ${res.status}`);
  }

  const json = await res.json();
  const events = json.data || [];

  // Log quota info from server response (dev-only — noisy in production)
  if (import.meta.env.DEV && json.quotaRemaining) {
    console.info(
      `[OddsAPI] Quota: ${json.quotaUsed} used, ${json.quotaRemaining} remaining` +
        (json.cached ? ' (cached)' : '')
    );
  }

  const markets = events.map((event) => normalizeEvent(event, league));

  // Filter out events with no odds available (N/A) so users only see actionable cards
  return markets.filter((m) => m.safeOdds !== 'N/A' && m.riskyOdds !== 'N/A');
}

/**
 * Fetch odds for ALL leagues at once.
 * Returns { NBA: [...], MLB: [...], ... }.
 */
export async function fetchAllOdds() {
  const results = await Promise.all(
    SUPPORTED_LEAGUES.map(async (league) => {
      try {
        const markets = await fetchOddsForLeague(league);
        return [league, markets];
      } catch {
        return [league, []];
      }
    })
  );

  const allMarkets = {};
  for (const [league, markets] of results) {
    allMarkets[league] = markets;
  }
  return allMarkets;
}

/**
 * Normalize a raw Odds API event into our app's market shape.
 */
function normalizeEvent(event, league) {
  const isLive = event.commence_time
    ? new Date(event.commence_time) <= new Date()
    : false;

  // Format the game time for display in the user's local timezone
  let timeDisplay;

  if (isLive) {
    timeDisplay = 'LIVE';
  } else {
    timeDisplay = formatGameTime(event.commence_time);
  }

  // Get the best available bookmaker odds
  const bestOdds = pickBestOdds(event.bookmakers);
  const homeTeam = event.home_team;
  const awayTeam = event.away_team;

  // Determine safe (favorite) vs risky (underdog) from the odds
  let safeTeam, safeOdds, riskyTeam, riskyOdds;

  if (bestOdds) {
    const homeOutcome = bestOdds.find((o) => o.name === homeTeam);
    const awayOutcome = bestOdds.find((o) => o.name === awayTeam);

    const homePrice = homeOutcome?.price;
    const awayPrice = awayOutcome?.price;

    // Require both prices to be real numbers before classifying
    if (typeof homePrice === 'number' && typeof awayPrice === 'number') {
      if (homePrice < awayPrice) {
        safeTeam = homeTeam;
        safeOdds = formatOdds(homePrice);
        riskyTeam = awayTeam;
        riskyOdds = formatOdds(awayPrice);
      } else if (awayPrice < homePrice) {
        safeTeam = awayTeam;
        safeOdds = formatOdds(awayPrice);
        riskyTeam = homeTeam;
        riskyOdds = formatOdds(homePrice);
      } else {
        // Equal odds — pick'em, assign arbitrarily
        safeTeam = homeTeam;
        safeOdds = formatOdds(homePrice);
        riskyTeam = awayTeam;
        riskyOdds = formatOdds(awayPrice);
      }
    } else {
      safeTeam = homeTeam;
      safeOdds = 'N/A';
      riskyTeam = awayTeam;
      riskyOdds = 'N/A';
    }
  } else {
    safeTeam = homeTeam;
    safeOdds = 'N/A';
    riskyTeam = awayTeam;
    riskyOdds = 'N/A';
  }

  // Collect per-bookmaker odds for the detail page
  const bookmakerOdds = (event.bookmakers || []).map((bm) => {
    const h2h = bm.markets?.find((m) => m.key === 'h2h');
    return {
      key: bm.key,
      title: bm.title,
      outcomes: h2h?.outcomes || [],
    };
  });

  // Detect organization for MMA events using our manual event config
  const mmaInfo = league === 'MMA'
    ? lookupMmaEvent(event.commence_time, homeTeam, awayTeam)
    : null;

  return {
    id: event.id,
    league,
    organization: mmaInfo?.org || null,
    eventName: mmaInfo?.event || null,
    time: timeDisplay,
    isLive,
    safeTeam,
    safeOdds,
    riskyTeam,
    riskyOdds,
    homeTeam,
    awayTeam,
    commenceTime: event.commence_time,
    bookmakerOdds,
  };
}

/**
 * Pick the best h2h outcomes from our preferred bookmakers.
 * Falls back to whichever bookmaker is available.
 */
function pickBestOdds(bookmakers) {
  if (!bookmakers || bookmakers.length === 0) return null;

  for (const key of TARGET_BOOKMAKERS) {
    const bm = bookmakers.find((b) => b.key === key);
    const h2h = bm?.markets?.find((m) => m.key === 'h2h');
    if (h2h?.outcomes?.length >= 2) return h2h.outcomes;
  }

  for (const bm of bookmakers) {
    const h2h = bm.markets?.find((m) => m.key === 'h2h');
    if (h2h?.outcomes?.length >= 2) return h2h.outcomes;
  }

  return null;
}

/**
 * Format a numeric American odds value into a display string.
 */
function formatOdds(price) {
  if (price > 0) return `+${price}`;
  return String(price);
}
