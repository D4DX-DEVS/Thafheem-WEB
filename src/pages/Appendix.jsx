import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchAppendix } from "../api/apifunction";

const PAGE_CONFIG = {
  malayalam: {
    title: "Malayalam Appendix",
    
    apiLanguage: "malayalam",
  },
  english: {
    title: "English Appendix",
    
    apiLanguage: "english",
  },
  urdu: {
    title: "ضمیمہ",
    
    apiLanguage: "urdu",
  },
  hindi: {
    title: "परिशिष्ट",
   
    apiLanguage: "hindi",
  },
  bangla: {
    title: "Bangla Appendix",

    apiLanguage: "bangla",
  },
  tamil: {
    title: "பின்னிணைப்பு",

    apiLanguage: "tamil",
  },
};

const Appendix = () => {
  const { lang } = useParams();
  const normalized = String(lang || "english").toLowerCase();
  
  // Priority: URL parameter over theme context for language detection
  const pageConfig = useMemo(() => {
    // Check Tamil first to avoid conflicts with other languages
    if (normalized === "ta" || normalized === "tamil") {
      return PAGE_CONFIG.tamil;
    }
    if (normalized.startsWith("mal")) {
      return PAGE_CONFIG.malayalam;
    }
    if (normalized.startsWith("urdu") || normalized === "u") {
      return PAGE_CONFIG.urdu;
    }
    if (normalized.startsWith("hindi") || normalized === "hi") {
      return PAGE_CONFIG.hindi;
    }
    if (normalized.startsWith("bangla") || normalized === "bn") {
      return PAGE_CONFIG.bangla;
    }
    return PAGE_CONFIG.english;
  }, [normalized]);

  // Language flags based on URL parameter (not theme context) to avoid conflicts
  const isTamil = normalized === "ta" || normalized === "tamil" || normalized.startsWith("tamil");
  const isUrdu = normalized.startsWith("urdu") || normalized === "u";
  const isMalayalam = normalized.startsWith("mal");
  const isBangla = normalized.startsWith("bangla") || normalized === "bn";
  const isHindi = normalized.startsWith("hindi") || normalized === "hi";
  const isEnglish = !isTamil && !isUrdu && !isMalayalam && !isBangla && !isHindi;

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const sidebarNavRef = useRef(null);

  // Track which section is currently in view
  useEffect(() => {
    if (loading || sections.length === 0) return;
    if (!isMalayalam && !isUrdu && !isHindi) return;

    const visibleSections = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number(entry.target.getAttribute('data-section-index'));
          if (Number.isNaN(idx)) return;

          if (entry.isIntersecting) {
            visibleSections.set(idx, entry.intersectionRatio);
          } else {
            visibleSections.delete(idx);
          }
        });

        if (visibleSections.size > 0) {
          let nextIndex = -1;
          let bestRatio = -1;
          visibleSections.forEach((ratio, idx) => {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              nextIndex = idx;
            }
          });
          if (nextIndex >= 0) {
            setActiveSection((prev) => (prev === nextIndex ? prev : nextIndex));
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    sections.forEach((section, index) => {
      const el = document.getElementById(`appendix-section-${index}`);
      if (!el) return;
      el.setAttribute('data-section-index', String(index));
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [loading, sections, isMalayalam, isUrdu, isHindi]);

  // Scroll the active TOC item into view inside the sidebar nav
  useEffect(() => {
    if (!sidebarNavRef.current) return;
    const activeBtn = sidebarNavRef.current.querySelector(`[data-toc-index="${activeSection}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeSection]);

  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
  };

  const normalizeUrduTitle = (html) => {
    if (!isUrdu || !html) {
      return html;
    }

    const fixedQuestion = html
      .replace(/\)\s*\?([A-Za-z][^()<>]*)\(/g, '($1?)')
      .replace(/\(\s*\?([A-Za-z][^()<>]*)\)/g, '($1?)');

    // Isolate English fragments in parentheses to keep LTR punctuation order.
    return fixedQuestion.replace(/\(([^()<>]*[A-Za-z][^()<>]*)\)/g, '(<bdi dir="ltr">$1</bdi>)');
  };

  const getUrduTocTitle = (html) => {
    if (!isUrdu || !html) {
      return stripHtml(html || '');
    }

    const decodeEntities = (str) => str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

    return decodeEntities(
      html
        .replace(/<[^>]+>/g, '')
        .replace(/\([^)]*[A-Za-z][^)]*\)/g, '')
        .replace(/[A-Za-z0-9][A-Za-z0-9\s.,;:!?\-_/"']*/g, '')
        .replace(/[-–—]{2,}/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    );
  };

  const getUrduSectionTitle = (html) => {
    if (!isUrdu || !html) return html;
    return html
      .replace(/<[^>]+>/g, '')                          // strip HTML tags (avoids <strong> → <>)
      .replace(/\([^)]*[A-Za-z][^)]*\)/g, '')          // remove (English parentheticals)
      .replace(/[A-Za-z][A-Za-z0-9\s.,;:!?\-_/"']*/g, '') // remove remaining English words
      .replace(/\(\s*\)/g, '')                          // remove empty parentheses ()
      .replace(/[-\u2013\u2014]{2,}/g, '')              // remove orphaned dashes
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  const getHindiTocTitle = (html) => {
    const plain = stripHtml(html || '');
    if (!isHindi || !plain) {
      return plain;
    }

    const cleaned = plain
      .replace(/\([^)]*[A-Za-z][^)]*\)/g, '')
      .replace(/\b[A-Za-z][A-Za-z0-9'"/_.-]*\b/g, '')
      .replace(/[-–—]{2,}/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return cleaned || plain;
  };

  useEffect(() => {
    let isMounted = true;

    const loadAppendix = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAppendix(pageConfig.apiLanguage);
        if (!isMounted) {
          return;
        }
        setSections(data.sections || []);
        if (data.error) {
          setError("Unable to fetch appendix content from the server.");
        }
      } catch {
        if (isMounted) {
          setError("Unable to load appendix content. Please try again later.");
          setSections([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAppendix();
    return () => {
      isMounted = false;
    };
  }, [pageConfig.apiLanguage]);

return (
    <div className="p-6 dark:bg-gray-900 min-h-screen">
      {isUrdu && (
        <style>{`
          .urdu-appendix-content {
            direction: rtl;
          }
          .urdu-appendix-content p,
          .urdu-appendix-content h1,
          .urdu-appendix-content h2,
          .urdu-appendix-content h3,
          .urdu-appendix-content h4,
          .urdu-appendix-content li,
          .urdu-appendix-content strong,
          .urdu-appendix-content b {
            direction: rtl;
            text-align: justify !important;
            text-align-last: right !important;
            text-justify: inter-word !important;
            font-size: 16px !important;
            line-height: 2.6 !important;
            margin-bottom: 10px !important;
            font-family: 'Noto Nastaliq Urdu', 'JameelNoori', serif !important;
          }
        `}</style>
      )}
      {isEnglish && (
        <style>{`
          .english-appendix-content {
            text-align: justify !important;
          }
          .english-appendix-content p {
            text-align: justify !important;
          }
        `}</style>
      )}
      {isMalayalam && (
        <style>{`
          .malayalam-appendix-content {
            font-family: 'Noto Sans Malayalam' !important;
          }
          .malayalam-appendix-content p {
            text-align: justify !important;
            margin-bottom: 2em !important;
            font-family: 'Noto Sans Malayalam';
            font-size: 16px;
            line-height: 1.7;
          }
        `}</style>
      )}
      {isBangla && (
        <style>{`
          .bangla-appendix-content {
            text-align: justify !important;
            font-family: 'Noto Sans Bengali', 'Kalpurush', sans-serif !important;
          }
          .bangla-appendix-content p {
            text-align: justify !important;
            margin-bottom: 1em !important;
            font-family: 'Noto Sans Bengali', 'Kalpurush', sans-serif !important;
            font-size: 16px !important;
            line-height: 1.7 !important;
          }
        `}</style>
      )}
      {isHindi && (
        <style>{`
          .hindi-appendix-content {
            font-family: 'NotoSansDevanagari', sans-serif !important;
            text-align: justify !important;
          }
          .hindi-appendix-content p {
            text-align: justify !important;
            margin-bottom: 1.5em !important;
            font-family: 'NotoSansDevanagari', sans-serif !important;
            font-size: 16px !important;
            line-height: 1.8 !important;
          }
          .hindi-appendix-content h1,
          .hindi-appendix-content h2,
          .hindi-appendix-content h3,
          .hindi-appendix-content h4,
          .hindi-appendix-content strong {
            font-family: 'NotoSansDevanagari', sans-serif !important;
          }
        `}</style>
      )}
      {isTamil && (
        <style>{`
          .tamil-appendix-content {
            font-family: 'Bamini', serif !important;
            text-align: justify !important;
            text-justify: inter-word !important;
            line-height: 1.8 !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }
          .tamil-appendix-content p {
            margin-bottom: 1.5em !important;
            text-align: justify !important;
            text-justify: inter-word !important;
            font-family: 'Bamini', serif !important;
            font-size: 16px !important;
            line-height: 1.8 !important;
          }
          .tamil-appendix-content h1,
          .tamil-appendix-content h2,
          .tamil-appendix-content h3,
          .tamil-appendix-content h4,
          .tamil-appendix-content strong {
            font-family: 'Bamini', serif !important;
            text-align: justify !important;
          }
        `}</style>
      )}

      {isMalayalam || isUrdu || isHindi ? (
        /* ── Malayalam / Urdu / Hindi layout: sidebar + centered content ── */
        <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6">
          {loading && (
            <div
              className={`py-10 text-center text-gray-600 dark:text-gray-300${isHindi ? ' font-hindi' : ''}`}
              style={isUrdu ? { fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" } : isHindi ? {} : { fontFamily: "'Noto Sans Malayalam'" }}
              dir={isUrdu ? 'rtl' : 'ltr'}
            >
              {isUrdu ? 'مواد لوڈ ہو رہا ہے...' : isHindi ? 'सामग्री लोड हो रही है...' : 'ഉള്ളടക്കം ലോഡുചെയ്യുന്നു...'}
            </div>
          )}
          {!loading && error && (
            <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200">
              {error}
            </div>
          )}
          {!loading && !error && sections.length === 0 && (
            <div
              className={`py-10 text-center text-gray-600 dark:text-gray-300${isHindi ? ' font-hindi' : ''}`}
              style={isUrdu ? { fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" } : isHindi ? {} : { fontFamily: "'Noto Sans Malayalam'" }}
              dir={isUrdu ? 'rtl' : 'ltr'}
            >
              {isUrdu ? 'اس وقت مواد دستیاب نہیں ہے۔' : isHindi ? 'अभी सामग्री उपलब्ध नहीं है।' : 'ഇപ്പോൾ ഉള്ളടക്കം ലഭ്യമല്ല.'}
            </div>
          )}
          {!loading && !error && sections.length > 0 && (
            <>
              {/* Mobile TOC floating toggle */}
              <div className="lg:hidden fixed bottom-6 right-4 z-50">
                <button
                  onClick={() => setTocOpen((o) => !o)}
                  className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-xl transition-all duration-200"
                  style={isUrdu ? { fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" } : isHindi ? {} : { fontFamily: "'Noto Sans Malayalam'" }}
                  dir={isUrdu ? 'rtl' : 'ltr'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
                  </svg>
                  {isUrdu ? 'عنوانات' : isHindi ? 'परिशिष्ट' : 'ഉള്ളടക്കം'}
                </button>
                {tocOpen && (
                  <div
                    className="absolute bottom-14 right-0 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                    style={{ maxHeight: '65vh', overflowY: 'auto' }}
                  >
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <span
                        className={`text-base font-bold text-gray-800 dark:text-white${isHindi ? ' font-hindi' : ''}`}
                        style={isUrdu ? { fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" } : isHindi ? {} : { fontFamily: "'Noto Sans Malayalam'" }}
                      >
                        {isUrdu ? 'عنوانات' : isHindi ? 'परिशिष्ट' : 'ഉള്ളടക്കം'}
                      </span>
                      <button onClick={() => setTocOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <ul className="py-2">
                      {sections.map((section, index) =>
                        section.title ? (
                          <li key={index} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                            <button
                              className={`w-full px-4 py-2.5 text-base font-semibold text-gray-700 dark:text-gray-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors ${isUrdu ? 'text-right' : 'text-left'}${isHindi ? ' font-hindi' : ''}`}
                              style={isUrdu ? { fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif", lineHeight: '2.1' } : isHindi ? { lineHeight: '1.7' } : { fontFamily: "'Noto Sans Malayalam'", lineHeight: '1.7' }}
                              dir={isUrdu ? 'rtl' : 'ltr'}
                              onClick={() => {
                                const el = document.getElementById(`appendix-section-${index}`);
                                if (el) {
                                  const top = el.getBoundingClientRect().top + window.scrollY - 80;
                                  window.scrollTo({ top, behavior: 'smooth' });
                                }
                                setTocOpen(false);
                              }}
                            >
                              {isUrdu ? getUrduTocTitle(section.title) : isHindi ? getHindiTocTitle(section.title) : stripHtml(section.title)}
                            </button>
                          </li>
                        ) : null
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Desktop: sidebar + content side-by-side */}
              <div className={`flex gap-6 items-start ${isUrdu ? 'lg:flex-row-reverse' : ''}`}>
                {/* Sticky left TOC sidebar — desktop only */}
                <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-20 self-start">
                  <div className="bg-white dark:bg-[#1b1d27] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <span
                        className="text-lg font-bold text-gray-800 dark:text-white"
                        style={isUrdu ? { fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" } : isHindi ? {} : { fontFamily: "'Noto Sans Malayalam'" }}
                      >
                        {isUrdu ? 'عنوانات' : isHindi ? 'परिशिष्ट' : 'ഉള്ളടക്കം'}
                      </span>
                    </div>
                    <nav ref={sidebarNavRef} style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
                      <ul className="py-2 px-2 space-y-0.5">
                        {sections.map((section, index) =>
                          section.title ? (
                            <li key={index}>
                              <button
                                data-toc-index={index}
                                className={`w-full px-3 py-2 text-sm font-semibold rounded-lg transition-colors duration-150 ${isUrdu ? 'text-right' : 'text-left'}${isHindi ? ' font-hindi' : ''} ${
                                  activeSection === index
                                    ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan-600 dark:hover:text-cyan-400'
                                }`}
                                style={isUrdu ? { fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif", lineHeight: '2.1' } : isHindi ? { lineHeight: '1.7' } : { fontFamily: "'Noto Sans Malayalam'", lineHeight: '1.7' }}
                                dir={isUrdu ? 'rtl' : 'ltr'}
                                onClick={() => {
                                  setActiveSection(index);
                                  const el = document.getElementById(`appendix-section-${index}`);
                                  if (el) {
                                    const top = el.getBoundingClientRect().top + window.scrollY - 80;
                                    window.scrollTo({ top, behavior: 'smooth' });
                                  }
                                }}
                              >
                                {isUrdu ? getUrduTocTitle(section.title) : isHindi ? getHindiTocTitle(section.title) : stripHtml(section.title)}
                              </button>
                            </li>
                          ) : null
                        )}
                      </ul>
                    </nav>
                  </div>
                </aside>

                {/* Main content — centered in remaining space */}
                <div className="flex-1 min-w-0 max-w-[900px] mx-auto space-y-8" dir={isUrdu ? 'rtl' : 'ltr'}>
                  {sections.map((section, index) => (
                    <section
                      key={section.id || index}
                      id={`appendix-section-${index}`}
                      className="bg-white dark:bg-[#1b1d27] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 sm:p-8"
                    >
                      {section.title && (
                        <h3
                          className={`text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 ${isUrdu ? 'font-urdu-nastaliq text-right' : isHindi ? 'font-hindi' : 'font-malayalam'}`}
                          dangerouslySetInnerHTML={{ __html: isUrdu ? getUrduSectionTitle(section.title) : section.title }}
                          style={isUrdu ? { fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif", lineHeight: '2.1' } : isHindi ? {} : { fontFamily: "'Noto Sans Malayalam'" }}
                          dir={isUrdu ? 'rtl' : 'ltr'}
                        />
                      )}
                      <div
                        className={`prose prose-sm sm:prose-base dark:prose-invert max-w-none leading-7 prose-a:text-cyan-600 dark:prose-a:text-cyan-400 ${isUrdu ? 'urdu-appendix-content font-urdu-nastaliq' : isHindi ? 'font-hindi hindi-appendix-content' : 'malayalam-appendix-content'}`}
                        dangerouslySetInnerHTML={{ __html: section.text || "" }}
                        style={isUrdu ? { fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" } : isHindi ? { textAlign: 'justify' } : { fontFamily: "'Noto Sans Malayalam'" }}
                        dir={isUrdu ? 'rtl' : 'ltr'}
                      />
                    </section>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* ── All other languages: original single-column ── */
        <div className="sm:max-w-[1070px] max-w-[350px] w-full mx-auto font-poppins">
          <h2
            className={`text-2xl font-bold mb-2 dark:text-white border-b border-gray-300 dark:border-gray-600 pb-2 ${isUrdu ? 'font-urdu-nastaliq text-right' : isTamil ? 'font-tamil' : ''}`}
            style={isUrdu ? { fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" } : {}}
            dir={isUrdu ? 'rtl' : 'ltr'}
          >
            {pageConfig.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {pageConfig.description}
          </p>
          {loading && (
            <div className="py-10 text-center text-gray-600 dark:text-gray-300">
              Loading appendix...
            </div>
          )}
          {!loading && error && (
            <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200">
              {error}
            </div>
          )}
          {!loading && !error && sections.length === 0 && (
            <div className="py-10 text-center text-gray-600 dark:text-gray-300">
              Appendix content is not available at the moment.
            </div>
          )}
          {!loading && !error && sections.length > 0 && (
            <div className="space-y-8" dir={isUrdu ? "rtl" : "ltr"}>
              {sections.map((section, index) => (
                <section
                  key={section.id || index}
                  id={`appendix-section-${index}`}
                  className="bg-white dark:bg-[#1b1d27] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 sm:p-7"
                >
                  {section.title && (
                    <h3
                      className={`text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 ${isBangla ? 'font-bengali' : ''} ${isUrdu ? 'font-urdu-nastaliq' : ''} ${isTamil ? 'font-tamil' : ''}`}
                      dangerouslySetInnerHTML={{ __html: section.title }}
                      style={isUrdu ? { textAlign: 'right', fontFamily: "'Poppins', 'Noto Nastaliq Urdu', 'JameelNoori', serif", unicodeBidi: 'plaintext' } : isTamil ? { fontFamily: "'Bamini', serif", textAlign: 'justify' } : {}}
                    />
                  )}
                  <div
                    className={`prose prose-sm sm:prose-base dark:prose-invert max-w-none leading-7 prose-a:text-cyan-600 dark:prose-a:text-cyan-400 ${isBangla ? 'font-bengali bangla-appendix-content' : ''} ${isUrdu ? 'font-urdu-nastaliq urdu-appendix-content' : ''} ${isEnglish ? 'english-appendix-content' : ''} ${isTamil ? 'tamil-appendix-content' : ''}`}
                    dangerouslySetInnerHTML={{ __html: section.text || "" }}
                    style={isUrdu ? {
                      textAlign: 'right',
                      fontSize: '16px',
                      lineHeight: '2.6',
                      fontFamily: "'Poppins', 'Noto Nastaliq Urdu', 'JameelNoori', serif"
                    } : isEnglish ? {
                      textAlign: 'justify',
                      fontFamily: "'Poppins', sans-serif"
                    } : isBangla ? {
                      textAlign: 'justify',
                      fontFamily: "'Noto Sans Bengali', 'Kalpurush', sans-serif"
                    } : isTamil ? {
                      textAlign: 'justify',
                      textJustify: 'inter-word',
                      fontFamily: "'Bamini', serif",
                      lineHeight: '1.8',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word'
                    } : {}}
                  />
                </section>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Appendix;
