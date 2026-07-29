/**
 * Analytics SDK — lightweight tracking client for the central analytics dashboard.
 * Zero dependencies. Uses native fetch + sendBeacon.
 */

// 15s / 20 events (was 5s / 10): halves request volume from busy reading
// sessions without noticeable data delay.
const FLUSH_INTERVAL = 15_000;
const FLUSH_SIZE = 20;
// Server rejects batches > 100 events; also bound in-memory queue growth.
const MAX_BATCH = 100;
const MAX_QUEUE = 1_000;

function detectDevice() {
  if (typeof navigator === 'undefined') return {};
  const ua = navigator.userAgent;

  let browser = 'unknown';
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';

  let os = 'unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';

  let platform = 'desktop';
  if (/Mobi|Android/i.test(ua)) platform = 'mobile';
  else if (/Tablet|iPad/i.test(ua)) platform = 'tablet';

  return { browser, os, platform, version: '1.0' };
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

class AnalyticsService {
  constructor({ apiKey, baseUrl, debug = false }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.debug = debug;
    this.queue = [];
    this.sessionId = null;
    this.userId = null;
    this.deviceInfo = detectDevice();
    this.destroyed = false;
    this.flushTimer = null;
    this._unloaded = false; // beforeunload can fire twice — guard re-entry
    this._flushing = false; // no concurrent flushes
    this._failCount = 0; // consecutive flush failures → exponential backoff
    this._nextFlushAt = 0; // earliest time the next flush may run

    // Time-on-screen tracking — the last screen_view event currently open,
    // so we can flip it to a duration-enriched screen_exit when the user
    // navigates away or closes the tab. The dashboard's "Avg Duration" /
    // "Top Content by Time Spent" reads from event.duration, which was
    // previously always 0 — see endCurrentScreen().
    this._currentScreen = null; // { screenName, dims, startedAt }

    // Time-on-audio tracking — same pattern as _currentScreen but for audio
    // playback. trackAudioPlay opens it; trackAudioProgress closes it and
    // writes the elapsed seconds as the audio_progress event's duration.
    this._currentAudio = null; // { audioType, suraNumber, ayahNumber, language, reciter, startedAt }

    this._startFlushTimer();
    this._attachUnloadListener();
  }

  // --- Session ---

  async startSession(userId) {
    if (userId) this.userId = userId;
    if (!this.userId) this.userId = this._getOrCreateAnonId();

    try {
      const res = await this._post('/api/analytics/session/start', {
        userId: this.userId,
        deviceInfo: this.deviceInfo,
      });
      const data = await res.json();
      this.sessionId = data?.data?.sessionId ?? null;
      this._log('Session started', this.sessionId);
      return this.sessionId;
    } catch (e) {
      this._log('Session start failed', e);
      return null;
    }
  }

  async endSession() {
    // Close any open screen AND any open audio so their durations are
    // recorded before the session ends.
    this.endCurrentScreen();
    this.trackAudioProgress();
    if (!this.sessionId) return;
    await this.flush();
    try {
      await this._post('/api/analytics/session/end', { sessionId: this.sessionId });
      this._log('Session ended', this.sessionId);
    } catch (e) {
      this._log('Session end failed', e);
    }
    this.sessionId = null;
  }

  // --- Tracking ---

  trackPageView(page, metadata) {
    this._enqueue({
      eventType: 'page_view',
      eventCategory: 'pageview',
      contentTitle: page,
      metadata: {
        ...metadata,
        referrer: typeof document !== 'undefined' ? document.referrer : undefined,
        url: typeof location !== 'undefined' ? location.href : undefined,
      },
    });
  }

  /**
   * Track a logical screen view (GA-style). The screenName is the
   * canonical app surface (e.g. 'surah_reading'); customDimensions carries
   * the structured payload the analytics dashboard will slice on — these
   * keys are project-declared and project-agnostic.
   *
   * Calling this auto-closes any previously-open screen (its dwell time is
   * recorded as a separate `screen_exit` event with `duration` set) so the
   * dashboard's "Avg Duration" / "Top Content by Time Spent" panels populate.
   *
   * @param {string} screenName  Canonical screen name (see analyticsScreens.js)
   * @param {object} [dims]      Custom dimensions, e.g.
   *   { screenGroup, language, suraNumber, ayahNumber, mode }
   */
  trackScreenView(screenName, dims = {}) {
    // Close the previous screen first so dwell time is recorded for it.
    this.endCurrentScreen();

    this._currentScreen = {
      screenName,
      dims,
      startedAt: Date.now(),
    };

    this._enqueue({
      eventType: 'screen_view',
      eventCategory: 'screen',
      contentTitle: screenName,
      customDimensions: { screenName, ...dims },
    });
  }

  /**
   * Close the currently-open screen (if any) and enqueue a `screen_exit`
   * event carrying the dwell time in seconds as `duration`. Idempotent.
   * Called automatically on navigation away (next trackScreenView),
   * on session end, and on page unload.
   */
  endCurrentScreen() {
    if (!this._currentScreen) return;
    const { screenName, dims, startedAt } = this._currentScreen;
    this._currentScreen = null;
    const durationSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));

    this._enqueue({
      eventType: 'screen_exit',
      eventCategory: 'screen',
      contentTitle: screenName,
      contentId: screenName,
      contentType: 'screen',
      duration: durationSeconds,
      customDimensions: { screenName, ...dims },
    });
  }

  /**
   * Generic structured tracker for non-screen hits (audio play, language
   * change, popup open, menu open, etc.).
   *
   * @param {string} hitType       e.g. 'audio_play' | 'audio_progress'
   *                                | 'language_change' | 'popup_open'
   *                                | 'menu_open' | 'feature_use'
   * @param {object} [payload]     { category, title, dimensions, duration }
   */
  track(hitType, payload = {}) {
    this._enqueue({
      eventType: hitType,
      eventCategory: payload.category ?? hitType,
      contentTitle: payload.title,
      contentType: payload.contentType,
      contentId: payload.contentId,
      customDimensions: payload.dimensions,
      duration: payload.duration,
      metadata: payload.metadata,
    });
  }

  // --- Audio ---------------------------------------------------------------
  // Time-on-audio: the SDK tracks the start of every qirath/translation/
  // interpretation playback. Pause/stop/end calls trackAudioProgress which
  // emits an `audio_progress` event with `duration` = seconds actually
  // played. The dashboard's "Audio Type" breakdown gets per-type playback
  // durations from these events.

  /**
   * Fire when audio actually starts. Re-closes any open audio so concurrent
   * plays don't double-count.
   * @param {object} p
   * @param {string} p.audioType     'qirath' | 'translation' | 'interpretation'
   * @param {number} p.suraNumber
   * @param {number} [p.ayahNumber]
   * @param {string} [p.language]    ISO-ish code: 'mal','en','ur','hi','bn','ta'
   * @param {string} [p.reciter]
   */
  trackAudioPlay(p) {
    // Close any currently-playing audio first so its accumulated time is
    // recorded as audio_progress before the new one starts.
    this.trackAudioProgress({
      ...this._currentAudio,
      // If the caller didn't supply durationSeconds, endCurrentAudio computes it.
      durationSeconds: undefined,
    });
    this._currentAudio = {
      audioType: p.audioType,
      suraNumber: p.suraNumber,
      ayahNumber: p.ayahNumber,
      language: p.language,
      reciter: p.reciter,
      startedAt: Date.now(),
      accumulatedSeconds: 0,
    };
    this.track('audio_play', {
      category: 'audio',
      title: p.audioType,
      contentType: p.audioType,
      contentId: p.ayahNumber != null ? `${p.suraNumber}:${p.ayahNumber}` : `${p.suraNumber}`,
      dimensions: { audioType: p.audioType, suraNumber: p.suraNumber, ayahNumber: p.ayahNumber, language: p.language, reciter: p.reciter },
    });
  }

  /**
   * Fire on pause/stop/end with the cumulative seconds played. If called
   * without an explicit `durationSeconds`, the SDK auto-computes the elapsed
   * time since the matching trackAudioPlay.
   * @param {object} p
   * @param {string} [p.audioType]
   * @param {number} [p.suraNumber]
   * @param {number} [p.ayahNumber]
   * @param {string} [p.language]
   * @param {string} [p.reciter]
   * @param {number} [p.durationSeconds]  Pass for explicit durations;
   *   omit to auto-compute from the open play.
   */
  trackAudioProgress(p = {}) {
    if (!this._currentAudio && p.durationSeconds == null) return;
    const base = this._currentAudio || {};
    const seconds =
      p.durationSeconds != null
        ? p.durationSeconds
        : Math.max(0, Math.round((Date.now() - (base.startedAt || Date.now())) / 1000));
    if (seconds <= 0 && !this._currentAudio) return;

    this.track('audio_progress', {
      category: 'audio',
      title: p.audioType || base.audioType,
      contentType: p.audioType || base.audioType,
      contentId: (p.ayahNumber != null || base.ayahNumber != null)
        ? `${p.suraNumber ?? base.suraNumber}:${p.ayahNumber ?? base.ayahNumber}`
        : `${p.suraNumber ?? base.suraNumber}`,
      duration: seconds,
      dimensions: {
        audioType: p.audioType || base.audioType,
        suraNumber: p.suraNumber ?? base.suraNumber,
        ayahNumber: p.ayahNumber ?? base.ayahNumber,
        language: p.language ?? base.language,
        reciter: p.reciter ?? base.reciter,
      },
    });
    // Reset the open screen. (If the caller wants to resume after pause,
    // they should call trackAudioPlay again — which restarts timing.)
    this._currentAudio = null;
  }

  // --- Language ------------------------------------------------------------
  /**
   * @param {string} from  Language code (normalized: mal/en/ur/hi/bn/ta)
   * @param {string} to    Language code (normalized)
   */
  trackLanguageChange(from, to) {
    this.track('language_change', {
      category: 'language',
      title: to,
      dimensions: { languageFrom: from, languageTo: to, language: to },
    });
  }

  // --- UI interactions -----------------------------------------------------
  /** Open side menu — record destination page. */
  trackMenuOpen(targetPage) {
    this.track('menu_open', {
      category: 'interaction',
      title: targetPage,
      dimensions: { menuTarget: targetPage },
    });
  }

  /**
   * @param {object} p
   * @param {string} p.popupType   'interpretation' | 'footnote' | 'translation'
   * @param {number} p.suraNumber
   * @param {number} [p.ayahNumber]
   * @param {string} [p.scope]     'ayah' | 'block'
   * @param {string} [p.language]
   */
  trackPopupOpen(p) {
    this.track('popup_open', {
      category: 'interaction',
      title: p.popupType,
      dimensions: {
        popupType: p.popupType,
        suraNumber: p.suraNumber,
        ayahNumber: p.ayahNumber,
        scope: p.scope,
        language: p.language,
      },
    });
  }

  trackEvent(eventName, category, options = {}) {
    this._enqueue({
      eventType: eventName,
      eventCategory: category,
      contentId: options.contentId,
      contentType: options.contentType,
      contentTitle: options.contentTitle,
      metadata: options.metadata,
      duration: options.duration,
    });
  }

  trackError(error, context) {
    this._enqueue({
      eventType: error.type ?? 'js_error',
      eventCategory: 'error',
      metadata: {
        message: error.message,
        stack: error.stack,
        page: typeof location !== 'undefined' ? location.href : undefined,
        ...context,
      },
    });
  }

  trackPerformance(metrics) {
    this._enqueue({
      eventType: 'performance',
      eventCategory: 'performance',
      metadata: {
        ...metrics,
        page: typeof location !== 'undefined' ? location.href : undefined,
      },
    });
  }

  trackFeatureUsage(featureName, duration) {
    this._enqueue({
      eventType: 'feature_use',
      eventCategory: 'feature',
      contentTitle: featureName,
      duration,
    });
  }

  setUserId(userId) {
    if (userId === this.userId) return;
    this.userId = userId;
    // Session belongs to the previous user — drop it so the next
    // startSession() opens a fresh one attributed to the new user.
    this.sessionId = null;
  }

  // --- Queue ---

  async flush() {
    if (this.queue.length === 0) return;
    if (this._flushing) return;
    // Exponential backoff after failures — retrying every 5s forever
    // hammered the backend (and stored duplicates before eventId dedup).
    if (Date.now() < this._nextFlushAt) return;

    this._flushing = true;
    // Server caps a batch at MAX_BATCH events — send in chunks.
    const events = this.queue.splice(0, MAX_BATCH).map((e) => ({
      ...e,
      // Backfill sessionId for events queued before startSession resolved.
      sessionId: e.sessionId ?? this.sessionId ?? undefined,
    }));
    try {
      const res = await this._post('/api/analytics/events/batch', { events });
      if (res.status === 429 || res.status >= 500) throw new Error(`flush rejected: ${res.status}`);
      // Other 4xx = invalid payload; drop rather than retry a poison batch.
      this._failCount = 0;
      this._nextFlushAt = 0;
      this._log(`Flushed ${events.length} events`);
      if (this.queue.length > 0) {
        this._flushing = false;
        return this.flush(); // drain remaining chunks
      }
    } catch (e) {
      // Re-queue the chunk and back off: 10s, 20s, 40s … capped at 5 min.
      // Events carry eventIds, so overlapping retries are deduped server-side.
      this.queue.unshift(...events);
      this._failCount++;
      this._nextFlushAt = Date.now() + Math.min(300_000, 5_000 * 2 ** this._failCount);
      this._log('Flush failed, re-queued', e);
    } finally {
      this._flushing = false;
    }
  }

  async destroy() {
    this.destroyed = true;
    if (this.flushTimer) clearInterval(this.flushTimer);
    // Close the open screen so its dwell time is queued before the final flush.
    this.endCurrentScreen();
    await this.flush();
    await this.endSession();
  }

  // --- Internal ---

  _enqueue(event) {
    if (this.destroyed) return;
    this.queue.push({
      // Idempotency id — the backend's unique index dedups retries and
      // beacon replays, so network flakiness can't store duplicates.
      eventId: generateId(),
      eventType: event.eventType,
      eventCategory: event.eventCategory,
      userId: this.userId,
      sessionId: this.sessionId ?? undefined,
      contentId: event.contentId,
      contentType: event.contentType,
      contentTitle: event.contentTitle,
      metadata: event.metadata,
      customDimensions: event.customDimensions,
      duration: event.duration,
      deviceInfo: this.deviceInfo,
    });
    // Bound memory if the backend is unreachable for a while — keep newest.
    if (this.queue.length > MAX_QUEUE) {
      this.queue.splice(0, this.queue.length - MAX_QUEUE);
    }
    if (this.queue.length >= FLUSH_SIZE) {
      this.flush();
    }
  }

  _startFlushTimer() {
    if (typeof setInterval === 'undefined') return;
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL);
  }

  _attachUnloadListener() {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeunload', () => {
      // beforeunload can fire more than once — guard so the queue and the
      // session-end beacon only go out once.
      if (this._unloaded) return;
      this._unloaded = true;

      // Close any open screen + audio first so their dwell times are queued
      // before the final beacon sends everything off.
      this.endCurrentScreen();
      this.trackAudioProgress();

      // sendBeacon cannot set headers — the API key goes in the query string
      // (previously these beacons were silently rejected with 401, losing
      // unload data and leaving sessions open forever).
      const key = encodeURIComponent(this.apiKey);
      if (this.queue.length > 0 && navigator.sendBeacon) {
        // Server caps a batch at MAX_BATCH; beacons also have a ~64KB budget.
        const events = this.queue.slice(-MAX_BATCH).map((e) => ({
          ...e,
          sessionId: e.sessionId ?? this.sessionId ?? undefined,
        }));
        navigator.sendBeacon(
          `${this.baseUrl}/api/analytics/events/batch?apiKey=${key}`,
          new Blob([JSON.stringify({ events })], { type: 'application/json' })
        );
        this.queue = [];
      }
      if (this.sessionId && navigator.sendBeacon) {
        navigator.sendBeacon(
          `${this.baseUrl}/api/analytics/session/end?apiKey=${key}`,
          new Blob([JSON.stringify({ sessionId: this.sessionId })], { type: 'application/json' })
        );
      }
    });
  }

  _post(path, body) {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey },
      body: JSON.stringify(body),
    });
  }

  _getOrCreateAnonId() {
    // localStorage (was sessionStorage): a per-tab anon id counted every new
    // tab/visit as a brand-new unique user, inflating user counts and
    // creating extra sessions.
    if (typeof localStorage === 'undefined') return `anon_${generateId()}`;
    const key = '__thafheem_anon_id__';
    let id = localStorage.getItem(key);
    if (!id) {
      id = `anon_${generateId()}`;
      localStorage.setItem(key, id);
    }
    return id;
  }

  _log(...args) {
    if (this.debug) console.log('[Analytics]', ...args);
  }
}

export default AnalyticsService;
