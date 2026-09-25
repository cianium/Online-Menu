import 'dotenv/config';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import argon2 from 'argon2';
import pg from 'pg';
import { z } from 'zod';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const app = Fastify({ logger: true, trustProxy: true, requestIdHeader: 'x-request-id' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
const PORT = Number(process.env.PORT || 3000);
const SESSION_TTL = Number(process.env.SESSION_TTL_SECONDS || 604800);
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const SESSION_COOKIE = 'romano_session';
const CSRF_COOKIE = 'romano_csrf';
const ALLOWED_LANGS = ['fa', 'en', 'tr', 'ar'];

const ok = (data, requestId) => ({ data, error: null, requestId });
const fail = (code, message, requestId, status = 400) => ({ data: null, error: { code, message }, requestId, status });
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const randomToken = bytes => crypto.randomBytes(bytes).toString('base64url');
const slugify = value => String(value).toLowerCase().trim().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || `item-${Date.now()}`;
const cookieBase = { httpOnly: true, sameSite: 'lax', secure: COOKIE_SECURE, path: '/' };
const csrfCookieBase = { httpOnly: false, sameSite: 'lax', secure: COOKIE_SECURE, path: '/' };

async function db(sql, params = []) {
  return pool.query(sql, params);
}

function sendError(reply, request, error) {
  const isValidation = error?.name === 'ZodError';
  const status = isValidation ? 400 : (error?.statusCode || (error?.code === '23505' ? 409 : 500));
  request.log.error(error);
  const message = isValidation ? 'Request validation failed.' : (status === 500 ? 'Internal server error.' : error.message);
  const details = isValidation ? error.issues?.map(issue => ({ path: issue.path, message: issue.message })) : undefined;
  reply.code(status).send({ ...fail(isValidation ? 'VALIDATION_ERROR' : (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'), message, request.id, status), ...(details ? { details } : {}) });
}

async function getSession(request) {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) return null;
  const result = await db(`select s.id, s.user_id, s.expires_at, u.email, u.display_name, u.active
                           from sessions s join users u on u.id=s.user_id
                           where s.session_hash=$1 and s.expires_at>now() and u.active=true`, [sha256(token)]);
  const row = result.rows[0];
  if (!row) return null;
  await db('update sessions set last_seen_at=now() where id=$1', [row.id]);
  return row;
}

async function getMembership(userId) {
  const result = await db(`select rm.restaurant_id, rm.role, r.slug, r.name, r.tagline, r.description, r.logo_url, r.instagram_url, r.phone, r.address, r.timezone, r.currency, r.published
                           from restaurant_memberships rm join restaurants r on r.id=rm.restaurant_id
                           where rm.user_id=$1 order by case rm.role when 'owner' then 0 when 'manager' then 1 when 'editor' then 2 else 3 end limit 1`, [userId]);
  return result.rows[0] || null;
}

const roleRank = { viewer: 0, editor: 1, manager: 2, owner: 3 };
function requireRole(session, membership, minimum = 'viewer') {
  if (!session) { const e = new Error('Authentication required.'); e.statusCode = 401; throw e; }
  if (!membership || (roleRank[membership.role] ?? -1) < (roleRank[minimum] ?? 0)) { const e = new Error('Insufficient permissions.'); e.statusCode = 403; throw e; }
}

async function requireAdminContext(request, minimum = 'viewer') {
  const session = await getSession(request);
  const membership = session ? await getMembership(session.user_id) : null;
  requireRole(session, membership, minimum);
  return { session, membership };
}

async function requireCsrf(request) {
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return;
  const csrfCookie = request.cookies[CSRF_COOKIE];
  const csrfHeader = request.headers['x-csrf-token'];
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    const e = new Error('CSRF token missing or invalid.'); e.statusCode = 403; throw e;
  }
  const session = await getSession(request);
  if (!session) return;
  const result = await db('select csrf_hash from sessions where id=$1', [session.id]);
  if (!result.rows[0] || result.rows[0].csrf_hash !== sha256(csrfHeader)) {
    const e = new Error('CSRF token invalid.'); e.statusCode = 403; throw e;
  }
}

async function audit(membership, userId, action, entityType, entityId, metadata = {}) {
  await db(`insert into audit_logs(restaurant_id, actor_user_id, action, entity_type, entity_id, metadata)
            values($1,$2,$3,$4,$5,$6::jsonb)`, [membership?.restaurant_id || null, userId || null, action, entityType || null, entityId || null, JSON.stringify(metadata)]);
}

await app.register(cookie);
await app.register(helmet, { contentSecurityPolicy: false, crossOriginEmbedderPolicy: false });
await app.register(rateLimit, { max: 100, timeWindow: '1 minute', keyGenerator: req => req.ip });
await app.register(fastifyStatic, { root, prefix: '/', index: ['index.html'] });

app.addHook('preHandler', async (request) => {
  await requireCsrf(request);
});

app.setErrorHandler(sendError);

app.get('/api/health', async (request, reply) => {
  try {
    await db('select 1');
    return reply.send(ok({ status: 'ok', service: 'romano-api' }, request.id));
  } catch (error) { return reply.code(503).send(fail('DB_UNAVAILABLE', 'Database unavailable.', request.id, 503)); }
});

app.get('/api/auth/csrf', async (request, reply) => {
  let token = request.cookies[CSRF_COOKIE];
  if (!token) { token = randomToken(24); reply.setCookie(CSRF_COOKIE, token, csrfCookieBase); }
  return reply.send(ok({ csrfToken: token }, request.id));
});

const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128) });
app.post('/api/auth/login', { config: { rateLimit: { max: 8, timeWindow: '10 minutes' } } }, async (request, reply) => {
  const input = loginSchema.parse(request.body);
  const result = await db('select id,email,display_name,password_hash,active from users where email=$1', [input.email.toLowerCase()]);
  const user = result.rows[0];
  if (!user?.active || !user.password_hash || !(await argon2.verify(user.password_hash, input.password))) {
    return reply.code(401).send(fail('INVALID_CREDENTIALS', 'Email or password is incorrect.', request.id, 401));
  }
  await db('delete from sessions where expires_at<=now() or user_id=$1', [user.id]);
  const token = randomToken(32);
  const csrf = randomToken(24);
  const expires = new Date(Date.now() + SESSION_TTL * 1000);
  await db('insert into sessions(user_id,session_hash,csrf_hash,expires_at) values($1,$2,$3,$4)', [user.id, sha256(token), sha256(csrf), expires]);
  reply.setCookie(SESSION_COOKIE, token, { ...cookieBase, maxAge: SESSION_TTL });
  reply.setCookie(CSRF_COOKIE, csrf, { ...csrfCookieBase, maxAge: SESSION_TTL });
  return reply.send(ok({ user: { id: user.id, email: user.email, displayName: user.display_name } }, request.id));
});

app.post('/api/auth/logout', async (request, reply) => {
  const token = request.cookies[SESSION_COOKIE];
  if (token) await db('delete from sessions where session_hash=$1', [sha256(token)]);
  reply.clearCookie(SESSION_COOKIE, cookieBase);
  reply.clearCookie(CSRF_COOKIE, csrfCookieBase);
  return reply.send(ok({ loggedOut: true }, request.id));
});

app.get('/api/auth/me', async (request, reply) => {
  const session = await getSession(request);
  if (!session) return reply.send(ok(null, request.id));
  const membership = await getMembership(session.user_id);
  return reply.send(ok({ user: { id: session.user_id, email: session.email, displayName: session.display_name }, membership }, request.id));
});

const menuQuery = `select r.id restaurant_id, r.slug, r.name restaurant_name, r.tagline, r.description, r.logo_url, r.instagram_url, r.phone, r.address, r.timezone, r.currency,
coalesce(jsonb_agg(distinct jsonb_build_object('id', c.id, 'slug', c.slug, 'name', ct.name, 'image', c.image_url, 'sortOrder', c.sort_order)) filter (where c.id is not null), '[]') categories,
coalesce(jsonb_agg(distinct jsonb_build_object('id', p.id, 'slug', p.slug, 'name', pt.name, 'description', pt.description, 'badge', pt.badge_label, 'category', p.slug, 'categoryId', p.category_id, 'image', p.image_url, 'price', p.price, 'rating', p.rating, 'featured', p.featured, 'active', p.active, 'sortOrder', p.sort_order)) filter (where p.id is not null), '[]') products
from restaurants r left join categories c on c.restaurant_id=r.id and c.active=true
left join category_translations ct on ct.category_id=c.id and ct.language_code=$2
left join products p on p.restaurant_id=r.id and p.active=true and p.category_id=c.id
left join product_translations pt on pt.product_id=p.id and pt.language_code=$2
where r.slug=$1 and r.published=true group by r.id`;

app.get('/api/public/menu/:slug', async (request, reply) => {
  const lang = ALLOWED_LANGS.includes(request.query?.lang) ? request.query.lang : 'fa';
  const result = await db(menuQuery, [request.params.slug, lang]);
  const row = result.rows[0];
  if (!row) return reply.code(404).send(fail('MENU_NOT_FOUND', 'Restaurant menu not found.', request.id, 404));
  return reply.send(ok({ restaurant: row, categories: row.categories || [], products: row.products || [] }, request.id));
});

async function tenantData(membership) {
  const [restaurant, categories, products] = await Promise.all([
    db('select * from restaurants where id=$1', [membership.restaurant_id]),
    db(`select c.*, coalesce(jsonb_agg(jsonb_build_object('language',ct.language_code,'name',ct.name)) filter (where ct.language_code is not null), '[]') translations
        from categories c left join category_translations ct on ct.category_id=c.id
        where c.restaurant_id=$1 group by c.id order by c.sort_order,c.created_at`, [membership.restaurant_id]),
    db(`select p.*, c.slug category_slug, coalesce(jsonb_agg(jsonb_build_object('language',pt.language_code,'name',pt.name,'description',pt.description,'badge',pt.badge_label)) filter (where pt.language_code is not null), '[]') translations
        from products p left join categories c on c.id=p.category_id left join product_translations pt on pt.product_id=p.id
        where p.restaurant_id=$1 group by p.id,c.slug order by p.sort_order,p.created_at`, [membership.restaurant_id])
  ]);
  const r = restaurant.rows[0] || {};
  const pickTranslation = (translations, key, fallback='') => translations?.find(t => t.language === 'fa')?.[key] || fallback;
  const categoryNameById = new Map(categories.rows.map(c => [c.id, pickTranslation(c.translations, 'name', c.slug)]));
  return {
    restaurant: { id: r.id, name: r.name, tagline: r.tagline || '', description: r.description || '', logo_url: r.logo_url || '', instagram: r.instagram_url || '', phone: r.phone || '', address: r.address || '', timezone: r.timezone, currency: r.currency },
    categories: categories.rows.map(c => ({ id: c.slug, name: pickTranslation(c.translations, 'name', c.slug), image: c.image_url || '', active: c.active, sortOrder: c.sort_order, translations: c.translations })),
    products: products.rows.map(p => ({ id: p.slug, name: pickTranslation(p.translations, 'name', p.slug), category: p.category_slug || '', categoryName: categoryNameById.get(p.category_id) || '', image: p.image_url || '', description: pickTranslation(p.translations, 'description', ''), price: Number(p.price), rating: Number(p.rating || 0), badge: pickTranslation(p.translations, 'badge', ''), featured: p.featured, active: p.active, sortOrder: p.sort_order, translations: p.translations }))
  };
}

app.get('/api/admin/data', async (request, reply) => {
  const { membership } = await requireAdminContext(request, 'viewer');
  return reply.send(ok(await tenantData(membership), request.id));
});

const snapshotSchema = z.object({
  restaurant: z.object({ name: z.string().min(1).max(120), tagline: z.string().max(180).optional().default(''), description: z.string().max(1200).optional().default(''), phone: z.string().max(40).optional().default(''), address: z.string().max(500).optional().default(''), instagram: z.string().url().or(z.literal('')).optional().default(''), currency: z.string().max(10).optional() }).optional(),
  categories: z.array(z.object({ id: z.string().min(1).max(100), name: z.string().min(1).max(120), image: z.string().max(5000).optional().default(''), sortOrder: z.number().int().min(0).max(100000).optional().default(0), active: z.boolean().optional().default(true) })).max(500),
  products: z.array(z.object({ id: z.string().min(1).max(100), name: z.string().min(1).max(160), category: z.string().min(1).max(100), image: z.string().max(5000).optional().default(''), description: z.string().max(2500).optional().default(''), price: z.number().min(0).max(100000000000), rating: z.union([z.number().min(0).max(5), z.string()]).optional().default(0), badge: z.string().max(80).optional().default(''), featured: z.boolean().optional().default(false), active: z.boolean().optional().default(true), sortOrder: z.number().int().min(0).max(100000).optional().default(0) })).max(2000)
});

function cleanImageForDB(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^data:/i.test(raw)) return null; // local preview data must move to object storage in production
  try { const url = new URL(raw, 'http://romano.invalid'); if (!['http:','https:','file:'].includes(url.protocol)) return null; } catch { return null; }
  return raw.slice(0, 5000);
}

app.put('/api/admin/snapshot', async (request, reply) => {
  const { session, membership } = await requireAdminContext(request, 'editor');
  const input = snapshotSchema.parse(request.body);
  const client = await pool.connect();
  try {
    await client.query('begin');
    if (input.restaurant) {
      await client.query(`update restaurants set name=$1,tagline=$2,description=$3,phone=$4,address=$5,instagram_url=$6,currency=coalesce($7,currency),updated_at=now() where id=$8`, [input.restaurant.name,input.restaurant.tagline,input.restaurant.description,input.restaurant.phone,input.restaurant.address,input.restaurant.instagram||null,input.restaurant.currency||null,membership.restaurant_id]);
    }

    const categorySlugs = input.categories.map(c => slugify(c.id || c.name));
    const categoryIds = new Map();
    for (let i=0;i<input.categories.length;i++) {
      const c=input.categories[i]; const slug=categorySlugs[i];
      const result = await client.query(`insert into categories(restaurant_id,slug,image_url,sort_order,active) values($1,$2,$3,$4,$5)
        on conflict(restaurant_id,slug) do update set image_url=excluded.image_url,sort_order=excluded.sort_order,active=excluded.active,updated_at=now() returning id,slug`, [membership.restaurant_id,slug,cleanImageForDB(c.image),c.sortOrder,c.active]);
      categoryIds.set(c.id, result.rows[0].id);
      await client.query(`insert into category_translations(category_id,language_code,name) values($1,'fa',$2) on conflict(category_id,language_code) do update set name=excluded.name`, [result.rows[0].id,c.name]);
    }

    const productSlugs = input.products.map(p => slugify(p.id || p.name));
    for (let i=0;i<input.products.length;i++) {
      const p=input.products[i]; const slug=productSlugs[i]; const categoryId=categoryIds.get(p.category);
      if (!categoryId) continue;
      const rating = typeof p.rating === 'number' ? p.rating : Math.min(5, Math.max(0, (String(p.rating).match(/★/g)||[]).length));
      const result = await client.query(`insert into products(restaurant_id,category_id,slug,image_url,badge_code,rating,featured,active,sort_order) values($1,$2,$3,$4,$5,$6,$7,$8,$9)
        on conflict(restaurant_id,slug) do update set category_id=excluded.category_id,image_url=coalesce(excluded.image_url,products.image_url),badge_code=excluded.badge_code,rating=excluded.rating,featured=excluded.featured,active=excluded.active,sort_order=excluded.sort_order,updated_at=now() returning id`, [membership.restaurant_id,categoryId,slug,cleanImageForDB(p.image),p.badge||null,rating,p.featured,p.active,p.sortOrder]);
      await client.query(`insert into product_translations(product_id,language_code,name,description,badge_label) values($1,'fa',$2,$3,$4) on conflict(product_id,language_code) do update set name=excluded.name,description=excluded.description,badge_label=excluded.badge_label`, [result.rows[0].id,p.name,p.description||'',p.badge||'']);
    }

    // Do not hard-delete records during early rollout when the browser has an incomplete snapshot.
    await client.query('commit');
    await audit(membership, session.user_id, 'menu.snapshot.saved', 'restaurant', membership.restaurant_id, { categories: input.categories.length, products: input.products.length });
    return reply.send(ok({ saved: true, data: await tenantData(membership) }, request.id));
  } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
});

const settingsSchema = z.object({ name: z.string().min(1).max(120), tagline: z.string().max(180).optional().default(''), description: z.string().max(1200).optional().default(''), phone: z.string().max(40).optional().default(''), address: z.string().max(500).optional().default(''), instagram: z.string().url().or(z.literal('')).optional().default('') });
app.patch('/api/admin/settings', async (request, reply) => {
  const { session, membership } = await requireAdminContext(request, 'manager');
  const input = settingsSchema.parse(request.body);
  await db(`update restaurants set name=$1, tagline=$2, description=$3, phone=$4, address=$5, instagram_url=$6, updated_at=now() where id=$7`, [input.name, input.tagline, input.description, input.phone, input.address, input.instagram || null, membership.restaurant_id]);
  await audit(membership, session.user_id, 'restaurant.settings.updated', 'restaurant', membership.restaurant_id, { fields: Object.keys(input).filter(k => k !== 'instagram') });
  return reply.send(ok({ saved: true }, request.id));
});

const categorySchema = z.object({ id: z.string().uuid().optional(), name: z.string().min(1).max(120), slug: z.string().max(80).optional(), image: z.string().max(2000).optional().default(''), sortOrder: z.number().int().min(0).max(100000).optional().default(0), active: z.boolean().optional().default(true) });
app.post('/api/admin/categories', async (request, reply) => {
  const { session, membership } = await requireAdminContext(request, 'editor');
  const input = categorySchema.parse(request.body);
  const slug = slugify(input.slug || input.name);
  const client = await pool.connect();
  try {
    await client.query('begin');
    const c = await client.query(`insert into categories(restaurant_id,slug,image_url,sort_order,active) values($1,$2,$3,$4,$5) returning *`, [membership.restaurant_id, slug, input.image || null, input.sortOrder, input.active]);
    await client.query(`insert into category_translations(category_id,language_code,name) values($1,'fa',$2) on conflict (category_id,language_code) do update set name=excluded.name`, [c.rows[0].id, input.name]);
    await client.query('commit');
    await audit(membership, session.user_id, 'category.created', 'category', c.rows[0].id);
    return reply.code(201).send(ok(c.rows[0], request.id));
  } catch (e) { await client.query('rollback'); throw e; } finally { client.release(); }
});

app.patch('/api/admin/categories/:id', async (request, reply) => {
  const { session, membership } = await requireAdminContext(request, 'editor');
  const input = categorySchema.partial().parse(request.body);
  const exists = await db('select id from categories where id=$1 and restaurant_id=$2', [request.params.id, membership.restaurant_id]);
  if (!exists.rows[0]) return reply.code(404).send(fail('NOT_FOUND', 'Category not found.', request.id, 404));
  const current = (await db('select * from categories where id=$1', [request.params.id])).rows[0];
  const next = { ...current, ...input };
  const slug = slugify(next.slug || next.name);
  await db(`update categories set slug=$1,image_url=$2,sort_order=$3,active=$4,updated_at=now() where id=$5 and restaurant_id=$6`, [slug, next.image || null, next.sortOrder, next.active, request.params.id, membership.restaurant_id]);
  if (input.name) await db(`insert into category_translations(category_id,language_code,name) values($1,'fa',$2) on conflict(category_id,language_code) do update set name=excluded.name`, [request.params.id, input.name]);
  await audit(membership, session.user_id, 'category.updated', 'category', request.params.id, { fields: Object.keys(input) });
  return reply.send(ok({ updated: true }, request.id));
});

app.delete('/api/admin/categories/:id', async (request, reply) => {
  const { session, membership } = await requireAdminContext(request, 'manager');
  const attached = await db('select count(*)::int as count from products where category_id=$1 and restaurant_id=$2', [request.params.id, membership.restaurant_id]);
  if (attached.rows[0].count > 0) return reply.code(409).send(fail('CATEGORY_NOT_EMPTY', 'Move or delete products before deleting this category.', request.id, 409));
  const result = await db('delete from categories where id=$1 and restaurant_id=$2 returning id', [request.params.id, membership.restaurant_id]);
  if (!result.rows[0]) return reply.code(404).send(fail('NOT_FOUND', 'Category not found.', request.id, 404));
  await audit(membership, session.user_id, 'category.deleted', 'category', request.params.id);
  return reply.send(ok({ deleted: true }, request.id));
});

const productSchema = z.object({ name: z.string().min(1).max(160), categoryId: z.string().uuid(), slug: z.string().max(100).optional(), image: z.string().max(5000).optional().default(''), description: z.string().max(2500).optional().default(''), price: z.number().min(0).max(100000000000), rating: z.number().min(0).max(5).optional().default(0), badge: z.string().max(80).optional().default(''), featured: z.boolean().optional().default(false), active: z.boolean().optional().default(true), sortOrder: z.number().int().min(0).max(100000).optional().default(0) });
app.post('/api/admin/products', async (request, reply) => {
  const { session, membership } = await requireAdminContext(request, 'editor');
  const input = productSchema.parse(request.body);
  const cat = await db('select id from categories where id=$1 and restaurant_id=$2 and active=true', [input.categoryId, membership.restaurant_id]);
  if (!cat.rows[0]) return reply.code(422).send(fail('INVALID_CATEGORY', 'Category does not belong to this restaurant.', request.id, 422));
  const slug = slugify(input.slug || input.name);
  const client = await pool.connect();
  try {
    await client.query('begin');
    const p = await client.query(`insert into products(restaurant_id,category_id,slug,image_url,badge_code,rating,featured,active,sort_order) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`, [membership.restaurant_id,input.categoryId,slug,input.image||null,input.badge||null,input.rating,input.featured,input.active,input.sortOrder]);
    await client.query(`insert into product_translations(product_id,language_code,name,description,badge_label) values($1,'fa',$2,$3,$4)`, [p.rows[0].id,input.name,input.description,input.badge]);
    await client.query('commit');
    await audit(membership, session.user_id, 'product.created', 'product', p.rows[0].id);
    return reply.code(201).send(ok(p.rows[0], request.id));
  } catch(e){ await client.query('rollback'); throw e; } finally { client.release(); }
});

app.patch('/api/admin/products/:id', async (request, reply) => {
  const { session, membership } = await requireAdminContext(request, 'editor');
  const input = productSchema.partial().parse(request.body);
  const currentResult = await db('select * from products where id=$1 and restaurant_id=$2', [request.params.id, membership.restaurant_id]);
  const current = currentResult.rows[0];
  if (!current) return reply.code(404).send(fail('NOT_FOUND','Product not found.',request.id,404));
  const next = { ...current, ...input };
  const cat = await db('select id from categories where id=$1 and restaurant_id=$2', [next.categoryId, membership.restaurant_id]);
  if (!cat.rows[0]) return reply.code(422).send(fail('INVALID_CATEGORY','Category does not belong to this restaurant.',request.id,422));
  await db(`update products set category_id=$1,slug=$2,image_url=$3,badge_code=$4,rating=$5,featured=$6,active=$7,sort_order=$8,updated_at=now() where id=$9 and restaurant_id=$10`, [next.categoryId,slugify(next.slug||next.name),next.image||null,next.badge||null,next.rating,next.featured,next.active,next.sortOrder,request.params.id,membership.restaurant_id]);
  if (input.name || input.description !== undefined || input.badge !== undefined) {
    const tr = await db(`select name,description,badge_label from product_translations where product_id=$1 and language_code='fa'`, [request.params.id]);
    const t = tr.rows[0] || {};
    await db(`insert into product_translations(product_id,language_code,name,description,badge_label) values($1,'fa',$2,$3,$4) on conflict(product_id,language_code) do update set name=excluded.name,description=excluded.description,badge_label=excluded.badge_label`, [request.params.id,input.name||t.name||next.name,input.description!==undefined?input.description:t.description,input.badge!==undefined?input.badge:t.badge_label]);
  }
  await audit(membership, session.user_id, 'product.updated', 'product', request.params.id, { fields: Object.keys(input) });
  return reply.send(ok({ updated: true },request.id));
});

app.delete('/api/admin/products/:id', async (request, reply) => {
  const { session, membership } = await requireAdminContext(request, 'manager');
  const result = await db('delete from products where id=$1 and restaurant_id=$2 returning id', [request.params.id, membership.restaurant_id]);
  if (!result.rows[0]) return reply.code(404).send(fail('NOT_FOUND','Product not found.',request.id,404));
  await audit(membership, session.user_id, 'product.deleted', 'product', request.params.id);
  return reply.send(ok({ deleted: true },request.id));
});

// SPA/static fallback: the existing customer and admin UI remain untouched.
app.get('/admin', async (_request, reply) => reply.redirect('/admin/'));

app.addHook('onClose', async () => { await pool.end(); });

try {
  await app.listen({ host: process.env.HOST || '0.0.0.0', port: PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
