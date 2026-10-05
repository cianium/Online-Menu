-- 004 — restaurant-level source hash (same purpose as products/categories in 003)
alter table restaurants add column if not exists source_hash text;
