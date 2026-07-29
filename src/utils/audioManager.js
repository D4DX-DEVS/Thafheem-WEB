import { setPlaybackState, clearMediaSession } from './mediaSession';

// Global audio manager to track and stop all audio instances
class AudioManager {
  constructor() {
    this.activeAudios = new Set();
    this.shouldStop = false;
    this.listeners = [];
  }

  // Register an audio element
  register(audio) {
    if (audio && audio instanceof HTMLAudioElement) {
      this.activeAudios.add(audio);
      // Auto-remove when audio ends or errors
      const removeAudio = () => {
        this.activeAudios.delete(audio);
        audio.removeEventListener('ended', removeAudio);
        audio.removeEventListener('error', removeAudio);
      };
      audio.addEventListener('ended', removeAudio, { once: true });
      audio.addEventListener('error', removeAudio, { once: true });
    }
  }

  // Preload an audio URL into the browser's HTTP cache.
  // When the same URL is later used with new Audio(url), it loads instantly from cache.
  preload(url) {
    if (!url) return;
    // Use 'no-cors' so the opaque response is cached even if the CDN lacks CORS headers.
    // Audio() elements make same-kind requests and will find this in the HTTP cache.
    fetch(url, { mode: 'no-cors', credentials: 'omit', priority: 'low' }).catch(() => {
      // Silently ignore preload errors — not critical
    });
  }

  // Stop all active audio instances
  stopAll() {
    this.shouldStop = true;
    this.activeAudios.forEach(audio => {
      try {
        if (audio && !audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
        // Clear event handlers to prevent callbacks
        audio.onended = null;
        audio.onerror = null;
      } catch (e) {
        console.warn('[AudioManager] Error stopping audio:', e);
      }
    });
    this.activeAudios.clear();
    // Clear media session when all audio is stopped
    setPlaybackState('none');
    clearMediaSession();
    // Reset flag after a short delay
    setTimeout(() => {
      this.shouldStop = false;
    }, 100);
  }

  // Stop all audio instances EXCEPT the one passed in (for pause without killing resume ability)
  stopAllExcept(keepAudio) {
    this.activeAudios.forEach(audio => {
      if (audio === keepAudio) return;
      try {
        if (audio && !audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
        // Clear event handlers to prevent stale callbacks
        audio.onended = null;
        audio.onerror = null;
      } catch (e) {
        console.warn('[AudioManager] Error stopping audio:', e);
      }
    });
    // Remove all except the kept audio
    this.activeAudios.clear();
    if (keepAudio) {
      this.activeAudios.add(keepAudio);
    }
  }

  // Check if audio should be stopped (for preventing new audio from starting)
  getShouldStop() {
    return this.shouldStop;
  }

  // Add listener for language change events
  setupLanguageChangeListener() {
    const handleLanguageChange = () => {
      this.stopAll();
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
    };
  }
}

// Create singleton instance
const audioManager = new AudioManager();

// Setup global listener
audioManager.setupLanguageChangeListener();

export default audioManager;



