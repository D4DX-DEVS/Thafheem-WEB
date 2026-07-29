import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { API_BASE_PATH } from '../config/apiConfig';
import AnalyticsService from '../services/analyticsService';
import { resolveScreen } from '../config/analyticsScreens';

const AnalyticsContext = createContext(null);

export function useAnalytics() {
  return useContext(AnalyticsContext);
}

/**
 * Tracks route changes automatically — emits a structured `screen_view`
 * event with the canonical screen name + group + current language + sura/ayah
 * params parsed from the URL. Drives the GA-style "which screens do users
 * touch" insight in the analatycs dashboard.
 *
 * Also adds a `mode` dimension ('ayah_wise' | 'block_wise' | undefined) so
 * the dashboard can split the mushaf route `/surah/:id` (which serves BOTH
 * ayah-wise and block-wise views depending on the ThemeContext viewType
 * setting) into two distinct slices.
 */
function RouteTracker() {
  const location = useLocation();
  const analytics = useAnalytics();
  const { translationLanguage, viewType } = useTheme();

  useEffect(() => {
    if (!analytics) return;
    const { screenName, screenGroup } = resolveScreen(location.pathname);

    // Pull sura / ayah from the URL when present (e.g. /surah/:surahId or
    // /word-by-word/:surahId/:verseId) so the dashboard can slice by them.
    const pathParts = location.pathname.split('/').filter(Boolean);
    let suraNumber;
    let ayahNumber;
    if (pathParts[0] === 'surah' && pathParts[1]) {
      suraNumber = Number(pathParts[1]);
    } else if (pathParts[0] === 'blockwise' && pathParts[1]) {
      suraNumber = Number(pathParts[1]);
    } else if (pathParts[0] === 'word-by-word' && pathParts[1]) {
      suraNumber = Number(pathParts[1]);
      if (pathParts[2]) ayahNumber = Number(pathParts[2]);
    }

    // `mode` distinguishes ayah-wise vs block-wise inside the mushaf view.
    // The /surah/:surahId route serves BOTH modes depending on viewType —
    // without this, the dashboard would lump both under surah_reading.
    // /blockwise/:surahId is always block_wise (route-level), so leave its
    // mode explicit too for consistency.
    let mode;
    if (screenName === 'surah_reading' || screenName === 'blockwise') {
      mode = viewType === 'Block Wise' ? 'block_wise' : 'ayah_wise';
    }

    analytics.trackScreenView(screenName, {
      screenGroup,
      language: translationLanguage,
      suraNumber: Number.isFinite(suraNumber) ? suraNumber : undefined,
      ayahNumber: Number.isFinite(ayahNumber) ? ayahNumber : undefined,
      mode,
    });
  }, [location.pathname, analytics, translationLanguage, viewType]);

  return null;
}

/**
 * Wrap your app with this provider (inside Router + AuthProvider).
 * It will:
 *  - Fetch analytics config from backend API on mount
 *  - Start a session on mount (with Firebase user ID if logged in)
 *  - Track every route change automatically
 *  - End session + flush on unmount
 *  - Update user ID when auth state changes
 */
export function AnalyticsProvider({ children }) {
  const { user } = useAuth();
  const instanceRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Fetch analytics config from backend and initialize SDK
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch(`${API_BASE_PATH}/config/analytics`);
        if (!res.ok) return;
        const { apiKey, baseUrl } = await res.json();
        if (cancelled || !apiKey || !baseUrl) return;

        instanceRef.current = new AnalyticsService({
          apiKey,
          baseUrl,
          debug: import.meta.env.DEV,
        });

        const userId = user?.uid || undefined;
        instanceRef.current.startSession(userId);
      } catch {
        // Analytics init failed silently — don't break the app
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
    };
  }, []);

  // Update user ID when auth state changes (login/logout)
  useEffect(() => {
    const sdk = instanceRef.current;
    if (!sdk) return;

    if (user?.uid) {
      sdk.setUserId(user.uid);
    }
  }, [user?.uid]);

  return (
    <AnalyticsContext.Provider value={instanceRef.current}>
      {ready && <RouteTracker />}
      {children}
    </AnalyticsContext.Provider>
  );
}

export default AnalyticsProvider;
