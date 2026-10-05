import crypto from 'node:crypto';
import { LANGUAGES } from './security.mjs';

/**
 * Collapse rows of translations into { fa: {...}, en: {...} } keeping only non-empty fields.
 * rows: [{ language, name, description, badge }]
 */
export function translationsToMap(rows = []) {
  const out = {};
  for (const row of rows) {
    if (!LANGUAGES.includes(row?.language)) continue;
    const entry = {};
    for (const key of ['name', 'description', 'badge']) if (row[key]) entry[key] = String(row[key]);
    if (Object.keys(entry).length) out[row.language] = entry;
  }
  return out;
}

/** Requested language first, then restaurant default, then fa. Never returns null for name. */
export function resolveField(map, key, lang, defaultLang = 'fa') {
  return map?.[lang]?.[key] || map?.[defaultLang]?.[key] || map?.fa?.[key] || '';
}

/**
 * Validate the translations object an admin sends: { en: { name, description, badge }, ... }.
 * Unknown languages are rejected; empty strings are dropped so an empty field never erases content.
 */
export function sanitizeIncomingTranslations(input, limits = { name: 160, description: 2500, badge: 80 }) {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const [lang, fields] of Object.entries(input)) {
    if (!LANGUAGES.includes(lang) || !fields || typeof fields !== 'object') continue;
    const entry = {};
    for (const key of Object.keys(limits)) {
      const value = typeof fields[key] === 'string' ? fields[key].trim() : '';
      if (value) entry[key] = value.slice(0, limits[key]);
    }
    if (Object.keys(entry).length) out[lang] = entry;
  }
  return out;
}

/* ---------- auto-translation planning (pure, unit-tested) ---------- */


export const TRANSLATABLE_KEYS = Object.freeze({
  product: ['name', 'description', 'badge'],
  category: ['name'],
  restaurant: ['name', 'tagline', 'description', 'address']
});

export const normalizeText = value => String(value ?? '').normalize('NFC').trim();

export function normalizeFields(kind, fields = {}) {
  const out = {};
  for (const key of TRANSLATABLE_KEYS[kind]) out[key] = normalizeText(fields[key]);
  return out;
}

/** Stable fingerprint of the text an admin typed (used to tell a real edit from a re-save). */
export function hashFields(kind, fields) {
  const clean = normalizeFields(kind, fields);
  return crypto.createHash('sha256').update(JSON.stringify(TRANSLATABLE_KEYS[kind].map(key => clean[key]))).digest('hex');
}

/**
 * Decide which rows to write after the model translated an entity.
 *  - typed:           what the admin typed, per field
 *  - sourceLanguages: language the model detected for each typed field
 *  - translated:      { fa: {...}, en: {...}, tr: {...}, ar: {...} }
 *  - existing:        [{ language, origin }] rows already stored
 * Rules: the admin's own text is always kept verbatim in its own language; 'manual' rows are never
 * replaced (unless the admin just typed in that language); everything else is replaced.
 */
export function planTranslationRows({ kind, typed, sourceLanguages, translated, existing = [] }) {
  const keys = TRANSLATABLE_KEYS[kind];
  const manual = new Set(existing.filter(row => row.origin === 'manual').map(row => row.language));
  const typedLanguages = new Set(keys.filter(key => typed[key]).map(key => sourceLanguages[key]));
  const rows = [];
  for (const language of LANGUAGES) {
    if (manual.has(language) && !typedLanguages.has(language)) continue;
    const fields = {};
    let hasSource = false;
    for (const key of keys) {
      if (!typed[key]) { fields[key] = ''; continue; }
      if (sourceLanguages[key] === language) { fields[key] = typed[key]; hasSource = true; }
      else fields[key] = translated?.[language]?.[key] || '';
    }
    if (!fields[keys[0]]) continue; // every entity has a required first field (name); skip incomplete rows
    rows.push({ language, fields, origin: hasSource ? 'source' : 'auto' });
  }
  return rows;
}

/**
 * Should the worker translate this entity now?
 *   hash         : hash of the text currently stored as the entity's canonical (fa-row / column) text
 *   sourceHash   : hash recorded the last time a translation run succeeded (null = never)
 *   faOrigin     : origin of the canonical row ('source' = typed by an admin, 'auto' = produced by us)
 *   hasOtherRows : any non-fa translation rows already exist
 * Returns 'skip' (already done / echo of translated text), 'adopt' (curated or legacy content:
 * remember it, never overwrite it) or 'translate'.
 */
export function decideTranslation({ hash, sourceHash = null, faOrigin = 'source', hasOtherRows = false }) {
  if (sourceHash && sourceHash === hash) return 'skip';
  if (faOrigin === 'auto') return 'skip';
  if (!sourceHash && hasOtherRows) return 'adopt';
  return 'translate';
}
