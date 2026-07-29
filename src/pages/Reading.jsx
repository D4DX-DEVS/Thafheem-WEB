import {
  Share2,
  Bookmark,
  Play,
  Heart,
  Info,
  LibraryBig,
  Notebook,
  ChevronDown,
} from "lucide-react";

// Kaaba icon for Makki surahs
const KaabaIcon = ({ className }) => (
  <svg viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M1 4.05096L5.50813 6.87531M1 4.05096L5.50813 1.22656L10.0017 4.05096M1 4.05096V5.72135M5.50813 12.2306L1 9.44877V5.72135M5.50813 12.2306L10.0017 9.44877V5.72135M5.50813 12.2306V8.52443M5.50813 6.87531L10.0017 4.05096M5.50813 6.87531V8.52443M10.0017 4.05096V5.72135M10.0017 5.72135L5.50813 8.52443M5.50813 8.52443L1 5.72135" stroke="currentColor" strokeLinejoin="round" />
  </svg>
);

// Madina icon for Madani surahs
const MadinaIcon = ({ className }) => (
  <svg width="11" height="15" viewBox="0 0 11 15" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M5.625 1.0498C5.96379 1.0415 6.15318 1.43447 5.9375 1.69434L5.93848 1.69531C5.8059 1.85727 5.73354 2.06001 5.7334 2.26953C5.73364 2.7733 6.13675 3.17749 6.63965 3.17773C6.8485 3.17752 7.05247 3.1038 7.21484 2.9707C7.35907 2.84911 7.5516 2.85714 7.68555 2.94922C7.82703 3.0465 7.89339 3.22605 7.83203 3.42188C7.62359 4.1963 6.95559 4.74982 6.16699 4.82324V4.96973C6.38842 5.29376 6.73956 5.57803 7.17188 5.86035C7.39553 6.00639 7.63673 6.14949 7.88672 6.29688C8.13549 6.44354 8.39372 6.59442 8.64746 6.75391C9.69542 7.41265 10.702 8.26832 10.7217 9.86133C10.7302 10.5552 10.5894 11.4633 9.97949 12.293C10.3948 12.3364 10.7226 12.6925 10.7227 13.1182V13.9834C10.7235 14.202 10.5466 14.3792 10.3281 14.3789V14.3799H1.21582C0.998036 14.379 0.822454 14.2011 0.823242 13.9834V13.1182C0.823351 12.6643 1.19496 12.2891 1.65039 12.2891H8.89941C9.63381 11.6946 9.91674 10.8407 9.93359 9.86035C9.95344 8.7001 9.20568 8.05633 8.22656 7.4209C7.99002 7.26739 7.75176 7.12838 7.51562 6.99219C7.28064 6.85666 7.04583 6.72296 6.82227 6.58398C6.43649 6.34416 6.0728 6.08117 5.77148 5.74121C5.46708 6.08406 5.09223 6.35958 4.7002 6.60547C4.47252 6.74826 4.23591 6.88329 4.00293 7.0166C3.76878 7.15058 3.53754 7.28322 3.31543 7.42285C2.42056 7.98548 1.62622 8.63485 1.61133 9.86523C1.6014 10.6849 1.83171 11.2575 2.07324 11.6484H2.07227C2.13777 11.7504 2.15412 11.8634 2.12402 11.9678C2.0949 12.0686 2.02647 12.1474 1.94727 12.1963C1.86807 12.2451 1.76716 12.2711 1.66406 12.252C1.55623 12.2319 1.46123 12.1657 1.39941 12.0596V12.0586C1.0886 11.5539 0.816533 10.8308 0.823242 9.8623C0.83371 8.36129 1.75222 7.45412 2.89844 6.75293C3.41821 6.43497 3.92281 6.1624 4.37598 5.86426C4.80764 5.58025 5.15748 5.29245 5.37891 4.9668V4.72949C4.62425 4.47414 4.07622 3.76183 4.07617 2.9209C4.07617 2.19418 4.55355 1.26045 5.59473 1.05273L5.61035 1.0498H5.625ZM1.62207 13.0869C1.61745 13.0916 1.61137 13.1013 1.61133 13.1182V13.5908H9.93457V13.1182C9.93452 13.1022 9.92888 13.093 9.92383 13.0879C9.91879 13.0828 9.90931 13.0771 9.89355 13.0771H1.65039C1.63521 13.0771 1.6266 13.0825 1.62207 13.0869ZM4.95801 2.47852C4.89845 2.61488 4.86542 2.76443 4.86523 2.9209L4.87109 3.03613C4.92841 3.60447 5.40474 4.04371 5.98926 4.04395C6.14409 4.04376 6.29155 4.00941 6.42676 3.95117C5.66139 3.85413 5.05306 3.24442 4.95801 2.47852Z" fill="currentColor" stroke="currentColor" strokeWidth="0.35469" />
  </svg>
);
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef, lazy, Suspense, useMemo } from "react";
import HomepageNavbar from "../components/HomeNavbar";
import Transition from "../components/Transition";
import WordByWord from "./WordByWord";
import WordByWordIcon from "../components/WordByWordIcon";
import { ChevronLeft, ChevronRight, ArrowUp } from "lucide-react";
import Bismi from "../assets/bismi.png";
import DarkModeBismi from "../assets/darkmode-bismi.png";
import TitleBorderLight from "../assets/title-border-light.png";
import TitleBorderDark from "../assets/title-border-dark.png";
import { useTheme } from "../context/ThemeContext";
import { useAnalytics } from "../context/AnalyticsContext";
import {
  fetchArabicVerses,
  fetchSurahs,
  fetchPageRanges,
  fetchUrduTranslationAudio,
  fetchUrduInterpretationAudio,
} from "../api/apifunction";
import BookmarkService from "../services/bookmarkService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";
import { ToastContainer } from "../components/Toast";
import { VersesSkeleton, CompactLoading } from "../components/LoadingSkeleton";
import audioManager from "../utils/audioManager";
import { isFirstInCombinedPair, isSecondInCombinedPair, getCombinedPair } from "../utils/combinedAyahs";
import { saveLastReading } from "../services/readingProgressService";
import {
  getCalligraphicSurahName,
  surahNameFontFamily,
} from "../utils/surahNameUtils.js";
import TajweedMushafPage from "../components/TajweedMushafPage";
import HoverableArabicText from "../components/HoverableArabicText";

// Lazy load heavy components
const StickyAudioPlayer = lazy(() => import("../components/StickyAudioPlayer"));

const QIRATHS = {
  "al-afasy": "QA",
  "al-ghamidi": "QG",
  "al-hudaify": "QH",
};

const Reading = () => {
  const { surahId } = useParams();
  const location = useLocation();

  useEffect(() => {
    if (surahId) {
      saveLastReading({
        surahId,
        viewType: "reading",
        path: `/reading/${surahId}`,
      });
    }
  }, [surahId]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const { translationLanguage, tajweedEnabled, audioTypes: contextAudioTypes, setAudioTypes: setContextAudioTypes, playbackSpeed: contextPlaybackSpeed, setPlaybackSpeed: setContextPlaybackSpeed, reciter: contextReciter, setReciter: setContextReciter } = useTheme();
  const analytics = useAnalytics();
  const [verses, setVerses] = useState([]);
  const [surahInfo, setSurahInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [pageRanges, setPageRanges] = useState([]);
  const [loadedVerseCount, setLoadedVerseCount] = useState(0);
  const BATCH_SIZE = 50; // Load 50 verses at a time
  const [selectedQirath, setSelectedQirath] = useState(contextReciter);
  const [audioTypes, setAudioTypes] = useState(contextAudioTypes);
  const [playbackSpeed, setPlaybackSpeed] = useState(contextPlaybackSpeed);
  const [currentAudioTypeIndex, setCurrentAudioTypeIndex] = useState(0); // Track which audio type is currently playing
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAyah, setCurrentAyah] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [isRepeatOn, setIsRepeatOn] = useState(() => {
    return localStorage.getItem('audioRepeat') === 'true';
  });
  const isRepeatOnRef = useRef(isRepeatOn);
  const currentAudioRef = useRef(null);
  const audioRefForCleanup = useRef(null); // Track audio for cleanup
  const prevAudioTypesRef = useRef(audioTypes);
  const prevQirathRef = useRef(selectedQirath);
  const audioTypesRef = useRef(audioTypes); // Always-current ref for closures
  // Page-by-page navigation
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageTransition, setPageTransition] = useState(null); // 'next' | 'prev' | null
  const [isPageAnimating, setIsPageAnimating] = useState(false);
  const pendingNextRef = useRef(false); // auto-advance after lazy load
  const pendingPageJumpRef = useRef(location.state?.pageNumber ?? null); // target pageNumber from dropdown jump or continue-reading
  // API pagination refs
  const nextPageRef = useRef(null);
  const hasNextRef = useRef(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 639px)').matches);
  // Favorite surah state
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Word by Word state
  const [showWordByWord, setShowWordByWord] = useState(false);
  const [selectedVerseForWordByWord, setSelectedVerseForWordByWord] = useState(null);

  // Load the next verse batch from the API (called when approaching the end of loaded pages)
  const loadNextBatch = async () => {
    if (!hasNextRef.current || loadingMore) return;
    const currentSurahId = surahId || 2;
    setLoadingMore(true);
    try {
      const result = await fetchArabicVerses(currentSurahId, {
        page: nextPageRef.current,
        limit: BATCH_SIZE,
      });
      const nextVerses = Array.isArray(result?.verses)
        ? result.verses
        : Array.isArray(result)
          ? result
          : [];
      if (nextVerses.length > 0) {
        setVerses(prev => [...prev, ...nextVerses]);
        setLoadedVerseCount(prev => prev + nextVerses.length);
      }
      hasNextRef.current = result?.pagination?.hasNext ?? false;
      nextPageRef.current = hasNextRef.current ? nextPageRef.current + 1 : null;
    } catch (err) {
      console.error('Error loading next verse batch:', err);
      hasNextRef.current = false;
    } finally {
      setLoadingMore(false);
    }
  };

  // Generate audio URL based on audio type
  // Returns object with primary and fallback URLs for Malayalam translation
  const generateAudioUrl = async (surahId, ayahId, type, qirathName, qirathCode) => {
    const surahIdPadded = String(surahId).padStart(3, '0');
    const ayahIdPadded = String(ayahId).padStart(3, '0');
    
    if (type === 'quran') {
      return { primary: `https://thafheem.net/audio/qirath/${qirathName}/${qirathCode}${surahIdPadded}_${ayahIdPadded}.ogg`, fallbacks: [] };
    } else if (type === 'translation') {
      // For Urdu, fetch from API (language code is 'ur')
      if (translationLanguage === 'ur') {
        const apiUrl = await fetchUrduTranslationAudio(surahId, ayahId);
        if (apiUrl) {
          return { primary: apiUrl, fallbacks: [] };
        }
        // If API fails, return null instead of falling back to Malayalam pattern
        return { primary: null, fallbacks: [] };
      }
      // For Malayalam, use default pattern
      const primaryUrl = `https://thafheem.net/audio/translation/T${surahIdPadded}_${ayahIdPadded}.ogg`;
      // Generate fallback URLs for grouped/combined ayah audio files
      // Fallback 1: backward combo — T{surah}_{prev},{current}.ogg (this ayah is the second in a pair)
      // Fallback 2: forward combo  — T{surah}_{current},{next}.ogg (this ayah is the first in a pair)
      const fallbacks = [];
      if (translationLanguage === 'mal' && ayahId > 1) {
        const previousAyahPadded = String(ayahId - 1).padStart(3, '0');
        fallbacks.push(`https://thafheem.net/audio/translation/T${surahIdPadded}_${previousAyahPadded},${ayahIdPadded}.ogg`);
      }
      if (translationLanguage === 'mal') {
        const nextAyahPadded = String(ayahId + 1).padStart(3, '0');
        fallbacks.push(`https://thafheem.net/audio/translation/T${surahIdPadded}_${ayahIdPadded},${nextAyahPadded}.ogg`);
      }
      return { primary: primaryUrl, fallbacks };
    } else if (type === 'interpretation') {
      // For Urdu, fetch from API (language code is 'ur')
      if (translationLanguage === 'ur') {
        const apiUrl = await fetchUrduInterpretationAudio(surahId, ayahId);
        if (apiUrl) {
          return { primary: apiUrl, fallbacks: [] };
        }
        // If API fails, return null instead of falling back to Malayalam pattern
        return { primary: null, fallbacks: [] };
      }
      // For Malayalam, use default pattern with fallbacks for grouped ayahs
      const primaryUrl = `https://thafheem.net/audio/interpretation/I${surahIdPadded}_${ayahIdPadded}.ogg`;
      const fallbacks = [];
      if (translationLanguage === 'mal' && ayahId > 1) {
        const previousAyahPadded = String(ayahId - 1).padStart(3, '0');
        fallbacks.push(`https://thafheem.net/audio/interpretation/I${surahIdPadded}_${previousAyahPadded},${ayahIdPadded}.ogg`);
      }
      if (translationLanguage === 'mal') {
        const nextAyahPadded = String(ayahId + 1).padStart(3, '0');
        fallbacks.push(`https://thafheem.net/audio/interpretation/I${surahIdPadded}_${ayahIdPadded},${nextAyahPadded}.ogg`);
      }
      return { primary: primaryUrl, fallbacks };
    }

    return { primary: null, fallbacks: [] };
  };

  // Play audio types for an ayah in sequence, then move to next ayah
  // This version accepts audioTypes as parameter to avoid closure issues
  const playAyahAtIndexWithTypes = async (index, audioTypeIndex = 0, typesToPlay = null, expandedSequence = null) => {
    // Use provided types or fall back to ref (always current) for proper sync
    const activeAudioTypes = typesToPlay || audioTypesRef.current;
    const currentSurahIdNum = parseInt(surahId) || 2;


    if (index >= verses.length) {
      // All ayahs played, stop playback
      setIsPlaying(false);
      setCurrentAyah(null);
      setCurrentAyahIndex(0);
      setCurrentAudioTypeIndex(0);
      setAudioElement(null);
      // Dispatch event to update header button
      window.dispatchEvent(new CustomEvent('audioStateChange', { detail: { isPlaying: false } }));
      return;
    }

    const ayahIdCheck = index + 1;

    // Combined ayah handling (Malayalam only)
    if (translationLanguage === 'mal' && !expandedSequence) {
      // Skip second ayah in combined pair
      if (isSecondInCombinedPair(currentSurahIdNum, ayahIdCheck)) {
        playAyahAtIndexWithTypes(index + 1, 0, typesToPlay);
        return;
      }

      // Build expanded sequence for first ayah in combined pair
      if (isFirstInCombinedPair(currentSurahIdNum, ayahIdCheck)) {
        const pairedAyah = getCombinedPair(currentSurahIdNum, ayahIdCheck);
        const expanded = [];
        for (const type of activeAudioTypes) {
          if (type === 'quran') {
            // Play quran audio for both ayahs in the pair
            expanded.push({ type: 'quran', ayah: ayahIdCheck, index, pairedAyah: null });
            expanded.push({ type: 'quran', ayah: pairedAyah, index: pairedAyah - 1, pairedAyah: null });
          } else {
            // For translation/interpretation, store pairedAyah so we can generate combined URL
            expanded.push({ type, ayah: ayahIdCheck, index, pairedAyah });
          }
        }
        playAyahAtIndexWithTypes(index, 0, typesToPlay, expanded);
        return;
      }
    }

    // Handle expanded sequence progression
    if (expandedSequence) {
      if (audioTypeIndex >= expandedSequence.length) {
        // All audio types done for this ayah — repeat or advance
        if (isRepeatOnRef.current) {
          // Repeat: replay the same expanded sequence from the beginning
          playAyahAtIndexWithTypes(index, 0, typesToPlay, expandedSequence);
          return;
        }
        // Combined sequence done - skip to ayah after the pair
        const pairedAyah = getCombinedPair(currentSurahIdNum, index + 1);
        const nextIndex = pairedAyah ? pairedAyah : index + 1;
        playAyahAtIndexWithTypes(nextIndex, 0, null); // null = read latest from ref
        return;
      }
    } else {
      // If all audio types for this ayah have been played, move to next ayah
      if (audioTypeIndex >= activeAudioTypes.length) {
        if (isRepeatOnRef.current) {
          // Repeat: replay the same ayah from the beginning
          playAyahAtIndexWithTypes(index, 0, typesToPlay);
          return;
        }
        playAyahAtIndexWithTypes(index + 1, 0, null); // null = read latest from ref
        return;
      }
    }

    // Stop any existing audio first
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      audioElement.onended = null;
      audioElement.onerror = null;
    }

    const qirathCode = QIRATHS[selectedQirath];
    const verse = verses[index];

    // Determine ayahId and audio type from expanded sequence or normal flow
    const ayahId = expandedSequence ? expandedSequence[audioTypeIndex].ayah : index + 1;
    const currentAudioType = expandedSequence ? expandedSequence[audioTypeIndex].type : activeAudioTypes[audioTypeIndex];
    const combinedPairedAyah = expandedSequence ? expandedSequence[audioTypeIndex].pairedAyah : null;
    const nextIndex = audioTypeIndex + 1;


    // Check if audio should be stopped (language changed)
    if (audioManager.getShouldStop()) {
      return;
    }

    // Generate audio URL (async for Urdu audio)
    // For combined ayahs, use the combined URL format directly (e.g., T079_037,038.ogg)
    let audioUrls;
    try {
      if (combinedPairedAyah) {
        const surahIdPadded = String(currentSurahIdNum).padStart(3, '0');
        const ayahIdPadded = String(ayahId).padStart(3, '0');
        const pairedAyahPadded = String(combinedPairedAyah).padStart(3, '0');
        const prefix = currentAudioType === 'translation' ? 'T' : 'I';
        const folder = currentAudioType === 'translation' ? 'translation' : 'interpretation';
        const combinedUrl = `https://thafheem.net/audio/${folder}/${prefix}${surahIdPadded}_${ayahIdPadded},${pairedAyahPadded}.ogg`;
        // Also try individual as fallback
        const individualUrl = `https://thafheem.net/audio/${folder}/${prefix}${surahIdPadded}_${ayahIdPadded}.ogg`;
        audioUrls = { primary: combinedUrl, fallbacks: [individualUrl] };
      } else {
        audioUrls = await generateAudioUrl(currentSurahIdNum, ayahId, currentAudioType, selectedQirath, qirathCode);
      }
    } catch (error) {
      console.error('[Reading] Error generating audio URL:', error);
      // Skip to next audio type on error
      const seqLength = expandedSequence ? expandedSequence.length : activeAudioTypes.length;
      if (audioTypeIndex < seqLength - 1) {
        playAyahAtIndexWithTypes(index, nextIndex, typesToPlay, expandedSequence);
      } else {
        // Move to next ayah if all audio types failed
        const skipToIndex = expandedSequence ? (getCombinedPair(currentSurahIdNum, index + 1) || index + 1) : index + 1;
        if (skipToIndex < verses.length) {
          playAyahAtIndexWithTypes(skipToIndex, 0, typesToPlay);
        } else {
          setIsPlaying(false);
          setCurrentAyah(null);
        }
      }
      return;
    }
    
    // Check again after async operation (language might have changed)
    if (audioManager.getShouldStop()) {
      return;
    }
    
    if (!audioUrls || !audioUrls.primary) {
      // Skip to next audio type if URL is null
      const seqLength = expandedSequence ? expandedSequence.length : activeAudioTypes.length;
      if (audioTypeIndex < seqLength - 1) {
        playAyahAtIndexWithTypes(index, nextIndex, typesToPlay, expandedSequence);
      } else {
        // Move to next ayah if all audio types failed
        const skipToIndex = expandedSequence ? (getCombinedPair(currentSurahIdNum, index + 1) || index + 1) : index + 1;
        if (skipToIndex < verses.length) {
          playAyahAtIndexWithTypes(skipToIndex, 0, typesToPlay);
        } else {
          setIsPlaying(false);
          setCurrentAyah(null);
        }
      }
      return;
    }
    
    // Start with primary URL, will try fallbacks if needed
    let currentAudioUrl = audioUrls.primary;
    const fallbacks = audioUrls.fallbacks || [];
    let currentFallbackIndex = -1; // -1 = primary, 0+ = fallback index
    let isTryingFallback = false; // Guard to prevent multiple fallback attempts
    let hasAdvanced = false; // Guard to prevent both onerror and play().catch() from advancing

    // Helper: advance to next audio type (only once)
    const advanceToNext = () => {
      if (hasAdvanced) return;
      hasAdvanced = true;
      playAyahAtIndexWithTypes(index, nextIndex, typesToPlay, expandedSequence);
    };

    // Helper function to try loading audio with fallback support
    const tryLoadAudio = (urlToTry, isFallback = false) => {
      // Check if audio should be stopped (language changed)
      if (audioManager.getShouldStop()) {
        return null;
      }

      // Reset flags when starting a new primary audio load
      if (!isFallback) {
        isTryingFallback = false;
        hasAdvanced = false;
      }

      // Create new audio element
      const audio = new Audio(urlToTry);

      // Register with audio manager
      audioManager.register(audio);

      // Set audio properties before adding event listeners
      audio.preload = 'auto'; // Preload for faster playback
      audio.playbackRate = playbackSpeed; // Apply playback speed
      // Removed crossOrigin to avoid CORS issues

      // Ensure playback speed is applied after audio metadata loads
      const handleLoadedMetadata = () => {
        if (audio && currentAudioRef.current === audio) {
          audio.playbackRate = playbackSpeed;
        }
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
      audio.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });

      const handleCanPlay = () => {
        if (audio && currentAudioRef.current === audio) {
          audio.playbackRate = playbackSpeed;
        }
        audio.removeEventListener('canplay', handleCanPlay);
      };
      audio.addEventListener('canplay', handleCanPlay, { once: true });

      // Preload next audio file while current one plays
      audio.addEventListener('canplay', () => {
        const seqLength = expandedSequence ? expandedSequence.length : activeAudioTypes.length;
        if (audioTypeIndex < seqLength - 1) {
          // Preload next audio type for same ayah
          const nextType = expandedSequence ? expandedSequence[nextIndex]?.type : activeAudioTypes[nextIndex];
          if (nextType) {
            generateAudioUrl(currentSurahIdNum, ayahId, nextType, selectedQirath, QIRATHS[selectedQirath]).then(urls => {
              if (urls?.primary) audioManager.preload(urls.primary);
            }).catch(() => {});
          }
        } else if (index + 1 < verses.length) {
          // Preload first audio type for next ayah
          const nextAyahType = activeAudioTypes[0] || 'quran';
          generateAudioUrl(currentSurahIdNum, index + 2, nextAyahType, selectedQirath, QIRATHS[selectedQirath]).then(urls => {
            if (urls?.primary) audioManager.preload(urls.primary);
          }).catch(() => {});
        }
      }, { once: true });

      setAudioElement(audio);
      currentAudioRef.current = audio;
      setCurrentAyah(ayahId);
      setCurrentAyahIndex(index);
      setCurrentAudioTypeIndex(audioTypeIndex);

      // Analytics — fire one audio_play event when the audio is queued.
      // currentAudioType is 'quran' | 'translation' | 'interpretation' locally,
      // we map 'quran' to 'qirath' for the dashboard. The SDK auto-tracks
      // time-on-audio: next play, pause, navigation, or tab close flushes an
      // audio_progress event with elapsed seconds as duration.
      if (analytics) {
        const audioTypeMap = { quran: 'qirath', translation: 'translation', interpretation: 'interpretation' };
        analytics.trackAudioPlay({
          audioType: audioTypeMap[currentAudioType] || currentAudioType,
          suraNumber: currentSurahIdNum,
          ayahNumber: ayahId,
          language: translationLanguage,
          reciter: selectedQirath,
        });
      }
      // Handle audio end - play next audio type or next ayah
      audio.onended = () => {
        // Only continue if this is still the current audio element
        if (currentAudioRef.current === audio) {
          advanceToNext();
        }
      };

      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        console.error('Failed URL:', urlToTry);

        // Guard against multiple handlers triggering fallback simultaneously
        if (isTryingFallback && !isFallback) {
          if (import.meta.env.DEV) {
          }
          return;
        }

        // Try next fallback if available (works for both translation and interpretation)
        if (translationLanguage === 'mal' && currentFallbackIndex < fallbacks.length - 1) {
          currentFallbackIndex++;
          isTryingFallback = true;
          tryLoadAudio(fallbacks[currentFallbackIndex], true);
          return;
        }

        // Only continue if this is still the current audio element
        if (currentAudioRef.current === audio) {
          advanceToNext();
        }
      };

      // Play the audio with better error handling
      audio.play().then(() => {
        // Successfully started playing
        // Dispatch event to update header button
        window.dispatchEvent(new CustomEvent('audioStateChange', { detail: { isPlaying: true } }));
      }).catch((error) => {
        // If it's an abort error (interrupted by another play), don't log as error
        if (error.name === 'AbortError') {
          // This is normal - happens when switching between ayahs
          // Don't log as error, just silently handle it
          return;
        }

        // Guard against multiple handlers triggering fallback simultaneously
        if (isTryingFallback && !isFallback) {
          if (import.meta.env.DEV) {
          }
          return;
        }

        // Try next fallback if available (works for both translation and interpretation)
        if (translationLanguage === 'mal' && currentFallbackIndex < fallbacks.length - 1) {
          currentFallbackIndex++;
          isTryingFallback = true;
          tryLoadAudio(fallbacks[currentFallbackIndex], true);
          return;
        }

        // Only log actual errors (not AbortErrors)
        console.error('Error playing audio:', error);
        console.error('Audio URL that failed:', urlToTry);

        // Use advanceToNext to prevent duplicate advancement
        advanceToNext();
      });
    };
    
    // Start loading with primary URL
    tryLoadAudio(currentAudioUrl, false);
  };

  // Wrapper function that uses state audioTypes (for backwards compatibility)
  const playAyahAtIndex = (index, audioTypeIndex = 0) => {
    playAyahAtIndexWithTypes(index, audioTypeIndex, null);
  };

  // Stop audio completely (reset to beginning)
  const stopAudio = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentAyah(null);
    setCurrentAyahIndex(0);
    setCurrentAudioTypeIndex(0);
    setAudioElement(null);
    currentAudioRef.current = null;
    // Dispatch event to update header button
    window.dispatchEvent(new CustomEvent('audioStateChange', { detail: { isPlaying: false } }));
  };

  // Handle clicking on a specific ayah
  const handleAyahClick = (verseNumber) => {
    // Since verse_number is undefined, use array index + 1 as the ayah number
    const ayahIndex = parseInt(verseNumber) - 1; // Convert to 0-based index
    
    if (ayahIndex >= 0 && ayahIndex < verses.length) {
      // Stop any currently playing audio first and wait for it to stop
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.onended = null; // Remove the onended handler to prevent automatic continuation
        audioElement.onerror = null; // Remove error handlers
      }
      
      // Clear the current audio element reference
      setAudioElement(null);
      currentAudioRef.current = null;
      
      // Small delay to ensure the previous audio is properly stopped
      setTimeout(() => {
        // Set the current ayah first to update button text
        setCurrentAyah(parseInt(verseNumber));
        setCurrentAyahIndex(ayahIndex);
        setCurrentAudioTypeIndex(0);
        
        // Start playing from the clicked ayah
        setIsPlaying(true);
        playAyahAtIndex(ayahIndex, 0);
      }, 100);
    } else {
      console.error(`Invalid ayah index: ${ayahIndex} for verse number ${verseNumber}`);
      console.error(`Valid range: 1 to ${verses.length}`);
    }
  };

  // Handle Word by Word click
  const handleWordByWordClick = (verseNumber, event) => {
    // Check if modifier key is pressed (Ctrl/Cmd)
    const isModifierPressed = event?.ctrlKey || event?.metaKey;

    if (isModifierPressed) {
      // Open word-by-word page in new tab
      event?.preventDefault();
      event?.stopPropagation();
      const url = `/word-by-word/${surahId}/${verseNumber}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    // Normal behavior: open modal
    setSelectedVerseForWordByWord(verseNumber);
    setShowWordByWord(true);
  };

  const handleWordByWordClose = () => {
    setShowWordByWord(false);
    setSelectedVerseForWordByWord(null);
  };

  const handleWordByWordNavigate = (newVerseNumber) => {
    setSelectedVerseForWordByWord(newVerseNumber);
  };

  const handleWordByWordSurahChange = (newSurahId) => {
    // Close the modal and navigate to the new surah
    setShowWordByWord(false);
    setSelectedVerseForWordByWord(null);
    navigate(`/reading/${newSurahId}`);
  };

  // Handle audio playback
  const handlePlayAudio = () => {
    try {
      if (isPlaying) {
        // Pause playback but keep the current position
        if (audioElement) {
          audioElement.pause();
        }
        setIsPlaying(false);
        // Dispatch event to update header button
        window.dispatchEvent(new CustomEvent('audioStateChange', { detail: { isPlaying: false } }));
        // Don't clear currentAyah or currentAyahIndex - keep them for resume
      } else {
        // Resume playback from current ayah or start from beginning
        if (currentAyahIndex > 0 || currentAyah) {
          // Resume from current position
          setIsPlaying(true);
          playAyahAtIndex(currentAyahIndex, currentAudioTypeIndex);
        } else {
          // Start from first ayah
          setIsPlaying(true);
          playAyahAtIndex(0, 0);
        }
        // Dispatch event to update header button
        window.dispatchEvent(new CustomEvent('audioStateChange', { detail: { isPlaying: true } }));
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      setCurrentAyah(null);
      setAudioElement(null);
      // Dispatch event to update header button
      window.dispatchEvent(new CustomEvent('audioStateChange', { detail: { isPlaying: false } }));
    }
  };

  // Ref to store handlePlayAudio for event listener
  const handlePlayAudioRef = useRef(null);
  handlePlayAudioRef.current = handlePlayAudio;

  // Listen for play audio event from header
  useEffect(() => {
    const handlePlayAudioEvent = () => {
      if (handlePlayAudioRef.current) {
        handlePlayAudioRef.current();
      }
    };

    window.addEventListener('playAudio', handlePlayAudioEvent);
    return () => {
      window.removeEventListener('playAudio', handlePlayAudioEvent);
    };
  }, []);

  // Stop audio when surah changes
  useEffect(() => {
    const handleSurahChange = () => {
      // Stop all audio via audioManager first
      audioManager.stopAll();
      
      // Also stop the current audio element if it exists
      if (audioRefForCleanup.current) {
        audioRefForCleanup.current.pause();
        audioRefForCleanup.current.currentTime = 0;
        audioRefForCleanup.current.onended = null;
        audioRefForCleanup.current.onerror = null;
        audioRefForCleanup.current.src = '';
        audioRefForCleanup.current = null;
      }
      
      // Clear all state
      setIsPlaying(false);
      setCurrentAyah(null);
      setCurrentAyahIndex(0);
      setCurrentAudioTypeIndex(0);
      setAudioElement(null);
      if (currentAudioRef.current) {
        currentAudioRef.current = null;
      }
      
      // Dispatch event to update header button
      window.dispatchEvent(new CustomEvent('audioStateChange', { detail: { isPlaying: false } }));
    };
    window.addEventListener('surahChange', handleSurahChange);
    return () => {
      window.removeEventListener('surahChange', handleSurahChange);
    };
  }, []);

  // Dispatch audio state changes when isPlaying changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('audioStateChange', { detail: { isPlaying } }));
  }, [isPlaying]);

  // Auto-scroll to current ayah when playing
  useEffect(() => {
    if (isPlaying && currentAyah) {
      const ayahElement = document.getElementById(`ayah-${currentAyah}`);
      if (ayahElement) {
        ayahElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentAyah, isPlaying]);

  // Handle hash-based navigation (from ayah-wise page)
  useEffect(() => {
    if (!loading && verses.length > 0) {
      const hash = window.location.hash;
      if (hash) {
        const match = hash.match(/#ayah-(\d+)/);
        if (match) {
          const ayahNumber = parseInt(match[1], 10);

          // Retry up to 5 times with increasing delays to ensure verses are rendered
          const attemptScroll = (attempt = 1) => {
            const ayahElement = document.getElementById(`ayah-${ayahNumber}`);
            if (ayahElement) {
              ayahElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Highlight the ayah briefly
              ayahElement.style.backgroundColor = "#fef3c7";
              setTimeout(() => {
                ayahElement.style.backgroundColor = "";
              }, 1000);
            } else if (attempt < 5) {
              setTimeout(() => attemptScroll(attempt + 1), attempt * 200);
            }
          };

          setTimeout(() => attemptScroll(), 100);
        }
      }
    }
  }, [loading, verses.length]);

  // Listen for toast events from Transition component
  useEffect(() => {
    const handleToastEvent = (event) => {
      const { type, message } = event.detail;
      if (type === 'success') {
        showSuccess(message);
      } else if (type === 'error') {
        showError(message);
      }
    };

    window.addEventListener('showToast', handleToastEvent);
    return () => {
      window.removeEventListener('showToast', handleToastEvent);
    };
  }, [showSuccess, showError]);

  // Save reciter to context when it changes locally (e.g., from StickyAudioPlayer)
  useEffect(() => {
    if (selectedQirath !== contextReciter) {
      setContextReciter(selectedQirath);
    }
  }, [selectedQirath]);

  // Sync from context when changed externally (sidebar, Settings)
  useEffect(() => {
    if (contextReciter !== selectedQirath) {
      setSelectedQirath(contextReciter);
    }
  }, [contextReciter]);

  useEffect(() => {
    if (contextAudioTypes && JSON.stringify(contextAudioTypes) !== JSON.stringify(audioTypes)) {
      setAudioTypes(contextAudioTypes);
    }
  }, [contextAudioTypes]);

  // Keep audioTypesRef always current for closures (advanceToNext)
  useEffect(() => {
    audioTypesRef.current = audioTypes;
  }, [audioTypes]);

  // Stop audio only when reciter changes or the currently-playing audio type is removed
  useEffect(() => {
    if (!isPlaying || !audioElement) {
      prevAudioTypesRef.current = audioTypes;
      prevQirathRef.current = selectedQirath;
      return;
    }

    // Reciter changed - always stop
    if (selectedQirath !== prevQirathRef.current) {
      stopAudio();
      prevQirathRef.current = selectedQirath;
      prevAudioTypesRef.current = audioTypes;
      return;
    }

    // Audio types changed - only stop if the currently-playing type was removed
    if (JSON.stringify(audioTypes) !== JSON.stringify(prevAudioTypesRef.current)) {
      const prevTypes = prevAudioTypesRef.current;
      const currentlyPlayingType = prevTypes[currentAudioTypeIndex];
      if (currentlyPlayingType && !audioTypes.includes(currentlyPlayingType)) {
        stopAudio();
      }
      prevAudioTypesRef.current = audioTypes;
    }
  }, [selectedQirath, audioTypes]);

  // Sync playback speed from context
  useEffect(() => {
    if (contextPlaybackSpeed !== playbackSpeed) {
      setPlaybackSpeed(contextPlaybackSpeed);
    }
  }, [contextPlaybackSpeed]);

  // Save playback speed to context when changed locally
  useEffect(() => {
    if (playbackSpeed !== contextPlaybackSpeed) {
      setContextPlaybackSpeed(playbackSpeed);
    }
  }, [playbackSpeed]);

  // Apply playback speed when it changes
  useEffect(() => {
    if (audioElement) {
      audioElement.playbackRate = playbackSpeed;
    }
  }, [audioElement, playbackSpeed]);

  // Cleanup audio when component unmounts (navigating away)
  useEffect(() => {
    return () => {
      // Stop and clear audio on unmount - use refs to get current audio
      if (audioRefForCleanup.current) {
        audioRefForCleanup.current.pause();
        audioRefForCleanup.current.src = '';
        audioRefForCleanup.current.currentTime = 0;
        audioRefForCleanup.current.onended = null;
        audioRefForCleanup.current.onerror = null;
        audioRefForCleanup.current = null;
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = '';
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      }
    };
  }, []); // Only run on unmount
  
  // Update cleanup ref whenever audioElement changes
  useEffect(() => {
    audioRefForCleanup.current = audioElement;
  }, [audioElement]);

  // Stop audio and clear state when surah changes
  useEffect(() => {
    // Stop all audio via audioManager first
    audioManager.stopAll();
    
    // Also stop the current audio element if it exists
    if (audioRefForCleanup.current) {
      audioRefForCleanup.current.pause();
      audioRefForCleanup.current.currentTime = 0;
      audioRefForCleanup.current.onended = null;
      audioRefForCleanup.current.onerror = null;
      audioRefForCleanup.current.src = '';
      audioRefForCleanup.current = null;
    }
    
    // Clear all audio-related state
    setIsPlaying(false);
    setCurrentAyah(null);
    setCurrentAyahIndex(0);
    setCurrentAudioTypeIndex(0);
    setAudioElement(null);
    setCurrentPageIndex(0);
    if (currentAudioRef.current) {
      currentAudioRef.current = null;
    }
    
    // Dispatch event to update header button
    window.dispatchEvent(new CustomEvent('audioStateChange', { detail: { isPlaying: false } }));
  }, [surahId]);

  // Stop audio when language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      audioManager.stopAll();
      stopAudio();
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
    };
  }, []);

  // Progressive loading: Load surah info and page ranges first, then verses in batches
  useEffect(() => {
    const fetchSurahData = async () => {
      try {
        setLoading(true);
        setError(null);
        setVerses([]);
        setLoadedVerseCount(0);

        const currentSurahId = surahId || 2;

        // Step 1: Load surah info and page ranges first (fast, small data)
        const [surahsData, pageRangesData] = await Promise.all([
          fetchSurahs(),
          fetchPageRanges(),
        ]);

        // Filter page ranges for current surah
        const surahPageRanges = pageRangesData.filter(
          (range) => range.SuraId === parseInt(currentSurahId)
        );

        const surah = surahsData.find((s) => s.number === parseInt(currentSurahId));
        setSurahInfo(surah);
        setPageRanges(surahPageRanges);

        // Step 2: Load first batch of verses quickly (show content ASAP)
        setLoading(false); // Show UI with surah info while loading verses
        setLoadingMore(true);

        try {
          const firstBatchResult = await fetchArabicVerses(currentSurahId, {
            page: 1,
            limit: BATCH_SIZE,
          });
          const firstBatch = Array.isArray(firstBatchResult?.verses)
            ? firstBatchResult.verses
            : Array.isArray(firstBatchResult)
              ? firstBatchResult
              : [];

          setVerses(firstBatch);
          setLoadedVerseCount(firstBatch.length);

          const initialPagination = firstBatchResult?.pagination || null;
          if (initialPagination?.hasNext) {
            // Store pagination state for on-demand loading via IntersectionObserver
            nextPageRef.current = (initialPagination.page || 1) + 1;
            hasNextRef.current = true;
            setLoadingMore(false);
          } else {
            nextPageRef.current = null;
            hasNextRef.current = false;
            setLoadingMore(false);
          }
        } catch (verseError) {
          console.error("Error loading verses:", verseError);
          setError(verseError.message);
          setLoadingMore(false);
        }
      } catch (err) {
        console.error("Error fetching surah data:", err);
        setError(err.message);
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchSurahData();
  }, [surahId]);

  // Load favorite status for the current surah
  useEffect(() => {
    const loadFavoriteStatus = async () => {
      if (!user || !surahId) {
        setIsFavorited(false);
        return;
      }

      try {
        const favorited = await BookmarkService.isFavorited(user.uid, surahId);
        setIsFavorited(favorited);
      } catch (error) {
        console.error("Error loading favorite status:", error);
      }
    };

    loadFavoriteStatus();
  }, [user, surahId]);

  // Handle favorite surah toggle
  const handleFavoriteClick = async (e) => {
    e.stopPropagation();

    // Check if user is signed in
    if (!user) {
      showError("Please sign in to favorite surahs");
      navigate("/sign");
      return;
    }

    try {
      setFavoriteLoading(true);

      if (isFavorited) {
        // Remove from favorites
        await BookmarkService.deleteFavoriteSurah(user.uid, surahId);
        setIsFavorited(false);
        showSuccess("Surah removed from favorites");
      } else {
        // Add to favorites
        await BookmarkService.addFavoriteSurah(
          user.uid,
          surahId,
          surahInfo?.arabic || `Surah ${surahId}`
        );
        setIsFavorited(true);
        showSuccess("Surah added to favorites");
      }
    } catch (error) {
      console.error("Error managing favorite:", error);
      showError("Failed to manage favorite. Please try again.");
    } finally {
      setFavoriteLoading(false);
    }
  };

  // Function to get page number for a specific verse
  const getPageNumberForVerse = (verseNumber) => {
    const pageRange = pageRanges.find(
      (range) => verseNumber >= range.ayafrom && verseNumber <= range.ayato
    );
    return pageRange ? pageRange.PageId : null;
  };

  // Group verses by page
  const getVersesGroupedByPage = () => {
    const grouped = [];
    let currentPage = null;
    let currentGroup = [];

    verses.forEach((verse, index) => {
      const verseNumber = verse.verse_number || index + 1;
      const pageNumber = getPageNumberForVerse(verseNumber);

      if (pageNumber !== currentPage) {
        if (currentGroup.length > 0) {
          grouped.push({
            pageNumber: currentPage,
            verses: currentGroup,
            startVerse: currentGroup[0].verse_number,
            endVerse: currentGroup[currentGroup.length - 1].verse_number,
          });
        }
        currentPage = pageNumber;
        currentGroup = [{ ...verse, verse_number: verseNumber }];
      } else {
        currentGroup.push({ ...verse, verse_number: verseNumber });
      }
    });

    // Add last group
    if (currentGroup.length > 0) {
      grouped.push({
        pageNumber: currentPage,
        verses: currentGroup,
        startVerse: currentGroup[0].verse_number,
        endVerse: currentGroup[currentGroup.length - 1].verse_number,
      });
    }

    return grouped;
  };

  // Navigation functions
  const handlePreviousSurah = () => {
    const currentId = parseInt(surahId) || 2;
    const prevSurahId = currentId - 1;
    if (prevSurahId >= 1) {
      navigate(`/reading/${prevSurahId}`);
    }
  };

  const handleNextSurah = () => {
    const currentId = parseInt(surahId) || 2;
    const nextSurahId = currentId + 1;
    if (nextSurahId <= 114) {
      navigate(`/reading/${nextSurahId}`);
    }
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Page-by-page navigation
  const goToPage = (direction) => {
    if (isPageAnimating) return;
    const newIndex = direction === 'next' ? currentPageIndex + 1 : currentPageIndex - 1;
    if (newIndex < 0) return;

    // If navigating past currently loaded pages, trigger a load first then auto-advance
    if (newIndex >= versesGroupedByPage.length) {
      if (hasNextRef.current && !loadingMore) {
        pendingNextRef.current = true;
        loadNextBatch();
      }
      return;
    }

    // For Arabic Mushaf: Next = page slides in from the LEFT (going forward in book)
    //                    Prev = page slides in from the RIGHT
    setPageTransition(direction);
    setIsPageAnimating(true);
    setCurrentPageIndex(newIndex);
    window.scrollTo({ top: 0 });
    setTimeout(() => {
      setIsPageAnimating(false);
      setPageTransition(null);
    }, 380);
    // Fire scroll so Transition component updates its currentVisiblePage
    setTimeout(() => window.dispatchEvent(new Event('scroll')), 60);

    // Preemptively load more verses when nearing the end of loaded pages
    if (direction === 'next' && newIndex >= versesGroupedByPage.length - 2 && hasNextRef.current) {
      loadNextBatch();
    }
  };

  // Auto-advance when a lazy-loaded batch completes — defined after versesGroupedByPage
  // (moved below; see useEffect after versesGroupedByPage useMemo)

  const toArabicNumber = (numberString) => {
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return numberString.replace(/\d/g, (digit) => arabicDigits[digit]);
  };

  const stripArabicVerseMarker = (text) => {
    if (!text) return "";
    return text.replace(/\s*﴿\s*[\d\u0660-\u0669]+\s*﴾\s*$/u, "").trim();
  };

  const { quranFont, theme, fontSize } = useTheme();

  // Memoize grouped verses to prevent recalculation on every render
  const versesGroupedByPage = useMemo(() => getVersesGroupedByPage(), [verses, pageRanges]);

  // Save current page number to "continue reading" progress
  useEffect(() => {
    if (!surahId || versesGroupedByPage.length === 0) return;
    const currentGroup = versesGroupedByPage[currentPageIndex];
    if (!currentGroup?.pageNumber) return;
    saveLastReading({
      surahId,
      viewType: "reading",
      path: `/reading/${surahId}`,
      pageNumber: currentGroup.pageNumber,
    });
  }, [currentPageIndex, versesGroupedByPage, surahId]);

  // Auto-advance when a lazy-loaded batch completes
  useEffect(() => {
    if (!pendingNextRef.current || loadingMore) return;
    const nextIdx = currentPageIndex + 1;
    if (nextIdx >= versesGroupedByPage.length) return; // not loaded yet
    pendingNextRef.current = false;
    setPageTransition('next');
    setIsPageAnimating(true);
    setCurrentPageIndex(nextIdx);
    window.scrollTo({ top: 0 });
    setTimeout(() => { setIsPageAnimating(false); setPageTransition(null); }, 380);
    setTimeout(() => window.dispatchEvent(new Event('scroll')), 60);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, versesGroupedByPage.length]);

  // Listen for page-navigation requests from the navbar dropdown (jump to any Quran page).
  useEffect(() => {
    const handleNavigateToPage = (event) => {
      const { pageNumber } = event.detail;
      const groupIndex = versesGroupedByPage.findIndex(g => g.pageNumber === pageNumber);
      if (groupIndex === -1) {
        // Target page not yet loaded — store it and kick off loading
        pendingPageJumpRef.current = pageNumber;
        if (hasNextRef.current && !loadingMore) loadNextBatch();
        return;
      }
      pendingPageJumpRef.current = null;
      const direction = groupIndex > currentPageIndex ? 'next' : 'prev';
      setPageTransition(direction);
      setIsPageAnimating(true);
      setCurrentPageIndex(groupIndex);
      window.scrollTo({ top: 0 });
      setTimeout(() => {
        setIsPageAnimating(false);
        setPageTransition(null);
      }, 380);
      setTimeout(() => window.dispatchEvent(new Event('scroll')), 60);
    };

    window.addEventListener('reading-navigate-to-page', handleNavigateToPage);
    return () => window.removeEventListener('reading-navigate-to-page', handleNavigateToPage);
  }, [versesGroupedByPage, currentPageIndex, loadingMore]);

  // When a new batch of verses loads, check if a pending page jump is now satisfiable
  useEffect(() => {
    if (!pendingPageJumpRef.current) return;
    const groupIndex = versesGroupedByPage.findIndex(g => g.pageNumber === pendingPageJumpRef.current);
    if (groupIndex === -1) {
      // Still not loaded — fetch another batch if possible
      if (hasNextRef.current && !loadingMore) loadNextBatch();
      return;
    }
    // Found — navigate
    const direction = groupIndex > currentPageIndex ? 'next' : 'prev';
    pendingPageJumpRef.current = null;
    setPageTransition(direction);
    setIsPageAnimating(true);
    setCurrentPageIndex(groupIndex);
    window.scrollTo({ top: 0 });
    setTimeout(() => { setIsPageAnimating(false); setPageTransition(null); }, 380);
    setTimeout(() => window.dispatchEvent(new Event('scroll')), 60);
  }, [versesGroupedByPage, loadingMore]);

  const accessibleSurahName =
    surahInfo?.arabic || (surahId ? `Surah ${surahId}` : "Surah");
  const calligraphicSurahName = getCalligraphicSurahName(
    surahId,
    accessibleSurahName
  );
  const surahIdString = surahId ? String(surahId) : "";

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Page Header (single) */}
        <div className="px-3 sm:px-4 lg:px-6 pt-6 sm:pt-8 pb-0 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto text-center">
            {/* Transition moved into global header for single-header layout */}
            {/* Toggle Buttons moved to global header (Transition component) */}

            {/* Surah Title — only show on first page */}
            {currentPageIndex === 0 && (
            <div className="mb-3 sm:mb-4">
              {/* Decorative border frame with surah name inside */}
              <div className="relative mx-auto w-full max-w-lg sm:max-w-xl">
                <img
                  src={theme === "dark" ? TitleBorderDark : TitleBorderLight}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-auto"
                />
                {/* Left circle — total verses */}
                <div className="absolute top-0 bottom-0" style={{ left: "15%", width: "12%" }}>
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-sm sm:text-base font-bold leading-none select-none" style={{ color: theme === "dark" ? "#ffffff" : "#0e5a72" }}>
                      {surahInfo?.ayahs}
                    </span>
                  </div>
                </div>
                {/* Right circle — Makki / Madani icon */}
                <div className="absolute top-0 bottom-0" style={{ right: "15%", width: "12%" }}>
                  <div className="w-full h-full flex items-center justify-center">
                    {surahInfo?.type === "Makki" ? (
                      <KaabaIcon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: "#3FA5C0" }} />
                    ) : surahInfo?.type === "Madani" ? (
                      <MadinaIcon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: "#3FA5C0" }} />
                    ) : null}
                  </div>
                </div>
                {/* Center — surah calligraphic name */}
                <div className="absolute inset-0 flex items-center justify-center px-[18%]">
                  <h1
                    className="text-4xl sm:text-5xl font-normal text-gray-900 dark:text-white leading-none"
                    style={{ fontFamily: surahNameFontFamily }}
                    aria-label={accessibleSurahName}
                  >
                    {calligraphicSurahName}
                  </h1>
                </div>
              </div>

              {/* Bismillah - hide for Al-Fatihah (1) as it's the first ayah, and At-Tawbah (9) */}
              {surahInfo?.number !== 1 && surahInfo?.number !== 9 && currentPageIndex === 0 && (
                <div className="mt-3 mb-0">
                  <p className="font-arabic dark:text-white text-gray-800 px-1">
                    <img
                      src={theme === "dark" ? DarkModeBismi : Bismi}
                      alt="Bismillah"
                      className="w-auto h-6 sm:h-7 lg:h-8 mx-auto"
                    />
                  </p>
                </div>
              )}
            </div>
            )}
          </div>
        </div>

        {/* Reading Content */}
        <div className="w-full sm:max-w-2xl lg:max-w-2xl mx-auto px-3 sm:px-4 pt-0 pb-4 sm:pb-6">
          {/* Initial Loading State - Shimmer Skeleton */}
          {loading && (
            <VersesSkeleton count={5} />
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400">
                Error loading verses: {error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          )}

          {/* Content - Page-by-page view with slide transition */}
          {!loading && !error && verses.length > 0 && versesGroupedByPage.length > 0 && (() => {
            const pageGroup = versesGroupedByPage[currentPageIndex];
            if (!pageGroup) return null;
            return (
              <div>
                {/* Slide animation keyframes */}
                <style>{`
                  @keyframes pageSlideInRight {
                    from { opacity: 0; transform: translateX(52px); }
                    to   { opacity: 1; transform: translateX(0); }
                  }
                  @keyframes pageSlideInLeft {
                    from { opacity: 0; transform: translateX(-52px); }
                    to   { opacity: 1; transform: translateX(0); }
                  }
                  /* Arabic Mushaf: next page comes from LEFT, prev from RIGHT */
                `}</style>

                {/* Single page content */}
                <div
                  key={currentPageIndex}
                  style={{
                    animation: pageTransition === 'next'
                      ? 'pageSlideInLeft 0.35s cubic-bezier(0.4,0,0.2,1)'
                      : pageTransition === 'prev'
                      ? 'pageSlideInRight 0.35s cubic-bezier(0.4,0,0.2,1)'
                      : undefined,
                  }}
                >
                  <div className={`dark:bg-gray-900 rounded-lg ${tajweedEnabled ? 'p-3 sm:p-4 lg:p-3' : 'pt-2 px-5 pb-5 sm:pt-3 sm:px-7 sm:pb-7 lg:pt-3 lg:px-6 lg:pb-6'}`}>
                    {/* True printed-Mushaf layout: each line is its own justified
                        row using the glyph data's own line breaks. Works for both
                        tajweed (colored glyphs) and plain Quran font. */}
                    <TajweedMushafPage
                      suraid={surahId}
                      from={pageGroup.startVerse}
                      to={pageGroup.endVerse}
                      fontSize={isMobile ? Math.round(fontSize * 0.92) : fontSize}
                      tajweed={tajweedEnabled}
                      dark={theme === 'dark'}
                      currentAyah={currentAyah}
                      onAyahClick={handleAyahClick}
                    />
                  </div>

                  {/* Hidden anchor for Transition page-tracking (do not remove) */}
                  {pageGroup.pageNumber && (
                    <span id={`page-${pageGroup.pageNumber}`} aria-hidden="true" style={{ position: 'absolute', top: 0, pointerEvents: 'none' }} />
                  )}
                </div>

                {loadingMore && (
                  <div className="text-center py-3">
                    <CompactLoading message="Loading..." />
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Page Navigation bar */}
        <div className="w-full sm:max-w-2xl lg:max-w-2xl mx-auto px-3 sm:px-4 py-3 mt-2">
          <div className="flex flex-row-reverse items-center justify-between gap-3">
            {/* Previous Page */}
            <button
              onClick={() => goToPage('prev')}
              aria-label="Go to previous page"
              disabled={currentPageIndex === 0 || isPageAnimating}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium
                         bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-200 rounded-lg shadow-sm
                         hover:bg-gray-50 dark:hover:bg-gray-700
                         disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all duration-150"
            >
              <span className="hidden sm:inline">Previous</span>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            </button>

            {/* Page indicator */}
            <div className="flex flex-col items-center select-none min-w-0">
              {versesGroupedByPage[currentPageIndex]?.pageNumber ? (
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Page {versesGroupedByPage[currentPageIndex].pageNumber}
                </span>
              ) : null}
            </div>

            {/* Next Page */}
            <button
              onClick={() => goToPage('next')}
              aria-label="Go to next page"
              disabled={(currentPageIndex >= versesGroupedByPage.length - 1 && !hasNextRef.current) || isPageAnimating}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium
                         bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-200 rounded-lg shadow-sm
                         hover:bg-gray-50 dark:hover:bg-gray-700
                         disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all duration-150"
            >
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Next</span>
            </button>
          </div>
        </div>

        {/* Surah Navigation */}
        <div className="bg-white border-t dark:bg-gray-900 border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3 mt-2">
          <div className="flex flex-row-reverse max-w-4xl mx-auto items-center justify-between">
            <button
              onClick={handlePreviousSurah}
              aria-label="Go to previous surah"
              disabled={parseInt(surahId) <= 1}
              className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-gray-600
                         dark:bg-[#252525] dark:text-white hover:text-gray-900 dark:hover:text-gray-300 rounded-lg
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Previous Surah</span>
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={handleNextSurah}
              aria-label="Go to next surah"
              disabled={parseInt(surahId) >= 114}
              className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-gray-600
                         dark:bg-[#252525] dark:text-white hover:text-gray-900 dark:hover:text-gray-300 rounded-lg
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Next Surah</span>
            </button>
          </div>
      </div>

      {/* Sticky Audio Player - Lazy loaded */}
      {currentAyah && (
        <Suspense fallback={<div className="fixed bottom-0 left-0 right-0 h-20 bg-gray-100 dark:bg-gray-800 animate-pulse"></div>}>
          <StickyAudioPlayer
          audioElement={audioElement}
          isPlaying={isPlaying}
          currentAyah={currentAyah}
          totalAyahs={verses.length}
          surahInfo={surahInfo}
          onPlayPause={handlePlayAudio}
          onStop={stopAudio}
          onSkipBack={() => {
            // Go to previous ayah
            if (currentAyahIndex > 0) {
              setIsPlaying(true);
              playAyahAtIndex(currentAyahIndex - 1, 0);
            }
          }}
          onSkipForward={() => {
            // Go to next ayah
            if (currentAyahIndex < verses.length - 1) {
              setIsPlaying(true);
              playAyahAtIndex(currentAyahIndex + 1, 0);
            }
          }}
          onClose={null}
          selectedQari={selectedQirath}
          onQariChange={(newQari) => {
            setSelectedQirath(newQari);
            // If audio is currently playing, restart with new reciter
            if (currentAyah) {
              stopAudio();
              setTimeout(() => {
                if (currentAyahIndex >= 0) {
                  setIsPlaying(true);
                  playAyahAtIndex(currentAyahIndex);
                }
              }, 100);
            }
          }}
          translationLanguage={translationLanguage}
          audioTypes={audioTypes}
          onAudioTypesChange={(newTypes) => {
            setAudioTypes(newTypes);
            setContextAudioTypes(newTypes); // Sync to context
            // Audio continues playing - new types take effect from next ayah via audioTypesRef
          }}
          playbackSpeed={playbackSpeed}
          onPlaybackSpeedChange={(newSpeed) => {
            setPlaybackSpeed(newSpeed);
          }}
          isRepeatOn={isRepeatOn}
          onRepeatToggle={() => {
            setIsRepeatOn(prev => {
              const next = !prev;
              localStorage.setItem('audioRepeat', String(next));
              isRepeatOnRef.current = next;
              return next;
            });
          }}
        />
        </ Suspense>
      )}

      {/* Word by Word Modal */}
      {showWordByWord && selectedVerseForWordByWord && (
        <WordByWord
          surahId={surahId}
          verseNumber={selectedVerseForWordByWord}
          onClose={handleWordByWordClose}
          onNavigate={handleWordByWordNavigate}
          onSurahChange={handleWordByWordSurahChange}
        />
      )}
      </div>
    </>
  );
};

export default Reading;
