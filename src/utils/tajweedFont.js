/**
 * tajweedFont.js
 * --------------
 * Lazily injects @font-face declarations for the QCF V4 Tajweed page fonts.
 *
 * Each Mushaf page (1-604) has its own font file whose glyphs already carry the
 * tajweed colors baked in. A word's `code_v2` glyph only renders correctly with
 * the font of its `v2_page`, so we register one @font-face per page on demand
 * (only the pages actually shown are ever downloaded).
 *
 * Font-family naming:  `qpc-tajweed-p{page}`
 */
import { getTajweedFontUrl } from '../api/apis';

export const tajweedFontFamily = (page) => `qpc-tajweed-p${page}`;

// The QCF v4 fonts (postscript QCF4001_COLOR) are COLR/CPAL color fonts. Their
// base palette (16 entries) is:
//   0:#000000 base ink      1:#a5a5a5 silent    2:#a3a5a5
//   3:#b50000 necessary madd 4:#ff7b00 sep madd 5:#ce9e00 normal madd
//   6:#09b000 ghunna         7:#3f48e6 tafkhim  8:#2fadff qalqala
//   9:#f40000 connected madd 10:#2ca4ab        11:#ff0080 circle ring
//   12:#d8e9d8 circle fill   13:#000000 ink     14:#040000 ink   15:#9fa5a5
// The plain (base) Uthmani letters are drawn with the BLACK indices (0/13/14),
// NOT via CSS `color` — so to recolor them we must override those palette
// entries with `@font-palette-values override-colors`.
const BLACK_INK_INDICES = [0, 13, 14];

// Monochrome palette names used to render the colored QCF WORD glyphs in a
// single flat color (for the non-tajweed "normal" Mushaf view). NOTE: only WORD
// glyphs use these — the decorated ayah-end CIRCLE keeps its native palette
// (otherwise the number collapses into a solid blob).
export const MONO_PALETTE_LIGHT = '--thafheem-mono-light';
export const MONO_PALETTE_DARK = '--thafheem-mono-dark';
// Tajweed dark mode: recolor ONLY the black base-ink indices to light so the
// plain letters are visible on a dark background; tajweed colors + circle stay.
export const TAJWEED_PALETTE_DARK = '--thafheem-tajweed-dark';
const MONO_INK_LIGHT = '#1b1b1b';
const MONO_INK_DARK = '#e9e9e9';

// Override the first 16 palette indices, all mapped to one ink color.
function paletteOverride(color) {
  let parts = '';
  for (let i = 0; i < 16; i++) parts += `${i} ${color}${i < 15 ? ',' : ''}`;
  return parts;
}

// Override only specific palette indices to one color (others keep native).
function paletteOverrideIndices(indices, color) {
  return indices.map((i) => `${i} ${color}`).join(',');
}

const _injected = new Set();
let _styleEl = null;

function getStyleEl() {
  if (_styleEl) return _styleEl;
  _styleEl = document.createElement('style');
  _styleEl.setAttribute('data-tajweed-fonts', '');
  document.head.appendChild(_styleEl);
  return _styleEl;
}

/**
 * Ensure the @font-face for a Mushaf page is registered. Idempotent.
 */
export function ensureTajweedFont(page) {
  if (page == null || _injected.has(page)) return;
  _injected.add(page);

  const family = tajweedFontFamily(page);
  const url = getTajweedFontUrl(page);

  getStyleEl().appendChild(
    document.createTextNode(
      `@font-face{font-family:'${family}';` +
        `src:url('${url}') format('woff2');` +
        // `block` keeps the glyphs invisible (instead of showing fallback tofu
        // boxes □□□) until the page font has downloaded, eliminating the flash.
        `font-display:block;}` +
        // Monochrome palette overrides for the plain (non-tajweed) Mushaf view.
        `@font-palette-values ${MONO_PALETTE_LIGHT}{font-family:'${family}';` +
        `override-colors:${paletteOverride(MONO_INK_LIGHT)};}` +
        `@font-palette-values ${MONO_PALETTE_DARK}{font-family:'${family}';` +
        `override-colors:${paletteOverride(MONO_INK_DARK)};}` +
        // Tajweed dark mode: lighten only the black base-ink indices (0,13,14).
        `@font-palette-values ${TAJWEED_PALETTE_DARK}{font-family:'${family}';` +
        `override-colors:${paletteOverrideIndices(BLACK_INK_INDICES, MONO_INK_DARK)};}`,
    ),
  );
}

/**
 * Ensure fonts for many pages at once.
 */
export function ensureTajweedFonts(pages) {
  if (!pages) return;
  for (const page of pages) ensureTajweedFont(page);
}

/**
 * Resolve once every page font in `pages` has finished loading, so callers can
 * hold rendering until the colored glyphs are ready (no tofu-box flash).
 * Falls back to resolving immediately if the Font Loading API is unavailable.
 */
export function whenTajweedFontsReady(pages) {
  ensureTajweedFonts(pages);
  if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) {
    return Promise.resolve();
  }
  const unique = [...new Set((pages || []).filter((p) => p != null))];
  return Promise.all(
    unique.map((page) =>
      // A sample glyph is required; any PUA char in the page font works.
      document.fonts.load(`32px '${tajweedFontFamily(page)}'`, '\uFB50').catch(() => {}),
    ),
  );
}
