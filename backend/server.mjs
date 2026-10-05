import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import argon2 from 'argon2';
import pg from 'pg';
import { z } from 'zod';
import { httpError } from './lib/http.mjs';
import {
  LANGUAGES, assertProductionConfig, cleanImageUrl, hasRole, parseTrustProxy,
  randomToken, resolveCookieSecure, safeEqual, sha256, slugify
} from './lib/security.mjs';
import { parseImageDataUrl, randomImageName } from './lib/media.mjs';
import { resolveField, sanitizeIncomingTranslations, translationsToMap, hashFields } from './lib/translations.mjs';
import { createTranslator } from './lib/translator.mjs';
import { createAutoTranslation } from './lib/auto-translate.mjs';

assertProductionConfig(process.env);

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(root, 'uploads'));
const PORT = Number(process.env.PORT || 3000);
const SESSION_TTL = Number(process.env.SESSION_TTL_SECONDS || 604800);
const MAX_SESSIONS_PER_USER = 5;
const COOKIE_SECURE = resolveCookieSecure(process.env);
const SESSION_COOKIE = 'romano_session';
const CSRF_COOKIE = 'romano_csrf';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const app = Fastify({
  logger: { redact: ['req.headers.cookie', 'req.headers.authorization', 'req.headers["x-csrf-token"]'] },
  // Only trust X-Forwarded-* when the operator says a proxy is really in front (TRUST_PROXY=1 etc.).
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  requestIdHeader: 'x-request-id',
  bodyLimit: 1_048_576
});
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

const ok = (data, requestId) => ({ data, error: null, requestId });
const fail = (code, message, requestId) => ({ data: null, error: { code, message }, requestId });
const cookieBase = { httpOnly: true, sameSite: 'lax', secure: COOKIE_SECURE, path: '/' };
const csrfCookieBase = { httpOnly: false, sameSite: 'lax', secure: COOKIE_SECURE, path: '/' };

const db = (sql, params = []) => pool.query(sql, params);

async function inTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// Used to keep login timing similar whether or not the e-mail exists.
const DUMMY_HASH = await argon2.hash('romano-timing-equalizer', { type: argon2.argon2id });

/* ---------- automatic translation (background; never blocks or fails a save) ---------- */

const translator = process.env.AUTO_TRANSLATE === 'false'
  ? { enabled: false }
  : createTranslator({ apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.TRANSLATION_MODEL || 'claude-sonnet-5-5' });
const MAX_TRANSLATIONS_PER_REQUEST = Number(process.env.MAX_TRANSLATIONS_PER_REQUEST || 100);

const translationStores = {
  product: {
    async load(id) {
      const head = (await db('select source_hash from products where id = $1', [id])).rows[0];
      if (!head) return null;
      const rows = (await db('select language_code, name, description, badge_label, origin from product_translations where product_id = $1', [id])).rows;
      const fa = rows.find(row => row.language_code === 'fa');
      if (!fa) return null;
      return {
        typed: { name: fa.name, description: fa.description, badge: fa.badge_label }, faOrigin: fa.origin, sourceHash: head.source_hash,
        existing: rows.map(row => ({ language: row.language_code, origin: row.origin })), hasOtherRows: rows.some(row => row.language_code !== 'fa')
      };
    },
    async save(id, { rows, hash }) {
      return inTransaction(async client => {
        await client.query('select 1 from products where id = $1 for update', [id]);
        const fa = (await client.query(`select name, description, badge_label from product_translations where product_id = $1 and language_code = 'fa'`, [id])).rows[0];
        if (!fa || hashFields('product', { name: fa.name, description: fa.description, badge: fa.badge_label }) !== hash) return false; // edited meanwhile
        for (const row of rows) {
          await client.query(
            `insert into product_translations(product_id, language_code, name, description, badge_label, origin) values($1,$2,$3,$4,$5,$6)
             on conflict(product_id, language_code) do update set name = excluded.name, description = excluded.description, badge_label = excluded.badge_label, origin = excluded.origin`,
            [id, row.language, row.fields.name, row.fields.description || '', row.fields.badge || '', row.origin]);
        }
        await client.query('update products set source_hash = $2 where id = $1', [id, hash]);
        return true;
      });
    },
    async markDone(id, hash) { await db('update products set source_hash = $2 where id = $1', [id, hash]); }
  },
  category: {
    async load(id) {
      const head = (await db('select source_hash from categories where id = $1', [id])).rows[0];
      if (!head) return null;
      const rows = (await db('select language_code, name, origin from category_translations where category_id = $1', [id])).rows;
      const fa = rows.find(row => row.language_code === 'fa');
      if (!fa) return null;
      return {
        typed: { name: fa.name }, faOrigin: fa.origin, sourceHash: head.source_hash,
        existing: rows.map(row => ({ language: row.language_code, origin: row.origin })), hasOtherRows: rows.some(row => row.language_code !== 'fa')
      };
    },
    async save(id, { rows, hash }) {
      return inTransaction(async client => {
        await client.query('select 1 from categories where id = $1 for update', [id]);
        const fa = (await client.query(`select name from category_translations where category_id = $1 and language_code = 'fa'`, [id])).rows[0];
        if (!fa || hashFields('category', { name: fa.name }) !== hash) return false;
        for (const row of rows) {
          await client.query(
            `insert into category_translations(category_id, language_code, name, origin) values($1,$2,$3,$4)
             on conflict(category_id, language_code) do update set name = excluded.name, origin = excluded.origin`,
            [id, row.language, row.fields.name, row.origin]);
        }
        await client.query('update categories set source_hash = $2 where id = $1', [id, hash]);
        return true;
      });
    },
    async markDone(id, hash) { await db('update categories set source_hash = $2 where id = $1', [id, hash]); }
  },
  restaurant: {
    async load(id) {
      const head = (await db('select name, tagline, description, address, source_hash from restaurants where id = $1', [id])).rows[0];
      if (!head) return null;
      const rows = (await db('select language_code, origin from restaurant_translations where restaurant_id = $1', [id])).rows;
      return {
        typed: { name: head.name, tagline: head.tagline, description: head.description, address: head.address }, faOrigin: 'source', sourceHash: head.source_hash,
        existing: rows.map(row => ({ language: row.language_code, origin: row.origin })), hasOtherRows: rows.some(row => row.language_code !== 'fa')
      };
    },
    async save(id, { rows, hash }) {
      return inTransaction(async client => {
        const head = (await client.query('select name, tagline, description, address from restaurants where id = $1 for update', [id])).rows[0];
        if (!head || hashFields('restaurant', head) !== hash) return false;
        for (const row of rows) {
          const f = row.fields;
          await client.query(
            `insert into restaurant_translations(restaurant_id, language_code, name, tagline, description, address, origin) values($1,$2,$3,$4,$5,$6,$7)
             on conflict(restaurant_id, language_code) do update set name = excluded.name, tagline = excluded.tagline, description = excluded.description, address = excluded.address, origin = excluded.origin`,
            [id, row.language, f.name || null, f.tagline || null, f.description || null, f.address || null, row.origin]);
        }
        await client.query('update restaurants set source_hash = $2 where id = $1', [id, hash]);
        return true;
      });
    },
    async markDone(id, hash) { await db('update restaurants set source_hash = $2 where id = $1', [id, hash]); }
  }
};

const autoTranslate = createAutoTranslation({ translator, stores: translationStores, logger: app.log });

/** Content that was saved but never translated (e.g. the translation service was down at the time). */
async function sweepUntranslated() {
  if (!autoTranslate.enabled) return;
  const queries = [
    ['product', `select p.id from products p join product_translations f on f.product_id = p.id and f.language_code = 'fa' and f.origin = 'source'
                  where p.source_hash is null and not exists (select 1 from product_translations o where o.product_id = p.id and o.language_code <> 'fa') limit 500`],
    ['category', `select c.id from categories c join category_translations f on f.category_id = c.id and f.language_code = 'fa' and f.origin = 'source'
                   where c.source_hash is null and not exists (select 1 from category_translations o where o.category_id = c.id and o.language_code <> 'fa') limit 200`],
    ['restaurant', `select r.id from restaurants r where r.source_hash is null and not exists (select 1 from restaurant_translations o where o.restaurant_id = r.id and o.language_code <> 'fa') limit 100`]
  ];
  for (const [kind, sql] of queries) for (const row of (await db(sql)).rows) autoTranslate.enqueue(kind, row.id);
}

/** Enqueue at most MAX_TRANSLATIONS_PER_REQUEST jobs per request; the rest is picked up by the next sweep/edit. */
function createJobCollector() {
  const jobs = [];
  return { add(kind, id) { if (id) jobs.push([kind, id]); }, flush() { jobs.slice(0, MAX_TRANSLATIONS_PER_REQUEST).forEach(([kind, id]) => autoTranslate.enqueue(kind, id)); } };
}

/* ---------- errors ---------- */

function sendError(error, request, reply) {
  const isValidation = error?.name === 'ZodError';
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal server error.';

  if (isValidation) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Request validation failed.';
  } else if (error?.apiCode) {
    status = error.statusCode; code = error.apiCode; message = error.message;
  } else if (error?.code === '23505') {
    status = 409; code = 'CONFLICT'; message = 'A record with the same unique value already exists.';
  } else if (error?.statusCode >= 400 && error.statusCode < 500) {
    status = error.statusCode; code = 'REQUEST_ERROR'; message = error.message;
  }

  if (status >= 500) request.log.error(error); else request.log.info({ code, status }, 'request rejected');
  const details = isValidation ? error.issues?.map(issue => ({ path: issue.path, message: issue.message })) : undefined;
  reply.code(status).send({ ...fail(code, message, request.id), ...(details ? { details } : {}) });
}

/* ---------- sessions, CSRF, tenancy ---------- */

const sessionCache = new WeakMap();

async function getSession(request) {
  if (sessionCache.has(request)) return sessionCache.get(request);
  const token = request.cookies[SESSION_COOKIE];
  let session = null;
  if (token) {
    const result = await db(
      `select s.id, s.user_id, s.csrf_hash, u.email, u.display_name
         from sessions s join users u on u.id = s.user_id
        where s.session_hash = $1 and s.expires_at > now() and u.active = true`, [sha256(token)]);
    session = result.rows[0] || null;
    if (session) await db(`update sessions set last_seen_at = now() where id = $1 and last_seen_at < now() - interval '5 minutes'`, [session.id]);
  }
  sessionCache.set(request, session);
  return session;
}

async function listMemberships(userId) {
  const result = await db(
    `select rm.restaurant_id, rm.role, r.slug, r.name
       from restaurant_memberships rm join restaurants r on r.id = rm.restaurant_id
      where rm.user_id = $1
      order by case rm.role when 'owner' then 0 when 'manager' then 1 when 'editor' then 2 else 3 end, r.name`, [userId]);
  return result.rows;
}

/**
 * Tenant context always comes from the authenticated user's memberships.
 * A restaurantId in the URL is only a *selector* among the user's own restaurants;
 * a restaurant the user does not belong to answers 404 (no tenant enumeration).
 */
async function requireAdminContext(request, minimum, restaurantId) {
  const session = await getSession(request);
  if (!session) throw httpError(401, 'Authentication required.', 'UNAUTHENTICATED');
  const memberships = await listMemberships(session.user_id);
  let membership;
  if (restaurantId !== undefined) {
    membership = UUID_RE.test(restaurantId) ? memberships.find(item => item.restaurant_id === restaurantId) : null;
    if (!membership) throw httpError(404, 'Restaurant not found.', 'NOT_FOUND');
  } else {
    membership = memberships[0];
    if (!membership) throw httpError(403, 'No restaurant access.', 'FORBIDDEN');
  }
  if (!hasRole(membership.role, minimum)) throw httpError(403, 'Insufficient permissions.', 'FORBIDDEN');
  return { session, membership };
}

async function requireCsrf(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const header = request.headers['x-csrf-token'];
  if (!header || !safeEqual(request.cookies[CSRF_COOKIE], header)) throw httpError(403, 'CSRF token missing or invalid.', 'CSRF_INVALID');
  const session = await getSession(request);
  if (session && !safeEqual(session.csrf_hash, sha256(header))) throw httpError(403, 'CSRF token invalid.', 'CSRF_INVALID');
}

async function audit(membership, userId, action, entityType, entityId, metadata = {}) {
  try {
    await db(`insert into audit_logs(restaurant_id, actor_user_id, action, entity_type, entity_id, metadata) values($1,$2,$3,$4,$5,$6::jsonb)`,
      [membership?.restaurant_id || null, userId || null, action, entityType || null, UUID_RE.test(entityId || '') ? entityId : null, JSON.stringify(metadata)]);
  } catch (error) {
    app.log.error({ err: error }, 'audit log write failed');
  }
}

/* ---------- plugins & static files ---------- */

await app.register(cookie);
await app.register(helmet, {
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
});
await app.register(rateLimit, { max: 100, timeWindow: '1 minute', keyGenerator: request => request.ip });

// Only these folders/files are public. The project root (backend/, docs/, qa/, package files) is never served.
await app.register(fastifyStatic, { root: path.join(root, 'assets'), prefix: '/assets/', maxAge: '7d' });
await app.register(fastifyStatic, { root: path.join(root, 'css'), prefix: '/css/', decorateReply: false });
await app.register(fastifyStatic, { root: path.join(root, 'js'), prefix: '/js/', decorateReply: false });
await app.register(fastifyStatic, { root: path.join(root, 'admin'), prefix: '/admin/', index: ['index.html'], decorateReply: false });
await fs.mkdir(UPLOAD_DIR, { recursive: true });
await app.register(fastifyStatic, { root: UPLOAD_DIR, prefix: '/uploads/', maxAge: '30d', immutable: true, decorateReply: false });

app.get('/', (_request, reply) => reply.sendFile('index.html', root));
app.get('/index.html', (_request, reply) => reply.sendFile('index.html', root));
app.get('/sw.js', (_request, reply) => reply.header('Cache-Control', 'no-cache').sendFile('sw.js', root));
app.get('/manifest.webmanifest', (_request, reply) => reply.type('application/manifest+json').sendFile('manifest.webmanifest', root));
app.get('/admin', (_request, reply) => reply.redirect('/admin/'));

app.setErrorHandler(sendError);
app.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api/')) return reply.code(404).send(fail('NOT_FOUND', 'Route not found.', request.id));
  return reply.code(404).type('text/plain').send('Not found');
});

/* ---------- validation ---------- */

// NOTE: PATCH schemas deliberately contain no .default(): an omitted field must stay "unchanged".
const idParams = z.object({ id: z.string().uuid() });
const imageField = z.string().max(2000).refine(
  value => value === '' || cleanImageUrl(value) !== null,
  'Image must be an http(s) URL, a bundled asset path, or an uploaded file (upload data: images first).');
const translationsField = z.record(z.string(), z.record(z.string(), z.unknown())).optional();

const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128) });

const settingsSchema = z.object({
  name: z.string().min(1).max(120),
  tagline: z.string().max(180).optional(),
  description: z.string().max(1200).optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(500).optional(),
  instagram: z.string().url().max(500).or(z.literal('')).optional(),
  currency: z.string().max(10).optional(),
  translations: translationsField
});

const categoryBase = {
  name: z.string().min(1).max(120),
  slug: z.string().max(80).optional(),
  image: imageField.optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  active: z.boolean().optional(),
  translations: translationsField
};
const categoryCreateSchema = z.object(categoryBase);
const categoryPatchSchema = z.object(categoryBase).partial();

const productBase = {
  name: z.string().min(1).max(160),
  categoryId: z.string().uuid(),
  slug: z.string().max(100).optional(),
  image: imageField.optional(),
  description: z.string().max(2500).optional(),
  price: z.number().min(0).max(100000000000),
  rating: z.number().min(0).max(5).optional(),
  badge: z.string().max(80).optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  translations: translationsField
};
const productCreateSchema = z.object(productBase);
const productPatchSchema = z.object(productBase).partial();

const snapshotSchema = z.object({
  // "replace" makes the payload authoritative (rows missing from it are deleted); "merge" never deletes.
  mode: z.enum(['merge', 'replace']).optional().default('merge'),
  restaurant: settingsSchema.partial().optional(),
  categories: z.array(z.object({
    id: z.string().min(1).max(100), name: z.string().min(1).max(120), image: imageField.optional(),
    sortOrder: z.number().int().min(0).max(100000).optional().default(0), active: z.boolean().optional().default(true),
    translations: translationsField
  })).max(500),
  products: z.array(z.object({
    id: z.string().min(1).max(100), name: z.string().min(1).max(160), category: z.string().min(1).max(100), image: imageField.optional(),
    description: z.string().max(2500).optional().default(''), price: z.number().min(0).max(100000000000),
    rating: z.union([z.number().min(0).max(5), z.string()]).optional().default(0), badge: z.string().max(80).optional().default(''),
    featured: z.boolean().optional().default(false), active: z.boolean().optional().default(true),
    sortOrder: z.number().int().min(0).max(100000).optional().default(0), translations: translationsField
  })).max(2000)
});

const mediaSchema = z.object({ dataUrl: z.string().max(3_000_000) });

/* ---------- data access helpers ---------- */

const parseRating = value => {
  if (typeof value === 'number') return Math.min(5, Math.max(0, value));
  const stars = (String(value).match(/★/g) || []).length;
  if (stars) return Math.min(5, stars);
  const numeric = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? Math.min(5, Math.max(0, numeric)) : 0;
};

/** Persian (fa) is the canonical content row and is overwritten exactly as sent. */
async function writeCategoryFa(client, categoryId, name) {
  // Returns true when the text is new or changed (=> needs translating). An unchanged re-save is a no-op,
  // so it never turns an automatically produced Persian text back into "typed by a person".
  const result = await client.query(
    `insert into category_translations(category_id, language_code, name) values($1,'fa',$2)
     on conflict(category_id, language_code) do update set name = excluded.name, origin = 'source'
       where category_translations.name is distinct from excluded.name`, [categoryId, name]);
  return result.rowCount > 0;
}

async function writeProductFa(client, productId, name, description, badge) {
  const result = await client.query(
    `insert into product_translations(product_id, language_code, name, description, badge_label) values($1,'fa',$2,$3,$4)
     on conflict(product_id, language_code) do update set name = excluded.name, description = excluded.description, badge_label = excluded.badge_label, origin = 'source'
       where product_translations.name is distinct from excluded.name
          or product_translations.description is distinct from excluded.description
          or product_translations.badge_label is distinct from excluded.badge_label`,
    [productId, name, description || '', badge || '']);
  return result.rowCount > 0;
}

/** Other languages never erase existing text with an empty value. */
async function writeExtraTranslations(client, kind, entityId, rawTranslations) {
  const clean = sanitizeIncomingTranslations(rawTranslations);
  for (const [language, fields] of Object.entries(clean)) {
    if (language === 'fa' || !fields.name) continue;
    if (kind === 'category') {
      await client.query(
        `insert into category_translations(category_id, language_code, name, origin) values($1,$2,$3,'manual')
         on conflict(category_id, language_code) do update set name = excluded.name, origin = 'manual'`, [entityId, language, fields.name]);
    } else {
      await client.query(
        `insert into product_translations(product_id, language_code, name, description, badge_label, origin) values($1,$2,$3,$4,$5,'manual')
         on conflict(product_id, language_code) do update set name = excluded.name, origin = 'manual',
           description = coalesce(nullif(excluded.description, ''), product_translations.description),
           badge_label = coalesce(nullif(excluded.badge_label, ''), product_translations.badge_label)`,
        [entityId, language, fields.name, fields.description || '', fields.badge || '']);
    }
  }
}

async function writeRestaurantTranslations(client, restaurantId, rawTranslations) {
  if (!rawTranslations || typeof rawTranslations !== 'object') return;
  const limits = { name: 120, tagline: 180, description: 1200, address: 500 };
  for (const [language, fields] of Object.entries(rawTranslations)) {
    if (!LANGUAGES.includes(language) || language === 'fa' || !fields || typeof fields !== 'object') continue;
    const entry = {};
    for (const [key, max] of Object.entries(limits)) {
      const value = typeof fields[key] === 'string' ? fields[key].trim().slice(0, max) : '';
      if (value) entry[key] = value;
    }
    if (!Object.keys(entry).length) continue;
    await client.query(
      `insert into restaurant_translations(restaurant_id, language_code, name, tagline, description, address, origin) values($1,$2,$3,$4,$5,$6,'manual')
       on conflict(restaurant_id, language_code) do update set origin = 'manual',
         name = coalesce(excluded.name, restaurant_translations.name),
         tagline = coalesce(excluded.tagline, restaurant_translations.tagline),
         description = coalesce(excluded.description, restaurant_translations.description),
         address = coalesce(excluded.address, restaurant_translations.address)`,
      [restaurantId, language, entry.name || null, entry.tagline || null, entry.description || null, entry.address || null]);
  }
}

async function loadRestaurantTranslations(restaurantId) {
  const rows = (await db(`select language_code, name, tagline, description, address from restaurant_translations where restaurant_id = $1`, [restaurantId])).rows;
  const out = {};
  for (const row of rows) {
    const entry = {};
    for (const key of ['name', 'tagline', 'description', 'address']) if (row[key]) entry[key] = row[key];
    if (Object.keys(entry).length) out[row.language_code] = entry;
  }
  return out;
}

async function loadCatalog(restaurantId, { onlyActive }) {
  const categories = await db(
    `select c.id, c.slug, c.image_url, c.sort_order, c.active,
            coalesce(jsonb_agg(jsonb_build_object('language', ct.language_code, 'name', ct.name)) filter (where ct.language_code is not null), '[]'::jsonb) as translations
       from categories c left join category_translations ct on ct.category_id = c.id
      where c.restaurant_id = $1 ${onlyActive ? 'and c.active = true' : ''}
      group by c.id order by c.sort_order, c.created_at`, [restaurantId]);
  const products = await db(
    `select p.id, p.slug, p.price, p.image_url, p.rating, p.featured, p.active, p.sort_order,
            c.id as category_uuid, c.slug as category_slug,
            coalesce(jsonb_agg(jsonb_build_object('language', pt.language_code, 'name', pt.name, 'description', pt.description, 'badge', pt.badge_label)) filter (where pt.language_code is not null), '[]'::jsonb) as translations
       from products p
       join categories c on c.id = p.category_id ${onlyActive ? 'and c.active = true' : ''}
       left join product_translations pt on pt.product_id = p.id
      where p.restaurant_id = $1 ${onlyActive ? 'and p.active = true' : ''}
      group by p.id, c.id order by c.sort_order, p.sort_order, p.created_at`, [restaurantId]);
  return { categories: categories.rows, products: products.rows };
}

function shapeCatalog({ categories, products }, lang) {
  const categoryMaps = new Map(categories.map(row => [row.id, translationsToMap(row.translations)]));
  const shapedCategories = categories.map(row => {
    const map = categoryMaps.get(row.id);
    return {
      uuid: row.id, id: row.slug, name: resolveField(map, 'name', lang) || row.slug, image: row.image_url || '',
      active: row.active, sortOrder: row.sort_order, translations: map
    };
  });
  const shapedProducts = products.map(row => {
    const map = translationsToMap(row.translations);
    return {
      uuid: row.id, id: row.slug, name: resolveField(map, 'name', lang) || row.slug,
      description: resolveField(map, 'description', lang), badge: resolveField(map, 'badge', lang),
      category: row.category_slug, categoryName: resolveField(categoryMaps.get(row.category_uuid), 'name', lang),
      image: row.image_url || '', price: Number(row.price), rating: Number(row.rating || 0),
      featured: row.featured, active: row.active, sortOrder: row.sort_order, translations: map
    };
  });
  return { categories: shapedCategories, products: shapedProducts };
}

async function tenantData(membership) {
  const [restaurantRow, translations, catalog] = await Promise.all([
    db('select * from restaurants where id = $1', [membership.restaurant_id]),
    loadRestaurantTranslations(membership.restaurant_id),
    loadCatalog(membership.restaurant_id, { onlyActive: false })
  ]);
  const r = restaurantRow.rows[0] || {};
  return {
    restaurant: {
      id: r.id, slug: r.slug, name: r.name, tagline: r.tagline || '', description: r.description || '', logo_url: r.logo_url || '',
      instagram: r.instagram_url || '', phone: r.phone || '', address: r.address || '', timezone: r.timezone, currency: r.currency,
      defaultLanguage: r.default_language || 'fa', translations
    },
    ...shapeCatalog(catalog, 'fa')
  };
}

/* ---------- routes ---------- */

async function routes(api) {
  api.addHook('preHandler', requireCsrf);

  /** Registers both /admin/restaurants/:restaurantId<suffix> (canonical) and /admin<suffix> (default restaurant). */
  function adminRoute(method, suffix, minimum, handler, options = {}) {
    const wrapped = async (request, reply) => {
      const { session, membership } = await requireAdminContext(request, minimum, request.params?.restaurantId);
      return handler({ request, reply, session, membership });
    };
    api[method](`/admin/restaurants/:restaurantId${suffix}`, options, wrapped);
    api[method](`/admin${suffix}`, options, wrapped);
  }

  api.get('/health', async (request, reply) => {
    try {
      await db('select 1');
      return reply.send(ok({ status: 'ok', service: 'romano-api', autoTranslation: autoTranslate.enabled }, request.id));
    } catch {
      return reply.code(503).send(fail('DB_UNAVAILABLE', 'Database unavailable.', request.id));
    }
  });

  /* --- auth --- */

  api.get('/auth/csrf', async (request, reply) => {
    let token = request.cookies[CSRF_COOKIE];
    if (!token) { token = randomToken(24); reply.setCookie(CSRF_COOKIE, token, csrfCookieBase); }
    return reply.send(ok({ csrfToken: token }, request.id));
  });

  api.post('/auth/login', { config: { rateLimit: { max: 8, timeWindow: '10 minutes' } } }, async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const result = await db('select id, email, display_name, password_hash, active from users where lower(email) = lower($1)', [input.email]);
    const user = result.rows[0];
    // Always run one Argon2 verification so response time does not reveal whether the account exists.
    const passwordOk = await argon2.verify(user?.password_hash || DUMMY_HASH, input.password).catch(() => false);
    if (!user?.active || !user.password_hash || !passwordOk) {
      return reply.code(401).send(fail('INVALID_CREDENTIALS', 'Email or password is incorrect.', request.id));
    }
    const token = randomToken(32);
    const csrf = randomToken(24);
    await inTransaction(async client => {
      await client.query('delete from sessions where expires_at <= now()');
      await client.query(`delete from sessions where id in (select id from sessions where user_id = $1 order by created_at desc offset $2)`, [user.id, MAX_SESSIONS_PER_USER - 1]);
      await client.query('insert into sessions(user_id, session_hash, csrf_hash, expires_at) values($1,$2,$3,$4)',
        [user.id, sha256(token), sha256(csrf), new Date(Date.now() + SESSION_TTL * 1000)]);
    });
    reply.setCookie(SESSION_COOKIE, token, { ...cookieBase, maxAge: SESSION_TTL });
    reply.setCookie(CSRF_COOKIE, csrf, { ...csrfCookieBase, maxAge: SESSION_TTL });
    // The CSRF token is rotated on login, so the client must adopt this value.
    return reply.send(ok({ user: { id: user.id, email: user.email, displayName: user.display_name }, csrfToken: csrf }, request.id));
  });

  api.post('/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) await db('delete from sessions where session_hash = $1', [sha256(token)]);
    reply.clearCookie(SESSION_COOKIE, cookieBase);
    reply.clearCookie(CSRF_COOKIE, csrfCookieBase);
    return reply.send(ok({ loggedOut: true }, request.id));
  });

  api.get('/auth/me', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.send(ok(null, request.id));
    const memberships = await listMemberships(session.user_id);
    return reply.send(ok({
      user: { id: session.user_id, email: session.email, displayName: session.display_name },
      memberships: memberships.map(item => ({ restaurantId: item.restaurant_id, role: item.role, slug: item.slug, name: item.name })),
      membership: memberships[0] || null
    }, request.id));
  });

  /* --- public menu --- */

  async function loadPublicMenu(request) {
    const slug = String(request.params.slug || '').toLowerCase();
    const lang = LANGUAGES.includes(request.query?.lang) ? request.query.lang : 'fa';
    const found = await db(
      `select id, slug, name, tagline, description, logo_url, instagram_url, phone, address, currency, default_language
         from restaurants where slug = $1 and published = true`, [slug]);
    const r = found.rows[0];
    if (!r) return null;
    const [translations, catalog] = await Promise.all([loadRestaurantTranslations(r.id), loadCatalog(r.id, { onlyActive: true })]);
    const shaped = shapeCatalog(catalog, lang);
    const strip = ({ uuid, ...rest }) => rest;
    return {
      restaurant: {
        slug: r.slug, name: resolveField(translations, 'name', lang, r.default_language) || r.name,
        tagline: translations[lang]?.tagline || r.tagline || '', description: translations[lang]?.description || r.description || '',
        address: translations[lang]?.address || r.address || '', logo_url: r.logo_url || '', instagram: r.instagram_url || '',
        phone: r.phone || '', currency: r.currency, defaultLanguage: r.default_language, translations
      },
      categories: shaped.categories.map(strip),
      products: shaped.products.map(strip)
    };
  }

  const publicHandler = pick => async (request, reply) => {
    const menu = await loadPublicMenu(request);
    if (!menu) return reply.code(404).send(fail('MENU_NOT_FOUND', 'Restaurant menu not found.', request.id));
    reply.header('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    return reply.send(ok(pick(menu, request), request.id));
  };
  api.get('/public/restaurants/:slug/menu', publicHandler(menu => menu));
  api.get('/public/restaurants/:slug/categories', publicHandler(menu => ({ categories: menu.categories })));
  api.get('/public/restaurants/:slug/products', publicHandler((menu, request) => {
    const category = typeof request.query?.category === 'string' ? request.query.category : null;
    return { products: category ? menu.products.filter(item => item.category === category) : menu.products };
  }));
  api.get('/public/menu/:slug', publicHandler(menu => menu)); // legacy alias

  /* --- admin: read --- */

  api.get('/admin/me', async (request, reply) => {
    const session = await getSession(request);
    if (!session) throw httpError(401, 'Authentication required.', 'UNAUTHENTICATED');
    const memberships = await listMemberships(session.user_id);
    return reply.send(ok({
      user: { id: session.user_id, email: session.email, displayName: session.display_name },
      memberships: memberships.map(item => ({ restaurantId: item.restaurant_id, role: item.role, slug: item.slug, name: item.name }))
    }, request.id));
  });

  adminRoute('get', '/data', 'viewer', async ({ request, reply, membership }) => reply.send(ok(await tenantData(membership), request.id)));

  adminRoute('get', '/audit-logs', 'manager', async ({ request, reply, membership }) => {
    const result = await db(
      `select a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at, u.email as actor_email
         from audit_logs a left join users u on u.id = a.actor_user_id
        where a.restaurant_id = $1 order by a.created_at desc limit 100`, [membership.restaurant_id]);
    return reply.send(ok(result.rows, request.id));
  });

  /* --- admin: snapshot sync (used by the current admin UI) --- */

  adminRoute('put', '/snapshot', 'editor', async ({ request, reply, session, membership }) => {
    const input = snapshotSchema.parse(request.body);
    const rid = membership.restaurant_id;

    const categorySlugs = input.categories.map(item => slugify(item.id, 'category'));
    const productSlugs = input.products.map(item => slugify(item.id, 'product'));
    if (new Set(categorySlugs).size !== categorySlugs.length || new Set(productSlugs).size !== productSlugs.length) {
      throw httpError(400, 'Duplicate category or product identifiers in payload.', 'DUPLICATE_IDS');
    }
    if (input.mode === 'replace' && input.categories.length === 0) {
      throw httpError(400, 'Refusing to replace the menu with zero categories.', 'EMPTY_REPLACE');
    }

    const jobs = createJobCollector();
    const previousRestaurant = (await db('select name, tagline, description, address from restaurants where id = $1', [rid])).rows[0];

    await inTransaction(async client => {
      if (input.restaurant?.name) {
        const r = input.restaurant;
        const nextTexts = { name: r.name, tagline: r.tagline ?? '', description: r.description ?? '', address: r.address ?? '' };
        if (hashFields('restaurant', previousRestaurant || {}) !== hashFields('restaurant', nextTexts)) jobs.add('restaurant', rid);
        await client.query(
          `update restaurants set name = $1, tagline = $2, description = $3, phone = $4, address = $5, instagram_url = $6, currency = coalesce($7, currency) where id = $8`,
          [r.name, r.tagline ?? '', r.description ?? '', r.phone ?? '', r.address ?? '', r.instagram || null, r.currency || null, rid]);
        await writeRestaurantTranslations(client, rid, r.translations);
      }

      const categoryIds = new Map();
      for (let i = 0; i < input.categories.length; i += 1) {
        const item = input.categories[i];
        const saved = await client.query(
          `insert into categories(restaurant_id, slug, image_url, sort_order, active) values($1,$2,$3,$4,$5)
           on conflict(restaurant_id, slug) do update set image_url = excluded.image_url, sort_order = excluded.sort_order, active = excluded.active
           returning id`, [rid, categorySlugs[i], cleanImageUrl(item.image), item.sortOrder, item.active]);
        categoryIds.set(item.id, saved.rows[0].id);
        if (await writeCategoryFa(client, saved.rows[0].id, item.name)) jobs.add('category', saved.rows[0].id);
        await writeExtraTranslations(client, 'category', saved.rows[0].id, item.translations);
      }

      for (let i = 0; i < input.products.length; i += 1) {
        const item = input.products[i];
        const categoryId = categoryIds.get(item.category);
        if (!categoryId) throw httpError(422, `Product "${item.name}" references an unknown category.`, 'INVALID_CATEGORY');
        const saved = await client.query(
          `insert into products(restaurant_id, category_id, slug, price, image_url, badge_code, rating, featured, active, sort_order)
           values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           on conflict(restaurant_id, slug) do update set category_id = excluded.category_id, price = excluded.price, image_url = excluded.image_url,
             badge_code = excluded.badge_code, rating = excluded.rating, featured = excluded.featured, active = excluded.active, sort_order = excluded.sort_order
           returning id`,
          [rid, categoryId, productSlugs[i], item.price, cleanImageUrl(item.image), item.badge || null, parseRating(item.rating), item.featured, item.active, item.sortOrder]);
        if (await writeProductFa(client, saved.rows[0].id, item.name, item.description, item.badge)) jobs.add('product', saved.rows[0].id);
        await writeExtraTranslations(client, 'product', saved.rows[0].id, item.translations);
      }

      if (input.mode === 'replace') {
        await client.query('delete from products where restaurant_id = $1 and not (slug = any($2::text[]))', [rid, productSlugs]);
        await client.query('delete from categories where restaurant_id = $1 and not (slug = any($2::text[]))', [rid, categorySlugs]);
      }
    });

    jobs.flush(); // translation runs in the background, after the data is safely committed
    await audit(membership, session.user_id, 'menu.snapshot.saved', 'restaurant', rid, { mode: input.mode, categories: input.categories.length, products: input.products.length });
    return reply.send(ok({ saved: true, data: await tenantData(membership) }, request.id));
  });

  /* --- admin: settings --- */

  adminRoute('get', '', 'viewer', async ({ request, reply, membership }) => reply.send(ok((await tenantData(membership)).restaurant, request.id)));

  const updateSettings = async ({ request, reply, session, membership }) => {
    const input = settingsSchema.parse(request.body);
    const before = (await db('select name, tagline, description, address from restaurants where id = $1', [membership.restaurant_id])).rows[0];
    const settingsChanged = hashFields('restaurant', before || {}) !== hashFields('restaurant', { name: input.name, tagline: input.tagline ?? '', description: input.description ?? '', address: input.address ?? '' });
    await inTransaction(async client => {
      await client.query(
        `update restaurants set name = $1, tagline = $2, description = $3, phone = $4, address = $5, instagram_url = $6, currency = coalesce($7, currency) where id = $8`,
        [input.name, input.tagline ?? '', input.description ?? '', input.phone ?? '', input.address ?? '', input.instagram || null, input.currency || null, membership.restaurant_id]);
      await writeRestaurantTranslations(client, membership.restaurant_id, input.translations);
    });
    if (settingsChanged) autoTranslate.enqueue('restaurant', membership.restaurant_id);
    await audit(membership, session.user_id, 'restaurant.settings.updated', 'restaurant', membership.restaurant_id, { fields: Object.keys(input) });
    return reply.send(ok({ saved: true }, request.id));
  };
  adminRoute('patch', '', 'manager', updateSettings);
  adminRoute('patch', '/settings', 'manager', updateSettings);

  /* --- admin: categories --- */

  adminRoute('post', '/categories', 'editor', async ({ request, reply, session, membership }) => {
    const input = categoryCreateSchema.parse(request.body);
    const created = await inTransaction(async client => {
      const row = await client.query(
        `insert into categories(restaurant_id, slug, image_url, sort_order, active) values($1,$2,$3,$4,$5) returning id, slug`,
        [membership.restaurant_id, slugify(input.slug || input.name, 'category'), cleanImageUrl(input.image), input.sortOrder ?? 0, input.active ?? true]);
      await writeCategoryFa(client, row.rows[0].id, input.name);
      await writeExtraTranslations(client, 'category', row.rows[0].id, input.translations);
      return row.rows[0];
    });
    autoTranslate.enqueue('category', created.id);
    await audit(membership, session.user_id, 'category.created', 'category', created.id);
    return reply.code(201).send(ok({ id: created.slug, uuid: created.id }, request.id));
  });

  adminRoute('patch', '/categories/:id', 'editor', async ({ request, reply, session, membership }) => {
    const { id } = idParams.parse(request.params);
    const input = categoryPatchSchema.parse(request.body);
    const found = await db('select id, slug, image_url, sort_order, active from categories where id = $1 and restaurant_id = $2', [id, membership.restaurant_id]);
    const current = found.rows[0];
    if (!current) throw httpError(404, 'Category not found.', 'NOT_FOUND');
    let categoryTextChanged = false;
    await inTransaction(async client => {
      await client.query(
        `update categories set slug = $1, image_url = $2, sort_order = $3, active = $4 where id = $5 and restaurant_id = $6`,
        [input.slug !== undefined ? slugify(input.slug, 'category') : current.slug,
         input.image !== undefined ? cleanImageUrl(input.image) : current.image_url,
         input.sortOrder ?? current.sort_order, input.active ?? current.active, id, membership.restaurant_id]);
      if (input.name) categoryTextChanged = await writeCategoryFa(client, id, input.name);
      await writeExtraTranslations(client, 'category', id, input.translations);
    });
    if (categoryTextChanged) autoTranslate.enqueue('category', id);
    await audit(membership, session.user_id, 'category.updated', 'category', id, { fields: Object.keys(input) });
    return reply.send(ok({ updated: true }, request.id));
  });

  adminRoute('delete', '/categories/:id', 'manager', async ({ request, reply, session, membership }) => {
    const { id } = idParams.parse(request.params);
    const attached = await db('select count(*)::int as count from products where category_id = $1 and restaurant_id = $2', [id, membership.restaurant_id]);
    if (attached.rows[0].count > 0) throw httpError(409, 'Move or delete products before deleting this category.', 'CATEGORY_NOT_EMPTY');
    const result = await db('delete from categories where id = $1 and restaurant_id = $2 returning id', [id, membership.restaurant_id]);
    if (!result.rows[0]) throw httpError(404, 'Category not found.', 'NOT_FOUND');
    await audit(membership, session.user_id, 'category.deleted', 'category', id);
    return reply.send(ok({ deleted: true }, request.id));
  });

  /* --- admin: products --- */

  const assertCategoryOwned = async (categoryId, restaurantId) => {
    const found = await db('select id from categories where id = $1 and restaurant_id = $2', [categoryId, restaurantId]);
    if (!found.rows[0]) throw httpError(422, 'Category does not belong to this restaurant.', 'INVALID_CATEGORY');
  };

  adminRoute('post', '/products', 'editor', async ({ request, reply, session, membership }) => {
    const input = productCreateSchema.parse(request.body);
    await assertCategoryOwned(input.categoryId, membership.restaurant_id);
    const created = await inTransaction(async client => {
      const row = await client.query(
        `insert into products(restaurant_id, category_id, slug, price, image_url, badge_code, rating, featured, active, sort_order)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id, slug`,
        [membership.restaurant_id, input.categoryId, slugify(input.slug || input.name, 'product'), input.price, cleanImageUrl(input.image),
         input.badge || null, input.rating ?? 0, input.featured ?? false, input.active ?? true, input.sortOrder ?? 0]);
      await writeProductFa(client, row.rows[0].id, input.name, input.description, input.badge);
      await writeExtraTranslations(client, 'product', row.rows[0].id, input.translations);
      return row.rows[0];
    });
    autoTranslate.enqueue('product', created.id);
    await audit(membership, session.user_id, 'product.created', 'product', created.id);
    return reply.code(201).send(ok({ id: created.slug, uuid: created.id }, request.id));
  });

  adminRoute('patch', '/products/:id', 'editor', async ({ request, reply, session, membership }) => {
    const { id } = idParams.parse(request.params);
    const input = productPatchSchema.parse(request.body);
    const found = await db(
      `select p.id, p.category_id, p.slug, p.price, p.image_url, p.badge_code, p.rating, p.featured, p.active, p.sort_order,
              pt.name as fa_name, pt.description as fa_description, pt.badge_label as fa_badge
         from products p left join product_translations pt on pt.product_id = p.id and pt.language_code = 'fa'
        where p.id = $1 and p.restaurant_id = $2`, [id, membership.restaurant_id]);
    const current = found.rows[0];
    if (!current) throw httpError(404, 'Product not found.', 'NOT_FOUND');
    if (input.categoryId) await assertCategoryOwned(input.categoryId, membership.restaurant_id);
    const badge = input.badge !== undefined ? input.badge : current.fa_badge;
    let productTextChanged = false;
    await inTransaction(async client => {
      await client.query(
        `update products set category_id = $1, slug = $2, price = $3, image_url = $4, badge_code = $5, rating = $6, featured = $7, active = $8, sort_order = $9
          where id = $10 and restaurant_id = $11`,
        [input.categoryId ?? current.category_id, input.slug !== undefined ? slugify(input.slug, 'product') : current.slug,
         input.price ?? current.price, input.image !== undefined ? cleanImageUrl(input.image) : current.image_url, badge || null,
         input.rating ?? current.rating, input.featured ?? current.featured, input.active ?? current.active, input.sortOrder ?? current.sort_order,
         id, membership.restaurant_id]);
      if (input.name !== undefined || input.description !== undefined || input.badge !== undefined) {
        productTextChanged = await writeProductFa(client, id, input.name ?? current.fa_name ?? current.slug, input.description ?? current.fa_description, badge);
      }
      await writeExtraTranslations(client, 'product', id, input.translations);
    });
    if (productTextChanged) autoTranslate.enqueue('product', id);
    await audit(membership, session.user_id, 'product.updated', 'product', id, { fields: Object.keys(input) });
    return reply.send(ok({ updated: true }, request.id));
  });

  adminRoute('delete', '/products/:id', 'manager', async ({ request, reply, session, membership }) => {
    const { id } = idParams.parse(request.params);
    const result = await db('delete from products where id = $1 and restaurant_id = $2 returning id', [id, membership.restaurant_id]);
    if (!result.rows[0]) throw httpError(404, 'Product not found.', 'NOT_FOUND');
    await audit(membership, session.user_id, 'product.deleted', 'product', id);
    return reply.send(ok({ deleted: true }, request.id));
  });

  /* --- admin: image upload --- */

  adminRoute('post', '/media', 'editor', async ({ request, reply, session, membership }) => {
    const { dataUrl } = mediaSchema.parse(request.body);
    const { buffer, mime, ext } = parseImageDataUrl(dataUrl);
    const count = await db('select count(*)::int as count from media_assets where restaurant_id = $1', [membership.restaurant_id]);
    if (count.rows[0].count >= 2000) throw httpError(409, 'Media quota reached.', 'MEDIA_QUOTA');
    const fileName = randomImageName(ext);
    const dir = path.join(UPLOAD_DIR, membership.restaurant_id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), buffer, { flag: 'wx' });
    await db('insert into media_assets(restaurant_id, uploaded_by, file_name, mime_type, byte_size) values($1,$2,$3,$4,$5)',
      [membership.restaurant_id, session.user_id, fileName, mime, buffer.length]);
    await audit(membership, session.user_id, 'media.uploaded', 'media', null, { bytes: buffer.length, mime });
    return reply.code(201).send(ok({ url: `/uploads/${membership.restaurant_id}/${fileName}`, mime, bytes: buffer.length }, request.id));
  }, { bodyLimit: 4_000_000, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } });
}

await app.register(routes, { prefix: '/api/v1' });
// Deprecated unversioned alias kept so already-deployed clients keep working.
await app.register(async legacy => {
  legacy.addHook('onSend', async (_request, reply) => { reply.header('Deprecation', 'true'); });
  await legacy.register(routes);
}, { prefix: '/api' });

app.addHook('onClose', async () => { await pool.end(); });

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { app.close().finally(() => process.exit(0)); });
}

try {
  await app.listen({ host: process.env.HOST || '0.0.0.0', port: PORT });
  app.log.info({ autoTranslation: autoTranslate.enabled }, autoTranslate.enabled ? 'automatic translation is ON' : 'automatic translation is OFF (set ANTHROPIC_API_KEY to enable)');
  sweepUntranslated().catch(error => app.log.warn({ reason: error?.message }, 'translation sweep skipped'));
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
