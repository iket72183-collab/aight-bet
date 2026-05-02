import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * AdBanner — real AdMob banner on Android, mock placeholder on web.
 *
 * On native Android, initializes the AdMob SDK and shows an anchored
 * adaptive banner at the bottom of the screen using @capacitor-community/admob.
 * On web (dev), renders a subtle mock placeholder.
 */

const AD_UNIT_ID = 'ca-app-pub-9453978833720195/2002889569';

/** Test ad unit for development — shows Google test ads */
const TEST_AD_UNIT_ID = 'ca-app-pub-3940256099942544/9214589741';

export default function AdBanner() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || initialized.current) return;
    initialized.current = true;

    let cleanup = () => {};

    (async () => {
      try {
        const { AdMob, BannerAdSize, BannerAdPosition, BannerAdPluginEvents } =
          await import('@capacitor-community/admob');

        // Initialize the AdMob SDK
        await AdMob.initialize({
          initializeForTesting: false,
        });

        // Listen for ad events
        const failedListener = AdMob.addListener(
          BannerAdPluginEvents.FailedToLoad,
          (error) => {
            console.warn('[AdBanner] Failed to load:', error);
          }
        );

        cleanup = () => {
          failedListener?.remove?.();
        };

        // Android renders this as a native AdView. MainActivity overrides the
        // plugin's Android 15+ safe-area margin so the banner sits at the
        // physical bottom edge instead of above the navigation inset.
        await AdMob.showBanner({
          adId: AD_UNIT_ID,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          isTesting: false,
          margin: 0,
        });
      } catch (err) {
        console.error('[AdBanner] AdMob init error:', err);
      }
    })();

    return () => {
      cleanup();
      // Remove banner on unmount
      import('@capacitor-community/admob').then(({ AdMob }) => {
        AdMob.removeBanner().catch(() => {});
      });
    };
  }, []);

  // On native, AdMob renders its own native view. The Layout spacer div
  // handles content clearance; no DOM overlay is needed.
  if (Capacitor.isNativePlatform()) {
    return null;
  }

  // Web fallback — mock banner for development
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[999] h-[60px] bg-black flex items-center justify-center"
      role="complementary"
      aria-label="Advertisement"
    >
      <div className="flex items-center gap-2 opacity-40">
        <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
          <span className="text-[8px] text-gray-500 font-bold">AD</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-32 h-2 rounded-full bg-white/8" />
          <div className="w-20 h-1.5 rounded-full bg-white/5" />
        </div>
      </div>
      <span className="text-[9px] text-gray-600 tracking-widest uppercase ml-3">
        AdMob Banner
      </span>
    </div>
  );
}
