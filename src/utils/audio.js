// Audio utilities for ayah-wise playback

import { fetchUrduTranslationAudio, fetchUrduInterpretationAudio } from '../api/apifunction';
import audioManager from './audioManager';

const QARI_INITIALS = {
	"al-ghamidi": "G",
	"al-afasy": "A",
	"al-hudaify": "H",
};

export async function buildAyahAudioUrl({ ayahNumber, surahNumber, audioType = "qirath", qariName = "al-afasy", translationLanguage = null, pairedAyah = null }) {
	const surahPadded = String(surahNumber).padStart(3, "0");
	const ayahPadded = String(ayahNumber).padStart(3, "0");

	// For combined ayah pairs, use combined URL format directly as primary
	if (pairedAyah && (audioType === "translation" || audioType === "interpretation")) {
		const pairedAyahPadded = String(pairedAyah).padStart(3, "0");
		const prefix = audioType === "translation" ? "T" : "I";
		const folder = audioType;
		const combinedUrl = `https://thafheem.net/audio/${folder}/${prefix}${surahPadded}_${ayahPadded},${pairedAyahPadded}.ogg`;
		const individualUrl = `https://thafheem.net/audio/${folder}/${prefix}${surahPadded}_${ayahPadded}.ogg`;
		return { primary: combinedUrl, fallbacks: [individualUrl] };
	}

	if (audioType === "translation") {
		// Only support translation audio for Urdu and Malayalam
		if (translationLanguage !== 'ur' && translationLanguage !== 'mal') {
			return { primary: null, fallbacks: [] };
		}
		// For Urdu, fetch from API (language code is 'ur')
		if (translationLanguage === 'ur') {
			const audioUrl = await fetchUrduTranslationAudio(surahNumber, ayahNumber);
			if (audioUrl) return { primary: audioUrl, fallbacks: [] };
			// If API fails, return null instead of falling back to Malayalam pattern
			return { primary: null, fallbacks: [] };
		}
		// For Malayalam, use default pattern
		const primaryUrl = `https://thafheem.net/audio/translation/T${surahPadded}_${ayahPadded}.ogg`;
		// Generate fallback URLs for grouped/combined ayah audio files
		// Fallback 1: backward combo — T{surah}_{prev},{current}.ogg (this ayah is the second in a pair)
		// Fallback 2: forward combo  — T{surah}_{current},{next}.ogg (this ayah is the first in a pair)
		const fallbacks = [];
		if (translationLanguage === 'mal' && ayahNumber > 1) {
			const previousAyahPadded = String(ayahNumber - 1).padStart(3, "0");
			fallbacks.push(`https://thafheem.net/audio/translation/T${surahPadded}_${previousAyahPadded},${ayahPadded}.ogg`);
		}
		if (translationLanguage === 'mal') {
			const nextAyahPadded = String(ayahNumber + 1).padStart(3, "0");
			fallbacks.push(`https://thafheem.net/audio/translation/T${surahPadded}_${ayahPadded},${nextAyahPadded}.ogg`);
		}
		return { primary: primaryUrl, fallbacks };
	}

	if (audioType === "interpretation") {
		// For Urdu, fetch from API (language code is 'ur')
		if (translationLanguage === 'ur') {
			const audioUrl = await fetchUrduInterpretationAudio(surahNumber, ayahNumber);
			if (audioUrl) return { primary: audioUrl, fallbacks: [] };
			// If API fails, return null instead of falling back to Malayalam pattern
			return { primary: null, fallbacks: [] };
		}
		// For Malayalam, use default pattern with fallbacks for grouped ayahs
		const primaryUrl = `https://thafheem.net/audio/interpretation/I${surahPadded}_${ayahPadded}.ogg`;
		const fallbacks = [];
		if (translationLanguage === 'mal' && ayahNumber > 1) {
			const previousAyahPadded = String(ayahNumber - 1).padStart(3, "0");
			fallbacks.push(`https://thafheem.net/audio/interpretation/I${surahPadded}_${previousAyahPadded},${ayahPadded}.ogg`);
		}
		if (translationLanguage === 'mal') {
			const nextAyahPadded = String(ayahNumber + 1).padStart(3, "0");
			fallbacks.push(`https://thafheem.net/audio/interpretation/I${surahPadded}_${ayahPadded},${nextAyahPadded}.ogg`);
		}
		return { primary: primaryUrl, fallbacks };
	}

	// Default to qirath/quran
	const qariInitial = QARI_INITIALS[qariName] || "A"; // default Afasy
	const prefix = `Q${qariInitial}`;
	return { primary: `https://thafheem.net/audio/qirath/${qariName}/${prefix}${surahPadded}_${ayahPadded}.ogg`, fallbacks: [] };
}

// Plays given ayah and updates callbacks for state
export async function playAyahAudio({ ayahNumber, surahNumber, audioType = "qirath", qariName = "al-afasy", playbackSpeed = 1.0, translationLanguage = null, pairedAyah = null, onStart, onEnd, onError, onAudioElement }) {
	const urls = await buildAyahAudioUrl({ ayahNumber, surahNumber, audioType, qariName, translationLanguage, pairedAyah });

	// If URL is null, handle based on audio type and language
	if (!urls || !urls.primary) {
		// For Urdu translation/interpretation audio, 404s are expected for ayahs that are not
		// the last in their range. Skip silently without triggering error callback.
		if (audioType === "translation" && translationLanguage === 'ur') {
			// Silently skip - this is expected behavior for Urdu translation audio ranges
			return null;
		}
		if (audioType === "interpretation" && translationLanguage === 'ur') {
			// Silently skip - this is expected behavior for Urdu interpretation audio ranges
			return null;
		}
		// For other cases, trigger error callback
		if (typeof onError === "function") {
			onError(new Error(`Audio URL not available for ${audioType}`));
		}
		return null;
	}

	// Track which fallback index we're on and guard against duplicate attempts
	let currentFallbackIndex = -1; // -1 = primary, 0 = first fallback, etc.
	let isTryingFallback = false;
	const fallbacks = urls.fallbacks || [];

	// Helper: try the next fallback URL, or give up
	const tryNextFallback = (errorEvent) => {
		const nextIndex = currentFallbackIndex + 1;
		if (nextIndex < fallbacks.length) {
			currentFallbackIndex = nextIndex;
			isTryingFallback = true;
			console.log(`[audio.js] ${audioType} audio failed, trying fallback ${nextIndex + 1}/${fallbacks.length}:`, fallbacks[nextIndex]);
			return tryLoadAudio(fallbacks[nextIndex], true);
		}
		// All fallbacks exhausted
		if (audioType !== "interpretation") {
			console.error(`Audio error for ${audioType} (all fallbacks exhausted):`, errorEvent);
		} else {
			if (import.meta?.env?.DEV) {
				console.warn(`Interpretation audio not available for ayah ${ayahNumber} in surah ${surahNumber}`);
			}
		}
		if (typeof onError === "function") onError(errorEvent);
		return null;
	};

	// Helper function to try loading audio with fallback support
	const tryLoadAudio = (urlToTry, isFallback = false) => {
		// Check if audio should be stopped (language changed)
		if (audioManager.getShouldStop()) {
			return null;
		}

		// Reset fallback flag when starting a new primary audio load
		if (!isFallback) {
			isTryingFallback = false;
			currentFallbackIndex = -1;
		}

		const audio = new Audio(urlToTry);
		audio.preload = "auto";
		audio.playbackRate = playbackSpeed;

		// Register audio with global manager
		audioManager.register(audio);

		// Notify caller of new audio element (important for fallbacks so UI can track the right element)
		if (typeof onAudioElement === "function") {
			onAudioElement(audio);
		}

		// Ensure playback speed is applied after audio metadata loads
		const handleLoadedMetadata = () => {
			if (audio) {
				audio.playbackRate = playbackSpeed;
			}
			audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
		};
		audio.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });

		const handleCanPlay = () => {
			if (audio) {
				audio.playbackRate = playbackSpeed;
			}
			audio.removeEventListener('canplay', handleCanPlay);
		};
		audio.addEventListener('canplay', handleCanPlay, { once: true });

		// Track if error has been handled to prevent duplicate callbacks
		let errorHandled = false;
		const handleError = (e) => {
			if (errorHandled) return;
			errorHandled = true;

			// Guard against multiple handlers triggering fallback simultaneously
			if (isTryingFallback && !isFallback) {
				if (import.meta?.env?.DEV) {
					console.log('[audio.js] onerror handler aborted - fallback already being attempted');
				}
				return;
			}

			// Try next fallback if available (works for both translation and interpretation)
			if (translationLanguage === 'mal' && currentFallbackIndex < fallbacks.length - 1) {
				return tryNextFallback(e);
			}

			// No more fallbacks — report error
			if (audioType !== "interpretation") {
				console.error(`Audio error for ${audioType}:`, e);
			} else {
				if (import.meta?.env?.DEV) {
					console.warn(`Interpretation audio not available for ayah ${ayahNumber} in surah ${surahNumber}`);
				}
			}
			if (typeof onError === "function") onError(e);
		};

		// Set up event handlers before playing
		audio.onplay = () => {
			if (typeof onStart === "function") onStart();
		};
		if (typeof onEnd === "function") audio.onended = onEnd;
		if (typeof onError === "function") {
			audio.onerror = handleError;
		}

		// Check again before playing (language might have changed during async operations)
		if (audioManager.getShouldStop()) {
			audio.pause();
			return null;
		}

		// Start loading and playing
		audio.play().catch((e) => {
			// Don't handle errors if language changed
			if (audioManager.getShouldStop()) {
				return null;
			}

			// Guard against multiple handlers triggering fallback simultaneously
			if (isTryingFallback && !isFallback) {
				if (import.meta?.env?.DEV) {
					console.log('[audio.js] play().catch() handler aborted - fallback already being attempted');
				}
				return;
			}

			// Try next fallback if available
			if (translationLanguage === 'mal' && currentFallbackIndex < fallbacks.length - 1) {
				return tryNextFallback(e);
			}

			handleError(e);
		});

		return audio;
	};

	// Start loading with primary URL
	return tryLoadAudio(urls.primary, false);
}

export function getQariInitial(qariName) {
	return QARI_INITIALS[qariName] || "A";
}

/**
 * Preload the audio for a given ayah so it's in the browser cache when needed.
 * Call this while the current ayah is still playing to eliminate load delay.
 */
export async function preloadAyahAudio({ ayahNumber, surahNumber, audioType = "qirath", qariName = "al-afasy", translationLanguage = null, pairedAyah = null }) {
	try {
		const urls = await buildAyahAudioUrl({ ayahNumber, surahNumber, audioType, qariName, translationLanguage, pairedAyah });
		if (urls?.primary) {
			audioManager.preload(urls.primary);
		}
	} catch {
		// Silently ignore preload errors
	}
}


