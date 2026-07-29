/**
 * Thafheem route -> canonical screen-name taxonomy for analytics.
 *
 * The analytics dashboard groups by `customDimensions.screenName`, so every
 * page route MUST map to one canonical `screenName`. Adding a new page =
 * adding a row here. The dashboard reads whatever values appear — there is
 * no analatycs-side code change for new screens.
 *
 * Each entry: { pattern: RegExp, screenName, screenGroup }
 */
export const ROUTE_TO_SCREEN = [
  // ---- browse ----
  { pattern: /^\/?$/,                                    screenName: 'home',                  screenGroup: 'browse' },
  { pattern: /^\/juz(\/|$)/,                             screenName: 'juz',                   screenGroup: 'browse' },
  { pattern: /^\/surahinfo\//,                           screenName: 'surah_info',            screenGroup: 'browse' },
  { pattern: /^\/sujud-ayahs/,                           screenName: 'surah_info',            screenGroup: 'browse' },
  { pattern: /^\/tablecontents/,                         screenName: 'table_of_contents',     screenGroup: 'browse' },

  // ---- mushaf (Quran reading views) ----
  { pattern: /^\/surah\//,                               screenName: 'surah_reading',         screenGroup: 'mushaf' },
  { pattern: /^\/reading/,                               screenName: 'surah_reading',         screenGroup: 'mushaf' },
  { pattern: /^\/blockwise\//,                           screenName: 'blockwise',             screenGroup: 'mushaf' },
  { pattern: /^\/interpretation-blockwise/,              screenName: 'blockwise',             screenGroup: 'mushaf' },
  { pattern: /^\/word-by-word\//,                        screenName: 'word_by_word',          screenGroup: 'mushaf' },
  { pattern: /^\/tajweed/,                               screenName: 'tajweed',               screenGroup: 'mushaf' },

  // ---- study ----
  { pattern: /^\/quranstudy/,                            screenName: 'quran_study',           screenGroup: 'study' },
  { pattern: /^\/quiz/,                                  screenName: 'quiz',                  screenGroup: 'study' },

  // ---- bookmarks ----
  { pattern: /^\/bookmarkblock/,                         screenName: 'bookmarks_block',       screenGroup: 'bookmarks' },
  { pattern: /^\/bookmarkedverses/,                      screenName: 'bookmarks_ayah',        screenGroup: 'bookmarks' },
  { pattern: /^\/bookinterpretations/,                   screenName: 'bookmarks_interpretation', screenGroup: 'bookmarks' },
  { pattern: /^\/favoritesurahs/,                        screenName: 'favorite_surahs',       screenGroup: 'bookmarks' },
  { pattern: /^\/note\//,                                screenName: 'notes',                 screenGroup: 'bookmarks' },

  // ---- translation articles ----
  { pattern: /^\/malayalaminterpretations/,              screenName: 'malayalam_interpreter', screenGroup: 'translation_articles' },
  { pattern: /^\/englishtranslate/,                      screenName: 'english_translate',     screenGroup: 'translation_articles' },
  { pattern: /^\/maududi/,                               screenName: 'maududi',               screenGroup: 'translation_articles' },
  { pattern: /^\/tamil\/sayyid-maududi/,                 screenName: 'maududi',               screenGroup: 'translation_articles' },
  { pattern: /^\/history-of-translation/,                screenName: 'history_of_translation',screenGroup: 'translation_articles' },
  { pattern: /^\/translators/,                           screenName: 'history_of_translation',screenGroup: 'translation_articles' },
  { pattern: /^\/technical-terms/,                       screenName: 'history_of_translation',screenGroup: 'translation_articles' },
  { pattern: /^\/digitisation/,                          screenName: 'history_of_translation',screenGroup: 'translation_articles' },

  // ---- book ----
  { pattern: /^\/authorpreface/,                         screenName: 'author_preface',        screenGroup: 'book' },
  { pattern: /^\/tamil\/author-preface/,                 screenName: 'author_preface',        screenGroup: 'book' },
  { pattern: /^\/authorconclusion/,                      screenName: 'author_conclusion',     screenGroup: 'book' },
  { pattern: /^\/tamil\/author-conclusion/,              screenName: 'author_conclusion',     screenGroup: 'book' },
  { pattern: /^\/conclusion/,                            screenName: 'author_conclusion',     screenGroup: 'book' },
  { pattern: /^\/appendix\//,                            screenName: 'author_conclusion',     screenGroup: 'book' },
  { pattern: /^\/introduction-to-quran/,                 screenName: 'introduction_to_quran', screenGroup: 'book' },

  // ---- articles by language ----
  { pattern: /\/finality-of-prophethood$/,               screenName: 'finality_of_prophethood', screenGroup: 'articles_by_lang' },
  { pattern: /\/end$/,                                   screenName: 'finality_of_prophethood', screenGroup: 'articles_by_lang' },
  { pattern: /\/jesus-mohammed$/,                        screenName: 'jesus_mohammed',         screenGroup: 'articles_by_lang' },

  // ---- account ----
  { pattern: /^\/settings/,                              screenName: 'settings',              screenGroup: 'account' },
  { pattern: /^\/sign/,                                  screenName: 'sign_in',               screenGroup: 'account' },
  { pattern: /^\/logout/,                                screenName: 'sign_in',               screenGroup: 'account' },
  { pattern: /^\/deleteaccount/,                         screenName: 'delete_account',        screenGroup: 'account' },

  // ---- support / info / legal ----
  { pattern: /^\/feedback/,                              screenName: 'feedback',              screenGroup: 'support' },
  { pattern: /^\/contact/,                               screenName: 'feedback',              screenGroup: 'support' },
  { pattern: /^\/about/,                                 screenName: 'about',                 screenGroup: 'info' },
  { pattern: /^\/whatsnew/,                              screenName: 'about',                 screenGroup: 'info' },
  { pattern: /^\/user-guide/,                            screenName: 'user_guide',            screenGroup: 'info' },
  { pattern: /^\/privacy/,                               screenName: 'privacy',               screenGroup: 'legal' },
];

/**
 * Resolve a pathname to a canonical screen name + group.
 * @param {string} pathname
 * @returns {{ screenName: string, screenGroup: string }}
 */
export function resolveScreen(pathname) {
  const found = ROUTE_TO_SCREEN.find((row) => row.pattern.test(pathname));
  if (found) return { screenName: found.screenName, screenGroup: found.screenGroup };
  return { screenName: 'other', screenGroup: 'other' };
}

/**
 * Suggested default dimension values to seed the analatycs dashboard when
 * declaring Thafheem's dimensions. (Dashboard still lets you add/remove.)
 */
export const THAFHEEM_DIMENSION_SEED = [
  { key: 'screenName',  label: 'Screen',         type: 'enum',   role: 'screen',
    values: Array.from(new Set(ROUTE_TO_SCREEN.map((r) => r.screenName))).sort() },
  { key: 'screenGroup', label: 'Screen Group',   type: 'enum',   role: 'none',
    values: Array.from(new Set(ROUTE_TO_SCREEN.map((r) => r.screenGroup))).sort() },
  { key: 'mode',        label: 'Mushaf Mode',    type: 'enum',   role: 'feature',
    values: ['ayah_wise', 'block_wise'] },
  { key: 'language',    label: 'Language',       type: 'enum',   role: 'language',
    values: ['mal', 'en', 'ur', 'hi', 'bn', 'ta'] },
  { key: 'audioType',   label: 'Audio Type',     type: 'enum',   role: 'audio',
    values: ['qirath', 'translation', 'interpretation'] },
  { key: 'suraNumber',  label: 'Surah Number',   type: 'number', role: 'none',  values: [] },
  { key: 'ayahNumber',  label: 'Ayah Number',    type: 'number', role: 'none',  values: [] },
  { key: 'scope',       label: 'Scope',          type: 'enum',   role: 'none',  values: ['ayah', 'block'] },
  { key: 'popupType',   label: 'Popup Type',     type: 'enum',   role: 'feature',
    values: ['interpretation', 'footnote', 'translation'] },
  { key: 'menuTarget',  label: 'Menu Target',    type: 'string', role: 'feature', values: [] },
];
