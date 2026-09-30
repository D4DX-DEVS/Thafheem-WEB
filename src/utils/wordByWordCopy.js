// Helpers for the word-by-word popup: which words it shows, and the clipboard
// payload for its copy button. The clipboard gets two flavours of the same
// content: an HTML table that keeps the on-screen layout (meaning on the left,
// Arabic on the right) for Docs/Word/email, and plain text for chat apps.

const VERSE_NUMBER_TOKEN = /^[\s()٠-٩۰-۹﴾﴿0-9]+$/;

export const NO_WORD_TRANSLATION = "Translation not available";
export const NO_WORD_BREAKDOWN = "Word-by-word breakdown not available for this verse.";

/** Tokens that are only a verse number (e.g. ﴿١﴾, (١), (1)) with no translation. */
export const isVerseNumberToken = (word) => {
  const arabicText = word.text_uthmani || word.text_simple || "";
  const hasTranslation = !!(word.translation && word.translation.text);
  return !!arabicText && VERSE_NUMBER_TOKEN.test(arabicText) && !hasTranslation;
};

const thafheemPhrase = (word) =>
  word.WordPhrase || word.text_uthmani || word.text_simple || "";

/** Deduplicate Thafheem words on WordPhrase so the same word is not shown twice. */
export const dedupeThafheemWords = (thafheemWords) =>
  thafheemWords.reduce((acc, word, index) => {
    const wordPhrase = thafheemPhrase(word);
    if (!acc.some((existing) => thafheemPhrase(existing) === wordPhrase)) {
      acc.push({ ...word, originalIndex: index });
    }
    return acc;
  }, []);

/**
 * The word rows the popup renders, normalised to { arabic, simple, meaning, className }.
 * Mirrors the JSX: API words first, Thafheem words as the Malayalam fallback.
 */
export const getBreakdownRows = ({ wordData, thafheemWords, translationLanguage }) => {
  if (wordData?.words?.length > 0) {
    return wordData.words
      .filter((word) => !isVerseNumberToken(word))
      .map((word) => ({
        arabic: word.text_uthmani || word.text_simple || "N/A",
        simple:
          word.text_simple && word.text_uthmani !== word.text_simple
            ? word.text_simple
            : "",
        meaning: word.translation?.text || NO_WORD_TRANSLATION,
        className: word.class_name || "",
      }));
  }

  if (translationLanguage === "mal" && thafheemWords?.length > 0) {
    return dedupeThafheemWords(thafheemWords).map((word) => ({
      arabic: thafheemPhrase(word),
      simple: "",
      meaning: word.Meaning || word.translation?.text || "",
      className: "",
    }));
  }

  return [];
};

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]
  );

/**
 * @param {{
 *   surahName: string, surahArabic: string, verseLabel: string,
 *   verseArabic: string, translation: string, breakdownTitle: string,
 *   rows: Array<{ arabic: string, simple: string, meaning: string, className: string }>,
 *   arabicFont: string,
 * }} content
 * @returns {{ text: string, html: string }}
 */
export const buildWordByWordClipboard = ({
  surahName,
  surahArabic,
  verseLabel,
  verseArabic,
  translation,
  breakdownTitle,
  rows,
  arabicFont,
}) => {
  const heading = [surahName, verseLabel].filter(Boolean).join(" - ");

  // Plain text: meaning first so the line stays left-to-right and the Arabic
  // lands on the right, as in the popup.
  const textParts = [[heading, surahArabic].filter(Boolean).join("\n")];
  if (verseArabic) textParts.push(verseArabic);
  if (translation) textParts.push(`Translation:\n${translation}`);
  const rowLines = rows.map((row) =>
    [row.className ? `${row.meaning} (${row.className})` : row.meaning, row.arabic]
      .filter(Boolean)
      .join("  —  ")
  );
  const breakdownBody = rowLines.length > 0 ? rowLines.join("\n") : NO_WORD_BREAKDOWN;
  textParts.push(breakdownTitle ? `${breakdownTitle}:\n${breakdownBody}` : breakdownBody);
  const text = textParts.join("\n\n");

  const arabicStyle = `font-family:'${escapeHtml(arabicFont)}','Scheherazade New','Amiri','Traditional Arabic',serif;`;
  const cell = "padding:10px 14px;border:1px solid #e5e7eb;vertical-align:middle;";
  const labelStyle = "margin:16px 0 8px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#0891b2;";

  const htmlRows = rows
    .map(
      (row) =>
        `<tr>` +
        `<td dir="auto" style="${cell}text-align:left;width:60%;font-size:15px;">${escapeHtml(row.meaning)}` +
        (row.className
          ? `<div style="font-size:11px;color:#6b7280;text-transform:uppercase;">${escapeHtml(row.className)}</div>`
          : "") +
        `</td>` +
        `<td dir="rtl" style="${cell}text-align:right;${arabicStyle}font-size:24px;">${escapeHtml(row.arabic)}` +
        (row.simple
          ? `<div style="font-size:13px;color:#6b7280;">${escapeHtml(row.simple)}</div>`
          : "") +
        `</td>` +
        `</tr>`
    )
    .join("");

  const htmlParts = [
    `<p style="margin:0 0 4px;font-weight:600;">${escapeHtml(heading)}</p>`,
  ];
  if (surahArabic) {
    htmlParts.push(`<p dir="rtl" style="margin:0 0 12px;${arabicStyle}font-size:20px;">${escapeHtml(surahArabic)}</p>`);
  }
  if (verseArabic) {
    htmlParts.push(`<p dir="rtl" style="margin:0 0 16px;text-align:right;${arabicStyle}font-size:28px;line-height:2;">${escapeHtml(verseArabic)}</p>`);
  }
  if (translation) {
    htmlParts.push(`<p style="${labelStyle}">Translation</p><p dir="auto" style="margin:0 0 16px;">${escapeHtml(translation)}</p>`);
  }
  if (breakdownTitle) {
    htmlParts.push(`<p style="${labelStyle}">${escapeHtml(breakdownTitle)}</p>`);
  }
  htmlParts.push(
    htmlRows
      ? `<table dir="ltr" style="border-collapse:collapse;width:100%;">${htmlRows}</table>`
      : `<p style="font-style:italic;color:#6b7280;">${escapeHtml(NO_WORD_BREAKDOWN)}</p>`
  );
  const html = `<div dir="ltr">${htmlParts.join("")}</div>`;

  return { text, html };
};

/** Writes both flavours when the browser allows it, otherwise plain text. */
export const writeWordByWordClipboard = async ({ text, html }) => {
  if (navigator.clipboard?.write && typeof window.ClipboardItem === "function") {
    try {
      await navigator.clipboard.write([
        new window.ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
      return;
    } catch {
      // Rich clipboard refused (permissions / unsupported type); plain text still works.
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);
  if (!copied) throw new Error("Copy command was rejected");
};
