/** Read-only production configuration preflight. Never prints secret values. */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const envFile = process.env.ROMANO_ENV_FILE || path.join(root, 'backend', '.env');
const env = { ...process.env };
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (match && env[match[1]] === undefined) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const errors = [], warnings = [];
const required = (name) => { if (!env[name]?.trim()) errors.push(`${name} is required`); };
if (env.NODE_ENV !== 'production') errors.push('NODE_ENV must be production');
required('DATABASE_URL');
if (env.DATABASE_URL) {
  try {
    const url = new URL(env.DATABASE_URL);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) errors.push('DATABASE_URL must use PostgreSQL');
    if (!url.password || /change.me|password|example|test123/i.test(decodeURIComponent(url.password))) errors.push('DATABASE_URL needs a non-placeholder password');
  } catch { errors.push('DATABASE_URL must be a valid PostgreSQL URL'); }
}
if (env.COOKIE_SECURE === 'false') errors.push('COOKIE_SECURE must not be false in production');
if (env.TRUST_PROXY && !['false','true'].includes(env.TRUST_PROXY) && !/^\d+$/.test(env.TRUST_PROXY)) errors.push('TRUST_PROXY must be false, true or a numeric proxy count');
if (!env.UPLOAD_DIR) warnings.push('UPLOAD_DIR not set: confirm persistent upload storage');
if (!fs.existsSync(path.join(root, 'backend', 'node_modules'))) warnings.push('Backend dependencies not installed in this checkout');
if (!fs.existsSync(path.join(root, 'backend', 'package-lock.json'))) warnings.push('Backend lockfile missing: reproducible installation not assured');
console.log('ROMANO production preflight (read-only; no secrets shown)');
for (const item of errors) console.log(`FAIL: ${item}`);
for (const item of warnings) console.log(`WARN: ${item}`);
console.log(`Result: ${errors.length} failure(s), ${warnings.length} warning(s)`);
if (errors.length) process.exitCode = 1;
