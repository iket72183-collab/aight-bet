import { useNavigate } from 'react-router-dom';
import LeagueLogo from './LeagueLogo';
import TeamLogo from './TeamLogo';

/**
 * Reusable market card used on the landing page and active markets grid.
 * Displays league info, live status, and favorite/underdog pick options.
 */
export default function MarketCard({ market, score }) {
  const navigate = useNavigate();

  const goToMarket = (selectedType) => {
    navigate(`/market/${market.id}`, { state: { market, selectedType } });
  };

  /** Tap anywhere on the card → go to detail page (no pre-selected pick) */
  const goToDetail = () => {
    navigate(`/market/${market.id}`, { state: { market } });
  };

  return (
    <div
      onClick={goToDetail}
      className="bg-[#111] border border-white/5 rounded-2xl p-6 hover:border-[var(--color-brand-gold)]/30 transition-colors duration-300 cursor-pointer group"
    >
      {/* Header row: league + live badge */}
      <div className="flex justify-between items-center mb-6">
        <span className="flex items-center gap-1.5 text-xs text-gray-400 tracking-widest uppercase bg-white/5 px-2 py-1 rounded">
          <LeagueLogo league={market.league} size={14} organization={market.organization} />
          {market.eventName || market.organization || market.league} &bull; {market.time}
        </span>
        {market.isLive ? (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-500 uppercase tracking-widest font-medium">Live</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 uppercase tracking-widest font-medium">Upcoming</span>
          </div>
        )}
      </div>

      {/* Live scoreboard */}
      {score && market.isLive && (
        <div className="flex items-center justify-center gap-4 mb-4 py-3 bg-black/40 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 text-right">
            <TeamLogo team={market.homeTeam} size={18} />
            <span className="text-sm text-gray-300 font-medium truncate max-w-[80px]">{market.homeTeam?.split(' ').pop()}</span>
            <span className="text-xl font-[Outfit] font-bold text-white">{score.homeScore}</span>
          </div>
          <span className="text-xs text-gray-500 uppercase tracking-widest">vs</span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-[Outfit] font-bold text-white">{score.awayScore}</span>
            <span className="text-sm text-gray-300 font-medium truncate max-w-[80px]">{market.awayTeam?.split(' ').pop()}</span>
            <TeamLogo team={market.awayTeam} size={18} />
          </div>
        </div>
      )}

      {/* Bet type label */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Moneyline</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {/* Pick options */}
      <div className="space-y-3 mb-2">
        {/* Safe pick */}
        <button
          onClick={(e) => { e.stopPropagation(); goToMarket('safe'); }}
          className="w-full flex justify-between items-center bg-black/40 p-3 rounded-lg border border-transparent hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all duration-300 text-left group/safe"
        >
          <div className="flex items-center gap-2">
            <TeamLogo team={market.safeTeam} size={20} />
            <span className="font-semibold text-gray-200">{market.safeTeam}</span>
            <span className="text-xs uppercase tracking-widest px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-sm font-semibold">
              Safe
            </span>
          </div>
          <span className="text-emerald-400 font-[Outfit] font-bold group-hover/safe:scale-110 transition-transform duration-300">
            {market.safeOdds}
          </span>
        </button>

        {/* Risky pick */}
        <button
          onClick={(e) => { e.stopPropagation(); goToMarket('risky'); }}
          className="w-full flex justify-between items-center bg-black/40 p-3 rounded-lg border border-transparent hover:border-[var(--color-brand-gold)]/40 hover:bg-[var(--color-brand-gold)]/10 transition-all duration-300 text-left group/risky"
        >
          <div className="flex items-center gap-2">
            <TeamLogo team={market.riskyTeam} size={20} />
            <span className="font-semibold text-gray-200">{market.riskyTeam}</span>
            <span className="text-xs uppercase tracking-widest px-2 py-0.5 bg-[var(--color-brand-gold)]/10 text-[var(--color-brand-gold)] border border-[var(--color-brand-gold)]/20 rounded-sm font-semibold">
              Risky
            </span>
          </div>
          <span className="text-[var(--color-brand-gold)] font-[Outfit] font-bold group-hover/risky:scale-110 transition-transform duration-300">
            {market.riskyOdds}
          </span>
        </button>
      </div>
    </div>
  );
}
