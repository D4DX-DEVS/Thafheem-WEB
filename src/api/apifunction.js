import {
  SURA_NAMES_API,
  getSurahNamesByLanguageAPI,
  getSujudAyahsAPI,
  PAGE_RANGES_API,
  QURAN_TEXT_API,
  INTERPRETATION_API,
  QUIZ_PAGINATED_API,
  QUIZ_TAFHEEM_API,
  QUIZ_BLOCK_API,
  DIRECTUS_BASE_URL,
  API_BASE_URL,
  AYAH_TRANSLATION_API,
  MALARTICLES_API,
  ENGARTICLES_API,
  ARTICLES_API,
  AYA_TRANSLATION_API,
  LEGACY_TFH_BASE,
  LEGACY_TFH_REMOTE_BASE,
  TAJWEED_RULES_API,
  API_BASE_PATH,
  FEEDBACK_API,
  FEATURE_REQUEST_API,
} from "./apis";
import { API_BASE_PATH as CONFIG_API_BASE_PATH } from "../config/apiConfig.js";
import { getFallbackTajweedData } from "../data/tajweedFallback";

// Session-level tracking to reduce console noise
const apiAvailabilityState = {
  thafheemApiUnavailable: false,
  warningsLogged: new Set(),
  tajweedApiUnavailable: false,
};

const thafheemPrefaceCache = new Map();

// Cache for surahs data to prevent duplicate API calls
const surahsCache = {
  data: null,
  promise: null,
  timestamp: null,
  maxAge: 5 * 60 * 1000, // 5 minutes cache
  language: null, // Track which language the cache is for
  pendingLanguage: null, // Track which language is being fetched
};

// Cache for page ranges data to prevent duplicate API calls
const pageRangesCache = {
  data: null,
  promise: null,
  timestamp: null,
  maxAge: 5 * 60 * 1000, // 5 minutes cache
};

const normalizeUrlSegment = (segment, { leading = false, trailing = false } = {}) => {
  if (segment == null) return "";
  let normalized = segment.toString().trim();
  if (!normalized) return "";
  if (leading) {
    normalized = normalized.replace(/^\/+/, "");
  }
  if (trailing) {
    normalized = normalized.replace(/\/+$/, "");
  }
  return normalized;
};

const buildPrefaceUrl = (base, suraId, languageCode = "") => {
  const cleanBase = normalizeUrlSegment(base, { trailing: true });
  const cleanLanguage = normalizeUrlSegment(languageCode, {
    leading: true,
    trailing: true,
  });

  const basePath = `${cleanBase}/preface/${suraId}`;
  return cleanLanguage ? `${basePath}/${cleanLanguage}` : basePath;
};

const expandPrefaceLanguageVariants = (languageCode) => {
  const baseCode = normalizeUrlSegment(languageCode, { leading: true, trailing: true });

  if (!baseCode) {
    return [""];
  }

  const variants = [];
  const lower = baseCode.toLowerCase();
  const upper = baseCode.toUpperCase();

  if (!variants.includes(baseCode)) {
    variants.push(baseCode);
  }

  if (!variants.includes(lower)) {
    variants.push(lower);
  }

  if (!variants.includes(upper)) {
    variants.push(upper);
  }

  return variants;
};

// Helper function to log warnings only once per session
const logWarningOnce = (key, message, ...args) => {
  if (!apiAvailabilityState.warningsLogged.has(key)) {
    apiAvailabilityState.warningsLogged.add(key);
    console.warn(message, ...args);
  }
};

// Helper function to add timeout to fetch requests
const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Normalize headers to ensure consistent handling
  const headers = new Headers();
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => headers.append(key, value));
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => headers.append(key, value));
    } else {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          headers.append(key, value);
        }
      });
    }
  }

  // Ensure legacy API expects JSON responses; fallback to permissive accept header
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json, text/plain, */*');
  }

  // Helps some legacy endpoints detect AJAX requests (mirrors browser defaults)
  if (!headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'XMLHttpRequest');
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
      mode: 'cors', // Explicitly set CORS mode
    });
    clearTimeout(timeoutId);
    
    // Check if response is HTML (likely an error page)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error(`Received HTML response instead of JSON from ${url}. This usually indicates a CORS or server error.`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Request timeout - API took too long to respond");
    }
    // Handle network errors gracefully
    if (
      error.message?.includes("Failed to fetch") ||
      error.message?.includes("ERR_CONNECTION_CLOSED") ||
      error.message?.includes("ERR_NETWORK") ||
      error.message?.includes("CORS")
    ) {
      throw new Error("Network error - API server may be unavailable or CORS blocked");
    }
    throw error;
  }
};

// (duplicate import block removed)
// In-memory cache for faster repeated access (complements IndexedDB cache)
const inMemoryTranslationCache = new Map();
const IN_MEMORY_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

export const fetchAyaTranslation = async (surahId, range, language = 'mal', retries = 1) => {
  // Use new MySQL backend API for all languages
  const apiBase = CONFIG_API_BASE_PATH || API_BASE_PATH;
  // Normalize language code (mal -> malayalam)
  const normalizedLang = !language || language === 'mal' ? 'malayalam' : language;
  
  // Check in-memory cache first (faster than IndexedDB for recent requests)
  const cacheKey = `${surahId}_${range}_${normalizedLang}`;
  const cached = inMemoryTranslationCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < IN_MEMORY_CACHE_MAX_AGE) {
    return cached.data;
  }

  // 12 seconds: enough for slow/cold DB queries and moderate connection-pool queuing.
  // Previously 6s was too tight when multiple blocks load concurrently.
  const timeout = 12000;

  // Use new MySQL backend endpoint: /api/ayatransl/:surah/:range/:language
  const url = `${apiBase}/ayatransl/${surahId}/${range}/${normalizedLang}`;

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {}, timeout);
      
      // Check if response is HTML (likely an error page)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Received HTML response instead of JSON - endpoint likely unavailable or CORS blocked');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Store in in-memory cache for faster subsequent access
      inMemoryTranslationCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      // Limit cache size to prevent memory issues (keep last 100 entries)
      if (inMemoryTranslationCache.size > 100) {
        const firstKey = inMemoryTranslationCache.keys().next().value;
        inMemoryTranslationCache.delete(firstKey);
      }
      
      return data;
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === retries;
      const isTimeout = error.message?.includes('timeout');

      // Only log errors on the last attempt or if not a timeout (to reduce spam)
      if (isLastAttempt || !isTimeout) {
        console.error(`Error fetching translation from ${url} for ${surahId}:${range}:${normalizedLang}${retries > 0 ? ` (attempt ${attempt + 1}/${retries + 1})` : ''}:`, error.message);
      }

      if (isLastAttempt) {
        break;
      }

      // Exponential backoff: wait 1s, then 2s before retries
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Failed to fetch translation from MySQL API');
};
// Helper function to map language code to API language parameter
const mapLanguageToAPI = (languageCode) => {
  const langMap = {
    'E': 'english',
    'en': 'english',
    'english': 'english',
    'mal': 'malayalam',
    'ml': 'malayalam',
    'malayalam': 'malayalam',
    'bn': 'bangla',
    'bangla': 'bangla',
    'hi': 'hindi',
    'hindi': 'hindi',
    'ta': 'tamil',
    'tamil': 'tamil',
    'ur': 'urdu',
    'urdu': 'urdu'
  };
  return langMap[languageCode?.toLowerCase()] || 'english';
};

export const fetchSurahs = async (options = {}) => {
  const { includePageRanges = false, language = null } = options;
  
  // Determine which API endpoint to use based on language
  const apiLanguage = language ? mapLanguageToAPI(language) : null;
  const apiUrl = apiLanguage 
    ? getSurahNamesByLanguageAPI(apiLanguage)
    : SURA_NAMES_API;
  
  // Create cache key based on language
  const cacheKey = apiLanguage || 'default';
  
  // Check cache first (language-specific cache)
  const now = Date.now();
  if (
    surahsCache.data &&
    surahsCache.language === cacheKey &&
    surahsCache.timestamp &&
    now - surahsCache.timestamp < surahsCache.maxAge
  ) {
    // If page ranges are needed and we have cached data, we still need to fetch page ranges
    // but we can return cached surahs immediately and update ayah counts if needed
    if (includePageRanges && surahsCache.data) {
      // Fetch page ranges in background to update ayah counts if needed
      fetchPageRanges()
        .then((pageRanges) => {
          if (pageRanges && pageRanges.length > 0) {
            const getAyahCountFromPageRanges = (surahId, pageRanges) => {
              const surahRanges = pageRanges.filter(
                (range) => range.SuraId === surahId
              );
              if (surahRanges.length === 0) return null;
              return Math.max(...surahRanges.map((range) => range.ayato));
            };

            // Update cached data with accurate ayah counts
            const updated = surahsCache.data.map((surah) => {
              const ayahCountFromPageRanges = getAyahCountFromPageRanges(
                surah.number,
                pageRanges
              );
              return {
                ...surah,
                ayahs: ayahCountFromPageRanges || surah.ayahs,
              };
            });
            surahsCache.data = updated;
          }
        })
        .catch(() => {
          // Silently fail - page ranges are optional
        });
    }
    return surahsCache.data;
  }

  // If there's already a pending request for this language, return that promise
  if (surahsCache.promise && surahsCache.pendingLanguage === cacheKey) {
    return surahsCache.promise;
  }

  // Create new request
  surahsCache.promise = (async () => {
    try {
      // Fetch from new MySQL backend API
      const surahResponse = await fetchWithTimeout(apiUrl, {}, 15000);
      
      // Check if response is HTML (likely 404 error page)
      const contentType = surahResponse.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Received HTML response, endpoint likely unavailable');
      }
      
      if (!surahResponse.ok) {
        throw new Error(`HTTP error! status: ${surahResponse.status}`);
      }
      
      const surahData = await surahResponse.json();
      
      if (!Array.isArray(surahData) || surahData.length === 0) {
        throw new Error('Invalid response format or empty data');
      }

      let pageRangesResponse = [];
      
      // Only fetch page ranges if explicitly requested
      if (includePageRanges) {
        pageRangesResponse = await fetchPageRanges().catch(() => []); // Don't fail if page ranges unavailable
      }

      // Create a function to get accurate ayah count from page ranges
      const getAyahCountFromPageRanges = (surahId, pageRanges) => {
        const surahRanges = pageRanges.filter(
          (range) => range.SuraId === surahId
        );
        if (surahRanges.length === 0) return null;

        // Find the maximum ayato value for this surah
        return Math.max(...surahRanges.map((range) => range.ayato));
      };

      const result = surahData.map((surah) => {
        // Get ayah count from page ranges API if available, otherwise use original data
        const ayahCountFromPageRanges = getAyahCountFromPageRanges(
          surah.SuraID,
          pageRangesResponse
        );
        const ayahCount = ayahCountFromPageRanges || surah.TotalAyas;

        return {
          number: surah.SuraID,
          arabic: surah.ASuraName?.trim(),
          name: surah.SuraName?.trim() || surah.ESuraName?.trim(), // Use SuraName for language-specific, fallback to ESuraName
          ayahs: ayahCount,
          type: surah.SuraType === "Makkan" ? "Makki" : "Madani",
        };
      });

      // Cache the result with language key
      surahsCache.data = result;
      surahsCache.language = cacheKey;
      surahsCache.timestamp = Date.now();
      surahsCache.promise = null;
      surahsCache.pendingLanguage = null;

      // Successfully fetched surahs with accurate ayah counts
      return result;
    } catch (error) {
      // Clear promise on error so it can be retried
      surahsCache.promise = null;
      surahsCache.pendingLanguage = null;
      console.error(`❌ Error fetching surahs from MySQL API (language: ${apiLanguage}):`, error.message);
      throw error;
    }
  })();
  
  surahsCache.pendingLanguage = cacheKey;

  return surahsCache.promise;
};

/**
      { number: 27, arabic: "النمل", name: "An-Naml", ayahs: 93, type: "Makki" },
      { number: 28, arabic: "القصص", name: "Al-Qasas", ayahs: 88, type: "Makki" },
      { number: 29, arabic: "العنكبوت", name: "Al-Ankabut", ayahs: 69, type: "Makki" },
      { number: 30, arabic: "الروم", name: "Ar-Rum", ayahs: 60, type: "Makki" },
      { number: 31, arabic: "لقمان", name: "Luqman", ayahs: 34, type: "Makki" },
      { number: 32, arabic: "السجدة", name: "As-Sajdah", ayahs: 30, type: "Makki" },
      { number: 33, arabic: "الأحزاب", name: "Al-Ahzab", ayahs: 73, type: "Madani" },
      { number: 34, arabic: "سبأ", name: "Saba", ayahs: 54, type: "Makki" },
      { number: 35, arabic: "فاطر", name: "Fatir", ayahs: 45, type: "Makki" },
      { number: 36, arabic: "يس", name: "Ya-Sin", ayahs: 83, type: "Makki" },
      { number: 37, arabic: "الصافات", name: "As-Saffat", ayahs: 182, type: "Makki" },
      { number: 38, arabic: "ص", name: "Sad", ayahs: 88, type: "Makki" },
      { number: 39, arabic: "الزمر", name: "Az-Zumar", ayahs: 75, type: "Makki" },
      { number: 40, arabic: "غافر", name: "Ghafir", ayahs: 85, type: "Makki" },
      { number: 41, arabic: "فصلت", name: "Fussilat", ayahs: 54, type: "Makki" },
      { number: 42, arabic: "الشورى", name: "Ash-Shura", ayahs: 53, type: "Makki" },
      { number: 43, arabic: "الزخرف", name: "Az-Zukhruf", ayahs: 89, type: "Makki" },
      { number: 44, arabic: "الدخان", name: "Ad-Dukhan", ayahs: 59, type: "Makki" },
      { number: 45, arabic: "الجاثية", name: "Al-Jathiyah", ayahs: 37, type: "Makki" },
      { number: 46, arabic: "الأحقاف", name: "Al-Ahqaf", ayahs: 35, type: "Makki" },
      { number: 47, arabic: "محمد", name: "Muhammad", ayahs: 38, type: "Madani" },
      { number: 48, arabic: "الفتح", name: "Al-Fath", ayahs: 29, type: "Madani" },
      { number: 49, arabic: "الحجرات", name: "Al-Hujurat", ayahs: 18, type: "Madani" },
      { number: 50, arabic: "ق", name: "Qaf", ayahs: 45, type: "Makki" },
      { number: 51, arabic: "الذاريات", name: "Adh-Dhariyat", ayahs: 60, type: "Makki" },
      { number: 52, arabic: "الطور", name: "At-Tur", ayahs: 49, type: "Makki" },
      { number: 53, arabic: "النجم", name: "An-Najm", ayahs: 62, type: "Makki" },
      { number: 54, arabic: "القمر", name: "Al-Qamar", ayahs: 55, type: "Makki" },
      { number: 55, arabic: "الرحمن", name: "Ar-Rahman", ayahs: 78, type: "Madani" },
      { number: 56, arabic: "الواقعة", name: "Al-Waqi'ah", ayahs: 96, type: "Makki" },
      { number: 57, arabic: "الحديد", name: "Al-Hadid", ayahs: 29, type: "Madani" },
      { number: 58, arabic: "المجادلة", name: "Al-Mujadila", ayahs: 22, type: "Madani" },
      { number: 59, arabic: "الحشر", name: "Al-Hashr", ayahs: 24, type: "Madani" },
      { number: 60, arabic: "الممتحنة", name: "Al-Mumtahanah", ayahs: 13, type: "Madani" },
      { number: 61, arabic: "الصف", name: "As-Saff", ayahs: 14, type: "Madani" },
      { number: 62, arabic: "الجمعة", name: "Al-Jumu'ah", ayahs: 11, type: "Madani" },
      { number: 63, arabic: "المنافقون", name: "Al-Munafiqun", ayahs: 11, type: "Madani" },
      { number: 64, arabic: "التغابن", name: "At-Taghabun", ayahs: 18, type: "Madani" },
      { number: 65, arabic: "الطلاق", name: "At-Talaq", ayahs: 12, type: "Madani" },
      { number: 66, arabic: "التحريم", name: "At-Tahrim", ayahs: 12, type: "Madani" },
      { number: 67, arabic: "الملك", name: "Al-Mulk", ayahs: 30, type: "Makki" },
      { number: 68, arabic: "القلم", name: "Al-Qalam", ayahs: 52, type: "Makki" },
      { number: 69, arabic: "الحاقة", name: "Al-Haqqah", ayahs: 52, type: "Makki" },
      { number: 70, arabic: "المعارج", name: "Al-Ma'arij", ayahs: 44, type: "Makki" },
      { number: 71, arabic: "نوح", name: "Nuh", ayahs: 28, type: "Makki" },
      { number: 72, arabic: "الجن", name: "Al-Jinn", ayahs: 28, type: "Makki" },
      { number: 73, arabic: "المزمل", name: "Al-Muzzammil", ayahs: 20, type: "Makki" },
      { number: 74, arabic: "المدثر", name: "Al-Muddaththir", ayahs: 56, type: "Makki" },
      { number: 75, arabic: "القيامة", name: "Al-Qiyamah", ayahs: 40, type: "Makki" },
      { number: 76, arabic: "الإنسان", name: "Al-Insan", ayahs: 31, type: "Madani" },
      { number: 77, arabic: "المرسلات", name: "Al-Mursalat", ayahs: 50, type: "Makki" },
      { number: 78, arabic: "النبأ", name: "An-Naba", ayahs: 40, type: "Makki" },
      { number: 79, arabic: "النازعات", name: "An-Nazi'at", ayahs: 46, type: "Makki" },
      { number: 80, arabic: "عبس", name: "Abasa", ayahs: 42, type: "Makki" },
      { number: 81, arabic: "التكوير", name: "At-Takwir", ayahs: 29, type: "Makki" },
      { number: 82, arabic: "الانفطار", name: "Al-Infitar", ayahs: 19, type: "Makki" },
      { number: 83, arabic: "المطففين", name: "Al-Mutaffifin", ayahs: 36, type: "Makki" },
      { number: 84, arabic: "الانشقاق", name: "Al-Inshiqaq", ayahs: 25, type: "Makki" },
      { number: 85, arabic: "البروج", name: "Al-Buruj", ayahs: 22, type: "Makki" },
      { number: 86, arabic: "الطارق", name: "At-Tariq", ayahs: 17, type: "Makki" },
      { number: 87, arabic: "الأعلى", name: "Al-A'la", ayahs: 19, type: "Makki" },
      { number: 88, arabic: "الغاشية", name: "Al-Ghashiyah", ayahs: 26, type: "Makki" },
      { number: 89, arabic: "الفجر", name: "Al-Fajr", ayahs: 30, type: "Makki" },
      { number: 90, arabic: "البلد", name: "Al-Balad", ayahs: 20, type: "Makki" },
      { number: 91, arabic: "الشمس", name: "Ash-Shams", ayahs: 15, type: "Makki" },
      { number: 92, arabic: "الليل", name: "Al-Layl", ayahs: 21, type: "Makki" },
      { number: 93, arabic: "الضحى", name: "Ad-Duha", ayahs: 11, type: "Makki" },
      { number: 94, arabic: "الشرح", name: "Ash-Sharh", ayahs: 8, type: "Makki" },
      { number: 95, arabic: "التين", name: "At-Tin", ayahs: 8, type: "Makki" },
      { number: 96, arabic: "العلق", name: "Al-Alaq", ayahs: 19, type: "Makki" },
      { number: 97, arabic: "القدر", name: "Al-Qadr", ayahs: 5, type: "Makki" },
      { number: 98, arabic: "البينة", name: "Al-Bayyinah", ayahs: 8, type: "Madani" },
      { number: 99, arabic: "الزلزلة", name: "Az-Zalzalah", ayahs: 8, type: "Madani" },
      { number: 100, arabic: "العاديات", name: "Al-Adiyat", ayahs: 11, type: "Makki" },
      { number: 101, arabic: "القارعة", name: "Al-Qari'ah", ayahs: 11, type: "Makki" },
      { number: 102, arabic: "التكاثر", name: "At-Takathur", ayahs: 8, type: "Makki" },
      { number: 103, arabic: "العصر", name: "Al-Asr", ayahs: 3, type: "Makki" },
      { number: 104, arabic: "الهمزة", name: "Al-Humazah", ayahs: 9, type: "Makki" },
      { number: 105, arabic: "الفيل", name: "Al-Fil", ayahs: 5, type: "Makki" },
      { number: 106, arabic: "قريش", name: "Quraysh", ayahs: 4, type: "Makki" },
      { number: 107, arabic: "الماعون", name: "Al-Ma'un", ayahs: 7, type: "Makki" },
      { number: 108, arabic: "الكوثر", name: "Al-Kawthar", ayahs: 3, type: "Makki" },
      { number: 109, arabic: "الكافرون", name: "Al-Kafirun", ayahs: 6, type: "Makki" },
      { number: 110, arabic: "النصر", name: "An-Nasr", ayahs: 3, type: "Madani" },
      { number: 111, arabic: "اللهب", name: "Al-Lahab", ayahs: 5, type: "Makki" },
      { number: 112, arabic: "الإخلاص", name: "Al-Ikhlas", ayahs: 4, type: "Makki" },
      { number: 113, arabic: "الفلق", name: "Al-Falaq", ayahs: 5, type: "Makki" },
      { number: 114, arabic: "الناس", name: "An-Nas", ayahs: 6, type: "Makki" }
    ];
    
    // Return comprehensive fallback data when all APIs are unavailable
    console.warn('Using comprehensive hardcoded fallback data for all 114 Surahs');
    return [
      {
        number: 1,
        arabic: "الفاتحة",
        name: "Al-Fatiha",
        ayahs: 7,
        type: "Makki",
      },
      {
        number: 2,
        arabic: "البقرة",
        name: "Al-Baqarah",
        ayahs: 286,
        type: "Madani",
      },
      {
        number: 3,
        arabic: "آل عمران",
        name: "Ali 'Imran",
        ayahs: 200,
        type: "Madani",
      },
      {
        number: 4,
        arabic: "النساء",
        name: "An-Nisa",
        ayahs: 176,
        type: "Madani",
      },
      {
        number: 5,
        arabic: "المائدة",
        name: "Al-Ma'idah",
        ayahs: 120,
        type: "Madani",
      },
      {
        number: 6,
        arabic: "الأنعام",
        name: "Al-An'am",
        ayahs: 165,
        type: "Makki",
      },
      {
        number: 7,
        arabic: "الأعراف",
        name: "Al-A'raf",
        ayahs: 206,
        type: "Makki",
      },
      {
        number: 8,
        arabic: "الأنفال",
        name: "Al-Anfal",
        ayahs: 75,
        type: "Madani",
      },
      {
        number: 9,
        arabic: "التوبة",
        name: "At-Tawbah",
        ayahs: 129,
        type: "Madani",
      },
      { number: 10, arabic: "يونس", name: "Yunus", ayahs: 109, type: "Makki" },
      { number: 11, arabic: "هود", name: "Hud", ayahs: 123, type: "Makki" },
      { number: 12, arabic: "يوسف", name: "Yusuf", ayahs: 111, type: "Makki" },
      {
        number: 13,
        arabic: "الرعد",
        name: "Ar-Ra'd",
        ayahs: 43,
        type: "Madani",
      },
      {
        number: 14,
        arabic: "إبراهيم",
        name: "Ibrahim",
        ayahs: 52,
        type: "Makki",
      },
      {
        number: 15,
        arabic: "الحجر",
        name: "Al-Hijr",
        ayahs: 99,
        type: "Makki",
      },
      {
        number: 16,
        arabic: "النحل",
        name: "An-Nahl",
        ayahs: 128,
        type: "Makki",
      },
      {
        number: 17,
        arabic: "الإسراء",
        name: "Al-Isra",
        ayahs: 111,
        type: "Makki",
      },
      {
        number: 18,
        arabic: "الكهف",
        name: "Al-Kahf",
        ayahs: 110,
        type: "Makki",
      },
      { number: 19, arabic: "مريم", name: "Maryam", ayahs: 98, type: "Makki" },
      { number: 20, arabic: "طه", name: "Taha", ayahs: 135, type: "Makki" },
      {
        number: 21,
        arabic: "الأنبياء",
        name: "Al-Anbiya",
        ayahs: 112,
        type: "Makki",
      },
      {
        number: 22,
        arabic: "الحج",
        name: "Al-Hajj",
        ayahs: 78,
        type: "Madani",
      },
      {
        number: 23,
        arabic: "المؤمنون",
        name: "Al-Mu'minun",
        ayahs: 118,
        type: "Makki",
      },
      {
        number: 24,
        arabic: "النور",
        name: "An-Nur",
        ayahs: 64,
        type: "Madani",
      },
      {
        number: 25,
        arabic: "الفرقان",
        name: "Al-Furqan",
        ayahs: 77,
        type: "Makki",
      },
      {
        number: 26,
        arabic: "الشعراء",
        name: "Ash-Shu'ara",
        ayahs: 227,
        type: "Makki",
      },
      {
        number: 27,
        arabic: "النمل",
        name: "An-Naml",
        ayahs: 93,
        type: "Makki",
      },
      {
        number: 28,
        arabic: "القصص",
        name: "Al-Qasas",
        ayahs: 88,
        type: "Makki",
      },
      {
        number: 29,
        arabic: "العنكبوت",
        name: "Al-Ankabut",
        ayahs: 69,
        type: "Makki",
      },
      { number: 30, arabic: "الروم", name: "Ar-Rum", ayahs: 60, type: "Makki" },
      { number: 31, arabic: "لقمان", name: "Luqman", ayahs: 34, type: "Makki" },
      {
        number: 32,
        arabic: "السجدة",
        name: "As-Sajdah",
        ayahs: 30,
        type: "Makki",
      },
      {
        number: 33,
        arabic: "الأحزاب",
        name: "Al-Ahzab",
        ayahs: 73,
        type: "Madani",
      },
      { number: 34, arabic: "سبأ", name: "Saba", ayahs: 54, type: "Makki" },
      { number: 35, arabic: "فاطر", name: "Fatir", ayahs: 45, type: "Makki" },
      { number: 36, arabic: "يس", name: "Ya-Sin", ayahs: 83, type: "Makki" },
      {
        number: 37,
        arabic: "الصافات",
        name: "As-Saffat",
        ayahs: 182,
        type: "Makki",
      },
      { number: 38, arabic: "ص", name: "Sad", ayahs: 88, type: "Makki" },
      {
        number: 39,
        arabic: "الزمر",
        name: "Az-Zumar",
        ayahs: 75,
        type: "Makki",
      },
      { number: 40, arabic: "غافر", name: "Ghafir", ayahs: 85, type: "Makki" },
      {
        number: 41,
        arabic: "فصلت",
        name: "Fussilat",
        ayahs: 54,
        type: "Makki",
      },
      {
        number: 42,
        arabic: "الشورى",
        name: "Ash-Shura",
        ayahs: 53,
        type: "Makki",
      },
      {
        number: 43,
        arabic: "الزخرف",
        name: "Az-Zukhruf",
        ayahs: 89,
        type: "Makki",
      },
      {
        number: 44,
        arabic: "الدخان",
        name: "Ad-Dukhan",
        ayahs: 59,
        type: "Makki",
      },
      {
        number: 45,
        arabic: "الجاثية",
        name: "Al-Jathiyah",
        ayahs: 37,
        type: "Makki",
      },
      {
        number: 46,
        arabic: "الأحقاف",
        name: "Al-Ahqaf",
        ayahs: 35,
        type: "Makki",
      },
      {
        number: 47,
        arabic: "محمد",
        name: "Muhammad",
        ayahs: 38,
        type: "Madani",
      },
      {
        number: 48,
        arabic: "الفتح",
        name: "Al-Fath",
        ayahs: 29,
        type: "Madani",
      },
      {
        number: 49,
        arabic: "الحجرات",
        name: "Al-Hujurat",
        ayahs: 18,
        type: "Madani",
      },
      { number: 50, arabic: "ق", name: "Qaf", ayahs: 45, type: "Makki" },
      {
        number: 51,
        arabic: "الذاريات",
        name: "Adh-Dhariyat",
        ayahs: 60,
        type: "Makki",
      },
      { number: 52, arabic: "الطور", name: "At-Tur", ayahs: 49, type: "Makki" },
      {
        number: 53,
        arabic: "النجم",
        name: "An-Najm",
        ayahs: 62,
        type: "Makki",
      },
      {
        number: 54,
        arabic: "القمر",
        name: "Al-Qamar",
        ayahs: 55,
        type: "Makki",
      },
      {
        number: 55,
        arabic: "الرحمن",
        name: "Ar-Rahman",
        ayahs: 78,
        type: "Madani",
      },
      {
        number: 56,
        arabic: "الواقعة",
        name: "Al-Waqi'ah",
        ayahs: 96,
        type: "Makki",
      },
      {
        number: 57,
        arabic: "الحديد",
        name: "Al-Hadid",
        ayahs: 29,
        type: "Madani",
      },
      {
        number: 58,
        arabic: "المجادلة",
        name: "Al-Mujadila",
        ayahs: 22,
        type: "Madani",
      },
      {
        number: 59,
        arabic: "الحشر",
        name: "Al-Hashr",
        ayahs: 24,
        type: "Madani",
      },
      {
        number: 60,
        arabic: "الممتحنة",
        name: "Al-Mumtahanah",
        ayahs: 13,
        type: "Madani",
      },
      {
        number: 61,
        arabic: "الصف",
        name: "As-Saff",
        ayahs: 14,
        type: "Madani",
      },
      {
        number: 62,
        arabic: "الجمعة",
        name: "Al-Jumu'ah",
        ayahs: 11,
        type: "Madani",
      },
      {
        number: 63,
        arabic: "المنافقون",
        name: "Al-Munafiqun",
        ayahs: 11,
        type: "Madani",
      },
      {
        number: 64,
        arabic: "التغابن",
        name: "At-Taghabun",
        ayahs: 18,
        type: "Madani",
      },
      {
        number: 65,
        arabic: "الطلاق",
        name: "At-Talaq",
        ayahs: 12,
        type: "Madani",
      },
      {
        number: 66,
        arabic: "التحريم",
        name: "At-Tahrim",
        ayahs: 12,
        type: "Madani",
      },
      {
        number: 67,
        arabic: "الملك",
        name: "Al-Mulk",
        ayahs: 30,
        type: "Makki",
      },
      {
        number: 68,
        arabic: "القلم",
        name: "Al-Qalam",
        ayahs: 52,
        type: "Makki",
      },
      {
        number: 69,
        arabic: "الحاقة",
        name: "Al-Haqqah",
        ayahs: 52,
        type: "Makki",
      },
      {
        number: 70,
        arabic: "المعارج",
        name: "Al-Ma'arij",
        ayahs: 44,
        type: "Makki",
      },
      { number: 71, arabic: "نوح", name: "Nuh", ayahs: 28, type: "Makki" },
      { number: 72, arabic: "الجن", name: "Al-Jinn", ayahs: 28, type: "Makki" },
      {
        number: 73,
        arabic: "المزمل",
        name: "Al-Muzzammil",
        ayahs: 20,
        type: "Makki",
      },
      {
        number: 74,
        arabic: "المدثر",
        name: "Al-Muddaththir",
        ayahs: 56,
        type: "Makki",
      },
      {
        number: 75,
        arabic: "القيامة",
        name: "Al-Qiyamah",
        ayahs: 40,
        type: "Makki",
      },
      {
        number: 76,
        arabic: "الإنسان",
        name: "Al-Insan",
        ayahs: 31,
        type: "Madani",
      },
      {
        number: 77,
        arabic: "المرسلات",
        name: "Al-Mursalat",
        ayahs: 50,
        type: "Makki",
      },
      {
        number: 78,
        arabic: "النبأ",
        name: "An-Naba",
        ayahs: 40,
        type: "Makki",
      },
      {
        number: 79,
        arabic: "النازعات",
        name: "An-Nazi'at",
        ayahs: 46,
        type: "Makki",
      },
      { number: 80, arabic: "عبس", name: "Abasa", ayahs: 42, type: "Makki" },
      {
        number: 81,
        arabic: "التكوير",
        name: "At-Takwir",
        ayahs: 29,
        type: "Makki",
      },
      {
        number: 82,
        arabic: "الانفطار",
        name: "Al-Infitar",
        ayahs: 19,
        type: "Makki",
      },
      {
        number: 83,
        arabic: "المطففين",
        name: "Al-Mutaffifin",
        ayahs: 36,
        type: "Makki",
      },
      {
        number: 84,
        arabic: "الانشقاق",
        name: "Al-Inshiqaq",
        ayahs: 25,
        type: "Makki",
      },
      {
        number: 85,
        arabic: "البروج",
        name: "Al-Buruj",
        ayahs: 22,
        type: "Makki",
      },
      {
        number: 86,
        arabic: "الطارق",
        name: "At-Tariq",
        ayahs: 17,
        type: "Makki",
      },
      {
        number: 87,
        arabic: "الأعلى",
        name: "Al-A'la",
        ayahs: 19,
        type: "Makki",
      },
      {
        number: 88,
        arabic: "الغاشية",
        name: "Al-Ghashiyah",
        ayahs: 26,
        type: "Makki",
      },
      {
        number: 89,
        arabic: "الفجر",
        name: "Al-Fajr",
        ayahs: 30,
        type: "Makki",
      },
      {
        number: 90,
        arabic: "البلد",
        name: "Al-Balad",
        ayahs: 20,
        type: "Makki",
      },
      {
        number: 91,
        arabic: "الشمس",
        name: "Ash-Shams",
        ayahs: 15,
        type: "Makki",
      },
      {
        number: 92,
        arabic: "الليل",
        name: "Al-Layl",
        ayahs: 21,
        type: "Makki",
      },
      {
        number: 93,
        arabic: "الضحى",
        name: "Ad-Duha",
        ayahs: 11,
        type: "Makki",
      },
      {
        number: 94,
        arabic: "الشرح",
        name: "Ash-Sharh",
        ayahs: 8,
        type: "Makki",
      },
      { number: 95, arabic: "التين", name: "At-Tin", ayahs: 8, type: "Makki" },
      {
        number: 96,
        arabic: "العلق",
        name: "Al-Alaq",
        ayahs: 19,
        type: "Makki",
      },
      { number: 97, arabic: "القدر", name: "Al-Qadr", ayahs: 5, type: "Makki" },
      {
        number: 98,
        arabic: "البينة",
        name: "Al-Bayyinah",
        ayahs: 8,
        type: "Madani",
      },
      {
        number: 99,
        arabic: "الزلزلة",
        name: "Az-Zalzalah",
        ayahs: 8,
        type: "Madani",
      },
      {
        number: 100,
        arabic: "العاديات",
        name: "Al-Adiyat",
        ayahs: 11,
        type: "Makki",
      },
      {
        number: 101,
        arabic: "القارعة",
        name: "Al-Qari'ah",
        ayahs: 11,
        type: "Makki",
      },
      {
        number: 102,
        arabic: "التكاثر",
        name: "At-Takathur",
        ayahs: 8,
        type: "Makki",
      },
      { number: 103, arabic: "العصر", name: "Al-Asr", ayahs: 3, type: "Makki" },
      {
        number: 104,
        arabic: "الهمزة",
        name: "Al-Humazah",
        ayahs: 9,
        type: "Makki",
      },
      { number: 105, arabic: "الفيل", name: "Al-Fil", ayahs: 5, type: "Makki" },
      { number: 106, arabic: "قريش", name: "Quraysh", ayahs: 4, type: "Makki" },
      {
        number: 107,
        arabic: "الماعون",
        name: "Al-Ma'un",
        ayahs: 7,
        type: "Makki",
      },
      {
        number: 108,
        arabic: "الكوثر",
        name: "Al-Kawthar",
        ayahs: 3,
        type: "Makki",
      },
      {
        number: 109,
        arabic: "الكافرون",
        name: "Al-Kafirun",
        ayahs: 6,
        type: "Makki",
      },
      {
        number: 110,
        arabic: "النصر",
        name: "An-Nasr",
        ayahs: 3,
        type: "Madani",
      },
      {
        number: 111,
        arabic: "اللهب",
        name: "Al-Lahab",
        ayahs: 5,
        type: "Makki",
      },
      {
        number: 112,
        arabic: "الإخلاص",
        name: "Al-Ikhlas",
        ayahs: 4,
        type: "Makki",
      },
      {
        number: 113,
        arabic: "الفلق",
        name: "Al-Falaq",
        ayahs: 5,
        type: "Makki",
// Helper function to map language code to API language parameter
const mapLanguageToAPIForList = (languageCode) => {
  const langMap = {
    'E': 'english',
    'en': 'english',
    'english': 'english',
    'mal': 'malayalam',
    'ml': 'malayalam',
    'malayalam': 'malayalam',
    'bn': 'bangla',
    'bangla': 'bangla',
    'hi': 'hindi',
    'hindi': 'hindi',
    'ta': 'tamil',
    'tamil': 'tamil',
    'ur': 'urdu',
    'urdu': 'urdu'
  };
  return langMap[languageCode?.toLowerCase()] || null;
};

/**
 * List surah names with minimal fields for UI dropdowns or lists
 * Returns: [{ id, arabic, name, ayahs }]
 * @param {string} language - Optional language code to fetch language-specific surah names
 */
export const listSurahNames = async (language = null) => {
  try {
    // Determine which API endpoint to use based on language
    const apiLanguage = language ? mapLanguageToAPIForList(language) : null;
    const apiUrl = apiLanguage 
      ? getSurahNamesByLanguageAPI(apiLanguage)
      : SURA_NAMES_API;
    
    // Fetch from new MySQL backend API
    const response = await fetchWithTimeout(apiUrl, {}, 15000);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid response format or empty data');
    }
    
    const result = data.map((surah) => ({
      id: surah.SuraID,
      arabic: surah.ASuraName?.trim(),
      name: surah.SuraName?.trim() || surah.ESuraName?.trim(), // Use SuraName for language-specific, fallback to ESuraName
      english: surah.ESuraName?.trim(), // Keep for backward compatibility
    }));
    
    return result;
  } catch (error) {
    console.error(`❌ Failed to fetch surah names from MySQL API (language: ${language}):`, error.message);
    throw error;
  }
};

export const fetchSujudAyahs = async (language = 'english') => {
  try {
    const apiLanguage = mapLanguageToAPI(language);
    const apiUrl = getSujudAyahsAPI(apiLanguage);

    const response = await fetchWithTimeout(apiUrl, {}, 15000);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }

    return data;
  } catch (error) {
    console.error(`❌ Failed to fetch sujud ayahs from MySQL API (language: ${language}):`, error.message);
    throw error;
  }
};
/**
 * Get a single surah's names by id
 * Returns: { id, arabic, english } | null
 */
export const getSurahNameById = async (surahId) => {
  const names = await listSurahNames();
  return names.find((s) => s.id === parseInt(surahId)) || null;
};

/**
 * Build a flattened verse index from Surah data
 * Returns: [{ id: "<surah>-<verse>", surahId, arabic, english, verse }]
 */
export const listSurahVerseIndex = async (language = null) => {
  const surahs = await fetchSurahs(language ? { language } : {});
  const result = surahs.flatMap((s) =>
    Array.from({ length: s.ayahs }, (_, i) => ({
      id: `${s.number}-${i + 1}`,
      surahId: s.number,
      arabic: s.arabic,
      english: s.name,
      verse: i + 1,
    }))
  );
  return result;
};

// Fetch page ranges with fallback and caching
export const fetchPageRanges = async () => {
  // Check cache first
  const now = Date.now();
  if (
    pageRangesCache.data &&
    pageRangesCache.timestamp &&
    now - pageRangesCache.timestamp < pageRangesCache.maxAge
  ) {
    return pageRangesCache.data;
  }

  // If there's already a pending request, return that promise
  if (pageRangesCache.promise) {
    return pageRangesCache.promise;
  }

  // Create new request
  pageRangesCache.promise = (async () => {
    try {
      // Try fetching all ranges (Vite rewrites relative URLs in dev; prod hits legacy API)
      // Increased timeout to 12 seconds for slow network connections
      const response = await fetchWithTimeout(`${PAGE_RANGES_API}/all`, {}, 12000);
      
      // Double-check content type before parsing (fetchWithTimeout should catch this, but be safe)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Received HTML response instead of JSON - endpoint likely unavailable');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const result = Array.isArray(data) ? data : [];
      
      // Cache the result
      pageRangesCache.data = result;
      pageRangesCache.timestamp = Date.now();
      pageRangesCache.promise = null;
      
      return result;
    } catch (error) {
      // Clear promise on error so it can be retried
      pageRangesCache.promise = null;
      
      // Handle HTML parsing errors specifically
      if (error.message?.includes('HTML') || error.message?.includes('Unexpected token')) {
        logWarningOnce(
          'page-ranges-html',
          '⚠️ Page ranges API returned HTML (likely CORS/404), using empty array'
        );
      } else {
        // Silently fail - page ranges are non-critical and the app works without them
        // Suppress timeout warnings (expected behavior when API is slow)
        if (error.message?.includes('timeout')) {
          // Silently handle timeout - no logging needed
          return [];
        }
        // Only log non-timeout errors in development (which might indicate a real issue)
        if (import.meta.env.DEV) {
          logWarningOnce(
            'page-ranges-api-unavailable',
            '⚠️ Page ranges API unavailable (non-critical, app will continue):',
            error.message
          );
        }
      }
      // Return empty array when API is unavailable
      return [];
    }
  })();

  return pageRangesCache.promise;
};

// Fetch a single page range by pageId from the public endpoint
export const fetchPageRangeByPageId = async (pageId) => {
  try {
    const response = await fetchWithTimeout(`${PAGE_RANGES_API}/${pageId}`, {}, 8000);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // API returns an array like [{ PageId, SuraId, ayafrom, ayato, juzid }]
    if (Array.isArray(data) && data.length > 0) return data[0];
    return null;
  } catch (error) {
    logWarningOnce(
      'page-range-by-id-unavailable',
      '⚠️ Failed to fetch page range by pageId:',
      error.message
    );
    return null;
  }
};


// Get accurate ayah count for a specific surah using page ranges API
export const getSurahAyahCount = async (surahId) => {
  try {
    const pageRanges = await fetchPageRanges();
    const surahRanges = pageRanges.filter(
      (range) => range.SuraId === parseInt(surahId)
    );

    if (surahRanges.length === 0) {
      console.warn(`No page ranges found for surah ${surahId}, using fallback`);
      return null; // Will fallback to other methods
    }

    // Find the maximum ayato value for this surah
    const maxAyah = Math.max(...surahRanges.map((range) => range.ayato));
return maxAyah;
  } catch (error) {
    console.error("Error getting surah ayah count from page ranges:", error);
    return null;
  }
};


export const fetchJuzData = async () => {
  try {
    // 🧩 Fetch both APIs concurrently, but handle failures gracefully
    const [pageRangesData, surahsData] = await Promise.allSettled([
      fetchPageRanges().catch((error) => {
        // Handle HTML response errors (CORS/404 pages)
        if (error.message?.includes('HTML') || error.message?.includes('Unexpected token')) {
          console.warn("⚠️ Page ranges API returned HTML (likely CORS/404), skipping");
        } else {
          console.warn("⚠️ Failed to fetch page ranges:", error.message);
        }
        return []; // Return empty array on failure
      }),
      fetchSurahs().catch((error) => {
        // Handle HTML response errors
        if (error.message?.includes('HTML') || error.message?.includes('Unexpected token')) {
          console.warn("⚠️ Surahs API returned HTML (likely CORS/404), using fallback");
        } else {
          console.warn("⚠️ Failed to fetch surahs:", error.message);
        }
        return []; // Return empty array on failure
      }),
    ]);

    // ✅ Extract the actual data from Promise.allSettled results
    let pageRanges = pageRangesData.status === "fulfilled" ? pageRangesData.value : [];
    let surahs = surahsData.status === "fulfilled" ? surahsData.value : [];
    
    // Ensure arrays are valid (not HTML strings)
    if (!Array.isArray(pageRanges)) pageRanges = [];
    if (!Array.isArray(surahs)) surahs = [];

    // 🕌 Create surah names mapping
    const surahNamesMap = {};
    surahs.forEach((surah) => {
      surahNamesMap[surah.number] = {
        name: surah.name,
        arabic: surah.arabic,
        type: surah.type, // Makki or Madani
        totalAyas: surah.ayahs,
      };
    });

    // 📖 Group page ranges by Juz and Surah
    const juzMap = {};

    pageRanges.forEach((range) => {
      const juzId = range.juzid;
      const suraId = range.SuraId;

      if (!juzMap[juzId]) juzMap[juzId] = {};
      if (!juzMap[juzId][suraId]) juzMap[juzId][suraId] = [];

      juzMap[juzId][suraId].push({
        ayaFrom: range.ayafrom,
        ayaTo: range.ayato,
        pageId: range.PageId,
      });
    });

    // 🧩 Transform to final structured Juz data
    const transformedJuzData = [];

    Object.keys(juzMap).forEach((juzId) => {
      const juzSurahs = [];

      Object.keys(juzMap[juzId]).forEach((suraId) => {
        const ranges = juzMap[juzId][suraId];
        const surahInfo = surahNamesMap[parseInt(suraId)];

        if (surahInfo) {
          const verseRanges = ranges
            .map((range) =>
              range.ayaFrom === range.ayaTo
                ? `${range.ayaFrom}`
                : `${range.ayaFrom}-${range.ayaTo}`
            )
            .join(", ");

          juzSurahs.push({
            number: parseInt(suraId),
            name: surahInfo.name,
            arabic: surahInfo.arabic,
            verses: verseRanges,
            type: surahInfo.type,
            ayahs: surahInfo.totalAyas,
          });
        }
      });

      juzSurahs.sort((a, b) => a.number - b.number);

      if (juzSurahs.length > 0) {
        transformedJuzData.push({
          id: parseInt(juzId),
          title: `Juz ${juzId}`,
          surahs: juzSurahs,
        });
      }
    });

    // Sort all Juz in ascending order
    transformedJuzData.sort((a, b) => a.id - b.id);

    // ✅ Final return
    return {
      juzData: transformedJuzData,
      surahNames: surahNamesMap,
    };
  } catch (error) {
    console.error("❌ Failed to fetch Juz data:", error.message);
    throw new Error(`Failed to fetch Juz data: ${error.message}`);
  }
};

// Fetch audio translations for a specific Surah or Ayah
const normalizeQuranayaResponse = (payload) => {
  const rows = Array.isArray(payload)
    ? payload
    : payload
      ? [payload]
      : [];

  const normalizeNumber = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return rows.map((row = {}) => {
    const normalizedSurah = normalizeNumber(row.suraid ?? row.SuraId ?? row.SuraID);
    const normalizedAyah = normalizeNumber(row.ayaid ?? row.AyaId ?? row.AyaID);
    const normalizedConti = normalizeNumber(
      row.contiayano ??
      row.contiAyaNo ??
      row.ayaid ??
      row.AyaId ??
      row.AyaID
    );

    return {
      ...row,
      suraid: normalizedSurah ?? row.suraid,
      ayaid: normalizedAyah ?? row.ayaid,
      contiayano: normalizedConti ?? row.contiayano ?? normalizedAyah,
    };
  });
};

const buildMysqlApiBase = () => {
  if (API_BASE_PATH) {
    return API_BASE_PATH.replace(/\/+$/, '');
  }

  if (API_BASE_URL) {
    const sanitizedBase = API_BASE_URL.replace(/\/+$/, '');
    return `${sanitizedBase}/api/v1`;
  }

  return null;
};

const fetchFromMysqlQuranaya = async (surahId, ayahNumber = null) => {
  const apiBase = buildMysqlApiBase();
  if (!apiBase) {
    throw new Error('MySQL API base path is not configured');
  }

  const endpoint = `${apiBase}/malayalam/quranaya/${surahId}${ayahNumber ? `/${ayahNumber}` : ''}`;
  const timeout = ayahNumber ? 15000 : 20000; // 20 seconds for full surah, 15 seconds for single ayah
  const response = await fetchWithTimeout(endpoint, {}, timeout);
  if (!response.ok) {
    // 404 means the ayah/surah doesn't exist in the DB (e.g. out-of-range cross-references) — not a crash
    if (response.status === 404) return [];
    throw new Error(`MySQL quranaya error: ${response.status}`);
  }
  const data = await response.json();
  return normalizeQuranayaResponse(data);
};

// Legacy quranaya functions removed - now using MySQL API only

export const fetchAyahAudioTranslations = async (suraId, ayahNumber = null) => {
  const normalizedSurah = Number.parseInt(suraId, 10);
  const normalizedAyah = ayahNumber != null ? Number.parseInt(ayahNumber, 10) : null;

  const shouldReturnSingleRecord = Number.isFinite(normalizedAyah);
  const toReturnShape = (rows) => {
    if (!Array.isArray(rows)) {
      return rows;
    }
    if (shouldReturnSingleRecord) {
      return rows.length === 1 ? rows[0] : rows;
    }
    return rows;
  };

  // Use new MySQL API only
  const data = await fetchFromMysqlQuranaya(normalizedSurah, normalizedAyah);
  return toReturnShape(data);
};

// Fetch Urdu translation audio URL from API
// Note: Urdu translation audio files cover ranges (e.g., 1-7, 8-15)
// The API only returns audio for the LAST ayah in each range
// For other ayahs in the range, it returns 404 (which is expected and should be handled silently)
export const fetchUrduTranslationAudio = async (surahId, ayahId) => {
  try {
    const url = `${API_BASE_PATH}/urdu/translation-audio/${surahId}/${ayahId}`;
    const response = await fetch(url);
    if (!response.ok) {
      // 404 is expected for ayahs that are not the last in their range
      // Silently return null without logging errors
      if (response.status === 404) {
        return null;
      }
      // Only log non-404 errors for debugging
      if (import.meta?.env?.DEV) {
        console.warn(`[fetchUrduTranslationAudio] HTTP ${response.status} for ${url}`);
      }
      return null;
    }
    const data = await response.json();
    // Handle both single object and array response
    // Single ayah: { "surah": 1, "ayah": 1, "audio_url": "..." }
    // All ayahs: { "audio": [{ "surah": 1, "ayah": 1, "audio_url": "..." }, ...] }
    if (Array.isArray(data.audio)) {
      return data.audio[0]?.audio_url || null;
    }
    return data.audio_url || null;
  } catch (error) {
    // Network errors or other issues - only log in dev mode
    if (import.meta?.env?.DEV) {
      console.warn(`[fetchUrduTranslationAudio] Error for surah ${surahId}, ayah ${ayahId}:`, error);
    }
    return null;
  }
};

// Fetch Urdu interpretation audio URL from API
// Note: Urdu interpretation audio files may also cover ranges
// The API only returns audio for the LAST ayah in each range
// For other ayahs in the range, it returns 404 (which is expected and should be handled silently)
export const fetchUrduInterpretationAudio = async (surahId, ayahId) => {
  try {
    const url = `${API_BASE_PATH}/urdu/interpretation-audio/${surahId}/${ayahId}`;
    const response = await fetch(url);
    if (!response.ok) {
      // 404 is expected for ayahs that are not the last in their range
      // Silently return null without logging errors
      if (response.status === 404) {
        return null;
      }
      // Only log non-404 errors for debugging
      if (import.meta?.env?.DEV) {
        console.warn(`[fetchUrduInterpretationAudio] HTTP ${response.status} for ${url}`);
      }
      return null;
    }
    const data = await response.json();
    // Handle both single object and array response
    // Single ayah: { "surah": 1, "ayah": 1, "audio_url": "..." }
    // All ayahs: { "audio": [{ "surah": 1, "ayah": 1, "audio_url": "..." }, ...] }
    if (Array.isArray(data.audio)) {
      return data.audio[0]?.audio_url || null;
    }
    return data.audio_url || null;
  } catch (error) {
    // Network errors or other issues - only log in dev mode
    if (import.meta?.env?.DEV) {
      console.warn(`[fetchUrduInterpretationAudio] Error for surah ${surahId}, ayah ${ayahId}:`, error);
    }
    return null;
  }
};

// Fetch Arabic verses in Uthmani script from MySQL database via API
const formatArabicVerses = (verses, surahId) => {
  return verses.map((verse, index) => {
    const ayahNumber = verse?.ayah ?? verse?.verse_number ?? verse?.id ?? index + 1;
    return {
      id: ayahNumber,
      verse_number: ayahNumber,
      verse_key: `${surahId}:${ayahNumber}`,
      text_uthmani: verse?.text_uthmani ?? verse?.AyaHText ?? '',
      text_simple: verse?.text_simple ?? verse?.AyaNText ?? '',
    };
  });
};

const fetchArabicVersesLegacy = async (surahId) => {
  // Legacy per-ayah fallback used if the new endpoint is unavailable
  const surahTranslations = await fetch(`${API_BASE_PATH}/bangla/surah/${surahId}`);
  if (!surahTranslations.ok) {
    throw new Error(`HTTP error! status: ${surahTranslations.status}`);
  }
  const translationsData = await surahTranslations.json();
  const verseCount = translationsData.count || translationsData.translations?.length || 0;

  const versePromises = [];
  for (let ayah = 1; ayah <= verseCount; ayah++) {
    versePromises.push(
      fetch(`${API_BASE_PATH}/arabic/text/${surahId}/${ayah}`)
        .then(res => res.ok ? res.json() : null)
        .catch(() => null)
    );
  }

  const arabicVerses = await Promise.all(versePromises);
  return arabicVerses
    .filter(Boolean)
    .map((verse, index) => ({
      ayah: verse.ayah ?? index + 1,
      text_uthmani: verse.text_uthmani || '',
      text_simple: verse.text_simple || ''
    }));
};

export const fetchArabicVerses = async (surahId, options = {}) => {
  try {
    const url = new URL(`${API_BASE_PATH}/arabic/surah/${surahId}`);
    if (options.page) {
      url.searchParams.append('page', options.page);
    }
    if (options.limit) {
      url.searchParams.append('limit', options.limit);
    } else if (options.pageSize) {
      url.searchParams.append('pageSize', options.pageSize);
    }

    const response = await fetchWithTimeout(url.toString(), {}, 20000);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const rawVerses = Array.isArray(data?.verses) ? data.verses : Array.isArray(data) ? data : [];
    const normalized = formatArabicVerses(rawVerses, surahId);

    if (options.page) {
      return {
        verses: normalized,
        pagination: data?.pagination || null,
        count: data?.count ?? normalized.length,
      };
    }

    return normalized;
  } catch (error) {
    console.error("Failed to fetch Arabic verses from MySQL API:", error.message);

    try {
      const legacyVerses = await fetchArabicVersesLegacy(surahId);
      if (options.page) {
        const page = options.page || 1;
        const limit = options.limit || options.pageSize || 20;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginated = formatArabicVerses(legacyVerses.slice(startIndex, endIndex), surahId);
        return {
          verses: paginated,
          pagination: {
            page,
            limit,
            totalItems: legacyVerses.length,
            totalPages: Math.ceil(legacyVerses.length / limit),
            hasNext: endIndex < legacyVerses.length,
            hasPrev: page > 1,
            from: paginated[0]?.verse_number ?? null,
            to: paginated[paginated.length - 1]?.verse_number ?? null,
          },
        };
      }

      return formatArabicVerses(legacyVerses, surahId);
    } catch (fallbackError) {
      console.error("Legacy Arabic fallback failed:", fallbackError.message);
      throw error;
    }
  }
};

export const fetchArabicVersesWithPage = async (surahId, page = 1, limit = 20) => {
  return fetchArabicVerses(surahId, { page, limit });
};

// Fetch verses for a specific page based on page ranges
export const fetchVersesForPage = async (surahId, pageId) => {
  try {
    // Prefer fetching just the required page's range
    let pageRange = await fetchPageRangeByPageId(pageId);
    if (!pageRange) {
      // Fallback: fetch all ranges (if available) and locate the match
      const pageRanges = await fetchPageRanges();
      pageRange = pageRanges.find(
        (range) => range.PageId === pageId && range.SuraId === parseInt(surahId)
      );
    }

    if (!pageRange) {
      throw new Error(
        `No page range found for page ${pageId} in surah ${surahId}`
      );
    }

    // Fetch verses from MySQL database via API for the specific verse range
    const verseStart = pageRange.ayafrom;
    const verseEnd = pageRange.ayato;

    // Fetch Arabic text for all verses in the range
    const versePromises = [];
    for (let ayah = verseStart; ayah <= verseEnd; ayah++) {
      versePromises.push(
        fetch(`${API_BASE_PATH}/arabic/text/${surahId}/${ayah}`)
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      );
    }

    const arabicVerses = await Promise.all(versePromises);
    
    // Format to match expected structure
    const filteredVerses = arabicVerses
      .filter((verse, index) => verse !== null)
      .map((verse, index) => ({
        id: verseStart + index,
        verse_number: verseStart + index,
        verse_key: `${surahId}:${verseStart + index}`,
        text_uthmani: verse.text_uthmani || '',
        text_simple: verse.text_simple || ''
      }));

    return {
      verses: filteredVerses || [],
      pageRange: pageRange,
      verseStart: verseStart,
      verseEnd: verseEnd,
    };
  } catch (error) {
    console.error("Error fetching verses for page:", error);
    throw error;
  }
};

// Get all pages for a specific surah
export const getSurahPages = async (surahId) => {
  try {
    const pageRanges = await fetchPageRanges();
    const surahPages = pageRanges
      .filter((range) => range.SuraId === parseInt(surahId))
      .sort((a, b) => a.PageId - b.PageId);

    return surahPages;
  } catch (error) {
    console.error("Error getting surah pages:", error);
    throw error;
  }
};

// Add these functions to your existing apifunction.js file

const normalizeThafheemPrefaceLanguage = (language) => {
  const raw = (language ?? "").toString().trim().toLowerCase();

  if (["mal", "ml", "m", "malayalam", "മലയാളം"].includes(raw)) {
    return "M";
  }

  if (["e", "en", "eng", "english"].includes(raw)) {
    return "E";
  }

  return "E";
};

const normalizeSurahInfoLanguages = (language) => {
  const raw = (language ?? "").toString().trim().toLowerCase();

  const quranLanguageMap = {
    e: "en",
    en: "en",
    eng: "en",
    english: "en",
    mal: "en",
    ml: "en",
    m: "en",
    malayalam: "en",
    "മലയാളം": "en",
    bn: "bn",
    bangla: "bn",
    ta: "ta",
    tamil: "ta",
    ur: "ur",
    urdu: "ur",
    hi: "hi",
    hindi: "hi",
  };

  const quranLanguage = quranLanguageMap[raw] || "en";
  const prefaceLanguage = normalizeThafheemPrefaceLanguage(language);

  return {
    quranLanguage,
    prefaceLanguage,
  };
};

// Fetch basic chapter info from Quran.com API
export const fetchCompleteSurahInfo = async (surahId, language = "en") => {
  try {
    const { quranLanguage, prefaceLanguage } =
      normalizeSurahInfoLanguages(language);


    // Fetch surahs once and reuse for both basicChapter and surahsData
    const surahs = await fetchSurahs();
    const surahsData = surahs.find((s) => s.number === parseInt(surahId));

    // Only fetch preface + metadata from MySQL (suratable)
    const [surahMeta, thafheemInfo, hindiIntro, urduIntroData, urduIntroAudioData, banglaIntroData, tamilIntroData] = await Promise.all([
      fetchSurahMetadata(surahId, quranLanguage).catch(() => null),
      fetchThafheemPreface(surahId, prefaceLanguage).catch(() => null),
      quranLanguage === "hi"
        ? fetchHindiSurahIntro(surahId).catch(() => null)
        : Promise.resolve(null),
      quranLanguage === "ur"
        ? fetchUrduSurahIntro(surahId).catch(() => null)
        : Promise.resolve(null),
      quranLanguage === "ur"
        ? fetchUrduSurahIntroAudio(surahId).catch(() => null)
        : Promise.resolve(null),
      quranLanguage === "bn"
        ? fetchBanglaSurahIntro(surahId).catch(() => null)
        : Promise.resolve(null),
      quranLanguage === "ta"
        ? fetchTamilSurahIntro(surahId).catch(() => null)
        : Promise.resolve(null),
    ]);


    return {
      basic: surahMeta,
      detailed:
        quranLanguage === "hi" && hindiIntro
          ? {
              text: hindiIntro.intro || "",
              language: "hi",
            }
          : null, // chapter-info endpoint intentionally skipped
      thafheem: thafheemInfo,
      surah: surahsData,
      urduIntro: quranLanguage === "ur" && urduIntroData?.sections
        ? urduIntroData.sections
        : null,
      urduIntroAudioUrl: quranLanguage === "ur" && urduIntroAudioData?.audio_url
        ? urduIntroAudioData.audio_url
        : null,
      banglaIntro: quranLanguage === "bn" && banglaIntroData?.sections
        ? banglaIntroData.sections
        : null,
      tamilIntro: quranLanguage === "ta" && tamilIntroData?.sections
        ? tamilIntroData.sections
        : null,
    };
  } catch (error) {
    console.error("Error fetching complete surah info:", error);
    throw error;
  }
};

// Fetch basic chapter data from our MySQL database
export const fetchBasicChapterData = async (chapterId, language = "en", surahsData = null) => {
  try {
    // Use provided surahs data or fetch if not provided
    const surahs = surahsData || await fetchSurahs();
    const chapter = surahs.find((s) => s.number === parseInt(chapterId));

    if (!chapter) {
      throw new Error(`Chapter with ID ${chapterId} not found`);
    }

    // Format to match expected structure
    return {
      id: chapter.number,
      name_arabic: chapter.arabic,
      name_simple: chapter.name,
      verses_count: chapter.ayahs,
      revelation_place: chapter.type === "Makki" ? "makkah" : "madina",
      revelation_order: chapter.number,
      bismillah_pre: chapter.number !== 1 && chapter.number !== 9
    };
  } catch (error) {
    console.error("Error fetching basic chapter data from MySQL API:", error.message);
    return null;
  }
};

// Fetch Malayalam surah intro for blockwise (status=0 data with Arabic script)
export const fetchMalayalamSurahIntro = async (surahId) => {
  const apiBase = CONFIG_API_BASE_PATH || API_BASE_PATH;
  // Try multiple bases in case primary API doesn't have this endpoint deployed
  const bases = Array.from(new Set([apiBase, LEGACY_TFH_BASE, LEGACY_TFH_REMOTE_BASE].filter(Boolean)));
  
  for (const base of bases) {
    try {
      const response = await fetchWithTimeout(
        `${base}/malayalam/surah-intro/${surahId}`,
        {},
        8000
      );
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Try next base
    }
  }

  // Fallback: try /preface/:surah/M endpoint and adapt response format
  for (const base of bases) {
    try {
      const response = await fetchWithTimeout(
        `${base}/preface/${surahId}/M`,
        {},
        8000
      );
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return {
            surah: parseInt(surahId),
            sections: data.map(entry => ({
              subtitle: entry.PrefaceSubTitle || null,
              text: entry.PrefaceText || ''
            }))
          };
        }
      }
    } catch {
      // Try next base
    }
  }

  return null;
};

// Fetch chapter info (detailed) from MySQL database
export const fetchChapterInfo = async (chapterId, language = "en") => {
  try {
    const apiBase = CONFIG_API_BASE_PATH || API_BASE_PATH;
    
    // Normalize language code for API
    const normalizedLang = language === "mal" ? "mal" : language === "M" ? "mal" : language.toLowerCase();
    
    const url = `${apiBase}/chapter-info/${chapterId}/${normalizedLang}`;
    

    const response = await fetchWithTimeout(url, {}, 8000);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    

    return data;
  } catch (error) {
    console.warn(
      `Chapter info fetch failed for chapter ${chapterId}:`,
      error.message
    );
    return null;
  }
};

export const fetchThafheemPreface = async (suraId, language = "E") => {
  const apiBase = CONFIG_API_BASE_PATH || API_BASE_PATH;
  const preferredLanguage = normalizeThafheemPrefaceLanguage(language);
  const languageFallbackOrder =
    preferredLanguage === "E" ? ["E"] : [preferredLanguage, "E"];

  const cacheKey = `${suraId}|${preferredLanguage}`;
  if (thafheemPrefaceCache.has(cacheKey)) {
    const cached = thafheemPrefaceCache.get(cacheKey);
    return cached;
  }

  // Preface is a new API, so prioritize API_BASE_PATH over legacy bases
  const baseCandidates = Array.from(
    new Set(
      [apiBase, LEGACY_TFH_BASE, LEGACY_TFH_REMOTE_BASE].filter(Boolean)
    )
  );

  const triedUrls = new Set();

  const tryFetch = async (url, logLabel) => {
    if (triedUrls.has(url)) {
      return null;
    }
    triedUrls.add(url);

    try {
      const response = await fetchWithTimeout(url, {}, 8000);

      if (response.status === 404) {
        return { notFound: true };
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No preface data found");
      }

      const result = data[0];
      const sections = data.map((entry, index) => {
        const subtitle = entry?.PrefaceSubTitle?.toString().trim() || "";
        const text = entry?.PrefaceText?.toString().trim() || "";

        return {
          order: index,
          subtitle,
          text,
        };
      });

      const combinedPrefaceText = sections
        .map((section) => {
          if (!section.subtitle && !section.text) {
            return "";
          }

          if (section.subtitle && section.text) {
            return `<h2>${section.subtitle}</h2>\n${section.text}`;
          }

          if (section.subtitle) {
            return `<h2>${section.subtitle}</h2>`;
          }

          return section.text;
        })
        .filter(Boolean)
        .join("\n\n");

      const enrichedResult = {
        ...result,
        PrefaceText: combinedPrefaceText || result?.PrefaceText || "",
        PrefaceSections: sections,
        PrefaceEntries: data,
      };

      return { data: enrichedResult };
    } catch (error) {
      console.warn(
        `Thafheem preface (${logLabel}) failed for Surah ${suraId}:`,
        error.message
      );
      return null;
    }
  };

  for (const base of baseCandidates) {
    for (const langCode of languageFallbackOrder) {
      const languageVariants = expandPrefaceLanguageVariants(langCode);

      for (const variant of languageVariants) {
        const url = buildPrefaceUrl(base, suraId, variant);
        const logLabel = variant ? `lang=${variant}` : "lang=default";
        const result = await tryFetch(url, logLabel);

        if (result?.data) {
          thafheemPrefaceCache.set(cacheKey, result.data);
          return result.data;
        }

        // If this exact variant is not found, try the next variant/base
        if (result?.notFound) {
          continue;
        }
      }
    }

    // Fallback to legacy endpoint without language suffix
    const legacyUrl = buildPrefaceUrl(base, suraId);
    const legacyResult = await tryFetch(legacyUrl, "legacy");
    if (legacyResult?.data) {
      thafheemPrefaceCache.set(cacheKey, legacyResult.data);
      return legacyResult.data;
    }
  }

  console.error(
    `Error fetching Thafheem preface: all attempts failed for Surah ${suraId}`
  );
  thafheemPrefaceCache.set(cacheKey, null);
  return null;
};


// Block-wise reading API functions

// Fetch ayah ranges for block-based reading structure
const normalizeAyaRangeLanguage = (language) => {
  const code = (language || 'mal').toString().trim().toLowerCase();

  const apiLanguageMap = {
    mal: 'malayalam',
    ml: 'malayalam',
    malayalam: 'malayalam',
    e: 'english',
    en: 'english',
    english: 'english',
    bn: 'bangla',
    bangla: 'bangla',
    hi: 'hindi',
    hindi: 'hindi',
    ta: 'tamil',
    tamil: 'tamil',
    ur: 'urdu',
    urdu: 'urdu',
  };

  return apiLanguageMap[code] || 'malayalam';
};

export const fetchAyaRanges = async (surahId, language = 'mal') => {
  const apiLanguage = normalizeAyaRangeLanguage(language);
  const url = `${API_BASE_PATH}/${apiLanguage}/ayaranges/${surahId}`;
  
  // Use longer timeout for English as it may take longer to query the database
  const timeout = (apiLanguage.toLowerCase() === 'english' || apiLanguage.toLowerCase() === 'e') ? 30000 : 20000;
  
  const response = await fetchWithTimeout(url, {}, timeout);
  
  // Check if response is HTML (likely an error page)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/html')) {
    throw new Error('Received HTML response instead of JSON - endpoint likely unavailable or CORS blocked');
  }
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  // Try to parse JSON, but catch HTML responses that don't have correct content-type
  try {
    const text = await response.text();
    // Check if response text starts with HTML
    if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
      throw new Error('Received HTML response instead of JSON - endpoint likely unavailable or CORS blocked');
    }
    const data = JSON.parse(text);
    return data;
  } catch (parseError) {
    if (parseError.message?.includes('HTML')) {
      throw parseError;
    }
    throw new Error(`Failed to parse JSON response: ${parseError.message}`);
  }
};

// Fetch translation for a specific ayah range
// Fetch translations for specified ayah range using the new MySQL backend API
export const fetchAyahTranslations = async (surahId, range, language = "english") => {
  try {
    // Normalize language code (E -> english, mal -> malayalam)
    const normalizedLang = language === "E" ? "english" : (language === "mal" ? "malayalam" : language);
    const apiBase = CONFIG_API_BASE_PATH || API_BASE_PATH;
    const url = `${apiBase}/ayatransl/${surahId}/${range}/${normalizedLang}`;

    const response = await fetchWithTimeout(url, {}, 8000);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error(`Error fetching translation for ${surahId}:${range}:${language}:`, error.message);
    return null; // return fallback or null instead of throwing
  }
};

// Fetch structured Quranic text with audio URLs for block-wise reading
export const fetchQuranTextWithStructure = async (surahId, range = null) => {
  const url = range
    ? `${QURAN_TEXT_API}/${surahId}/${range}`
    : `${QURAN_TEXT_API}/${surahId}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data;
};

// Fetch complete block-wise data for a surah
export const fetchBlockWiseData = async (surahId) => {
  try {
    const [ayaRanges, quranText, surahsData] = await Promise.all([
      fetchAyaRanges(surahId).catch(() => null),
      fetchQuranTextWithStructure(surahId).catch(() => null),
      fetchSurahs().then((surahs) =>
        surahs.find((s) => s.number === parseInt(surahId))
      ),
    ]);

    return {
      ayaRanges: ayaRanges || [],
      quranText: quranText || [],
      surahInfo: surahsData || {
        number: parseInt(surahId),
        arabic: "Unknown Surah",
      },
    };
  } catch (error) {
    console.error("Error fetching block-wise data:", error);
    throw error;
  }
};

// Fetch word-by-word meaning from MySQL database via API
export const fetchWordByWordMeaning = async (
  surahId,
  verseId,
  language = "en"
) => {
  // Map language codes to our API language names
  const getLanguageCode = (langCode) => {
    const langMap = {
      'mal': 'malayalam',
      'ml': 'malayalam',
      'E': 'english',
      'en': 'english',
      'ta': 'tamil',
      'hi': 'hindi',
      'ur': 'urdu',
      'bangla': 'bangla',
      'bn': 'bangla',
      'ar': 'arabic'
    };
    return langMap[langCode?.toLowerCase()] || 'english';
  };

  const apiLanguage = getLanguageCode(language);
  
  try {
    const url = `${API_BASE_PATH}/${apiLanguage}/word-by-word/${surahId}/${verseId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform to match expected format
    // API returns words with fields like: WordPhrase, WordMeaning, MalMeaning, EngMeaning, etc.
    return {
      verse_key: `${surahId}:${verseId}`,
      words: data.words?.map((word, index) => {
        // Get meaning based on language
        let meaning = '';
        if (apiLanguage === 'malayalam') {
          meaning = word.MalMeaning || word.WordMeaning || '';
        } else if (apiLanguage === 'english') {
          meaning = word.EngMeaning || word.WordMeaning || '';
        } else {
          // For other languages, try WordMeaning first, then language-specific fields
          meaning = word.WordMeaning || word.MalMeaning || word.EngMeaning || '';
        }
        
        return {
          id: word.WordId || word.id || index + 1,
          position: word.WordId || word.id || index + 1,
          text_uthmani: word.text_uthmani || word.WordPhrase || '',
          text_simple: word.text_simple || word.WordPhrase || '',
          WordPhrase: word.WordPhrase || word.text_uthmani || word.text_simple || '', // Keep original WordPhrase for matching
          translation: {
            text: meaning || word.translation?.text || '',
            language_name: data.language || apiLanguage,
            resource_name: `Thafheem ${apiLanguage} Database`
          }
        };
      }) || []
    };
  } catch (error) {
    console.error("Error fetching word-by-word meaning from MySQL API:", error);
    throw error;
  }
};

// Fetch word meanings from MySQL database via API (generic - returns all available word meanings)
export const fetchThafheemWordMeanings = async (surahId, verseId) => {
  // Try to fetch from Malayalam word-by-word endpoint (most common use case)
  // If that fails, try English as fallback
  const languages = ['malayalam', 'english'];
  
  for (const lang of languages) {
    try {
      const url = `${API_BASE_PATH}/${lang}/word-by-word/${surahId}/${verseId}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        // Transform to match expected format - return array directly for Thafheem section
        const transformedWords = data.words?.map((word, index) => ({
          WordId: word.WordId || word.id || index + 1,
          WordPhrase: word.text_uthmani || word.WordPhrase || word.text_simple || '',
          Meaning: word.MalMeaning || word.WordMeaning || word.EngMeaning || word.translation?.text || '',
          id: word.WordId || word.id || index + 1,
          position: word.WordId || word.id || index + 1,
          text_uthmani: word.text_uthmani || word.WordPhrase || '',
          text_simple: word.text_simple || word.WordPhrase || '',
          translation: {
            text: word.WordMeaning || word.MalMeaning || word.EngMeaning || word.translation?.text || '',
            language_name: lang,
            resource_name: `Thafheem ${lang} Database`
          }
        })) || [];
        
        return transformedWords;
      }
    } catch (error) {
      // Continue to next language
      continue;
    }
  }
  
  // If all languages fail, return empty array
  console.warn("Could not fetch word meanings from MySQL API for any language");
  return [];
};

// Fetch a note by id from MySQL database via Thafheem API
export const fetchNoteById = async (noteId) => {
  const id = String(noteId).trim();
  
  // Use new API endpoint from API_BASE_PATH (MySQL database)
  const apiBase = CONFIG_API_BASE_PATH || API_BASE_PATH;
  if (!apiBase) {
    throw new Error("API base path not configured");
  }

  const url = `${apiBase.replace(/\/+$/, '')}/notes/${encodeURIComponent(id)}`;

  try {
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          Accept: "application/json",
        },
      },
      5000
    ); // 5 second timeout
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Note not found: ${id}`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn("Error fetching note by id:", error.message);
    // Re-throw error to let caller handle it
    throw error;
  }
};

// Fetch interpretation for specific verse from MySQL database via API
export const fetchInterpretation = async (
  surahId,
  verseId,
  interpretationNo = 1,
  language = "en"
) => {
  // Map language codes to our API language names
  const getLanguageCode = (lang) => {
    const langMap = {
      'en': 'english',
      'e': 'english',
      'mal': 'malayalam',
      'ml': 'malayalam',
      'hi': 'hindi',
      'bn': 'bangla',
      'bangla': 'bangla',
      'ta': 'tamil',
      'ur': 'urdu'
    };
    return langMap[String(lang).toLowerCase()] || 'english';
  };

  const apiLanguage = getLanguageCode(language);
  
  try {
    // For English blockwise: use /api/english/interpretation/{surahId}/{interpretationNo}
    const url = (apiLanguage === 'english' && interpretationNo)
      ? `${API_BASE_PATH}/${apiLanguage}/interpretation/${surahId}/${interpretationNo}`
      : `${API_BASE_PATH}/${apiLanguage}/interpretation/${surahId}/${verseId}${interpretationNo ? `?explanationNo=${interpretationNo}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Handle new API format: single object with interpretation field (for all languages)
    if (interpretationNo && data.interpretation) {
      return {
        Interpretation: data.interpretation || '',
        InterpretationNo: data.interpretationNo || interpretationNo,
        surahId: parseInt(data.surah || surahId, 10),
        verseId: parseInt(data.fromAyah || verseId, 10),
        toAyah: parseInt(data.toAyah || verseId, 10)
      };
    }
    
    // Handle old format: explanations array
    if (data.explanations && data.explanations.length > 0) {
      const explanation = interpretationNo 
        ? data.explanations.find(exp => 
            exp.explanation_no_en == interpretationNo || 
            exp.explanation_no_local == interpretationNo
          ) || data.explanations[0]
        : data.explanations[0];
      
      return {
        Interpretation: explanation.explanation || '',
        InterpretationNo: explanation.explanation_no_en || explanation.explanation_no_local || interpretationNo,
        surahId: parseInt(surahId),
        verseId: parseInt(verseId)
      };
    }
    
    return null;
  } catch (error) {
    console.error("Interpretation fetch failed from MySQL API:", error.message);
    return null;
  }
};


// Fetch interpretation for verse range from MySQL database via API
export const fetchInterpretationRange = async (
  surahId,
  range,
  interpretationNo = 1,
  language = "en"
) => {
  // Map language codes to our API language names
  const getLanguageCode = (lang) => {
    const langMap = {
      'en': 'english',
      'e': 'english',
      'mal': 'malayalam',
      'ml': 'malayalam',
      'hi': 'hindi',
      'bn': 'bangla',
      'bangla': 'bangla',
      'ta': 'tamil',
      'ur': 'urdu'
    };
    return langMap[String(lang).toLowerCase()] || 'english';
  };

  const apiLanguage = getLanguageCode(language);
  
  // Parse range (e.g., "1-7" or "1")
  const [fromAyah, toAyah] = range.includes('-') 
    ? range.split('-').map(Number)
    : [parseInt(range), parseInt(range)];

  try {
    // For blockwise: use single endpoint call when interpretationNo is provided
    if (interpretationNo) {
      const url = `${API_BASE_PATH}/${apiLanguage}/interpretation/${surahId}/${interpretationNo}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Handle new API format: single object with interpretation field
      if (data.interpretation) {
        return [{
          Interpretation: data.interpretation || '',
          InterpretationNo: data.interpretationNo || interpretationNo,
          surahId: parseInt(data.surah || surahId, 10),
          verseId: parseInt(data.fromAyah || fromAyah, 10),
          toAyah: parseInt(data.toAyah || toAyah, 10)
        }];
      }
      
      // Handle old format: explanations array
      if (data.explanations && data.explanations.length > 0) {
        const explanation = data.explanations.find(exp => 
          exp.explanation_no_en == interpretationNo || 
          exp.explanation_no_local == interpretationNo
        ) || data.explanations[0];
        
        return [{
          Interpretation: explanation.explanation || '',
          InterpretationNo: explanation.explanation_no_en || explanation.explanation_no_local || interpretationNo,
          surahId: parseInt(surahId, 10),
          verseId: fromAyah
        }];
      }
      
      return [];
    }

    // For other cases: fetch interpretations for each verse in the range
    const promises = [];
    for (let ayah = fromAyah; ayah <= toAyah; ayah++) {
      const url = `${API_BASE_PATH}/${apiLanguage}/interpretation/${surahId}/${ayah}`;
      promises.push(
        fetch(url)
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      );
    }

    const results = await Promise.all(promises);
    
    // Format results to match expected structure
    const seen = new Set();
    return results
      .map((data, index) => {
        if (!data || !Array.isArray(data.explanations)) {
          return null;
        }

        const desiredNumber = interpretationNo != null ? String(interpretationNo) : null;
        const matchedExplanation = desiredNumber
          ? data.explanations.find(exp => {
              const localNo = exp.explanation_no_local ?? exp.InterpretationNo ?? exp.interptn_no;
              const globalNo = exp.explanation_no_en ?? exp.InterpretationNo ?? exp.interptn_no;
              return String(localNo ?? globalNo ?? '').trim() === desiredNumber.trim();
            })
          : data.explanations[0];

        const explanation = matchedExplanation || data.explanations[0];
        if (!explanation) {
          return null;
        }

        const rawInterpretationNumber =
          explanation.explanation_no_en ??
          explanation.explanation_no_local ??
          explanation.InterpretationNo ??
          explanation.interptn_no ??
          interpretationNo;

        const normalizedInterpretationNumber = rawInterpretationNumber != null
          ? String(rawInterpretationNumber).trim()
          : '';

        if (!normalizedInterpretationNumber) {
          return null;
        }

        const dedupeKey = normalizedInterpretationNumber;
        if (seen.has(dedupeKey)) {
          return null;
        }
        seen.add(dedupeKey);

        return {
          Interpretation: explanation.explanation || '',
          InterpretationNo: normalizedInterpretationNumber,
          surahId: parseInt(surahId, 10),
          verseId: fromAyah + index
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error("Error fetching interpretation range from MySQL API:", error);
    throw error;
  }
};

// Additional helper function to fetch multiple interpretations for a verse
// Updated: v2.5 - Fixed to use correct verse-specific interpretation endpoints
// Cache for interpretations to prevent redundant API calls
const interpretationCache = new Map();
const INTERPRETATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getInterpretationCacheKey = (surahId, verseId, language) => {
  const langKey = String(language ?? "default").toLowerCase();
  return `${langKey}|${surahId}|${verseId}`;
};

export const fetchAllInterpretations = async (
  surahId,
  verseId,
  language = "E"
) => {
  const cacheKey = getInterpretationCacheKey(surahId, verseId, language);
  const now = Date.now();

  const cachedEntry = interpretationCache.get(cacheKey);
  if (cachedEntry) {
    if (cachedEntry.data && now - cachedEntry.timestamp < INTERPRETATION_CACHE_DURATION) {
      return cachedEntry.data;
    }

    if (cachedEntry.promise) {
      return cachedEntry.promise;
    }

    interpretationCache.delete(cacheKey);
  }

  const isMalayalamLanguage = String(language ?? "").toLowerCase() === "mal";

  const fetchPromise = (async () => {
    // Use MySQL API for all languages including Malayalam
    const apiLanguage = isMalayalamLanguage ? 'malayalam' : 
                       String(language ?? "").toLowerCase() === 'en' || String(language ?? "") === 'E' ? 'english' :
                       String(language ?? "").toLowerCase();
    
    try {
      // Fetch all interpretations for the verse from MySQL API
      const url = `${API_BASE_PATH}/${apiLanguage}/interpretation/${surahId}/${verseId}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.explanations || data.explanations.length === 0) {
        return [];
      }

      // Transform to match expected format
      const transformed = data.explanations.map((exp, index) => ({
        Interpretation: exp.explanation || '',
        InterpretationNo: String(exp.explanation_no_en || exp.explanation_no_local || index + 1),
        resolvedInterpretationNo: parseInt(exp.explanation_no_en || exp.explanation_no_local || index + 1, 10),
        requestedInterpretationNo: parseInt(exp.explanation_no_en || exp.explanation_no_local || index + 1, 10),
        surahId: parseInt(surahId),
        verseId: parseInt(verseId)
      }));
      return transformed;
    } catch (error) {
      console.error(`[fetchAllInterpretations] Error fetching interpretations for Surah ${surahId}, Ayah ${verseId}:`, error);
      throw error;
    }

    let maxInterpretations = 20;
    let explicitInterpretationNumbers = [];

    const allInterpretations = [];

    // Fetch interpretations up to the determined count
    const usingExplicitNumbers = explicitInterpretationNumbers.length > 0;
    const interpretationNumbersToFetch = usingExplicitNumbers
      ? explicitInterpretationNumbers
      : Array.from({ length: maxInterpretations }, (_, index) => index + 1);

    const seenInterpretationNos = new Set();

    if (usingExplicitNumbers) {
      const fetchResults = await Promise.allSettled(
        interpretationNumbersToFetch.map(async (interpretationNo) => {
          const data = await fetchInterpretation(surahId, verseId, interpretationNo, language);
          return { interpretationNo, data };
        })
      );

      fetchResults.forEach((result) => {
        if (result.status !== "fulfilled") {
          return;
        }

        const { interpretationNo, data } = result.value || {};
        // Only include interpretations that have actual content
        if (data && data.Interpretation && data.Interpretation.trim().length > 0) {
          const interpretationNumberValue =
            parseInt(data.InterpretationNo, 10) ||
            parseInt(data.Interpretation_No, 10) ||
            parseInt(data.interptn_no, 10) ||
            interpretationNo;

          // Only add if we haven't seen this interpretation number before
          // When using explicit numbers, ensure the requested number corresponds to a footnote marker
          const shouldInclude = usingExplicitNumbers 
            ? explicitInterpretationNumbers.includes(interpretationNo)
            : true;
          
          if (shouldInclude && !seenInterpretationNos.has(interpretationNumberValue)) {
            seenInterpretationNos.add(interpretationNumberValue);
            allInterpretations.push({
              ...data,
              requestedInterpretationNo: interpretationNo,
              resolvedInterpretationNo: interpretationNumberValue,
            });
          }
        }
      });
    } else {
      // Sequential fetching: try interpretations 1, 2, 3... until we get empty responses
      let consecutiveEmptyCount = 0;
      const maxConsecutiveEmpty = 2; // Stop after 2 consecutive empty responses
      
      for (const interpretationNo of interpretationNumbersToFetch) {
        try {
          const data = await fetchInterpretation(surahId, verseId, interpretationNo, language);

          // If we got valid data with interpretation text, add it
          if (data && data.Interpretation && data.Interpretation.trim().length > 0) {
            const interpretationNumberValue =
              parseInt(data.InterpretationNo, 10) ||
              parseInt(data.Interpretation_No, 10) ||
              parseInt(data.interptn_no, 10) ||
              interpretationNo;

            // Only add if we haven't seen this interpretation number before
            if (!seenInterpretationNos.has(interpretationNumberValue)) {
              seenInterpretationNos.add(interpretationNumberValue);
              allInterpretations.push({
                ...data,
                requestedInterpretationNo: interpretationNo,
                resolvedInterpretationNo: interpretationNumberValue,
              });
            }
            consecutiveEmptyCount = 0; // Reset counter on successful fetch
            continue;
          }

          // Empty response - increment counter
          consecutiveEmptyCount++;
          if (consecutiveEmptyCount >= maxConsecutiveEmpty) {
            // Stop after consecutive empty responses
            break;
          }
        } catch (error) {
          // Check if this is a "not found" type error (404, 525, etc.)
          // HTTP 525 (Cloudflare error) or 404 means interpretation doesn't exist - stop immediately
          const errorMessage = error.message || String(error);
          const isNotFoundError = errorMessage.includes('525') || 
                                  errorMessage.includes('404') ||
                                  errorMessage.includes('status: 525') ||
                                  errorMessage.includes('status: 404') ||
                                  errorMessage.includes('HTTP error! status: 525') ||
                                  errorMessage.includes('HTTP error! status: 404');
          
          if (isNotFoundError) {
            // Stop immediately on 404/525 errors - interpretation doesn't exist
            // Don't try more interpretations
            break;
          }
          
          // For other errors, increment counter and continue
          consecutiveEmptyCount++;
          if (consecutiveEmptyCount >= maxConsecutiveEmpty) {
            // Stop after consecutive errors/empty responses
            break;
          }
        }
      }
    }

    return allInterpretations;
  })();

  interpretationCache.set(cacheKey, { promise: fetchPromise });

  try {
    const result = await fetchPromise;
    const sortedResult = Array.isArray(result)
      ? [...result].sort((a, b) => {
          const aNo =
            parseInt(a?.resolvedInterpretationNo ?? a?.InterpretationNo ?? a?.Interpretation_No ?? a?.interptn_no, 10) ||
            parseInt(a?.requestedInterpretationNo, 10) ||
            0;
          const bNo =
            parseInt(b?.resolvedInterpretationNo ?? b?.InterpretationNo ?? b?.Interpretation_No ?? b?.interptn_no, 10) ||
            parseInt(b?.requestedInterpretationNo, 10) ||
            0;
          return aNo - bNo;
        })
      : result;

    interpretationCache.set(cacheKey, {
      data: sortedResult,
      timestamp: Date.now(),
    });
    return sortedResult;
  } catch (error) {
    interpretationCache.delete(cacheKey);
    throw error;
  }
};

// Fetch paginated Tafheem quiz from MySQL backend.
// seed must be kept constant per-session so ORDER BY RAND(seed) is stable
// across pages — preventing duplicate questions when navigating forward/back.
export const fetchTafheemQuizPaginated = async (page = 1, pageSize = 20, seed = 1) => {
  const url = `${QUIZ_TAFHEEM_API}?page=${page}&pageSize=${pageSize}&seed=${seed}`;
  const response = await fetchWithTimeout(url, {}, 30000);
  if (!response.ok) throw new Error(`Tafheem quiz API error: ${response.status}`);
  return response.json();
};

// Fetch quiz questions for a specific verse range — now served from MySQL backend.
export const fetchQuizQuestionsForRange = async (surahId, startVerse, endVerse) => {
  const url = `${QUIZ_BLOCK_API}/${surahId}/${startVerse}/${endVerse ?? startVerse}`;
  const response = await fetchWithTimeout(url, {}, 15000);
  if (!response.ok) throw new Error(`Block quiz API error: ${response.status}`);
  const data = await response.json();
  // Backend returns { surahId, from, to, questions: [...] }
  return data.questions || [];
};

// Transform quiz data to expected format based on actual API response
// Transform quiz data to expected format based on actual API response
export const transformQuizData = (rawData) => {
if (!Array.isArray(rawData)) {
rawData = [rawData];
  }

  const transformed = rawData.map((item, index) => {
// Extract question ID
    const questionId =
      item.id ||
      item.questionId ||
      item.question_id ||
      item.QuestionId ||
      item.qid ||
      index + 1;

    // Extract question text with more variations
    const questionText =
      item.question ||
      item.questionText ||
      item.question_text ||
      item.Quest ||
      item.Question ||
      item.QuestionText ||
      item.quest ||
      item.text ||
      "Question not available";

    // Extract correct answer with more variations
    const rawCorrectAnswer =
      item.correctAnswer ||
      item.correct_answer ||
      item.answer ||
      item.Answer ||
      item.CorrectAnswer ||
      item.correct ||
      "A";

// Handle different option formats - COMPREHENSIVE APPROACH
    let options = [];

    // Method 1: Direct options array
    if (item.options && Array.isArray(item.options)) {
options = item.options.map((opt, optIndex) => ({
        id: opt.id || opt.key || opt.letter || ["A", "B", "C", "D"][optIndex],
        text:
          opt.text ||
          opt.option ||
          opt.value ||
          opt.content ||
          (typeof opt === "string" ? opt : `Option ${optIndex + 1}`),
      }));
    }

    // Method 2: Individual option fields - COMPREHENSIVE SEARCH
    if (options.length === 0) {
// Get all possible field names for this item
      const allFields = Object.keys(item);
// Try to extract options from these fields - More comprehensive field matching
      ["A", "B", "C", "D"].forEach((letter) => {
        const possibleFields = [
          // Standard patterns
          `option${letter}`,
          `option_${letter}`,
          `Option${letter}`,
          `OPTION${letter}`,
          letter,
          letter.toLowerCase(),
          `choice${letter}`,
          `Choice${letter}`,
          `ans${letter}`,
          `answer${letter}`,
          `Answer${letter}`,
          // Additional patterns that might be used by the API
          `opt${letter}`,
          `Opt${letter}`,
          `OPT${letter}`,
          `${letter}Option`,
          `${letter}option`,
          `${letter}_option`,
          `${letter.toLowerCase()}Option`,
          `${letter.toLowerCase()}option`,
          `${letter.toLowerCase()}_option`,
          // Numbered alternatives
          `option${["A", "B", "C", "D"].indexOf(letter) + 1}`,
          `Option${["A", "B", "C", "D"].indexOf(letter) + 1}`,
          `choice${["A", "B", "C", "D"].indexOf(letter) + 1}`,
          `Choice${["A", "B", "C", "D"].indexOf(letter) + 1}`,
          // Direct field names that might contain the option text
          `${letter}Text`,
          `${letter}text`,
          `${letter}_text`,
          `text${letter}`,
          `Text${letter}`,
        ];

for (const field of possibleFields) {
          if (
            item.hasOwnProperty(field) &&
            item[field] !== undefined &&
            item[field] !== null &&
            item[field] !== ""
          ) {
            const optionText = String(item[field]).trim();
            if (
              optionText.length > 0 &&
              optionText !== "null" &&
              optionText !== "undefined"
            ) {
options.push({ id: letter, text: optionText });
              break; // Found this option, move to next letter
            }
          }
        }
      });
    }

    // Method 3: Check for nested objects
    if (options.length === 0) {
if (item.choices) {
if (Array.isArray(item.choices)) {
          options = item.choices.map((choice, idx) => ({
            id: ["A", "B", "C", "D"][idx] || idx.toString(),
            text:
              choice.text || choice.option || choice.value || String(choice),
          }));
        } else if (typeof item.choices === "object") {
          Object.keys(item.choices).forEach((key, idx) => {
            const letter = ["A", "B", "C", "D"][idx] || key;
            options.push({ id: letter, text: String(item.choices[key]) });
          });
        }
      }

      if (options.length === 0 && item.alternatives) {
if (Array.isArray(item.alternatives)) {
          options = item.alternatives.map((alt, idx) => ({
            id: ["A", "B", "C", "D"][idx] || idx.toString(),
            text: alt.text || alt.option || alt.value || String(alt),
          }));
        }
      }
    }

    // Method 4: Try to find any field that looks like it contains option text
    if (options.length === 0) {
const allFields = Object.keys(item);

      // Look for fields that might contain options
      const potentialOptionFields = allFields.filter((field) => {
        const lowerField = field.toLowerCase();
        return (
          lowerField.includes("option") ||
          lowerField.includes("choice") ||
          lowerField.includes("answer") ||
          /^[a-d]$/i.test(field) ||
          /option[a-d]/i.test(lowerField) ||
          /choice[a-d]/i.test(lowerField) ||
          /[a-d]option/i.test(lowerField) ||
          /opt[a-d]/i.test(lowerField) ||
          /[a-d]text/i.test(lowerField)
        );
      });

// Try to map these fields to options
      potentialOptionFields.forEach((field, idx) => {
        if (item[field] && String(item[field]).trim().length > 0) {
          const letter =
            ["A", "B", "C", "D"][idx] ||
            (field.match(/[A-D]/i) && field.match(/[A-D]/i)[0].toUpperCase()) ||
            ["A", "B", "C", "D"][options.length];

          if (letter && !options.find((opt) => opt.id === letter)) {
            options.push({
              id: letter,
              text: String(item[field]).trim(),
            });
          }
        }
      });
    }

// Create fallback only if absolutely no options found
    if (options.length === 0) {
      console.error(`NO OPTIONS FOUND for question ${index + 1}!`);
      console.error("Full item data:", JSON.stringify(item, null, 2));

      // Try one more time with a different approach - look at all string values
      const stringValues = [];
      Object.entries(item).forEach(([key, value]) => {
        if (
          typeof value === "string" &&
          value.trim().length > 5 &&
          value !== questionText
        ) {
          stringValues.push({ key, value: value.trim() });
        }
      });

if (stringValues.length >= 2) {
        // Use the string values as options
        options = stringValues.slice(0, 4).map((item, idx) => ({
          id: ["A", "B", "C", "D"][idx],
          text: item.value,
        }));
} else {
        // Final fallback
        options = [
          { id: "A", text: "Option A (No data found)" },
          { id: "B", text: "Option B (No data found)" },
          { id: "C", text: "Option C (No data found)" },
        ];
      }
    }

    // ===== FIX: Convert correct answer to match option ID format =====
    let correctAnswer = rawCorrectAnswer;

    // If correct answer is a number, convert it to corresponding letter
    if (/^\d+$/.test(String(rawCorrectAnswer))) {
      const answerIndex = parseInt(rawCorrectAnswer) - 1; // Convert 1-based to 0-based
      if (answerIndex >= 0 && answerIndex < options.length) {
        correctAnswer = options[answerIndex].id;
}
    }

    // If correct answer is a letter but doesn't match any option ID, try to find it
    if (!options.find((opt) => opt.id === correctAnswer)) {
      console.warn(
        `Correct answer ${correctAnswer} doesn't match any option ID`
      );

      // Try to find the correct answer by content matching
      const matchingOption = options.find(
        (opt) =>
          opt.text
            .toLowerCase()
            .includes(String(rawCorrectAnswer).toLowerCase()) ||
          String(rawCorrectAnswer)
            .toLowerCase()
            .includes(opt.text.toLowerCase())
      );

      if (matchingOption) {
        correctAnswer = matchingOption.id;
} else {
        // Default to first option if no match found
        correctAnswer = options[0]?.id || "A";
        console.warn(
          `No matching option found, defaulting to ${correctAnswer}`
        );
      }
    }

const result = {
      id: questionId,
      question: questionText,
      options: options,
      correctAnswer: correctAnswer,
    };

return result;
  });

return transformed;
};

// Add this helper function to debug API response structure
export const debugApiResponse = (data) => {
if (Array.isArray(data) && data.length > 0) {
    const firstItem = data[0];
// Look for option-related fields
    const optionFields = Object.keys(firstItem).filter(
      (key) =>
        key.toLowerCase().includes("option") ||
        key.toLowerCase().includes("choice") ||
        key.toLowerCase().includes("answer") ||
        key.match(/^[A-D]$/) ||
        key.match(/^[a-d]$/)
    );
optionFields.forEach((field) => {
});
  }
return data;
};
// Updated validation function with more flexible checking
export const validateQuizData = (quizData) => {
if (!Array.isArray(quizData)) {
    console.warn("Quiz data is not an array:", quizData);
    return false;
  }

  if (quizData.length === 0) {
    console.warn("Quiz data array is empty");
    return false;
  }

  const isValid = quizData.every((question, index) => {
// Check for basic question structure
    const hasId = question.id !== undefined && question.id !== null;
    const hasQuestion =
      question.question &&
      typeof question.question === "string" &&
      question.question.trim().length > 0;
    const hasOptions =
      question.options &&
      Array.isArray(question.options) &&
      question.options.length > 0;
    const hasCorrectAnswer =
      question.correctAnswer && typeof question.correctAnswer === "string";

if (!hasId) console.warn(`Question ${index} missing ID:`, question);
    if (!hasQuestion)
      console.warn(`Question ${index} missing question text:`, question);
    if (!hasOptions)
      console.warn(`Question ${index} missing or invalid options:`, question);
    if (!hasCorrectAnswer)
      console.warn(`Question ${index} missing correct answer:`, question);

    return hasId && hasQuestion && hasOptions && hasCorrectAnswer;
  });

return isValid;
};

// Server-side paginated quiz fetch — calls local Express backend which
// aggregates all block questions, caches them, and returns a single page.
// Returns: { surahId, page, pageSize, totalQuestions, totalPages,
//            hasNextPage, hasPrevPage, questions }
export const fetchEntireSurahQuizPaginated = async (surahId, page = 1, pageSize = 5) => {
  const url = `${QUIZ_PAGINATED_API}/surah/${surahId}?page=${page}&pageSize=${pageSize}`;
  const response = await fetchWithTimeout(url, {}, 30000);
  if (!response.ok) {
    throw new Error(`Quiz paginated API error: ${response.status}`);
  }
  return response.json();
};

// Create fallback quiz data for testing
export const createFallbackQuizData = (surahId) => {
  return {
    questions: [
      {
        id: 1,
        question: "ഖുർആനിലെ ആദ്യ സൂറയുടെ പേര് എന്താണ്?",
        options: [
          { id: "A", text: "അൽ-ഫാതിഹ" },
          { id: "B", text: "അൽ-ബഖറ" },
          { id: "C", text: "ആലി ഇംറാൻ" },
          { id: "D", text: "അൻ-നിസാ" },
        ],
        correctAnswer: "A",
      },
      {
        id: 2,
        question: "ഖുർആനിൽ എത്ര സൂറകൾ ഉണ്ട്?",
        options: [
          { id: "A", text: "113" },
          { id: "B", text: "114" },
          { id: "C", text: "115" },
          { id: "D", text: "116" },
        ],
        correctAnswer: "B",
      },
    ],
    surahInfo: {
      number: parseInt(surahId),
      name: `Surah ${surahId}`,
      arabic: "Sample Surah",
      ayahs: 7,
      type: "Unknown",
    },
    range: "1-7",
    totalQuestions: 2,
  };
};

// Fetch surah metadata (name, type, verses) from MySQL suratable
export const fetchSurahMetadata = async (surahId, language = "en") => {
  try {
    const apiBase = CONFIG_API_BASE_PATH || API_BASE_PATH;
    const lang = (language || "en").toLowerCase();
    const url = `${apiBase}/surah-metadata/${surahId}/${lang}`;
    const response = await fetchWithTimeout(url, {}, 8000);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`Surah metadata fetch failed for ${surahId}:`, error.message);
    return null;
  }
};

// Fetch Hindi surah intro (fallback table)
export const fetchHindiSurahIntro = async (surahId) => {
  try {
    const apiBase = CONFIG_API_BASE_PATH || API_BASE_PATH;
    const url = `${apiBase}/hindi/surah-intro/${surahId}`;
    const response = await fetchWithTimeout(url, {}, 8000);

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`Hindi surah intro fetch failed for ${surahId}:`, error.message);
    return null;
  }
};

// Fetch Urdu surah intro from urdu_intro table
export const fetchUrduSurahIntro = async (surahId) => {
  try {
    const apiBase = CONFIG_API_BASE_PATH || API_BASE_PATH;
    const url = `${apiBase}/urdu/surah-intro/${surahId}`;
    const response = await fetchWithTimeout(url, {}, 8000);

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`Urdu surah intro fetch failed for ${surahId}:`, error.message);
    return null;
  }
};

// Fetch Urdu surah intro audio from urdu_intro_audio table
export const fetchUrduSurahIntroAudio = async (surahId) => {
  try {
    const apiBase = CONFIG_API_BASE_PATH || API_BASE_PATH;
    const url = `${apiBase}/urdu/surah-intro-audio/${surahId}`;
    const response = await fetchWithTimeout(url, {}, 8000);

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`Urdu surah intro audio fetch failed for ${surahId}:`, error.message);
    return null;
  }
};

// Fetch Bangla surah intro from bangla_intro table
export const fetchBanglaSurahIntro = async (surahId) => {
  try {
    const apiBase = CONFIG_API_BASE_PATH || API_BASE_PATH;
    const url = `${apiBase}/bangla/surah-intro/${surahId}`;
    const response = await fetchWithTimeout(url, {}, 8000);

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`Bangla surah intro fetch failed for ${surahId}:`, error.message);
    return null;
  }
};

// Fetch Tamil surah intro from tamil_intro table
export const fetchTamilSurahIntro = async (surahId) => {
  try {
    const apiBase = CONFIG_API_BASE_PATH || API_BASE_PATH;
    const url = `${apiBase}/tamil/surah-intro/${surahId}`;
    const response = await fetchWithTimeout(url, {}, 8000);

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`Tamil surah intro fetch failed for ${surahId}:`, error.message);
    return null;
  }
};

// Search Surahs by name (local search through your Surah data)
export const searchSurahsByName = async (query) => {
  try {
    // Get all surahs from your existing API
    const surahs = await fetchSurahs();

    if (!query || query.trim().length < 1) {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();

    // Search through both English and Arabic names
    const matchingSurahs = surahs.filter((surah) => {
      const englishMatch = surah.name.toLowerCase().includes(searchTerm);
      const arabicMatch = surah.arabic.toLowerCase().includes(searchTerm);
      const numberMatch = surah.number.toString() === searchTerm;

      return englishMatch || arabicMatch || numberMatch;
    });

    // Sort by relevance (exact matches first, then partial matches)
    return matchingSurahs.sort((a, b) => {
      const aExactMatch =
        a.name.toLowerCase() === searchTerm ||
        a.number.toString() === searchTerm;
      const bExactMatch =
        b.name.toLowerCase() === searchTerm ||
        b.number.toString() === searchTerm;

      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // If both or neither are exact matches, sort by Surah number
      return a.number - b.number;
    });
  } catch (error) {
    console.error("Error searching surahs by name:", error);
    throw error;
  }
};

const MAL_ENG_SEARCH_ENDPOINTS = Array.from(
  new Set(
    [
      LEGACY_TFH_BASE ? `${LEGACY_TFH_BASE}/malengsearch` : null,
      LEGACY_TFH_REMOTE_BASE ? `${LEGACY_TFH_REMOTE_BASE}/malengsearch` : null,
    ].filter(Boolean)
  )
);

const MAL_ENG_TYPE_MAP = {
  translation: 1,
  interpret: 2,
  interpretation: 2,
};

const MAL_ENG_LANGUAGE_MAP = {
  e: "E",
  en: "E",
  eng: "E",
  english: "E",
  m: "M",
  ml: "M",
  mal: "M",
  malayalam: "M",
};

const MAL_ENG_DEFAULT_LIMIT = 30;

const resolveMalEngTypeCode = (type) => {
  if (typeof type === "number") {
    return type === 2 ? 2 : 1;
  }
  const normalized = type?.toString().trim().toLowerCase();
  if (!normalized) {
    return 1;
  }
  return MAL_ENG_TYPE_MAP[normalized] || 1;
};

const resolveMalEngLanguageCode = (language) => {
  if (typeof language === "number") {
    return language === 2 ? "M" : "E";
  }
  const normalized = language?.toString().trim().toLowerCase();
  if (!normalized) {
    return "E";
  }
  return MAL_ENG_LANGUAGE_MAP[normalized] || "E";
};

const normalizeMalEngResults = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  return [];
};

export const searchMalEngTranslations = async ({
  query,
  language = "E",
  type = "translation",
  limit = MAL_ENG_DEFAULT_LIMIT,
} = {}) => {
  const trimmedQuery = query?.toString().trim();
  if (!trimmedQuery) {
    return [];
  }

  const safeLimit =
    typeof limit === "number" && Number.isFinite(limit) && limit > 0
      ? Math.min(limit, 50)
      : MAL_ENG_DEFAULT_LIMIT;

  const typeCode = resolveMalEngTypeCode(type);
  const languageCode = resolveMalEngLanguageCode(language);
  // Map language code back to API lang param: E→eng, M→mal
  const langParam = languageCode === "M" ? "mal" : "eng";
  // Map type code: 1→translation, 2→interpretation
  const typeParam = typeCode === 2 ? "interpretation" : "translation";

  const apiBase = (CONFIG_API_BASE_PATH || API_BASE_PATH || '').replace(/\/+$/, '');
  const url = `${apiBase}/search/text?q=${encodeURIComponent(trimmedQuery)}&lang=${langParam}&type=${typeParam}&limit=${safeLimit}`;

  try {
    const response = await fetchWithTimeout(url, {}, 10000);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const raw = Array.isArray(data?.results) ? data.results : [];
    // Normalize to field names SearchConsole.jsx expects:
    // surah→SuraID, ayah→ayaid+AyaFrom, matchedText→matchedText, interpretationNo→InterpretationNo
    return raw.map(r => ({
      SuraID:           r.surah,
      suraid:           r.surah,
      ayaid:            r.ayah,
      AyaFrom:          r.ayah,
      matchedText:      r.matchedText || '',
      TranslationText:  typeParam === 'translation' ? (r.matchedText || '') : undefined,
      Interpretation:   typeParam === 'interpretation' ? (r.matchedText || '') : undefined,
      InterpretationNo: r.interpretationNo ?? null,
    }));
  } catch (error) {
    console.error('Error searching translations via MySQL API:', error.message);
    throw error;
  }
};

// Helper function to check if a string contains Arabic characters
const containsArabic = (text) => {
  if (!text) return false;
  // Arabic Unicode range: \u0600-\u06FF
  // Also includes Arabic presentation forms: \uFB50-\uFDFF and \uFE70-\uFEFF
  const arabicRegex = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
};

export const searchArabicPhrases = async (query, limit = 40) => {
  const trimmedQuery = query?.toString().trim();
  if (!trimmedQuery) {
    return [];
  }

  // Only search Arabic if the query contains Arabic characters
  // This prevents unnecessary API calls and 404 errors for non-Arabic queries
  if (!containsArabic(trimmedQuery)) {
    return [];
  }

  const safeLimit =
    typeof limit === "number" && Number.isFinite(limit) && limit > 0
      ? Math.min(limit, 100)
      : 40;

  try {
    // Reuse the new API-based word search for Arabic
    const apiBase = (CONFIG_API_BASE_PATH || API_BASE_PATH || API_BASE_URL || "").replace(
      /\/+$/,
      ""
    );
    const encodedQuery = encodeURIComponent(trimmedQuery);
    const url = `${apiBase}/arabic/word-search?q=${encodedQuery}`;

    const response = await fetchWithTimeout(url, {}, 10000);
    if (!response.ok) {
      // Don't log 404 errors as they're expected for invalid queries
      if (response.status === 404) {
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const results = Array.isArray(data?.results) ? data.results : [];

    // Return in array form expected by HomeSearch (it handles multiple field names)
    const sliced = safeLimit ? results.slice(0, safeLimit) : results;
    return sliced.map((row) => ({
      // multiple variants so the consumer can read whatever it expects
      surah: row.surah,
      ayah: row.ayah,
      SuraID: row.surah,
      AyaID: row.ayah,
      AyaHText: row.arabicWord || "",
      Text: row.matchedText || "",
    }));
  } catch (error) {
    // Only log non-404 errors to avoid console spam
    // Check both error message and status code
    const is404 = error.message?.includes('404') || 
                  (error.response && error.response.status === 404) ||
                  (error.status === 404);
    if (!is404) {
      console.error("Error searching Arabic phrase data via API:", error);
    }
    return [];
  }
};

// Word search for 6 languages (Bangla, Hindi, Tamil, Urdu, English, Malayalam)
export const searchWords = async (query, language, limit = 50) => {
  const trimmedQuery = query?.toString().trim();
  if (!trimmedQuery) {
    return { language, query: '', count: 0, results: [] };
  }

  const safeLimit = typeof limit === "number" && Number.isFinite(limit) && limit > 0
    ? Math.min(limit, 100)
    : 50;

  const encodedQuery = encodeURIComponent(trimmedQuery);
  const apiBase = (CONFIG_API_BASE_PATH || API_BASE_PATH || API_BASE_URL || '').replace(/\/+$/, '');
  // Use query parameter instead of path parameter to handle special characters like colons
  const url = `${apiBase}/${language}/word-search?q=${encodedQuery}`;

  try {
    const response = await fetchWithTimeout(url, {}, 10000);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.results && Array.isArray(data.results)) {
      return {
        ...data,
        results: safeLimit ? data.results.slice(0, safeLimit) : data.results
      };
    }
    return { language, query: trimmedQuery, count: 0, results: [] };
  } catch (error) {
    console.error(`Error searching words for ${language}:`, error);
    return { language, query: trimmedQuery, count: 0, results: [] };
  }
};

const QURAN_SUBJECT_ENDPOINTS = Array.from(
  new Set(
    [
      LEGACY_TFH_BASE ? `${LEGACY_TFH_BASE}/qtsubjects` : null,
      LEGACY_TFH_REMOTE_BASE ? `${LEGACY_TFH_REMOTE_BASE}/qtsubjects` : null,
    ].filter(Boolean)
  )
);

export const fetchQuranSubjects = async ({ category = 1, language = "E" } = {}) => {
  const typeCode =
    typeof category === "number" && Number.isFinite(category) && category === 2
      ? 2
      : 1;
  const langCode =
    typeof language === "string" && language.trim().toUpperCase() === "M"
      ? "M"
      : "E";

  // Map to API params
  const langParam = langCode === "M" ? "mal" : "eng";
  const apiBase = (CONFIG_API_BASE_PATH || API_BASE_PATH || '').replace(/\/+$/, '');
  // category 1 = Quran subjects, category 2 = Tafseer subjects
  const endpoint = typeCode === 2
    ? `${apiBase}/search/tafseer-subjects?all=true`
    : `${apiBase}/search/quran-subjects?lang=${langParam}&all=true`;

  try {
    const response = await fetchWithTimeout(endpoint, {}, 15000);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const raw = Array.isArray(data?.subjects) ? data.subjects : [];
    // Normalize to field names SearchConsole.jsx expects: id→ID, subject→SubjText
    return raw.map(s => ({
      ID:       s.id,
      SubjText: s.subject || '',
    }));
  } catch (error) {
    console.error('Error fetching Quran subjects via MySQL API:', error.message);
    throw error;
  }
};

export const fetchQuranSubjectResults = async ({
  subjectId,
  category = 1,
  language = "E",
  limit = 200,
} = {}) => {
  const normalizedSubjectId = Number.parseInt(subjectId, 10);
  if (!Number.isFinite(normalizedSubjectId) || normalizedSubjectId < 1) {
    return [];
  }

  const typeCode =
    typeof category === "number" && Number.isFinite(category) && category === 2
      ? 2
      : 1;
  const langCode =
    typeof language === "string" && language.trim().toUpperCase() === "M"
      ? "M"
      : "E";
  const langParam = langCode === "M" ? "mal" : "eng";
  const safeLimit =
    typeof limit === "number" && Number.isFinite(limit) && limit > 0
      ? Math.min(limit, 500)
      : 200;

  const apiBase = (CONFIG_API_BASE_PATH || API_BASE_PATH || '').replace(/\/+$/, '');
  const endpoint = typeCode === 2
    ? `${apiBase}/search/tafseer-subject-results/${normalizedSubjectId}?all=true`
    : `${apiBase}/search/quran-subject-results/${normalizedSubjectId}?lang=${langParam}&all=true`;

  try {
    const response = await fetchWithTimeout(endpoint, {}, 15000);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const raw = Array.isArray(data?.results) ? data.results : [];

    if (typeCode === 2) {
      return raw.map((row) => ({
        SuraID: row.surah,
        suraid: row.surah,
        InterpretationNo: row.interpretationNo ?? null,
        Interpretation: row.interpretationText || '',
      }));
    }

    return raw.map((row) => ({
      SuraID: row.surah,
      suraid: row.surah,
      AyaID: row.ayah,
      ayaid: row.ayah,
      AyaFrom: row.ayah,
      AyaHText: row.arabicText || '',
      TranslationText: row.translationText || '',
      Interpretation: row.interpretationText || '',
      InterpretationNo: row.interpretationNo ?? null,
    }));
  } catch (error) {
    console.error('Error fetching subject results via MySQL API:', error.message);
    throw error;
  }
};

const GLOSSARY_ENDPOINTS = Array.from(
  new Set(
    [
      LEGACY_TFH_BASE ? `${LEGACY_TFH_BASE}/glossery` : null,
      LEGACY_TFH_REMOTE_BASE ? `${LEGACY_TFH_REMOTE_BASE}/glossery` : null,
    ].filter(Boolean)
  )
);

export const fetchGlossaryEntries = async (limit = 0) => {
  const apiBase = (CONFIG_API_BASE_PATH || API_BASE_PATH || '').replace(/\/+$/, '');
  const url = `${apiBase}/search/glossary`;

  try {
    const response = await fetchWithTimeout(url, {}, 15000);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const payload = await response.json();
    const data = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
    // Field names (engtitleglossary, arrtitleglossary, glossarytext) already match
    // what SearchConsole.jsx expects — no normalization needed.
    return limit > 0 ? data.slice(0, limit) : data;
  } catch (error) {
    console.error('Error fetching glossary entries via MySQL API:', error.message);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Search helpers
// ─────────────────────────────────────────────────────────────────────────────

// Paginated word-search (Malayalam / English / Arabic / other languages)
// Returns { language, query, count, total, page, limit, hasMore, results }
export const searchWordsPaginated = async (query, language, page = 1, limit = 10) => {
  const trimmedQuery = query?.toString().trim();
  if (!trimmedQuery) return { language, query: '', count: 0, total: 0, page, limit, hasMore: false, results: [] };

  const safeLimit   = Math.min(50, Math.max(1, limit));
  const encodedQuery = encodeURIComponent(trimmedQuery);
  const apiBase      = (CONFIG_API_BASE_PATH || API_BASE_PATH || API_BASE_URL || '').replace(/\/+$/, '');
  const url          = `${apiBase}/${language}/word-search?q=${encodedQuery}&page=${page}&limit=${safeLimit}`;

  try {
    const response = await fetchWithTimeout(url, {}, 10000);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return {
      language,
      query:   trimmedQuery,
      count:   data.count   ?? (data.results?.length ?? 0),
      total:   data.total   ?? 0,
      page:    data.page    ?? page,
      limit:   data.limit   ?? safeLimit,
      hasMore: data.hasMore ?? false,
      results: Array.isArray(data.results) ? data.results : []
    };
  } catch (error) {
    console.error(`Error in paginated word search for ${language}:`, error);
    return { language, query: trimmedQuery, count: 0, total: 0, page, limit: safeLimit, hasMore: false, results: [] };
  }
};

// Arabic phrase search — legacy alias still used by HomeSearch; delegates to word-search
export const searchQuranContent = async (query, language = "en") => {
  const trimmedQuery = query?.toString().trim();
  if (!trimmedQuery) return [];

  // Map legacy language code to backend lang param
  const langMap = { en: 'english', e: 'english', mal: 'malayalam', ml: 'malayalam' };
  const lang    = langMap[language] || language;

  try {
    const data = await searchWordsPaginated(trimmedQuery, lang, 1, 20);
    return data.results || [];
  } catch {
    return [];
  }
};

// Search Quran / Tafseer subjects (Malayalam or English)
// lang: 'mal' | 'eng',  type: 'quran' | 'tafseer'
export const searchSubjects = async ({ query = '', lang = 'mal', type = 'quran', page = 1, limit = 20 } = {}) => {
  const apiBase = (CONFIG_API_BASE_PATH || API_BASE_PATH || API_BASE_URL || '').replace(/\/+$/, '');
  const endpoint = type === 'tafseer'
    ? `${apiBase}/search/tafseer-subjects`
    : `${apiBase}/search/quran-subjects`;

  const params = new URLSearchParams({ page, limit });
  if (query) params.set('q', query);
  if (type !== 'tafseer') params.set('lang', lang);

  try {
    const response = await fetchWithTimeout(`${endpoint}?${params}`, {}, 10000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('searchSubjects error:', error);
    return { subjects: [], total: 0, hasMore: false };
  }
};

// Get all ayas for a Quran / Tafseer subject
export const getSubjectResults = async ({ subjectId, lang = 'mal', type = 'quran', page = 1, limit = 20 } = {}) => {
  const apiBase  = (CONFIG_API_BASE_PATH || API_BASE_PATH || API_BASE_URL || '').replace(/\/+$/, '');
  const endpoint = type === 'tafseer'
    ? `${apiBase}/search/tafseer-subject-results/${subjectId}`
    : `${apiBase}/search/quran-subject-results/${subjectId}`;

  const params = new URLSearchParams({ page, limit });
  if (type !== 'tafseer') params.set('lang', lang);

  try {
    const response = await fetchWithTimeout(`${endpoint}?${params}`, {}, 10000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('getSubjectResults error:', error);
    return { results: [], total: 0, hasMore: false };
  }
};

// Arabic root search — t_words_with_caya table
// GET /api/search/roots?q=<arabic>&page=1&limit=10
// Returns { query, total, page, limit, hasMore, roots: [{rootGroupId, root, verseCount}] }
export const searchRoots = async (query, page = 1, limit = 10) => {
  const trimmed = query?.toString().trim();
  if (!trimmed) return { total: 0, page, limit, hasMore: false, roots: [] };

  const apiBase = (CONFIG_API_BASE_PATH || API_BASE_PATH || API_BASE_URL || '').replace(/\/+$/, '');
  const params  = new URLSearchParams({ q: trimmed, page, limit });

  try {
    const response = await fetchWithTimeout(`${apiBase}/search/roots?${params}`, {}, 10000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('searchRoots error:', error);
    return { total: 0, page, limit, hasMore: false, roots: [] };
  }
};

// Preloaded Arabic roots for root-search UI (old-style initial list)
// GET /api/search/roots-seed?page=1&limit=20
export const fetchRootSeeds = async (limit = 20, page = 1) => {
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
  const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;
  const apiBase = (CONFIG_API_BASE_PATH || API_BASE_PATH || API_BASE_URL || '').replace(/\/+$/, '');
  const params = new URLSearchParams({ limit: String(safeLimit), page: String(safePage) });

  try {
    const response = await fetchWithTimeout(`${apiBase}/search/roots-seed?${params}`, {}, 10000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return {
      total: Number(data?.total) || 0,
      page: Number(data?.page) || safePage,
      limit: Number(data?.limit) || safeLimit,
      hasMore: Boolean(data?.hasMore),
      roots: Array.isArray(data?.roots) ? data.roots : [],
    };
  } catch (error) {
    console.error('fetchRootSeeds error:', error);
    return { total: 0, page: safePage, limit: safeLimit, hasMore: false, roots: [] };
  }
};

// Root word verses — get paginated verses for a root_id
// GET /api/search/root-word-verses/:rootGroupId?page=1&limit=10
export const fetchRootWordVerses = async (rootGroupId, page = 1, limit = 10) => {
  const apiBase = (CONFIG_API_BASE_PATH || API_BASE_PATH || API_BASE_URL || '').replace(/\/+$/, '');
  const params  = new URLSearchParams({ page, limit });

  try {
    const response = await fetchWithTimeout(`${apiBase}/search/root-word-verses/${rootGroupId}?${params}`, {}, 10000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('fetchRootWordVerses error:', error);
    return { total: 0, page, limit, hasMore: false, results: [] };
  }
};

// Root word bundle (old-style): root + forms + verses in a single response
// GET /api/search/rootwords/:rootGroupId?page=1&limit=10
export const fetchRootWordBundle = async (rootGroupId, page = 1, limit = 20) => {
  const normalizedId = Number.parseInt(rootGroupId, 10);
  if (!Number.isFinite(normalizedId) || normalizedId < 1) {
    return {
      rootGroupId: null,
      root: '',
      wordForms: [],
      wordFormsCount: 0,
      total: 0,
      page,
      limit,
      hasMore: false,
      results: [],
    };
  }

  const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
  const apiBase = (CONFIG_API_BASE_PATH || API_BASE_PATH || API_BASE_URL || '').replace(/\/+$/, '');
  const params = new URLSearchParams({ page: String(safePage), limit: String(safeLimit) });

  try {
    const response = await fetchWithTimeout(`${apiBase}/search/rootwords/${normalizedId}?${params}`, {}, 10000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    return {
      rootGroupId: data?.rootGroupId ?? normalizedId,
      root: data?.root || '',
      wordForms: Array.isArray(data?.wordForms) ? data.wordForms : [],
      wordFormsCount: Number(data?.wordFormsCount) || 0,
      total: Number(data?.total) || 0,
      page: Number(data?.page) || safePage,
      limit: Number(data?.limit) || safeLimit,
      hasMore: Boolean(data?.hasMore),
      results: Array.isArray(data?.results) ? data.results : [],
    };
  } catch (error) {
    console.error('fetchRootWordBundle error:', error);
    return {
      rootGroupId: normalizedId,
      root: '',
      wordForms: [],
      wordFormsCount: 0,
      total: 0,
      page: safePage,
      limit: safeLimit,
      hasMore: false,
      results: [],
    };
  }
};

// Word meaning search — qwmmalayalam / qwmenglish tables
// GET /api/search/word-meaning?q=...&lang=mal|eng&page=1&limit=10
// Returns { query, lang, total, page, limit, hasMore, results[] }
export const searchWordMeaning = async (query, lang = 'mal', page = 1, limit = 10) => {
  const trimmed = query?.toString().trim();
  if (!trimmed) return { total: 0, page, limit, hasMore: false, results: [] };

  const apiBase = (CONFIG_API_BASE_PATH || API_BASE_PATH || API_BASE_URL || '').replace(/\/+$/, '');
  const params  = new URLSearchParams({ q: trimmed, lang, page, limit });

  try {
    const response = await fetchWithTimeout(`${apiBase}/search/word-meaning?${params}`, {}, 10000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('searchWordMeaning error:', error);
    return { total: 0, page, limit, hasMore: false, results: [] };
  }
};


// Helper function to highlight search terms in text
const highlightSearchTerms = (text, query) => {
  if (!text || !query) return text;

  try {
    const searchTerms = query
      .toLowerCase()
      .split(" ")
      .filter((term) => term.length > 2);
    let highlightedText = text;

    searchTerms.forEach((term) => {
      const regex = new RegExp(`(${term})`, "gi");
      highlightedText = highlightedText.replace(regex, "<mark>$1</mark>");
    });

    return highlightedText;
  } catch (error) {
    return text; // Return original text if highlighting fails
  }
};

// Search for specific verse reference (e.g., "2:255", "18:10-25")
export const searchVerseReference = async (query) => {
  const versePattern = /^(\d+):(\d+)(?:-(\d+))?$/;
  const match = query.trim().match(versePattern);

  if (!match) return null;

  const surahNumber = parseInt(match[1]);
  const startVerse = parseInt(match[2]);
  const endVerse = match[3] ? parseInt(match[3]) : startVerse;

  try {
    // Get surah info
    const surahs = await fetchSurahs();
    const surah = surahs.find((s) => s.number === surahNumber);

    if (!surah) return null;

    // Create verse reference result
    const verseKey = `${surahNumber}:${startVerse}`;
    const displayText =
      endVerse > startVerse
        ? `Verses ${startVerse}-${endVerse} from ${surah.name}`
        : `Verse ${startVerse} from ${surah.name}`;

    return {
      type: "verse_reference",
      verse_key: verseKey,
      surah_number: surahNumber,
      verse_start: startVerse,
      verse_end: endVerse,
      surah_info: surah,
      display_text: displayText,
    };
  } catch (error) {
    console.error("Error searching verse reference:", error);
    return null;
  }
};

// Enhanced search function with better verse search
export const searchQuranEnhanced = async (query, language = "en") => {
  try {
    // Check if query is a verse reference first
    const verseRef = await searchVerseReference(query);

    const [surahResults, contentResults] = await Promise.all([
      searchSurahsByName(query),
      query.trim().length >= 3 ? searchQuranContent(query, language) : [],
    ]);

    // Get surah names for verse results
    const surahsData = await fetchSurahs();
    const surahNamesMap = {};
    surahsData.forEach((surah) => {
      surahNamesMap[surah.number] = surah;
    });

    // Enhance verse results with surah information
    const enhancedVerses = contentResults.map((verse) => ({
      ...verse,
      surahInfo: surahNamesMap[parseInt(verse.verse_key.split(":")[0])] || null,
    }));

    // Add verse reference result if found
    if (verseRef) {
      enhancedVerses.unshift({
        ...verseRef,
        text: verseRef.display_text,
        verse_key: verseRef.verse_key,
        surahInfo: verseRef.surah_info,
      });
    }

    return {
      surahs: surahResults,
      verses: enhancedVerses,
      hasResults: surahResults.length > 0 || enhancedVerses.length > 0,
      totalResults: surahResults.length + enhancedVerses.length,
      hasVerseReference: !!verseRef,
    };
  } catch (error) {
    console.error("Error in enhanced search:", error);
    throw error;
  }
};

// Combined search function that searches both Surah names and content
export const searchQuran = async (query, language = "en") => {
  try {
    // Use enhanced search if available, fallback to original
    return await searchQuranEnhanced(query, language);
  } catch (error) {
    console.error("Enhanced search failed, using fallback:", error);

    // Fallback to original implementation
    const isLikelyName = /^(al-|an-|as-|\d+\.?\s*)?[a-z\s-]+$/i.test(
      query.trim()
    );
    const isNumber = /^\d+$/.test(query.trim());

    let surahResults = [];
    let contentResults = [];

    surahResults = await searchSurahsByName(query);

    if (
      surahResults.length === 0 ||
      (!isLikelyName && !isNumber && query.trim().length > 3)
    ) {
      contentResults = await searchQuranContent(query, language);
    }

    return {
      surahs: surahResults,
      verses: contentResults,
      hasResults: surahResults.length > 0 || contentResults.length > 0,
    };
  }
};

// Directus CMS API functions

// Fetch home banner data from Directus CMS
export const fetchHomeBanner = async () => {
  try {
    const response = await fetch(
      `${DIRECTUS_BASE_URL}/items/thafheem_homebanner`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
// Return the data array or empty array if no data
    return data.data || [];
  } catch (error) {
    console.error("Error fetching home banner data:", error);
    // Return empty array on error to prevent app crash
    return [];
  }
};

// Fetch app settings from Directus CMS
export const fetchAppSettings = async () => {
  try {
    const response = await fetch(
      `${DIRECTUS_BASE_URL}/items/thafheem_app_settings`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
return data.data || [];
  } catch (error) {
    console.error("Error fetching app settings:", error);
    return [];
  }
};

// Fetch AI API configuration from Directus CMS
export const fetchAiApiConfig = async () => {
  try {
    const response = await fetch(`${DIRECTUS_BASE_URL}/items/thafheem_ai_api`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
// Return inner data if present, otherwise empty object
    return data.data || {};
  } catch (error) {
    console.error("Error fetching AI API config:", error.message);
    return {};
  }
};


// Localized names for "Ayatul Kursi" — not stored in the DB
const AYATUL_KURSI_NAMES = {
  ur: "آیت الکرسی",
  mal: "ആയതുൽ കുർസി",
  hi: "आयतुल कुर्सी",
  bn: "আয়াতুল কুরসি",
  ta: "ஆயத்துல் குர்ஸி",
  en: "Ayatul Kursi",
};

// Fetch popular chapters from MySQL database via API
export const fetchPopularChapters = async (language = "en") => {
  try {
    // Get all chapters from our MySQL API (use language for localized names)
    const surahs = await fetchSurahs(language && language !== "en" ? { language } : {});

    // Resolve the Ayatul Kursi label for the active language
    const ayatulKursiName = AYATUL_KURSI_NAMES[language] || AYATUL_KURSI_NAMES.en;
    
    // Define popular chapters based on common reading patterns
    const popularChapterIds = [67, 2, 1, 18, 36, 55, 56, 78, 112, 113, 114];

    // Filter and map popular chapters
    const popularChapters = popularChapterIds
      .map((id) => {
        const chapter = surahs.find((ch) => ch.number === id);
        if (chapter) {
          // Special handling for Surah Al-Baqarah (ID 2) - show Ayatul Kursi
          if (id === 2) {
            return {
              id: chapter.number,
              name: ayatulKursiName,
              arabic: chapter.arabic,
              verses: "Verse 255",
              type: chapter.type,
              translated_name: ayatulKursiName,
              verseNumber: 255,
              verseKey: "2:255",
            };
          }
          
          return {
            id: chapter.number,
            name: chapter.name,
            arabic: chapter.arabic,
            verses: `${chapter.ayahs} verses`,
            type: chapter.type,
            translated_name:
              chapter.translated_name?.name || chapter.name_simple,
          };
        }
        return null;
      })
      .filter(Boolean); // Remove null entries

    return popularChapters;
  } catch (error) {
    console.error("Error fetching popular chapters:", error);
    const ayatulKursiName = AYATUL_KURSI_NAMES[language] || AYATUL_KURSI_NAMES.en;
    // Return fallback data
    return [
      { id: 67, name: "Al-Mulk", verses: "30 verses", type: "Makki" },
      { id: 2, name: ayatulKursiName, verses: "Verse 255", type: "Madani", verseNumber: 255, verseKey: "2:255" },
      { id: 1, name: "Al-Fatiha", verses: "7 verses", type: "Makki" },
      { id: 18, name: "Al-Kahf", verses: "110 verses", type: "Makki" },
      { id: 36, name: "Ya-Sin", verses: "83 verses", type: "Makki" },
    ];
  }
};

// Deduplication cache for Tajweed rules — prevents duplicate in-flight requests
// and caches resolved data for the lifetime of the page session.
const tajweedRulesInflight = new Map(); // formattedRuleNo -> Promise
const tajweedRulesData = new Map();     // formattedRuleNo -> resolved data

// Fetch Tajweed rules
export const fetchTajweedRules = async (ruleNo = "0") => {
  // Replace dots with underscores in rule number as per API spec
  const formattedRuleNo = ruleNo?.toString().replace(/\./g, "_") ?? "0";

  // Return already-resolved data immediately (avoids any re-fetch)
  if (tajweedRulesData.has(formattedRuleNo)) {
    return tajweedRulesData.get(formattedRuleNo);
  }

  // Deduplicate concurrent calls — return the same Promise that is already in-flight
  if (tajweedRulesInflight.has(formattedRuleNo)) {
    return tajweedRulesInflight.get(formattedRuleNo);
  }

  if (apiAvailabilityState.tajweedApiUnavailable) {
    return getFallbackTajweedData(formattedRuleNo);
  }

  const apiBase = CONFIG_API_BASE_PATH || API_BASE_PATH;

  // Build list of candidate endpoints (handles older misspelled route and new route)
  const baseCandidates = Array.from(
    new Set(
      [
        TAJWEED_RULES_API,
        `${apiBase}/thajweedrules`,
        `${apiBase}/tajweedrules`,
      ].filter(Boolean)
    )
  );

  // Build the actual fetch promise and register it for deduplication
  const fetchPromise = (async () => {
    let lastError = null;
    let lastStatus = null;

    for (const baseUrl of baseCandidates) {
      const url = formattedRuleNo ? `${baseUrl}/${formattedRuleNo}` : baseUrl;

      try {
        const response = await fetchWithTimeout(url, {}, 8000);

        lastStatus = response.status;

        if (!response.ok) {
          if (response.status === 404) {
            lastError = new Error(`HTTP error! status: ${response.status}`);
            lastStatus = 404;
            // Stop trying other endpoints after the first 404 to avoid noisy retries
            break;
          }

          if (response.status >= 500) {
            // Try the next candidate endpoint
            continue;
          }

          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        lastError = error;
        // Continue trying other candidates if available
        continue;
      }
    }

    if (lastStatus === 404) {
      logWarningOnce(
        `tajweed-rules-${formattedRuleNo}`,
        `Tajweed rule ${formattedRuleNo} returned 404 - using fallback data`
      );
      apiAvailabilityState.tajweedApiUnavailable = true;
      return getFallbackTajweedData(formattedRuleNo);
    }

    console.error("Error fetching Tajweed rules:", lastError);
    if (lastError) {
      apiAvailabilityState.tajweedApiUnavailable = true;
    }
    const fallback = getFallbackTajweedData(formattedRuleNo);
    if (fallback.length > 0) {
      return fallback;
    }

    throw lastError ?? new Error("Failed to fetch Tajweed rules");
  })().then((data) => {
    tajweedRulesData.set(formattedRuleNo, data);
    tajweedRulesInflight.delete(formattedRuleNo);
    return data;
  }).catch((err) => {
    tajweedRulesInflight.delete(formattedRuleNo);
    throw err;
  });

  tajweedRulesInflight.set(formattedRuleNo, fetchPromise);
  return fetchPromise;
};

// Fetch word meanings for drag and drop quiz from MySQL database via API
export const fetchWordMeanings = async (
  surahId,
  ayahNumber,
  language = "E"
) => {
  // Map language codes to our API language names
  const getLanguageCode = (langCode) => {
    const langMap = {
      'mal': 'malayalam',
      'ml': 'malayalam',
      'E': 'english',
      'en': 'english',
      'ta': 'tamil',
      'hi': 'hindi',
      'ur': 'urdu',
      'bangla': 'bangla',
      'bn': 'bangla',
      'ar': 'arabic'
    };
    return langMap[langCode?.toLowerCase()] || 'english';
  };

  const apiLanguage = getLanguageCode(language);
  
  try {
    const url = `${API_BASE_PATH}/${apiLanguage}/word-by-word/${surahId}/${ayahNumber}`;
    const response = await fetchWithTimeout(url, {}, 8000);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Return words array with all original database fields preserved
    // This allows components to access WordPhrase, WordMeaning, MalMeaning, EngMeaning, etc.
    return {
      words: data.words || [],
      language: data.language || apiLanguage,
      surah: data.surah || surahId,
      ayah: data.ayah || ayahNumber,
      count: data.count || (data.words?.length || 0)
    };
  } catch (error) {
    console.error("Error fetching word meanings from MySQL API:", error);
    throw error;
  }
};

// Fetch all main Tajweed rules (ruleno = '0')
export const fetchAllTajweedRules = async () => {
  return fetchTajweedRules("0");
};

// Fetch specific Tajweed rule by rule number
export const fetchSpecificTajweedRule = async (ruleNo) => {
  return fetchTajweedRules(ruleNo);
};

// Fetch Arabic verse text from Quran.com API for Tajweed examples
export const fetchArabicVerseForTajweed = async (verseKey) => {
  try {
    // Parse verse key (format: "1:1")
    const [surahId, ayahNumber] = verseKey.split(':').map(Number);
    if (!surahId || !ayahNumber) {
      throw new Error(`Invalid verse key format: ${verseKey}`);
    }

    const response = await fetchWithTimeout(
      `${API_BASE_PATH}/arabic/text/${surahId}/${ayahNumber}`,
      {},
      5000
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.text_uthmani || data.text_simple || "Arabic text not available";
  } catch (error) {
    console.error("Error fetching Arabic verse for Tajweed from MySQL API:", error);
    return "Arabic text not available";
  }
};

export const fetchArabicAudioForTajweed = async (
  verseKey,
  recitationId = 7
) => {
  if (!verseKey) {
    return "";
  }

  try {
    // Parse verseKey format: "83:14" -> surah 83, ayah 14
    const [surahNumber, ayahNumber] = verseKey.split(":").map(Number);
    
    if (!surahNumber || !ayahNumber || isNaN(surahNumber) || isNaN(ayahNumber)) {
      console.error("Invalid verseKey format:", verseKey);
      return "";
    }

    // Pad surah and ayah numbers to 3 digits
    const surahPadded = String(surahNumber).padStart(3, "0");
    const ayahPadded = String(ayahNumber).padStart(3, "0");

    // Default qari is al-afasy (prefix: QA)
    const qariName = "al-afasy";
    const prefix = "QA"; // Q for Quran, A for Afasy
    return `https://thafheem.net/audio/qirath/${qariName}/${prefix}${surahPadded}_${ayahPadded}.ogg`;
  } catch (error) {
    console.error("Error building audio URL for Tajweed:", error);
    return "";
  }
};

// const fetchWithTimeout = (url, options = {}, timeout = 8000) => {
//   return Promise.race([
//     fetch(url, options),
//     new Promise((_, reject) =>
//       setTimeout(() => reject(new Error('Request timeout')), timeout)
//     )
//   ]);
// };

// Fetch list of Malarticles
export const fetchMalarticles = async (page = 0, type = "muk") => {
  try {
    const url = `https://old.thafheem.net/thaf-api/malarticles/${page}/${type}`;
const response = await fetchWithTimeout(url, {}, 8000);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
// API returns array of objects with aid and title
    if (Array.isArray(data)) {
      return data.map((article) => ({
        aid: article.aid,
        title: article.title
      }));
    }
    
    throw new Error("Unexpected API response format");
  } catch (error) {
    console.warn("Failed to fetch malarticles from API:", error.message);

    // Fallback data
    return [
      { aid: 1, title: "കുറിപ്പ്" },
      { aid: 2, title: "ഖുര്‍ആന്‍ പഠനത്തിനൊരു മുഖവുര" },
      { aid: 3, title: "സവിശേഷമായൊരു ഗ്രന്ഥം" },
      { aid: 4, title: "ചില അടിസ്ഥാന വസ്തുതകള്‍" },
      { aid: 5, title: "എങ്ങനെയൊരു ഗ്രന്ഥം?" },
      { aid: 6, title: "ഖുര്‍ആന്‍ തത്ത്വം" },
      { aid: 7, title: "വിഷയവും പ്രമേയവും" },
      { aid: 8, title: "മാലയില്‍ കോര്‍ത്ത മുത്തുകള്‍" },
      { aid: 9, title: "അവതരണ ഘട്ടങ്ങള്‍" },
      { aid: 10, title: "നിര്‍ദ്ദേശപുസ്തകം" },
      { aid: 11, title: "ആവര്‍ത്തനം എന്തിന്?" },
      { aid: 12, title: "ഗ്രന്ഥീകരണം" },
      { aid: 13, title: "ഗ്രന്ഥ ചിത്രീകരണം" },
    ];
  }
};

// Fetch single article by ID
export const fetchMalarticleById = async (articleId) => {
  try {
    const url = `https://old.thafheem.net/thaf-api/malarticles/${articleId}/muk`;
const response = await fetchWithTimeout(url, {}, 8000);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
// API returns array with single object
    const articleData = Array.isArray(data) ? data[0] : data;
    
    if (!articleData) {
      throw new Error("No article data found");
    }

    return {
      id: articleData.aid,
      title: articleData.title,
      matter: articleData.matter || "",
      audiotext: articleData.audiotext || "",
      audiourl: articleData.audiourl || ""
    };
  } catch (error) {
    console.error("Failed to fetch malarticle by ID:", error.message);

    // Fallback content
    const fallbackContent = {
      1: {
        id: 1,
        title: "കുറിപ്പ്",
        matter: "ഖുര്‍ആന്‍ പഠിക്കുമ്പോള്‍ വായനക്കാരന്റെ മനസ്സില്‍ ഉയര്‍ന്നേക്കാവുന്ന എല്ലാപ്രശ്നങ്ങളെയും സംബന്ധിച്ച് ഇവിടെ പ്രതിപാദിക്കുക എന്നത് എന്റെ ഉദ്ദേശ്യമല്ല. കാരണം അവയില്‍ മിക്കവയും ഖുര്‍ആനിലെ ഏതെങ്കിലും വചനമോ അദ്ധ്യായമോ ദൃഷ്ടിയില്‍ വരുമ്പോഴാണ് ഉയര്‍ന്നു വരുക. അവയ്ക്കുള്ള ഉത്തരങ്ങള്‍ 'തഫ്ഹീമുല്‍ ഖുര്‍ആനി'ല്‍ അതത് സന്ദര്‍ഭങ്ങളില്‍ നല്‍കിയിട്ടുമുണ്ട്.",
        audiotext: "",
        audiourl: ""
      },
    };

    return fallbackContent[articleId] || {
      id: articleId,
      title: "ഉള്ളടക്കം ലഭ്യമല്ല",
      matter: "ഇന്റർനെറ്റ് കണക്ഷൻ പരിശോധിക്കുക.",
      audiotext: "",
      audiourl: ""
    };
  }
};
// Fetch list of English articles
// Fetch list of English articles
export const fetchEngarticles = async (page = 0, type = "par") => {
  try {
    const url = `${LEGACY_TFH_BASE}/engarticles/${page}/${type}`;
const response = await fetchWithTimeout(url, {}, 8000);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
// API returns array of objects with aid and title
    if (Array.isArray(data)) {
      return data.map((article) => ({
        aid: article.aid,
        title: article.title
      }));
    }
    
    throw new Error("Unexpected API response format");
  } catch (error) {
    console.warn("Failed to fetch engarticles from API:", error.message);

    // Fallback data
    return [
      { aid: 1, title: "The end of prophethood" },
      { aid: 2, title: "The meaning of Khatamunnabiyyin" },
      { aid: 3, title: "The Prophet's sayings regarding the end of the world" },
      { aid: 4, title: "The consensus of the Companions" },
      { aid: 5, title: "The consensus of religious scholars" },
      { aid: 6, title: "The Promised Messiah" },
    ];
  }
};

// Fetch single English article by ID
export const fetchEngarticleById = async (articleId) => {
  try {
    const url = `${LEGACY_TFH_BASE}/engarticles/${articleId}/par`;
const response = await fetchWithTimeout(url, {}, 8000);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
// API returns array with single object
    const articleData = Array.isArray(data) ? data[0] : data;
    
    if (!articleData) {
      throw new Error("No article data found");
    }

    return {
      id: articleData.aid,
      title: articleData.title,
      matter: articleData.matter || "",
      audiotext: articleData.audiotext || "",
      audiourl: articleData.audiourl || ""
    };
  } catch (error) {
    console.error("Failed to fetch engarticle by ID:", error.message);

    // Fallback content
    const fallbackContent = {
      1: {
        id: 1,
        title: "The end of prophethood",
        matter: "The party that has created the 'Great Tribulation', which is the new Prophethood in this era, has given the word 'Khatam-un-Nabiyyin' the meaning of 'seal of the prophets'. That is, the prophets who come after Prophet Muhammad (peace be upon Him) become prophets with the seal of that prophethood.",
      },
      2: {
        id: 2,
        title: "The meaning of Khatamunnabiyyin",
        matter: "Content for the meaning of Khatamunnabiyyin section...",
      },
      3: {
        id: 3,
        title: "The Prophet's sayings regarding the end of the world",
        matter: "Content for the Prophet's sayings regarding the end of the world...",
      },
      4: {
        id: 4,
        title: "The consensus of the Companions",
        matter: "Content for the consensus of the Companions section...",
      },
      5: {
        id: 5,
        title: "The consensus of religious scholars",
        matter: "Content for the consensus of religious scholars section...",
      },
      6: {
        id: 6,
        title: "The Promised Messiah",
        matter: "Content for the Promised Messiah section...",
      },
    };

    return fallbackContent[articleId] || {
      id: articleId,
      title: "Article Content",
      matter: "Content not available offline. Please check your internet connection.",
    };
  }
};

// Fetch single article by ID using the new articles API
const ARTICLE_FALLBACKS = {
  1: {
    id: 1,
    title: "Introduction",
    matter: "Content for Introduction section...",
  },
  2: {
    id: 2,
    title: "The meaning of Khatamunnabiyyin",
    matter: "Content for the meaning of Khatamunnabiyyin section...",
  },
  3: {
    id: 3,
    title: "The Prophet's sayings regarding the end of the world",
    matter: "Content for the Prophet's sayings regarding the end of the world...",
  },
  4: {
    id: 4,
    title: "The consensus of the Companions",
    matter: "Content for the consensus of the Companions section...",
  },
  5: {
    id: 5,
    title: "The consensus of religious scholars",
    matter: "Content for the consensus of religious scholars section...",
  },
  6: {
    id: 6,
    title: "The Promised Messiah",
    matter: "Content for the Promised Messiah section...",
  },
  7: {
    id: 7,
    title: "The Promised Messiah",
    matter: "Content for The Promised Messiah section...",
  },
  8: {
    id: 8,
    title: "Additional Article 8",
    matter: "Content for Additional Article 8 section...",
  },
  13: {
    id: 13,
    title: "Author's Conclusion",
    matter: "",
  },
};

const getArticleFallback = (articleId) => {
  if (ARTICLE_FALLBACKS[articleId]) {
    return ARTICLE_FALLBACKS[articleId];
  }

  return {
    id: articleId,
    title: `Article ${articleId}`,
    matter: "",
  };
};

export const fetchArticleById = async (articleId) => {
  try {
    const url = `${ARTICLES_API}/${articleId}/par`;
    const response = await fetchWithTimeout(url, {}, 8000);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawText = await response.text();
    if (!rawText || !rawText.trim()) {
      console.warn(`Empty article response for ${articleId}, using fallback`);
      return getArticleFallback(articleId);
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.warn(`Invalid article JSON for ${articleId}, using fallback`);
      return getArticleFallback(articleId);
    }

    // API returns array with single object or single object directly
    const articleData = Array.isArray(data) ? data[0] : data;
    
    if (!articleData) {
      console.warn(`Article ${articleId} response missing data, using fallback`);
      return getArticleFallback(articleId);
    }

    return {
      id: articleData.aid,
      title: articleData.title,
      matter: articleData.matter || "",
      audiotext: articleData.audiotext || "",
      audiourl: articleData.audiourl || ""
    };
  } catch (error) {
    console.error("Failed to fetch article by ID:", error.message);
    return getArticleFallback(articleId);
  }
};

const APPENDIX_LANGUAGE_MAP = {
  english: 'english',
  e: 'english',
  malayalam: 'malayalam',
  mal: 'malayalam',
  urdu: 'urdu',
  u: 'urdu',
  hindi: 'hindi',
  hi: 'hindi',
  bangla: 'bangla',
  bn: 'bangla',
  tamil: 'tamil',
  ta: 'tamil'
};

export const fetchAppendix = async (language = 'english') => {
  const apiLangKey =
    APPENDIX_LANGUAGE_MAP[String(language || '').toLowerCase()] || 'english';

  try {
    const response = await fetch(`${API_BASE_PATH}/${apiLangKey}/appendix`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || apiLangKey,
      count: data?.count ?? data?.sections?.length ?? 0,
      sections: data?.sections || [],
    };
  } catch (error) {
    console.error(`Failed to fetch ${apiLangKey} appendix:`, error.message);
    return {
      language: apiLangKey,
      count: 0,
      sections: [],
      error: error.message,
    };
  }
};

// Fetch Urdu Finality of Prophethood
export const fetchUrduFinalityOfProphethood = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/urdu/finality-of-prophethood`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'urdu',
      count: data?.count ?? data?.sections?.length ?? 0,
      sections: data?.sections || [],
    };
  } catch (error) {
    console.error('Failed to fetch Urdu Finality of Prophethood:', error.message);
    return {
      language: 'urdu',
      count: 0,
      sections: [],
      error: error.message,
    };
  }
};

// Fetch Urdu Finality of Prophethood Footnote by ID
export const fetchUrduFinalityFootnote = async (footnoteId) => {
  try {
    const id = parseInt(footnoteId, 10);
    if (isNaN(id) || id <= 0) {
      throw new Error('Invalid footnote ID');
    }

    const response = await fetch(`${API_BASE_PATH}/urdu/finality-of-prophethood/footnote/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      footnote_id: data?.footnote_id ?? id,
      footnote_text: data?.footnote_text || '',
      error: data?.error || null,
    };
  } catch (error) {
    console.error('Failed to fetch Urdu Finality of Prophethood footnote:', error.message);
    return {
      footnote_id: footnoteId ?? null,
      footnote_text: '',
      error: error.message,
    };
  }
};

// Fetch Urdu Jesus and Mohammed
export const fetchUrduJesusMohammed = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/urdu/jesus-mohammed`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'urdu',
      count: data?.count ?? data?.sections?.length ?? 0,
      sections: data?.sections || [],
    };
  } catch (error) {
    console.error('Failed to fetch Urdu Jesus and Mohammed:', error.message);
    return {
      language: 'urdu',
      count: 0,
      sections: [],
      error: error.message,
    };
  }
};

// Fetch Malayalam Jesus and Mohammed
export const fetchMalayalamJesusMohammed = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/malayalam/jesus-mohammed`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'malayalam',
      count: data?.count ?? data?.sections?.length ?? 0,
      sections: data?.sections || [],
    };
  } catch (error) {
    console.error('Failed to fetch Malayalam Jesus and Mohammed:', error.message);
    return {
      language: 'malayalam',
      count: 0,
      sections: [],
      error: error.message,
    };
  }
};

// Fetch Hindi Jesus and Mohammed
export const fetchHindiJesusMohammed = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/hindi/jesus-mohammed`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'hindi',
      count: data?.count ?? data?.sections?.length ?? 0,
      sections: data?.sections || [],
    };
  } catch (error) {
    console.error('Failed to fetch Hindi Jesus and Mohammed:', error.message);
    return {
      language: 'hindi',
      count: 0,
      sections: [],
      error: error.message,
    };
  }
};

// Fetch English Jesus and Mohammed
export const fetchEnglishJesusMohammed = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/english/jesus-mohammed`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'english',
      count: data?.count ?? data?.sections?.length ?? 0,
      sections: data?.sections || [],
    };
  } catch (error) {
    console.error('Failed to fetch English Jesus and Mohammed:', error.message);
    return {
      language: 'english',
      count: 0,
      sections: [],
      error: error.message,
    };
  }
};

// Fetch Malayalam Finality of Prophethood
export const fetchMalayalamFinalityOfProphethood = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/malayalam/finality-of-prophethood`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'malayalam',
      count: data?.count ?? data?.sections?.length ?? 0,
      sections: data?.sections || [],
    };
  } catch (error) {
    console.error('Failed to fetch Malayalam Finality of Prophethood:', error.message);
    return {
      language: 'malayalam',
      count: 0,
      sections: [],
      error: error.message,
    };
  }
};

// Fetch Malayalam Introduction to Quran
export const fetchMalayalamIntroductionToQuran = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/malayalam/introduction-to-quran`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'malayalam',
      count: data?.count ?? data?.sections?.length ?? 0,
      sections: data?.sections || [],
    };
  } catch (error) {
    console.error('Failed to fetch Malayalam Introduction to Quran:', error.message);
    return {
      language: 'malayalam',
      count: 0,
      sections: [],
      error: error.message,
    };
  }
};

// Fetch English Introduction to Quran
export const fetchEnglishIntroductionToQuran = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/english/introduction-to-quran`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'english',
      count: data?.count ?? data?.sections?.length ?? 0,
      sections: data?.sections || [],
    };
  } catch (error) {
    console.error('Failed to fetch English Introduction to Quran:', error.message);
    return {
      language: 'english',
      count: 0,
      sections: [],
      error: error.message,
    };
  }
};

// Fetch Hindi Introduction to Quran
export const fetchHindiIntroductionToQuran = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/hindi/introduction-to-quran`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'hindi',
      count: data?.count ?? data?.sections?.length ?? 0,
      sections: data?.sections || [],
    };
  } catch (error) {
    console.error('Failed to fetch Hindi Introduction to Quran:', error.message);
    return {
      language: 'hindi',
      count: 0,
      sections: [],
      error: error.message,
    };
  }
};

// Fetch Bangla Introduction to Quran
export const fetchBanglaIntroductionToQuran = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/bangla/introduction-to-quran`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'bangla',
      count: data?.count ?? data?.sections?.length ?? 0,
      sections: data?.sections || [],
    };
  } catch (error) {
    console.error('Failed to fetch Bangla Introduction to Quran:', error.message);
    return {
      language: 'bangla',
      count: 0,
      sections: [],
      error: error.message,
    };
  }
};

// Fetch Tamil Introduction to Quran
export const fetchTamilIntroductionToQuran = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/tamil/introduction-to-quran`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'tamil',
      count: data?.count ?? data?.sections?.length ?? 0,
      sections: data?.sections || [],
    };
  } catch (error) {
    console.error('Failed to fetch Tamil Introduction to Quran:', error.message);
    return {
      language: 'tamil',
      count: 0,
      sections: [],
      error: error.message,
    };
  }
};

// Fetch English Finality of Prophethood
export const fetchEnglishFinalityOfProphethood = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/english/finality-of-prophethood`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'english',
      count: data?.count ?? data?.sections?.length ?? 0,
      sections: data?.sections || [],
    };
  } catch (error) {
    console.error('Failed to fetch English Finality of Prophethood:', error.message);
    return {
      language: 'english',
      count: 0,
      sections: [],
      error: error.message,
    };
  }
};

// Fetch Hindi Finality of Prophethood
export const fetchHindiFinalityOfProphethood = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/hindi/finality-of-prophethood`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'hindi',
      count: data?.count ?? data?.sections?.length ?? 0,
      sections: data?.sections || [],
    };
  } catch (error) {
    console.error('Failed to fetch Hindi Finality of Prophethood:', error.message);
    return {
      language: 'hindi',
      count: 0,
      sections: [],
      error: error.message,
    };
  }
};

// Fetch Bangla Jesus and Mohammed
export const fetchBanglaJesusMohammed = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/bangla/jesus-mohammed`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'bangla',
      count: data?.count ?? data?.sections?.length ?? 0,
      sections: data?.sections || [],
    };
  } catch (error) {
    console.error('Failed to fetch Bangla Jesus and Mohammed:', error.message);
    return {
      language: 'bangla',
      count: 0,
      sections: [],
      error: error.message,
    };
  }
};

// Fetch Tamil Jesus and Mohammed
export const fetchTamilJesusMohammed = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/tamil/jesus-mohammed`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'tamil',
      count: data?.count ?? data?.sections?.length ?? 0,
      sections: data?.sections || [],
    };
  } catch (error) {
    console.error('Failed to fetch Tamil Jesus and Mohammed:', error.message);
    return {
      language: 'tamil',
      count: 0,
      sections: [],
      error: error.message,
    };
  }
};

// Fetch Bangla Finality of Prophethood
export const fetchBanglaFinalityOfProphethood = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/bangla/finality-of-prophethood`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'bangla',
      count: data?.count ?? data?.sections?.length ?? 0,
      sections: data?.sections || [],
    };
  } catch (error) {
    console.error('Failed to fetch Bangla Finality of Prophethood:', error.message);
    return {
      language: 'bangla',
      count: 0,
      sections: [],
      error: error.message,
    };
  }
};

// Fetch Tamil Finality of Prophethood
export const fetchTamilFinalityOfProphethood = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/tamil/finality-of-prophethood`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'tamil',
      count: data?.count ?? data?.sections?.length ?? 0,
      sections: data?.sections || [],
    };
  } catch (error) {
    console.error('Failed to fetch Tamil Finality of Prophethood:', error.message);
    return {
      language: 'tamil',
      count: 0,
      sections: [],
      error: error.message,
    };
  }
};

// Fetch Technical Terms for any language (from technical_terms table)
export const fetchTechnicalTerms = async (language) => {
  try {
    const response = await fetch(`${API_BASE_PATH}/technical-terms/${encodeURIComponent(language)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || language,
      id: data?.id || null,
      title: data?.title || null,
      text: data?.text || '',
      audio_url: data?.audio_url || null,
      error: data?.error || null,
    };
  } catch (error) {
    console.error(`Failed to fetch Technical Terms for ${language}:`, error.message);
    return {
      language,
      id: null,
      title: null,
      text: '',
      audio_url: null,
      error: error.message,
    };
  }
};

// Fetch Malayalam Technical Terms (article ID 9)
export const fetchMalayalamTechnicalTerms = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/malayalam/technical-terms`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'malayalam',
      id: data?.id || 9,
      title: data?.title || null,
      text: data?.text || '',
      raw_title: data?.raw_title || null,
      raw_text: data?.raw_text || '',
      error: data?.error || null,
    };
  } catch (error) {
    console.error('Failed to fetch Malayalam Technical Terms:', error.message);
    return {
      language: 'malayalam',
      id: 9,
      title: null,
      text: '',
      raw_title: null,
      raw_text: '',
      error: error.message,
    };
  }
};

// Fetch note by ID (uses /api/notes/:noteId)
export const fetchMalayalamFootnote = async (footnoteId) => {
  try {
    const id = String(footnoteId || '').trim();
    if (!id) {
      throw new Error('Invalid note id');
    }

    const response = await fetch(`${API_BASE_PATH}/notes/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const noteContent =
      data?.NoteText ||
      data?.note_text ||
      data?.content ||
      data?.html ||
      data?.text ||
      '';

    return {
      footnote_id: data?.id ?? data?.note_id ?? id,
      footnote_text: noteContent,
      error: data?.error || null,
    };
  } catch (error) {
    console.error('Failed to fetch Malayalam footnote:', error.message);
    return {
      footnote_id: footnoteId ?? null,
      footnote_text: '',
      error: error.message,
    };
  }
};

// Fetch English Finality of Prophethood Footnote by ID
export const fetchEnglishFinalityFootnote = async (footnoteId) => {
  try {
    const id = parseInt(footnoteId, 10);
    if (isNaN(id) || id <= 0) {
      throw new Error('Invalid footnote ID');
    }

    const response = await fetch(`${API_BASE_PATH}/english/finality-of-prophethood/footnote/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      footnote_id: data?.footnote_id ?? id,
      footnote_text: data?.footnote_text || '',
      error: data?.error || null,
    };
  } catch (error) {
    console.error('Failed to fetch English Finality of Prophethood footnote:', error.message);
    return {
      footnote_id: footnoteId ?? null,
      footnote_text: '',
      error: error.message,
    };
  }
};

// Fetch Malayalam Translators
export const fetchMalayalamTranslators = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/malayalam/translators`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'malayalam',
      id: data?.id || null,
      title: data?.title || null,
      text: data?.text || '',
      raw_title: data?.raw_title || null,
      raw_text: data?.raw_text || '',
      error: data?.error || null,
    };
  } catch (error) {
    console.error('Failed to fetch Malayalam Translators:', error.message);
    return {
      language: 'malayalam',
      id: null,
      title: null,
      text: '',
      raw_title: null,
      raw_text: '',
      error: error.message,
    };
  }
};

// Fetch Malayalam History of Translation (article ID 11)
export const fetchMalayalamHistoryOfTranslation = async () => {
  try {
    const response = await fetch(`${API_BASE_PATH}/malayalam/history-of-translation`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      language: data?.language || 'malayalam',
      id: data?.id || 11,
      title: data?.title || null,
      text: data?.text || '',
      raw_title: data?.raw_title || null,
      raw_text: data?.raw_text || '',
      error: data?.error || null,
    };
  } catch (error) {
    console.error('Failed to fetch Malayalam History of Translation:', error.message);
    return {
      language: 'malayalam',
      id: 11,
      title: null,
      text: '',
      raw_title: null,
      raw_text: '',
      error: error.message,
    };
  }
};

// Fetch list of articles (for navbar)
export const fetchArticlesList = async () => {
  try {
    // Since we don't have a direct list endpoint, we'll fetch individual articles
    // For now, we'll use a predefined list of article IDs
    const articleIds = [1, 2, 3, 4, 5, 6, 7, 8]; // All available article IDs
    
const articles = await Promise.all(
      articleIds.map(async (id) => {
        try {
          const article = await fetchArticleById(id);
return {
            aid: article.id,
            title: article.title
          };
        } catch (error) {
          console.warn(`Failed to fetch article ${id}:`, error.message);
          return {
            aid: id,
            title: `Article ${id}`
          };
        }
      })
    );
    
return articles;
  } catch (error) {
    console.error("Failed to fetch articles list:", error.message);
    
    // Fallback data
    const fallbackData = [
      { aid: 1, title: "Introduction" },
      { aid: 2, title: "The meaning of Khatamunnabiyyin" },
      { aid: 3, title: "The Prophet's sayings regarding the end of the world" },
      { aid: 4, title: "The consensus of the Companions" },
      { aid: 5, title: "The consensus of religious scholars" },
      { aid: 6, title: "The Promised Messiah" },
      { aid: 7, title: "The Promised Messiah" },
      { aid: 8, title: "Additional Article 8" },
    ];
return fallbackData;
  }
};

// Fetch English interpretations using specific footnote endpoints
export const fetchEnglishInterpretations = async (surahId, verseId) => {
try {
    // For Surah 1, Ayah 5, we know the specific footnote IDs: 177002 and 177003
    // For other verses, we'll need to determine the footnote IDs dynamically
    let footnoteIds = [];
    
    if (parseInt(surahId) === 1 && parseInt(verseId) === 5) {
      // Special case for Al-Fatiha Ayah 5 - we know the footnote IDs
      footnoteIds = ['177002', '177003'];
    } else {
      // For other verses, we need to determine footnote IDs from the translation text
      // This would require parsing the translation to find footnote references
      // For now, we'll return empty array for non-Al-Fatiha verses
return [];
    }
    
    const interpretations = [];
    
    // Fetch each footnote
    for (const footnoteId of footnoteIds) {
      try {
        // Use the correct API endpoint: http://localhost:5000/api/english/footnote/{footnoteId}
        const apiBase = CONFIG_API_BASE_PATH || API_BASE_PATH;
        const response = await fetch(`${apiBase}/english/footnote/${footnoteId}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.footnote_text) {
            interpretations.push({
              footnote_id: footnoteId,
              text: data.footnote_text,
              content: data.footnote_text,
              explanation: data.footnote_text
            });
}
        } else {
}
      } catch (error) {
        console.error(`❌ [fetchEnglishInterpretations] Error fetching footnote ${footnoteId}:`, error);
      }
    }
    
return interpretations;
    
  } catch (error) {
    console.error(`❌ [fetchEnglishInterpretations] Error fetching English interpretations:`, error);
    return [];
  }
};

// ─── Feedback & Feature Request ───────────────────────────────────────────────

export const submitFeedback = async (data) => {
  const response = await fetch(FEEDBACK_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Failed to submit feedback');
  }
  return result;
};

export const submitFeatureRequest = async (data) => {
  const response = await fetch(FEATURE_REQUEST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Failed to submit feature request');
  }
  return result;
};
