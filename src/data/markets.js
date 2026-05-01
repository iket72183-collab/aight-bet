/**
 * Centralized market data — single source of truth.
 * Used as a fallback when the live odds proxy is unreachable.
 */

export const allMarkets = {
  NBA: [
    { id: 101, league: 'NBA', time: 'Q3 10:24', isLive: true, safeTeam: 'Warriors', safeOdds: '-140', riskyTeam: 'Lakers', riskyOdds: '+120' },
    { id: 102, league: 'NBA', time: '8:00 PM', isLive: false, safeTeam: 'Celtics', safeOdds: '-200', riskyTeam: 'Heat', riskyOdds: '+170' },
    { id: 103, league: 'NBA', time: '10:30 PM', isLive: false, safeTeam: 'Nuggets', safeOdds: '-180', riskyTeam: 'Suns', riskyOdds: '+150' },
  ],
  MLB: [
    { id: 201, league: 'MLB', time: 'Top 5th', isLive: true, safeTeam: 'Yankees', safeOdds: '-150', riskyTeam: 'Red Sox', riskyOdds: '+130' },
    { id: 202, league: 'MLB', time: '7:05 PM', isLive: false, safeTeam: 'Dodgers', safeOdds: '-220', riskyTeam: 'Giants', riskyOdds: '+180' },
  ],
  NFL: [
    { id: 301, league: 'NFL', time: 'Sun 1:00 PM', isLive: false, safeTeam: 'Chiefs', safeOdds: '-150', riskyTeam: 'Ravens', riskyOdds: '+130' },
    { id: 302, league: 'NFL', time: 'Sun 4:25 PM', isLive: false, safeTeam: '49ers', safeOdds: '-190', riskyTeam: 'Eagles', riskyOdds: '+160' },
  ],
  MMA: [
    { id: 401, league: 'MMA', time: 'Main Event', isLive: false, safeTeam: 'Makhachev', safeOdds: '-250', riskyTeam: 'Poirier', riskyOdds: '+200' },
    { id: 402, league: 'MMA', time: 'Co-Main', isLive: false, safeTeam: 'Adesanya', safeOdds: '-160', riskyTeam: 'Strickland', riskyOdds: '+140' },
  ],
};

/** Flat array of every market across all leagues */
export const allMarketsFlat = Object.values(allMarkets).flat();

/** Trending markets shown on the landing page */
export const trendingMarkets = [
  allMarkets.NBA[0],
  allMarkets.MLB[0],
  allMarkets.MMA[0],
];

/** League tab config — key matches allMarkets, label is what users see */
export const leagueConfig = {
  NBA: { label: 'NBA Playoffs' },
  MLB: { label: 'MLB' },
  NFL: { label: 'NFL' },
  MMA: { label: 'MMA' },
};

/** Available league tabs */
export const leagueTabs = Object.keys(allMarkets);

/**
 * Look up a single market by ID.
 * Returns undefined if not found.
 */
export function getMarketById(id) {
  const numId = Number(id);
  return allMarketsFlat.find((m) => m.id === numId);
}

/**
 * Calculate estimated payout from American odds.
 * Returns 0 for invalid inputs.
 */
export function calculatePayout(amount, oddsStr) {
  const amt = Number(amount);
  if (!amt || amt <= 0 || !oddsStr) return 0;

  const cleaned = String(oddsStr).replace('+', '');
  const odds = parseInt(cleaned, 10);
  if (isNaN(odds) || odds === 0) return 0;

  if (odds > 0) {
    return amt * (odds / 100) + amt;
  }
  return amt / (Math.abs(odds) / 100) + amt;
}
