import { hasRole, LANGUAGES } from './security.mjs';
import { httpError } from './http.mjs';

/** Bulk saves must never grant privileges denied by the individual REST routes. */
export function assertSnapshotPermissions(role, input, current, incomingSlugs) {
  if (hasRole(role, 'manager')) return;
  const denied = () => { throw httpError(403, 'Manager access required for settings or deletion.', 'FORBIDDEN'); };
  if (!hasRole(role, 'editor')) denied();
  const settings = input.restaurant || {};
  for (const field of ['name', 'tagline', 'description', 'phone', 'address', 'instagram', 'currency']) {
    if (settings[field] !== undefined && String(settings[field] || '') !== String(current.restaurant[field] || '')) denied();
  }
  for (const language of LANGUAGES.filter(lang => lang !== 'fa')) {
    for (const field of ['name', 'tagline', 'description', 'address']) {
      const next = settings.translations?.[language]?.[field];
      if (typeof next === 'string' && next.trim() && next.trim() !== String(current.restaurant.translations?.[language]?.[field] || '').trim()) denied();
    }
  }
  if (input.mode === 'replace') {
    for (const kind of ['categories', 'products']) {
      const kept = new Set(incomingSlugs[kind]);
      if (current[kind].some(slug => !kept.has(slug))) denied();
    }
  }
}
