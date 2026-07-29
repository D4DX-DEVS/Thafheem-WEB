import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { fetchHindiFinalityOfProphethood } from '../api/apifunction';

const HindiFinalityOfProphethood = () => {
  const { translationLanguage } = useTheme();
  const isHindi = translationLanguage === 'hi';

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const sidebarNavRef = useRef(null);

  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
  };

  const getHindiTocTitle = (html) => {
    const plain = stripHtml(html || '');
    if (!plain) return plain;

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

    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchHindiFinalityOfProphethood();
        if (!isMounted) return;

        setSections(data.sections || []);
        if (data.error) {
          setError('Unable to fetch content from the server.');
        }
      } catch {
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

  useEffect(() => {
    if (!isHindi || loading || sections.length === 0) return;

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
      const el = document.getElementById(`finality-section-${index}`);
      if (!el) return;
      el.setAttribute('data-section-index', String(index));
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [isHindi, loading, sections]);

  useEffect(() => {
    if (!isHindi || !sidebarNavRef.current) return;
    const activeBtn = sidebarNavRef.current.querySelector(
      `[data-toc-index="${activeSection}"]`
    );
    if (activeBtn) {
      activeBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isHindi, activeSection]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 font-poppins">
      <div className="max-w-[1070px] w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-3xl font-bold text-gray-900 mb-2 dark:text-white ${isHindi ? 'font-hindi' : ''}`}>
            {isHindi ? 'पैगंबर के अंतिम होने का सिद्धांत' : 'The Finality of Prophethood'}
          </h1>
          <div className="mt-4 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Loading / Error / Empty */}
        {loading && (
          <div className="py-10 text-center text-gray-600 dark:text-gray-300">
            {isHindi ? 'सामग्री लोड हो रही है...' : 'Loading content...'}
          </div>
        )}

        {!loading && error && (
          <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && sections.length === 0 && (
          <div className="py-10 text-center text-gray-600 dark:text-gray-300">
            {isHindi ? 'सामग्री इस समय उपलब्ध नहीं है।' : 'Content is not available at the moment.'}
          </div>
        )}

        {/* Content */}
        {!loading && !error && sections.length > 0 && (
          <>
            <div className="lg:hidden fixed bottom-6 right-4 z-50">
              <button
                onClick={() => setTocOpen((open) => !open)}
                className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-xl transition-all duration-200 font-hindi"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
                </svg>
                शीर्षक
              </button>
              {tocOpen && (
                <div
                  className="absolute bottom-14 right-0 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                  style={{ maxHeight: '65vh', overflowY: 'auto' }}
                >
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-base font-bold text-gray-800 dark:text-white font-hindi">शीर्षक</span>
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
                            className="w-full px-4 py-2.5 text-base font-semibold text-gray-700 dark:text-gray-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left font-hindi"
                            style={{ lineHeight: '1.7' }}
                            onClick={() => {
                              const el = document.getElementById(`finality-section-${index}`);
                              if (el) {
                                const top = el.getBoundingClientRect().top + window.scrollY - 80;
                                window.scrollTo({ top, behavior: 'smooth' });
                              }
                              setTocOpen(false);
                            }}
                          >
                            {getHindiTocTitle(section.title)}
                          </button>
                        </li>
                      ) : null
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-6 items-start">
              <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-20 self-start">
                <div className="bg-white dark:bg-[#1b1d27] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-lg font-bold text-gray-800 dark:text-white font-hindi">शीर्षक</span>
                  </div>
                  <nav ref={sidebarNavRef} style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
                    <ul className="py-2 px-2 space-y-0.5">
                      {sections.map((section, index) =>
                        section.title ? (
                          <li key={index}>
                            <button
                              data-toc-index={index}
                              className={`w-full px-3 py-2 text-sm font-semibold rounded-lg transition-colors duration-150 text-left font-hindi ${
                                activeSection === index
                                  ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan-600 dark:hover:text-cyan-400'
                              }`}
                              style={{ lineHeight: '1.7' }}
                              onClick={() => {
                                setActiveSection(index);
                                const el = document.getElementById(`finality-section-${index}`);
                                if (el) {
                                  const top = el.getBoundingClientRect().top + window.scrollY - 80;
                                  window.scrollTo({ top, behavior: 'smooth' });
                                }
                              }}
                            >
                              {getHindiTocTitle(section.title)}
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
                  >
                    {section.title && (
                      <div
                        className={`mb-4 prose prose-lg dark:prose-invert max-w-none ${isHindi ? 'font-hindi' : ''}`}
                        dangerouslySetInnerHTML={{ __html: section.title }}
                      />
                    )}
                    <div
                      className={`prose prose-sm sm:prose-base dark:prose-invert max-w-none leading-relaxed text-gray-800 dark:text-gray-200 ${isHindi ? 'font-hindi' : ''}`}
                      dangerouslySetInnerHTML={{ __html: section.text || '' }}
                      style={{
                        lineHeight: 1.8,
                        textAlign: 'justify',
                      }}
                    />
                  </section>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HindiFinalityOfProphethood;

