-- 003 — track where each translation came from, so auto-translation never overwrites a human edit
--   source : text typed by the admin in this language
--   manual : explicit translation entered by an admin (never overwritten automatically)
--   seed   : curated demo translation (replaced when the source text changes)
--   auto   : machine translation (replaced when the source text changes)
alter table product_translations    add column if not exists origin text not null default 'source' check (origin in ('source','manual','seed','auto'));
alter table category_translations   add column if not exists origin text not null default 'source' check (origin in ('source','manual','seed','auto'));
alter table restaurant_translations add column if not exists origin text not null default 'source' check (origin in ('source','manual','seed','auto'));

-- Existing non-Persian rows were curated seed text; Persian rows are the original text.
update product_translations    set origin = 'seed' where language_code <> 'fa' and origin = 'source';
update category_translations   set origin = 'seed' where language_code <> 'fa' and origin = 'source';
update restaurant_translations set origin = 'seed' where language_code <> 'fa' and origin = 'source';

-- Hash of the text an admin last typed; detects real edits (and ignores re-saves of an unchanged form).
alter table products   add column if not exists source_hash text;
alter table categories add column if not exists source_hash text;
