import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Copy, Share2, X, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { fetchCompleteSurahInfo, fetchNoteById } from "../api/apifunction";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import NotePopup from "./NotePopup";
import audioManager from "../utils/audioManager";

const SurahInfoModal = ({ surahId, onClose }) => {
  const [surahInfo, setSurahInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const prefaceAudioRef = useRef(null);
  const prefaceAudioSourceRef = useRef(null);
  const { translationLanguage } = useTheme();
  const navigate = useNavigate();
  const [notePopupState, setNotePopupState] = useState({
    isOpen: false,
    noteId: null,
    loading: false,
    error: null,
    content: null,
  });

  // Helper function to clean HTML content
  const cleanHtmlContent = (htmlString) => {
    if (!htmlString) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    return textContent.replace(/\s+/g, ' ').trim();
  };

  useEffect(() => {
    const loadSurahInfo = async () => {
      if (!surahId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCompleteSurahInfo(surahId, translationLanguage);
        setSurahInfo(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadSurahInfo();
  }, [surahId, translationLanguage]);

  // Close modal on ESC key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Stop and cleanup preface audio when surah changes or modal unmounts
  useEffect(() => {
    return () => {
      if (prefaceAudioRef.current) {
        prefaceAudioRef.current.pause();
        prefaceAudioRef.current = null;
      }
      prefaceAudioSourceRef.current = null;
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    };
  }, [surahId]);

  const getPrefaceParagraphs = useMemo(
    () => (htmlString) => {
      if (!htmlString) return [];
      return htmlString
        .replace(/\r\n/g, "\n")
        .replace(/\t+/g, " ")
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
    },
    []
  );

  // Parse HTML content into titled sections (keeps <h2> headings from API)
  const parseContentSections = useMemo(
    () => (htmlString) => {
      if (!htmlString) return [];

      const sections = [];
      const parts = htmlString.split(/<h2[^>]*>/);

      parts.forEach((part, index) => {
        if (index === 0 && !part.includes("</h2>")) {
          // Intro text before any h2
          const intro = cleanHtmlContent(part);
          if (intro) {
            sections.push({ title: "Introduction", content: intro });
          }
        } else {
          const h2End = part.indexOf("</h2>");
          if (h2End !== -1) {
            const title = part.substring(0, h2End).trim();
            const content = part.substring(h2End + 5).trim();
            const cleanContent = cleanHtmlContent(content);

            if (cleanHtmlContent(title) || cleanContent) {
              sections.push({
                title: cleanHtmlContent(title) || "Section",
                content: cleanContent,
              });
            }
          }
        }
      });

      return sections;
    },
    []
  );

  const parsedThafheemSections = surahInfo?.thafheem?.PrefaceText
    ? parseContentSections(surahInfo.thafheem.PrefaceText)
    : [];

  // Fallback: parse detailed.text (chapter-info) into sections if preface not available
  const parsedDetailedSections =
    !parsedThafheemSections.length && surahInfo?.detailed?.text
      ? parseContentSections(surahInfo.detailed.text)
      : [];

  // Metric helpers
  const revelationPlace =
    surahInfo?.basic?.revelation_place ||
    surahInfo?.thafheem?.SuraType ||
    surahInfo?.surah?.type ||
    "Unknown";

  const revelationOrder =
    surahInfo?.basic?.revelation_order ||
    surahInfo?.thafheem?.RevOrder ||
    surahInfo?.surah?.revelation_order ||
    "Unknown";

  const versesCount =
    surahInfo?.basic?.verses_count ||
    surahInfo?.thafheem?.TotalAyas ||
    surahInfo?.surah?.ayahs ||
    "Unknown";

  const thafheemVolume = (() => {
    const vol =
      surahInfo?.thafheem?.ThafVolume ||
      surahInfo?.basic?.ThafVolume ||
      null;
    if (!vol || vol === "0") return "—";
    return vol;
  })();

  const malayalamPrefaceSections = Array.isArray(surahInfo?.thafheem?.PrefaceSections)
    ? surahInfo.thafheem.PrefaceSections.filter(
      (section) => (section?.subtitle && section.subtitle.trim()) || (section?.text && section.text.trim())
    )
    : [];

  const shouldShowMalayalamPrefaceOnly = translationLanguage === "mal" && malayalamPrefaceSections.length > 0;

  const urduIntroSections = Array.isArray(surahInfo?.urduIntro)
    ? surahInfo.urduIntro.filter(
        (s) => (s?.subtitle && s.subtitle.trim()) || (s?.text && s.text.trim())
      )
    : [];

  const shouldShowUrduIntroOnly = translationLanguage === "ur" && urduIntroSections.length > 0;

  const tamilIntroSections = Array.isArray(surahInfo?.tamilIntro)
    ? surahInfo.tamilIntro.filter(
        (s) => (s?.subtitle && s.subtitle.trim()) || (s?.text && s.text.trim())
      )
    : [];

  const shouldShowTamilIntroOnly = translationLanguage === "ta" && tamilIntroSections.length > 0;

  const banglaIntroSections = Array.isArray(surahInfo?.banglaIntro)
    ? surahInfo.banglaIntro.filter(
        (s) => (s?.subtitle && s.subtitle.trim()) || (s?.text && s.text.trim())
      )
    : [];

  const shouldShowBanglaIntroOnly =
    (translationLanguage === "bn" || translationLanguage === "bangla") &&
    banglaIntroSections.length > 0;

  const paragraphCount =
    (Array.isArray(surahInfo?.thafheem?.PrefaceSections) &&
      surahInfo.thafheem.PrefaceSections.length) ||
    (Array.isArray(surahInfo?.thafheem?.PrefaceEntries) &&
      surahInfo.thafheem.PrefaceEntries.length) ||
    parsedThafheemSections.length ||
    "—";

  // Hide English preface sections when language-specific intro content should take priority
  const isHindi = translationLanguage === 'hi';
  const isUrdu = translationLanguage === 'ur';
  const isTamil = translationLanguage === 'ta';
  const hasPrefaceSections =
    !isHindi && !isUrdu && !isTamil && parsedThafheemSections.length > 0;
  const hasDetailed = Boolean(surahInfo?.detailed?.text);
  const shouldShowHindiIntro = isHindi && hasDetailed && surahInfo?.detailed?.language === 'hi';
  const shouldShowOverview =
    !shouldShowMalayalamPrefaceOnly &&
    !shouldShowUrduIntroOnly &&
    !shouldShowBanglaIntroOnly &&
    !isTamil &&
    surahInfo?.detailed?.short_text &&
    !hasPrefaceSections; // avoid duplicate headings when preface sections present
  const shouldShowDetailed =
    !shouldShowMalayalamPrefaceOnly &&
    !shouldShowUrduIntroOnly &&
    !shouldShowBanglaIntroOnly &&
    !isTamil &&
    hasDetailed &&
    !hasPrefaceSections &&
    !isHindi; // avoid showing the same content twice

  const handlePrefaceContentClick = (event) => {
    if (translationLanguage !== "mal") return;
    const clickable = event.target.closest("sup, a");
    if (!clickable) return;

    const rawText = (clickable.innerText || clickable.textContent || "").trim();
    if (!rawText) return;

    let handled = false;
    const normalized = rawText.replace(/[\s()]+/g, "").toUpperCase();

    // Handle notes with prefixes: N (Note), H (Hadith/Hadith reference), B (Book/Book reference)
    if (/^[NHB]\d+$/.test(normalized)) {
      handled = true;
      openNotePopup(normalized);
    } else {
      const verseMatch = rawText.match(/(\d+)\s*[:：]\s*(\d+)/);
      if (verseMatch) {
        const surahRef = parseInt(verseMatch[1], 10);
        const ayahRef = parseInt(verseMatch[2], 10);
        if (Number.isFinite(surahRef) && Number.isFinite(ayahRef)) {
          handled = true;
          navigate(`/reading/${surahRef}?verse=${ayahRef}`);
        }
      }
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const openNotePopup = async (noteId) => {
    setNotePopupState({
      isOpen: true,
      noteId,
      loading: true,
      error: null,
      content: null,
    });

    try {
      const data = await fetchNoteById(noteId);
      const content = data?.NoteText || 
                     data?.note_text ||
                     data?.content || 
                     data?.html || 
                     data?.text || 
                     data?.body ||
                     (typeof data === 'string' ? data : null);
      
      setNotePopupState((prev) => ({
        ...prev,
        loading: false,
        content: content || "Note content unavailable.",
      }));
    } catch (fetchError) {
      console.error('Error fetching note:', fetchError);
      setNotePopupState((prev) => ({
        ...prev,
        loading: false,
        error: fetchError?.message || "Unable to load this note at the moment. Please try again.",
      }));
    }
  };

  const getAllContentAsText = () => {
    if (!surahInfo) return '';
    const surahName = surahInfo?.basic?.name_simple || surahInfo?.surah?.name || `Surah ${surahId}`;
    const arabicName = surahInfo?.basic?.name_arabic || surahInfo?.surah?.arabic || '';

    let content = `${surahName}\n`;
    if (arabicName) content += `${arabicName}\n\n`;

    content += `Revelation: ${surahInfo?.basic?.revelation_place || surahInfo?.thafheem?.SuraType || surahInfo?.surah?.type || 'Unknown'}\n`;
    content += `Revelation Order: ${surahInfo?.basic?.revelation_order || surahInfo?.thafheem?.RevOrder || 'Unknown'}\n`;
    content += `Verses: ${surahInfo?.basic?.verses_count || surahInfo?.thafheem?.TotalAyas || surahInfo?.surah?.ayahs || 'Unknown'}\n`;

    if (surahInfo?.thafheem) {
      content += `Thafheem Vol: ${surahInfo.thafheem.ThafVolume || 'Unknown'}\n`;
      content += `Type: ${surahInfo.thafheem.SuraType || 'Unknown'}\n`;
    }
    content += '\n';

    if (surahInfo?.detailed?.short_text) {
      content += `OVERVIEW\n${cleanHtmlContent(surahInfo.detailed.short_text)}\n\n`;
    }

    if (surahInfo?.detailed?.text) {
      content += `DETAILED INFORMATION\n${cleanHtmlContent(surahInfo.detailed.text)}\n\n`;
    }

    if (parsedThafheemSections.length > 0) {
      content += `THAFHEEM COMMENTARY\n\n`;
      parsedThafheemSections.forEach((section) => {
        content += `${section.title}\n${section.content}\n\n`;
      });
    }

    if (!surahInfo?.detailed?.text && parsedThafheemSections.length === 0) {
      content += `BASIC INFORMATION\n\n`;
      if (surahInfo?.basic?.translated_name?.name) content += `English Name: ${surahInfo.basic.translated_name.name}\n`;
      if (surahInfo?.basic?.name_simple) content += `Simple Name: ${surahInfo.basic.name_simple}\n`;
      if (surahInfo?.basic?.revelation_place) content += `Place of Revelation: ${surahInfo.basic.revelation_place}\n`;
      if (surahInfo?.basic?.pages) content += `Pages: ${surahInfo.basic.pages[0]} to ${surahInfo.basic.pages[1]}\n`;
    }

    content += `\n— ${surahName} (Surah ${surahId})`;
    return content;
  };

  const handleCopyAll = async () => {
    const contentToCopy = getAllContentAsText();
    try {
      await navigator.clipboard.writeText(contentToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleShare = async () => {
    const surahName = surahInfo?.basic?.name_simple || surahInfo?.surah?.name || `Surah ${surahId}`;
    const shareText = getAllContentAsText();
    const shareUrl = `${window.location.origin}/surah/${surahId}`;
    const shareData = {
      title: `${surahName} - Surah Information`,
      text: shareText,
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        const shareableContent = `${shareText}\n\nRead more: ${shareUrl}`;
        await navigator.clipboard.writeText(shareableContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const prefaceAudioUrl =
    translationLanguage === "ur"
      ? surahInfo?.urduIntroAudioUrl || null
      : surahId
      ? `https://thafheem.net/audio/preface/mp3/${String(surahId).padStart(3, '0')}_000.mp3`
      : null;

  const hasCustomPrefaceAudio =
    translationLanguage === "mal" ||
    (translationLanguage === "ur" && Boolean(surahInfo?.urduIntroAudioUrl));

  const formatTime = (t) => {
    if (!t || isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePrefacePlay = () => {
    if (!prefaceAudioUrl) return;

    if (
      prefaceAudioRef.current &&
      prefaceAudioSourceRef.current !== prefaceAudioUrl
    ) {
      prefaceAudioRef.current.pause();
      prefaceAudioRef.current = null;
      setCurrentTime(0);
      setDuration(0);
    }

    if (!prefaceAudioRef.current) {
      const audio = new Audio(prefaceAudioUrl);
      audio.volume = volume;
      prefaceAudioRef.current = audio;
      prefaceAudioSourceRef.current = prefaceAudioUrl;
      audioManager.register(audio);
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onended = () => { setIsPlaying(false); setCurrentTime(0); };
      audio.onerror = () => setIsPlaying(false);
    }
    if (isPlaying) {
      prefaceAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioManager.stopAll();
      prefaceAudioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    if (!prefaceAudioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    prefaceAudioRef.current.currentTime = ratio * duration;
  };

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (prefaceAudioRef.current) prefaceAudioRef.current.volume = v;
  };

  const handleStopPlayer = () => {
    if (prefaceAudioRef.current) {
      prefaceAudioRef.current.pause();
      prefaceAudioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Portal Root
  const modalRoot = document.getElementById("modal-root") || document.body;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal Content */}
        <div className="relative w-full sm:w-auto sm:max-w-4xl xl:max-w-[1073px] max-h-[85vh] sm:max-h-[90vh] bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col animate-slideUp sm:animate-fadeIn overflow-hidden">

          {/* Drag Handle (Mobile) */}
          <div className="w-full flex justify-center pt-3 pb-1 sm:hidden cursor-grab active:cursor-grabbing" onClick={onClose}>
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2 
              className={`text-lg sm:text-xl font-semibold text-gray-900 dark:text-white ${
                translationLanguage === 'mal' ? 'font-malayalam' : ''
              }`}
              style={
                translationLanguage === 'mal'
                  ? { fontFamily: "'Noto Sans Malayalam'" }
                  : {}
              }
            >
              {surahInfo?.basic?.name_simple || surahInfo?.surah?.name || `Surah ${surahId}`}
            </h2>
            <div className="flex items-center gap-2">
              {!loading && !error && (
                <>
                  {hasCustomPrefaceAudio && (
                    <button
                      onClick={handlePrefacePlay}
                      className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${
                        isPlaying ? 'text-cyan-500' : 'text-gray-500 dark:text-gray-400'
                      }`}
                      title={isPlaying ? 'Pause preface audio' : 'Play preface audio'}
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                  )}
                  <button
                    onClick={handleCopyAll}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative text-gray-500 dark:text-gray-400"
                    title="Copy all content"
                  >
                    {copied ? <span className="text-green-500 font-bold text-xs">Copied!</span> : <Copy className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                    title="Share"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sticky Preface Player */}
          {hasCustomPrefaceAudio && (isPlaying || currentTime > 0) && (
            <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 sm:px-6 py-3">
              {/* Progress bar */}
              <div
                className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-3 cursor-pointer group relative"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-cyan-500 rounded-full relative transition-all"
                  style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-500 border-2 border-white dark:border-gray-900 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              {/* Controls row */}
              <div className="flex items-center justify-between gap-3">
                {/* Play/Pause + timestamps */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] text-gray-400 tabular-nums">{formatTime(currentTime)}</span>
                  <button
                    onClick={handlePrefacePlay}
                    className="w-8 h-8 bg-cyan-500 hover:bg-cyan-600 text-white rounded-full flex items-center justify-center transition-colors shadow"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <span className="text-[11px] text-gray-400 tabular-nums">{formatTime(duration)}</span>
                </div>

                {/* Volume + close */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {volume === 0
                    ? <VolumeX className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <Volume2 className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  <input
                    type="range" min="0" max="1" step="0.05" value={volume}
                    onChange={handleVolume}
                    className="w-16 h-1 accent-cyan-500 cursor-pointer"
                    title="Volume"
                  />
                  <button onClick={handleStopPlayer} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Close player">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="px-4 sm:px-6 py-6 sm:py-8 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading Surah information...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-500 dark:text-red-400 text-lg mb-2">Failed to load Surah information</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600">Try Again</button>
              </div>
            ) : (
              <div className="font-poppins">
                {/* Arabic Title */}
                <div className="text-center mb-6 sm:mb-8 border-b border-gray-200 dark:border-gray-700 pb-4 sm:pb-6">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-arabic text-black mb-4 sm:mb-6 dark:text-white px-2">
                    {surahInfo?.basic?.name_arabic || surahInfo?.surah?.arabic || `Surah ${surahId}`}
                  </h2>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 text-center">
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 sm:px-4 sm:py-3">
                      <div className="text-cyan-500 text-xs sm:text-sm">Revelation</div>
                      <div className="text-gray-900 font-semibold text-sm sm:text-base capitalize">{revelationPlace}</div>
                    </div>
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 sm:px-4 sm:py-3">
                      <div className="text-cyan-500 text-xs sm:text-sm">Revelation Order</div>
                      <div className="text-gray-900 font-semibold text-sm sm:text-base">{revelationOrder}</div>
                    </div>
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 sm:px-4 sm:py-3">
                      <div className="text-cyan-500 text-xs sm:text-sm">Verses</div>
                      <div className="text-gray-900 font-semibold text-sm sm:text-base">{versesCount}</div>
                    </div>
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 sm:px-4 sm:py-3">
                      <div className="text-cyan-500 text-xs sm:text-sm">Thafheem Vol</div>
                      <div className="text-gray-900 font-semibold text-sm sm:text-base">{thafheemVolume}</div>
                    </div>
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 sm:px-4 sm:py-3">
                      <div className="text-cyan-500 text-xs sm:text-sm">Paragraphs</div>
                      <div className="text-gray-900 font-semibold text-sm sm:text-base">{paragraphCount}</div>
                    </div>
                  </div>
                </div>

                {/* Content Sections */}
                {shouldShowMalayalamPrefaceOnly && (
                  <div className="mb-6 sm:mb-8">
                    {translationLanguage === "mal" && (
                      <style>{`
                        .surah-preface-content, .surah-preface-content * { font-family: 'Noto Sans Malayalam', sans-serif !important; line-height: 2 !important; }
                        .surah-preface-content sup.f-noteno, .surah-preface-content a.crs { color: #2AA0BF !important; cursor: pointer !important; text-decoration: none !important; }
                        .surah-preface-content sup.f-noteno:hover, .surah-preface-content a.crs:hover { text-decoration: underline !important; }
                      `}</style>
                    )}
                    <div className="text-gray-700 leading-relaxed dark:text-gray-300 text-sm sm:text-base space-y-4 surah-preface-content font-malayalam" style={translationLanguage === 'mal' ? { fontFamily: "'Noto Sans Malayalam', sans-serif", lineHeight: '2' } : {}} onClick={handlePrefaceContentClick}>
                      {malayalamPrefaceSections.map((section, index) => (
                        <div key={index} className="space-y-3">
                          {section.subtitle && <h4 className="text-base sm:text-lg font-semibold text-cyan-500">{section.subtitle}</h4>}
                          {getPrefaceParagraphs(section.text).map((p, i) => <p key={i} dangerouslySetInnerHTML={{ __html: p }} />)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Urdu Surah Intro */}
                {shouldShowUrduIntroOnly && (
                  <div className="mb-6 sm:mb-8">
                    <div
                      className="text-gray-700 dark:text-gray-300 space-y-4 urdu-surah-intro"
                    >
                      {urduIntroSections.map((section, index) => (
                        <div key={index} className="space-y-3">
                          {section.subtitle && (
                            <h4 className="text-base sm:text-lg font-semibold text-cyan-500">
                              {section.subtitle}
                            </h4>
                          )}
                          {section.text && (
                            <div dangerouslySetInnerHTML={{ __html: section.text }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bangla Surah Intro */}
                {shouldShowBanglaIntroOnly && (
                  <div className="mb-6 sm:mb-8">
                    <style>{`
                      .bangla-surah-intro, .bangla-surah-intro * {
                        font-family: 'Noto Sans Bengali', serif !important;
                        text-align: justify;
                      }
                      .bangla-surah-intro h2, .bangla-surah-intro h3, .bangla-surah-intro h4 {
                        text-align: left;
                        color: #06b6d4;
                      }
                    `}</style>
                    <div className="font-bengali text-justify text-gray-700 dark:text-gray-300 text-sm sm:text-base space-y-4 bangla-surah-intro leading-relaxed">
                      {banglaIntroSections.map((section, index) => {
                        const cleanedText = section.text
                          ? section.text.replace(/^\s*<h2[^>]*>.*?<\/h2>\s*/i, '')
                          : '';

                        return (
                          <div key={index} className="space-y-3">
                            {section.subtitle && (
                              <h4 className="text-base sm:text-lg font-semibold text-cyan-500 font-bengali">
                                {section.subtitle}
                              </h4>
                            )}
                            {cleanedText && (
                              <div className="leading-relaxed" dangerouslySetInnerHTML={{ __html: cleanedText }} />
                            )}
                            {index === banglaIntroSections.length - 1 && section.source && (
                              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic mt-2">
                                {section.source}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tamil Surah Intro */}
                {shouldShowTamilIntroOnly && (
                  <div className="mb-6 sm:mb-8">
                    <div className="text-gray-700 dark:text-gray-300 text-sm sm:text-base space-y-4 tamil-surah-intro font-tamil">
                      {tamilIntroSections.map((section, index) => (
                        <div key={index} className="space-y-3">
                          {section.subtitle && (
                            <h4 className="text-base sm:text-lg font-semibold text-cyan-500">
                              {section.subtitle}
                            </h4>
                          )}
                          {section.text && (
                            <div className="leading-loose" dangerouslySetInnerHTML={{ __html: section.text }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hindi Surah Intro */}
                {shouldShowHindiIntro && (
                  <div className="mb-6 sm:mb-8">
                    <style>{`
                      .hindi-surah-intro, .hindi-surah-intro * {
                        font-family: 'NotoSansDevanagari', serif !important;
                        line-height: 1.9 !important;
                      }
                      .hindi-surah-intro h2,
                      .hindi-surah-intro h3,
                      .hindi-surah-intro h4 {
                        color: #06b6d4;
                      }
                    `}</style>
                    <div
                      className="text-gray-700 dark:text-gray-300 text-sm sm:text-base hindi-surah-intro font-hindi"
                      style={{ fontFamily: "'NotoSansDevanagari', serif", lineHeight: '1.9' }}
                      dangerouslySetInnerHTML={{ __html: surahInfo.detailed.text }}
                    />
                  </div>
                )}

                {/* Overview (non-Malayalam, non-Hindi) */}
                {shouldShowOverview && (
                  <div className="mb-6 sm:mb-8">
                    <h3 className="text-lg sm:text-xl font-semibold text-cyan-600 mb-3 sm:mb-4">Overview</h3>
                    <p className="text-gray-700 leading-relaxed dark:text-gray-300 text-sm sm:text-base">{cleanHtmlContent(surahInfo.detailed.short_text)}</p>
                  </div>
                )}

                {shouldShowDetailed && (
                  <div className="mb-6 sm:mb-8">
                    <h3 className="text-lg sm:text-xl font-semibold text-cyan-600 mb-3 sm:mb-4">Detailed Information</h3>
                    <div className="text-gray-700 leading-relaxed dark:text-gray-300 text-sm sm:text-base space-y-6">
                      {parsedDetailedSections.length > 0
                        ? parsedDetailedSections.map((section, index) => (
                            <div key={index} className="space-y-2">
                              {section.title && (
                                <h4 className="text-base sm:text-lg font-semibold text-cyan-500">
                                  {section.title}
                                </h4>
                              )}
                              {section.content
                                .split('\n')
                                .filter((p) => p.trim())
                                .map((p, i) => (
                                  <p key={i} className="mb-2">
                                    {p.trim()}
                                  </p>
                                ))}
                            </div>
                          ))
                        : cleanHtmlContent(surahInfo.detailed.text)
                            .split('\n\n')
                            .map((p, i) => <p key={i}>{p.trim()}</p>)}
                    </div>
                  </div>
                )}

                {!shouldShowMalayalamPrefaceOnly && !shouldShowUrduIntroOnly && !shouldShowBanglaIntroOnly && !isTamil && parsedThafheemSections.length > 0 && translationLanguage !== "hi" && (
                  <div className="mb-6 sm:mb-8">
                
                    <div className="space-y-6">
                      {parsedThafheemSections.map((section, index) => (
                        <div key={index}>
                          <h4 className="text-base sm:text-lg font-semibold text-cyan-500 mb-2">{section.title}</h4>
                          <div className="text-gray-700 leading-relaxed dark:text-gray-300 text-sm sm:text-base">
                            {section.content.split('\n').filter(p => p.trim()).map((p, i) => <p key={i} className="mb-3">{p.trim()}</p>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!surahInfo?.detailed?.text && parsedThafheemSections.length === 0 && !shouldShowMalayalamPrefaceOnly && !shouldShowUrduIntroOnly && !shouldShowBanglaIntroOnly && !isTamil && (
                  <div className="mb-6 sm:mb-8">
                    <h3 className="text-lg sm:text-xl font-semibold text-cyan-600 mb-3 sm:mb-4">Basic Information</h3>
                    <div className="text-gray-700 leading-relaxed dark:text-gray-300 text-sm sm:text-base space-y-4">
                      {surahInfo?.basic?.translated_name?.name && (
                        <p>
                          <strong>English Name:</strong> {surahInfo.basic.translated_name.name}
                        </p>
                      )}
                      {surahInfo?.basic?.name_simple && (
                        <p>
                          <strong>Simple Name:</strong> {surahInfo.basic.name_simple}
                        </p>
                      )}
                      {surahInfo?.basic?.revelation_place && (
                        <p>
                          <strong>Place of Revelation:</strong> {surahInfo.basic.revelation_place}
                        </p>
                      )}
                      {surahInfo?.basic?.pages && (
                        <p>
                          <strong>Pages:</strong> {surahInfo.basic.pages[0]} to {surahInfo.basic.pages[1]}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <NotePopup
        isOpen={notePopupState.isOpen}
        noteId={notePopupState.noteId}
        noteContent={notePopupState.content}
        loading={notePopupState.loading}
        error={notePopupState.error}
        onClose={() => setNotePopupState((prev) => ({ ...prev, isOpen: false }))}
      />
    </>,
    modalRoot
  );
};

export default SurahInfoModal;

