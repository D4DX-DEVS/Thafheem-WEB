import { useMemo, useEffect, useState, useRef } from 'react';
import useWordTooltip from '../hooks/useWordTooltip';
import WordTooltip from './WordTooltip';

// Font values that use standard Arabic (API WordPhrase) instead of Uthmani text
const STANDARD_ARABIC_FONTS = ['ScheherazadeNew-Regular', 'Amiri Quran'];

const HoverableArabicText = ({
  arabicText,
  surahId,
  verseNumber,
  language,
  fontSize,
  quranFont,
  isCurrentAyah,
  lazyFetch = false,
}) => {
  // Detect mobile (max-width: 639px) — tooltip hover is disabled on mobile
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 639px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Check if current font uses standard Arabic (API WordPhrase) for display
  const useApiWords = STANDARD_ARABIC_FONTS.includes(quranFont);

  // When lazyFetch=true, don't pre-fetch word data on mount.
  // Instead, trigger the fetch only when the user first hovers over a word.
  // This prevents a surah view from firing hundreds of API calls simultaneously.
  const [fetchEnabled, setFetchEnabled] = useState(!lazyFetch);

  // Fonts that display API WordPhrase text swap the verse text (arabicText →
  // WordPhrase) when data arrives, shifting the line. To avoid both that shift
  // on hover AND an all-at-once fetch storm on mount, fetch when the verse
  // scrolls near the viewport — a handful of in-flight requests at a time.
  const firstWordRef = useRef(null);
  useEffect(() => {
    if (fetchEnabled || !useApiWords) return;
    const el = firstWordRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setFetchEnabled(true);
          obs.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchEnabled, useApiWords]);

  const { wordData, hoveredWord, hoverPosition, handleWordHover, handleWordLeave } =
    useWordTooltip(
      fetchEnabled ? surahId : null,
      fetchEnabled ? verseNumber : null,
      fetchEnabled ? language : null,
    );

  const [combinedArabic, setCombinedArabic] = useState(null);

  // Reset combinedArabic when verse changes
  useEffect(() => {
    setCombinedArabic(null);
  }, [surahId, verseNumber]);

  // Split Arabic text into words (by spaces, but preserve Arabic word boundaries)
  const words = useMemo(() => {
    // Server-aligned segments take priority for every font: exact Uthmani
    // display text, positionally paired with meanings — no text swap needed
    if (wordData?.aligned && wordData.segments?.length > 0) {
      return wordData.segments.map(s => s.text);
    }

    // When using a standard Arabic font, render words directly from API WordPhrase
    // This guarantees 100% match since display word === API word
    if (useApiWords && wordData?.words?.length > 0) {
      return wordData.words
        .filter(w => {
          const phrase = (w.WordPhrase || '').trim();
          // Filter out verse end markers like ﴿١﴾
          if (/^[\uFD3E\uFD3F\u0660-\u0669\u06F0-\u06F9()]+$/.test(phrase)) return false;
          if (!phrase.length) return false;
          return true;
        })
        .map(w => (w.WordPhrase || '').trim());
    }

    if (!arabicText) return [];

    // Split by spaces, but keep Arabic word boundaries intact
    // Remove verse markers and clean up
    const cleaned = arabicText
      .replace(/[\uFD3E\uFD3F\u0660-\u0669\u06F0-\u06F9()]+/g, '') // Remove verse markers and numbers
      .trim();
    
    // Filter out Quranic annotation/pause marks (ۖ ۗ ۘ ۙ ۚ ۛ ۜ ۞ ۟ etc.) that are
    // standalone tokens after splitting — they are not real words and cause false API matches
    return cleaned.split(/\s+/).filter(word => {
      const trimmed = word.trim();
      if (!trimmed.length) return false;
      if (/^[\u06D6-\u06ED]+$/.test(trimmed)) return false; // Pure Quranic mark token
      return true;
    });
  }, [arabicText, useApiWords, wordData]);

  // Removed debug useEffect to reduce console spam

  // Create a map of API words by their Arabic text (for matching)
  const apiWordMap = useMemo(() => {
    if (!wordData?.words) return new Map();
    
    const map = new Map();
    const normalize = (text) => {
      if (!text) return '';
      return text
        .replace(/[\u06D6-\u06ED]/g, '') // Remove embedded Quranic annotation marks (ۛ ۖ etc.)
        .replace(/\u0640/g, '') // Remove tatweel (ـ) BEFORE alef conversion so مَـٰلِكِ normalizes correctly
        .replace(/\u0670/g, '\u0627') // Superscript alef (ٰ) → regular alef (ا) e.g. رَزَقْنَٰهُمْ → رَزَقْنَاهُمْ
        .replace(/[\u064B-\u065F]/g, '') // Remove diacritics (fatha, damma, kasra, sukun, etc.)
        .replace(/[\u0671\u0672\u0673\u0622\u0623\u0625]/g, '\u0627') // Normalize all Alef variations (ٱ, ٲ, ٳ, آ, أ, إ → ا)
        .replace(/[\u0649\u064A]/g, '\u064A') // Normalize Ya variations (ى, ي → ي)
        .replace(/[\u0647\u06C1\u06C2\u06C3]/g, '\u0647') // Normalize He variations
        .replace(/\u0621/g, '') // Remove hamza (ء) for better matching
        .trim();
    };

    wordData.words.forEach((word, index) => {
      const apiText1 = (word.text_uthmani || '').trim();
      const apiText2 = (word.text_simple || '').trim();
      const wordPhrase = (word.WordPhrase || '').trim();
      
      // Store by multiple possible text variations (full phrases)
      if (apiText1) map.set(apiText1, { word, index });
      if (apiText2 && apiText2 !== apiText1) map.set(apiText2, { word, index });
      if (wordPhrase && wordPhrase !== apiText1 && wordPhrase !== apiText2) {
        map.set(wordPhrase, { word, index });
      }
      
      // Also store normalized versions (without diacritics) - full phrases
      const normalized1 = normalize(apiText1);
      const normalized2 = normalize(apiText2);
      const normalizedPhrase = normalize(wordPhrase);
      
      if (normalized1 && !map.has(normalized1)) map.set(normalized1, { word, index });
      if (normalized2 && normalized2 !== normalized1 && !map.has(normalized2)) {
        map.set(normalized2, { word, index });
      }
      if (normalizedPhrase && normalizedPhrase !== normalized1 && normalizedPhrase !== normalized2 && !map.has(normalizedPhrase)) {
        map.set(normalizedPhrase, { word, index });
      }
      
      // Also store individual words from compound phrases (for better matching)
      // This handles cases where API has "مِن قَبْلُ" but display has "مِن" and "قَبْلُ" separately
      const addSplitWords = (text, normalizedText) => {
        if (!text) return;
        const words = text.split(/\s+/).filter(w => w.trim().length > 0);
        const normalizedWords = normalizedText ? normalizedText.split(/\s+/).filter(w => w.trim().length > 0) : [];
        
        words.forEach((w, i) => {
          const trimmed = w.trim();
          const normalized = normalizedWords[i] || normalize(trimmed);
          
          // Store original word (with diacritics)
          if (trimmed && !map.has(trimmed)) {
            map.set(trimmed, { word, index });
          }
          
          // Store normalized word (without diacritics)
          if (normalized) {
            if (!map.has(normalized)) {
              map.set(normalized, { word, index });
            }
            // Also store a version without leading prefixes like و, إ, ال
            // This helps match "الضالين" from "الضَّالِّينَ" when API has "وَلَا الضَّالِّينَ"
            const withoutPrefix = normalized.replace(/^[وإل]+/, '').trim();
            if (withoutPrefix && withoutPrefix !== normalized && !map.has(withoutPrefix)) {
              map.set(withoutPrefix, { word, index });
            }
          }
        });
      };
      
      addSplitWords(wordPhrase, normalizedPhrase);
      addSplitWords(apiText1, normalized1);
      addSplitWords(apiText2, normalized2);
    });
    
    return map;
  }, [wordData]);

  // Match words with API data - try multiple strategies
  const getWordData = (wordIndex, wordText) => {
    if (!wordData?.words || wordData.words.length === 0) {
      return null;
    }
    
    const normalizedWord = wordText.trim();
    if (!normalizedWord) return null;

    // Server-aligned fast path: words[] was built from wordData.segments, so
    // display index === segment index — direct positional lookup, any font
    if (wordData.aligned && wordData.segments?.length > 0) {
      const seg = wordData.segments[wordIndex];
      if (seg?.word?.translation?.text) {
        const originalIndex = wordData.words.indexOf(seg.word);
        return { word: seg.word, index: originalIndex >= 0 ? originalIndex : wordIndex };
      }
      return null;
    }

    // Fast path for Scheherazade mode: words come directly from API WordPhrase
    // so we can match by position — display words are built from wordData.words
    // with empty-meaning entries filtered out
    if (useApiWords) {
      const meaningfulWords = wordData.words.filter(w => {
        const phrase = (w.WordPhrase || '').trim();
        if (/^[\uFD3E\uFD3F\u0660-\u0669\u06F0-\u06F9()]+$/.test(phrase)) return false;
        if (!phrase.length) return false;
        return true;
      });
      if (wordIndex < meaningfulWords.length) {
        const word = meaningfulWords[wordIndex];
        const originalIndex = wordData.words.indexOf(word);
        if (word?.translation?.text) {
          return { word, index: originalIndex >= 0 ? originalIndex : wordIndex };
        }
      }
      return null;
    }

    // Helper to normalize Arabic text (remove diacritics, zero-width characters, and normalize Alef variations)
    const normalize = (text) => {
      if (!text) return '';
      return text
        .replace(/[\u06D6-\u06ED]/g, '') // Remove embedded Quranic annotation marks (ۛ ۖ etc.)
        .replace(/\u0640/g, '') // Remove tatweel (ـ) BEFORE alef conversion so مَـٰلِكِ normalizes correctly
        .replace(/\u0670/g, '\u0627') // Superscript alef (ٰ) → regular alef (ا) e.g. رَزَقْنَٰهُمْ → رَزَقْنَاهُمْ
        .replace(/[\u064B-\u065F]/g, '') // Remove diacritics (fatha, damma, kasra, sukun, etc.)
        .replace(/[\u0671\u0672\u0673\u0622\u0623\u0625]/g, '\u0627') // Normalize all Alef variations (ٱ, ٲ, ٳ, آ, أ, إ → ا)
        .replace(/[\u0649\u064A]/g, '\u064A') // Normalize Ya variations (ى, ي → ي)
        .replace(/[\u0647\u06C1\u06C2\u06C3]/g, '\u0647') // Normalize He variations
        .replace(/\u0621/g, '') // Remove hamza (ء) for better matching - "وَبِالْآخِرَةِ" becomes "وبالاخرة"
        .trim();
    };
    
    const normalized = normalize(normalizedWord);
    
    // Strategy 1: Exact match from map
    const exactMatch = apiWordMap.get(normalizedWord);
    if (exactMatch && exactMatch.word?.translation?.text) {
      return exactMatch;
    }
    
    // Strategy 2: Normalized match (without diacritics)
    if (normalized) {
      const normalizedMatch = apiWordMap.get(normalized);
      if (normalizedMatch && normalizedMatch.word?.translation?.text) {
        return normalizedMatch;
      }
    }
    
    // Strategy 3: Try to find exact single-word matches first (prefer individual words over compounds)
    // Only use compound matching if no individual word match is found
    if (normalized && normalized.length > 1) {
      // First, try to find exact single-word matches (not compound)
      for (let i = 0; i < wordData.words.length; i++) {
        const apiWord = wordData.words[i];
        if (!apiWord?.translation?.text) continue;
        
        const apiText1 = normalize((apiWord.text_uthmani || '').trim());
        const apiText2 = normalize((apiWord.text_simple || '').trim());
        const apiPhrase = normalize((apiWord.WordPhrase || '').trim());
        
        // Check if this is a single word (not compound - no spaces)
        const isSingleWord = !apiPhrase.includes(' ') && !apiText1.includes(' ') && !apiText2.includes(' ');
        
        if (isSingleWord) {
          if (apiPhrase === normalized || apiText1 === normalized || apiText2 === normalized) {
            return { word: apiWord, index: i };
          }
          
          // Handle cases where display has ء at start but API has أأ
          // "ءَأَنذَرْتَهُمْ" (display) should match "أَأَنذَرْتَهُمْ" (API)
          const removeLeadingAlef = (text) => {
            return text.replace(/^ا+/, 'ا'); // Replace multiple leading ا's with single ا
          };
          const normalizedSingleAlef = removeLeadingAlef(normalized);
          const apiPhraseSingleAlef = removeLeadingAlef(apiPhrase);
          const apiText1SingleAlef = removeLeadingAlef(apiText1);
          const apiText2SingleAlef = removeLeadingAlef(apiText2);
          
          if (normalizedSingleAlef === apiPhraseSingleAlef || 
              normalizedSingleAlef === apiText1SingleAlef || 
              normalizedSingleAlef === apiText2SingleAlef) {
            if (normalizedSingleAlef.length >= 3) {
              return { word: apiWord, index: i };
            }
          }
        }
      }
      
      // Strategy 3b: If no single-word match found, check compound words
      // This handles cases where API has "وَلَا الضَّالِّينَ" but display has "ٱلضَّآلِّينَ"
      // When a display word is part of a compound, show the compound's meaning
      for (let i = 0; i < wordData.words.length; i++) {
        const apiWord = wordData.words[i];
        if (!apiWord?.translation?.text) continue;
        
        const apiText1 = normalize((apiWord.text_uthmani || '').trim());
        const apiText2 = normalize((apiWord.text_simple || '').trim());
        const apiPhrase = normalize((apiWord.WordPhrase || '').trim());
        
        // Check all API text variations
        const apiTexts = [apiPhrase, apiText1, apiText2].filter(t => t);
        
        for (const apiText of apiTexts) {
          // Only check compound words (those with spaces)
          if (!apiText.includes(' ')) continue;
          
          // Split compound API words and check each part
          const wordsInApiText = apiText.split(/\s+/);
          
          // Check if any word in the compound matches the display word
          for (const apiWordPart of wordsInApiText) {
            const normalizedApiPart = normalize(apiWordPart);
            
            // Exact match
            if (normalizedApiPart === normalized) {
              return { word: apiWord, index: i };
            }
            
            // Match without prefixes (ال, و, إ, etc.) - try multiple prefix combinations
            const removePrefixes = (text) => {
              // Remove common Arabic prefixes
              return text.replace(/^[وإلأآ]+/, '').trim();
            };
            
            const apiPartWithoutPrefix = removePrefixes(normalizedApiPart);
            const displayWithoutPrefix = removePrefixes(normalized);
            
            // Match without prefixes
            if (apiPartWithoutPrefix && displayWithoutPrefix && apiPartWithoutPrefix === displayWithoutPrefix) {
              return { word: apiWord, index: i };
            }
            
            // Reverse: display without prefix matches API part
            if (displayWithoutPrefix === normalizedApiPart) {
              return { word: apiWord, index: i };
            }
            
            // Also try: API part without prefix matches display
            if (apiPartWithoutPrefix === normalized) {
              return { word: apiWord, index: i };
            }
            
            // Check if one contains the other (for variations like "الضالين" vs "الضَّالِّينَ")
            if (normalized.length >= 3 && normalizedApiPart.length >= 3) {
              // Check if they're similar (one contains the other or vice versa)
              if (normalizedApiPart.includes(normalized) || normalized.includes(normalizedApiPart)) {
                // Ensure it's a significant match (at least 70% of the shorter word)
                const minLen = Math.min(normalized.length, normalizedApiPart.length);
                const maxLen = Math.max(normalized.length, normalizedApiPart.length);
                if (minLen / maxLen >= 0.7) {
                  return { word: apiWord, index: i };
                }
              }
              
              // Also check without prefixes
              if (apiPartWithoutPrefix && displayWithoutPrefix) {
                if (apiPartWithoutPrefix.includes(displayWithoutPrefix) || displayWithoutPrefix.includes(apiPartWithoutPrefix)) {
                  const minLen = Math.min(displayWithoutPrefix.length, apiPartWithoutPrefix.length);
                  const maxLen = Math.max(displayWithoutPrefix.length, apiPartWithoutPrefix.length);
                  if (minLen / maxLen >= 0.7) {
                    return { word: apiWord, index: i };
                  }
                }
              }
            }
          }
          
          // Last resort: Check if normalized display word appears anywhere in the compound text
          // This ensures "ٱلضَّآلِّينَ" matches "وَلَا الضَّالِّينَ" even if exact matching fails
          // Also check without hamza and other variations
          const normalizedNoHamza = normalized.replace(/\u0621/g, '');
          const apiTextNoHamza = apiText.replace(/\u0621/g, '');
          
          if (normalized.length >= 3) {
            if (apiText.includes(normalized) || apiTextNoHamza.includes(normalizedNoHamza)) {
              return { word: apiWord, index: i };
            }
            // Also check if display word (without prefixes) appears in compound
            const displayWithoutPrefix = normalized.replace(/^[وإلأآ]+/, '').trim();
            if (displayWithoutPrefix && displayWithoutPrefix.length >= 3) {
              if (apiText.includes(displayWithoutPrefix) || apiTextNoHamza.includes(displayWithoutPrefix.replace(/\u0621/g, ''))) {
                return { word: apiWord, index: i };
              }
            }
          }
        }
      }
    }
    
    // Strategy 4: Try to find by normalized match in all API words (including compound words)
    // This is a fallback that checks all words more thoroughly
    if (normalized) {
      for (let i = 0; i < wordData.words.length; i++) {
        const apiWord = wordData.words[i];
        if (!apiWord?.translation?.text) continue;
        
        const apiText1 = normalize((apiWord.text_uthmani || '').trim());
        const apiText2 = normalize((apiWord.text_simple || '').trim());
        const apiPhrase = normalize((apiWord.WordPhrase || '').trim());
        
        // Check all API text variations
        const apiTexts = [apiPhrase, apiText1, apiText2].filter(t => t);
        
        for (const apiText of apiTexts) {
          // Split into words
          const apiWords = apiText.split(/\s+/);
          
          for (const apiWordPart of apiWords) {
            const normalizedApiPart = normalize(apiWordPart);
            
            // Exact match
            if (normalizedApiPart === normalized) {
              return { word: apiWord, index: i };
            }
            
            // Handle cases where display has ء at start but API has أ
            // "ءَأَنذَرْتَهُمْ" (display) should match "أَأَنذَرْتَهُمْ" (API)
            // After normalization: "انذرتهم" vs "اانذرتهم" (double ا)
            // Remove leading duplicate ا's for comparison
            const removeLeadingAlef = (text) => {
              return text.replace(/^ا+/, 'ا'); // Replace multiple leading ا's with single ا
            };
            const normalizedSingleAlef = removeLeadingAlef(normalized);
            const apiPartSingleAlef = removeLeadingAlef(normalizedApiPart);
            
            if (normalizedSingleAlef === apiPartSingleAlef && normalizedSingleAlef.length >= 3) {
              return { word: apiWord, index: i };
            }
            
            // Match without prefixes
            const apiPartWithoutPrefix = normalizedApiPart.replace(/^[وإل]+/, '').trim();
            const displayWithoutPrefix = normalized.replace(/^[وإل]+/, '').trim();
            
            if (apiPartWithoutPrefix && displayWithoutPrefix && apiPartWithoutPrefix === displayWithoutPrefix) {
              return { word: apiWord, index: i };
            }
            
            if (displayWithoutPrefix === normalizedApiPart) {
              return { word: apiWord, index: i };
            }
            
            // Also try with single Alef normalization for prefix-removed versions
            const apiPartWithoutPrefixSingleAlef = removeLeadingAlef(apiPartWithoutPrefix);
            const displayWithoutPrefixSingleAlef = removeLeadingAlef(displayWithoutPrefix);
            
            if (apiPartWithoutPrefixSingleAlef && displayWithoutPrefixSingleAlef && 
                apiPartWithoutPrefixSingleAlef === displayWithoutPrefixSingleAlef && 
                apiPartWithoutPrefixSingleAlef.length >= 3) {
              return { word: apiWord, index: i };
            }
          }
        }
      }
    }
    
    // Strategy 5: Position-based matching (ONLY if word counts match closely)
    // Only use this as last resort when display and API have similar word counts
    const displayWordCount = words.length;
    // Filter out API words with empty meaning (e.g. verse end markers ﴿١﴾) for accurate count
    const effectiveApiWords = wordData.words.filter(w => w?.translation?.text);
    const effectiveApiWordCount = effectiveApiWords.length;
    const wordCountDiff = Math.abs(displayWordCount - effectiveApiWordCount);
    
    // Use position matching if counts are close (within 35% difference)
    if (wordCountDiff <= Math.max(2, displayWordCount * 0.35) && wordIndex < effectiveApiWords.length) {
      const word = effectiveApiWords[wordIndex];
      if (word?.translation?.text) {
        // Find the original index in wordData.words for this effective word
        const originalIndex = wordData.words.indexOf(word);
        return { word, index: originalIndex >= 0 ? originalIndex : wordIndex };
      }
    }
    
    return null;
  };

  // Pre-compute which API entry each display word maps to
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const wordMatches = useMemo(() => words.map((word, index) => getWordData(index, word)), [words, wordData, apiWordMap]);

  // Group CONSECUTIVE display words that share the same API index
  // Only group adjacent words (not scattered matches across the verse)
  const apiIndexToDisplayWords = useMemo(() => {
    const map = new Map();
    let currentApiIdx = null;
    let currentGroup = [];

    const flushGroup = () => {
      if (currentApiIdx !== null && currentGroup.length > 0) {
        // Only store the group if it has more than 1 word (actual compound)
        // or if there's no existing entry yet
        if (!map.has(currentApiIdx) || currentGroup.length > (map.get(currentApiIdx)?.length || 0)) {
          map.set(currentApiIdx, [...currentGroup]);
        }
      }
      currentGroup = [];
      currentApiIdx = null;
    };

    words.forEach((word, index) => {
      const match = wordMatches[index];
      if (match?.word?.translation?.text) {
        const apiIdx = match.index;
        if (apiIdx === currentApiIdx) {
          // Same API index as previous word — extend group
          currentGroup.push(word);
        } else {
          // Different API index — flush previous group and start new
          flushGroup();
          currentApiIdx = apiIdx;
          currentGroup = [word];
        }
      } else {
        // No match — flush current group
        flushGroup();
      }
    });
    flushGroup(); // Flush last group

    return map;
  }, [words, wordMatches]);


  // Show the tooltip for a display word given its index and DOM element.
  // Shared by onMouseEnter and the pending-hover effect below.
  const showTooltipFor = (index, el) => {
    const wordMatch = wordMatches[index];
    if (!wordMatch?.word?.translation?.text || !wordData?.words) return;

    const word = words[index];
    const grouped = apiIndexToDisplayWords.get(wordMatch.index) || [word];
    const combined = grouped.length > 1 ? grouped.join(' ') : null;
    setCombinedArabic(combined);

    // For combined groups: center tooltip over the group only if ALL words are on the same line.
    // If they span multiple lines, show the tooltip above the hovered word itself.
    let overrideX = null;
    if (grouped.length > 1) {
      const container = el.parentElement;
      const siblings = container?.querySelectorAll(`[data-api-idx="${wordMatch.index}"]`);
      if (siblings?.length > 1) {
        const rects = Array.from(siblings).map(s => s.getBoundingClientRect());
        const tops = rects.map(r => r.top);
        const allOnSameLine = Math.max(...tops) - Math.min(...tops) < 10;
        if (allOnSameLine) {
          const minX = Math.min(...rects.map(r => r.left));
          const maxX = Math.max(...rects.map(r => r.right));
          overrideX = (minX + maxX) / 2;
        }
        // else: multi-line group → overrideX stays null → tooltip anchors to hovered word
      }
    }

    handleWordHover(wordMatch.index, { currentTarget: el }, overrideX);
  };

  // Pending hover: word the cursor is currently on while data is still loading.
  // When wordData arrives, show its tooltip immediately — no need to re-hover/click.
  const pendingHoverRef = useRef(null);
  useEffect(() => {
    const pending = pendingHoverRef.current;
    if (!pending || !wordData?.words?.length) return;
    if (!pending.el.isConnected) return; // Word span was unmounted (verse changed)
    showTooltipFor(pending.index, pending.el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordData]);

  // When using API words font and data hasn't loaded yet, show original text as fallback
  if (!words.length) {
    return (
      <span
        ref={firstWordRef}
        className={isCurrentAyah ? 'text-primary dark:text-primary-light' : 'text-gray-800 dark:text-gray-100'}
        style={{ fontFamily: quranFont, fontSize: `${fontSize}px` }}
      >
        {arabicText}
      </span>
    );
  }

  return (
    <>
      {words.map((word, index) => {
        const wordMatch = wordMatches[index];
        const hasMeaning = wordMatch?.word?.translation?.text;

        return (
          <span
            key={`${surahId}-${verseNumber}-${index}`}
            ref={index === 0 ? firstWordRef : undefined}
            data-api-idx={wordMatch?.index ?? -1}
            onMouseEnter={isMobile ? undefined : (e) => {
              // Remember cursor position so tooltip can appear as soon as data loads
              pendingHoverRef.current = { index, el: e.currentTarget };
              // Trigger lazy fetch on first hover (blockwise mode)
              if (!fetchEnabled) {
                setFetchEnabled(true);
                return; // Data not ready yet; pending-hover effect shows tooltip on load
              }
              showTooltipFor(index, e.currentTarget);
            }}
            onMouseLeave={isMobile ? undefined : () => {
              pendingHoverRef.current = null;
              setCombinedArabic(null);
              handleWordLeave();
            }}
            className={`inline ${
              hasMeaning && !isMobile
                ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded'
                : ''
            } ${isCurrentAyah ? 'text-primary dark:text-primary-light' : 'text-gray-800 dark:text-gray-100'}`}
            style={{
              fontFamily: quranFont,
              fontSize: `${fontSize}px`,
              // Constrain the CSS line-box height so the hover background doesn't bleed
              // into adjacent lines. AmiriQuran has extremely tall font metrics (for diacritics)
              // so without this the bg fills far beyond the visible glyphs.
              // The parent <p>'s lineHeight still controls the inter-line spacing.
              lineHeight: 1.5,
              // Always reserve horizontal padding so layout never shifts when word data loads
              // (avoids spring/jump when blockwise lazy-fetch populates word matches)
              paddingInline: isMobile ? undefined : '0.25rem',
            }}
            dir="rtl"
          >
            {word}
            {index < words.length - 1 && ' '}{/* Regular space — allows CSS text-align:justify to stretch */}
          </span>
        );
      })}
      
      {!isMobile && hoveredWord && hoverPosition && wordData?.words && (
        <WordTooltip
          key={`tooltip-${surahId}-${verseNumber}`}
          word={hoveredWord}
          position={hoverPosition}
          language={wordData.words[0]?.translation?.language_name || language}
          combinedArabic={combinedArabic}
        />
      )}
    </>
  );
};

export default HoverableArabicText;
