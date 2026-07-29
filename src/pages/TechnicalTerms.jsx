import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { fetchMalayalamTechnicalTerms, fetchTechnicalTerms } from '../api/apifunction';

// Map frontend language codes to display info
const LANG_CONFIG = {
  mal: { label: 'സാങ്കേതിക പദങ്ങൾ', font: 'font-malayalam', dbCode: null, loadingText: 'ഉള്ളടക്കം ലോഡുചെയ്യുന്നു...', emptyText: 'ഇപ്പോൾ ഉള്ളടക്കം ലഭ്യമല്ല.' },
  E:   { label: 'Technical Terms', font: 'font-poppins', dbCode: 'english', loadingText: 'Loading content...', emptyText: 'Content not available at the moment.' },
  ur:  { label: 'اصطلاحات', font: 'font-urdu-nastaliq', dbCode: 'urdu', loadingText: '...مواد لوڈ ہو رہا ہے', emptyText: '.فی الحال مواد دستیاب نہیں ہے', rtl: true },
  hi:  { label: 'तकनीकी शब्दावली', font: 'font-hindi', dbCode: 'hindi', loadingText: 'सामग्री लोड हो रही है...', emptyText: 'फिलहाल सामग्री उपलब्ध नहीं है।' },
  bn:  { label: 'প্রযুক্তিগত শব্দাবলী', font: 'font-bengali', dbCode: 'bangla', loadingText: 'বিষয়বস্তু লোড হচ্ছে...', emptyText: 'এই মুহূর্তে বিষয়বস্তু উপলব্ধ নয়।' },
  ta:  { label: 'தொழில்நுட்பச் சொற்கள்', font: 'font-tamil', dbCode: 'tamil', loadingText: 'உள்ளடக்கம் ஏற்றப்படுகிறது...', emptyText: 'தற்போது உள்ளடக்கம் கிடைக்கவில்லை.' },
};

const TechnicalTerms = () => {
  const { translationLanguage } = useTheme();
  const config = LANG_CONFIG[translationLanguage] || LANG_CONFIG['E'];

  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);

        // Malayalam uses its own endpoint (articles table); others use technical_terms table
        const data = config.dbCode
          ? await fetchTechnicalTerms(config.dbCode)
          : await fetchMalayalamTechnicalTerms();

        if (!isMounted) return;

        setContent(data);
        if (data.error) {
          setError('Unable to fetch content from the server.');
        }
      } catch (err) {
        if (isMounted) {
          setError('Unable to load content. Please try again later.');
          setContent(null);
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
  }, [translationLanguage, config.dbCode]);

  // Process image URLs - convert relative paths to absolute if needed
  const processImageUrls = (html) => {
    if (!html) return html;
    const baseUrl = import.meta.env.VITE_ASSET_BASE || window.location.origin;
    return html.replace(
      /src=["'](\/articles\/[^"']+)["']/g,
      (match, path) => {
        if (path.startsWith('http://') || path.startsWith('https://')) {
          return match;
        }
        return `src="${baseUrl}${path}"`;
      }
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 font-poppins">
      <div className="max-w-[1070px] w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1
            className={`text-3xl font-bold text-gray-900 mb-2 dark:text-white ${config.font}`}
            dir={config.rtl ? 'rtl' : undefined}
          >
            {config.label}
          </h1>
          <div className="mt-4 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Loading */}
        {loading && (
          <div className={`py-10 text-center text-gray-600 dark:text-gray-300 ${config.font}`}>
            {config.loadingText}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && (!content || !content.text) && (
          <div className={`py-10 text-center text-gray-600 dark:text-gray-300 ${config.font}`}>
            {config.emptyText}
          </div>
        )}

        {/* Content */}
        {!loading && !error && content && content.text && (() => {
          // For non-Malayalam (technical_terms table), matter already contains <h3> title — skip separate title
          // Also skip for Malayalam since the page header already shows the title
          const showSeparateTitle = false;
          const processedTitle = showSeparateTitle ? processImageUrls(content.title) : null;
          let processedText = processImageUrls(content.text);
          // Strip leading <h3>…</h3> from matter for non-Malayalam to avoid title duplication
          if (config.dbCode) {
            processedText = processedText.replace(/^\s*<h3[^>]*>[\s\S]*?<\/h3>\s*/i, '');
          }
          const isUrdu = translationLanguage === 'ur';

          // Urdu Nastaliq needs extra line-height and explicit font-family for innerHTML
          const contentStyle = isUrdu
            ? { lineHeight: 2.6, textAlign: 'right', fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" }
            : { lineHeight: 1.8, textAlign: 'justify' };

          return (
            <div className="bg-white dark:bg-[#1b1d27] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 sm:p-7">
              {processedTitle && (
                <div
                  className={`mb-4 prose prose-lg dark:prose-invert max-w-none ${config.font}`}
                  dir={config.rtl ? 'rtl' : undefined}
                  style={isUrdu ? { fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" } : undefined}
                  dangerouslySetInnerHTML={{ __html: processedTitle }}
                />
              )}
              <div
                className={`sooji prose prose-sm sm:prose-base dark:prose-invert max-w-none leading-relaxed text-gray-800 dark:text-gray-200 ${config.font}`}
                dir={config.rtl ? 'rtl' : undefined}
                dangerouslySetInnerHTML={{ __html: processedText }}
                style={contentStyle}
              />
              <style>{`
                .sooji img.s-img {
                  max-width: 100%;
                  height: auto;
                }
                .sooji table {
                  width: 100%;
                  border-collapse: collapse;
                }
                .sooji td {
                  padding: 8px;
                }
                /* RTL overrides: fix hardcoded align="left" in DB HTML */
                [dir="rtl"] .sooji td[align="left"] {
                  text-align: right !important;
                }
                [dir="rtl"] .sooji h3,
                [dir="rtl"] .sooji p {
                  text-align: right;
                }
                .sooji h3, .sooji p, .sooji td {
                  font-family: inherit;
                }
                .font-urdu-nastaliq .sooji h3,
                .font-urdu-nastaliq .sooji p,
                .font-urdu-nastaliq .sooji td,
                .sooji.font-urdu-nastaliq h3,
                .sooji.font-urdu-nastaliq p,
                .sooji.font-urdu-nastaliq td {
                  font-family: 'Noto Nastaliq Urdu', 'JameelNoori', serif !important;
                  line-height: 2.6;
                }
                .font-hindi .sooji h3,
                .font-hindi .sooji p,
                .font-hindi .sooji td,
                .sooji.font-hindi h3,
                .sooji.font-hindi p,
                .sooji.font-hindi td {
                  font-family: 'NotoSansDevanagari', serif !important;
                }
                .font-bengali .sooji h3,
                .font-bengali .sooji p,
                .font-bengali .sooji td,
                .sooji.font-bengali h3,
                .sooji.font-bengali p,
                .sooji.font-bengali td {
                  font-family: 'Noto Sans Bengali', serif !important;
                }
                .font-tamil .sooji h3,
                .font-tamil .sooji p,
                .font-tamil .sooji td,
                .sooji.font-tamil h3,
                .sooji.font-tamil p,
                .sooji.font-tamil td {
                  font-family: 'Noto Sans Tamil', serif !important;
                }
                .font-malayalam .sooji h3,
                .font-malayalam .sooji p,
                .font-malayalam .sooji td,
                .sooji.font-malayalam h3,
                .sooji.font-malayalam p,
                .sooji.font-malayalam td {
                  font-family: 'Noto Sans Malayalam', sans-serif !important;
                }
              `}</style>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default TechnicalTerms;


