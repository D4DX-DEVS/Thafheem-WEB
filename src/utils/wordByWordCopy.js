// Helpers for the word-by-word popup: which words it shows, and the clipboard
// payload for its copy button. Both clipboard flavours read in the same order:
// verse reference, the ayah, each word with its meaning, then the translation.
// The clipboard gets an HTML table (Arabic word | meaning) for Docs/Word/email
// and plain text for chat apps.

const LTR_MARK = "\u200E";
const RTL_MARK = "\u{200F}";
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
 *   verseArabic: string, translation: string,
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
  rows,
  arabicFont,
}) => {
  const heading = [surahName, verseLabel].filter(Boolean).join(" - ");

  // Plain text. Chat apps such as WhatsApp Web pick one direction for the whole
  // message from its first strong character, so an English heading pushes every
  // Arabic line to the left. A right-to-left mark at the start of each line keeps
  // the surah name and ayah on the right. Each word is two lines (Arabic, then its
  // meaning) so no line mixes scripts; the meaning is wrapped in left-to-right
  // marks so its punctuation stays in place.
  const textParts = [[heading, surahArabic].filter(Boolean).join("\n")];
  if (verseArabic) textParts.push(verseArabic);
  const rowLines = rows.flatMap((row) => {
    const meaning = row.className ? `${row.meaning} (${row.className})` : row.meaning;
    return [row.arabic, meaning && LTR_MARK + meaning + LTR_MARK].filter(Boolean);
  });
  textParts.push(rowLines.length > 0 ? rowLines.join("\n") : NO_WORD_BREAKDOWN);
  if (translation) textParts.push(`Translation:\n${translation}`);
  const text = textParts
    .join("\n\n")
    .split("\n")
    .map((line) => (line ? RTL_MARK + line : line))
    .join("\n");

  const arabicStyle = `font-family:'${escapeHtml(arabicFont)}','Scheherazade New','Amiri','Traditional Arabic',serif;`;
  const cell = "padding:10px 14px;border:1px solid #e5e7eb;vertical-align:middle;";
  const labelStyle = "margin:16px 0 8px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#0891b2;";

  const htmlRows = rows
    .map(
      (row) =>
        `<tr>` +
        `<td dir="rtl" style="${cell}text-align:right;width:40%;${arabicStyle}font-size:24px;">${escapeHtml(row.arabic)}` +
        (row.simple
          ? `<div style="font-size:13px;color:#6b7280;">${escapeHtml(row.simple)}</div>`
          : "") +
        `</td>` +
        `<td dir="auto" style="${cell}text-align:left;font-size:15px;">${escapeHtml(row.meaning)}` +
        (row.className
          ? `<div style="font-size:11px;color:#6b7280;text-transform:uppercase;">${escapeHtml(row.className)}</div>`
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
  htmlParts.push(
    htmlRows
      ? `<table dir="ltr" style="border-collapse:collapse;width:100%;">${htmlRows}</table>`
      : `<p style="font-style:italic;color:#6b7280;">${escapeHtml(NO_WORD_BREAKDOWN)}</p>`
  );
  if (translation) {
    htmlParts.push(`<p style="${labelStyle}">Translation</p><p dir="auto" style="margin:0 0 16px;">${escapeHtml(translation)}</p>`);
  }
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
