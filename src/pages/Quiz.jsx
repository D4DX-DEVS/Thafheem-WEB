import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  fetchEntireSurahQuizPaginated,
  fetchTafheemQuizPaginated,
  fetchQuizQuestionsForRange,
  fetchAyaRanges,
  validateQuizData,
  transformQuizData,
  createFallbackQuizData,
} from "../api/apifunction";
import { useSurahData } from "../hooks/useSurahData";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { QuizSkeleton } from "../components/LoadingSkeleton";

const SURAH_PAGE_SIZE = 5;
const THAFHEEM_PAGE_SIZE = 20;

// ─── Quiz draft persistence (resume where you left off) ───────────────────
// Stored in localStorage, keyed per Firebase user (guests share a 'guest' key).
// Only the long modes (Entire Surah / Entire Thafheem) are persisted.
const QUIZ_DRAFT_KEY = "thafheem_quiz_draft_v1";
const buildDraftKey = (uid) => `${QUIZ_DRAFT_KEY}:${uid || "guest"}`;

const readDraft = (uid) => {
  try {
    const raw = localStorage.getItem(buildDraftKey(uid));
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft || draft.v !== 1) return null;
    return draft;
  } catch {
    return null;
  }
};

const writeDraft = (uid, draft) => {
  try {
    localStorage.setItem(buildDraftKey(uid), JSON.stringify(draft));
  } catch {
    /* storage full / unavailable — ignore */
  }
};

const removeDraft = (uid) => {
  try {
    localStorage.removeItem(buildDraftKey(uid));
  } catch {
    /* ignore */
  }
};

const Quiz = () => {
  // ─── State ───────────────────────────────────────────────────────────────
  // Entire Surah / Blockwise: all questions fetched upfront
  const [allQuestions, setAllQuestions] = useState([]);
  // Entire Tafheem: single page of questions (same slot as allQuestions but driven by tafheem state)

  const [currentPage, setCurrentPage] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { overallIndex: answerId }
  const [submittedQuestions, setSubmittedQuestions] = useState({}); // { overallIndex: true }
  const [score, setScore] = useState(0);
  const [quizTitle, setQuizTitle] = useState("തഫ്ഹീം പ്രശ്നോത്തരി");

  const [showSurahDropdown, setShowSurahDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [ayahRanges, setAyahRanges] = useState([]);
  const [loadingRanges, setLoadingRanges] = useState(false);
  const [selectedSurahForRanges, setSelectedSurahForRanges] = useState(null);

  // Server-side pagination metadata for Entire Surah mode
  const [surahTotalPages, setSurahTotalPages] = useState(1);
  const [surahTotalQuestions, setSurahTotalQuestions] = useState(0);
  const [surahServerHasNextPage, setSurahServerHasNextPage] = useState(false);

  // Server-side pagination metadata for Entire Tafheem mode
  const [tafheemTotalPages, setTafheemTotalPages] = useState(1);
  const [tafheemTotalQuestions, setTafheemTotalQuestions] = useState(0);
  const [tafheemServerHasNextPage, setTafheemServerHasNextPage] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const [selectedSurah, setSelectedSurah] = useState({ id: 1, name: "Al-Fatihah" });
  const [selectedRange, setSelectedRange] = useState("1-7");
  const [isEntireSurah, setIsEntireSurah] = useState(true);
  const [isEntireThafheem, setIsEntireThafheem] = useState(false);

  // ─── Client-side page cache for Entire Surah mode ─────────────────────
  // Map<pageIndex, { questions, totalPages, totalQuestions, hasNextPage }>
  const surahPageCache = useRef(new Map());
  const prefetchRef = useRef(null);

  // ─── Client-side page cache + seed for Entire Tafheem mode ────────────────
  // Seed is fixed per-session so ORDER BY RAND(seed) gives stable page ordering
  const tafheemSeed = useRef(null);
  const tafheemPageCache = useRef(new Map());
  const tafheemPrefetchRef = useRef(null);

  const { translationLanguage } = useTheme();
  const { surahs: surahList } = useSurahData(translationLanguage);
  const { user } = useAuth();

  // ─── Draft / resume state ────────────────────────────────────────────────
  const [resumeDraft, setResumeDraft] = useState(null); // draft offered in the banner
  const resumingRef = useRef(false);    // suppresses the initial-load effect while resuming
  const draftCheckedRef = useRef(false); // ensures we only offer the draft once on mount

  // ─── Min 3 questions per block ───────────────────────────────────────────
  const getQuestionLimit = (ayaFrom, ayaTo) => {
    const count = ayaTo - ayaFrom + 1;
    if (count <= 5) return 3;
    if (count <= 10) return 5;
    return 6;
  };

  // ─── Fetch a page (from cache or network) and store it ──────────────────
  const fetchAndCachePage = async (surahId, pageIndex) => {
    const cached = surahPageCache.current.get(pageIndex);
    if (cached) return cached;

    const quizResponse = await fetchEntireSurahQuizPaginated(
      surahId, pageIndex + 1, SURAH_PAGE_SIZE
    );
    const rawItems = quizResponse?.questions || [];
    const questions = transformQuizData(rawItems);
    const entry = {
      questions: validateQuizData(questions) ? questions : [],
      totalPages: quizResponse?.totalPages ?? null,
      totalQuestions: quizResponse?.totalQuestions ?? null,
      hasNextPage: quizResponse?.hasNextPage ?? false,
    };
    surahPageCache.current.set(pageIndex, entry);

    // If server now reports totals, back-fill into all cached entries
    if (entry.totalPages != null) {
      for (const [, v] of surahPageCache.current) {
        v.totalPages = entry.totalPages;
        v.totalQuestions = entry.totalQuestions;
      }
    }
    return entry;
  };

  // ─── Prefetch the next page silently in the background ──────────────────
  const prefetchNextPage = (surahId, currentPageIndex) => {
    const nextIdx = currentPageIndex + 1;
    if (surahPageCache.current.has(nextIdx)) return;
    // Avoid duplicate in-flight prefetch
    if (prefetchRef.current === nextIdx) return;
    prefetchRef.current = nextIdx;
    fetchAndCachePage(surahId, nextIdx)
      .catch(() => {}) // silently ignore prefetch errors
      .finally(() => { prefetchRef.current = null; });
  };

  // ─── Tafheem page helpers (mirror surah helpers) ─────────────────────
  const fetchAndCacheTafheemPage = async (pageIndex) => {
    const cached = tafheemPageCache.current.get(pageIndex);
    if (cached) return cached;

    const response = await fetchTafheemQuizPaginated(
      pageIndex + 1, THAFHEEM_PAGE_SIZE, tafheemSeed.current
    );
    const rawItems = response?.questions || [];
    // Backend normalizes rows — just filter out any corrupt ones
    const questions = rawItems.filter(
      (q) => q.question && q.options?.length > 0 && q.correctAnswer
    );
    const entry = {
      questions,
      totalPages: response?.totalPages ?? null,
      totalQuestions: response?.totalQuestions ?? null,
      hasNextPage: response?.hasNextPage ?? false,
    };
    tafheemPageCache.current.set(pageIndex, entry);
    return entry;
  };

  const applyTafheemPage = (entry, pageIndex) => {
    setAllQuestions(entry.questions);
    if (entry.totalPages != null) setTafheemTotalPages(entry.totalPages);
    if (entry.totalQuestions != null) setTafheemTotalQuestions(entry.totalQuestions);
    setTafheemServerHasNextPage(entry.hasNextPage);
    setCurrentPage(pageIndex);
  };

  const prefetchNextTafheemPage = (currentPageIndex) => {
    const nextIdx = currentPageIndex + 1;
    if (tafheemPageCache.current.has(nextIdx)) return;
    if (tafheemPrefetchRef.current === nextIdx) return;
    tafheemPrefetchRef.current = nextIdx;
    fetchAndCacheTafheemPage(nextIdx)
      .catch(() => {})
      .finally(() => { tafheemPrefetchRef.current = null; });
  };

  // ─── Apply a cached surah page entry to state ─────────────────────────────────
  const applySurahPage = (entry, pageIndex) => {
    setAllQuestions(entry.questions);
    if (entry.totalPages != null) setSurahTotalPages(entry.totalPages);
    if (entry.totalQuestions != null) setSurahTotalQuestions(entry.totalQuestions);
    setSurahServerHasNextPage(entry.hasNextPage);
    setCurrentPage(pageIndex);
  };

  // ─── Derived: which questions to show on the current page ────────────────
  // For all modes, allQuestions holds the current page's questions
  const currentQuestions = allQuestions;

  const totalPages = isEntireThafheem
    ? tafheemTotalPages
    : isEntireSurah
      ? surahTotalPages
      : 1;

  const totalLoadedQuestions = isEntireThafheem
    ? tafheemTotalQuestions
    : isEntireSurah
      ? surahTotalQuestions
      : allQuestions.length;

  const getOverallIndex = (pageLocalIndex) => {
    if (isEntireThafheem) return currentPage * THAFHEEM_PAGE_SIZE + pageLocalIndex;
    if (isEntireSurah) return currentPage * SURAH_PAGE_SIZE + pageLocalIndex;
    return pageLocalIndex;
  };

  const hasNextPage = isEntireThafheem
    ? tafheemServerHasNextPage
    : isEntireSurah
      ? surahServerHasNextPage
      : currentPage < totalPages - 1;

  // ─── Page range label for header ─────────────────────────────────────────
  let pageRangeLabel = "";
  if (isEntireThafheem && allQuestions.length > 0) {
    const start = currentPage * THAFHEEM_PAGE_SIZE + 1;
    const end = currentPage * THAFHEEM_PAGE_SIZE + allQuestions.length;
    const totalLabel = tafheemTotalQuestions > 0 ? String(tafheemTotalQuestions) : "...";
    pageRangeLabel = `${start}\u2013${end} / ${totalLabel}`;
  } else if (isEntireSurah && allQuestions.length > 0) {
    const start = currentPage * SURAH_PAGE_SIZE + 1;
    const end = currentPage * SURAH_PAGE_SIZE + allQuestions.length;
    // Show "..." until the backend has fetched all blocks
    const totalLabel = surahTotalQuestions > 0 ? String(surahTotalQuestions) : "...";
    pageRangeLabel = `${start}\u2013${end} / ${totalLabel}`;
  }

  // ─── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    const loadInitialQuiz = async () => {
      try {
        setLoading(true);
        setError(null);
        setCurrentPage(0);
        setUserAnswers({});
        setSubmittedQuestions({});
        setScore(0);
        setAllQuestions([]);
        setTafheemTotalPages(1);
        setTafheemTotalQuestions(0);
        setTafheemServerHasNextPage(false);
        setSurahTotalPages(1);
        setSurahTotalQuestions(0);
        setSurahServerHasNextPage(false);
        tafheemSeed.current = null;
        tafheemPageCache.current = new Map();
        tafheemPrefetchRef.current = null;
        surahPageCache.current = new Map();
        prefetchRef.current = null;

        if (isEntireThafheem) {
          // Generate a fresh random seed each time Entire Tafheem is entered.
          // The seed is passed to ORDER BY RAND(seed) on the backend so every
          // page of the same session uses the same shuffle — no duplicates.
          const seed = Math.floor(Math.random() * 999999) + 1;
          tafheemSeed.current = seed;
          tafheemPageCache.current = new Map();
          const entry = await fetchAndCacheTafheemPage(0);
          applyTafheemPage(entry, 0);
          setQuizTitle("തഫ്ഹീം പ്രശ്നോത്തരി - സമ്പൂർണ്ണ തഫ്ഹീം");
          // Prefetch page 2 so first Next is instant
          prefetchNextTafheemPage(0);
        } else if (isEntireSurah) {
          // Server-side: load page 1 via cache helper, then prefetch page 2
          const entry = await fetchAndCachePage(selectedSurah.id, 0);
          applySurahPage(entry, 0);
          setQuizTitle("തഫ്ഹീം പ്രശ്നോത്തരി");
          // Prefetch page 2 in the background for instant Next
          prefetchNextPage(selectedSurah.id, 0);
        } else {
          const [start, end] = selectedRange.split("-").map(Number);
          const rawData = await fetchQuizQuestionsForRange(selectedSurah.id, start, end || start);
          let questions = transformQuizData(rawData);
          const limit = getQuestionLimit(start, end || start);
          if (questions.length > limit) {
            questions = questions.sort(() => Math.random() - 0.5).slice(0, limit);
          }
          setAllQuestions(validateQuizData(questions) ? questions : []);
          setQuizTitle("തഫ്ഹീം പ്രശ്നോത്തരി");
        }
      } catch (err) {
        setError(err.message);
        const fallbackData = createFallbackQuizData(selectedSurah.id);
        setAllQuestions(fallbackData.questions);
        setQuizTitle("തഫ്ഹീം പ്രശ്നോത്തരി (Error Mode)");
      } finally {
        setLoading(false);
      }
    };

    // While a resume is in progress, handleResume manages loading itself.
    if (resumingRef.current) return;
    if (selectedSurah.id || isEntireThafheem) {
      loadInitialQuiz();
    }
  }, [selectedSurah.id, selectedRange, isEntireSurah, isEntireThafheem]);

  // ─── Offer a saved draft once on mount ────────────────────────────────────
  useEffect(() => {
    if (draftCheckedRef.current) return;
    draftCheckedRef.current = true;
    const draft = readDraft(user?.uid);
    if (!draft || (draft.mode !== "surah" && draft.mode !== "tafheem")) return;
    const answered = draft.userAnswers ? Object.keys(draft.userAnswers).length : 0;
    const hasProgress = (draft.currentPage || 0) > 0 || (draft.score || 0) > 0 || answered > 0;
    if (hasProgress) setResumeDraft(draft);
  }, [user?.uid]);

  // ─── Auto-save progress for the long modes ────────────────────────────────
  useEffect(() => {
    if (resumingRef.current || loading) return;
    if (!isEntireSurah && !isEntireThafheem) return;
    const answered = Object.keys(userAnswers).length;
    const hasProgress = currentPage > 0 || score > 0 || answered > 0;
    if (!hasProgress) return;
    writeDraft(user?.uid, {
      v: 1,
      mode: isEntireThafheem ? "tafheem" : "surah",
      selectedSurah,
      selectedRange,
      currentPage,
      score,
      seed: tafheemSeed.current,
      userAnswers,
      submittedQuestions,
      title: quizTitle,
      savedAt: Date.now(),
    });
  }, [
    currentPage,
    score,
    userAnswers,
    submittedQuestions,
    isEntireSurah,
    isEntireThafheem,
    selectedSurah,
    selectedRange,
    loading,
    user?.uid,
  ]);

  // ─── Resume the saved draft ───────────────────────────────────────────────
  const handleResume = async () => {
    const draft = resumeDraft;
    if (!draft) return;
    setResumeDraft(null);
    resumingRef.current = true;

    // Reset caches so the restored page is fetched cleanly
    surahPageCache.current = new Map();
    prefetchRef.current = null;
    tafheemPageCache.current = new Map();
    tafheemPrefetchRef.current = null;

    // Align mode / selection state (may trigger the load effect, which is guarded)
    setIsEntireThafheem(draft.mode === "tafheem");
    setIsEntireSurah(draft.mode === "surah");
    if (draft.selectedSurah) setSelectedSurah(draft.selectedSurah);
    if (draft.selectedRange) setSelectedRange(draft.selectedRange);

    const targetPage = draft.currentPage || 0;
    try {
      setLoading(true);
      setError(null);
      if (draft.mode === "tafheem") {
        tafheemSeed.current = draft.seed || Math.floor(Math.random() * 999999) + 1;
        const entry = await fetchAndCacheTafheemPage(targetPage);
        applyTafheemPage(entry, targetPage);
        setQuizTitle(draft.title || "തഫ്ഹീം പ്രശ്നോത്തരി - സമ്പൂർണ്ണ തഫ്ഹീം");
        prefetchNextTafheemPage(targetPage);
      } else {
        const entry = await fetchAndCachePage(draft.selectedSurah.id, targetPage);
        applySurahPage(entry, targetPage);
        setQuizTitle(draft.title || "തഫ്ഹീം പ്രശ്നോത്തരി");
        prefetchNextPage(draft.selectedSurah.id, targetPage);
      }
      setScore(draft.score || 0);
      setUserAnswers(draft.userAnswers || {});
      setSubmittedQuestions(draft.submittedQuestions || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      resumingRef.current = false;
    }
  };

  const handleStartFresh = () => {
    removeDraft(user?.uid);
    setResumeDraft(null);
  };

  // Friendly label for the resume banner
  const draftQuestionLabel = resumeDraft
    ? resumeDraft.mode === "tafheem"
      ? `ചോദ്യം ${(resumeDraft.currentPage || 0) * THAFHEEM_PAGE_SIZE + 1} മുതൽ`
      : `${resumeDraft.selectedSurah?.name || ""} · ചോദ്യം ${(resumeDraft.currentPage || 0) * SURAH_PAGE_SIZE + 1} മുതൽ`
    : "";

  // ─── Pagination ───────────────────────────────────────────────────────────
  const handleNextPage = async () => {
    const nextPage = currentPage + 1;
    if (isEntireThafheem) {
      // Server-side pagination: MySQL ORDER BY RAND(seed) guarantees no dupes
      if (tafheemServerHasNextPage) {
        try {
          const isCached = tafheemPageCache.current.has(nextPage);
          if (!isCached) setLoadingMore(true);
          const entry = await fetchAndCacheTafheemPage(nextPage);
          applyTafheemPage(entry, nextPage);
          setUserAnswers({});
          setSubmittedQuestions({});
          window.scrollTo({ top: 0, behavior: "smooth" });
          prefetchNextTafheemPage(nextPage);
        } catch (err) {
          console.error("Failed to load next Tafheem page:", err);
        } finally {
          setLoadingMore(false);
        }
      }
    } else if (isEntireSurah) {
      // Server-side pagination: use client cache for instant navigation
      if (surahServerHasNextPage) {
        try {
          // Only show spinner if page is NOT already cached
          const isCached = surahPageCache.current.has(nextPage);
          if (!isCached) setLoadingMore(true);
          const entry = await fetchAndCachePage(selectedSurah.id, nextPage);
          applySurahPage(entry, nextPage);
          setUserAnswers({});
          setSubmittedQuestions({});
          window.scrollTo({ top: 0, behavior: "smooth" });
          // Prefetch page N+2 in the background
          prefetchNextPage(selectedSurah.id, nextPage);
        } catch (err) {
          console.error("Failed to load next surah quiz page:", err);
        } finally {
          setLoadingMore(false);
        }
      }
    } else {
      if (nextPage < totalPages) {
        setCurrentPage(nextPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handlePrevPage = async () => {
    if (currentPage > 0) {
      if (isEntireSurah) {
        // Previous pages are always cached → instant, no spinner
        const prevPage = currentPage - 1;
        try {
          const entry = await fetchAndCachePage(selectedSurah.id, prevPage);
          applySurahPage(entry, prevPage);
          setUserAnswers({});
          setSubmittedQuestions({});
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
          console.error("Failed to load prev surah quiz page:", err);
        }
      } else if (isEntireThafheem) {
        // Tafheem prev pages are cached → instant, no spinner
        const prevPage = currentPage - 1;
        try {
          const entry = await fetchAndCacheTafheemPage(prevPage);
          applyTafheemPage(entry, prevPage);
          setUserAnswers({});
          setSubmittedQuestions({});
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
          console.error("Failed to load prev Tafheem page:", err);
        }
      } else {
        setCurrentPage((prev) => prev - 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  // ─── Answer handling ──────────────────────────────────────────────────────
  const handleAnswerSelect = (overallIndex, answerId) => {
    if (submittedQuestions[overallIndex]) return;
    setUserAnswers((prev) => ({ ...prev, [overallIndex]: answerId }));
  };

  const handleSubmitAnswer = (overallIndex, correctAnswer) => {
    const selected = userAnswers[overallIndex];
    if (!selected || submittedQuestions[overallIndex]) return;
    setSubmittedQuestions((prev) => ({ ...prev, [overallIndex]: true }));
    if (String(selected).trim() === String(correctAnswer).trim()) {
      setScore((prev) => prev + 1);
    }
  };

  // ─── Surah/range selection ────────────────────────────────────────────────
  const handleSurahSelect = async (surah) => {
    setSelectedSurahForRanges(surah);
    try {
      setLoadingRanges(true);
      const ranges = await fetchAyaRanges(surah.id, translationLanguage);
      setAyahRanges(Array.isArray(ranges) ? ranges : []);
    } catch (_) {
      setAyahRanges([]);
    } finally {
      setLoadingRanges(false);
    }
  };

  const handleEntireSurahSelect = (surah) => {
    setSelectedSurah({ id: surah.id, name: surah.name, ayahs: surah.ayahs });
    setSelectedRange(`1-${surah.ayahs}`);
    setIsEntireSurah(true);
    setIsEntireThafheem(false);
    setShowSurahDropdown(false);
    setSelectedSurahForRanges(null);
    setAyahRanges([]);
    setSearchQuery("");
  };

  const handleRangeSelect = (range) => {
    setSelectedSurah(selectedSurahForRanges);
    setSelectedRange(`${range.AyaFrom}-${range.AyaTo}`);
    setIsEntireSurah(false);
    setIsEntireThafheem(false);
    setShowSurahDropdown(false);
    setSelectedSurahForRanges(null);
    setAyahRanges([]);
    setSearchQuery("");
  };

  const handleScopeChange = (scope) => {
    setIsEntireSurah(scope === "entireSurah");
    setIsEntireThafheem(scope === "entireThafheem");
  };

  const filteredSurahList = surahList.filter((surah) =>
    searchQuery
      ? surah.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(surah.number).includes(searchQuery)
      : true
  );

  // ─── Loading screen ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen dark:bg-gray-900 bg-white">
        <QuizSkeleton />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen dark:bg-gray-900 bg-white">

      {/* ── Top Navigation Bar ── */}
      <div className="bg-white border-b border-gray-200 dark:border-gray-700 dark:bg-[#1C1C1E] relative">
        <div className="w-full mx-auto px-2 sm:px-4 py-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex flex-row sm:flex-row items-start sm:items-center gap-2 sm:gap-3 relative w-full sm:w-auto">
              <div className="flex flex-wrap items-center gap-4">

                {/* Surah name / dropdown trigger */}
                <div
                  className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded cursor-pointer"
                  onClick={() => {
                    const opening = !showSurahDropdown;
                    setShowSurahDropdown(opening);
                    // In blockwise mode jump straight to the current surah's block list.
                    // In Entire Tafheem or Entire Surah mode just open the surah list.
                    if (opening && !isEntireSurah && !isEntireThafheem && selectedSurah.id) {
                      handleSurahSelect({ id: selectedSurah.id, name: selectedSurah.name, ayahs: selectedSurah.ayahs });
                    }
                  }}
                >
                  <span className="text-black font-medium dark:text-white text-sm sm:text-base">
                    {isEntireThafheem ? "All Surahs" : selectedSurah.name}
                  </span>
                  <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-black dark:text-white" />
                </div>

                {!isEntireSurah && !isEntireThafheem && (
                  <span className="text-xs sm:text-sm text-black dark:text-white">
                    {selectedRange}
                  </span>
                )}

                {/* Entire Surah */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={isEntireSurah && !isEntireThafheem}
                    onChange={() => handleScopeChange("entireSurah")}
                    className="form-radio text-cyan-500 focus:ring-0"
                  />
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Entire Surah</span>
                </label>

                {/* Entire Thafheem */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={isEntireThafheem}
                    onChange={() => handleScopeChange("entireThafheem")}
                    className="form-radio text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className={`text-xs sm:text-sm ${isEntireThafheem ? "text-cyan-500 font-medium" : "text-gray-600 dark:text-gray-300"}`}>
                    Entire Thafheem ✨
                  </span>
                </label>
              </div>

              {/* ── Surah Dropdown ── */}
              {showSurahDropdown && (
                <div className="fixed inset-0 flex items-center justify-center sm:absolute sm:left-0 sm:top-full sm:inset-auto sm:mt-2 sm:flex-none sm:items-start sm:justify-start bg-gray-500/70 sm:bg-transparent z-50">
                  <div className="bg-white dark:bg-[#1C1C1E] sm:rounded-2xl shadow-xl w-[320px] sm:w-80 h-[600px] sm:h-96 overflow-hidden rounded-2xl flex flex-col">

                    {/* Header */}
                    <div className="flex items-center justify-between p-3 sm:p-4 border-b dark:border-gray-600">
                      <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                        {selectedSurahForRanges ? selectedSurahForRanges.name : "Select Surah"}
                      </span>
                      <button
                        onClick={() => {
                          if (selectedSurahForRanges) {
                            setSelectedSurahForRanges(null);
                            setAyahRanges([]);
                          } else {
                            setShowSurahDropdown(false);
                          }
                        }}
                        className="text-black dark:text-white hover:text-gray-600 ml-3"
                      >
                        {selectedSurahForRanges
                          ? <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                          : <X className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </button>
                    </div>

                    {/* Search */}
                    {!selectedSurahForRanges && (
                      <div className="p-3 sm:p-4 border-b dark:border-gray-600">
                        <div className="relative">
                          <Search className="w-3 h-3 sm:w-4 sm:h-4 absolute left-3 top-2.5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search Surah"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 sm:pl-9 pr-3 py-2 text-xs sm:text-sm bg-gray-50 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-black dark:placeholder:text-white dark:text-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* List */}
                    <div className="overflow-y-auto flex-1 pb-20 sm:pb-4 font-poppins">
                      {selectedSurahForRanges ? (
                        loadingRanges ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-500"></div>
                            <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">Loading ranges...</span>
                          </div>
                        ) : (
                          <>
                            {/* Entire Surah shortcut */}
                            <div className="p-3 border-b dark:border-gray-600">
                              <button
                                onClick={() => handleEntireSurahSelect(selectedSurahForRanges)}
                                className="w-full px-3 py-3 text-xs sm:text-sm bg-cyan-50 dark:bg-cyan-900 hover:bg-cyan-100 dark:hover:bg-cyan-800 border border-cyan-200 dark:border-cyan-700 rounded-xl text-cyan-800 dark:text-white font-medium transition-colors"
                              >
                                Entire Surah – {selectedSurahForRanges.name}
                              </button>
                            </div>
                            {ayahRanges.length > 0 ? (
                              <div className="grid grid-cols-2 gap-2 p-3">
                                {ayahRanges.map((range, index) => (
                                  <button
                                    key={range.ID || index}
                                    onClick={() => handleRangeSelect(range)}
                                    className="px-3 py-3 text-xs sm:text-sm bg-gray-50 dark:bg-gray-700 hover:bg-cyan-50 dark:hover:bg-cyan-900 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-800 dark:text-white transition-colors text-center"
                                  >
                                    <span className="font-medium">{range.AyaFrom} – {range.AyaTo}</span>
                                    <span className="block text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                      {range.AyaTo - range.AyaFrom + 1} ayahs
                                    </span>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-xs text-gray-500 dark:text-gray-400">
                                No ayah ranges available for this surah
                              </div>
                            )}
                          </>
                        )
                      ) : (
                        filteredSurahList.map((surah) => (
                          <div
                            key={surah.number}
                            className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-2 cursor-pointer text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-black"
                            onClick={() => handleSurahSelect({ id: surah.number, name: surah.name, ayahs: surah.ayahs })}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-black w-6 dark:text-white">{surah.number}.</span>
                              <span className="text-black dark:text-white">{surah.name}</span>
                            </div>
                            <span className="text-black dark:text-white">{surah.ayahs} verses</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Header ── */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-700">
        <div className="w-full max-w-[884px] mx-auto px-3 sm:px-4 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h1 className="text-lg sm:text-xl font-semibold" style={{ color: "#2AA0BF" }}>
              {quizTitle}
            </h1>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-white flex items-center gap-4 flex-wrap">
              <span className="font-malayalam">മാർക്ക്: {score}</span>
              {pageRangeLabel && (
                <span className="font-malayalam text-gray-500 dark:text-gray-400">
                  ചോദ്യം {pageRangeLabel}
                </span>
              )}
              {!isEntireThafheem && totalLoadedQuestions > 0 && (
                <span>Total: {totalLoadedQuestions}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Resume Draft Banner ── */}
      {resumeDraft && (
        <div className="w-full max-w-[884px] mx-auto px-3 sm:px-4 pt-4">
          <div className="bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-700 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-cyan-800 dark:text-cyan-100 text-sm font-medium font-malayalam">
                നിങ്ങൾ പാതിയിൽ നിർത്തിയ പ്രശ്നോത്തരി തുടരണോ?
              </p>
              <p className="text-cyan-700 dark:text-cyan-300 text-xs mt-1 font-malayalam">
                {draftQuestionLabel} · മാർക്ക്: {resumeDraft.score || 0}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleResume}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-medium transition-colors font-malayalam"
              >
                തുടരുക
              </button>
              <button
                onClick={handleStartFresh}
                className="px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-600 text-gray-600 dark:text-gray-200 rounded-xl text-sm transition-colors font-malayalam"
              >
                പുതിയത് തുടങ്ങുക
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="w-full max-w-[884px] mx-auto px-3 sm:px-4 pt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm font-medium">API Error: {error}</p>
            <p className="text-yellow-700 text-xs mt-1">Using fallback data for testing.</p>
          </div>
        </div>
      )}

      {/* ── Question Stack ── */}
      <div className="w-full max-w-[884px] mx-auto px-3 sm:px-4 py-6 space-y-6">

        {currentQuestions.length === 0 && !loading && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-16 font-malayalam">
            ചോദ്യങ്ങൾ ലഭ്യമല്ല. മറ്റൊരു സൂറ തിരഞ്ഞെടുക്കുക.
          </div>
        )}

        {currentQuestions.map((questionData, pageLocalIndex) => {
          const overallIndex = getOverallIndex(pageLocalIndex);
          const selectedAnswer = userAnswers[overallIndex] || "";
          const isSubmitted = !!submittedQuestions[overallIndex];
          const isCorrect =
            isSubmitted &&
            String(userAnswers[overallIndex]).trim() === String(questionData.correctAnswer).trim();

          return (
            <div
              key={`${currentPage}-${pageLocalIndex}`}
              className="bg-white dark:bg-[#1e2330] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
            >
              {/* Question header */}
              <div className="bg-[#EBEEF0] dark:bg-[#252525] px-4 py-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-malayalam">
                  ചോദ്യം {overallIndex + 1}
                  {isEntireSurah && allQuestions.length > 0 ? ` / ${allQuestions.length}` : ""}
                </span>
                <p className="mt-1 text-sm sm:text-base text-gray-800 dark:text-white leading-relaxed font-malayalam">
                  {questionData.question}
                </p>
              </div>

              {/* Options */}
              <div className="p-4 space-y-2">
                {questionData.options.map((option) => {
                  const isSelected = selectedAnswer === option.id;
                  const isThisCorrect =
                    String(option.id).trim() === String(questionData.correctAnswer).trim();

                  let cls = "bg-[#EBEEF0] dark:bg-[#252525] text-gray-800 dark:text-white border-transparent";
                  if (isSubmitted) {
                    if (isThisCorrect) {
                      cls = "bg-green-100 dark:bg-green-900/50 text-green-900 dark:text-green-100 border-green-400 dark:border-green-600";
                    } else if (isSelected) {
                      cls = "bg-red-100 dark:bg-red-900/50 text-red-900 dark:text-red-100 border-red-400 dark:border-red-600";
                    } else {
                      cls = "bg-[#EBEEF0] dark:bg-[#252525] text-gray-600 dark:text-gray-400 border-transparent opacity-50";
                    }
                  } else if (isSelected) {
                    cls = "bg-cyan-50 dark:bg-cyan-900/40 text-cyan-900 dark:text-cyan-100 border-cyan-400 dark:border-cyan-600";
                  }

                  return (
                    <button
                      key={option.id}
                      disabled={isSubmitted}
                      onClick={() => handleAnswerSelect(overallIndex, option.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-all text-left ${cls} ${
                        !isSubmitted ? "hover:opacity-90 cursor-pointer" : "cursor-default"
                      }`}
                    >
                      <span className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-white/50 dark:bg-black/20">
                        {option.id}
                      </span>
                      <span className="text-sm sm:text-base font-malayalam leading-snug flex-1">
                        {option.text || `Option ${option.id}`}
                      </span>
                      {isSubmitted && isThisCorrect && (
                        <span className="text-green-600 dark:text-green-400 font-bold text-lg">✓</span>
                      )}
                      {isSubmitted && isSelected && !isThisCorrect && (
                        <span className="text-red-600 dark:text-red-400 font-bold text-lg">✗</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Submit / Result */}
              <div className="px-4 pb-4">
                {!isSubmitted && selectedAnswer && (
                  <button
                    onClick={() => handleSubmitAnswer(overallIndex, questionData.correctAnswer)}
                    className="w-full sm:w-auto px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    Submit Answer
                  </button>
                )}
                {isSubmitted && (
                  <div
                    className={`mt-2 rounded-xl px-4 py-3 text-sm font-malayalam ${
                      isCorrect
                        ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700"
                        : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700"
                    }`}
                  >
                    <span className="font-bold mr-2">{isCorrect ? "🎉 ശരി!" : "❌ തെറ്റ്!"}</span>
                    {!isCorrect && (
                      <span>
                        ശരിയുത്തരം:{" "}
                        <span style={{ color: "#2AA0BF" }} className="font-semibold">
                          {questionData.correctAnswer}){" "}
                          {questionData.options.find((o) => o.id === questionData.correctAnswer)?.text}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* ── Pagination Controls ── */}
        {(currentQuestions.length > 0 || currentPage > 0) && (isEntireSurah || isEntireThafheem) && (
          <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-2xl text-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="font-malayalam">മുൻ ചോദ്യങ്ങൾ</span>
            </button>

            <span className="text-xs text-gray-400 dark:text-gray-500 font-malayalam">
              {isEntireThafheem
                ? `${currentPage + 1} / ${tafheemTotalPages > 1 ? tafheemTotalPages : "?"}`
                : isEntireSurah
                  ? `${currentPage + 1} / ${surahTotalPages > 1 ? surahTotalPages : "?"}`
                  : `${currentPage + 1} / ${totalPages}`}
            </span>

            <button
              onClick={handleNextPage}
              disabled={!hasNextPage || loadingMore}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-malayalam">ലോഡ് ചെയ്യുന്നു...</span>
                </>
              ) : (
                <>
                  <span className="font-malayalam">അടുത്ത ചോദ്യങ്ങൾ</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Score summary at end of Entire Surah */}
        {isEntireSurah && !isEntireThafheem && currentPage === totalPages - 1 && allQuestions.length > 0 && (() => {
          const total = surahTotalQuestions || allQuestions.length;
          const pct = total > 0 ? Math.round((score / total) * 100) : 0;
          return (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-2xl p-4 text-center">
              <p className="text-blue-800 dark:text-blue-200 font-malayalam text-sm">
                ആകെ മാർക്ക്: <strong>{score} / {total}</strong>
              </p>
              <div className="mt-3 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-500 dark:bg-blue-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-blue-600 dark:text-blue-300 text-xs mt-1.5">{pct}%</p>
            </div>
          );
        })()}

      </div>
    </div>
  );
};

export default Quiz;
