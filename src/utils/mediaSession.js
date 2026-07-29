// Media Session API integration for background audio playback
// This enables:
// 1. Audio continues playing when screen is off / app is in background
// 2. Lock screen controls (play/pause/skip) on mobile
// 3. Hardware media key support (headphones, Bluetooth)

const DEFAULT_ARTWORK = [
  { src: '/src/assets/fav-icon.png', sizes: '96x96', type: 'image/png' },
];

/**
 * Update the Media Session metadata (lock screen info).
 * @param {Object} opts
 * @param {string} opts.title   - e.g. "Surah Al-Baqarah - Ayah 5"
 * @param {string} [opts.artist] - e.g. "Mishari Rashid al-Afasy"
 * @param {string} [opts.album]  - e.g. "Tafheem ul Quran"
 * @param {Array}  [opts.artwork] - MediaImage array
 */
export function updateMediaSessionMetadata({ title, artist = 'Tafheem ul Quran', album = 'Quran Audio', artwork }) {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title,
    artist,
    album,
    artwork: artwork || DEFAULT_ARTWORK,
  });
}

/**
 * Register action handlers so lock-screen / hardware buttons work.
 * @param {Object} handlers
 * @param {Function} [handlers.onPlay]
 * @param {Function} [handlers.onPause]
 * @param {Function} [handlers.onPreviousTrack]
 * @param {Function} [handlers.onNextTrack]
 * @param {Function} [handlers.onStop]
 * @param {Function} [handlers.onSeekTo]
 */
export function setMediaSessionActionHandlers({
  onPlay,
  onPause,
  onPreviousTrack,
  onNextTrack,
  onStop,
  onSeekTo,
} = {}) {
  if (!('mediaSession' in navigator)) return;

  const actions = [
    ['play', onPlay],
    ['pause', onPause],
    ['previoustrack', onPreviousTrack],
    ['nexttrack', onNextTrack],
    ['stop', onStop],
  ];

  for (const [action, handler] of actions) {
    try {
      navigator.mediaSession.setActionHandler(action, handler || null);
    } catch {
      // Some browsers don't support all actions — ignore
    }
  }

  // seekto needs special handling
  if (onSeekTo) {
    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        onSeekTo(details.seekTime);
      });
    } catch {
      // seekto not supported — ignore
    }
  }
}

/**
 * Update the playback position state shown on the lock screen.
 * @param {Object} opts
 * @param {number} opts.duration    - Total duration in seconds
 * @param {number} opts.position    - Current position in seconds
 * @param {number} [opts.playbackRate] - Current playback speed
 */
export function updatePositionState({ duration, position, playbackRate = 1.0 }) {
  if (!('mediaSession' in navigator)) return;
  if (!navigator.mediaSession.setPositionState) return;
  if (!duration || isNaN(duration) || duration <= 0) return;

  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate,
      position: Math.min(position, duration),
    });
  } catch {
    // Ignore errors from invalid state
  }
}

/**
 * Set the media session playback state.
 * @param {'playing'|'paused'|'none'} state
 */
export function setPlaybackState(state) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = state;
}

/**
 * Clear all media session handlers and metadata.
 */
export function clearMediaSession() {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = null;
  navigator.mediaSession.playbackState = 'none';

  const actions = ['play', 'pause', 'previoustrack', 'nexttrack', 'stop', 'seekto'];
  for (const action of actions) {
    try {
      navigator.mediaSession.setActionHandler(action, null);
    } catch {
      // Ignore
    }
  }
}
