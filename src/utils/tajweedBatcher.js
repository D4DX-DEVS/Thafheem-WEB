/**
 * tajweedBatcher.js
 * -----------------
 * Batches per-ayah tajweed requests that arrive within the same render cycle
 * (50 ms window) into a SINGLE range API call.
 *
 * Example: 20 TajweedVerse components mount in the same render
 *   → 20 calls to fetchTajweedAyah(2, 1..20)
 *   → debounce fires after 50 ms
 *   → ONE request: GET /api/tajweed/2?from=1&to=20
 *   → all 20 promises resolve
 *   → results cached so re-renders hit cache instantly
 *
 * Max range per batch is 50 ayahs (backend limit).
 * If more than 50 ayahs are queued they are split automatically.
 */

import { getTajweedWordsAPI } from '../api/apis';

// Persistent session cache: "suraid:ayaid" → words[]
const _cache = new Map();

// Pending queue per surah: suraid → Map(ayaid → { resolve, reject }[])
const _pending = new Map();

// Debounce timers per surah
const _timers = new Map();

const BATCH_WINDOW_MS = 50;
const MAX_RANGE = 50; // must match backend limit

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Request tajweed words for one ayah.
 * Returns a promise that resolves to words[] (may be empty if not found).
 */
export function fetchTajweedAyah(suraid, ayaid) {
  const key = `${suraid}:${ayaid}`;

  // Cache hit — return synchronously wrapped in a resolved promise
  if (_cache.has(key)) {
    return Promise.resolve(_cache.get(key));
  }

  return new Promise((resolve, reject) => {
    if (!_pending.has(suraid)) _pending.set(suraid, new Map());
    const queue = _pending.get(suraid);

    if (!queue.has(ayaid)) queue.set(ayaid, []);
    queue.get(ayaid).push({ resolve, reject });

    // Reset the debounce timer for this surah
    if (_timers.has(suraid)) clearTimeout(_timers.get(suraid));
    _timers.set(suraid, setTimeout(() => _flush(suraid), BATCH_WINDOW_MS));
  });
}

// ── Internal ─────────────────────────────────────────────────────────────────

async function _flush(suraid) {
  _timers.delete(suraid);

  const queue = _pending.get(suraid);
  if (!queue || queue.size === 0) return;
  _pending.delete(suraid);

  // Sort ayah ids and split into ≤50-ayah chunks
  const ayaids = Array.from(queue.keys()).sort((a, b) => a - b);
  const chunks = _chunkRange(ayaids, MAX_RANGE);

  await Promise.all(chunks.map(chunk => _fetchChunk(suraid, chunk, queue)));
}

async function _fetchChunk(suraid, ayaids, queue) {
  const from = ayaids[0];
  const to   = ayaids[ayaids.length - 1];

  try {
    const url = getTajweedWordsAPI(suraid, null, from, to);
    const res = await fetch(url);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const ayahsMap = data.ayahs || {};

    // Populate cache and resolve each waiting promise
    for (const ayaid of ayaids) {
      const words = ayahsMap[ayaid] || [];
      const key = `${suraid}:${ayaid}`;
      _cache.set(key, words);

      const waiters = queue.get(ayaid) || [];
      for (const { resolve } of waiters) resolve(words);
    }
  } catch (err) {
    // On error: resolve with empty array so UI gracefully falls back
    for (const ayaid of ayaids) {
      const waiters = queue.get(ayaid) || [];
      for (const { resolve } of waiters) resolve([]);
    }
  }
}

function _chunkRange(sortedIds, maxSize) {
  const chunks = [];
  for (let i = 0; i < sortedIds.length; i += maxSize) {
    chunks.push(sortedIds.slice(i, i + maxSize));
  }
  return chunks;
}
