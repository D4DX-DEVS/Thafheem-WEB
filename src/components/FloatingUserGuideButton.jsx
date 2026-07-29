import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { HelpCircle, X } from "lucide-react";

// Fade transition length in ms. NOTE: must match the literal `duration-300`
// Tailwind class below; update both together if this value changes.
const FADE_MS = 300;

/**
 * Floating onboarding button shown on the Home page (Malayalam only).
 * Nudges users toward the existing `/user-guide` route. Visible until the
 * user manually dismisses it via the × button (no auto-hide).
 *
 * Dismissal is purely in-memory: the button hides for the current visit and
 * reappears on the next page load (refresh / navigation back to Home) so the
 * nudge is always available. Users can also reach the guide via the navbar
 * menu and footer link.
 *
 * @returns {JSX.Element | null}
 */
function FloatingUserGuideButton() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const fadeOutTimerRef = useRef(null);

  /**
   * Fade the button out, then unmount it for the rest of this visit.
   * Triggered only by the manual × dismiss or the click-through navigation.
   * Does NOT persist dismissal — a refresh remounts the component and the
   * button appears again.
   */
  const triggerHide = useCallback(() => {
    setShow(false);
    fadeOutTimerRef.current = setTimeout(() => {
      setMounted(false);
      setDismissed(true);
    }, FADE_MS);
  }, []);

  // On mount: if not already dismissed this visit, mount + fade-in. No
  // auto-hide timer is armed — the button stays until manually dismissed.
  // Cleanup the fade-out timer on unmount.
  useEffect(() => {
    if (dismissed) {
      return undefined;
    }

    setMounted(true);
    // Defer show to the next tick so the opacity/scale transition runs.
    const fadeInTimer = setTimeout(() => setShow(true), 10);

    return () => {
      clearTimeout(fadeInTimer);
      if (fadeOutTimerRef.current) {
        clearTimeout(fadeOutTimerRef.current);
        fadeOutTimerRef.current = null;
      }
    };
  }, [dismissed]);

  const handleNavigate = () => {
    navigate("/user-guide");
    triggerHide();
  };

  const handleDismiss = (event) => {
    event.stopPropagation();
    triggerHide();
  };

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`fixed right-3 sm:right-4 top-1/2 -translate-y-1/2 z-50 flex items-center bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white rounded-full shadow-md transition-all duration-300 ease-out ${
        show
          ? "opacity-100 scale-100"
          : "opacity-0 scale-95 pointer-events-none"
      }`}
      role="region"
      aria-label="User guide onboarding"
    >
      <button
        type="button"
        onClick={handleNavigate}
        className="flex items-center gap-1.5 pl-3 pr-2 sm:pr-1.5 py-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-cyan-500"
        aria-label="Open user guide"
        title="Open user guide"
      >
        <HelpCircle className="w-4 h-4 flex-shrink-0" />
        <span className="hidden sm:inline text-xs font-medium">
          User Guide
        </span>
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className="flex items-center justify-center w-5 h-5 mr-1 rounded-full hover:bg-white/20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-cyan-500 transition-colors"
        aria-label="Dismiss user guide hint"
        title="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export default FloatingUserGuideButton;
