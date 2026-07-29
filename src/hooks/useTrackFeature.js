import { useCallback, useRef } from 'react';
import { useAnalytics } from '../context/AnalyticsContext';

/**
 * Hook to track feature usage with the analytics dashboard.
 * Automatically handles the case where analytics is not configured.
 *
 * @param {string} featureName - Name of the feature being tracked
 * @returns {{ trackUsage, trackDuration, trackInteraction }}
 */
export function useTrackFeature(featureName) {
  const analytics = useAnalytics();
  const startTimeRef = useRef(null);

  /** Track a simple feature usage event */
  const trackUsage = useCallback((metadata) => {
    if (!analytics) return;
    analytics.trackFeatureUsage(featureName);
    if (metadata) {
      analytics.trackEvent(`${featureName}_usage`, 'feature', { metadata });
    }
  }, [analytics, featureName]);

  /** Start timing (call when feature begins, e.g. audio play) */
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
  }, []);

  /** Stop timing and report duration in seconds */
  const trackDuration = useCallback(() => {
    if (!analytics || !startTimeRef.current) return;
    const seconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    analytics.trackFeatureUsage(featureName, seconds);
    startTimeRef.current = null;
  }, [analytics, featureName]);

  /** Track a specific interaction within the feature */
  const trackInteraction = useCallback((action, metadata) => {
    if (!analytics) return;
    analytics.trackEvent(`${featureName}_${action}`, 'interaction', { metadata });
  }, [analytics, featureName]);

  return { trackUsage, startTimer, trackDuration, trackInteraction };
}

export default useTrackFeature;
