import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { fetchMalayalamFinalityOfProphethood, fetchNoteById } from '../api/apifunction';
import NotePopup from '../components/NotePopup';

const MalayalamFinalityOfProphethood = () => {
  const { translationLanguage } = useTheme();
  const isMalayalam = translationLanguage === 'mal';

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const sidebarNavRef = useRef(null);
  const [notePopup, setNotePopup] = useState({
    isOpen: false,
    noteId: null,
    noteName: null,
    noteText: null,
    loading: false,
  });

  // Determine container width based on content length
  const determineContainerWidth = (contentLength = 0) => {
    if (contentLength <= 400) {
      return "max-w-lg";
    }
    if (contentLength <= 1200) {
      return "max-w-2xl";
    }
    if (contentLength <= 2000) {
      return "max-w-3xl";
    }
    return "max-w-4xl";
  };

  useEffect(() => {
    let isMounted = true;

    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchMalayalamFinalityOfProphethood();
        if (!isMounted) return;

        setSections(data.sections || []);
        if (data.error) {
          setError('Unable to fetch content from the server.');
        }
      } catch (err) {
        if (isMounted) {
          setError('Unable to load content. Please try again later.');
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

  // IntersectionObserver to track active section
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
          let nextIndex = -1;
          let bestRatio = -1;
          visibleSections.forEach((ratio, idx) => {
            if (ratio > bestRatio) { bestRatio = ratio; nextIndex = idx; }
          });
          if (nextIndex >= 0) {
            setActiveSection((prev) => (prev === nextIndex ? prev : nextIndex));
          }
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

  // Scroll active TOC item into view
  useEffect(() => {
    if (!sidebarNavRef.current) return;
    const activeBtn = sidebarNavRef.current.querySelector(`[data-toc-index="${activeSection}"]`);
    if (activeBtn) activeBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeSection]);

  const handleNoteClick = async (event) => {
    const target = event.target.closest('.p-note-link');
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();

    const noteId = target.getAttribute('data-note-id');
    if (!noteId) return;

    setNotePopup({
      isOpen: true,
      noteId,
      noteName: null,
      noteText: null,
      loading: true,
    });

    try {
      const noteData = await fetchNoteById(noteId);
      const noteName = noteData?.NoteName || null;
      const noteText = noteData?.NoteText || noteData?.note_text || noteData?.content || noteData?.html || noteData?.text || noteData?.body || noteData?.description || noteData?.note || null;
      
      setNotePopup({
        isOpen: true,
        noteId,
        noteName,
        noteText: noteText || '<p style="color: #666;">Note content is not available.</p>',
        loading: false,
      });
    } catch (err) {
      console.error(`Failed to fetch note ${noteId}:`, err.message);
      setNotePopup({
        isOpen: true,
        noteId,
        noteName: null,
        noteText: '<p style="color: #666;">Note content is temporarily unavailable. Please try again later.</p>',
        loading: false,
      });
    }
  };

  const processNotes = (html) => {
    if (!html) return html;
    // Process B, H, N, P, X followed by digits (B123, H456, N789, P2151, X123, etc.)
    // Pattern: letter immediately followed by one or more digits
    return html.replace(/([BHNPX])(\d+)/g, (match, letter, number) => {
      // Check if already wrapped in a link element
      if (match.includes('p-note-link')) {
        return match;
      }
      const noteId = `${letter}${number}`;
      return `<a href="#" class="p-note-link inline-block cursor-pointer text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors font-semibold" data-note-id="${noteId}" title="Click to view note ${noteId}"><sup>${match}</sup></a>`;
    });
  };

  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 font-poppins">
      <style>{`
        .mal-finality-content,
        .mal-finality-content * {
          font-family: 'Noto Sans Malayalam', serif !important;
        }
        .mal-finality-content p,
        .mal-finality-content li,
        .mal-finality-content div:not(.mal-finality-content) {
          text-align: justify !important;
          text-justify: inter-word !important;
          margin-bottom: 1.8em !important;
          font-family: 'Noto Sans Malayalam', serif !important;
          font-size: 16px !important;
          line-height: 2.0 !important;
        }
        .mal-finality-content h1,
        .mal-finality-content h2,
        .mal-finality-content h3,
        .mal-finality-content h4,
        .mal-finality-content strong {
          font-family: 'Noto Sans Malayalam', serif !important;
          margin-bottom: 0.8em !important;
        }
        .mal-finality-content p:last-child,
        .mal-finality-content li:last-child,
        .mal-finality-content div:not(.mal-finality-content):last-child {
          margin-bottom: 0 !important;
        }
      `}</style>
      <div className="max-w-[1070px] w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
         

          <div className="mt-4 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Loading / Error / Empty */}
        {loading && (
          <div className="py-10 text-center text-gray-600 dark:text-gray-300">
            {isMalayalam ? 'ഉള്ളടക്കം ലോഡുചെയ്യുന്നു...' : 'Loading content...'}
          </div>
        )}

        {!loading && error && (
          <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && sections.length === 0 && (
          <div className="py-10 text-center text-gray-600 dark:text-gray-300">
            {isMalayalam
              ? 'ഇപ്പോൾ ഉള്ളടക്കം ലഭ്യമല്ല.'
              : 'Content is not available at the moment.'}
          </div>
        )}

        {/* Content */}
        {!loading && !error && sections.length > 0 && (
          <>
            {/* Mobile TOC floating toggle */}
            <div className="lg:hidden fixed bottom-6 right-4 z-50">
              <button
                onClick={() => setTocOpen((o) => !o)}
                className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-xl transition-all duration-200"
                style={{ fontFamily: "'Noto Sans Malayalam', serif" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
                </svg>
                ഉള്ളടക്കം
              </button>
              {tocOpen && (
                <div
                  className="absolute bottom-14 right-0 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                  style={{ maxHeight: '65vh', overflowY: 'auto' }}
                >
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-base font-bold text-gray-800 dark:text-white" style={{ fontFamily: "'Noto Sans Malayalam', serif" }}>ഉള്ളടക്കം</span>
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
                            className="w-full px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left"
                            style={{ fontFamily: "'Noto Sans Malayalam', serif", lineHeight: '1.7' }}
                            onClick={() => {
                              const el = document.getElementById(`finality-section-${index}`);
                              if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
                              setTocOpen(false);
                            }}
                          >
                            {stripHtml(section.title)}
                          </button>
                        </li>
                      ) : null
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Desktop: sidebar + content */}
            <div className="flex gap-6 items-start">
              <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-20 self-start">
                <div className="bg-white dark:bg-[#1b1d27] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-lg font-bold text-gray-800 dark:text-white" style={{ fontFamily: "'Noto Sans Malayalam', serif" }}>ഉള്ളടക്കം</span>
                  </div>
                  <nav ref={sidebarNavRef} style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', overflowX: 'hidden' }}>
                    <ul className="py-2 px-2 space-y-0.5">
                      {sections.map((section, index) =>
                        section.title ? (
                          <li key={index} className="w-full">
                            <button
                              data-toc-index={index}
                              className={`w-full px-3 py-2 text-sm font-semibold rounded-lg transition-colors duration-150 text-left break-words ${
                                activeSection === index
                                  ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan-600 dark:hover:text-cyan-400'
                              }`}
                              style={{ fontFamily: "'Noto Sans Malayalam', serif", lineHeight: '1.7', wordBreak: 'break-word', whiteSpace: 'normal' }}
                              onClick={() => {
                                setActiveSection(index);
                                const el = document.getElementById(`finality-section-${index}`);
                                if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
                              }}
                            >
                              {stripHtml(section.title)}
                            </button>
                          </li>
                        ) : null
                      )}
                    </ul>
                  </nav>
                </div>
              </aside>

              <div className="flex-1 min-w-0 max-w-[900px] mx-auto space-y-8">
                {sections.map((section, index) => (
                  <section
                    key={section.id || index}
                    id={`finality-section-${index}`}
                    className="bg-white dark:bg-[#1b1d27] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 sm:p-7"
                    onClick={handleNoteClick}
                  >
                    {section.title && (
                      <h3
                        className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 font-malayalam"
                        dangerouslySetInnerHTML={{ __html: processNotes(section.title) }}
                        style={{ fontFamily: "'Noto Sans Malayalam', serif" }}
                      />
                    )}
                    <div
                      className="max-w-none font-malayalam mal-finality-content text-gray-800 dark:text-gray-200"
                      dangerouslySetInnerHTML={{ __html: processNotes(section.text || '') }}
                      style={{
                        fontFamily: "'Noto Sans Malayalam', serif",
                        lineHeight: 2.0,
                        textAlign: 'justify',
                      }}
                    />
                  </section>
                ))}
              </div>
            </div>
          </>
        )}
        {/* Note Popup for P notes */}
        <NotePopup
          isOpen={notePopup.isOpen}
          onClose={() => setNotePopup({ isOpen: false, noteId: null, noteName: null, noteText: null, loading: false })}
          noteId={notePopup.noteId}
          noteContent={notePopup.loading ? 'Loading...' : notePopup.noteText}
          noteName={notePopup.noteName}
          loading={notePopup.loading}
        />
      </div>
    </div>
  );
};

export default MalayalamFinalityOfProphethood;


