import { WifiOff } from 'lucide-react';
import { useNetwork } from '../hooks/useNetwork';

/**
 * Sticky banner shown when the device has no network connection.
 * Disappears automatically when connectivity returns.
 */
export default function OfflineBanner() {
  const { isOnline } = useNetwork();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-16 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 px-4 bg-amber-600/90 text-black text-sm font-medium backdrop-blur-sm shadow-lg"
    >
      <WifiOff size={14} aria-hidden="true" />
      <span>You're offline — showing cached data</span>
    </div>
  );
}
