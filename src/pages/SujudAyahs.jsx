import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LibraryBig } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { fetchSujudAyahs } from "../api/apifunction";

const LANGUAGE_TO_API = {
  E: "english",
  mal: "malayalam",
  ur: "urdu",
  ta: "tamil",
  hi: "hindi",
  bn: "bangla",
};

const LANGUAGE_TITLES = {
  E: "Prostration Verses",
  hi: "सजदा वाली आयतें",
  ur: "سجدہ والی آیات",
  ta: "ஸஜ்தாவுடைய வசனங்கள்",
  mal: "സുജൂദിന്റെ ആയത്തുകൾ",
  bn: "সিজদাহর আয়াতসমূহ",
};

const PAGE_FONT_CLASS = {
  E: "font-poppins",
  hi: "font-hindi",
  ur: "font-urdu-nastaliq",
  ta: "font-tamil",
  mal: "font-malayalam",
  bn: "font-bengali",
};

const LANGUAGE_FONT_FAMILY = {
  E: "'Poppins', sans-serif",
  hi: "'NotoSansDevanagari', serif",
  ur: "'Noto Nastaliq Urdu', 'JameelNoori', serif",
  ta: "'Noto Sans Tamil', serif",
  mal: "'Noto Sans Malayalam', sans-serif",
  bn: "'Noto Sans Bengali', serif",
};

const parseSujudAyahText = (text = "") => {
  const compact = text.replace(/\s+/g, " ").trim();
  const hasSujudMark = compact.includes("۩");
  const withoutMarks = compact.replace(/۩/g, "").trim();
  return {
    text: withoutMarks,
    hasSujudMark,
  };
};

const SujudAyahs = () => {
  const { translationLanguage, setViewType } = useTheme();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const title = LANGUAGE_TITLES[translationLanguage] || LANGUAGE_TITLES.E;
  const pageFontClass = PAGE_FONT_CLASS[translationLanguage] || "font-poppins";
  const isUrdu = translationLanguage === "ur";
  const languageFontStyle = {
    fontFamily: LANGUAGE_FONT_FAMILY[translationLanguage] || "'Poppins', sans-serif",
  };

  const apiLanguage = useMemo(() => {
    return LANGUAGE_TO_API[translationLanguage] || "english";
  }, [translationLanguage]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetchSujudAyahs(apiLanguage);
        if (!mounted) return;
        setItems(Array.isArray(response) ? response : []);
      } catch (err) {
        if (!mounted) return;
        setError("Failed to load sujud ayahs. Please try again.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [apiLanguage]);

  const handleOpenAyah = (item) => {
    const surahId = parseInt(item?.suraNo, 10);
    const verseId = parseInt(item?.ayaNo, 10);

    if (!surahId || !verseId) {
      return;
    }

    setViewType("Ayah Wise");

    sessionStorage.setItem("scrollToVerse", verseId.toString());
    sessionStorage.setItem(
      "navigationState",
      JSON.stringify({
        viewType: "Ayah Wise",
        highlightVerse: `${surahId}:${verseId}`,
        scrollToVerse: verseId,
      })
    );

    navigate(`/surah/${surahId}#verse-${verseId}`, {
      state: {
        viewType: "Ayah Wise",
        highlightVerse: `${surahId}:${verseId}`,
        scrollToVerse: verseId,
      },
    });
  };

  return (
    <div
      className={`min-h-screen bg-gray-50 dark:bg-[#121214] ${pageFontClass}`}
      dir={isUrdu ? "rtl" : "ltr"}
      style={languageFontStyle}
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1C1C1E] sm:p-6">
          <div className={`flex items-center gap-3 ${isUrdu ? "flex-row-reverse justify-end" : ""}`}>
            <div className="rounded-xl bg-cyan-100 p-2.5 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200">
              <LibraryBig className="h-5 w-5" />
            </div>
            <div>
              <h1
                className={`text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl ${isUrdu ? "text-right" : "text-left"}`}
                style={languageFontStyle}
              >
                {title}
              </h1>
              
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-gray-600 shadow-sm dark:bg-[#1C1C1E] dark:text-gray-300">
            Loading...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const ayahDisplay = parseSujudAyahText(item.Ayath);

              return (
                <button
                  key={`${item.ID}-${item.suraNo}-${item.ayaNo}`}
                  onClick={() => handleOpenAyah(item)}
                  className={`w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-cyan-300 hover:shadow dark:border-gray-700 dark:bg-[#1C1C1E] dark:hover:border-cyan-700 ${isUrdu ? "text-right" : "text-left"}`}
                >
                  <div className={`flex items-start justify-between gap-3 ${isUrdu ? "flex-row-reverse" : ""}`}>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400" style={languageFontStyle}>
                        {`Surah ${item.suraNo} • Ayah ${item.ayaNo}`}
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white" style={languageFontStyle}>
                        {item.suraName}
                      </h2>
                      <p
                        className="mt-2 line-clamp-3 text-2xl leading-[2.2] text-gray-700 dark:text-gray-300 font-arabic"
                        style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
                        dir="rtl"
                      >
                        {ayahDisplay.text}
                        {ayahDisplay.hasSujudMark && (
                          <span
                            className="inline-block align-baseline"
                            style={{
                              fontFamily: "'Segoe UI Symbol', 'Noto Sans Arabic', 'Arial Unicode MS', sans-serif",
                              marginInlineStart: "0.5rem",
                              transform: "translateY(1px)",
                            }}
                          >
                            ۩
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200">
                      Open
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SujudAyahs;
