// QCF V4 tajweed rule colors (matches the colors baked into the glyph fonts).
// Hex values mirror quran.com's light-theme tajweed palette so the legend dots
// match what the fonts actually render. Order follows the quran.com legend.
export const TAJWEED_LEGEND = [
  { key: 'silent', label: 'Silent letter', color: '#a5a5a5' },
  { key: 'madd-normal', label: 'Normal madd (2)', color: '#ce9e00' },
  { key: 'madd-separated', label: 'Separated madd (2/4/6)', color: '#ff7b00' },
  { key: 'madd-connected', label: 'Connected madd (4/5)', color: '#f40000' },
  { key: 'madd-necessary', label: 'Necessary madd (6)', color: '#b50000' },
  { key: 'ghunna', label: "Ghunna/ikhfa'", color: '#09b000' },
  { key: 'qalqala', label: 'Qalqala (echo)', color: '#2fadff' },
  { key: 'tafkhim', label: 'Tafkhim (heavy)', color: '#3f48e6' },
];
