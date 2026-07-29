import { useState, useEffect, useRef } from 'react';
import { fetchWordByWordMeaning } from '../api/apifunction';

// Cache for word-by-word data
const wordDataCache = new Map();

const useWordTooltip = (surahId, verseNumber, language) => {
  const [wordData, setWordData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hoveredWord, setHoveredWord] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(null);
  const abortControllerRef = useRef(null);

  // Generate cache key
  const cacheKey = `${surahId}:${verseNumber}:${language}`;

  // Fetch word-by-word data
  useEffect(() => {
    // Reset hover state when verse changes
    setHoveredWord(null);
    setHoverPosition(null);
    
    if (!surahId || !verseNumber || !language) {
      setWordData(null);
      return;
    }

    // Check cache first
    if (wordDataCache.has(cacheKey)) {
      const cachedData = wordDataCache.get(cacheKey);
      setWordData(cachedData);
      return;
    }

    // Fetch from API
    setLoading(true);
    // Local controller: ref.current may already point at a newer request's
    // controller when this fetch settles, so checks must use this instance.
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchWordByWordMeaning(surahId, verseNumber, language)
      .then((data) => {
        if (!controller.signal.aborted) {
          // Only cache if we have valid word data
          if (data && data.words && data.words.length > 0) {
            wordDataCache.set(cacheKey, data);
            setWordData(data);
          } else {
            // Cache empty result to avoid repeated failed requests
            wordDataCache.set(cacheKey, { words: [] });
            setWordData({ words: [] });
          }
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          // Only cache 404 errors (verse doesn't have word data)
          // For other errors, don't cache so we can retry
          if (error.message && error.message.includes('404')) {
            wordDataCache.set(cacheKey, { words: [] });
            setWordData({ words: [] });
          } else {
            // For other errors, set null so we can retry on next render
            setWordData(null);
          }
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [surahId, verseNumber, language, cacheKey]);

  // Handle word hover
  const handleWordHover = (wordIndex, event, overrideX = null) => {
    if (!wordData?.words || wordIndex >= wordData.words.length) {
      setHoveredWord(null);
      setHoverPosition(null);
      return;
    }

    const word = wordData.words[wordIndex];
    if (!word || !word.translation?.text) {
      setHoveredWord(null);
      setHoverPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    // Use getBoundingClientRect coordinates (viewport-relative, no scroll offset needed)
    const position = {
      x: overrideX ?? (rect.left + rect.width / 2),
      y: rect.top,
      yBottom: rect.bottom,
    };
    setHoverPosition(position);
    setHoveredWord(word);
  };

  const handleWordLeave = () => {
    setHoveredWord(null);
    setHoverPosition(null);
  };

  return {
    wordData,
    loading,
    hoveredWord,
    hoverPosition,
    handleWordHover,
    handleWordLeave,
  };
};

export default useWordTooltip;
