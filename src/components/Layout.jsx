import { Link } from 'react-router-dom';
import AgeGateModal from './AgeGateModal';
import AdBanner from './AdBanner';
import OfflineBanner from './OfflineBanner';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-brand-black)] text-white font-sans selection:bg-[var(--color-brand-gold)] selection:text-black">
      {/* Skip to content link for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      {/* Disclaimer banner */}
      <div role="banner" className="w-full bg-[var(--color-brand-gold)]/15 text-[var(--color-brand-gold)] text-center py-2 px-4 text-xs tracking-[0.15em] uppercase font-semibold border-b border-[var(--color-brand-gold)]/20 shadow-[0_4px_20px_rgba(168,85,247,0.1)]">
        Sports odds consultation tool — for informational purposes only. Not a sportsbook.
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-black/50 border-b border-[var(--color-brand-gold)]/20 transition-all duration-300">
        <nav aria-label="Main navigation" className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-center">
          <Link to="/" aria-label="Aight Bet — Home" className="flex items-center gap-2">
            <img src="/Logo.png" alt="" className="w-11 h-11 object-contain drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]" />
            <span className="font-[Outfit] text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              AIGHT BET
            </span>
          </Link>
        </nav>
      </header>

      <OfflineBanner />

      <main id="main-content" className="flex-1 flex flex-col relative w-full overflow-hidden">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#050505] border-t border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-gray-400 text-sm tracking-widest uppercase mb-1">
              &copy; 2026 Aight Bet. All rights reserved.
            </p>
            <p className="text-gray-400 text-xs max-w-lg mb-2">
              Aight Bet is a sports odds consultation tool. It is not a sportsbook, does not accept wagers, and does not facilitate gambling of any kind. All data is publicly available and provided for reference only.
            </p>
            <p className="text-[var(--color-brand-gold)]/80 text-xs max-w-lg font-medium">
              If you or someone you know has a gambling problem, call 1-800-GAMBLER.
            </p>
          </div>
          <nav aria-label="Footer links" className="flex gap-6 flex-wrap justify-end">
            <Link to="/legal#disclaimer" className="text-gray-400 hover:text-white transition-colors duration-300 text-sm tracking-widest uppercase">
              Terms
            </Link>
            <Link to="/legal#privacy" className="text-gray-400 hover:text-white transition-colors duration-300 text-sm tracking-widest uppercase">
              Privacy
            </Link>
            <Link to="/legal#disclaimer" className="text-gray-400 hover:text-white transition-colors duration-300 text-sm tracking-widest uppercase">
              Disclaimer
            </Link>
          </nav>
        </div>
      </footer>

      {/* Bottom spacing so content isn't hidden behind the ad banner */}
      <div className="h-[60px] shrink-0" aria-hidden="true" />

      <AgeGateModal />
      <AdBanner />
    </div>
  );
}
