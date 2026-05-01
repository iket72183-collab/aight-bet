import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';

/**
 * Reads consent flag from localStorage.
 * Extracted outside the component so we can use it as the initial state
 * and avoid calling setState inside an effect (lint: react-hooks/set-state-in-effect).
 */
function needsConsent() {
  try {
    return !localStorage.getItem('aight_bet_disclaimer_consent');
  } catch {
    return true;
  }
}

export default function AgeGateModal() {
  const [isOpen, setIsOpen] = useState(needsConsent);
  const [denied, setDenied] = useState(false);

  const modalRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement;
    requestAnimationFrame(() => confirmButtonRef.current?.focus());

    return () => {
      const previous = previousFocusRef.current;
      if (previous && typeof previous.focus === 'function') {
        previous.focus();
      }
    };
  }, [isOpen]);

  // Trap Tab focus inside the modal — Escape is intentionally ignored, the gate must be answered.
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e) => {
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const handleConfirm = () => {
    localStorage.setItem('aight_bet_disclaimer_consent', 'true');
    setIsOpen(false);
  };

  const handleDeny = () => {
    setDenied(true);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
      aria-describedby="disclaimer-description"
    >
      {/* Blurred impenetrable backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl pointer-events-auto"></div>

      <div
        ref={modalRef}
        className="bg-[#111] border border-white/10 p-8 md:p-12 rounded-2xl max-w-xl w-full relative z-10 shadow-2xl flex flex-col items-center text-center"
      >

        <div className="w-16 h-16 bg-[var(--color-brand-gold)]/10 rounded-full flex items-center justify-center mb-6">
          <Info size={32} className="text-[var(--color-brand-gold)]" />
        </div>

        <h2 id="disclaimer-title" className="text-3xl font-[Outfit] font-extrabold text-white mb-2 tracking-wide">
          CONSULTATION ONLY
        </h2>

        <p id="disclaimer-description" className="text-gray-300 mb-8 max-w-sm mx-auto leading-relaxed">
          Aight Bet is a sports odds consultation tool for informational purposes only. This app does not accept, facilitate, or process wagers of any kind.
        </p>

        {denied ? (
          <div className="w-full bg-red-500/10 border border-red-500/30 p-4 rounded-xl mb-6 animate-in fade-in zoom-in duration-300">
            <p className="text-red-400 text-sm font-medium">
              You must acknowledge this disclaimer to use Aight Bet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <button
              ref={confirmButtonRef}
              onClick={handleConfirm}
              className="w-full py-4 bg-gradient-to-r from-[var(--color-brand-gold-dark)] to-[var(--color-brand-gold)] rounded-sm text-white font-[Outfit] font-bold text-lg tracking-wider hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              I UNDERSTAND
            </button>
            <button
              onClick={handleDeny}
              className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-sm text-gray-200 font-[Outfit] font-medium tracking-wide transition-colors">
              EXIT
            </button>
          </div>
        )}

        <p className="mt-8 text-xs text-gray-400 max-w-xs mx-auto">
          By continuing, you agree to our Terms of Service and Privacy Policy. All odds data is publicly available and provided for reference only.
        </p>
      </div>
    </div>
  );
}
