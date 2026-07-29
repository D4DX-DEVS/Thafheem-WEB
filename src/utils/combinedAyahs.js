// Static map of combined ayah pairs (Malayalam translation)
// Key: "surahId:ayahId", Value: paired ayah number
const COMBINED_AYAHS = {
  '20:92': 93, '20:93': 92,
  '43:34': 35, '43:35': 34,
  '52:2': 3,   '52:3': 2,
  '74:40': 41, '74:41': 40,
  '74:50': 51, '74:51': 50,
  '77:5': 6,   '77:6': 5,
  '77:25': 26, '77:26': 25,
  '79:37': 38, '79:38': 37,
  '80:8': 9,   '80:9': 8,
};

export const getCombinedPair = (surahId, ayahId) => {
  const key = `${surahId}:${ayahId}`;
  return COMBINED_AYAHS[key] ?? null;
};

export const isFirstInCombinedPair = (surahId, ayahId) => {
  const paired = getCombinedPair(surahId, ayahId);
  return paired != null && paired > ayahId;
};

export const isSecondInCombinedPair = (surahId, ayahId) => {
  const paired = getCombinedPair(surahId, ayahId);
  return paired != null && paired < ayahId;
};
