import { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Pull-to-refresh wrapper for mobile.
 *
 * Wraps its children in a touch-aware container. When the user pulls
 * down from the top (and the page is scrolled to the top), a spinner
 * appears and `onRefresh` is called. The spinner stays visible until
 * the returned promise resolves.
 *
 * Props:
 *   onRefresh  — async function to call on pull release
 *   children   — page content
 *   disabled   — disable the gesture (e.g. during cooldown)
 */

const THRESHOLD = 80;   // px of pull needed to trigger refresh
const MAX_PULL = 120;    // cap the visual pull distance
const RESISTANCE = 0.4;  // dampen the pull (feels more native)

export default function PullToRefresh({ onRefresh, children, disabled = false }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef(null);

  const onTouchStart = useCallback((e) => {
    if (disabled || refreshing) return;
    // Only activate if scrolled to the top
    const scrollTop = containerRef.current?.scrollTop ?? window.scrollY;
    if (scrollTop > 5) return;

    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [disabled, refreshing]);

  const onTouchMove = useCallback((e) => {
    if (!pulling.current) return;

    const currentY = e.touches[0].clientY;
    const delta = (currentY - startY.current) * RESISTANCE;

    if (delta < 0) {
      // Scrolling up — not a pull gesture
      pulling.current = false;
      setPullDistance(0);
      return;
    }

    const clamped = Math.min(delta, MAX_PULL);
    setPullDistance(clamped);
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= THRESHOLD && onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }

    setPullDistance(0);
  }, [pullDistance, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const showIndicator = pullDistance > 10 || refreshing;

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200 ease-out"
        style={{
          height: refreshing ? 48 : pullDistance > 10 ? pullDistance * 0.5 : 0,
          opacity: showIndicator ? 1 : 0,
        }}
      >
        <div
          className="flex items-center gap-2"
          style={{
            transform: `rotate(${refreshing ? 0 : progress * 360}deg)`,
          }}
        >
          <RefreshCw
            size={20}
            className={`text-[var(--color-brand-gold)] ${refreshing ? 'animate-spin' : ''}`}
          />
        </div>
        {pullDistance >= THRESHOLD && !refreshing && (
          <span className="text-xs text-gray-400 uppercase tracking-widest ml-2">Release</span>
        )}
        {refreshing && (
          <span className="text-xs text-gray-400 uppercase tracking-widest ml-2">Refreshing</span>
        )}
      </div>

      {/* Page content — shifts down with the pull */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: refreshing
            ? 'translateY(0)'
            : pullDistance > 10
              ? `translateY(${pullDistance * 0.15}px)`
              : 'translateY(0)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
