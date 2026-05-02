import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Page transition wrapper.
 *
 * Uses a key-driven remount to trigger a CSS enter animation
 * each time the route changes. The fade + slide-up gives a
 * polished feel without heavy dependencies.
 *
 * Also scrolls to top on each navigation.
 */
export default function PageTransition({ children }) {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div
      key={location.pathname}
      className="page-transition page-transition--enter"
      aria-live="polite"
    >
      {children}
    </div>
  );
}
