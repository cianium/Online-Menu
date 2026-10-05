import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is required.'); process.exit(1); }

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  await pool.query('create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())');
  const applied = new Set((await pool.query('select version from schema_migrations')).rows.map(row => row.version));
  const files = (await fs.readdir(dir)).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into schema_migrations(version) values($1)', [file]);
      await client.query('commit');
      console.log(`applied ${file}`);
    } catch (error) {
      await client.query('rollback');
      throw new Error(`Migration ${file} failed: ${error.message}`);
    } finally { client.release(); }
  }
  console.log('Database is up to date.');
} finally { await pool.end(); }
