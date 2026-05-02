/**
 * Aight Bet — API Proxy Server
 *
 * Quota protection strategy:
 *   1. Supabase-backed cron sync — /sync writes once, clients read from DB
 *   2. In-memory cache (15 min TTL) — catches burst traffic between syncs
 *   3. In-flight deduplication — parallel requests share one fetch
 *   4. Direct API fallback — only used when Supabase has no data yet
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

/** Environment */
const ODDS_API_KEY = process.env.ODDS_API_KEY;
const ODDS_BASE = 'https://api.the-odds-api.com/v4';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

// Flexible configuration via Env Vars
const csvEnv = (value, fallback) =>
  (value || fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const SPORT_KEYS = {
  NBA: 'basketball_nba',
  MLB: 'baseball_mlb',
  NFL: 'americanfootball_nfl',
  MMA: 'mma_mixed_martial_arts',
  NHL: 'icehockey_nhl',
  MLS: 'soccer_usa_mls',
};

const SYNC_SPORTS = csvEnv(
  process.env.SYNC_SPORTS,
  'americanfootball_nfl,basketball_nba,baseball_mlb,icehockey_nhl,soccer_usa_mls'
);
const PREFERRED_BOOKMAKERS = csvEnv(process.env.PREFERRED_BOOKMAKERS, 'fanduel,draftkings,betmgm').join(',');
const CACHE_TTL_MS = (parseInt(process.env.CACHE_TTL_MINUTES) || 15) * 60 * 1000;

if (!ODDS_API_KEY) {
  console.warn('[server] WARNING: ODDS_API_KEY not set — API proxy will return 503');
}

/** Supabase client — only created if credentials are configured */
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    : null;

if (!supabase) {
  console.warn('[server] WARNING: Supabase not configured — sync/picks endpoints disabled');
}

if (!CRON_SECRET) {
  console.warn('[server] WARNING: CRON_SECRET not set — /api/sync will refuse requests');
}

const memCache = {
  _store: {},

  get(key) {
    const entry = this._store[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      delete this._store[key];
      return null;
    }
    return entry.data;
  },

  set(key, data) {
    this._store[key] = { data, timestamp: Date.now() };
  },

  ageSeconds(key) {
    const entry = this._store[key];
    if (!entry) return null;
    return Math.floor((Date.now() - entry.timestamp) / 1000);
  },
};

// ─── In-Flight Deduplication ────────────────────────────────────────────────

const inFlight = {};

async function dedupedFetch(key, fetchFn) {
  if (inFlight[key]) return inFlight[key];
  inFlight[key] = fetchFn().finally(() => delete inFlight[key]);
  return inFlight[key];
}

// ─── Odds API Helpers ───────────────────────────────────────────────────────

async function fetchOddsFromAPI(sportKey, bookmakers) {
  const params = new URLSearchParams({
    apiKey: ODDS_API_KEY,
    regions: 'us',
    markets: 'h2h',
    oddsFormat: 'american',
  });
  if (bookmakers) params.set('bookmakers', bookmakers);

  const res = await fetch(`${ODDS_BASE}/sports/${sportKey}/odds/?${params}`);

  const used = res.headers.get('x-requests-used');
  const remaining = res.headers.get('x-requests-remaining');
  if (used) console.log(`[server] Odds API quota: ${used} used, ${remaining} remaining`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Odds API ${sportKey} error ${res.status}: ${text}`);
  }
  return { data: await res.json(), quotaUsed: used, quotaRemaining: remaining };
}

async function fetchScoresFromAPI(sportKey) {
  const params = new URLSearchParams({
    apiKey: ODDS_API_KEY,
    daysFrom: '1',
  });

  const res = await fetch(`${ODDS_BASE}/sports/${sportKey}/scores/?${params}`);

  const used = res.headers.get('x-requests-used');
  const remaining = res.headers.get('x-requests-remaining');
  if (used) console.log(`[server] Scores API quota: ${used} used, ${remaining} remaining`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Scores API ${sportKey} error ${res.status}: ${text}`);
  }
  return { data: await res.json(), quotaUsed: used, quotaRemaining: remaining };
}

// ─── Pick Classification (for cron sync) ────────────────────────────────────

function classifyOdds(americanOdds) {
  if (americanOdds <= -250) return 'safe';
  if (americanOdds >= 300) return 'risky';
  return null;
}

function buildPicks(oddsData, sportKey) {
  const picks = [];

  for (const game of oddsData) {
    for (const bookmaker of game.bookmakers || []) {
      for (const market of bookmaker.markets || []) {
        if (market.key !== 'h2h') continue;

        for (const outcome of market.outcomes || []) {
          const classification = classifyOdds(outcome.price);
          if (!classification) continue;

          const agreeing = (game.bookmakers || []).filter((bm) =>
            (bm.markets || []).some(
              (m) =>
                m.key === 'h2h' &&
                (m.outcomes || []).some(
                  (o) => o.name === outcome.name && classifyOdds(o.price) === classification
                )
            )
          ).length;

          picks.push({
            game_id: game.id,
            sport: sportKey,
            home_team: game.home_team,
            away_team: game.away_team,
            commence_time: game.commence_time,
            pick_team: outcome.name,
            odds: outcome.price,
            classification,
            consensus: agreeing >= 3,
            bookmaker_count: agreeing,
          });
        }
      }
    }
  }

  // Deduplicate: keep highest bookmaker_count per game+team+classification
  const seen = new Map();
  for (const pick of picks) {
    const key = `${pick.game_id}:${pick.pick_team}:${pick.classification}`;
    if (!seen.has(key) || pick.bookmaker_count > seen.get(key).bookmaker_count) {
      seen.set(key, pick);
    }
  }

  return Array.from(seen.values());
}

// ─── Sync Logic (called by cron) ────────────────────────────────────────────

async function syncAllSports() {
  console.log('[sync] Starting full odds sync...');
  const allPicks = [];
  const errors = [];

  for (const sport of SYNC_SPORTS) {
    try {
      const { data } = await fetchOddsFromAPI(sport);
      const picks = buildPicks(data, sport);
      allPicks.push(...picks);
      console.log(`[sync] ${sport}: ${picks.length} picks classified`);
    } catch (err) {
      console.error(`[sync] Failed for ${sport}:`, err.message);
      errors.push({ sport, error: err.message });
    }
  }

  if (allPicks.length === 0) {
    console.warn('[sync] No picks to write — skipping DB upsert');
    return { synced: 0, errors };
  }

  const today = new Date().toISOString().split('T')[0];

  // Delete today's stale picks, then insert fresh
  await supabase.from('daily_picks').delete().eq('sync_date', today);

  const rows = allPicks.map((p) => ({ ...p, sync_date: today }));
  const { error: insertError } = await supabase.from('daily_picks').insert(rows);

  if (insertError) {
    console.error('[sync] Supabase insert error:', insertError.message);
    throw insertError;
  }

  console.log(`[sync] Done — ${allPicks.length} picks written to Supabase`);
  return { synced: allPicks.length, errors };
}

// ─── Rate Limiting ──────────────────────────────────────────────────────────

const refreshTimestamps = new Map();
const REFRESH_COOLDOWN_MS = 30 * 1000;
const REFRESH_TIMESTAMPS_MAX = 10_000;

function pruneRefreshTimestamps() {
  const cutoff = Date.now() - REFRESH_COOLDOWN_MS;
  for (const [key, ts] of refreshTimestamps) {
    if (ts < cutoff) refreshTimestamps.delete(key);
  }
  while (refreshTimestamps.size > REFRESH_TIMESTAMPS_MAX) {
    const oldest = refreshTimestamps.keys().next().value;
    refreshTimestamps.delete(oldest);
  }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/** Health check */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    apiKeyConfigured: Boolean(ODDS_API_KEY),
    supabaseConfigured: Boolean(supabase),
    cacheEntries: Object.keys(memCache._store).length,
  });
});

/**
 * POST /api/sync
 * Called by Render Cron Job (or manually). Protected by CRON_SECRET.
 * Fetches odds from The-Odds-API and writes classified picks to Supabase.
 * This is the ONLY route that should call the external API for odds.
 */
app.post('/api/sync', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }
  if (!CRON_SECRET) {
    return res.status(503).json({ error: 'Cron secret not configured' });
  }

  const secret = req.headers['x-cron-secret'];
  if (secret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await dedupedFetch('sync', syncAllSports);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[sync] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/picks?sport=nba&classification=safe|risky
 * Reads pre-classified picks from Supabase (no external API call).
 */
app.get('/api/picks', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  const { sport, classification } = req.query;
  const cacheKey = `picks:${sport || 'all'}:${classification || 'all'}`;

  const cached = memCache.get(cacheKey);
  if (cached) {
    return res.json({
      source: 'cache',
      cache_age_seconds: memCache.ageSeconds(cacheKey),
      picks: cached,
    });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    let query = supabase.from('daily_picks').select('*').eq('sync_date', today);

    if (sport) {
      const sportKey = SYNC_SPORTS.find((s) => s.includes(sport.toLowerCase())) || sport;
      query = query.eq('sport', sportKey);
    }
    if (classification) {
      query = query.eq('classification', classification);
    }

    const { data, error } = await query;
    if (error) throw error;

    memCache.set(cacheKey, data);
    return res.json({ source: 'supabase', picks: data });
  } catch (err) {
    console.error('[picks] Supabase error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch picks' });
  }
});

/**
 * GET /api/odds/:league
 *
 * Primary odds endpoint — serves the frontend.
 * Reads from 15-min memory cache first, then hits Odds API as fallback.
 * Once cron sync is active, this can optionally read from Supabase instead.
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
    const rlKey = `${req.ip}:${league}`;
    const lastRefresh = refreshTimestamps.get(rlKey) || 0;
    if (Date.now() - lastRefresh < REFRESH_COOLDOWN_MS) {
      return res.status(429).json({
        error: 'Too many refresh requests. Try again in a few seconds.',
        retryAfterMs: REFRESH_COOLDOWN_MS - (Date.now() - lastRefresh),
      });
    }
    refreshTimestamps.set(rlKey, Date.now());
  }

  // Serve from memory cache if fresh and not forced
  const cacheKey = `odds:${league}`;
  if (!forceRefresh) {
    const cached = memCache.get(cacheKey);
    if (cached) {
      return res.json({
        data: cached.data,
        cached: true,
        cachedAt: new Date(cached.timestamp).toISOString(),
        quotaUsed: cached.quotaUsed,
        quotaRemaining: cached.quotaRemaining,
      });
    }
  }

  // Fetch from API (deduplicated)
  const bookmakers = league !== 'MMA' ? PREFERRED_BOOKMAKERS : undefined;

  try {
    const result = await dedupedFetch(cacheKey, () => fetchOddsFromAPI(sportKey, bookmakers));
    memCache.set(cacheKey, {
      data: result.data,
      timestamp: Date.now(),
      quotaUsed: result.quotaUsed,
      quotaRemaining: result.quotaRemaining,
    });

    return res.json({
      data: result.data,
      cached: false,
      quotaUsed: result.quotaUsed,
      quotaRemaining: result.quotaRemaining,
    });
  } catch (err) {
    console.error(`[server] Fetch failed for ${league}:`, err.message);
    return res.status(502).json({ error: 'Failed to reach Odds API', detail: err.message });
  }
});

/**
 * GET /api/scores/:league
 *
 * Proxies The Odds API scores endpoint. Cached for 15 min.
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

  const cacheKey = `scores:${league}`;
  const cached = memCache.get(cacheKey);
  if (cached) {
    return res.json({
      data: cached.data,
      cached: true,
      cachedAt: new Date(cached.timestamp).toISOString(),
    });
  }

  try {
    const result = await dedupedFetch(cacheKey, () => fetchScoresFromAPI(sportKey));
    memCache.set(cacheKey, { data: result.data, timestamp: Date.now() });

    return res.json({
      data: result.data,
      cached: false,
      quotaUsed: result.quotaUsed,
      quotaRemaining: result.quotaRemaining,
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

app.get('/api/gamestate/:league', async (req, res) => {
  const league = req.params.league.toUpperCase();
  const espnSport = ESPN_SPORT_MAP[league];
  if (!espnSport) {
    return res.status(400).json({ error: `Unknown league: ${league}` });
  }

  const cacheKey = `espn:${league}`;
  const cached = memCache.get(cacheKey);
  // ESPN cache: 30s TTL (shorter than general cache for live freshness)
  if (cached && memCache.ageSeconds(cacheKey) < 30) {
    return res.json({ data: cached, cached: true });
  }

  try {
    const upstream = await fetch(`${ESPN_BASE}/${espnSport}/scoreboard`);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `ESPN returned ${upstream.status}` });
    }

    const json = await upstream.json();
    const events = json.events || [];

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
        state: type.state || 'pre',
        period: status.period || 0,
        clock: status.displayClock || '',
        detail: type.shortDetail || '',
        completed: type.completed || false,
      };
    });

    memCache.set(cacheKey, gameStates);
    return res.json({ data: gameStates, cached: false });
  } catch (err) {
    console.error(`[server] ESPN fetch failed for ${league}:`, err.message);
    return res.status(502).json({ error: 'Failed to reach ESPN', detail: err.message });
  }
});

/**
 * GET /api/quota
 * Shows cache status without hitting any external API.
 */
app.get('/api/quota', (_req, res) => {
  const keys = Object.keys(memCache._store);
  const status = keys.map((k) => ({
    key: k,
    age_seconds: memCache.ageSeconds(k),
    expires_in_seconds: Math.max(0, CACHE_TTL_MS / 1000 - memCache.ageSeconds(k)),
  }));
  res.json({ cache_entries: status, supabase_connected: Boolean(supabase) });
});

// ─── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Aight Bet API proxy running on port ${PORT}`);
});
