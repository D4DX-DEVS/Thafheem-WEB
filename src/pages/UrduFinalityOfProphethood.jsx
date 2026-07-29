import React, { useEffect, useRef, useState } from "react";
import { fetchUrduFinalityOfProphethood, fetchUrduFinalityFootnote } from "../api/apifunction";

const UrduFinalityOfProphethood = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const sidebarNavRef = useRef(null);
  const [footnoteModal, setFootnoteModal] = useState({
    open: false,
    footnoteId: '',
    content: '',
    loading: false,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchUrduFinalityOfProphethood();
        if (!isMounted) {
          return;
        }
        setSections(data.sections || []);
        if (data.error) {
          setError("Unable to fetch content from the server.");
        }
      } catch (err) {
        if (isMounted) {
          setError("Unable to load content. Please try again later.");
          setSections([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadContent();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleFootnoteClick = async (event) => {
    // Handle clicks on sup tags with footnote-link class (from backend)
    const target = event.target.closest('.footnote-link') || event.target.closest('sup.footnote-link');
    if (!target) return;

    const footnoteId = target.getAttribute('data-footnote-id');
    if (!footnoteId) {
      console.log('No footnote ID found on target:', target);
      return;
    }

    // Prevent default link behavior if it's a link
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Footnote clicked:', footnoteId);

    setFootnoteModal({
      open: true,
      footnoteId,
      content: 'Loading...',
      loading: true,
      error: null,
    });

    try {
      const data = await fetchUrduFinalityFootnote(footnoteId);
      if (data?.footnote_text) {
        setFootnoteModal({
          open: true,
          footnoteId,
          content: data.footnote_text,
          loading: false,
          error: null,
        });
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Footnote content not available');
      }
    } catch (err) {
      setFootnoteModal({
        open: true,
        footnoteId,
        content: 'Footnote content not available.',
        loading: false,
        error: err?.message || 'Unable to load footnote.',
      });
    }
  };

  const determineContainerSize = (contentLength = 0) => {
    // Determine width based on content length - optimal width for Urdu readability
    let widthClass = "max-w-3xl"; // Default width
    let minWidth = 'min(85vw, 500px)';
    let maxWidth = 'min(90vw, 800px)';
    
    if (contentLength <= 300) {
      widthClass = "max-w-xl";
      minWidth = 'min(80vw, 450px)';
      maxWidth = 'min(85vw, 576px)';
    } else if (contentLength <= 800) {
      widthClass = "max-w-2xl";
      minWidth = 'min(85vw, 500px)';
      maxWidth = 'min(90vw, 672px)';
    } else if (contentLength <= 1500) {
      widthClass = "max-w-3xl";
      minWidth = 'min(85vw, 550px)';
      maxWidth = 'min(90vw, 768px)';
    } else {
      // For very large content, slightly wider but still reasonable
      widthClass = "max-w-4xl";
      minWidth = 'min(88vw, 600px)';
      maxWidth = 'min(92vw, 896px)';
    }
    
    // Always enable max-height constraint for content longer than 500 chars to ensure scrolling
    const needsMaxHeight = contentLength > 500;
    
    return { widthClass, needsMaxHeight, minWidth, maxWidth };
  };

  // Track which section is currently visible in the viewport
  useEffect(() => {
    if (loading || sections.length === 0) return;
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
          let nextIndex = -1, bestRatio = -1;
          visibleSections.forEach((ratio, idx) => {
            if (ratio > bestRatio) { bestRatio = ratio; nextIndex = idx; }
          });
          if (nextIndex >= 0) setActiveSection((prev) => prev === nextIndex ? prev : nextIndex);
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    sections.forEach((section, index) => {
      const el = document.getElementById(`finality-section-${index}`);
      if (!el) return;
      el.setAttribute('data-section-index', String(index));
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, [loading, sections]);

  // Scroll the active TOC item into view inside the sidebar
  useEffect(() => {
    if (!sidebarNavRef.current) return;
    const activeBtn = sidebarNavRef.current.querySelector(`[data-toc-index="${activeSection}"]`);
    if (activeBtn) activeBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeSection]);

  const stripHtml = (html) => html ? html.replace(/<[^>]*>/g, '') : '';

  const decodeHtmlEntities = (str) => {
    if (!str) return '';
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  };

  const getUrduTocTitle = (html) => {
    if (!html) return '';
    return decodeHtmlEntities(
      html
        .replace(/<[^>]+>/g, '')
        .replace(/\([^)]*[A-Za-z][^)]*\)/g, '')
        .replace(/[A-Za-z][A-Za-z0-9\s.,;:!?\-_/"']*/g, '')
        .replace(/\(\s*\)/g, '')
        .replace(/[-\u2013\u2014]{2,}/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    );
  };

  return (
    <>
      <style>{`
        .urdu-finality-content {
          direction: rtl;
        }
        .urdu-finality-content p,
        .urdu-finality-content h1,
        .urdu-finality-content h2,
        .urdu-finality-content h3,
        .urdu-finality-content h4,
        .urdu-finality-content li,
        .urdu-finality-content strong,
        .urdu-finality-content b {
          direction: rtl;
          text-align: justify !important;
          text-align-last: right !important;
          text-justify: inter-word !important;
          font-size: 16px !important;
          line-height: 2.6 !important;
          margin-bottom: 10px !important;
          font-family: 'Noto Nastaliq Urdu', 'JameelNoori', serif !important;
        }
        .urdu-finality-title,
        .urdu-finality-title * {
          direction: rtl;
          text-align: right !important;
          font-family: 'Noto Nastaliq Urdu', 'JameelNoori', serif !important;
          font-size: 18px !important;
          line-height: 2.2 !important;
          font-weight: 600;
          color: inherit;
        }
        .urdu-finality-content .footnote-link,
        .footnote-link {
          color: #06b6d4 !important;
          background: transparent !important;
          border: none !important;
          padding: 0 2px !important;
          cursor: pointer !important;
          text-decoration: underline !important;
          font-size: inherit !important;
          font-family: inherit !important;
          transition: color 0.15s ease !important;
          display: inline !important;
        }
        .urdu-finality-content .footnote-link:hover,
        .footnote-link:hover {
          color: #0891b2 !important;
          text-decoration: underline !important;
        }
        .urdu-finality-content .footnote-link:focus,
        .footnote-link:focus {
          outline: 2px solid #06b6d4 !important;
          outline-offset: 2px !important;
        }
        /* Ensure sup tags with footnote-link are styled correctly */
        sup.footnote-link,
        .urdu-finality-content sup.footnote-link {
          vertical-align: super !important;
          font-size: 0.85em !important;
          color: #06b6d4 !important;
          cursor: pointer !important;
          text-decoration: underline !important;
          font-weight: normal !important;
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          margin: 0 1px !important;
        }
        sup.footnote-link:hover,
        .urdu-finality-content sup.footnote-link:hover {
          color: #0891b2 !important;
        }
        /* Prevent any link behavior from markdown parser */
        sup.footnote-link a,
        .urdu-finality-content sup.footnote-link a {
          color: inherit !important;
          text-decoration: inherit !important;
          pointer-events: none !important;
        }
        /* Remove any href attributes that might cause navigation */
        sup.footnote-link[href],
        .urdu-finality-content sup.footnote-link[href] {
          pointer-events: none !important;
        }
        /* Modal animation */
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .footnote-modal-container {
          animation: modalFadeIn 0.2s ease-out;
        }
        /* Urdu modal content styling */
        .footnote-modal-container [dir="rtl"] {
          font-family: 'Noto Nastaliq Urdu', 'JameelNoori', serif !important;
        }
        .footnote-modal-container [dir="rtl"] p,
        .footnote-modal-container [dir="rtl"] div,
        .footnote-modal-container [dir="rtl"] span {
          text-align: justify !important;
          text-align-last: right !important;
          direction: rtl !important;
        }
        /* Ensure proper justification for RTL Urdu text */
        .urdu-footnote-content {
          text-align: justify !important;
          text-align-last: right !important;
          direction: rtl !important;
          font-family: 'Noto Nastaliq Urdu', 'JameelNoori', serif !important;
        }
        .urdu-footnote-content * {
          text-align: justify !important;
          text-align-last: right !important;
        }
        .urdu-footnote-content div {
          text-align: justify !important;
          text-align-last: right !important;
          direction: rtl !important;
        }
        /* Remove any inline styles that might override justification */
        .urdu-footnote-content [style*="text-align"] {
          text-align: justify !important;
          text-align-last: right !important;
        }
        /* Smooth scrolling for modal content */
        .footnote-modal-container .overflow-y-auto {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }
        .footnote-modal-container .overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }
        .footnote-modal-container .overflow-y-auto::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .footnote-modal-container .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .footnote-modal-container .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        /* Dark mode scrollbar */
        .dark .footnote-modal-container .overflow-y-auto {
          scrollbar-color: #475569 #1e293b;
        }
        .dark .footnote-modal-container .overflow-y-auto::-webkit-scrollbar-track {
          background: #1e293b;
        }
        .dark .footnote-modal-container .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #475569;
        }
        .dark .footnote-modal-container .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    <div className="p-6 dark:bg-gray-900 min-h-screen">
      <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6">
        <h2
          className="text-2xl font-bold mb-6 dark:text-white border-b border-gray-300 dark:border-gray-600 pb-2 text-right"
          dir="rtl"
          style={{ fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" }}
        >
          ختم نبوت
        </h2>

        {loading && (
          <div className="py-10 text-center text-gray-600 dark:text-gray-300" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" }}>
            مواد لوڈ ہو رہا ہے...
          </div>
        )}

        {!loading && error && (
          <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && sections.length === 0 && (
          <div className="py-10 text-center text-gray-600 dark:text-gray-300" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" }}>
            اس وقت مواد دستیاب نہیں ہے۔
          </div>
        )}

        {!loading && !error && sections.length > 0 && (
          <>
            {/* Mobile TOC floating toggle */}
            <div className="lg:hidden fixed bottom-6 left-4 z-50">
              <button
                onClick={() => setTocOpen((o) => !o)}
                className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-xl transition-all duration-200"
                style={{ fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" }}
                dir="rtl"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
                </svg>
                عنوانات
              </button>
              {tocOpen && (
                <div
                  className="absolute bottom-14 left-0 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                  style={{ maxHeight: '65vh', overflowY: 'auto' }}
                >
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-base font-bold text-gray-800 dark:text-white" style={{ fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" }}>عنوانات</span>
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
                            className="w-full px-4 py-2.5 text-base font-semibold text-right text-gray-700 dark:text-gray-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                            style={{ fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif", lineHeight: '2.1' }}
                            dir="rtl"
                            onClick={() => {
                              const el = document.getElementById(`finality-section-${index}`);
                              if (el) { const top = el.getBoundingClientRect().top + window.scrollY - 80; window.scrollTo({ top, behavior: 'smooth' }); }
                              setTocOpen(false);
                            }}
                          >
                            {getUrduTocTitle(section.title)}
                          </button>
                        </li>
                      ) : null
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Desktop: sidebar (right side for RTL) + content */}
            <div className="flex gap-6 items-start flex-row-reverse">
              {/* Sticky right TOC sidebar — desktop only */}
              <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-20 self-start">
                <div className="bg-white dark:bg-[#1b1d27] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-lg font-bold text-gray-800 dark:text-white" style={{ fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" }}>
                      عنوانات
                    </span>
                  </div>
                  <nav ref={sidebarNavRef} style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
                    <ul className="py-2 px-2 space-y-0.5">
                      {sections.map((section, index) =>
                        section.title ? (
                          <li key={index}>
                            <button
                              data-toc-index={index}
                              className={`w-full px-3 py-2 text-sm font-semibold rounded-lg text-right transition-colors duration-150 ${
                                activeSection === index
                                  ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan-600 dark:hover:text-cyan-400'
                              }`}
                              style={{ fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif", lineHeight: '2.1' }}
                              dir="rtl"
                              onClick={() => {
                                setActiveSection(index);
                                const el = document.getElementById(`finality-section-${index}`);
                                if (el) { const top = el.getBoundingClientRect().top + window.scrollY - 80; window.scrollTo({ top, behavior: 'smooth' }); }
                              }}
                            >
                              {getUrduTocTitle(section.title)}
                            </button>
                          </li>
                        ) : null
                      )}
                    </ul>
                  </nav>
                </div>
              </aside>

              {/* Main content */}
              <div className="flex-1 min-w-0 max-w-[900px] mx-auto space-y-8" dir="rtl">
                {sections.map((section, index) => (
                  <section
                    key={section.id || index}
                    id={`finality-section-${index}`}
                    className="bg-white dark:bg-[#1b1d27] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 sm:p-8"
                    onClick={handleFootnoteClick}
                  >
                    {section.title && (
                      <div
                        className="urdu-finality-title mb-4 text-gray-900 dark:text-white"
                        dangerouslySetInnerHTML={{ __html: section.title }}
                        dir="rtl"
                      />
                    )}
                    <div
                      className="prose prose-sm sm:prose-base dark:prose-invert max-w-none urdu-finality-content"
                      dangerouslySetInnerHTML={{ __html: section.text || "" }}
                      style={{
                        fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif",
                        fontSize: '16px',
                        lineHeight: '2.6',
                      }}
                    />
                  </section>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Footnote Modal */}
        {footnoteModal.open && (() => {
          const contentLength = footnoteModal.content?.length || 0;
          const { widthClass, needsMaxHeight, minWidth, maxWidth } = determineContainerSize(contentLength);
          
          return (
            <div 
              className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-20 pb-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setFootnoteModal({ open: false, footnoteId: '', content: '', loading: false, error: null });
                }
              }}
            >
              <div 
                className={`footnote-modal-container bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full ${widthClass} max-h-[90vh] max-w-[95vw] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-200`}
                style={{
                  minWidth: minWidth,
                  maxWidth: maxWidth,
                  height: needsMaxHeight ? '90vh' : 'auto',
                  maxHeight: '90vh',
                }}
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
              >
                {/* Header - Fixed */}
                <div className="flex items-start justify-between p-4 sm:p-5 pb-3 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white" style={{ fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" }}>
                      حاشیہ {footnoteModal.footnoteId}
                    </h3>
                  </div>
                  <button
                    onClick={() =>
                      setFootnoteModal({ open: false, footnoteId: '', content: '', loading: false, error: null })
                    }
                    className="text-lg text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Content - Auto-sizing with scroll only when needed */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  <div className="p-4 sm:p-5 pt-4 overflow-y-auto flex-1" style={{ maxHeight: 'calc(90vh - 80px)' }}>
                    {footnoteModal.loading ? (
                      <div className="text-sm text-gray-600 dark:text-gray-300 text-center py-4" style={{ fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" }}>لوڈ ہو رہا ہے...</div>
                    ) : (
                      <div 
                        className="urdu-footnote-content text-sm sm:text-base leading-relaxed text-gray-800 dark:text-gray-200 break-words"
                        style={{ 
                          textAlign: 'justify',
                          textAlignLast: 'right',
                          fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif",
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word',
                          fontSize: '16px',
                          lineHeight: '2.6',
                          direction: 'rtl',
                        }}
                        dangerouslySetInnerHTML={{ 
                          __html: footnoteModal.content
                            ? (() => {
                                let processedContent = footnoteModal.content;
                                
                                // Remove anchor tags and other unwanted elements
                                processedContent = processedContent.replace(/\[\{#anchor-\d+\}\]/g, '');
                                
                                // Remove trailing backslashes (they seem to be line continuation markers)
                                processedContent = processedContent.replace(/\\\s*\n/g, ' ');
                                
                                // Split by double line breaks (paragraph breaks)
                                let paragraphs = processedContent.split(/\r\n\r\n|\n\n|\r\r/);
                                
                                // If no double breaks found, try splitting by single breaks but group them
                                if (paragraphs.length === 1) {
                                  // Split by single line breaks
                                  let lines = processedContent.split(/\r\n|\n|\r/);
                                  paragraphs = [];
                                  let currentParagraph = [];
                                  
                                  for (let line of lines) {
                                    line = line.trim();
                                    if (line.length === 0) {
                                      // Empty line = paragraph break
                                      if (currentParagraph.length > 0) {
                                        paragraphs.push(currentParagraph.join(' '));
                                        currentParagraph = [];
                                      }
                                    } else {
                                      currentParagraph.push(line);
                                    }
                                  }
                                  // Add last paragraph if exists
                                  if (currentParagraph.length > 0) {
                                    paragraphs.push(currentParagraph.join(' '));
                                  }
                                }
                                
                                // Wrap each paragraph in a p tag with proper styling
                                processedContent = paragraphs
                                  .map(p => p.trim())
                                  .filter(p => p.length > 0)
                                  .map(p => `<p style="text-align: justify; text-align-last: right; direction: rtl; font-family: 'Noto Nastaliq Urdu', 'JameelNoori', serif; line-height: 2.6; margin-bottom: 1.5em; margin-top: 0;">${p}</p>`)
                                  .join('');
                                
                                // Wrap all paragraphs in a container div
                                return `<div style="text-align: justify; text-align-last: right; direction: rtl; font-family: 'Noto Nastaliq Urdu', 'JameelNoori', serif;">${processedContent}</div>`;
                              })()
                            : ''
                        }}
                      />
                    )}
                    {footnoteModal.error && (
                      <div className="mt-3 text-xs text-red-600 dark:text-red-300" style={{ fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" }}>
                        {footnoteModal.error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
    </>
  );
};

export default UrduFinalityOfProphethood;

