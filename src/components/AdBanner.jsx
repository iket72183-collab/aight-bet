/**
 * AdBanner — mock anchored adaptive banner ad.
 *
 * In production this slot will be replaced by a real Google AdMob / AdSense
 * unit.  For now it renders a small, unobtrusive placeholder that shows where
 * the ad will sit and how much space it occupies.
 *
 * Design goal: minimal, dark-themed, doesn't interrupt the user experience.
 * Inspired by the small bottom banner style used in Catholic Daily Scripture.
 */
export default function AdBanner() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center"
      role="complementary"
      aria-label="Advertisement"
    >
      {/* Subtle top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Banner container — 50px tall, standard adaptive banner height */}
      <div className="w-full max-w-[728px] h-[50px] bg-[#111]/95 backdrop-blur-sm flex items-center justify-center gap-3 px-4">
        {/* Mock ad content */}
        <div className="flex items-center gap-2 opacity-40">
          <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
            <span className="text-[8px] text-gray-500 font-bold">AD</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="w-32 h-2 rounded-full bg-white/8" />
            <div className="w-20 h-1.5 rounded-full bg-white/5" />
          </div>
        </div>
        <span className="text-[9px] text-gray-600 tracking-widest uppercase">
          AdMob Banner
        </span>
      </div>
    </div>
  );
}
