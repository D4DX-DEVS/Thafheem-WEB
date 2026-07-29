import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { fetchAyaRanges, fetchAyaTranslation, fetchArabicVerses } from "../api/apifunction";

/**
 * VerseReferenceModal — Shows Arabic text + block translation for a referenced verse.
 * Replicates the mobile app's verse reference flow:
 *   1. Find the block range containing the referenced ayah
 *   2. Show Arabic verses for that range
 *   3. Show block translation with clickable interpretation numbers
 *
 * Props:
 *   surahId         - Surah number
 *   ayah            - Referenced ayah number
 *   language        - Current language ('mal', 'en', 'english', etc.)
 *   onInterpretationClick(surahId, interpretationNo) - Called when user clicks an interpretation number
 *   onClose         - Called when modal is closed
 */
const VerseReferenceModal = ({ surahId, ayah, language = "mal", onInterpretationClick, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [arabicVerses, setArabicVerses] = useState([]);
  const [translationText, setTranslationText] = useState("");
  const [range, setRange] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const scrollContainerRef = useRef(null);

  const modalRoot = document.getElementById("modal-root") || document.body;

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  useEffect(() => {
    if (!surahId || !ayah) return;
    loadData();
  }, [surahId, ayah, language]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Get all block ranges for this surah to find which range contains our ayah
      const ranges = await fetchAyaRanges(surahId, language);

      if (!ranges || !Array.isArray(ranges) || ranges.length === 0) {
        throw new Error("No verse ranges found for this surah");
      }

      // Find the range that contains our ayah
      let matchedRange = null;
      for (const r of ranges) {
        const from = r.AyaFrom || parseInt(r.Range?.split("-")[0]);
        const to = r.AyaTo || parseInt(r.Range?.split("-")[1] || r.Range?.split("-")[0]);
        if (ayah >= from && ayah <= to) {
          matchedRange = r;
          break;
        }
      }

      if (!matchedRange) {
        throw new Error(`Could not find range containing ayah ${ayah}`);
      }

      const rangeStr = matchedRange.Range || `${matchedRange.AyaFrom}-${matchedRange.AyaTo}`;
      setRange(rangeStr);

      // Step 2 & 3: Fetch Arabic verses and block translation in parallel
      const [arabicData, translationData] = await Promise.all([
        fetchArabicVerses(surahId),
        fetchAyaTranslation(surahId, rangeStr, language),
      ]);

      // Filter Arabic verses to only those in our range
      const from = matchedRange.AyaFrom || parseInt(rangeStr.split("-")[0]);
      const to = matchedRange.AyaTo || parseInt(rangeStr.split("-")[1] || rangeStr.split("-")[0]);

      const filteredArabic = (Array.isArray(arabicData) ? arabicData : [])
        .filter((v) => {
          const vNum = v.verse_number || v.ayah;
          return vNum >= from && vNum <= to;
        })
        .sort((a, b) => (a.verse_number || a.ayah) - (b.verse_number || b.ayah));

      setArabicVerses(filteredArabic);

      // Extract translation text from the response
      const text = translationData?.TranslationText || translationData?.translation_text || "";
      setTranslationText(text);
    } catch (err) {
      console.error("[VerseReferenceModal] Error loading data:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => onClose?.(), 250);
  }, [onClose]);

  // Parse translation text and make interpretation numbers clickable
  // Malayalam format: numbers appear after punctuation like ".67", "?69"
  // English format: numbers in <sup> tags like <sup>67</sup>
  const processTranslationForNumbers = (html) => {
    if (!html) return "";

    // Pattern 1: <sup>NUMBER</sup> or <sup foot_note="ID">NUMBER</sup>
    let processed = html.replace(
      /<sup[^>]*>\s*(\d+[A-Za-z]?)\s*<\/sup>/g,
      (match, num) =>
        `<span class="interpretation-number-chip" data-interpretation-no="${num}">${num}</span>`
    );

    // Pattern 2: Numbers after punctuation (period, question mark, comma, semicolon)
    // This matches the Malayalam translation format: "...നടക്കുന്നു.67 ..." or "...ഉണ്ടാവുക?69 ."
    // These are footnote/interpretation references
    processed = processed.replace(
      /([.?!,;])(\d+[A-Za-z]?)(?=[\s.,;:)\u200B\u200C\u200D]|$)/g,
      (match, punct, num) => {
        // Skip if number is too long (unlikely to be an interpretation ref)
        if (num.length > 4) return match;
        return `${punct}<span class="interpretation-number-chip" data-interpretation-no="${num}">${num}</span>`;
      }
    );

    // Pattern 3: Numbers between HTML tags that aren't verse numbers in parentheses
    processed = processed.replace(
      /(?<=>)\s*(\d+[A-Za-z]?)\s*(?=<)/g,
      (match, num) => {
        if (num.length > 4) return match;
        // Skip if it looks like a verse number (1-286 range with no letter suffix)
        return ` <span class="interpretation-number-chip" data-interpretation-no="${num}">${num}</span> `;
      }
    );

    return processed;
  };

  // Handle click on interpretation number
  const handleContentClick = (e) => {
    const chip = e.target.closest(".interpretation-number-chip");
    if (chip) {
      e.preventDefault();
      e.stopPropagation();
      const interpretationNo = chip.getAttribute("data-interpretation-no");
      if (interpretationNo && onInterpretationClick) {
        onInterpretationClick(surahId, interpretationNo);
      }
    }
  };

  const isMalayalam = language === "mal" || language === "malayalam" || language === "ml";
  const isUrdu = language === "urdu";

  return createPortal(
    <>
      <style>{`
        .interpretation-number-chip {
          display: inline;
          color: #0891b2;
          font-size: 0.8em;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.15s ease;
          vertical-align: super;
          line-height: 1;
          text-decoration: none;
        }
        .interpretation-number-chip:hover {
          color: #0e7490;
          text-decoration: underline;
        }
        .dark .interpretation-number-chip {
          color: #22d3ee;
        }
        .dark .interpretation-number-chip:hover {
          color: #67e8f9;
        }
        .verse-ref-arabic {
          font-family: 'KFGQPC Uthmanic Script HAFS', 'Scheherazade New', 'Amiri', serif;
          direction: rtl;
          text-align: right;
          line-height: 2.4;
        }
        .verse-ref-arabic-block {
          background: linear-gradient(135deg, #f0fdfa 0%, #ecfeff 100%);
          border-radius: 0.75rem;
          padding: 1.25rem 1rem;
        }
        .dark .verse-ref-arabic-block {
          background: linear-gradient(135deg, #042f2e 0%, #083344 100%);
        }
        .verse-ref-highlight {
          background-color: rgba(6, 182, 212, 0.08);
          border-radius: 0.5rem;
          padding: 0.5rem;
        }
        .dark .verse-ref-highlight {
          background-color: rgba(6, 182, 212, 0.12);
        }
      `}</style>

      <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center"
        onTouchMove={(e) => {
          // Prevent background scroll on touch devices when touching outside scroll container
          if (!scrollContainerRef.current?.contains(e.target)) {
            e.preventDefault();
          }
        }}
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
          onClick={handleClose}
        />

        {/* Modal Content */}
        <div
          className={`relative w-full sm:w-[90vw] sm:max-w-3xl max-h-[90vh] sm:max-h-[85vh] bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
            isClosing ? "animate-slideDown sm:animate-fadeOut" : "animate-slideUp sm:animate-fadeIn"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag Handle (Mobile) */}
          <div
            className="w-full flex justify-center pt-3 pb-1 sm:hidden cursor-grab active:cursor-grabbing"
            onClick={handleClose}
          >
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Verse Range {range || ayah}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Surah {surahId}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4"
            style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
            onClick={handleContentClick}
          >
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {error && (
              <div className="text-center py-8 text-red-500 dark:text-red-400">
                <p className="text-sm">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <>
                {/* Arabic Verses */}
                {arabicVerses.length > 0 && (
                  <div className="verse-ref-arabic-block space-y-1">
                    {arabicVerses.map((verse) => {
                      const verseNum = verse.verse_number || verse.ayah;
                      const isHighlighted = verseNum === ayah;
                      return (
                        <div
                          key={verseNum}
                          className={`verse-ref-arabic text-xl sm:text-2xl text-gray-900 dark:text-gray-100 ${
                            isHighlighted ? "verse-ref-highlight" : ""
                          }`}
                        >
                          {verse.text_uthmani || verse.text_simple || verse.text}
                          <span className="inline-block text-sm text-gray-500 dark:text-gray-400 mr-2 font-sans">
                            ({verseNum})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Divider */}
                {arabicVerses.length > 0 && translationText && (
                  <hr className="border-gray-200 dark:border-gray-700" />
                )}

                {/* Translation Text with clickable interpretation numbers */}
                {translationText && (
                  <div
                    className={`text-base leading-relaxed text-gray-800 dark:text-gray-200 ${
                      isMalayalam ? "font-malayalam" : ""
                    } ${isUrdu ? "text-right font-urdu" : ""}`}
                    style={{
                      fontFamily: isMalayalam
                        ? "'Noto Sans Malayalam', sans-serif"
                        : isUrdu
                        ? "'Noto Nastaliq Urdu', serif"
                        : "inherit",
                      lineHeight: isMalayalam ? "2" : isUrdu ? "2.6" : "1.8",
                      direction: isUrdu ? "rtl" : "ltr",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: processTranslationForNumbers(translationText),
                    }}
                  />
                )}

                {/* Hint text */}
                {translationText && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-2">
                    Tap numbered references to view interpretation
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>,
    modalRoot
  );
};

export default VerseReferenceModal;
