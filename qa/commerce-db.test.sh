#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
project_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
qa_container="online-menu-vq3-postgres-qa-$$"

case "$qa_container" in
  online-menu-vq3-postgres-qa-[0-9]*) ;;
  *) exit 2 ;;
esac

cleanup() {
  docker stop "$qa_container" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker run --rm -d \
  --name "$qa_container" \
  -e POSTGRES_PASSWORD=qa-password \
  -e POSTGRES_DB=online_menu_qa \
  -v "$project_root/supabase/migrations:/migrations:ro" \
  -v "$project_root/qa/sql:/qa:ro" \
  postgres:17-alpine >/dev/null

ready=0
attempt=1
while [ "$attempt" -le 30 ]; do
  if docker exec "$qa_container" \
    psql -U postgres -d online_menu_qa -Atqc 'select 1' >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
  attempt=$((attempt + 1))
done

if [ "$ready" -ne 1 ]; then
  docker logs "$qa_container" --tail 80
  exit 3
fi

docker exec "$qa_container" sh -c '
  set -e
  psql -v ON_ERROR_STOP=1 -U postgres -d online_menu_qa -f /qa/supabase-base-fixture.sql >/dev/null
  for migration in \
    /migrations/20261019152757_romano_order_core.sql \
    /migrations/20261019160240_romano_order_create.sql \
    /migrations/20261019175840_romano_commerce_ops.sql \
    /migrations/20261020120708_harden_payment_invariants.sql
  do
    psql -v ON_ERROR_STOP=1 -U postgres -d online_menu_qa -f "$migration" >/dev/null
  done
  psql -v ON_ERROR_STOP=1 -U postgres -d online_menu_qa -f /qa/commerce-smoke.sql
'
