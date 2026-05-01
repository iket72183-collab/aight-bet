import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function LegalPage() {
  const { hash } = useLocation();

  // Scroll to anchor when navigating from footer links
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    }
  }, [hash]);

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0a0a0a] pt-24 px-6 md:px-12 pb-20 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[var(--color-brand-gold)]/5 to-transparent pointer-events-none" />

      <div className="max-w-4xl mx-auto w-full relative z-10 text-gray-300">
        <div className="mb-12 border-b border-white/10 pb-8">
          <h1 className="text-4xl md:text-5xl font-[Outfit] font-extrabold text-white mb-2">
            Aight Bet: Legal Terms & Privacy Notice
          </h1>
          <p className="text-gray-400 uppercase tracking-widest text-sm font-medium">
            Effective Date: May 1, 2026
          </p>
        </div>

        {/* Section 1: Gambling Disclaimer */}
        <section id="disclaimer" className="mb-12 bg-[#111] border border-[var(--color-brand-gold)]/20 rounded-2xl p-8 relative overflow-hidden scroll-mt-28">
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-[var(--color-brand-gold-dark)] to-[var(--color-brand-gold)]" />
          <h2 className="text-2xl font-[Outfit] font-bold text-white mb-6 flex items-center gap-2">
            1. CONSULTATION DISCLAIMER
            <span className="text-xs bg-[var(--color-brand-gold)]/10 text-[var(--color-brand-gold)] px-2 py-1 rounded font-normal tracking-wider uppercase">Important</span>
          </h2>

          <div className="space-y-6 text-sm md:text-base leading-relaxed">
            <p className="font-semibold text-[var(--color-brand-gold)] text-lg">
              Aight Bet is a sports odds consultation tool for informational purposes only. We do not accept wagers, bets, or payments of any kind.
            </p>

            <div>
              <strong className="text-white">Consultation Only:</strong> This application provides publicly available odds data for informational reference. No gambling, wagering, or financial transactions occur within this app.
            </div>

            <div>
              <strong className="text-white">Editorial Opinions:</strong> All &ldquo;Safe&rdquo; and &ldquo;Risky&rdquo; designations are editorial opinions based on third-party data and should not be treated as financial or betting advice.
            </div>

            <div>
              <strong className="text-white">No External Sportsbook Links:</strong> Aight Bet does not link to, promote, or refer users to any sportsbook, betting platform, or gambling service. Sportsbook names (e.g., FanDuel, DraftKings, BetMGM) appear solely as data sources for odds comparison and do not constitute endorsements or referrals.
            </div>

            <div>
              <strong className="text-white">Advertising:</strong> This app displays small banner advertisements served by Google AdMob/AdSense. These ads are provided by third-party advertisers and are clearly identified. Aight Bet does not control the content of third-party advertisements.
            </div>

            <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-lg mt-8">
              <strong className="text-white font-[Outfit] text-lg block mb-1">Problem Gambling:</strong>
              If you or someone you know has a gambling problem, please call{' '}
              <a href="tel:18004262537" className="text-red-400 font-bold hover:underline">1-800-GAMBLER</a>.
            </div>
          </div>
        </section>

        {/* Section 2: Terms of Service */}
        <section id="terms" className="mb-12 scroll-mt-28">
          <h2 className="text-2xl font-[Outfit] font-bold text-white mb-6 pb-2 border-b border-white/5">
            2. Terms of Service
          </h2>
          <div className="space-y-6 text-sm md:text-base leading-relaxed">
            <div>
              <strong className="text-white block mb-1">General Use:</strong>
              Aight Bet is a consultation tool that displays publicly available sports odds data. Use of this app is subject to general internet usage terms. You are responsible for complying with the laws and regulations of your jurisdiction.
            </div>

            <div>
              <strong className="text-white block mb-1">No Warranties:</strong>
              Odds data is sourced from third-party APIs for informational comparison only. We do not guarantee the accuracy, timeliness, or completeness of any data displayed.
            </div>

            <div>
              <strong className="text-white block mb-1">Advertising:</strong>
              Aight Bet is supported by non-intrusive banner advertisements served through Google AdMob/AdSense. We do not use affiliate links, referral programs, or sponsored sportsbook placements of any kind.
            </div>
          </div>
        </section>

        {/* Section 3: Privacy Policy */}
        <section id="privacy" className="mb-12 scroll-mt-28">
          <h2 className="text-2xl font-[Outfit] font-bold text-white mb-6 pb-2 border-b border-white/5">
            3. Privacy Policy
          </h2>
          <div className="space-y-6 text-sm md:text-base leading-relaxed">
            <div>
              <strong className="text-white block mb-1">Data Collection:</strong>
              We collect minimal data, including device info (IP address, OS) and interaction data (which markets and odds you view). We do not collect financial or credit card information.
            </div>

            <div>
              <strong className="text-white block mb-1">Cookies & Tracking:</strong>
              Google AdMob/AdSense may use cookies, device identifiers, and similar technologies to serve and measure advertisements. You can manage your ad preferences through your device settings or Google&apos;s ad personalization controls.
            </div>

            <div>
              <strong className="text-white block mb-1">Third-Party Ad Partners:</strong>
              Our advertising partner, Google, may collect and use data in accordance with{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand-gold)] hover:underline">Google&apos;s Privacy Policy</a>.
              We do not share your personal data with sportsbooks, betting platforms, or affiliate networks.
            </div>

            <div>
              <strong className="text-white block mb-1">Data Sharing:</strong>
              We do not sell, trade, or share your personal information with third parties for marketing purposes. Anonymized, aggregated usage data may be used to improve the app experience.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
