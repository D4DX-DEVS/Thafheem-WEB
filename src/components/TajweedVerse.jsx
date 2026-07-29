/**
 * TajweedVerse.jsx
 * ----------------
 * Renders a single ayah using QCF V4 Tajweed glyph fonts. Each word's `code_v2`
 * glyph is drawn with its page-specific font (`qpc-tajweed-p{v2_page}`) whose
 * colors are baked into the glyph outlines. Words flow inline like normal Arabic
 * text (RTL, wrapping naturally).
 *
 * Tooltip matching uses SEQUENTIAL two-pointer matching:
 *   - wbwPtr moves forward only, so repeated words (e.g. "الله" × 3) each
 *     match their own sequential wbw entry — not always the first.
 *   - Consecutive tajweed words that share a compound wbw entry are grouped
 *     into one hover-highlight box (e.g. "مِن قَبْلُ" → one tooltip).
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fetchTajweedAyah } from '../utils/tajweedBatcher';
import { tajweedFontFamily, whenTajweedFontsReady, TAJWEED_PALETTE_DARK } from '../utils/tajweedFont';
import useWordTooltip from '../hooks/useWordTooltip';
import WordTooltip from './WordTooltip';
import { useTheme } from '../context/ThemeContext';

// ── Normalization ─────────────────────────────────────────────────────────────
const normalize = (text) => {
  if (!text) return '';
  return text
    // 1. Remove Quranic pause / annotation marks
    .replace(/[\u06D6-\u06ED]/g, '')
    // 2. ـ + optional diacritic + ٔ (hamza above) → ا
    //    e.g. سْـَٔلَ (tajweed) = سْأَلَ (wbw). MUST come before removing tatweel (step 3)
    //    so we still have the ـ as context — prevents ؤ / ئ from becoming وا / يا
    .replace(/\u0640[\u064B-\u065F]?\u0654/g, '\u0627')
    // 3. Remove remaining tatweel
    .replace(/\u0640/g, '')
    // 4. Superscript alef ٰ → ا
    .replace(/\u0670/g, '\u0627')
    // 5. Remaining ٔ / ٕ (hamza above/below) → just remove
    .replace(/[\u0654\u0655]/g, '')
    // 6. Strip all diacritics (fatha, kasra, damma, sukun, shadda …)
    .replace(/[\u064B-\u065F]/g, '')
    // 7. Alef variants → ا
    .replace(/[\u0671\u0672\u0673\u0622\u0623\u0625]/g, '\u0627')
    // 8. Ya variants → ي
    .replace(/[\u0649\u064A]/g, '\u064A')
    // 9. He variants → ه
    .replace(/[\u0647\u06C1\u06C2\u06C3]/g, '\u0647')
    // 10. Hamza on waw ؤ → و (keep the carrier)
    .replace(/\u0624/g, '\u0648')
    // 11. Remove hamza on ya ئ (treat as hamza, not ya+hamza)
    .replace(/\u0626/g, '')
    // 12. Remove standalone hamza ء
    .replace(/\u0621/g, '')
    // 13. Collapse consecutive alefs اا → ا
    //     Fixes: ءَأَنذَرْتَهُمْ (tajweed) vs أَأَنذَرْتَهُمْ (wbw)
    //     After steps above: "اانذرتهم" → "انذرتهم"
    .replace(/\u0627{2,}/g, '\u0627')
    .trim();
};

const stripPrefix = (t) => t.replace(/^[وإلأآب]+/, '').trim();

/**
 * Does a single tajweed word_text match a wbw entry?
 * Checks the entry's phrase(s); a compound phrase like "مِن قَبْلُ"
 * matches either of its tokens individually.
 */
const wordMatchesEntry = (wordText, entry) => {
  if (!entry || !wordText) return false;
  const nw = normalize(wordText);
  if (!nw) return false;
  const nwNP = stripPrefix(nw);

  for (const phrase of [entry.WordPhrase, entry.text_uthmani, entry.text_simple]) {
    if (!phrase) continue;
    const np = normalize(phrase);

    // Exact full phrase match
    if (np === nw) return true;

    // Match any space-separated token inside the phrase
    for (const token of np.split(/\s+/).filter(Boolean)) {
      if (token === nw) return true;

      // Prefix-stripped token comparison (allow single chars for short Arabic words like يَا)
      const tNP = stripPrefix(token);
      if (tNP.length >= 1 && nwNP.length >= 1) {
        if (tNP === nw || nwNP === token || tNP === nwNP) return true;
      }
    }

    // Check consecutive token combinations (for combined tajweed words like "يَـٰٓأَيُّهَا")
    const tokens = np.split(/\s+/).filter(Boolean);
    for (let i = 0; i < tokens.length; i++) {
      let combined = tokens[i];

      for (let j = i + 1; j < tokens.length; j++) {
        combined += tokens[j]; // Concatenate without space
        // Normalize the combined result (collapses consecutive alefs)
        const normalizedCombined = normalize(combined);

        if (normalizedCombined === nw) {
          return true;
        }
        // Also check with prefix stripping
        const combinedNP = stripPrefix(normalizedCombined);
        if (combinedNP.length >= 1 && nwNP.length >= 1 && combinedNP === nwNP) {
          return true;
        }
      }
    }
  }

  return false;
};

/**
 * Sequential two-pointer grouping.
 *
 * Processes tajweed words left-to-right while advancing wbwPtr forward only.
 * This correctly handles:
 *   • Repeated words ("الله" × 3) → each maps to its own sequential entry
 *   • Compound wbw entries ("مِن قَبْلُ") → consecutive tajweed words that
 *     match the same entry are merged into one group
 *   • Extra wbw entries with no tajweed match → look-ahead skips them
 *   • Tajweed words with no wbw match → solo group with match: null
 *
 * Returns Array<{ words: TajweedWord[], match: { word, index } | null }>
 */
const LOOK_AHEAD = 5; // max wbw entries to skip when searching forward

const buildGroups = (tajweedWords, wbwWords) => {
  if (!tajweedWords?.length) return [];
  if (!wbwWords?.length) return tajweedWords.map((w) => ({ words: [w], match: null }));

  const groups = [];

  // Find the starting position in wbw array for the first tajweed word
  // (wbw data may include extra entries like basmala that aren't in tajweed rendering)
  let wbwPtr = 0;
  if (tajweedWords.length > 0) {
    const firstWord = tajweedWords[0];
    for (let k = 0; k < Math.min(20, wbwWords.length); k++) {
      if (wordMatchesEntry(firstWord.word_text, wbwWords[k])) {
        wbwPtr = k;
        break;
      }
    }
  }

  let i = 0;

  while (i < tajweedWords.length) {
    const word = tajweedWords[i];

    // Search forward (up to LOOK_AHEAD) for a wbw entry that matches this word
    let foundAt = -1;
    const limit = Math.min(wbwPtr + LOOK_AHEAD, wbwWords.length);
    for (let k = wbwPtr; k < limit; k++) {
      if (wordMatchesEntry(word.word_text, wbwWords[k])) {
        foundAt = k;
        break;
      }
    }

    if (foundAt === -1) {
      // No match in look-ahead window → unmatched, solo group
      groups.push({ words: [word], match: null });
      i++;
      // Leave wbwPtr where it is: the current wbw entry may match the next word
      continue;
    }

    // Move wbwPtr to the found entry
    wbwPtr = foundAt;
    const match = { word: wbwWords[wbwPtr], index: wbwPtr };

    // Collect additional consecutive tajweed words that also match
    // the SAME wbw entry → these form a compound group
    const group = [word];
    let j = i + 1;
    while (j < tajweedWords.length && wordMatchesEntry(tajweedWords[j].word_text, wbwWords[wbwPtr])) {
      group.push(tajweedWords[j]);
      j++;
    }

    groups.push({ words: group, match });
    wbwPtr++; // entry consumed — never revisit it
    i = j;
  }

  return groups;
};

// ── Component ────────────────────────────────────────────────────────────────
const TajweedVerse = React.memo(function TajweedVerse({ suraid, ayaid, fontSize = 26, justify = false, tooltip = false }) {
  const [words, setWords] = useState(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [fetchEnabled, setFetchEnabled] = useState(false);
  const { translationLanguage, theme } = useTheme();

  // Dark mode: the QCF V4 glyphs paint their plain (base) Uthmani letters with
  // the font's BLACK palette indices, so in dark mode they vanish against the
  // dark background. `TAJWEED_PALETTE_DARK` lightens only those black base-ink
  // indices, leaving the tajweed colors and the ayah circle untouched.
  const glyphPalette = theme === 'dark' ? TAJWEED_PALETTE_DARK : undefined;

  // Lazy paint: QCF V4 glyphs are COLR/CPAL color fonts and each glyph builds a
  // GPU color atlas. Painting every verse of a long surah at once can exhaust
  // the renderer's memory and crash the tab (STATUS_BREAKPOINT). We therefore
  // only paint the colored glyphs once the verse scrolls near the viewport;
  // until then a same-size placeholder reserves the line space. Word data and
  // fonts are still fetched eagerly (both are cached), so paint is instant.
  const wrapperRef = useRef(null);
  const [nearViewport, setNearViewport] = useState(false);

  // Debug mode: highlight unmatched words (enable via ?debug-tooltips=true in URL)
  const debugMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug-tooltips') === 'true';

  // Disable tooltip on mobile — reactive to viewport changes (e.g. DevTools resize)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 639px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const effectiveTooltip = tooltip && !isMobile;

  // Observe when this verse approaches the viewport, then paint its glyphs.
  // Once near, we keep it painted (cache makes re-mounts cheap); the one-shot
  // observer disconnects to avoid churn. `rootMargin` pre-paints a screenful
  // ahead so glyphs are ready before the user scrolls to them.
  useEffect(() => {
    if (nearViewport) return;
    const el = wrapperRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setNearViewport(true); return; }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNearViewport(true);
          io.disconnect();
        }
      },
      { root: null, rootMargin: '1200px 0px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [nearViewport, words]);

  useEffect(() => {
    if (!suraid || !ayaid) return;
    let cancelled = false;
    setFontsReady(false);
    fetchTajweedAyah(suraid, ayaid)
      .then((w) => {
        if (cancelled) return;
        // Register the page-specific QCF V4 fonts these words need, then wait for
        // them to finish downloading before showing the verse so the colored
        // glyphs never flash as fallback tofu boxes (□□□).
        const pages = (w || []).map((word) => word.v2_page);
        setWords(w);
        whenTajweedFontsReady(pages).then(() => {
          if (!cancelled) setFontsReady(true);
        });
      })
      .catch(() => { if (!cancelled) setWords([]); });
    return () => { cancelled = true; };
  }, [suraid, ayaid]);

  const { wordData, hoveredWord, hoverPosition, handleWordHover, handleWordLeave } =
    useWordTooltip(
      (effectiveTooltip && fetchEnabled) || debugMode ? suraid : null,
      (effectiveTooltip && fetchEnabled) || debugMode ? ayaid : null,
      (effectiveTooltip && fetchEnabled) || debugMode ? translationLanguage : null,
    );

  // Build groups whenever tajweed words or wbw data changes
  const groups = useMemo(
    () => buildGroups(words, wordData?.words),
    [words, wordData],
  );

  if (!words || words.length === 0) return null;

  // QCF V4 page fonts carry the tajweed colors inside each glyph, so the
  // `code_v2` character is rendered directly with its page-specific font at the
  // surrounding text size — no images, no extra height correction needed.
  const glyphSize = fontSize;

  // Paint the heavy colored glyphs only when near the viewport. `justify` is
  // used only in small practice contexts, so it always paints immediately.
  const paint = justify || nearViewport;

  if (!paint) {
    // Reserve roughly the verse's line space so layout doesn't jump when the
    // glyphs paint. Width is a coarse estimate from the glyph count; the large
    // observer rootMargin means the real glyphs paint before this is on screen.
    const totalGlyphs = words.reduce((n, w) => n + ((w.code_v2 && w.code_v2.length) || 1), 0);
    return (
      <span
        ref={wrapperRef}
        className="tajweed-verse-placeholder"
        aria-hidden="true"
        style={{
          display: 'inline-block',
          verticalAlign: 'baseline',
          width: `${Math.round(totalGlyphs * glyphSize * 0.62)}px`,
          height: `${Math.round(glyphSize * 1.6)}px`,
        }}
      />
    );
  }

  const rendered = groups.map((group, groupIdx) => {
    const hasMeaning = !!group.match?.word?.translation?.text;
    const isUnmatched = !group.match; // No wbw match found

    return (
      <span
        key={groupIdx}
        dir="rtl"
        className={`tajweed-word-group rounded transition-colors duration-150${
          effectiveTooltip && hasMeaning ? ' cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700' : ''
        }`}
        style={{
          // QCF V4 glyphs carry their own inter-word spacing, so each word group
          // is an atomic inline-block box with no extra margins/padding. This keeps
          // the Mushaf line spacing exactly as the font designers intended.
          display: 'inline-block',
          verticalAlign: 'baseline',
          // Fade in once the page fonts are ready so the verse never flashes as
          // fallback tofu boxes (□□□) during load.
          opacity: fontsReady ? 1 : 0,
          transition: 'opacity 0.15s ease-in',
          // Debug mode: highlight unmatched words with red border
          ...(debugMode && isUnmatched ? { outline: '2px solid red', outlineOffset: '2px' } : {}),
        }}
        title={debugMode && isUnmatched ? `UNMATCHED: ${group.words.map(w => w.word_text).join(' ')}` : undefined}
        onMouseEnter={effectiveTooltip ? (e) => {
          if (!fetchEnabled) { setFetchEnabled(true); return; }
          if (hasMeaning) handleWordHover(group.match.index, e);
        } : undefined}
        onMouseLeave={effectiveTooltip ? handleWordLeave : undefined}
      >
        {group.words.map((word) => (
          <span
            key={word.word_pos}
            style={{
              fontFamily: `'${tajweedFontFamily(word.v2_page)}'`,
              fontSize: `${glyphSize}px`,
              lineHeight: 'inherit',
              ...(glyphPalette ? { fontPalette: glyphPalette } : {}),
            }}
          >
            {word.code_v2}
          </span>
        ))}
      </span>
    );
  });

  return (
    <>
      {justify ? (
        rendered
      ) : (
        <span ref={wrapperRef} className="tajweed-verse" dir="rtl" style={{ direction: 'rtl', unicodeBidi: 'embed' }}>
          {rendered}
        </span>
      )}
      {effectiveTooltip && hoveredWord && hoverPosition && (
        <WordTooltip
          word={hoveredWord}
          position={hoverPosition}
          language={wordData?.words?.[0]?.translation?.language_name || translationLanguage}
        />
      )}
    </>
  );
});

export default TajweedVerse;
