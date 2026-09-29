import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Plays one section's audio at a time through a single shared Audio element.
 * Starting another section stops the current one; a file that fails to load is
 * remembered in `failedKeys` so its button can show that audio is unavailable,
 * and toggling that key again retries the load.
 *
 * @returns {{
 *   playingKey: string | number | null,
 *   failedKeys: Set<string | number>,
 *   toggle: (key: string | number, src: string) => void,
 *   stop: () => void,
 * }}
 */
export default function useSectionAudio() {
  const audioRef = useRef(null);
  const currentKeyRef = useRef(null);
  const [playingKey, setPlayingKey] = useState(null);
  const [failedKeys, setFailedKeys] = useState(() => new Set());

  const markFailed = useCallback((key) => {
    setPlayingKey(null);
    if (key === null) return;
    // Forget the loaded source so the next toggle for this key reloads it (retry).
    if (currentKeyRef.current === key) currentKeyRef.current = null;
    setFailedKeys((prev) => new Set(prev).add(key));
  }, []);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "none";
      audio.onplay = () => setPlayingKey(currentKeyRef.current);
      audio.onpause = () => setPlayingKey(null);
      audio.onended = () => setPlayingKey(null);
      audio.onerror = () => markFailed(currentKeyRef.current);
      audioRef.current = audio;
    }
    return audioRef.current;
  }, [markFailed]);

  const toggle = useCallback(
    (key, src) => {
      const audio = getAudio();
      if (currentKeyRef.current === key && !audio.paused) {
        audio.pause();
        return;
      }
      if (currentKeyRef.current !== key) {
        currentKeyRef.current = key;
        audio.src = src;
      }
      // A retry after a failed load: clear the failure so the button reads as normal.
      setFailedKeys((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      audio.play().catch((error) => {
        // AbortError: superseded by a newer toggle, nothing to report.
        if (error?.name === "AbortError") return;
        if (error?.name === "NotSupportedError") {
          markFailed(key);
          return;
        }
        setPlayingKey(null);
      });
    },
    [getAudio, markFailed]
  );

  const stop = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  // Stop playback when the page unmounts.
  useEffect(
    () => () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
      }
    },
    []
  );

  return { playingKey, failedKeys, toggle, stop };
}
