import 'dotenv/config';
import argon2 from 'argon2';
import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { cleanImageUrl } from './lib/security.mjs';
import { hashFields } from './lib/translations.mjs';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LANGS = ['en', 'tr', 'ar'];

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is required. Run `npm run migrate` first.'); process.exit(1); }

const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '');
if (!email || password.length < 12) {
  console.error('Set BOOTSTRAP_ADMIN_EMAIL and a BOOTSTRAP_ADMIN_PASSWORD of at least 12 characters (no default is provided on purpose).');
  process.exit(1);
}
const adminName = String(process.env.BOOTSTRAP_ADMIN_NAME || 'ROMANO Owner');

/** Read the checked-in demo content (Persian canonical text + en/tr/ar dictionaries) without executing the browser app. */
async function loadSeed() {
  const data = await fs.readFile(path.resolve(__dirname, '../js/data.js'), 'utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${data}\nthis.__seed={restaurantData,categories,products};`, sandbox, { timeout: 1000 });

  const i18n = await fs.readFile(path.resolve(__dirname, '../js/i18n.js'), 'utf8');
  const grab = name => {
    const match = new RegExp(`const ${name} = (\\{[\\s\\S]*?\\n    \\});`).exec(i18n);
    if (!match) throw new Error(`Cannot find "${name}" in js/i18n.js`);
    return vm.runInContext(`(${match[1]})`, vm.createContext({}), { timeout: 1000 });
  };
  return { ...sandbox.__seed, categoryText: grab('categoryText'), productText: grab('products'), restaurantText: grab('restaurant'), badgeText: grab('badgeText') };
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const seed = await loadSeed();
  const client = await pool.connect();
  try {
    await client.query('begin');

    const restaurant = (await client.query(
      `insert into restaurants(slug, name, tagline, description, phone, address, currency)
       values('romano', $1, $2, $3, $4, $5, 'IRR')
       on conflict(slug) do update set slug = excluded.slug returning id`,
      [seed.restaurantData.name, seed.restaurantData.tagline, seed.restaurantData.description, seed.restaurantData.phone || '', seed.restaurantData.address || ''])).rows[0].id;

    for (const lang of LANGS) {
      const t = k => seed.restaurantText?.[k]?.[lang] || null;
      await client.query(
        `insert into restaurant_translations(restaurant_id, language_code, name, tagline, description, address, origin) values($1,$2,$3,$4,$5,$6,'seed')
         on conflict(restaurant_id, language_code) do nothing`, [restaurant, lang, t('name'), t('tagline'), t('description'), t('address')]);
    }

    // Record the seeded Persian text as "already translated" so automatic translation never replaces the curated rows.
    await client.query('update restaurants set source_hash = $2 where id = $1 and source_hash is null',
      [restaurant, hashFields('restaurant', { name: seed.restaurantData.name, tagline: seed.restaurantData.tagline, description: seed.restaurantData.description, address: seed.restaurantData.address || '' })]);

    // The bootstrap account is created once. Re-running the seed never resets an existing password.
    let user = (await client.query('select id from users where lower(email) = $1', [email])).rows[0];
    if (!user) {
      const hash = await argon2.hash(password, { type: argon2.argon2id });
      user = (await client.query('insert into users(email, display_name, password_hash) values($1,$2,$3) returning id', [email, adminName, hash])).rows[0];
      console.log(`Created admin user ${email}`);
    } else {
      console.log(`Admin user ${email} already exists — password left unchanged.`);
    }
    await client.query(
      `insert into restaurant_memberships(restaurant_id, user_id, role) values($1,$2,'owner')
       on conflict(restaurant_id, user_id) do update set role = 'owner'`, [restaurant, user.id]);

    const categoryIds = new Map();
    for (let i = 0; i < seed.categories.length; i += 1) {
      const c = seed.categories[i];
      const row = await client.query(
        `insert into categories(restaurant_id, slug, image_url, sort_order, active) values($1,$2,$3,$4,true)
         on conflict(restaurant_id, slug) do update set sort_order = excluded.sort_order returning id`,
        [restaurant, String(c.id), cleanImageUrl(c.image), i]);
      categoryIds.set(String(c.id), row.rows[0].id);
      await client.query('update categories set source_hash = $2 where id = $1 and source_hash is null', [row.rows[0].id, hashFields('category', { name: String(c.name) })]);
      await client.query(
        `insert into category_translations(category_id, language_code, name) values($1,'fa',$2)
         on conflict(category_id, language_code) do nothing`, [row.rows[0].id, String(c.name)]);
      for (const lang of LANGS) {
        const name = seed.categoryText?.[c.id]?.[lang];
        if (name) await client.query(
          `insert into category_translations(category_id, language_code, name, origin) values($1,$2,$3,'seed')
           on conflict(category_id, language_code) do nothing`, [row.rows[0].id, lang, name]);
      }
    }

    for (let i = 0; i < seed.products.length; i += 1) {
      const p = seed.products[i];
      const categoryId = categoryIds.get(String(p.category));
      if (!categoryId) continue;
      const stars = (String(p.rating || '').match(/★/g) || []).length;
      const row = await client.query(
        `insert into products(restaurant_id, category_id, slug, price, image_url, badge_code, rating, featured, active, sort_order)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         on conflict(restaurant_id, slug) do update set sort_order = excluded.sort_order returning id`,
        [restaurant, categoryId, String(p.id), Number(p.price) || 0, cleanImageUrl(p.image), p.badge || null, Math.min(5, stars), p.featured === true, p.active !== false, i]);
      await client.query(
        `insert into product_translations(product_id, language_code, name, description, badge_label) values($1,'fa',$2,$3,$4)
         on conflict(product_id, language_code) do nothing`, [row.rows[0].id, String(p.name), String(p.description || ''), String(p.badge || '')]);
      await client.query('update products set source_hash = $2 where id = $1 and source_hash is null',
        [row.rows[0].id, hashFields('product', { name: String(p.name), description: String(p.description || ''), badge: String(p.badge || '') })]);
      const text = seed.productText?.[p.id] || {};
      for (const lang of LANGS) {
        const name = text.name?.[lang];
        if (!name) continue;
        const badge = p.badge ? (text.badge?.[lang] || seed.badgeText?.[p.badge]?.[lang] || '') : '';
        await client.query(
          `insert into product_translations(product_id, language_code, name, description, badge_label, origin) values($1,$2,$3,$4,$5,'seed')
           on conflict(product_id, language_code) do nothing`, [row.rows[0].id, lang, name, text.description?.[lang] || '', badge]);
      }
    }

    await client.query('commit');
    console.log(`ROMANO seeded: ${seed.categories.length} categories, ${seed.products.length} products, 4 languages.`);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
