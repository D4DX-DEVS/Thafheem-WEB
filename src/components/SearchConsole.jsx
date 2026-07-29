import React, { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  searchMalEngTranslations,
  searchArabicPhrases,
  fetchQuranSubjects,
  fetchQuranSubjectResults,
  fetchGlossaryEntries,
  searchRoots,
  fetchRootSeeds,
  fetchRootWordBundle,
} from "../api/apifunction";

const SearchConsole = ({ onClose, translationLanguage = 'mal' }) => {
  const [englishPhraseType, setEnglishPhraseType] = useState("Translation");
  const [englishPhraseSearch, setEnglishPhraseSearch] = useState("");
  const [malayalamPhraseType, setMalayalamPhraseType] = useState("Translation");
  const [malayalamPhraseSearch, setMalayalamPhraseSearch] = useState("");
  const [englishResults, setEnglishResults] = useState([]);
  const [malayalamResults, setMalayalamResults] = useState([]);
  const [englishLoading, setEnglishLoading] = useState(false);
  const [malayalamLoading, setMalayalamLoading] = useState(false);
  const [englishError, setEnglishError] = useState(null);
  const [malayalamError, setMalayalamError] = useState(null);
  const [englishHasSearched, setEnglishHasSearched] = useState(false);
  const [malayalamHasSearched, setMalayalamHasSearched] = useState(false);
  const [arabicPhraseSearch, setArabicPhraseSearch] = useState("");
  const [arabicResults, setArabicResults] = useState([]);
  const [arabicLoading, setArabicLoading] = useState(false);
  const [arabicError, setArabicError] = useState(null);
  const [arabicHasSearched, setArabicHasSearched] = useState(false);
  const [arabicRootSearch, setArabicRootSearch] = useState("");
  const [showRootResults, setShowRootResults] = useState(false);
  const [arabicRootMatches, setArabicRootMatches] = useState([]);
  const [arabicRootLoading, setArabicRootLoading] = useState(false);
  const [arabicRootLoadingMore, setArabicRootLoadingMore] = useState(false);
  const [arabicRootError, setArabicRootError] = useState(null);
  const [arabicRootHasSearched, setArabicRootHasSearched] = useState(false);
  const [rootSeedPage, setRootSeedPage] = useState(1);
  const [rootSeedHasMore, setRootSeedHasMore] = useState(false);
  const [rootSeedTotal, setRootSeedTotal] = useState(0);
  const [selectedRootEntry, setSelectedRootEntry] = useState(null);
  const [rootWordForms, setRootWordForms] = useState([]);
  const [selectedRootWordForm, setSelectedRootWordForm] = useState("");
  const [rootVerseItems, setRootVerseItems] = useState([]);
  const [rootVerseItemsLoading, setRootVerseItemsLoading] = useState(false);
  const [rootVerseItemsError, setRootVerseItemsError] = useState(null);
  const [quranSubjectSearch, setQuranSubjectSearch] = useState("");
  const [quranSubjectLanguage, setQuranSubjectLanguage] = useState("E");
  const [quranSubjectCategory, setQuranSubjectCategory] = useState(1);
  const [quranSubjectResults, setQuranSubjectResults] = useState([]);
  const [quranSubjectLoading, setQuranSubjectLoading] = useState(false);
  const [quranSubjectError, setQuranSubjectError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [quranSubjectItems, setQuranSubjectItems] = useState([]);
  const [quranSubjectItemsLoading, setQuranSubjectItemsLoading] = useState(false);
  const [quranSubjectItemsError, setQuranSubjectItemsError] = useState(null);
  const [showSubjectResults, setShowSubjectResults] = useState(false);
  const [subjectDisplayCount, setSubjectDisplayCount] = useState(20);
  const [glossaryLanguage, setGlossaryLanguage] = useState("Arabic");

  // Set glossary language to Arabic when translation language is not English or Malayalam
  useEffect(() => {
    if (translationLanguage !== 'E' && translationLanguage !== 'mal') {
      setGlossaryLanguage("Arabic");
    }
  }, [translationLanguage]);
  const [glossarySearch, setGlossarySearch] = useState("");
  const [glossaryEntries, setGlossaryEntries] = useState([]);
  const [glossaryLoading, setGlossaryLoading] = useState(false);
  const [glossaryError, setGlossaryError] = useState(null);
  const [showGlossaryResults, setShowGlossaryResults] = useState(false);
  const [glossaryDisplayCount, setGlossaryDisplayCount] = useState(20);
  const [selectedGlossaryEntry, setSelectedGlossaryEntry] = useState(null);
  const [isWideSearchView, setIsWideSearchView] = useState(false);

  const normalizedSubjectFilter = quranSubjectSearch.trim().toLowerCase();
  const filteredSubjects = quranSubjectResults.filter((subject) =>
    subject.SubjText?.toLowerCase().includes(normalizedSubjectFilter)
  );
  const normalizedGlossaryFilter = glossarySearch.trim().toLowerCase();
  const filteredGlossary = glossaryEntries.filter((entry) => {
    if (!normalizedGlossaryFilter) {
      return true;
    }
    const englishMatch =
      glossaryLanguage === "English" &&
      (entry.engtitleglossary?.toLowerCase().includes(normalizedGlossaryFilter) ||
        entry.glossarytext?.toLowerCase().includes(normalizedGlossaryFilter));
    const arabicMatch =
      glossaryLanguage === "Arabic" &&
      entry.arrtitleglossary?.toLowerCase().includes(normalizedGlossaryFilter);
    return englishMatch || arabicMatch;
  });

  const visibleGlossaryEntries = filteredGlossary.slice(0, glossaryDisplayCount);

  const getGlossaryPrimaryTitle = (entry) => {
    if (glossaryLanguage === "Arabic") {
      return entry.arrtitleglossary || entry.engtitleglossary || "Untitled";
    }
    return entry.engtitleglossary || entry.arrtitleglossary || "Untitled";
  };

  const extractVerseReference = (entry) => {
    const source = [
      entry?.engtitleglossary,
      entry?.arrtitleglossary,
      entry?.glossarytext,
    ]
      .filter(Boolean)
      .join(" ");

    if (!source) {
      return null;
    }

    // Matches formats like: 2:38, V.18:83, V. 9:34, (24:6,7,8)
    const match = source.match(/(?:\bV\.?\s*)?(\d{1,3})\s*:\s*(\d{1,3})/i);
    if (!match) {
      return null;
    }

    const surah = Number.parseInt(match[1], 10);
    const ayah = Number.parseInt(match[2], 10);
    if (!Number.isFinite(surah) || !Number.isFinite(ayah)) {
      return null;
    }
    if (surah < 1 || surah > 114 || ayah < 1) {
      return null;
    }

    return { surah, ayah };
  };

  const handleGlossaryVerseNavigation = (entry) => {
    const ref = extractVerseReference(entry);
    if (!ref) {
      return;
    }
    navigate(`/surah/${ref.surah}#verse-${ref.ayah}`, {
      state: {
        scrollToVerse: String(ref.ayah),
        highlightVerse: `${ref.surah}:${ref.ayah}`,
      },
    });
    onClose?.();
  };

  const searchTrackerRef = useRef({
    english: 0,
    malayalam: 0,
    arabic: 0,
    roots: 0,
    rootBundle: 0,
    subjects: 0,
    subjectItems: 0,
    glossary: 0,
  });
  const subjectResultsAnchorRef = useRef(null);
  const rootResultsAnchorRef = useRef(null);
  const glossaryResultsAnchorRef = useRef(null);
  const navigate = useNavigate();
  const isSubjectDetailView =
    showSubjectResults &&
    (selectedSubject || quranSubjectItems.length > 0 || quranSubjectItemsLoading);
  const isRootDetailView =
    selectedRootEntry || rootVerseItems.length > 0 || rootVerseItemsLoading;

  const normalizeArabicWord = (value) =>
    (value || "")
      .toString()
      .normalize("NFKD")
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
      .trim();

  const normalizedSelectedRootForm = normalizeArabicWord(selectedRootWordForm);
  const filteredRootVerseItems =
    normalizedSelectedRootForm.length === 0
      ? rootVerseItems
      : rootVerseItems.filter((item) => {
          const normalizedItemWord = normalizeArabicWord(item?.word);
          if (!normalizedItemWord) {
            return false;
          }
          return (
            normalizedItemWord === normalizedSelectedRootForm ||
            normalizedItemWord.includes(normalizedSelectedRootForm)
          );
        });

  const scrollToAnchor = (anchorRef) => {
    if (typeof window === "undefined") {
      return;
    }
    const target = anchorRef?.current;
    if (!target) {
      return;
    }
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  useEffect(() => {
    if (translationLanguage !== 'E') {
      setShowGlossaryResults(false);
      setGlossarySearch("");
      setSelectedGlossaryEntry(null);
    }
  }, [translationLanguage]);

  const normalizeResultText = (result) => {
    const rawText =
      typeof result?.Interpretation === "string" && result.Interpretation.trim().length > 0
        ? result.Interpretation
        : result?.TranslationText || result?.AyaHText || result?.matchedText;
    if (!rawText) {
      return "Text not available";
    }
    return rawText.replace(/\t+/g, " ").replace(/\s+/g, " ").trim();
  };

  const getResultMetaLabel = (result) => {
    if (result?.InterpretationNo) {
      return `Interpretation ${result.InterpretationNo}`;
    }
    const ayahSource = result?.AyaFrom ?? result?.ayaid ?? result?.AyaID;
    if (ayahSource != null) {
      const label = ayahSource.toString();
      return label.includes("-") ? `Verses ${label}` : `Ayah ${label}`;
    }
    return "View details";
  };

  const extractFirstVerseNumber = (...values) => {
    for (const value of values) {
      if (!value) {
        continue;
      }
      const match = value.toString().match(/\d+/);
      if (match) {
        return match[0];
      }
    }
    return null;
  };

  const normalizePositiveInteger = (value) => {
    if (value == null) {
      return null;
    }
    const numberValue = Number(value);
    if (Number.isFinite(numberValue) && numberValue > 0) {
      return Math.trunc(numberValue);
    }
    return null;
  };

  const handleResultNavigation = (result) => {
    const surahIdValue =
      result?.SuraID ?? result?.suraid ?? result?.SuraId ?? result?.SuraNo ?? result?.suraNo;
    const surahId = normalizePositiveInteger(surahIdValue);
    if (!surahId) {
      return;
    }
    const verseCandidate =
      normalizePositiveInteger(result.ayaid) ??
      normalizePositiveInteger(result.AyaID) ??
      normalizePositiveInteger(result.AyaFrom);
    const extractedFallback = extractFirstVerseNumber(
      result.ayaid,
      result.AyaID,
      result.AyaFrom,
      typeof result.TranslationText === "string" ? result.TranslationText : null,
      typeof result.Interpretation === "string" ? result.Interpretation : null,
      result.AyaHText,
      result.contiayano
    );
    const verseNumber =
      verseCandidate ?? normalizePositiveInteger(extractedFallback);

    const navigationState =
      verseNumber != null
        ? {
          scrollToVerse: verseNumber.toString(),
          highlightVerse: `${surahId}:${verseNumber}`,
        }
        : undefined;
    const targetUrl =
      verseNumber != null
        ? `/surah/${surahId}#verse-${verseNumber}`
        : `/surah/${surahId}`;
    navigate(targetUrl, navigationState ? { state: navigationState } : undefined);
    onClose?.();
  };

  const handleSubjectSelection = async (subject) => {
    const subjectId = normalizePositiveInteger(subject?.ID);
    if (!subjectId) {
      return;
    }

    setSelectedSubject(subject);
    setQuranSubjectItems([]);
    setQuranSubjectItemsError(null);
    setQuranSubjectItemsLoading(true);
    const requestId = ++searchTrackerRef.current.subjectItems;

    try {
      const payload = await fetchQuranSubjectResults({
        subjectId,
        category: quranSubjectCategory,
        language: quranSubjectLanguage,
      });
      if (searchTrackerRef.current.subjectItems !== requestId) {
        return;
      }
      setQuranSubjectItems(payload || []);
    } catch (error) {
      if (searchTrackerRef.current.subjectItems !== requestId) {
        return;
      }
      setQuranSubjectItems([]);
      setQuranSubjectItemsError(error.message || "Failed to load subject results.");
    } finally {
      if (searchTrackerRef.current.subjectItems === requestId) {
        setQuranSubjectItemsLoading(false);
      }
    }
  };

  const handleRootSelection = async (rootEntry) => {
    const rootGroupId = normalizePositiveInteger(rootEntry?.rootGroupId);
    if (!rootGroupId) {
      return;
    }

    setSelectedRootEntry(rootEntry);
    setSelectedRootWordForm("");
    setRootWordForms([]);
    setRootVerseItems([]);
    setRootVerseItemsError(null);
    setRootVerseItemsLoading(true);
    setIsWideSearchView(true);

    const requestId = ++searchTrackerRef.current.rootBundle;

    try {
      const payload = await fetchRootWordBundle(rootGroupId, 1, 80);
      if (searchTrackerRef.current.rootBundle !== requestId) {
        return;
      }

      setSelectedRootEntry((previous) => ({
        ...(previous || rootEntry),
        root: payload?.root || previous?.root || rootEntry?.root || "",
        verseCount:
          Number(payload?.total) || previous?.verseCount || rootEntry?.verseCount || 0,
      }));
      setRootWordForms(Array.isArray(payload?.wordForms) ? payload.wordForms : []);
      setRootVerseItems(Array.isArray(payload?.results) ? payload.results : []);
    } catch (error) {
      if (searchTrackerRef.current.rootBundle !== requestId) {
        return;
      }
      setRootWordForms([]);
      setRootVerseItems([]);
      setRootVerseItemsError(error.message || "Failed to load root word results.");
    } finally {
      if (searchTrackerRef.current.rootBundle === requestId) {
        setRootVerseItemsLoading(false);
      }
    }
  };

  const handleLoadMoreRootSeeds = async () => {
    if (arabicRootHasSearched || arabicRootLoading || arabicRootLoadingMore || !rootSeedHasMore) {
      return;
    }

    const nextPage = rootSeedPage + 1;
    const requestId = ++searchTrackerRef.current.roots;
    setArabicRootLoadingMore(true);
    setArabicRootError(null);

    try {
      const payload = await fetchRootSeeds(60, nextPage);
      if (searchTrackerRef.current.roots !== requestId) {
        return;
      }

      const incomingRoots = Array.isArray(payload?.roots) ? payload.roots : [];
      setArabicRootMatches((previous) => {
        const seen = new Set(previous.map((item) => Number(item?.rootGroupId)));
        const dedupedIncoming = incomingRoots.filter(
          (item) => !seen.has(Number(item?.rootGroupId))
        );
        return [...previous, ...dedupedIncoming];
      });
      setRootSeedPage(Number(payload?.page) || nextPage);
      setRootSeedHasMore(Boolean(payload?.hasMore));
      setRootSeedTotal(Number(payload?.total) || 0);
    } catch (error) {
      if (searchTrackerRef.current.roots !== requestId) {
        return;
      }
      setArabicRootError(error.message || "Failed to load more root words.");
    } finally {
      if (searchTrackerRef.current.roots === requestId) {
        setArabicRootLoadingMore(false);
      }
    }
  };

  const renderResultSection = ({
    id,
    languageLabel,
    query,
    isLoading,
    error,
    results,
    hasSearched,
    isMalayalam = false,
    isArabic = false,
    isSubject = false,
    onResultClick,
    selectedSubjectId = null,
    listMaxHeightClass = "max-h-56",
  }) => {
    if (!isSubject && !query.trim() && !hasSearched && !isLoading) {
      return null;
    }

    return (
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
            {languageLabel}
          </p>
          {!isLoading && results.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {results.length} {results.length === 1 ? "result" : "results"}
            </span>
          )}
        </div>
        <div className={`space-y-2 overflow-y-auto pr-1 ${listMaxHeightClass}`}>
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
              <span className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-transparent dark:border-gray-500 animate-spin" />
              <span>Searching...</span>
            </div>
          )}
          {error && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {error}
            </p>
          )}
          {!isLoading && !error && !isSubject && hasSearched && results.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">No matches found</p>
          )}
          {results.map((result) => (
            <button
              key={`${id}-${result.ID}-${result.SuraID}-${result.AyaFrom ?? result.InterpretationNo ?? "0"}`}
              type="button"
              onClick={() => (onResultClick ? onResultClick(result) : handleResultNavigation(result))}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                isSubject && selectedSubjectId != null && Number(result.ID) === Number(selectedSubjectId)
                  ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                  : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/30 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {!isSubject ? (
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                  <span>Surah {result.SuraID ?? result.suraid ?? result.SuraId}</span>
                  <span>{getResultMetaLabel(result)}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                  <span>Subject #{result.ID}</span>
                </div>
              )}
              <p
                className={`text-sm text-gray-800 dark:text-gray-100 leading-relaxed ${isMalayalam ? 'font-malayalam' : isArabic ? 'font-arabic' : ''}`}
                dir={isArabic && !isMalayalam ? "rtl" : "ltr"}
                lang={
                  isMalayalam
                    ? "ml"
                    : isArabic
                      ? "ar"
                      : isSubject
                        ? quranSubjectLanguage === "M"
                          ? "ml"
                          : "en"
                        : "en"
                }
              >
                {isSubject ? result.SubjText : normalizeResultText(result)}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  };

  useEffect(() => {
    const trimmedQuery = englishPhraseSearch.trim();
    if (!trimmedQuery) {
      setEnglishResults([]);
      setEnglishHasSearched(false);
      setEnglishLoading(false);
      setEnglishError(null);
      return;
    }

    const searchType =
      englishPhraseType === "Interpretation" ? "interpretation" : "translation";

    setEnglishHasSearched(true);
    setEnglishLoading(true);
    setEnglishError(null);
    const requestId = ++searchTrackerRef.current.english;

    const debounceId = setTimeout(async () => {
      try {
        const payload = await searchMalEngTranslations({
          query: trimmedQuery,
          language: "E",
          type: searchType,
        });
        if (searchTrackerRef.current.english !== requestId) {
          return;
        }
        setEnglishResults(payload);
      } catch (error) {
        if (searchTrackerRef.current.english !== requestId) {
          return;
        }
        setEnglishResults([]);
        setEnglishError(error.message || "Failed to fetch results.");
      } finally {
        if (searchTrackerRef.current.english === requestId) {
          setEnglishLoading(false);
        }
      }
    }, 450);

    return () => clearTimeout(debounceId);
  }, [englishPhraseSearch, englishPhraseType]);

  useEffect(() => {
    const trimmedQuery = malayalamPhraseSearch.trim();
    if (!trimmedQuery) {
      setMalayalamResults([]);
      setMalayalamHasSearched(false);
      setMalayalamLoading(false);
      setMalayalamError(null);
      return;
    }

    const searchType =
      malayalamPhraseType === "Interpretation" ? "interpretation" : "translation";

    setMalayalamHasSearched(true);
    setMalayalamLoading(true);
    setMalayalamError(null);
    const requestId = ++searchTrackerRef.current.malayalam;

    const debounceId = setTimeout(async () => {
      try {
        const payload = await searchMalEngTranslations({
          query: trimmedQuery,
          language: "M",
          type: searchType,
        });
        if (searchTrackerRef.current.malayalam !== requestId) {
          return;
        }
        setMalayalamResults(payload);
      } catch (error) {
        if (searchTrackerRef.current.malayalam !== requestId) {
          return;
        }
        setMalayalamResults([]);
        setMalayalamError(error.message || "Failed to fetch results.");
      } finally {
        if (searchTrackerRef.current.malayalam === requestId) {
          setMalayalamLoading(false);
        }
      }
    }, 450);

    return () => clearTimeout(debounceId);
  }, [malayalamPhraseSearch, malayalamPhraseType]);

  useEffect(() => {
    const trimmedQuery = arabicPhraseSearch.trim();
    if (!trimmedQuery) {
      setArabicResults([]);
      setArabicHasSearched(false);
      setArabicLoading(false);
      setArabicError(null);
      return;
    }

    setArabicHasSearched(true);
    setArabicLoading(true);
    setArabicError(null);
    const requestId = ++searchTrackerRef.current.arabic;

    const debounceId = setTimeout(async () => {
      try {
        const payload = await searchArabicPhrases(trimmedQuery);
        if (searchTrackerRef.current.arabic !== requestId) {
          return;
        }
        setArabicResults(payload);
      } catch (error) {
        if (searchTrackerRef.current.arabic !== requestId) {
          return;
        }
        setArabicResults([]);
        setArabicError(error.message || "Failed to fetch Arabic matches.");
      } finally {
        if (searchTrackerRef.current.arabic === requestId) {
          setArabicLoading(false);
        }
      }
    }, 450);

    return () => clearTimeout(debounceId);
  }, [arabicPhraseSearch]);

  useEffect(() => {
    if (!showRootResults) {
      return;
    }

    const trimmedQuery = arabicRootSearch.trim();
    if (!trimmedQuery) {
      const requestId = ++searchTrackerRef.current.roots;
      setArabicRootHasSearched(false);
      setArabicRootLoading(true);
      setArabicRootLoadingMore(false);
      setArabicRootError(null);
      setSelectedRootEntry(null);
      setSelectedRootWordForm("");
      setRootWordForms([]);
      setRootVerseItems([]);
      setRootVerseItemsError(null);
      setIsWideSearchView(false);
      setRootSeedPage(1);
      setRootSeedHasMore(false);
      setRootSeedTotal(0);

      const loadSeeds = async () => {
        try {
          const payload = await fetchRootSeeds(60, 1);
          if (searchTrackerRef.current.roots !== requestId) {
            return;
          }
          setArabicRootMatches(Array.isArray(payload?.roots) ? payload.roots : []);
          setRootSeedPage(Number(payload?.page) || 1);
          setRootSeedHasMore(Boolean(payload?.hasMore));
          setRootSeedTotal(Number(payload?.total) || 0);
        } catch (error) {
          if (searchTrackerRef.current.roots !== requestId) {
            return;
          }
          setArabicRootMatches([]);
          setRootSeedHasMore(false);
          setRootSeedTotal(0);
          setArabicRootError(error.message || "Failed to load root words.");
        } finally {
          if (searchTrackerRef.current.roots === requestId) {
            setArabicRootLoading(false);
          }
        }
      };

      loadSeeds();
      return;
    }

    setArabicRootHasSearched(true);
    setArabicRootLoading(true);
    setArabicRootLoadingMore(false);
    setArabicRootError(null);
    setSelectedRootEntry(null);
    setSelectedRootWordForm("");
    setRootWordForms([]);
    setRootVerseItems([]);
    setRootVerseItemsError(null);
    setRootSeedPage(1);
    setRootSeedHasMore(false);
    setRootSeedTotal(0);

    const requestId = ++searchTrackerRef.current.roots;

    const debounceId = setTimeout(async () => {
      try {
        const payload = await searchRoots(trimmedQuery, 1, 20);
        if (searchTrackerRef.current.roots !== requestId) {
          return;
        }
        setArabicRootMatches(Array.isArray(payload?.roots) ? payload.roots : []);
        setRootSeedPage(Number(payload?.page) || 1);
        setRootSeedHasMore(Boolean(payload?.hasMore));
        setRootSeedTotal(Number(payload?.total) || 0);
      } catch (error) {
        if (searchTrackerRef.current.roots !== requestId) {
          return;
        }
        setArabicRootMatches([]);
        setRootSeedHasMore(false);
        setRootSeedTotal(0);
        setArabicRootError(error.message || "Failed to search root words.");
      } finally {
        if (searchTrackerRef.current.roots === requestId) {
          setArabicRootLoading(false);
        }
      }
    }, 450);

    return () => clearTimeout(debounceId);
  }, [arabicRootSearch, showRootResults]);

  // Sync Quran Subject language with translation language
  useEffect(() => {
    if (translationLanguage === 'E') {
      setQuranSubjectLanguage('E');
      setQuranSubjectCategory(1); // English only supports Translation Subjects
    } else if (translationLanguage === 'mal') {
      setQuranSubjectLanguage('M');
    }
  }, [translationLanguage]);

  useEffect(() => {
    if (quranSubjectLanguage === "E" && quranSubjectCategory !== 1) {
      setQuranSubjectCategory(1);
    }
  }, [quranSubjectLanguage, quranSubjectCategory]);

  useEffect(() => {
    if (!showSubjectResults) {
      return;
    }
    const requestId = ++searchTrackerRef.current.subjects;
    setQuranSubjectLoading(true);
    setQuranSubjectError(null);

    const loadSubjects = async () => {
      try {
        const payload = await fetchQuranSubjects({
          category: quranSubjectCategory,
          language: quranSubjectLanguage,
        });
        if (searchTrackerRef.current.subjects !== requestId) {
          return;
        }
        setQuranSubjectResults(payload || []);
        setSelectedSubject(null);
        setQuranSubjectItems([]);
        setQuranSubjectItemsError(null);
      } catch (error) {
        if (searchTrackerRef.current.subjects !== requestId) {
          return;
        }
        setQuranSubjectResults([]);
        setSelectedSubject(null);
        setQuranSubjectItems([]);
        setQuranSubjectItemsError(null);
        setQuranSubjectError(error.message || "Failed to load Quran subjects.");
      } finally {
        if (searchTrackerRef.current.subjects === requestId) {
          setQuranSubjectLoading(false);
        }
      }
    };

    loadSubjects();

    return () => {
      // no cleanup needed besides requestId guard
    };
  }, [quranSubjectCategory, quranSubjectLanguage, showSubjectResults]);

  useEffect(() => {
    if (!showGlossaryResults) {
      return;
    }
    const requestId = ++searchTrackerRef.current.glossary;
    setGlossaryLoading(true);
    setGlossaryError(null);

    const loadGlossary = async () => {
      try {
        const payload = await fetchGlossaryEntries();
        if (searchTrackerRef.current.glossary !== requestId) {
          return;
        }
        setGlossaryEntries(payload || []);
        setSelectedGlossaryEntry(null);
      } catch (error) {
        if (searchTrackerRef.current.glossary !== requestId) {
          return;
        }
        setGlossaryEntries([]);
        setSelectedGlossaryEntry(null);
        setGlossaryError(error.message || "Failed to load glossary entries.");
      } finally {
        if (searchTrackerRef.current.glossary === requestId) {
          setGlossaryLoading(false);
        }
      }
    };

    loadGlossary();
  }, [showGlossaryResults]);

  useEffect(() => {
    setSelectedGlossaryEntry(null);
    setGlossaryDisplayCount(20);
  }, [glossaryLanguage]);

  useEffect(() => {
    if (!showGlossaryResults || glossaryLoading || visibleGlossaryEntries.length === 0) {
      return;
    }

    const currentId = selectedGlossaryEntry?.id;
    const stillVisible = visibleGlossaryEntries.some((entry) => entry.id === currentId);
    if (!stillVisible) {
      setSelectedGlossaryEntry(visibleGlossaryEntries[0]);
    }
  }, [
    showGlossaryResults,
    glossaryLoading,
    visibleGlossaryEntries,
    selectedGlossaryEntry,
  ]);

  useEffect(() => {
    if (!showSubjectResults) {
      return;
    }
    if (quranSubjectLoading) {
      return;
    }
    if ((quranSubjectResults?.length || 0) > 0 || quranSubjectError) {
      scrollToAnchor(subjectResultsAnchorRef);
    }
  }, [showSubjectResults, quranSubjectLoading, quranSubjectResults, quranSubjectError]);

  useEffect(() => {
    if (!showSubjectResults || !selectedSubject) {
      return;
    }
    if (quranSubjectItemsLoading) {
      return;
    }
    if ((quranSubjectItems?.length || 0) > 0 || quranSubjectItemsError) {
      scrollToAnchor(subjectResultsAnchorRef);
    }
  }, [
    showSubjectResults,
    selectedSubject,
    quranSubjectItemsLoading,
    quranSubjectItems,
    quranSubjectItemsError,
  ]);

  useEffect(() => {
    if (!showGlossaryResults) {
      return;
    }
    if (glossaryLoading) {
      return;
    }
    if ((filteredGlossary?.length || 0) > 0 || glossaryError) {
      scrollToAnchor(glossaryResultsAnchorRef);
    }
  }, [showGlossaryResults, glossaryLoading, filteredGlossary, glossaryError]);

  useEffect(() => {
    if (!arabicRootHasSearched && !selectedRootEntry) {
      return;
    }
    if (arabicRootLoading || rootVerseItemsLoading) {
      return;
    }
    if (
      (arabicRootMatches?.length || 0) > 0 ||
      (rootVerseItems?.length || 0) > 0 ||
      arabicRootError ||
      rootVerseItemsError
    ) {
      scrollToAnchor(rootResultsAnchorRef);
    }
  }, [
    arabicRootHasSearched,
    selectedRootEntry,
    arabicRootLoading,
    arabicRootMatches,
    arabicRootError,
    rootVerseItemsLoading,
    rootVerseItems,
    rootVerseItemsError,
  ]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`relative w-full bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col animate-slideUp sm:animate-fadeIn overflow-hidden ${
          isSubjectDetailView || isRootDetailView || isWideSearchView
            ? "sm:w-[98vw] sm:max-w-[1500px] max-h-[90vh] sm:max-h-[92vh]"
            : "sm:w-[680px] max-h-[85vh] sm:max-h-[90vh]"
        }`}
      >

        {/* Drag Handle (Mobile) */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden cursor-grab active:cursor-grabbing" onClick={onClose}>
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Search</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 space-y-6">
          <div className="mt-6 space-y-5">
            {/* English Phrase Section - Only show when English is selected */}
            {translationLanguage === 'E' && (
              <div>
                <h3 className="text-sm text-gray-500 dark:text-white mb-4 italic">
                  English phrase
                </h3>

                {/* Radio buttons */}
                <div className="flex items-center space-x-8 mb-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="Translation"
                      checked={englishPhraseType === "Translation"}
                      onChange={(e) => setEnglishPhraseType(e.target.value)}
                      className="w-4 h-4 text-blue-600 dark:text-white dark:focus:ring-white focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-white">Translation</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="Interpretation"
                      checked={englishPhraseType === "Interpretation"}
                      onChange={(e) => setEnglishPhraseType(e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 dark:bg-white dark:text-white dark:focus:ring-white"
                    />
                    <span className="text-sm text-gray-700 dark:text-white">Interpretation</span>
                  </label>
                </div>

                {/* Search input */}
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={englishPhraseSearch}
                    onChange={(e) => setEnglishPhraseSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 dark:text-white dark:bg-black dark:placeholder-white border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  />
                </div>
                {renderResultSection({
                  id: "english",
                  languageLabel: `English ${englishPhraseType}`,
                  query: englishPhraseSearch,
                  isLoading: englishLoading,
                  error: englishError,
                  results: englishResults,
                  hasSearched: englishHasSearched,
                })}
              </div>
            )}

            {/* Malayalam Phrase Section - Only show when Malayalam is selected */}
            {translationLanguage === 'mal' && (
              <div>
                <h3 className="text-sm text-gray-500 dark:text-white mb-4 italic">
                  Malayalam phrase
                </h3>

                <div className="flex items-center space-x-8 mb-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="Translation"
                      checked={malayalamPhraseType === "Translation"}
                      onChange={(e) => setMalayalamPhraseType(e.target.value)}
                      className="w-4 h-4 text-blue-600 dark:text-white dark:focus:ring-white focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-white">Translation</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="Interpretation"
                      checked={malayalamPhraseType === "Interpretation"}
                      onChange={(e) => setMalayalamPhraseType(e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 dark:bg-white dark:text-white dark:focus:ring-white"
                    />
                    <span className="text-sm text-gray-700 dark:text-white">Interpretation</span>
                  </label>
                </div>

                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Search in Malayalam..."
                    value={malayalamPhraseSearch}
                    onChange={(e) => setMalayalamPhraseSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 dark:text-white dark:bg-black dark:placeholder-white border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                    dir="auto"
                  />
                </div>
                {renderResultSection({
                  id: "malayalam",
                  languageLabel: `Malayalam ${malayalamPhraseType}`,
                  query: malayalamPhraseSearch,
                  isLoading: malayalamLoading,
                  error: malayalamError,
                  results: malayalamResults,
                  hasSearched: malayalamHasSearched,
                  isMalayalam: true,
                })}
              </div>
            )}

            {/* Arabic Phrase Section */}
            <div>
              <h3 className="text-sm text-gray-500 mb-4 italic dark:text-white">
                Arabic phrase
              </h3>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-white text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search..."
                  value={arabicPhraseSearch}
                  onChange={(e) => setArabicPhraseSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm dark:bg-black dark:text-white dark:placeholder-white bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  dir="rtl"
                />
              </div>
              {renderResultSection({
                id: "arabic",
                languageLabel: "Arabic phrase",
                query: arabicPhraseSearch,
                isLoading: arabicLoading,
                error: arabicError,
                results: arabicResults,
                hasSearched: arabicHasSearched,
                isArabic: true,
              })}
            </div>

            <div>
              <h3 className="text-sm text-gray-500 mb-4 italic dark:text-white">
                Arabic root word
              </h3>

              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-white text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search root word..."
                  value={arabicRootSearch}
                  onChange={(e) => setArabicRootSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm dark:bg-black dark:text-white dark:placeholder-white bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  dir="rtl"
                  disabled={!showRootResults}
                />
              </div>

              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!showRootResults) {
                      setShowRootResults(true);
                    } else {
                      setShowRootResults(false);
                      setArabicRootSearch("");
                      setArabicRootMatches([]);
                      setArabicRootLoading(false);
                      setArabicRootLoadingMore(false);
                      setArabicRootError(null);
                      setArabicRootHasSearched(false);
                      setRootSeedPage(1);
                      setRootSeedHasMore(false);
                      setRootSeedTotal(0);
                      setSelectedRootEntry(null);
                      setSelectedRootWordForm("");
                      setRootWordForms([]);
                      setRootVerseItems([]);
                      setRootVerseItemsError(null);
                      setIsWideSearchView(false);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  {showRootResults ? "Hide roots" : "Load roots"}
                </button>
              </div>

              {showRootResults && (arabicRootHasSearched || selectedRootEntry || arabicRootMatches.length > 0 || arabicRootLoading || arabicRootError) && (
                <div
                  ref={rootResultsAnchorRef}
                  className="mt-3 grid grid-cols-1 lg:grid-cols-[minmax(320px,38%)_minmax(0,62%)] gap-3 sm:gap-4"
                >
                  <div className="space-y-3">
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-black/20">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300 mb-2">
                        Root Matches
                      </p>
                      {!arabicRootLoading && !arabicRootError && arabicRootMatches.length > 0 && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                          Showing {arabicRootMatches.length} of {rootSeedTotal || arabicRootMatches.length}
                        </p>
                      )}
                      <div className="space-y-2 max-h-[24vh] overflow-y-auto pr-1">
                        {arabicRootLoading && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
                            <span className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-transparent dark:border-gray-500 animate-spin" />
                            <span>Searching roots...</span>
                          </div>
                        )}
                        {arabicRootError && (
                          <p className="text-xs text-red-500 dark:text-red-400">{arabicRootError}</p>
                        )}
                        {!arabicRootLoading && !arabicRootError && arabicRootMatches.length === 0 && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">No root matches found</p>
                        )}
                        {arabicRootMatches.map((rootEntry) => {
                          const isSelected =
                            Number(rootEntry?.rootGroupId) === Number(selectedRootEntry?.rootGroupId);
                          return (
                            <button
                              key={`root-${rootEntry.rootGroupId}-${rootEntry.root}`}
                              type="button"
                              onClick={() => handleRootSelection(rootEntry)}
                              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                isSelected
                                  ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                                  : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/30 hover:bg-gray-100 dark:hover:bg-gray-800"
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                                <span>Group #{rootEntry.rootGroupId}</span>
                                <span>{rootEntry.verseCount || 0} verses</span>
                              </div>
                              <p className="text-lg text-gray-800 dark:text-gray-100" dir="rtl">
                                {rootEntry.root}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                      {!arabicRootHasSearched && rootSeedHasMore && !arabicRootError && (
                        <button
                          type="button"
                          onClick={handleLoadMoreRootSeeds}
                          disabled={arabicRootLoadingMore}
                          className="mt-3 w-full px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-60"
                        >
                          {arabicRootLoadingMore ? "Loading more roots..." : "Load more roots"}
                        </button>
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-black/20">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300 mb-2">
                        Word Forms
                      </p>
                      {!selectedRootEntry && !rootVerseItemsLoading ? (
                        <div className="min-h-[90px] rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center px-3 py-4 text-xs text-gray-500 dark:text-gray-400">
                          Select a root to view forms.
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-[18vh] overflow-y-auto pr-1">
                          {selectedRootEntry && (
                            <button
                              type="button"
                              onClick={() => setSelectedRootWordForm("")}
                              className={`w-full text-left text-xs px-2 py-1 rounded-md border transition-colors ${
                                selectedRootWordForm
                                  ? "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                  : "border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30"
                              }`}
                            >
                              All related verses
                            </button>
                          )}
                          {rootWordForms.length === 0 && !rootVerseItemsLoading ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500">No forms found</p>
                          ) : (
                            rootWordForms.map((form, index) => (
                              <button
                                key={`root-form-${index}-${form}`}
                                type="button"
                                onClick={() => setSelectedRootWordForm(form || "")}
                                className={`w-full text-left text-sm px-2 py-1 rounded-md border transition-colors ${
                                  normalizeArabicWord(form) === normalizedSelectedRootForm
                                    ? "border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30"
                                    : "border-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                }`}
                                dir="rtl"
                              >
                                {form}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-black/20">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300 mb-2">
                      {selectedRootEntry
                        ? selectedRootWordForm
                          ? `Verses • ${selectedRootWordForm}`
                          : `Verses • ${selectedRootEntry.root || "Selected Root"}`
                        : "Verses"}
                    </p>

                    {!selectedRootEntry && !rootVerseItemsLoading ? (
                      <div className="min-h-[140px] rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center px-4 py-8 text-sm text-gray-500 dark:text-gray-400">
                        Select a root from the left panel to view verses.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[48vh] sm:max-h-[56vh] overflow-y-auto pr-1">
                        {rootVerseItemsLoading && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
                            <span className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-transparent dark:border-gray-500 animate-spin" />
                            <span>Loading root verses...</span>
                          </div>
                        )}
                        {rootVerseItemsError && (
                          <p className="text-xs text-red-500 dark:text-red-400">{rootVerseItemsError}</p>
                        )}
                        {!rootVerseItemsLoading && !rootVerseItemsError && filteredRootVerseItems.length === 0 && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">No verses found</p>
                        )}
                        {filteredRootVerseItems.map((item, index) => (
                          <button
                            key={`root-verse-${item?.contiayano || `${item?.surah}-${item?.ayah}-${index}`}`}
                            type="button"
                            onClick={() => {
                              const surah = normalizePositiveInteger(item?.surah);
                              const ayah = normalizePositiveInteger(item?.ayah);
                              if (!surah || !ayah) {
                                return;
                              }
                              handleResultNavigation({
                                SuraID: surah,
                                AyaID: ayah,
                                AyaFrom: ayah,
                                AyaHText: item?.arabicText,
                                TranslationText: item?.translationText,
                                contiayano: item?.contiayano,
                              });
                            }}
                            className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/30 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                              <span>Surah {item?.surah}:{item?.ayah}</span>
                              <span>{item?.word || selectedRootEntry?.root || ""}</span>
                            </div>
                            <p className="text-base text-gray-800 dark:text-gray-100 leading-relaxed" dir="rtl">
                              {item?.arabicText || "Text not available"}
                            </p>
                            {item?.translationText && (
                              <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                {item.translationText}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quran Subject Section - Only show when English or Malayalam is selected */}
            {(translationLanguage === 'E' || translationLanguage === 'mal') && (
              <div>
                <h3 className="text-sm text-gray-500 dark:text-white mb-4 italic">
                  Quran Subject
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    {/* Language dropdown - locked to match translation language */}
                    <select
                      value={quranSubjectLanguage}
                      onChange={(e) => setQuranSubjectLanguage(e.target.value)}
                      disabled={true}
                      className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-white opacity-60 cursor-not-allowed"
                    >
                      {translationLanguage === 'E' && <option value="E">English</option>}
                      {translationLanguage === 'mal' && <option value="M">Malayalam</option>}
                    </select>
                  <select
                    value={quranSubjectCategory}
                    onChange={(e) => setQuranSubjectCategory(Number(e.target.value))}
                    disabled={quranSubjectLanguage === "E"}
                    className={`px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${quranSubjectLanguage === "E" ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                  >
                    <option value={1}>Translation Subjects</option>
                    <option value={2}>Thafheem Subjects</option>
                  </select>
                </div>
                {quranSubjectLanguage === "E" && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Thafheem subjects currently available only in Malayalam.
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Filter subjects..."
                      value={quranSubjectSearch}
                      onChange={(e) => {
                        setQuranSubjectSearch(e.target.value);
                        setSubjectDisplayCount(20);
                      }}
                      className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 dark:bg-black dark:text-white dark:placeholder-white border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                      disabled={!showSubjectResults}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!showSubjectResults) {
                        setShowSubjectResults(true);
                      } else {
                        setShowSubjectResults(false);
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    {showSubjectResults ? "Hide subjects" : "Load subjects"}
                  </button>
                </div>
              </div>
              {showSubjectResults && (
                <div ref={subjectResultsAnchorRef} className="mt-3 grid grid-cols-1 lg:grid-cols-[minmax(320px,38%)_minmax(0,62%)] gap-3 sm:gap-4">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-black/20">
                    {renderResultSection({
                      id: "subjects",
                      languageLabel: `Subjects • ${quranSubjectLanguage === "M" ? "Malayalam" : "English"
                        } ${quranSubjectCategory === 2 ? "Thafheem" : "Translation"}`,
                      query: quranSubjectSearch,
                      isLoading: quranSubjectLoading,
                      error: quranSubjectError,
                      results: filteredSubjects.slice(0, subjectDisplayCount),
                      hasSearched: true,
                      isMalayalam: quranSubjectLanguage === "M",
                      isSubject: true,
                      onResultClick: handleSubjectSelection,
                      selectedSubjectId: selectedSubject?.ID,
                      listMaxHeightClass: "max-h-[48vh] sm:max-h-[56vh]",
                    })}
                  </div>

                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-black/20">
                    <p className={`text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300 mb-2 ${quranSubjectLanguage === "M" ? 'font-malayalam' : ''}`}>
                      {selectedSubject
                        ? <><span>Search Results • </span><span className={quranSubjectLanguage === "M" ? "font-malayalam" : ""}>{selectedSubject.SubjText}</span></>
                        : "Search Results"}
                    </p>
                    {!selectedSubject && !quranSubjectItemsLoading ? (
                      <div className="min-h-[140px] rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center px-4 py-8 text-sm text-gray-500 dark:text-gray-400">
                        Select a subject from the left panel to view detailed results.
                      </div>
                    ) : (
                      renderResultSection({
                        id: "subject-items",
                        languageLabel: quranSubjectCategory === 2 ? "Tafseer Results" : "Ayah Results",
                        query: quranSubjectSearch,
                        isLoading: quranSubjectItemsLoading,
                        error: quranSubjectItemsError,
                        results: quranSubjectItems,
                        hasSearched: Boolean(selectedSubject),
                        isMalayalam: quranSubjectLanguage === "M",
                        isArabic: quranSubjectCategory === 1,
                        listMaxHeightClass: "max-h-[48vh] sm:max-h-[56vh]",
                      })
                    )}
                  </div>
                </div>
              )}
              {showSubjectResults &&
                !quranSubjectLoading &&
                filteredSubjects.length > subjectDisplayCount && (
                  <button
                    type="button"
                    onClick={() =>
                      {
                        setIsWideSearchView(true);
                        setSubjectDisplayCount((prev) => Math.min(prev + 20, filteredSubjects.length));
                      }
                    }
                    className="mt-3 inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    Load more subjects
                  </button>
                )}
              </div>
            )}

            {/* Glossary Search Section (English only) */}
            {translationLanguage === 'E' && (
            <div>
              <h3 className="text-sm text-gray-500 dark:text-white mb-4 italic">
                Glossary Search
              </h3>

              {/* Radio buttons - Show both English and Arabic only when English or Malayalam is selected, otherwise only Arabic */}
              <div className="flex items-center space-x-8 mb-4">
                {(translationLanguage === 'E' || translationLanguage === 'mal') && (
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="English"
                      checked={glossaryLanguage === "English"}
                      onChange={(e) => setGlossaryLanguage(e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-white">English</span>
                  </label>
                )}
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="Arabic"
                    checked={glossaryLanguage === "Arabic"}
                    onChange={(e) => setGlossaryLanguage(e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-white">Arabic</span>
                </label>
              </div>

              {/* Search input */}
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Search glossary..."
                    value={glossarySearch}
                    onChange={(e) => {
                      setGlossarySearch(e.target.value);
                      setGlossaryDisplayCount(20);
                    }}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 dark:bg-black dark:text-white dark:placeholder-white border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                    dir={glossaryLanguage === "Arabic" ? "rtl" : "ltr"}
                    disabled={!showGlossaryResults}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!showGlossaryResults) {
                      setShowGlossaryResults(true);
                    } else {
                      setShowGlossaryResults(false);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white hover.bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  {showGlossaryResults ? "Hide glossary" : "Load glossary"}
                </button>
              </div>
              {showGlossaryResults && (
                <div ref={glossaryResultsAnchorRef} className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                      Glossary ({glossaryLanguage})
                    </p>
                    {!glossaryLoading && filteredGlossary.length > 0 && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {filteredGlossary.length} entries
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,36%)_minmax(0,64%)] gap-3 sm:gap-4">
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-black/20">
                      <div className="space-y-2 max-h-[42vh] sm:max-h-[48vh] overflow-y-auto pr-1">
                        {glossaryLoading && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
                            <span className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-transparent dark:border-gray-500 animate-spin" />
                            <span>Loading glossary...</span>
                          </div>
                        )}
                        {glossaryError && (
                          <p className="text-xs text-red-500 dark:text-red-400">{glossaryError}</p>
                        )}
                        {!glossaryLoading && !glossaryError && filteredGlossary.length === 0 && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">No entries found</p>
                        )}
                        {visibleGlossaryEntries.map((entry) => {
                          const isSelected = selectedGlossaryEntry?.id === entry.id;
                          const verseRef = extractVerseReference(entry);
                          return (
                            <button
                              key={`glossary-${entry.id}-${entry.engtitleglossary}`}
                              type="button"
                              onClick={() => setSelectedGlossaryEntry(entry)}
                              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                isSelected
                                  ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                                  : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/30 hover:bg-gray-100 dark:hover:bg-gray-800"
                              }`}
                            >
                              <p
                                className="text-sm text-gray-800 dark:text-gray-100 font-medium"
                                dir={glossaryLanguage === "Arabic" ? "rtl" : "ltr"}
                              >
                                {getGlossaryPrimaryTitle(entry)}
                              </p>
                              {verseRef && (
                                <p className="mt-1 text-[11px] text-blue-600 dark:text-blue-400">
                                  Surah {verseRef.surah}, Ayah {verseRef.ayah}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-black/20">
                      {!selectedGlossaryEntry && !glossaryLoading ? (
                        <div className="min-h-[140px] rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center px-4 py-8 text-sm text-gray-500 dark:text-gray-400">
                          Select a glossary entry to view details.
                        </div>
                      ) : selectedGlossaryEntry ? (
                        <div className="space-y-3 max-h-[42vh] sm:max-h-[48vh] overflow-y-auto pr-1">
                          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                            <span>{selectedGlossaryEntry.engtitleglossary}</span>
                            <span dir="rtl" className="text-sm">
                              {selectedGlossaryEntry.arrtitleglossary}
                            </span>
                          </div>
                          <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed">
                            {selectedGlossaryEntry.glossarytext}
                          </p>
                          {extractVerseReference(selectedGlossaryEntry) && (
                            <button
                              type="button"
                              onClick={() => handleGlossaryVerseNavigation(selectedGlossaryEntry)}
                              className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                            >
                              Go to referenced verse
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {!glossaryLoading && filteredGlossary.length > glossaryDisplayCount && (
                    <button
                      type="button"
                      onClick={() =>
                        {
                          setIsWideSearchView(true);
                          setGlossaryDisplayCount((prev) =>
                            Math.min(prev + 20, filteredGlossary.length)
                          );
                        }
                      }
                      className="mt-3 inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      Load more glossary entries
                    </button>
                  )}
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchConsole;
