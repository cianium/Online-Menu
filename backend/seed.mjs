import 'dotenv/config';
import argon2 from 'argon2';
import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || 'change-this-password');
  if (password.length < 8) throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters.');
  const name = String(process.env.BOOTSTRAP_ADMIN_NAME || 'ROMANO Owner');
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const restaurant = await pool.query(`insert into restaurants(slug,name,tagline,description,currency) values('romano','ROMANO','Modern Italian Kitchen','Digital restaurant menu','IRR') on conflict(slug) do update set updated_at=now() returning id`);
  const user = await pool.query(`insert into users(email,display_name,password_hash) values($1,$2,$3) on conflict(email) do update set display_name=excluded.display_name,password_hash=excluded.password_hash,active=true returning id`, [email, name, hash]);
  await pool.query(`insert into restaurant_memberships(restaurant_id,user_id,role) values($1,$2,'owner') on conflict(restaurant_id,user_id) do update set role='owner'`, [restaurant.rows[0].id, user.rows[0].id]);

  // Promote the checked-in frontend seed into PostgreSQL so a fresh install is immediately usable.
  const source = await fs.readFile(path.resolve(__dirname, '../js/data.js'), 'utf8');
  const sandbox = {}; vm.createContext(sandbox);
  vm.runInContext(`${source}\nthis.__seed={restaurantData,categories,products};`, sandbox, { timeout: 1000 });
  const seed = sandbox.__seed;
  const client = await pool.connect();
  try {
    await client.query('begin');
    for (let i=0;i<seed.categories.length;i++) {
      const c=seed.categories[i];
      const cr=await client.query(`insert into categories(restaurant_id,slug,image_url,sort_order,active) values($1,$2,$3,$4,true) on conflict(restaurant_id,slug) do update set image_url=excluded.image_url,sort_order=excluded.sort_order,active=true returning id`, [restaurant.rows[0].id,String(c.id),String(c.image||''),i]);
      await client.query(`insert into category_translations(category_id,language_code,name) values($1,'fa',$2) on conflict(category_id,language_code) do update set name=excluded.name`, [cr.rows[0].id,String(c.name)]);
    }
    for (let i=0;i<seed.products.length;i++) {
      const item=seed.products[i];
      const cr=await client.query(`select id from categories where restaurant_id=$1 and slug=$2`, [restaurant.rows[0].id,String(item.category)]);
      if (!cr.rows[0]) continue;
      const pr=await client.query(`insert into products(restaurant_id,category_id,slug,price,image_url,rating,featured,active,sort_order) values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(restaurant_id,slug) do update set category_id=excluded.category_id,price=excluded.price,image_url=excluded.image_url,rating=excluded.rating,featured=excluded.featured,active=excluded.active,sort_order=excluded.sort_order,updated_at=now() returning id`, [restaurant.rows[0].id,cr.rows[0].id,String(item.id),Number(item.price)||0,String(item.image||''),Math.min(5,(String(item.rating||'').match(/★/g)||[]).length),item.featured===true,item.active!==false,i]);
      await client.query(`insert into product_translations(product_id,language_code,name,description,badge_label) values($1,'fa',$2,$3,$4) on conflict(product_id,language_code) do update set name=excluded.name,description=excluded.description,badge_label=excluded.badge_label`, [pr.rows[0].id,String(item.name),String(item.description||''),String(item.badge||'')]);
    }
    await client.query('commit');
  } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
  console.log(`ROMANO seeded. Admin: ${email}`);
} finally { await pool.end(); }
