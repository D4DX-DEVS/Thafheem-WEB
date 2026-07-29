import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Copy, Share2, X } from "lucide-react";
import { fetchMalayalamSurahIntro, fetchSurahMetadata } from "../api/apifunction";
import NotePopup from "./NotePopup";
import VerseReferenceModal from "./VerseReferenceModal";
import BlockInterpretationModal from "./BlockInterpretationModal";
import { fetchNoteById } from "../api/apifunction";

const BlockWiseSurahInfoModal = ({ surahId, onClose }) => {
  const [surahIntro, setSurahIntro] = useState(null);
  const [surahMeta, setSurahMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [notePopupState, setNotePopupState] = useState({
    isOpen: false,
    noteId: null,
    loading: false,
    error: null,
    content: null,
  });
  const [verseRefState, setVerseRefState] = useState({
    isOpen: false,
    surahId: null,
    ayah: null,
  });
  const [interpretationState, setInterpretationState] = useState({
    isOpen: false,
    surahId: null,
    interpretationNo: null,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!surahId) return;
      try {
        setLoading(true);
        setError(null);
        const [intro, meta] = await Promise.all([
          fetchMalayalamSurahIntro(surahId),
          fetchSurahMetadata(surahId, "en"),
        ]);
        setSurahIntro(intro);
        setSurahMeta(meta);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [surahId]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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

  // Convert plain text verse references into clickable links
  // (47:8) with brackets → surah 47 interpretation 8
  // 47:8 without brackets → surah 47 ayah 8
  const linkifyVerseRefs = (html) => {
    if (!html) return html;
    // First: (surah:interpretation) with brackets
    let result = html.replace(
      /\((\d{1,3}):(\d{1,3})\)/g,
      '<a class="crs" data-type="interpretation" data-surah="$1" data-ipt="$2">($1:$2)</a>'
    );
    // Second: surah:ayah without brackets (avoid matching inside already-linked tags)
    result = result.replace(
      /(?<![">])(\d{1,3}):(\d{1,3})(?![^<]*<\/a>)/g,
      '<a class="crs" data-type="ayah" data-surah="$1" data-ayah="$2">$1:$2</a>'
    );
    return result;
  };

  const sections = surahIntro?.sections || [];

  const revelationPlace = surahMeta?.revelation_place || "Unknown";
  const revelationOrder = surahMeta?.revelation_order || "Unknown";
  const versesCount = surahMeta?.verses_count || "Unknown";
  const thafheemVolume = surahMeta?.ThafVolume || "—";
  const paragraphCount = sections.length || "—";
  const arabicName = surahMeta?.name_arabic || `Surah ${surahId}`;
  const surahName = surahMeta?.name_simple || `Surah ${surahId}`;

  const handleContentClick = (event) => {
    const clickable = event.target.closest("sup, a");
    if (!clickable) return;

    const rawText = (clickable.innerText || clickable.textContent || "").trim();
    if (!rawText) return;

    let handled = false;
    const normalized = rawText.replace(/[\s()]+/g, "").toUpperCase();

    // Handle data attributes from linkified references
    const dataType = clickable.getAttribute("data-type");
    const dataSurah = clickable.getAttribute("data-surah");
    const dataIpt = clickable.getAttribute("data-ipt");
    const dataAyah = clickable.getAttribute("data-ayah");

    if (dataType === "interpretation" && dataSurah && dataIpt) {
      // (48:8) → surah 48 interpretation 8 — show in popup
      handled = true;
      setInterpretationState({ isOpen: true, surahId: parseInt(dataSurah, 10), interpretationNo: parseInt(dataIpt, 10) });
    } else if (dataType === "ayah" && dataSurah && dataAyah) {
      // 48:8 → surah 48 ayah 8 — show in popup
      handled = true;
      setVerseRefState({ isOpen: true, surahId: parseInt(dataSurah, 10), ayah: parseInt(dataAyah, 10) });
    } else if (/^[NHB]\d+$/.test(normalized)) {
      handled = true;
      openNotePopup(normalized);
    } else {
      // Fallback: check raw text for patterns
      const bracketMatch = rawText.match(/\((\d+):(\d+)\)/);
      if (bracketMatch) {
        handled = true;
        setInterpretationState({ isOpen: true, surahId: parseInt(bracketMatch[1], 10), interpretationNo: parseInt(bracketMatch[2], 10) });
      } else {
        const verseMatch = rawText.match(/(\d+)\s*[:：]\s*(\d+)/);
        if (verseMatch) {
          handled = true;
          setVerseRefState({ isOpen: true, surahId: parseInt(verseMatch[1], 10), ayah: parseInt(verseMatch[2], 10) });
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
      const content =
        data?.NoteText ||
        data?.note_text ||
        data?.content ||
        data?.html ||
        data?.text ||
        data?.body ||
        (typeof data === "string" ? data : null);

      setNotePopupState((prev) => ({
        ...prev,
        loading: false,
        content: content || "Note content unavailable.",
      }));
    } catch (fetchError) {
      console.error("Error fetching note:", fetchError);
      setNotePopupState((prev) => ({
        ...prev,
        loading: false,
        error:
          fetchError?.message ||
          "Unable to load this note at the moment. Please try again.",
      }));
    }
  };

  const getAllContentAsText = () => {
    let content = `${surahName}\n`;
    if (arabicName) content += `${arabicName}\n\n`;
    content += `Revelation: ${revelationPlace}\n`;
    content += `Revelation Order: ${revelationOrder}\n`;
    content += `Verses: ${versesCount}\n`;
    content += `Thafheem Vol: ${thafheemVolume}\n\n`;

    sections.forEach((section) => {
      if (section.subtitle) content += `${section.subtitle}\n`;
      if (section.text) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = section.text;
        content += `${tempDiv.textContent || tempDiv.innerText || ""}\n\n`;
      }
    });

    content += `\n— ${surahName} (Surah ${surahId})`;
    return content;
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(getAllContentAsText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleShare = async () => {
    const shareText = getAllContentAsText();
    const shareUrl = `${window.location.origin}/blockwise/${surahId}`;
    const shareData = {
      title: `${surahName} - Surah Information`,
      text: shareText,
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\nRead more: ${shareUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

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
          <div
            className="w-full flex justify-center pt-3 pb-1 sm:hidden cursor-grab active:cursor-grabbing"
            onClick={onClose}
          >
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2
              className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white font-malayalam"
              style={{ fontFamily: "'Noto Sans Malayalam'" }}
            >
              {surahName}
            </h2>
            <div className="flex items-center gap-2">
              {!loading && !error && (
                <>
                  <button
                    onClick={handleCopyAll}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative text-gray-500 dark:text-gray-400"
                    title="Copy all content"
                  >
                    {copied ? (
                      <span className="text-green-500 font-bold text-xs">
                        Copied!
                      </span>
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
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

          {/* Scrollable Content */}
          <div className="px-4 sm:px-6 py-6 sm:py-8 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Loading Surah information...
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-500 dark:text-red-400 text-lg mb-2">
                  Failed to load Surah information
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {error}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="font-poppins">
                {/* Arabic Title */}
                <div className="text-center mb-6 sm:mb-8 border-b border-gray-200 dark:border-gray-700 pb-4 sm:pb-6">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-arabic text-black mb-4 sm:mb-6 dark:text-white px-2">
                    {arabicName}
                  </h2>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 text-center">
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 sm:px-4 sm:py-3">
                      <div className="text-cyan-500 text-xs sm:text-sm">
                        Revelation
                      </div>
                      <div className="text-gray-900 font-semibold text-sm sm:text-base capitalize">
                        {revelationPlace}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 sm:px-4 sm:py-3">
                      <div className="text-cyan-500 text-xs sm:text-sm">
                        Revelation Order
                      </div>
                      <div className="text-gray-900 font-semibold text-sm sm:text-base">
                        {revelationOrder}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 sm:px-4 sm:py-3">
                      <div className="text-cyan-500 text-xs sm:text-sm">
                        Verses
                      </div>
                      <div className="text-gray-900 font-semibold text-sm sm:text-base">
                        {versesCount}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 sm:px-4 sm:py-3">
                      <div className="text-cyan-500 text-xs sm:text-sm">
                        Thafheem Vol
                      </div>
                      <div className="text-gray-900 font-semibold text-sm sm:text-base">
                        {thafheemVolume}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 sm:px-4 sm:py-3">
                      <div className="text-cyan-500 text-xs sm:text-sm">
                        Paragraphs
                      </div>
                      <div className="text-gray-900 font-semibold text-sm sm:text-base">
                        {paragraphCount}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Malayalam Content Sections */}
                <style>{`
                  .blockwise-preface-content, .blockwise-preface-content * {
                    font-family: 'Noto Sans Malayalam', sans-serif !important;
                    line-height: 2 !important;
                  }
                  .blockwise-preface-content sup.f-noteno,
                  .blockwise-preface-content a.crs {
                    color: #2AA0BF !important;
                    cursor: pointer !important;
                    text-decoration: none !important;
                  }
                  .blockwise-preface-content sup.f-noteno:hover,
                  .blockwise-preface-content a.crs:hover {
                    text-decoration: underline !important;
                  }
                `}</style>
                <div
                  className="text-gray-700 leading-relaxed dark:text-gray-300 text-sm sm:text-base space-y-4 blockwise-preface-content font-malayalam"
                  style={{
                    fontFamily: "'Noto Sans Malayalam', sans-serif",
                    lineHeight: "2",
                  }}
                  onClick={handleContentClick}
                >
                  {sections.map((section, index) => (
                    <div key={index} className="space-y-3">
                      {section.subtitle && (
                        <h4 className="text-base sm:text-lg font-semibold text-cyan-500">
                          {section.subtitle}
                        </h4>
                      )}
                      {getPrefaceParagraphs(section.text).map((p, i) => (
                        <p key={i} dangerouslySetInnerHTML={{ __html: linkifyVerseRefs(p) }} />
                      ))}
                    </div>
                  ))}
                </div>
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
        onClose={() =>
          setNotePopupState((prev) => ({ ...prev, isOpen: false }))
        }
      />

      {/* Verse Reference Popup */}
      {verseRefState.isOpen && (
        <VerseReferenceModal
          surahId={verseRefState.surahId}
          ayah={verseRefState.ayah}
          language="mal"
          onInterpretationClick={(refSurahId, iptNo) => {
            setVerseRefState({ isOpen: false, surahId: null, ayah: null });
            setInterpretationState({ isOpen: true, surahId: refSurahId, interpretationNo: parseInt(iptNo, 10) });
          }}
          onClose={() => setVerseRefState({ isOpen: false, surahId: null, ayah: null })}
        />
      )}

      {/* Interpretation Popup */}
      {interpretationState.isOpen && (
        <BlockInterpretationModal
          surahId={interpretationState.surahId}
          range="1-7"
          interpretationNo={interpretationState.interpretationNo}
          language="mal"
          onClose={() => setInterpretationState({ isOpen: false, surahId: null, interpretationNo: null })}
        />
      )}
    </>,
    modalRoot
  );
};

export default BlockWiseSurahInfoModal;
