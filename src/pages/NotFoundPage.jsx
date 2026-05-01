import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col w-full min-h-[80vh] items-center justify-center pt-20 px-6 text-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--color-brand-gold)]/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="relative z-10">
        <h1 className="text-8xl md:text-9xl font-[Outfit] font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-[var(--color-brand-gold)] to-[var(--color-brand-gold-dark)] mb-4">
          404
        </h1>
        <h2 className="text-2xl md:text-3xl font-[Outfit] font-bold text-white mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-[var(--color-brand-gold-dark)] to-[var(--color-brand-gold)] text-black font-[Outfit] font-bold tracking-wider rounded-sm hover:scale-105 transition-transform"
          >
            GO HOME
          </button>
          <button
            onClick={() => navigate('/markets')}
            className="px-6 py-3 bg-white/5 border border-white/10 text-gray-300 font-[Outfit] font-bold tracking-wider rounded-sm hover:bg-white/10 transition-colors"
          >
            BROWSE MARKETS
          </button>
        </div>
      </div>
    </div>
  );
}
