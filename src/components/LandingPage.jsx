import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col w-full h-full relative">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-6 px-6 overflow-hidden">
        {/* Logo Hero Background */}
        <div className="absolute inset-0 z-0" aria-hidden="true">
          <img
            src="/logo-hero.png"
            alt=""
            className="w-full h-full object-contain object-center opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[var(--color-brand-black)] z-10" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-1/3 bg-[var(--color-brand-gold)]/10 blur-[120px] rounded-full z-10" />
        </div>

        {/* Hero Content */}
        <div className="relative z-20 flex flex-col items-center text-center max-w-4xl mx-auto mt-[-5vh]">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-4">
            <span className="w-2 h-2 rounded-full bg-[var(--color-brand-gold)] animate-pulse" aria-hidden="true" />
            <span className="text-xs uppercase tracking-widest text-[var(--color-brand-gold)] font-medium">Live Odds Active</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-[Outfit] font-extrabold tracking-tight mb-6 leading-[1.1]">
            THE FUTURE OF <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-purple-400 via-[var(--color-brand-gold)] to-purple-600">
              SPORTS INSIGHT
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 font-light mb-12 max-w-2xl px-4">
            Compare live odds, track matchups, and review picks across top leagues. Your go-to sports odds consultation tool.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
            <button
              onClick={() => navigate('/markets')}
              className="group relative px-8 py-4 bg-gradient-to-r from-[var(--color-brand-gold-dark)] to-[var(--color-brand-gold)] rounded-sm text-white font-[Outfit] font-bold text-lg tracking-wider overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:shadow-[0_0_50px_rgba(168,85,247,0.6)] transition-all duration-500 scale-100 hover:scale-105"
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out skew-x-12" />
              EXPLORE MARKETS
            </button>
          </div>

          <p className="mt-8 text-xs text-gray-400 max-w-sm">
            Consultation tool only. All odds data is publicly available and provided for informational reference.
          </p>
        </div>

      </section>

    </div>
  );
}
