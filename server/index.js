import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * Trust the first hop in front of us (load balancer / reverse proxy / CDN).
 * Without this, Express reads the proxy's IP as `req.ip` for every request,
 * which makes the per-IP rate limit collapse into a single global bucket.
 * `1` = trust exactly one hop; raise it if you stack additional proxies.
 * If you ever serve directly to clients with no proxy, set this to `false`.
 */
app.set('trust proxy', 1);

/** Server-only API key — never exposed to the browser */
const ODDS_API_KEY = process.env.ODDS_API_KEY;
const ODDS_BASE = 'https://api.the-odds-api.com/v4';

if (!ODDS_API_KEY) {
  console.warn('[server] WARNING: ODDS_API_KEY not set in .env — API proxy will return 503');
}

app.use(cors());
app.use(express.json());

/** Sport key mapping — shared by odds and scores endpoints */
const SPORT_KEYS = {
  NBA: 'basketball_nba',
  MLB: 'baseball_mlb',
  NFL: 'americanfootball_nfl',
  MMA: 'mma_mixed_martial_arts',
};

/**
 * Simple in-memory cache to avoid hammering the API.
 * Each league gets cached for CACHE_TTL_MS after a successful fetch.
 * Bounded by SPORT_KEYS validation (one entry per supported league).
 */
const cache = {};
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/** Separate scores cache — shorter TTL for live score freshness */
const scoresCache = {};
const SCORES_CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Rate-limit manual refreshes: 1 request per 30s per IP per league.
 * Keys are `${ip}:${league}` — without bounds this would grow forever as
 * unique IPs hit the endpoint, so we sweep stale entries on each access
 * and hard-cap the map size as a safety net.
 */
const refreshTimestamps = new Map();
const REFRESH_COOLDOWN_MS = 30 * 1000;
const REFRESH_TIMESTAMPS_MAX = 10_000;

function rateLimitKey(ip, league) {
  return `${ip}:${league}`;
}

/** Drop entries past their cooldown window; bound the map size as a safety net. */
function pruneRefreshTimestamps() {
  const cutoff = Date.now() - REFRESH_COOLDOWN_MS;
  for (const [key, ts] of refreshTimestamps) {
    if (ts < cutoff) refreshTimestamps.delete(key);
  }
  // Hard cap — drop oldest insertions if we still exceed the limit (e.g. burst of unique IPs).
  while (refreshTimestamps.size > REFRESH_TIMESTAMPS_MAX) {
    const oldest = refreshTimestamps.keys().next().value;
    refreshTimestamps.delete(oldest);
  }
}

/**
 * GET /api/odds/:league
 *
 * Proxies The Odds API, caches results, and never exposes the API key.
 * Query params:
 *   ?force=1  — bypass cache (subject to rate limit)
 */
app.get('/api/odds/:league', async (req, res) => {
  if (!ODDS_API_KEY) {
    return res.status(503).json({ error: 'API key not configured on server' });
  }

  const league = req.params.league.toUpperCase();
  const sportKey = SPORT_KEYS[league];
  if (!sportKey) {
    return res.status(400).json({ error: `Unknown league: ${league}` });
  }

  // Rate-limit forced refreshes
  const forceRefresh = req.query.force === '1';
  if (forceRefresh) {
    pruneRefreshTimestamps();
    const rlKey = rateLimitKey(req.ip, league);
    const lastRefresh = refreshTimestamps.get(rlKey) || 0;
    if (Date.now() - lastRefresh < REFRESH_COOLDOWN_MS) {
      return res.status(429).json({
        error: 'Too many refresh requests. Try again in a few seconds.',
        retryAfterMs: REFRESH_COOLDOWN_MS - (Date.now() - lastRefresh),
      });
    }
    refreshTimestamps.set(rlKey, Date.now());
  }

  // Serve from cache if fresh and not a forced refresh
  const cached = cache[league];
  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.json({
      data: cached.data,
      cached: true,
      cachedAt: new Date(cached.timestamp).toISOString(),
      quotaUsed: cached.quotaUsed,
      quotaRemaining: cached.quotaRemaining,
    });
  }

  // Build the upstream request
  const params = new URLSearchParams({
    apiKey: ODDS_API_KEY,
    regions: 'us',
    markets: 'h2h',
    oddsFormat: 'american',
  });

  // For major leagues, filter to preferred bookmakers; MMA gets all
  if (league !== 'MMA') {
    params.set('bookmakers', 'fanduel,draftkings,betmgm');
  }

  try {
    const upstream = await fetch(`${ODDS_BASE}/sports/${sportKey}/odds/?${params}`);

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error(`[server] Odds API ${league} error ${upstream.status}: ${text}`);
      return res.status(upstream.status).json({
        error: `Odds API returned ${upstream.status}`,
        detail: text,
      });
    }

    const data = await upstream.json();
    const quotaUsed = upstream.headers.get('x-requests-used');
    const quotaRemaining = upstream.headers.get('x-requests-remaining');

    if (quotaRemaining) {
      console.info(`[server] Odds API quota: ${quotaUsed} used, ${quotaRemaining} remaining`);
    }

    // Cache the result
    cache[league] = {
      data,
      timestamp: Date.now(),
      quotaUsed,
      quotaRemaining,
    };

    return res.json({
      data,
      cached: false,
      quotaUsed,
      quotaRemaining,
    });
  } catch (err) {
    console.error(`[server] Fetch failed for ${league}:`, err.message);
    return res.status(502).json({ error: 'Failed to reach Odds API', detail: err.message });
  }
});

/**
 * GET /api/scores/:league
 *
 * Proxies The Odds API scores endpoint for live game scores.
 * Returns scores for live and recently completed games.
 * Cached for 60s to conserve quota (1 request per call on free tier).
 */
app.get('/api/scores/:league', async (req, res) => {
  if (!ODDS_API_KEY) {
    return res.status(503).json({ error: 'API key not configured on server' });
  }

  const league = req.params.league.toUpperCase();
  const sportKey = SPORT_KEYS[league];
  if (!sportKey) {
    return res.status(400).json({ error: `Unknown league: ${league}` });
  }

  // Serve from cache if fresh
  const cached = scoresCache[league];
  if (cached && Date.now() - cached.timestamp < SCORES_CACHE_TTL_MS) {
    return res.json({
      data: cached.data,
      cached: true,
      cachedAt: new Date(cached.timestamp).toISOString(),
    });
  }

  const params = new URLSearchParams({
    apiKey: ODDS_API_KEY,
    daysFrom: '1',
  });

  try {
    const upstream = await fetch(`${ODDS_BASE}/sports/${sportKey}/scores/?${params}`);

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error(`[server] Scores API ${league} error ${upstream.status}: ${text}`);
      return res.status(upstream.status).json({
        error: `Scores API returned ${upstream.status}`,
        detail: text,
      });
    }

    const data = await upstream.json();
    const quotaUsed = upstream.headers.get('x-requests-used');
    const quotaRemaining = upstream.headers.get('x-requests-remaining');

    if (quotaRemaining) {
      console.info(`[server] Scores API quota: ${quotaUsed} used, ${quotaRemaining} remaining`);
    }

    // Cache the result
    scoresCache[league] = {
      data,
      timestamp: Date.now(),
    };

    return res.json({
      data,
      cached: false,
      quotaUsed,
      quotaRemaining,
    });
  } catch (err) {
    console.error(`[server] Scores fetch failed for ${league}:`, err.message);
    return res.status(502).json({ error: 'Failed to reach Scores API', detail: err.message });
  }
});

/**
 * ── ESPN Scoreboard proxy ───────────────────────────────────────────────
 * Provides game status (period, clock, shortDetail) from ESPN's
 * unofficial scoreboard API. Cached for 30s for live freshness.
 */
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const ESPN_SPORT_MAP = {
  NBA: 'basketball/nba',
  MLB: 'baseball/mlb',
  NFL: 'football/nfl',
  MMA: 'mma/ufc',
};
const espnCache = {};
const ESPN_CACHE_TTL_MS = 30 * 1000; // 30 seconds

app.get('/api/gamestate/:league', async (req, res) => {
  const league = req.params.league.toUpperCase();
  const espnSport = ESPN_SPORT_MAP[league];
  if (!espnSport) {
    return res.status(400).json({ error: `Unknown league: ${league}` });
  }

  // Serve from cache if fresh
  const cached = espnCache[league];
  if (cached && Date.now() - cached.timestamp < ESPN_CACHE_TTL_MS) {
    return res.json({ data: cached.data, cached: true });
  }

  try {
    const upstream = await fetch(`${ESPN_BASE}/${espnSport}/scoreboard`);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `ESPN returned ${upstream.status}` });
    }

    const json = await upstream.json();
    const events = json.events || [];

    // Normalize into a compact format keyed by team names
    const gameStates = events.map((event) => {
      const comp = event.competitions?.[0];
      const status = comp?.status || {};
      const type = status.type || {};
      const competitors = comp?.competitors || [];

      const home = competitors.find((c) => c.homeAway === 'home');
      const away = competitors.find((c) => c.homeAway === 'away');

      return {
        espnId: event.id,
        homeTeam: home?.team?.displayName || '',
        awayTeam: away?.team?.displayName || '',
        homeScore: home?.score || '0',
        awayScore: away?.score || '0',
        state: type.state || 'pre', // pre, in, post
        period: status.period || 0,
        clock: status.displayClock || '',
        detail: type.shortDetail || '',
        completed: type.completed || false,
      };
    });

    espnCache[league] = { data: gameStates, timestamp: Date.now() };
    return res.json({ data: gameStates, cached: false });
  } catch (err) {
    console.error(`[server] ESPN fetch failed for ${league}:`, err.message);
    return res.status(502).json({ error: 'Failed to reach ESPN', detail: err.message });
  }
});

/** Health check */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    apiKeyConfigured: Boolean(ODDS_API_KEY),
    cacheEntries: Object.keys(cache).length,
  });
});

app.listen(PORT, () => {
  console.log(`Aight Bet API proxy running on port ${PORT}`);
});
