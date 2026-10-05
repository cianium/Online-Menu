import crypto from 'node:crypto';

export const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
export const randomToken = bytes => crypto.randomBytes(bytes).toString('base64url');

/** Constant-time string comparison (length differences still short-circuit safely). */
export function safeEqual(a, b) {
  const left = Buffer.from(String(a ?? ''));
  const right = Buffer.from(String(b ?? ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export const roleRank = Object.freeze({ viewer: 0, editor: 1, manager: 2, owner: 3 });

export function hasRole(role, minimum = 'viewer') {
  return (roleRank[role] ?? -1) >= (roleRank[minimum] ?? 0);
}

/** Parse "TRUST_PROXY": "false" (default) | "true" | number of hops | comma-separated CIDRs. */
export function parseTrustProxy(raw) {
  const value = String(raw ?? 'false').trim().toLowerCase();
  if (value === '' || value === 'false' || value === '0') return false;
  if (value === 'true') return true;
  if (/^\d+$/.test(value)) return Number(value);
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

/** Secure cookies are the default in production; they can only be disabled explicitly. */
export function resolveCookieSecure(env) {
  if (env.COOKIE_SECURE === 'true') return true;
  // "false" is honoured only outside production (plain-HTTP local development).
  return env.NODE_ENV === 'production';
}

/** Refuse unsafe production configuration instead of silently running with it. */
export function assertProductionConfig(env) {
  if (env.NODE_ENV !== 'production') return;
  const problems = [];
  if (!env.DATABASE_URL) problems.push('DATABASE_URL is required.');
  if (env.COOKIE_SECURE === 'false') problems.push('COOKIE_SECURE=false is not allowed in production.');
  if (problems.length) throw new Error(`Unsafe production configuration: ${problems.join(' ')}`);
}

export const LANGUAGES = Object.freeze(['fa', 'en', 'tr', 'ar']);

/**
 * Only http(s) URLs and same-site relative paths are accepted for images.
 * Anything else (data:, javascript:, file:) is rejected so it can never reach a public page.
 */
export function cleanImageUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > 2000) return null;
  // Same-site paths served by this app: bundled assets and uploaded media.
  const local = raw.replace(/^\.\//, '');
  if (/^\/?(?:assets|uploads)\/[\w\-./]+$/i.test(local) && !local.includes('..')) return local;
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) ? raw : null;
  } catch {
    return null;
  }
}

export function slugify(value, fallbackPrefix = 'item') {
  const slug = String(value ?? '').toLowerCase().trim().normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return slug || `${fallbackPrefix}-${crypto.randomBytes(4).toString('hex')}`;
}
