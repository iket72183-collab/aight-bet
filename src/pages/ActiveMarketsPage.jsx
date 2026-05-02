import { useState, useMemo, useRef, useCallback } from 'react';
import MarketCard from '../components/MarketCard';
import LeagueLogo from '../components/LeagueLogo';
import PullToRefresh from '../components/PullToRefresh';
import { leagueTabs, leagueConfig } from '../data/markets';
import { useMarkets } from '../hooks/useMarkets';
import { useScores } from '../hooks/useScores';
import { useGameState } from '../hooks/useGameState';
import { Loader2, Wifi, WifiOff, RefreshCw } from 'lucide-react';

/**
 * Group markets by date.
 * Live events go under "Live Now", others grouped by calendar date.
 */
function groupByDate(markets) {
  const groups = {};

  for (const market of markets) {
    let key;

    if (market.isLive) {
      key = 'Live Now';
    } else if (market.commenceTime) {
      // Live API data has commenceTime
      const date = new Date(market.commenceTime);
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === now.toDateString()) {
        key = 'Today';
      } else if (date.toDateString() === tomorrow.toDateString()) {
        key = 'Tomorrow';
      } else {
        key = date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
      }
    } else {
      // Static mock data — use the time field as a rough grouping
      key = market.time?.includes('PM') || market.time?.includes('AM') ? 'Today' : 'Live Now';
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push(market);
  }

  // Sort: "Live Now" first, then "Today", "Tomorrow", then chronological dates
  const priority = { 'Live Now': 0, 'Today': 1, 'Tomorrow': 2 };
  const sorted = Object.entries(groups).sort(([a], [b]) => {
    const pa = priority[a] ?? 99;
    const pb = priority[b] ?? 99;
    if (pa !== pb) return pa - pb;
    // Both are calendar dates — sort chronologically
    return new Date(a) - new Date(b);
  });

  return sorted;
}

const tabId = (league) => `markets-tab-${league}`;
const panelId = 'markets-tabpanel';

export default function ActiveMarketsPage() {
  const [activeTab, setActiveTab] = useState('NBA');
  const { markets, isLive, loading, error, refetch, lastUpdated, canRefresh } = useMarkets(activeTab);
  const hasLiveGames = useMemo(() => markets.some((m) => m.isLive), [markets]);
  const { scores } = useScores(activeTab, hasLiveGames);
  const { gameStates } = useGameState(activeTab, markets, hasLiveGames);
  const [refreshing, setRefreshing] = useState(false);
  const tabRefs = useRef({});

  const handleManualRefresh = async () => {
    if (!canRefresh) return;
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  /** Pull-to-refresh handler — reuses the same refetch logic */
  const handlePullRefresh = useCallback(async () => {
    if (!canRefresh) return;
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [canRefresh, refetch]);

  // Roving-tabindex keyboard nav — left/right cycle tabs, home/end jump to ends.
  const handleTabKeyDown = (e) => {
    const { key } = e;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
    e.preventDefault();
    const idx = leagueTabs.indexOf(activeTab);
    let nextIdx = idx;
    if (key === 'ArrowRight') nextIdx = (idx + 1) % leagueTabs.length;
    else if (key === 'ArrowLeft') nextIdx = (idx - 1 + leagueTabs.length) % leagueTabs.length;
    else if (key === 'Home') nextIdx = 0;
    else if (key === 'End') nextIdx = leagueTabs.length - 1;
    const nextLeague = leagueTabs[nextIdx];
    setActiveTab(nextLeague);
    requestAnimationFrame(() => tabRefs.current[nextLeague]?.focus());
  };

  const dateGroups = useMemo(() => groupByDate(markets), [markets]);
  const config = leagueConfig[activeTab] || { label: activeTab };

  return (
    <PullToRefresh onRefresh={handlePullRefresh} disabled={!canRefresh || refreshing}>
    <div className="flex flex-col w-full min-h-[90vh] bg-[#0a0a0a] pt-4 px-6 md:px-12 pb-16 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[var(--color-brand-gold)]/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-4xl md:text-5xl font-[Outfit] font-extrabold text-white leading-tight">
              {config.label.toUpperCase()}
            </h1>
            {isLive ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] uppercase tracking-widest font-medium">
                <Wifi size={12} /> Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-gray-300 text-[10px] uppercase tracking-widest font-medium">
                <WifiOff size={12} /> Sample
              </span>
            )}
          </div>
          {isLive ? (
            <p className="text-gray-300 text-sm max-w-2xl">
              Live moneyline odds sourced from FanDuel, DraftKings, and BetMGM — for consultation only.
            </p>
          ) : (
            <img src="/logo-hero.png" alt="Aight Bet" className="h-8 mt-1 object-contain opacity-60" />
          )}
          {isLive && lastUpdated && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-gray-300">
                Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                {' · auto-refreshes every 5 min'}
              </span>
              <button
                onClick={handleManualRefresh}
                disabled={refreshing || !canRefresh}
                className="flex items-center gap-1 text-xs text-gray-300 hover:text-[var(--color-brand-gold)] transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Refreshing...' : !canRefresh ? 'Wait 30s' : 'Refresh now'}
              </button>
            </div>
          )}
        </div>

        {/* League Tabs */}
        <div
          role="tablist"
          aria-label="League"
          onKeyDown={handleTabKeyDown}
          className="flex gap-3 mb-5 overflow-x-auto pb-3 scrollbar-hide"
        >
          {leagueTabs.map((tab) => {
            const tabConfig = leagueConfig[tab] || { label: tab };
            const selected = activeTab === tab;
            return (
              <button
                key={tab}
                ref={(el) => { tabRefs.current[tab] = el; }}
                id={tabId(tab)}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={panelId}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-[Outfit] font-bold text-sm tracking-widest transition-all duration-300 whitespace-nowrap ${
                  selected
                    ? 'bg-[var(--color-brand-gold)] text-black shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                <LeagueLogo league={tab} size={18} />
                {tabConfig.label}
              </button>
            );
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-red-400 text-sm">
            Failed to load live odds — showing sample data. ({error})
          </div>
        )}

        {/* Markets grouped by date */}
        <div
          id={panelId}
          role="tabpanel"
          aria-labelledby={tabId(activeTab)}
          tabIndex={0}
        >
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Loader2 size={32} className="text-[var(--color-brand-gold)] animate-spin mb-4" />
              <p className="text-gray-300 text-sm uppercase tracking-widest">
                Loading {config.label} markets...
              </p>
            </div>
          ) : dateGroups.length > 0 ? (
            <div className="space-y-10">
              {dateGroups.map(([dateLabel, dateMarkets]) => (
                <section key={dateLabel}>
                  {/* Date header */}
                  <div className="flex items-center gap-4 mb-5">
                    <h2 className="text-lg font-[Outfit] font-bold text-white uppercase tracking-widest whitespace-nowrap">
                      {dateLabel}
                    </h2>
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-gray-300 tracking-widest">
                      {dateMarkets.length} {dateMarkets.length === 1 ? 'game' : 'games'}
                    </span>
                  </div>

                  {/* Cards grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dateMarkets.map((market) => (
                      <MarketCard key={market.id} market={market} score={scores.get(market.id)} gameState={gameStates.get(market.id)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-white/5 rounded-2xl border border-white/5">
              <p className="text-gray-300 mb-2">No active markets available for {config.label} right now.</p>
              <p className="text-sm text-gray-400">
                {isLive ? 'This league may be in its off-season.' : 'Check back closer to game time.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </PullToRefresh>
  );
}
