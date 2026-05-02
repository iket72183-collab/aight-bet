import { useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, TrendingUp, AlertTriangle, ArrowLeftRight, BarChart3 } from 'lucide-react';
import { getMarketById, calculatePayout } from '../data/markets';
import { getCachedMarketById } from '../hooks/useMarkets';
import { useScores } from '../hooks/useScores';
import LeagueLogo from '../components/LeagueLogo';
import TeamLogo from '../components/TeamLogo';


/**
 * Convert American odds to implied probability (%).
 * Negative odds (favorites): prob = |odds| / (|odds| + 100)
 * Positive odds (underdogs): prob = 100 / (odds + 100)
 */
function impliedProbability(oddsStr) {
  const odds = parseInt(String(oddsStr).replace('+', ''), 10);
  if (isNaN(odds) || odds === 0) return 0;
  if (odds < 0) return (Math.abs(odds) / (Math.abs(odds) + 100)) * 100;
  return (100 / (odds + 100)) * 100;
}

/**
 * Format a probability to a clean display string.
 */
function fmtProb(pct) {
  return `${Math.round(pct)}%`;
}

export default function MarketDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Try router state first (live data from MarketCard), then in-memory cache (deep-link/refresh),
  // then static data as last resort
  const market = location.state?.market || getCachedMarketById(id) || getMarketById(id);
  const initialType = location.state?.selectedType || null; // null = no pick yet

  const [betType, setBetType] = useState(initialType);
  const [wager, setWager] = useState('100');

  // Live scores — only polls when this game is live
  const { scores } = useScores(market?.league || 'NBA', Boolean(market?.isLive));
  const score = market ? scores.get(market.id) : null;

  /** Select a pick */
  const selectPick = (type) => {
    setBetType(type);
  };

  /** Toggle between favorite and underdog */
  const switchPick = () => {
    setBetType((prev) => (prev === 'risky' ? 'safe' : 'risky'));
  };

  // 404 state — market not found
  if (!market) {
    return (
      <div className="flex flex-col w-full min-h-[80vh] items-center justify-center pt-20 px-6 text-center">
        <h1 className="text-4xl font-[Outfit] font-extrabold text-white mb-4">Market Not Found</h1>
        <p className="text-gray-400 mb-8 max-w-md">
          The market you're looking for doesn't exist or may have expired.
        </p>
        <button
          onClick={() => navigate('/markets')}
          className="px-6 py-3 bg-[var(--color-brand-gold)] text-black font-[Outfit] font-bold tracking-wider rounded-sm hover:scale-105 transition-transform"
        >
          BROWSE MARKETS
        </button>
      </div>
    );
  }

  // Calculate real implied probabilities from the actual odds
  const safeProb = impliedProbability(market.safeOdds);
  const riskyProb = impliedProbability(market.riskyOdds);

  // Derived values based on current pick (if one is selected)
  const hasPick = betType !== null;
  const isUnderdog = betType === 'risky';
  const selectedTeam = isUnderdog ? market.riskyTeam : market.safeTeam;
  const selectedOdds = isUnderdog ? market.riskyOdds : market.safeOdds;
  const opponentTeam = isUnderdog ? market.safeTeam : market.riskyTeam;
  const altTeam = isUnderdog ? market.safeTeam : market.riskyTeam;
  const altOdds = isUnderdog ? market.safeOdds : market.riskyOdds;

  const wagerNum = parseFloat(wager) || 0;
  const payout = hasPick ? calculatePayout(wagerNum, selectedOdds).toFixed(2) : '—';

  // Payout calculations for the comparison cards
  const safePayout = calculatePayout(100, market.safeOdds).toFixed(2);
  const riskyPayout = calculatePayout(100, market.riskyOdds).toFixed(2);

  return (
    <div className="flex flex-col w-full min-h-[90vh] bg-[#0a0a0a] pt-4 px-4 md:px-12 pb-16 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[var(--color-brand-gold)]/5 blur-[150px] rounded-full pointer-events-none" />

      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-[var(--color-brand-gold)] transition-colors mb-3 w-fit group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm tracking-widest uppercase font-medium">Back</span>
      </button>

      <div className="max-w-6xl mx-auto w-full relative z-10">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded text-xs font-medium uppercase tracking-widest text-gray-300">
              <LeagueLogo league={market.league} size={14} organization={market.organization} />
              {market.eventName || market.organization || market.league}
            </span>
            <span className="text-xs text-gray-400 uppercase tracking-widest">{market.time}</span>
            {market.isLive && (
              <span className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded text-xs font-medium uppercase tracking-widest text-red-500">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl font-[Outfit] font-extrabold text-white leading-tight">
            {market.safeTeam} <span className="text-gray-400 font-light mx-1">vs</span> {market.riskyTeam}
          </h1>

          {/* Live scoreboard */}
          {score && market.isLive && (
            <div className="flex items-center gap-5 mt-3 py-3 px-5 bg-black/40 rounded-xl border border-white/10 w-fit">
              <div className="flex items-center gap-3">
                <TeamLogo team={market.homeTeam} size={24} />
                <span className="text-sm text-gray-300 font-medium">{market.homeTeam}</span>
                <span className="text-2xl font-[Outfit] font-bold text-white">{score.homeScore}</span>
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-widest">—</span>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-[Outfit] font-bold text-white">{score.awayScore}</span>
                <span className="text-sm text-gray-300 font-medium">{market.awayTeam}</span>
                <TeamLogo team={market.awayTeam} size={24} />
              </div>
            </div>
          )}
        </div>

        {/* ── Pick Comparison Cards ────────────────────────────── */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs uppercase tracking-widest text-gray-400 font-medium">Moneyline — Pick a Side</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Safe pick card */}
          <button
            onClick={() => selectPick('safe')}
            className={`text-left p-4 rounded-2xl border-2 transition-all duration-300 ${
              betType === 'safe'
                ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(52,211,153,0.15)]'
                : 'border-white/10 bg-[#111] hover:border-emerald-500/40'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-lg font-[Outfit] font-bold uppercase tracking-widest px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-sm">
                  Safe
                </span>
                <h3 className="text-white font-[Outfit] font-bold text-xl mt-2 flex items-center gap-2">
                  <TeamLogo team={market.safeTeam} size={28} />
                  {market.safeTeam}
                </h3>
              </div>
              <span className="text-emerald-400 font-[Outfit] font-bold text-2xl">{market.safeOdds}</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400 uppercase tracking-widest">Win Probability</span>
                  <span className="text-white font-medium">{fmtProb(safeProb)}</span>
                </div>
                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${safeProb}%` }} />
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 uppercase tracking-widest">$100 return</span>
                <span className="text-emerald-400 font-medium">${safePayout}</span>
              </div>
            </div>
            {betType === 'safe' && (
              <div className="mt-3 text-center text-xs text-emerald-400 font-medium uppercase tracking-widest">
                ✓ Selected
              </div>
            )}
          </button>

          {/* Risky pick card */}
          <button
            onClick={() => selectPick('risky')}
            className={`text-left p-4 rounded-2xl border-2 transition-all duration-300 ${
              betType === 'risky'
                ? 'border-[var(--color-brand-gold)] bg-[var(--color-brand-gold)]/10 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                : 'border-white/10 bg-[#111] hover:border-[var(--color-brand-gold)]/40'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-lg font-[Outfit] font-bold uppercase tracking-widest px-3 py-1 bg-[var(--color-brand-gold)]/10 text-[var(--color-brand-gold)] border border-[var(--color-brand-gold)]/20 rounded-sm">
                  Risky
                </span>
                <h3 className="text-white font-[Outfit] font-bold text-xl mt-2 flex items-center gap-2">
                  <TeamLogo team={market.riskyTeam} size={28} />
                  {market.riskyTeam}
                </h3>
              </div>
              <span className="text-[var(--color-brand-gold)] font-[Outfit] font-bold text-2xl">{market.riskyOdds}</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400 uppercase tracking-widest">Win Probability</span>
                  <span className="text-white font-medium">{fmtProb(riskyProb)}</span>
                </div>
                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-[var(--color-brand-gold)] rounded-full" style={{ width: `${riskyProb}%` }} />
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 uppercase tracking-widest">$100 return</span>
                <span className="text-[var(--color-brand-gold)] font-medium">${riskyPayout}</span>
              </div>
            </div>
            {betType === 'risky' && (
              <div className="mt-3 text-center text-xs text-[var(--color-brand-gold)] font-medium uppercase tracking-widest">
                ✓ Selected
              </div>
            )}
          </button>
        </div>

        {!hasPick && (
          <p className="text-center text-gray-400 text-sm mb-4 uppercase tracking-widest">
            Tap a side above to make your pick
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── Left: Analysis ─────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Odds Comparison Table */}
            {market.bookmakerOdds && market.bookmakerOdds.length > 0 && (
              <div className="bg-[#111] border border-white/5 p-4 md:p-6 rounded-2xl">
                <h3 className="text-[var(--color-brand-gold)] text-sm uppercase tracking-widest font-medium flex items-center gap-2 mb-3">
                  <BarChart3 size={16} /> Odds by Sportsbook
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-gray-400 uppercase tracking-widest text-[10px] pb-3 pr-4">Sportsbook</th>
                        <th className="text-right text-emerald-400 uppercase tracking-widest text-[10px] pb-3 px-2">{market.safeTeam}</th>
                        <th className="text-right text-[var(--color-brand-gold)] uppercase tracking-widest text-[10px] pb-3 pl-2">{market.riskyTeam}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {market.bookmakerOdds
                        .filter((bm) => bm.outcomes && bm.outcomes.length >= 2)
                        .map((bm) => {
                          const safeOutcome = bm.outcomes.find((o) => o.name === market.safeTeam);
                          const riskyOutcome = bm.outcomes.find((o) => o.name === market.riskyTeam);
                          return (
                            <tr key={bm.key} className="border-b border-white/5 last:border-0">
                              <td className="py-3 pr-4 text-gray-300 font-medium">{bm.title}</td>
                              <td className="py-3 px-2 text-right text-emerald-400 font-[Outfit] font-bold">
                                {safeOutcome ? (safeOutcome.price > 0 ? `+${safeOutcome.price}` : safeOutcome.price) : '—'}
                              </td>
                              <td className="py-3 pl-2 text-right text-[var(--color-brand-gold)] font-[Outfit] font-bold">
                                {riskyOutcome ? (riskyOutcome.price > 0 ? `+${riskyOutcome.price}` : riskyOutcome.price) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">
                  Odds shown are for informational comparison only and may update in real time on each platform.
                </p>
              </div>
            )}

            {/* Matchup Insight */}
            <div className="bg-[#111] border border-white/5 p-4 md:p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <h3 className="text-[var(--color-brand-gold)] text-sm uppercase tracking-widest font-medium flex items-center gap-2 mb-3">
                <TrendingUp size={16} /> Matchup Insight
              </h3>

              {/* Probability head-to-head bar */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-emerald-400 font-medium">{market.safeTeam} {fmtProb(safeProb)}</span>
                  <span className="text-[var(--color-brand-gold)] font-medium">{fmtProb(riskyProb)} {market.riskyTeam}</span>
                </div>
                <div className="w-full h-3 bg-black rounded-full flex overflow-hidden border border-white/5">
                  <div className="h-full bg-emerald-500/80 rounded-l-full" style={{ width: `${safeProb}%` }} />
                  <div className="h-full bg-[var(--color-brand-gold)]/80 rounded-r-full" style={{ width: `${riskyProb}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Implied probability based on current moneyline odds (includes vig)</p>
              </div>

              <div className="p-3 bg-black/40 border border-[var(--color-brand-gold)]/10 rounded-lg flex gap-3">
                <AlertTriangle className="text-[var(--color-brand-gold)] shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-gray-400 leading-snug">
                  <strong className="text-white font-medium block mb-1">What This Means</strong>
                  The {market.safeTeam} ({market.safeOdds}) are the <strong className="text-emerald-400">safe</strong> pick with a {fmtProb(safeProb)} implied win probability.
                  A $100 hypothetical on them returns ${safePayout}.
                  The {market.riskyTeam} ({market.riskyOdds}) are the <strong className="text-[var(--color-brand-gold)]">risky</strong> pick at {fmtProb(riskyProb)},
                  but a $100 hypothetical returns ${riskyPayout} — a higher reward for the higher risk.
                </p>
              </div>
            </div>
          </div>

          {/* ── Right: Calculator ───────────────────────────────── */}
          <div className="w-full h-fit">
            <div className="bg-[#111] border border-white/10 rounded-2xl p-4 md:p-5 sticky top-24 shadow-2xl shadow-black">
              <h2 className="text-white font-[Outfit] text-xl font-bold mb-1">
                WHAT-IF CALCULATOR
              </h2>
              <p className="text-gray-400 text-xs mb-3 leading-relaxed">
                Hypothetical simulation only. No real money involved.
              </p>

              {hasPick ? (
                <>
                  <div
                    className={`p-3 rounded-xl border mb-3 ${
                      isUnderdog
                        ? 'bg-[var(--color-brand-gold)]/10 border-[var(--color-brand-gold)]/30'
                        : 'bg-emerald-500/10 border-emerald-500/30'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-bold text-lg">{selectedTeam}</h4>
                        <p className="text-gray-400 text-sm">Moneyline vs {opponentTeam}</p>
                      </div>
                      <span
                        className={`font-[Outfit] font-bold text-xl ${
                          isUnderdog ? 'text-[var(--color-brand-gold)]' : 'text-emerald-400'
                        }`}
                      >
                        {selectedOdds}
                      </span>
                    </div>
                  </div>

                  {/* Switch pick */}
                  <button
                    onClick={switchPick}
                    className={`w-full mb-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-xs font-medium tracking-wider uppercase transition-all duration-300 ${
                      isUnderdog
                        ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/15'
                        : 'border-[var(--color-brand-gold)]/30 bg-[var(--color-brand-gold)]/5 text-[var(--color-brand-gold)] hover:bg-[var(--color-brand-gold)]/15'
                    }`}
                  >
                    <ArrowLeftRight size={14} />
                    Switch to {altTeam} ({altOdds})
                  </button>

                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-2 block">
                        Hypothetical Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9]*\.?[0-9]*"
                          value={wager}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9.]/g, '');
                            // Allow only one decimal point
                            const parts = raw.split('.');
                            const sanitized = parts.length > 2
                              ? parts[0] + '.' + parts.slice(1).join('')
                              : raw;
                            // Strip leading zeros (but keep "0." for decimals)
                            const cleaned = sanitized.replace(/^0+(\d)/, '$1');
                            setWager(cleaned === '' ? '0' : cleaned);
                          }}
                          className="w-full bg-black border border-white/10 rounded-lg py-3 pl-8 pr-4 text-white font-medium focus:outline-none focus:border-[var(--color-brand-gold)] transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {[10, 50, 100, 500].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setWager(String(amt))}
                          className="py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[var(--color-brand-gold)]/30 rounded text-sm text-gray-300 font-medium transition-colors"
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-end mb-3 pb-3 border-b border-white/5">
                    <span className="text-gray-400 text-sm uppercase tracking-widest">Hypothetical Return</span>
                    <span className="text-3xl font-[Outfit] font-bold text-white">${payout}</span>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-1">Consultation Only</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Odds data sourced from FanDuel, DraftKings, and BetMGM for informational reference.
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-gray-400 text-sm mb-3">Select a pick above to use the calculator</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => selectPick('safe')}
                      className="flex-1 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-sm hover:bg-emerald-500/20 transition-colors"
                    >
                      {market.safeTeam}
                    </button>
                    <button
                      onClick={() => selectPick('risky')}
                      className="flex-1 py-3 rounded-lg bg-[var(--color-brand-gold)]/10 border border-[var(--color-brand-gold)]/20 text-[var(--color-brand-gold)] font-medium text-sm hover:bg-[var(--color-brand-gold)]/20 transition-colors"
                    >
                      {market.riskyTeam}
                    </button>
                  </div>
                </div>
              )}

              <p className="mt-3 text-[10px] text-gray-400 leading-relaxed text-center uppercase tracking-wide">
                For entertainment and informational purposes only. Check your local laws before using any external platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
