/**
 * TajweedMushafPage.jsx
 * ---------------------
 * Renders a contiguous range of ayahs as a true printed-Mushaf page: glyphs are
 * grouped into the exact Mushaf lines (using each glyph's `line_number`) and
 * every line is rendered as its own row — matching the QCF V4 layout used by
 * quran.com.
 *
 * Each line is justified to fill the reading column width (words distributed
 * edge-to-edge, like a printed Mushaf line); the final line is centered.
 *
 * Two modes:
 *   - tajweed=true  : renders the colored QCF `code_v2` glyphs (page fonts).
 *   - tajweed=false : renders the SAME QCF `code_v2` glyphs but recolored to a
 *                     single ink color via `font-palette`, so the non-tajweed
 *                     view has the identical Mushaf line layout / circle
 *                     alignment as quran.com's normal mode — just monochrome.
 *
 * Ayah click + current-ayah highlight are preserved via each word's `ayah_id`.
 */
import React, { useState, useEffect, useMemo, useLayoutEffect, useRef } from 'react';
import { getTajweedLinesAPI } from '../api/apis';
import {
  tajweedFontFamily,
  whenTajweedFontsReady,
  MONO_PALETTE_LIGHT,
  MONO_PALETTE_DARK,
  TAJWEED_PALETTE_DARK,
} from '../utils/tajweedFont';

const TajweedMushafPage = React.memo(function TajweedMushafPage({
  suraid,
  from,
  to,
  fontSize = 28,
  tajweed = true,
  dark = false,
  currentAyah = null,
  onAyahClick,
}) {
  const [lines, setLines] = useState(null);
  const [fontsReady, setFontsReady] = useState(false);
  // Per-page layout computed after fonts load: `width` is the natural width of
  // the widest Mushaf line (the page's full-line width) and `justify` tells
  // each line whether to fill that width edge-to-edge (full lines) or center
  // (genuinely short lines, e.g. a surah's final line).
  const pageRef = useRef(null);
  const [layout, setLayout] = useState({ width: null, justify: [] });

  useEffect(() => {
    if (!suraid || !from || !to) return;
    let cancelled = false;
    setFontsReady(false);
    setLines(null);

    fetch(getTajweedLinesAPI(suraid, from, to))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (cancelled) return;
        const ls = Array.isArray(data?.lines) ? data.lines : [];
        setLines(ls);
        // Wait for every page font this range needs. Both tajweed and normal
        // modes render the QCF glyphs from these fonts (normal mode just
        // recolors them), so load them in both modes to avoid tofu-box flashes.
        const pages = [];
        for (const line of ls) for (const w of line.words) pages.push(w.v2_page);
        whenTajweedFontsReady(pages).then(() => {
          if (!cancelled) setFontsReady(true);
        });
      })
      .catch(() => { if (!cancelled) setLines([]); });

    return () => { cancelled = true; };
  }, [suraid, from, to, tajweed]);

  const rendered = useMemo(() => {
    if (!lines || lines.length === 0) return null;

    // The QCF v4 fonts are COLR/CPAL color fonts. The plain (base) Uthmani
    // letters are drawn with the BLACK palette indices (0/13/14) — NOT via CSS
    // `color` — so to recolor them we override those palette entries.
    //   - Tajweed light: native palette (colored rules + black base + circle).
    //   - Tajweed dark : TAJWEED_PALETTE_DARK lightens only the black base ink
    //                    so letters are visible on dark; colors + circle stay.
    //   - Normal mode  : MONO palette flattens every color layer to one ink
    //                    (plain Mushaf); the ayah CIRCLE keeps its native
    //                    palette so the verse number stays legible.
    const wordPalette = tajweed
      ? (dark ? TAJWEED_PALETTE_DARK : undefined)
      : (dark ? MONO_PALETTE_DARK : MONO_PALETTE_LIGHT);

    return lines.map((line, lineIdx) => {
      // Full lines stretch their words edge-to-edge (space-between) to fill the
      // page's full-line width — reproducing the justified printed-Mushaf look
      // (quran.com couples the line-box width to the font, so lines fill 100%).
      // Short lines (a surah's final line) stay centered. The justify decision
      // is measured after the fonts load; until then we center to avoid a
      // flash of stretched short lines.
      const justify = layout.justify[lineIdx] || 'center';
      return (
        <div
          key={line.key}
          dir="rtl"
          className="tajweed-mushaf-line"
          style={{
            display: 'flex',
            flexWrap: 'nowrap',
            justifyContent: justify,
            alignItems: 'baseline',
            lineHeight: 1.95,
            opacity: fontsReady ? 1 : 0,
            transition: 'opacity 0.15s ease-in',
          }}
        >
          {line.words.map((w, i) => {
            const isEnd = w.char_type === 'end';
            const isActive = currentAyah != null && w.ayah_id === currentAyah;
            const handleClick = onAyahClick ? () => onAyahClick(w.ayah_id) : undefined;
            // End circle keeps native colors; words get the computed palette.
            const palette = isEnd ? undefined : wordPalette;
            return (
              <span
                key={`${w.ayah_id}-${w.word_pos}-${i}`}
                onClick={handleClick}
                className={isActive ? 'rounded bg-blue-100 dark:bg-blue-900' : ''}
                style={{
                  fontFamily: `'${tajweedFontFamily(w.v2_page)}'`,
                  fontSize: `${fontSize}px`,
                  lineHeight: 'inherit',
                  whiteSpace: 'nowrap',
                  flex: '0 0 auto',
                  cursor: onAyahClick ? 'pointer' : 'default',
                  ...(palette ? { fontPalette: palette } : {}),
                }}
              >
                {w.code_v2}
              </span>
            );
          })}
        </div>
      );
    });
  }, [lines, fontsReady, fontSize, tajweed, dark, currentAyah, onAyahClick, layout.justify]);

  // Mushaf pages 1 & 2 (Al-Fatiha + the start of Al-Baqarah) are the ONLY
  // non-justified pages in the Madani Mushaf: their QCF glyphs are designed
  // extra-wide and the lines are centered, never stretched edge-to-edge. So we
  // never justify a line whose glyphs come from page 1 or 2 — stretching them
  // (space-between) would insert ugly word gaps unlike quran.com.

  // After the fonts load, measure each line's NATURAL width (sum of its word
  // boxes — independent of the current justify) so we can: (1) size the page
  // box to the widest line and (2) classify each line as full vs short. Full
  // lines (>= 62% of the widest) are justified edge-to-edge; shorter lines
  // (surah endings) stay centered — matching the printed Mushaf / quran.com.
  // Lines on Mushaf pages 1 & 2 are always centered (never justified).
  useLayoutEffect(() => {
    const pageEl = pageRef.current;
    if (!pageEl || !fontsReady || !lines || lines.length === 0) return;
    const lineEls = pageEl.querySelectorAll('.tajweed-mushaf-line');
    if (!lineEls.length) return;

    const widths = [];
    const isSpecial = [];
    lineEls.forEach((el, idx) => {
      let w = 0;
      el.childNodes.forEach((c) => {
        if (c.getBoundingClientRect) w += c.getBoundingClientRect().width;
      });
      widths.push(w);
      const firstWord = lines[idx]?.words?.[0];
      isSpecial.push(firstWord?.v2_page === 1 || firstWord?.v2_page === 2);
    });
    const maxW = Math.max(...widths);
    if (!(maxW > 0)) return;
    const threshold = maxW * 0.62;
    const justify = widths.map((w, i) =>
      !isSpecial[i] && w >= threshold ? 'space-between' : 'center'
    );
    const width = Math.ceil(maxW);

    setLayout((prev) => {
      if (
        prev.width === width &&
        prev.justify.length === justify.length &&
        prev.justify.every((v, i) => v === justify[i])
      ) {
        return prev; // no change — avoid a re-render loop
      }
      return { width, justify };
    });
  }, [fontsReady, lines, fontSize, tajweed, dark]);

  if (!lines || lines.length === 0) return null;
  return (
    <div
      ref={pageRef}
      className="tajweed-mushaf-page"
      style={{
        width: layout.width ? `${layout.width}px` : undefined,
        maxWidth: '100%',
        margin: '0 auto',
      }}
    >
      {rendered}
    </div>
  );
});

export default TajweedMushafPage;
