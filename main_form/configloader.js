// configloader.js
// Tiny one-call loader for event config

// Adjust TTL as you like (ms). 6 hours by default.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function cacheKey(eventShortRef) {
  return `raceApp:cfg:${eventShortRef}`;
}

function readCache(eventShortRef) {
  try {
    const raw = localStorage.getItem(cacheKey(eventShortRef));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(eventShortRef, payload) {
  const record = {
    event_short_ref: eventShortRef,
    config_version: payload?.event?.config_version ?? 0,
    ts: Date.now(),
    payload
  };
  try {
    localStorage.setItem(cacheKey(eventShortRef), JSON.stringify(record));
  } catch { /* ignore quota errors */ }
}

function isCacheFresh(rec, maxAgeMs = CACHE_TTL_MS) {
  if (!rec || !rec.ts || !rec.config_version || !rec.payload?.event) return false;
  const ageOk = (Date.now() - rec.ts) <= maxAgeMs;
  const shapeOk = Array.isArray(rec.payload.divisions)
               && Array.isArray(rec.payload.packages)
               && Array.isArray(rec.payload.raceDay)
               && Array.isArray(rec.payload.practiceItems)
               && Array.isArray(rec.payload.timeslots)
               && Array.isArray(rec.payload.uiTexts);
  return ageOk && shapeOk;
}

function validatePayload(p) {
  if (!p || typeof p !== 'object') throw new Error('Invalid payload');
  const requiredTop = ['event','divisions','packages','raceDay','practiceItems','timeslots','uiTexts'];
  for (const k of requiredTop) if (!(k in p)) throw new Error(`Missing key: ${k}`);
  if (!p.event || !p.event.event_short_ref) throw new Error('Missing event');
  return true;
}

/**
 * Load config for an event (one RPC call).
 * @param {object} opts
 * @param {string} opts.eventShortRef - e.g., "TN2025"
 * @param {boolean} [opts.useCache=true] - use cached payload if fresh
 * @param {object} opts.supabase - a Supabase JS client instance
 * @param {number} [opts.maxAgeMs=CACHE_TTL_MS] - optional override for TTL
 */
export async function loadEventConfig({ eventShortRef, useCache = true, supabase, maxAgeMs = CACHE_TTL_MS }) {
  if (!eventShortRef) throw new Error('eventShortRef is required');
  if (!supabase) throw new Error('supabase client is required');

  // 1–2) Try cache first
  if (useCache) {
    const rec = readCache(eventShortRef);
    if (isCacheFresh(rec, maxAgeMs)) {
      window.__CONFIG = rec.payload;
      return rec.payload;
    }
  }

  // 3) Call single RPC
  const { data, error } = await supabase.rpc('rpc_load_event_config', { p_event_short_ref: eventShortRef });
  if (error) throw error;

  // 4) Validate shape (ensure event exists)
  validatePayload(data);

  // Optional: if we had a cache and versions match, we could keep it. Here we always update.
  // 5) Assign to global
  window.__CONFIG = data;

  // 6) Persist to localStorage
  writeCache(eventShortRef, data);

  return data;
}

// Small helper to force refresh (ignores cache)
export async function refreshEventConfig({ eventShortRef, supabase, maxAgeMs = CACHE_TTL_MS }) {
  return loadEventConfig({ eventShortRef, supabase, useCache: false, maxAgeMs });
}
