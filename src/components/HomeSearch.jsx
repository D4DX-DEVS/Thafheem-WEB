import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import logoWhite from "../assets/logo-white.png";
import banner from "../assets/banner.png";
import { Play } from "lucide-react";
import { searchQuran, fetchPopularChapters, searchWordsPaginated, searchArabicPhrases, searchSurahsByName, fetchSurahs, searchSubjects, getSubjectResults, searchRoots, fetchRootWordVerses } from "../api/apifunction";
import { useAnalytics } from "../context/AnalyticsContext";
import {
  getLastReading,
  LAST_READING_STORAGE_KEY,
} from "../services/readingProgressService";

// Icon components (keeping your existing ones)
const SearchIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const MicIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const TrendingUpIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const XIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronRightIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const ChevronDownIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const BookmarkIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
);

const ListIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

// Normalize free-form verse queries such as `4 : 20`
const normalizeSearchQuery = (query = "") =>
  query.replace(/\s*:\s*/g, ":").replace(/\s+/g, " ").trim();

// Return `{ surah, verse }` when the normalized query matches `surah:verse`
const extractVerseReference = (query = "") => {
  const match = /^(\d{1,3}):(\d{1,3})$/.exec(query);
  if (!match) {
    return null;
  }

  const surah = match[1].replace(/^0+/, "") || "0";
  const verse = match[2].replace(/^0+/, "") || "0";

  return { surah, verse };
};

// Map API language name → { className, fontFamily, dir }
const LANG_STYLE = {
  malayalam: { className: 'font-malayalam', fontFamily: "'Noto Sans Malayalam', sans-serif" },
  tamil:     { className: 'font-tamil',     fontFamily: "'Noto Sans Tamil', serif" },
  hindi:     { className: 'font-hindi',     fontFamily: "'NotoSansDevanagari', serif" },
  bangla:    { className: 'font-bengali',   fontFamily: "'Noto Sans Bengali', serif" },
  urdu:      { className: 'font-urdu-nastaliq', fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif", dir: 'rtl' },
  arabic:    { className: 'font-arabic',    fontFamily: 'Amiri, serif', dir: 'rtl' },
};
const langFontClass  = (lang) => LANG_STYLE[lang]?.className  || 'font-poppins';
const langFontStyle  = (lang) => LANG_STYLE[lang]?.fontFamily ? { fontFamily: LANG_STYLE[lang].fontFamily } : {};
const langIsRtl      = (lang) => !!LANG_STYLE[lang]?.dir;

// Strip HTML tags and decode basic entities for plain-text display
const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim();
};

// Build a regex pattern for the query. For Arabic queries, ignore harakat /
// quranic marks / tatweel and treat alef variants as equivalent, so a
// fully-voweled query still highlights inside Uthmani or plain script text.
const AR_MARKS = '[\\u064B-\\u065F\\u0670\\u06D6-\\u06ED\\u0640]';
const buildQueryPattern = (query) => {
  if (!/[؀-ۿ]/.test(query)) {
    return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  // Drop alefs from the query and allow optional alefs between letters instead:
  // Uthmani script writes dagger alef where plain script has a full alef.
  const stripped = query
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[\u0622\u0623\u0625\u0627\u0671]/g, '');
  const gap = `(?:${AR_MARKS}|[\\u0622\\u0623\\u0625\\u0627\\u0671])*`;
  return [...stripped]
    .map((ch) => {
      if (ch === 'ي' || ch === 'ى') return '[\\u064A\\u0649]';
      if (/\s/.test(ch)) return '\\s*';
      return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join(gap);
};

// Highlight matching query text inside a string — returns array of React nodes
const highlightText = (text, query) => {
  if (!text || !query) return text;
  const escaped = buildQueryPattern(query);
  let parts;
  try {
    parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  } catch {
    return text;
  }
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    new RegExp(escaped, 'i').test(part)
      ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-600 rounded px-0.5 not-italic">{part}</mark>
      : part
  );
};

import { useTheme } from "../context/ThemeContext";

const HomepageSearch = () => {
  const { theme, setViewType, translationLanguage } = useTheme();
  const analytics = useAnalytics();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [popularChapters, setPopularChapters] = useState([]);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const [popularError, setPopularError] = useState(null);
  const [lastReading, setLastReading] = useState(null);
  const [surahsCache, setSurahsCache] = useState(null);
  const [localizedSurahs, setLocalizedSurahs] = useState(null);
  const [localizedSurahsLang, setLocalizedSurahsLang] = useState(null);
  const [expandedCards, setExpandedCards] = useState(new Set());
  // Pagination state
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const currentSearchQuery = useRef("");
  // Subject / root expansion state: { "quran-{id}": { loading, results, hasMore, page }, ... }
  const [expandedSubjectVerses, setExpandedSubjectVerses] = useState({});

  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const wasManuallyClosed = useRef(false); // Track if user manually closed the popup
  const debounceRef = useRef(null);

  // Preload popular data and surahs when component mounts or language changes
  useEffect(() => {
    fetchPopularData(translationLanguage);
    // Preload surahs for name matching
    fetchSurahs().then(surahs => {
      setSurahsCache(surahs);
    }).catch(err => {
      console.warn('Failed to preload surahs:', err);
    });
  }, [translationLanguage]);

  // Fetch surah names in the active language for the tooltip
  useEffect(() => {
    if (localizedSurahsLang === translationLanguage && localizedSurahs) return;
    fetchSurahs({ language: translationLanguage }).then(surahs => {
      setLocalizedSurahs(surahs);
      setLocalizedSurahsLang(translationLanguage);
    }).catch(() => {});
  }, [translationLanguage]);

  // Lock body scroll when search results open
  useEffect(() => {
    if (showSearchResults) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px';
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [showSearchResults]);

  useEffect(() => {
    setLastReading(getLastReading());

    const handleStorageUpdate = (event) => {
      if (event.key && event.key !== LAST_READING_STORAGE_KEY) {
        return;
      }
      setLastReading(getLastReading());
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageUpdate);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageUpdate);
      }
    };
  }, []);

  // Mouse/Touch event handlers for drag scrolling
  const handleMouseDown = (e) => {
    isDragging.current = true;
    hasDragged.current = false;
    startX.current = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollLeft.current = scrollContainerRef.current.scrollLeft;
    scrollContainerRef.current.style.cursor = 'grabbing';
    scrollContainerRef.current.style.userSelect = 'none';
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX.current) * 2; // Multiply by 2 for faster scrolling
    if (Math.abs(walk) > 6) {
      hasDragged.current = true;
    }
    scrollContainerRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
      scrollContainerRef.current.style.userSelect = '';
    }
  };

  // Touch events for mobile
  const handleTouchStart = (e) => {
    isDragging.current = true;
    hasDragged.current = false;
    startX.current = e.touches[0].pageX - scrollContainerRef.current.offsetLeft;
    scrollLeft.current = scrollContainerRef.current.scrollLeft;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const x = e.touches[0].pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX.current) * 2;
    if (Math.abs(walk) > 6) {
      hasDragged.current = true;
    }
    scrollContainerRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  // Fetch popular chapters data
  const fetchPopularData = async (lang = 'en') => {
    setIsLoadingPopular(true);
    setPopularError(null);
    
    try {
      const popularData = await fetchPopularChapters(lang);
      setPopularChapters(popularData);
    } catch (error) {
      console.error('Error fetching popular data:', error);
      setPopularError('Failed to load popular content');
      // Set fallback data on error
      setPopularChapters([
        { id: 67, name: "Al-Mulk", verses: "30 verses", type: "Makki" },
        { id: 2, name: "Ayatul Kursi", verses: "Verse 255", type: "Madani", verseNumber: 255, verseKey: "2:255" },
        { id: 1, name: "Al-Fatiha", verses: "7 verses", type: "Makki" },
        { id: 18, name: "Al-Kahf", verses: "110 verses", type: "Makki" },
        { id: 36, name: "Ya-Sin", verses: "83 verses", type: "Makki" },
        { id: 55, name: "Ar-Rahman", verses: "78 verses", type: "Makki" },
        { id: 112, name: "Al-Ikhlas", verses: "4 verses", type: "Makki" },
        { id: 114, name: "An-Nas", verses: "6 verses", type: "Makki" },
      ]);
    } finally {
      setIsLoadingPopular(false);
    }
  };

  // Helper function to check if query matches a surah name or number
  const findMatchingSurah = async (query) => {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Check if it's a pure number (surah number)
    const surahNumber = /^\d+$/.test(normalizedQuery);
    if (surahNumber) {
      const num = parseInt(normalizedQuery, 10);
      if (num >= 1 && num <= 114) {
        return { number: num, name: `Surah ${num}` };
      }
    }

    // Try to get surahs from cache or fetch them
    let surahs = surahsCache;
    if (!surahs) {
      try {
        surahs = await fetchSurahs();
        setSurahsCache(surahs);
      } catch (err) {
        console.warn('Failed to fetch surahs for name matching:', err);
        return null;
      }
    }

    if (!surahs || surahs.length === 0) {
      return null;
    }

    // Search for exact match first (by name or number)
    // Note: surah.name = English name, surah.arabic = Arabic name
    // This works regardless of the selected translation language
    const exactMatch = surahs.find(surah => 
      surah.name?.toLowerCase() === normalizedQuery ||
      surah.number?.toString() === normalizedQuery ||
      surah.arabic?.toLowerCase() === normalizedQuery
    );

    if (exactMatch) {
      return exactMatch;
    }

    // Search for partial match (starts with)
    const startsWithMatch = surahs.find(surah =>
      surah.name?.toLowerCase().startsWith(normalizedQuery) ||
      surah.arabic?.toLowerCase().startsWith(normalizedQuery)
    );

    if (startsWithMatch) {
      return startsWithMatch;
    }

    return null;
  };

  const performSearch = async (query, page = 1) => {
    const sanitizedQuery = normalizeSearchQuery(query);

    if (!sanitizedQuery) {
      setShowSearchResults(false);
      setSearchResults([]);
      setSearchError(null);
      setSearchHasMore(false);
      return;
    }

    // Skip word search for verse references - they should navigate directly
    const verseReference = extractVerseReference(sanitizedQuery);
    if (verseReference) {
      // This shouldn't happen if handleSearchSubmit works correctly, but handle it anyway
      return;
    }

    wasManuallyClosed.current = false;
    if (page === 1) {
      setIsSearching(true);
      currentSearchQuery.current = sanitizedQuery;
    } else {
      setIsLoadingMore(true);
    }
    setSearchError(null);
    setShowSearchResults(true);

    try {
      // Map translationLanguage code to API language name
      const languageMap = {
        'E': 'english',
        'mal': 'malayalam',
        'ta': 'tamil',
        'bn': 'bangla',
        'ur': 'urdu',
        'hi': 'hindi'
      };
      
      const selectedLang = languageMap[translationLanguage] || 'english';
      const subjectLang  = (selectedLang === 'malayalam') ? 'mal' : 'eng';
      const hasArabic    = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(sanitizedQuery);

      // Search in both selected language AND Arabic (always include Arabic search)
      // Run searches in parallel for better performance
      const searchPromises = [
        searchWordsPaginated(sanitizedQuery, selectedLang, page, 10).catch((err) => {
          console.warn(`Word search failed for ${selectedLang}:`, err);
          return { language: selectedLang, results: [], hasMore: false };
        }),
        page === 1
          ? searchArabicPhrases(sanitizedQuery, 15).catch((err) => {
              console.warn('Arabic phrase search failed:', err);
              return [];
            })
          : Promise.resolve([]),
        // Subject + root searches only on first page
        page === 1
          ? searchSubjects({ query: sanitizedQuery, lang: subjectLang, type: 'quran', limit: 5 }).catch(() => ({ subjects: [] }))
          : Promise.resolve({ subjects: [] }),
        page === 1
          ? searchSubjects({ query: sanitizedQuery, lang: subjectLang, type: 'tafseer', limit: 5 }).catch(() => ({ subjects: [] }))
          : Promise.resolve({ subjects: [] }),
        page === 1 && hasArabic
          ? searchRoots(sanitizedQuery, 1, 5).catch(() => ({ roots: [] }))
          : Promise.resolve({ roots: [] }),
      ];

      const [wordSearchResult, arabicResults, quranSubjectsRes, tafseerSubjectsRes, rootsRes] = await Promise.all(searchPromises);
      
      // Format selected language word search results
      const formattedWordResults = (wordSearchResult.results || []).map(item => {
        // Ensure surah and ayah are properly parsed as integers
        const surah = typeof item.surah === 'number' ? item.surah : parseInt(String(item.surah), 10);
        const ayah = typeof item.ayah === 'number' ? item.ayah : parseInt(String(item.ayah), 10);
        
        // Validate values
        if (!surah || !ayah || isNaN(surah) || isNaN(ayah)) {
          console.warn('Invalid surah/ayah in result:', { item, surah, ayah, language: wordSearchResult.language });
          return null;
        }
        
        // Include sourceType in subText for Malayalam (translation/interpretation)
        const sourceType = item.sourceType || '';
        const sourceLabel = sourceType ? ` • ${sourceType}` : '';
        
        return {
          type: 'word_search',
          language: wordSearchResult.language,
          surah: surah,
          ayah: ayah,
          displayText: stripHtml(item.matchedText || ''),
          translationText: stripHtml(item.translationText || ''),
          subText: `Surah ${surah}:${ayah}${sourceLabel}`,
          arabicWord: item.arabicWord || '',
          matchedText: stripHtml(item.matchedText || ''),
          sourceType: sourceType || undefined
        };
      }).filter(result => result !== null && result.surah > 0 && result.ayah > 0); // Filter out invalid results

      // Format Arabic phrase search results - handle multiple possible response formats
      let formattedArabicResults = [];
      if (Array.isArray(arabicResults) && arabicResults.length > 0) {
        formattedArabicResults = arabicResults.map(result => {
          // Handle different possible field names from Arabic phrase search API
          const surah = result.SuraID || result.suraid || result.SuraId || result.surah || result.Sura;
          const ayah = result.AyaID || result.ayaid || result.AyaId || result.ayah || result.Aya;
          const text = result.AyaHText || result.text_uthmani || result.Text || result.text || result.AyaText || '';
          
          return {
            type: 'word_search',
            language: 'arabic',
            surah: parseInt(surah) || 0,
            ayah: parseInt(ayah) || 0,
            displayText: text,
            subText: `Surah ${surah}:${ayah}`,
            matchedText: sanitizedQuery
          };
        }).filter(result => result.surah > 0 && result.ayah > 0); // Filter out invalid results
      }

      // Format Quran subject results
      const formattedQuranSubjects = page === 1
        ? (quranSubjectsRes.subjects || []).map(s => ({
            type: 'subject_quran',
            id:      s.id,
            subject: s.subject || '',
            lang:    subjectLang,
          }))
        : [];

      // Format Tafseer subject results
      const formattedTafseerSubjects = page === 1
        ? (tafseerSubjectsRes.subjects || []).map(s => ({
            type: 'subject_tafseer',
            id:      s.id,
            subject: s.subject || '',
          }))
        : [];

      // Format Root results (Arabic only)
      const formattedRoots = page === 1
        ? (rootsRes.roots || []).map(r => ({
            type:        'root_word',
            rootGroupId: r.rootGroupId,
            root:        r.root || '',
            verseCount:  r.verseCount || 0,
          }))
        : [];

      // Also include surah name search results
      const surahResults = [];
      try {
        const surahs = await searchSurahsByName(sanitizedQuery);
        if (surahs && surahs.length > 0) {
          surahResults.push(...surahs.map(surah => ({
            type: 'surah',
            data: surah,
            displayText: `${surah.number}. ${surah.name}`,
            subText: `${surah.ayahs} verses • ${surah.type}`,
            arabicText: surah.arabic
          })));
        }
      } catch (error) {
        // Silently fail surah search
      }

      // Combine all results: preserve existing verse_reference results, then surahs, then word results
      setSearchResults(currentResults => {
        if (page === 1) {
          const existingVerseRefs = (currentResults || []).filter(r => r.type === 'verse_reference');
          return [
            ...existingVerseRefs,
            ...surahResults,
            ...formattedQuranSubjects,
            ...formattedTafseerSubjects,
            ...formattedRoots,
            ...formattedWordResults,
            ...formattedArabicResults,
          ];
        }
        // Append on load-more (skip surah/arabic results on subsequent pages)
        return [...(currentResults || []), ...formattedWordResults];
      });

      // Reset expanded subject verses on new search
      if (page === 1) setExpandedSubjectVerses({});

      // Update pagination state
      setSearchHasMore(wordSearchResult.hasMore || false);
      setSearchPage(page);
    } catch (error) {
      setSearchError('Failed to search. Please try again.');
      if (page === 1) setSearchResults([]);
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  };

  // Handle search input changes — live verse-ref detection + debounced word search
  const handleSearchChange = (e) => {
    const rawQuery = e.target.value;
    setSearchQuery(rawQuery);
    wasManuallyClosed.current = false;

    clearTimeout(debounceRef.current);

    // Only clear results when input is emptied
    if (!rawQuery.trim()) {
      setShowSearchResults(false);
      setSearchResults([]);
      setSearchError(null);
    }
  };

  // ── Subject / Root expansion handlers ──────────────────────────────────────

  const handleSubjectExpand = async (type, id, lang) => {
    const key = `${type}-${id}`;
    setExpandedSubjectVerses(prev => {
      const existing = prev[key];
      // Toggle collapse if already loaded
      if (existing && !existing.loading) {
        return { ...prev, [key]: { ...existing, collapsed: !existing.collapsed } };
      }
      // Mark loading
      return { ...prev, [key]: { loading: true, results: [], hasMore: false, page: 1, collapsed: false } };
    });

    // Already loaded — just toggled, no fetch needed
    const existing = expandedSubjectVerses[key];
    if (existing && existing.results?.length > 0) return;

    try {
      const data = await getSubjectResults({ subjectId: id, lang, type, page: 1, limit: 8 });
      setExpandedSubjectVerses(prev => ({
        ...prev,
        [key]: { loading: false, results: data.results || [], hasMore: data.hasMore || false, page: 1, collapsed: false }
      }));
    } catch {
      setExpandedSubjectVerses(prev => ({
        ...prev,
        [key]: { loading: false, results: [], hasMore: false, page: 1, collapsed: false }
      }));
    }
  };

  const handleSubjectLoadMore = async (type, id, lang) => {
    const key = `${type}-${id}`;
    const existing = expandedSubjectVerses[key];
    if (!existing || existing.loadingMore) return;
    const nextPage = (existing.page || 1) + 1;
    setExpandedSubjectVerses(prev => ({ ...prev, [key]: { ...prev[key], loadingMore: true } }));
    try {
      const data = await getSubjectResults({ subjectId: id, lang, type, page: nextPage, limit: 8 });
      setExpandedSubjectVerses(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          loadingMore: false,
          page: nextPage,
          results: [...(prev[key].results || []), ...(data.results || [])],
          hasMore: data.hasMore || false,
        }
      }));
    } catch {
      setExpandedSubjectVerses(prev => ({ ...prev, [key]: { ...prev[key], loadingMore: false } }));
    }
  };

  const handleRootExpand = async (rootGroupId) => {
    const key = `root-${rootGroupId}`;
    setExpandedSubjectVerses(prev => {
      const existing = prev[key];
      if (existing && !existing.loading) {
        return { ...prev, [key]: { ...existing, collapsed: !existing.collapsed } };
      }
      return { ...prev, [key]: { loading: true, results: [], hasMore: false, page: 1, collapsed: false } };
    });

    const existing = expandedSubjectVerses[key];
    if (existing && existing.results?.length > 0) return;

    try {
      const data = await fetchRootWordVerses(rootGroupId, 1, 8);
      setExpandedSubjectVerses(prev => ({
        ...prev,
        [key]: { loading: false, results: data.results || [], hasMore: data.hasMore || false, page: 1, collapsed: false }
      }));
    } catch {
      setExpandedSubjectVerses(prev => ({
        ...prev,
        [key]: { loading: false, results: [], hasMore: false, page: 1, collapsed: false }
      }));
    }
  };

  const navigateToVerse = (surah, ayah, event) => {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    const s = parseInt(surah, 10);
    const a = parseInt(ayah,  10);
    if (!s || !a || s < 1 || s > 114 || a < 1) return;
    const url = `/surah/${s}#verse-${a}`;
    if (event?.ctrlKey || event?.metaKey) { window.open(url, '_blank', 'noopener,noreferrer'); return; }
    sessionStorage.setItem('scrollToVerse', a.toString());
    sessionStorage.setItem('navigationState', JSON.stringify({ viewType: 'Ayah Wise', highlightVerse: `${s}:${a}`, scrollToVerse: a }));
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults([]);
    navigate(url);
  };

  // Handle search result click with modifier key support
  const handleSearchResultClick = (result, event) => {
    // Prevent default to avoid any unwanted behavior
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Mark that we're navigating so blur handler doesn't interfere
    wasManuallyClosed.current = true;
    
    const isModifierPressed = event?.ctrlKey || event?.metaKey;
    
    if (result.type === 'word_search') {
      // Navigate to specific surah and ayah for word search results
      // Ensure we get the values correctly - handle both number and string
      const surah = typeof result.surah === 'number' ? result.surah : parseInt(String(result.surah || ''), 10);
      const ayah = typeof result.ayah === 'number' ? result.ayah : parseInt(String(result.ayah || ''), 10);
      
      if (!surah || !ayah || isNaN(surah) || isNaN(ayah) || surah < 1 || surah > 114 || ayah < 1) {
        console.warn('Invalid surah or ayah:', { surah, ayah, result });
        return;
      }
      
      const targetUrl = `/surah/${surah}#verse-${ayah}`;
      
      if (isModifierPressed) {
        event?.preventDefault();
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      
      // Store state in sessionStorage for the surah page to read (backup)
      sessionStorage.setItem('scrollToVerse', ayah.toString());
      sessionStorage.setItem('navigationState', JSON.stringify({
        viewType: 'Ayah Wise',
        highlightVerse: `${surah}:${ayah}`,
        scrollToVerse: ayah
      }));

      // Close the popup before navigation
      setShowSearchResults(false);
      setSearchQuery("");
      setSearchResults([]);
      setExpandedCards(new Set());

      // Use React Router navigate to avoid full page reload
      navigate(targetUrl);
    } else if (result.type === 'surah') {
      // Try to extract surah number from various possible locations and types
      let surahNumber =
        result.data?.number ??
        result.data?.id ??
        result.data?.chapter_id ??
        result.data?.code ??
        result.number ??
        result.id ??
        result.chapter_id ??
        result.code ??
        null;

      // Normalize the surah number - handle both string and number types
      if (surahNumber != null) {
        // Convert to string first to handle leading zeros
        let surahStr = String(surahNumber).replace(/^0+/, "");
        
        // Convert to number for validation
        const surahNum = parseInt(surahStr, 10);
        
        // Validate the surah number
        if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
          console.warn("Invalid surah number:", { surahNumber, surahNum, result });
          return;
        }
        
        // Use the validated number as string for URL
        const targetSurahId = surahNum.toString();
        const url = `/surah/${targetSurahId}`;
        
        if (isModifierPressed) {
          event?.preventDefault();
          window.open(url, '_blank', 'noopener,noreferrer');
          return;
        }
        
        // Close the popup before navigation
        setShowSearchResults(false);
        setSearchQuery("");
        setSearchResults([]);
        
        navigate(url);
      } else {
        console.warn("Unable to determine surah number from search result:", result);
        return;
      }
    } else if (result.type === 'verse' || result.type === 'verse_reference') {
      const surah = result.surah || (result.verse_key ? parseInt(result.verse_key.split(':')[0], 10) : null);
      const verse = result.ayah || result.verse || (result.verse_key ? parseInt(result.verse_key.split(':')[1], 10) : null);
      
      if (!surah || !verse) {
        console.warn('Invalid verse reference:', result);
        return;
      }
      
      const url = `/surah/${surah}#verse-${verse}`;
      const verseKey = result.verse_key || `${surah}:${verse}`;

      if (isModifierPressed) {
        event?.preventDefault();
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }

      // Store state for navigation (backup for hash-based navigation)
      sessionStorage.setItem('scrollToVerse', verse.toString());
      sessionStorage.setItem('navigationState', JSON.stringify({
        viewType: 'Ayah Wise',
        highlightVerse: verseKey,
        scrollToVerse: verse
      }));

      // Close the popup before navigation
      setShowSearchResults(false);
      setSearchQuery("");
      setSearchResults([]);

      // Use React Router navigate instead of window.location.href to avoid full page reload
      navigate(url);
    }
    
    setShowSearchResults(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Handle search form submission
  const handleSearchSubmit = async (e) => {
    e.preventDefault();

    const normalizedQuery = normalizeSearchQuery(searchQuery);

    if (!normalizedQuery) {
      setShowSearchResults(false);
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    wasManuallyClosed.current = false;
    setIsSearching(true);
    setSearchError(null);
    setShowSearchResults(true);
    setSearchQuery(normalizedQuery);

    // Track search usage
    if (analytics) {
      analytics.trackEvent('search', 'engagement', {
        metadata: { query: normalizedQuery, language: translationLanguage },
      });
    }

    try {
      const results = [];

      // Check if it's a verse reference (e.g., "2:45")
      const verseReference = extractVerseReference(normalizedQuery);
      if (verseReference) {
        const surah = parseInt(verseReference.surah, 10);
        const verse = parseInt(verseReference.verse, 10);
        
        // Validate surah and verse numbers
        if (surah >= 1 && surah <= 114 && verse >= 1) {
          // Get surah name for display
          let surahs = surahsCache;
          if (!surahs) {
            try {
              surahs = await fetchSurahs();
              setSurahsCache(surahs);
            } catch (err) {
              console.warn('Failed to fetch surahs:', err);
            }
          }
          
          const surahInfo = surahs?.find(s => s.number === surah);
          const surahName = surahInfo?.name || `Surah ${surah}`;
          const surahArabic = surahInfo?.arabic || '';
          
          results.push({
            type: 'verse_reference',
            surah: surah,
            ayah: verse,
            displayText: `${surahName} - Verse ${verse}`,
            subText: `Surah ${surah}:${verse}`,
            arabicText: surahArabic,
            verse_key: `${surah}:${verse}`
          });
        }
      }

      // Check if it's a surah number only (e.g., "2")
      const isSurahOnly = /^\d+$/.test(normalizedQuery);
      if (isSurahOnly) {
        const surahNum = parseInt(normalizedQuery, 10);
        if (surahNum >= 1 && surahNum <= 114) {
          // Get surah info
          let surahs = surahsCache;
          if (!surahs) {
            try {
              surahs = await fetchSurahs();
              setSurahsCache(surahs);
            } catch (err) {
              console.warn('Failed to fetch surahs:', err);
            }
          }
          
          const surahInfo = surahs?.find(s => s.number === surahNum);
          if (surahInfo) {
            results.push({
              type: 'surah',
              data: surahInfo,
              displayText: `${surahInfo.number}. ${surahInfo.name}`,
              subText: `${surahInfo.ayahs} verses • ${surahInfo.type}`,
              arabicText: surahInfo.arabic
            });
          }
        }
      }

      // Check if it's a surah name
      const matchingSurah = await findMatchingSurah(normalizedQuery);
      if (matchingSurah && !isSurahOnly) {
        const surahId = matchingSurah.number || matchingSurah.id;
        if (surahId >= 1 && surahId <= 114) {
          // Get full surah info
          let surahs = surahsCache;
          if (!surahs) {
            try {
              surahs = await fetchSurahs();
              setSurahsCache(surahs);
            } catch (err) {
              console.warn('Failed to fetch surahs:', err);
            }
          }
          
          const surahInfo = surahs?.find(s => s.number === surahId);
          if (surahInfo) {
            results.push({
              type: 'surah',
              data: surahInfo,
              displayText: `${surahInfo.number}. ${surahInfo.name}`,
              subText: `${surahInfo.ayahs} verses • ${surahInfo.type}`,
              arabicText: surahInfo.arabic
            });
          }
        }
      }

      // If we found verse reference or surah matches, show them
      if (results.length > 0) {
        setSearchResults(results);
        setIsSearching(false);
        
        // Only do word search if it's not a pure verse reference or surah number
        // (e.g., "2:45" or "2" should not trigger word search, but "Al-Baqarah" can)
        const isVerseReference = extractVerseReference(normalizedQuery);
        const isSurahNumber = /^\d+$/.test(normalizedQuery);
        
        if (!isVerseReference && !isSurahNumber) {
          // Perform word search in background to add more results
          setSearchPage(1);
          setSearchHasMore(false);
          currentSearchQuery.current = normalizedQuery;
          performSearch(normalizedQuery, 1).catch(() => {
            // Ignore word search errors, we already have verse/surah results
          });
        }
      } else {
        // No verse/surah matches, just do word search
        setSearchPage(1);
        setSearchHasMore(false);
        currentSearchQuery.current = normalizedQuery;
        await performSearch(normalizedQuery, 1);
      }
    } catch (error) {
      setSearchError('Failed to search. Please try again.');
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleBookmarkClick = () => {
    navigate("/bookmarkedverses");
  };

  const handleContinueReading = () => {
    const latestReading = getLastReading();
    if (!latestReading) {
      setLastReading(null);
      return;
    }

    setLastReading(latestReading);

    if (latestReading.viewType === "blockwise") {
      setViewType?.("Block Wise");
    } else if (latestReading.viewType === "surah" || latestReading.viewType === "reading") {
      setViewType?.("Ayah Wise");
    }

    const targetPath =
      latestReading.path ||
      (latestReading.surahId ? `/surah/${latestReading.surahId}` : "/reading");

    const navState = {};
    if (latestReading.scrollToBlock) navState.scrollToBlock = latestReading.scrollToBlock;
    if (latestReading.pageNumber) navState.pageNumber = latestReading.pageNumber;

    navigate(targetPath, Object.keys(navState).length ? { state: navState } : undefined);
  };

  // Handle search input blur - navigate directly if verse reference or surah
  const handleSearchBlur = async () => {
    // Longer delay to allow click events to process first (especially for word search results)
    setTimeout(async () => {
      // Check if user clicked on a result (wasManuallyClosed is set to true on click)
      if (wasManuallyClosed.current) {
        return; // Don't interfere with navigation
      }
      
      const normalizedQuery = normalizeSearchQuery(searchQuery);
      
      if (!normalizedQuery) {
        setShowSearchResults(false);
        return;
      }

      // Check if it's a verse reference (e.g., "2:45")
      const verseReference = extractVerseReference(normalizedQuery);
      if (verseReference) {
        const surah = parseInt(verseReference.surah, 10);
        const verse = parseInt(verseReference.verse, 10);
        
        if (surah >= 1 && surah <= 114 && verse >= 1) {
          const targetUrl = `/surah/${surah}#verse-${verse}`;
          sessionStorage.setItem('scrollToVerse', verse.toString());
          sessionStorage.setItem('navigationState', JSON.stringify({
            viewType: 'Ayah Wise',
            highlightVerse: `${surah}:${verse}`,
            scrollToVerse: verse
          }));
          navigate(targetUrl);
          return;
        }
      }

      // Check if it's a surah number
      const isSurahOnly = /^\d+$/.test(normalizedQuery);
      if (isSurahOnly) {
        const surahNum = parseInt(normalizedQuery, 10);
        if (surahNum >= 1 && surahNum <= 114) {
          navigate(`/surah/${surahNum}`);
          setSearchQuery("");
          return;
        }
      }

      // Check if it's a surah name
      const matchingSurah = await findMatchingSurah(normalizedQuery);
      if (matchingSurah) {
        const surahId = matchingSurah.number || matchingSurah.id;
        if (surahId >= 1 && surahId <= 114) {
          navigate(`/surah/${surahId}`);
          setSearchQuery("");
          return;
        }
      }

      // If it's a complete verse reference, show search results
      if (verseReference && normalizedQuery.trim().length > 0) {
        // Don't perform search for verse references - they should navigate directly
        setShowSearchResults(false);
      } else {
        setShowSearchResults(false);
      }
    }, 200);
  };

  // Handle chapter button click (prevent drag from triggering click)
  const handleChapterClick = (chapter, e) => {
    if (hasDragged.current) {
      hasDragged.current = false;
      return;
    }

    const chapterId = chapter?.id ?? chapter?.chapter_id;
    if (!chapterId) {
      return;
    }

    const verseKey = chapter?.verseKey || chapter?.verse_key;
    const verseNumber =
      chapter?.verseNumber ??
      chapter?.verse_number ??
      (typeof verseKey === "string" ? verseKey.split(":")[1] : undefined);

    const url = `/surah/${chapterId}`;
    const isModifierPressed = e?.ctrlKey || e?.metaKey;

    const navigationState =
      verseNumber || verseKey
        ? {
            ...(verseNumber ? { scrollToVerse: verseNumber } : {}),
            ...(verseKey ? { highlightVerse: verseKey } : {}),
          }
        : undefined;

    if (isModifierPressed) {
      e?.preventDefault();
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      navigate(url, { state: navigationState });
    }
    hasDragged.current = false;
  };

  return (
    <>
    <div className="flex flex-col items-center justify-center bg-white dark:bg-gray-900 px-4 py-6 sm:py-8 lg:py-12">
      {/* Banner Section */}
      <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-4xl mb-6 sm:mb-8 mx-auto">
        <a
          href="https://app.thafheem.net/"
          target="_blank"
          rel="noopener noreferrer"
          className="block cursor-pointer hover:opacity-90 transition-opacity"
        >
          <img
            src={banner}
            alt="Banner"
            className="w-full h-auto object-contain rounded-xl"
          />
        </a>
      </div>

      {/* Logo Section */}
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mb-8 sm:mb-10 mx-auto">
        <div className="w-full h-20 sm:h-24 md:h-28 lg:h-32 rounded-lg flex items-center justify-center">
          <img
            src={theme === 'dark' ? logoWhite : logo}
            alt="Logo"
            className="object-contain transition-transform h-16 sm:h-20 md:h-24 lg:h-28 max-w-[260px] sm:max-w-[300px] md:max-w-[360px] lg:max-w-[400px] w-auto"
          />
        </div>
      </div>

      {/* Search Bar */}
      <div className="w-full max-w-xl sm:max-w-2xl md:max-w-3xl mb-8 sm:mb-10 relative">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-gray-400 dark:text-white" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onBlur={handleSearchBlur}
            // Removed onFocus auto-show to prevent popup from reappearing after cancel
            // Results will only show when user types or submits search
            placeholder="Search surahs, verses, or try '2:255' for specific verses..."
            className="w-full h-[49px] pl-12 pr-12 py-4 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-[#1C1C1E] dark:border-gray-600 dark:text-white shadow-sm text-gray-700 placeholder-gray-400 text-base"
          />
        </form>

        {/* Search Results Dropdown */}
        {showSearchResults && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/20 dark:bg-black/40 z-[300] backdrop-blur-sm"
              onClick={() => {
                setShowSearchResults(false);
                setSearchResults([]);
                setSearchQuery("");
                setExpandedCards(new Set());
                wasManuallyClosed.current = true; // Mark as manually closed
              }}
            />
            
            {/* Modal */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-600 w-[95vw] max-w-xl sm:max-w-2xl md:max-w-3xl z-[310] max-h-[85vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium font-poppins text-gray-900 dark:text-white">
                    Search Results
                  </h3>
                  <button
                    onClick={() => {
                      setShowSearchResults(false);
                      setSearchResults([]);
                      setSearchQuery("");
                      wasManuallyClosed.current = true; // Mark as manually closed
                    }}
                    className="text-gray-500 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <XIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 p-4">
                {isSearching && (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500"></div>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Searching...</p>
                  </div>
                )}

                {searchError && (
                  <div className="text-center py-4">
                    <p className="text-red-500 dark:text-red-400">{searchError}</p>
                  </div>
                )}

                {!isSearching && !searchError && searchResults.length === 0 && searchQuery.length >= 2 && (
                  <div className="text-center py-4">
                    <p className="text-gray-500 dark:text-gray-400">No results found</p>
                  </div>
                )}

              {!isSearching && searchResults.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {(() => {
                      const surahCount = searchResults.filter(r => r.type === 'surah').length;
                      // Arabic word_search hits are whole-verse matches — count them as verses
                      const verseCount = searchResults.filter(r => r.type === 'verse' || r.type === 'verse_reference' || (r.type === 'word_search' && r.language === 'arabic')).length;
                      const wordCount = searchResults.filter(r => r.type === 'word_search' && r.language !== 'arabic').length;
                      const subjectCount = searchResults.filter(r => r.type === 'subject_quran' || r.type === 'subject_tafseer').length;
                      const rootCount = searchResults.filter(r => r.type === 'root_word').length;
                      const bits = [
                        `${surahCount} surahs`,
                        `${verseCount} verses`,
                        `${wordCount} word matches`,
                        ...(subjectCount ? [`${subjectCount} subjects`] : []),
                        ...(rootCount ? [`${rootCount} root words`] : []),
                      ];
                      return `Found ${bits.join(', ')}`;
                    })()}
                  </div>
                  {searchResults.map((result, index) => {
                    const cardKey = `${result.type}-${index}-${result.surah || result.data?.number || index}`;
                    const isExpanded = expandedCards.has(cardKey);
                    const toggleExpand = (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setExpandedCards(prev => {
                        const next = new Set(prev);
                        next.has(cardKey) ? next.delete(cardKey) : next.add(cardKey);
                        return next;
                      });
                    };
                    return (
                    <div
                      key={cardKey}
                      onMouseDown={result.type === 'word_search' ? toggleExpand : (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSearchResultClick(result, e);
                      }}
                      className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                    >
                      {result.type === 'subject_quran' || result.type === 'subject_tafseer' ? (
                        <div>
                          {(() => {
                            const subjectType = result.type === 'subject_quran' ? 'quran' : 'tafseer';
                            const expandKey = `${subjectType}-${result.id}`;
                            const expandedData = expandedSubjectVerses[expandKey] || { collapsed: true, results: [] };
                            const isOpen = !expandedData.collapsed;
                            return (
                              <>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center space-x-2 flex-wrap">
                                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase">
                                      {subjectType === 'quran' ? 'quran subject' : 'tafseer subject'}
                                    </span>
                                    <div className="w-1 h-1 bg-gray-400 rounded-full" />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      #{result.id}
                                    </span>
                                  </div>
                                  <ChevronDownIcon className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                                </div>
                                <p className="text-sm text-gray-900 dark:text-white mt-1">
                                  {result.subject}
                                </p>
                                <div className="mt-3 flex justify-end">
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleSubjectExpand(subjectType, result.id, result.lang || 'mal');
                                    }}
                                    className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-full transition-colors"
                                  >
                                    {isOpen ? 'Hide verses' : 'Show verses'} <ChevronRightIcon className="h-3 w-3" />
                                  </button>
                                </div>
                                {isOpen && (
                                  <div className="mt-3 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                                    {expandedData.loading && (
                                      <div className="text-xs text-gray-400">Loading verses...</div>
                                    )}
                                    {!expandedData.loading && expandedData.results?.map((verse, verseIndex) => (
                                      <button
                                        key={`${expandKey}-verse-${verseIndex}-${verse.surah}-${verse.ayah}`}
                                        onMouseDown={(e) => navigateToVerse(verse.surah, verse.ayah, e)}
                                        className="w-full text-left p-2 rounded-lg bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                      >
                                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                                          <span>Surah {verse.surah}:{verse.ayah}</span>
                                          <span>{verse.suraName || ''}</span>
                                        </div>
                                        <p className={`text-sm text-gray-800 dark:text-gray-100 line-clamp-2 ${verse.arabicText && !verse.translationText && !verse.interpretationText ? 'text-lg leading-9 font-arabic' : ''}`}>
                                          {stripHtml(verse.translationText || verse.interpretationText || verse.arabicText || '')}
                                        </p>
                                      </button>
                                    ))}
                                    {!expandedData.loading && expandedData.hasMore && (
                                      <button
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleSubjectLoadMore(subjectType, result.id, result.lang || 'mal');
                                        }}
                                        className="w-full py-2 text-xs text-amber-600 dark:text-amber-400 border-t border-gray-100 dark:border-gray-700"
                                      >
                                        {expandedData.loadingMore ? 'Loading more...' : 'Load more verses'}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      ) : result.type === 'root_word' ? (
                        <div>
                          {(() => {
                            const expandKey = `root-${result.rootGroupId}`;
                            const expandedData = expandedSubjectVerses[expandKey] || { collapsed: true, results: [] };
                            const isOpen = !expandedData.collapsed;
                            return (
                              <>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center space-x-2 flex-wrap">
                                    <span className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase">
                                      root word
                                    </span>
                                    <div className="w-1 h-1 bg-gray-400 rounded-full" />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {result.verseCount} verses
                                    </span>
                                  </div>
                                  <ChevronDownIcon className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                                </div>
                                <p className="text-lg text-gray-900 dark:text-white mt-1" dir="rtl">
                                  {result.root}
                                </p>
                                <div className="mt-3 flex justify-end">
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleRootExpand(result.rootGroupId);
                                    }}
                                    className="flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 bg-violet-50 dark:bg-violet-900/30 px-3 py-1.5 rounded-full transition-colors"
                                  >
                                    {isOpen ? 'Hide verses' : 'Show verses'} <ChevronRightIcon className="h-3 w-3" />
                                  </button>
                                </div>
                                {isOpen && (
                                  <div className="mt-3 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                                    {expandedData.loading && (
                                      <div className="text-xs text-gray-400">Loading verses...</div>
                                    )}
                                    {!expandedData.loading && expandedData.results?.map((verse, verseIndex) => (
                                      <button
                                        key={`${expandKey}-verse-${verseIndex}-${verse.surah}-${verse.ayah}`}
                                        onMouseDown={(e) => navigateToVerse(verse.surah, verse.ayah, e)}
                                        className="w-full text-left p-2 rounded-lg bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                      >
                                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                                          <span>Surah {verse.surah}:{verse.ayah}</span>
                                          <span>{verse.word || result.root}</span>
                                        </div>
                                        <p className={`text-sm text-gray-800 dark:text-gray-100 line-clamp-2 ${verse.arabicText && !verse.translationText ? 'text-lg leading-9 font-arabic' : ''}`} dir={verse.arabicText && !verse.translationText ? 'rtl' : undefined}>
                                          {stripHtml(verse.translationText || verse.arabicText || '')}
                                        </p>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      ) : result.type === 'word_search' ? (
                        <div>
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400 uppercase">
                                {result.language}
                              </span>
                              <div className="w-1 h-1 bg-gray-400 rounded-full" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {result.subText}
                              </span>
                            </div>
                            <ChevronDownIcon className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>

                          {/* Main text — clamped or full */}
                          <p
                            className={`${result.language === 'arabic' ? 'text-lg leading-9' : 'text-sm'} text-gray-900 dark:text-white mt-1 ${isExpanded ? '' : 'line-clamp-2'} ${langFontClass(result.language)}`}
                            style={langFontStyle(result.language)}
                            dir={langIsRtl(result.language) ? 'rtl' : undefined}
                          >
                            {highlightText(result.displayText, searchQuery)}
                          </p>

                          {/* Translation hint (interpretation results) */}
                          {result.sourceType === 'interpretation' && result.translationText && (
                            <p
                              className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${isExpanded ? '' : 'line-clamp-1'} ${langFontClass(result.language)}`}
                              style={langFontStyle(result.language)}
                              dir={langIsRtl(result.language) ? 'rtl' : undefined}
                            >
                              {result.translationText}
                            </p>
                          )}

                          {result.arabicWord && (
                            <p className="text-lg font-arabic text-gray-700 dark:text-gray-300 mt-1" dir="rtl">
                              {result.arabicWord}
                            </p>
                          )}

                          {/* Go to verse button — only when expanded */}
                          {isExpanded && (
                            <div className="mt-3 flex justify-end">
                              <button
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSearchResultClick(result, e);
                                }}
                                className="flex items-center gap-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/30 px-3 py-1.5 rounded-full transition-colors"
                              >
                                Go to verse <ChevronRightIcon className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : result.type === 'surah' ? (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
                                Surah
                              </span>
                              <div className="w-1 h-1 bg-gray-400 rounded-full" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {result.subText}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {highlightText(result.displayText, searchQuery)}
                              </p>
                              <p className="text-lg text-gray-700 dark:text-gray-300 ml-4" dir="rtl">
                                {result.arabicText}
                              </p>
                            </div>
                          </div>
                          <ChevronRightIcon className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
                        </div>
                      ) : result.type === 'verse_reference' ? (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
                                Verse
                              </span>
                              <div className="w-1 h-1 bg-gray-400 rounded-full" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {result.subText}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {result.displayText}
                              </p>
                              {result.arabicText && (
                                <p className="text-lg text-gray-700 dark:text-gray-300 ml-4" dir="rtl">
                                  {result.arabicText}
                                </p>
                              )}
                            </div>
                          </div>
                          <ChevronRightIcon className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
                                Verse
                              </span>
                              <div className="w-1 h-1 bg-gray-400 rounded-full" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {result.surahName}
                              </span>
                              {result.surahType && (
                                <>
                                  <div className="w-1 h-1 bg-gray-400 rounded-full" />
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {result.surahType}
                                  </span>
                                </>
                              )}
                              <div className="w-1 h-1 bg-gray-400 rounded-full" />
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                Verse {result.verseNumber}
                              </span>
                            </div>
                            <div className="flex items-start justify-between">
                              <div className="flex-1 pr-3">
                                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 leading-relaxed">
                                  {result.displayText}
                                </p>
                              </div>
                              {result.surahArabic && (
                                <div className="text-right" dir="rtl">
                                  <p className="text-lg text-gray-600 dark:text-gray-400">
                                    {result.surahArabic}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <ChevronRightIcon className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
                        </div>
                      )}
                    </div>
                  );
                  })}
                  {/* Load More */}
                  {searchHasMore && !isLoadingMore && (
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const nextPage = searchPage + 1;
                        performSearch(currentSearchQuery.current, nextPage);
                      }}
                      className="w-full py-2 mt-1 text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 border-t border-gray-100 dark:border-gray-700 transition-colors"
                    >
                      Load more results
                    </button>
                  )}
                  {isLoadingMore && (
                    <div className="py-3 text-center text-sm text-gray-400 border-t border-gray-100 dark:border-gray-700">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500 mr-2"></div>
                      Loading more...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          </>
        )}

      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-4xl px-2">
        <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 w-full">
          {/* Continue Reading with hover tooltip */}
          <div className="relative group/cr">
            <button
              type="button"
              onClick={handleContinueReading}
              disabled={!lastReading}
              className="flex items-center space-x-2 px-6 py-3 bg-white dark:bg-[#1C1C1E] text-[#62C3DC] dark:text-cyan-200 rounded-full shadow-md transition-all duration-200 text-sm hover:bg-[#62C3DC] hover:text-white hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none dark:hover:bg-[#3FA6C0] dark:hover:text-white [&_svg]:transition-colors [&_svg]:duration-200 [&:hover_svg]:text-white"
            >
              <Play className="h-4 w-4 text-[#3FA6C0]" />
              <span className="font-medium whitespace-nowrap font-poppins">Continue Reading</span>
            </button>
            {lastReading && (
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/cr:opacity-100 transition-opacity duration-150 z-50">
                <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs font-poppins font-medium whitespace-nowrap px-3 py-1.5 rounded-lg shadow-lg">
                  {(() => {
                    const langMap = { E: 'english', en: 'english', mal: 'malayalam', ml: 'malayalam', bn: 'bangla', hi: 'hindi', ta: 'tamil', ur: 'urdu' };
                    const normalizedLang = langMap[translationLanguage] || 'english';
                    const sourceList = localizedSurahs || surahsCache;
                    const surahEntry = sourceList?.find(s => String(s.number) === String(lastReading.surahId));
                    const label = surahEntry?.name || `Surah ${lastReading.surahId}`;
                    let detail = null;
                    if (lastReading.viewType === 'blockwise') {
                      detail = lastReading.scrollToBlock ? `Block ${lastReading.scrollToBlock}` : 'Block Wise';
                    } else if (lastReading.viewType === 'reading') {
                      detail = lastReading.pageNumber ? `Page ${lastReading.pageNumber}` : 'Reading';
                    } else if (lastReading.verseId) {
                      detail = `Ayah ${lastReading.verseId}`;
                    }
                    return (
                      <span className={langFontClass(normalizedLang)} style={langFontStyle(normalizedLang)}>
                        {label}{detail ? ` • ${detail}` : ''}
                      </span>
                    );
                  })()}
                </div>
                <div className="mx-auto w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45 -mt-1 rounded-sm" />
              </div>
            )}
          </div>

          <button
            onClick={handleBookmarkClick}
            className="flex items-center space-x-2 px-6 py-3 bg-white dark:bg-[#1C1C1E] text-[#62C3DC] dark:text-cyan-200 rounded-full shadow-md transition-all duration-200 text-sm hover:bg-[#62C3DC] hover:text-white hover:shadow-lg flex-shrink-0 dark:hover:bg-[#3FA6C0] dark:hover:text-white [&_svg]:transition-colors [&_svg]:duration-200 [&:hover_svg]:text-white"
          >
            <BookmarkIcon className="h-4 w-4 text-[#3FA6C0]" />
            <span className="font-medium whitespace-nowrap font-poppins">Bookmarks</span>
          </button>
        </div>
      </div>

    </div>

      {/* Popular Section — always visible below buttons, full-width */}
      <div className="w-full bg-white dark:bg-gray-900 flex justify-center px-4 pb-4">
        <div className="w-full max-w-4xl">
        {isLoadingPopular && (
          <div className="flex items-center gap-2 py-2">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500"></div>
          </div>
        )}

        {popularError && (
          <p className="text-xs text-red-500 dark:text-red-400 py-2">{popularError}</p>
        )}

        {!isLoadingPopular && !popularError && (
          <div
            ref={scrollContainerRef}
            className="popular-scroll flex gap-2.5 overflow-x-auto cursor-grab pb-2"
            style={{ WebkitOverflowScrolling: 'touch' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {popularChapters.map((chapter, index) => (
              <button
                key={`${chapter.id ?? chapter.chapter_id}-${index}`}
                type="button"
                onClick={(e) => handleChapterClick(chapter, e)}
                className={`inline-flex items-center px-4 py-2 border border-[#62C3DC] text-[#62C3DC] dark:border-cyan-400 dark:text-cyan-400 rounded-full transition-colors text-sm font-medium flex-shrink-0 min-w-fit pointer-events-auto hover:bg-[#62C3DC]/10 dark:hover:bg-cyan-400/10 whitespace-nowrap ${
                  translationLanguage === 'ur' ? 'font-urdu-nastaliq' :
                  translationLanguage === 'mal' ? 'font-malayalam' :
                  translationLanguage === 'hi' ? 'font-hindi' :
                  translationLanguage === 'bn' ? 'font-bengali' :
                  translationLanguage === 'ta' ? 'font-tamil' : 'font-poppins'
                }`}
                style={index === popularChapters.length - 1 ? { marginRight: '0.5rem' } : {}}
              >
                {chapter.name}
              </button>
            ))}
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default HomepageSearch;
