import { useEffect } from 'react';

/**
 * Page scroll lock shared by every modal, popup and drawer.
 *
 * The lock is applied to <html>, not <body>: index.css sets
 * `html { overflow-x: clip }`, which makes the viewport take its overflow from
 * <html>, so `body { overflow: hidden }` never stops the page from scrolling.
 *
 * Locks are reference-counted so nested overlays (e.g. a verse reference popup
 * opened from an interpretation modal) don't unlock the page when the inner
 * one closes.
 */
let lockCount = 0;
let savedStyles = null;

function lockScroll() {
  lockCount += 1;
  if (lockCount > 1) return;

  const html = document.documentElement;
  const hasScrollbar = window.innerWidth > html.clientWidth;
  savedStyles = {
    overflow: html.style.overflow,
    scrollbarGutter: html.style.scrollbarGutter,
  };
  // Keep the scrollbar's space reserved so the page doesn't shift sideways
  if (hasScrollbar) html.style.scrollbarGutter = 'stable';
  html.style.overflow = 'hidden';
}

function unlockScroll() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0 || !savedStyles) return;

  const html = document.documentElement;
  html.style.overflow = savedStyles.overflow;
  html.style.scrollbarGutter = savedStyles.scrollbarGutter;
  savedStyles = null;
}

/**
 * Prevent the page behind an overlay from scrolling while `active` is true.
 *
 * @param {boolean} [active=true] - Whether the lock should be held
 */
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    lockScroll();
    return unlockScroll;
  }, [active]);
}

export default useScrollLock;
