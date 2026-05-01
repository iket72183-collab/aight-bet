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

/**
 * Simple in-memory cache to avoid hammering the API.
 * Each league gets cached for CACHE_TTL_MS after a successful fetch.
 * Bounded by SPORT_KEYS validation (one entry per supported league).
 */
const cache = {};
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

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

  // Sport key mapping (same as the frontend had)
  const SPORT_KEYS = {
    NBA: 'basketball_nba',
    MLB: 'baseball_mlb',
    NFL: 'americanfootball_nfl',
    MMA: 'mma_mixed_martial_arts',
  };

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
