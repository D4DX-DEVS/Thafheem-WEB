// ThemeContext.jsx
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { preloadLanguageServices } from "../utils/serviceLoader";

const ThemeContext = createContext();

// Languages that support translation and interpretation audio
const AUDIO_SUPPORTED_LANGUAGES = ['mal', 'ur'];

// Helper: get available audio types for a language
function getAvailableAudioTypes(language) {
  if (AUDIO_SUPPORTED_LANGUAGES.includes(language)) {
    return ['quran', 'translation', 'interpretation'];
  }
  return ['quran'];
}

// Helper: filter audio types to only what's available for a language
function filterAudioTypesForLanguage(audioTypes, language) {
  const available = getAvailableAudioTypes(language);
  const filtered = audioTypes.filter(t => available.includes(t));
  return filtered.length > 0 ? filtered : ['quran'];
}

export function ThemeProvider({ children }) {
  // Initialize state with values from localStorage or defaults
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme || "light";
  });
  
  const [quranFont, setQuranFont] = useState(() => {
    const savedFont = localStorage.getItem("quranFont");
    return savedFont || "ScheherazadeNew-Regular";
  });
  
  const [fontSize, setFontSize] = useState(() => {
    const savedFontSize = localStorage.getItem("fontSize");
    return savedFontSize ? parseInt(savedFontSize) : 26;
  });
  
  const [translationFontSize, setTranslationFontSize] = useState(() => {
    const savedTranslationFontSize = localStorage.getItem("translationFontSize");
    const fontSize = savedTranslationFontSize ? parseInt(savedTranslationFontSize) : 18;
    // Ensure font size is between 12 and 22
    return Math.min(22, Math.max(12, fontSize));
  });

  const [viewType, setViewType] = useState(() => {
    const savedViewType = localStorage.getItem("viewType");
    // Valid view types
    const validViewTypes = ['Ayah Wise', 'Block Wise'];
    // Default to Ayah Wise if no saved value or invalid value
    if (!savedViewType || !validViewTypes.includes(savedViewType)) {
      return "Ayah Wise";
    }
    return savedViewType;
  });

  // Selected translation language for APIs (Malayalam default)
  // Store API code variants: 'mal' for Malayalam, 'E' for English, 'ta' for Tamil, 'bn' for Bangla
  const [tajweedEnabled, setTajweedEnabled] = useState(() => {
    return localStorage.getItem("tajweedEnabled") === "true";
  });

  // Audio types: persistent selection of which audio types to play (quran, translation, interpretation)
  const [audioTypes, setAudioTypesRaw] = useState(() => {
    const saved = localStorage.getItem("selectedAudioTypes");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { /* ignore */ }
    }
    return ['quran'];
  });

  // Playback speed (persistent)
  const [playbackSpeed, setPlaybackSpeedRaw] = useState(() => {
    const saved = localStorage.getItem("playbackSpeed");
    return saved ? parseFloat(saved) : 1.0;
  });

  // Reciter (persistent)
  const [reciter, setReciterRaw] = useState(() => {
    const saved = localStorage.getItem("reciter");
    return saved || "al-afasy";
  });

  // Wrapped setters that persist + dispatch events
  const setAudioTypes = useCallback((newTypes) => {
    const types = Array.isArray(newTypes) && newTypes.length > 0 ? newTypes : ['quran'];
    setAudioTypesRaw(types);
    localStorage.setItem("selectedAudioTypes", JSON.stringify(types));
    window.dispatchEvent(new CustomEvent('audioTypesChange', { detail: { audioTypes: types } }));
  }, []);

  const setPlaybackSpeed = useCallback((speed) => {
    const clamped = Math.max(0.5, Math.min(2.0, speed));
    setPlaybackSpeedRaw(clamped);
    localStorage.setItem("playbackSpeed", clamped.toString());
    window.dispatchEvent(new CustomEvent('playbackSpeedChange', { detail: { playbackSpeed: clamped } }));
  }, []);

  const setReciter = useCallback((newReciter) => {
    setReciterRaw(newReciter);
    localStorage.setItem("reciter", newReciter);
    window.dispatchEvent(new CustomEvent('reciterChange', { detail: { reciter: newReciter } }));
  }, []);

  const [translationLanguage, setTranslationLanguage] = useState(() => {
    const validLanguages = ['mal', 'E', 'ta', 'bn', 'ur', 'hi'];
    // URL param takes priority (for shared links)
    const urlLang = new URLSearchParams(window.location.search).get('lang');
    if (urlLang && validLanguages.includes(urlLang)) {
      localStorage.setItem("translationLanguage", urlLang);
      return urlLang;
    }
    const savedLang = localStorage.getItem("translationLanguage");
    if (!savedLang || !validLanguages.includes(savedLang)) {
      return "mal";
    }
    return savedLang;
  });

  const adjustedTranslationFontSize = useMemo(() => {
    if (translationLanguage === "ur") {
      return Math.min(24, translationFontSize + 2);
    }
    if (translationLanguage === "hi") {
      return Math.max(18, translationFontSize);
    }
    return translationFontSize;
  }, [translationFontSize, translationLanguage]);

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement; // <html>
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    // Save theme to localStorage
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Save font settings to localStorage
  useEffect(() => {
    localStorage.setItem("quranFont", quranFont);
  }, [quranFont]);

  useEffect(() => {
    localStorage.setItem("fontSize", fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    // Ensure font size is between 12 and 22 before saving
    const clampedSize = Math.min(22, Math.max(12, translationFontSize));
    if (clampedSize !== translationFontSize) {
      setTranslationFontSize(clampedSize);
    }
    localStorage.setItem("translationFontSize", clampedSize.toString());
  }, [translationFontSize]);

  useEffect(() => {
    localStorage.setItem("viewType", viewType);
  }, [viewType]);

  useEffect(() => {
    localStorage.setItem("tajweedEnabled", tajweedEnabled.toString());
  }, [tajweedEnabled]);

  useEffect(() => {
    localStorage.setItem("translationLanguage", translationLanguage);
    
    // Sync language to URL so shared links carry the language
    const url = new URL(window.location);
    url.searchParams.set('lang', translationLanguage);
    window.history.replaceState(null, '', url);
    
    // Preload translation services when language changes
    // This ensures services are ready when user navigates to pages that need them
    if (translationLanguage && translationLanguage !== 'mal') {
      preloadLanguageServices(translationLanguage).catch(error => {
        console.warn(`Failed to preload services for ${translationLanguage}:`, error);
      });
    }

    // Auto-filter audio types when language changes (e.g., switching from Malayalam to English removes translation/interpretation)
    setAudioTypesRaw(prev => {
      const filtered = filterAudioTypesForLanguage(prev, translationLanguage);
      if (JSON.stringify(filtered) !== JSON.stringify(prev)) {
        localStorage.setItem("selectedAudioTypes", JSON.stringify(filtered));
        window.dispatchEvent(new CustomEvent('audioTypesChange', { detail: { audioTypes: filtered } }));
        return filtered;
      }
      return prev;
    });
  }, [translationLanguage]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      quranFont, 
      setQuranFont, 
      fontSize, 
      setFontSize, 
      translationFontSize, 
      setTranslationFontSize,
      adjustedTranslationFontSize,
      viewType,
      setViewType,
      translationLanguage,
      setTranslationLanguage,
      tajweedEnabled,
      setTajweedEnabled,
      // Audio settings
      audioTypes,
      setAudioTypes,
      playbackSpeed,
      setPlaybackSpeed,
      reciter,
      setReciter,
      getAvailableAudioTypes,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);