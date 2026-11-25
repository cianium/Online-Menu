#!/usr/bin/env bash
# Create and verify a private Git history bundle; never push, upload or modify remote refs.
set -euo pipefail
umask 077
if [[ $# -ne 2 ]]; then printf 'Usage: %s SOURCE DESTINATION_NEW_DIRECTORY\n' "$0" >&2; exit 2; fi
source_repo=$1
if [[ "$source_repo" == -* ]]; then echo 'Invalid source' >&2; exit 2; fi
dest=$2
mkdir -- "$dest"
dest=$(cd -- "$dest" && pwd -P)
work=$(mktemp -d "$dest/.verify-XXXXXX")
trap 'rm -rf -- "$work"' EXIT
# Record only branch/tag refs for the stable advertised-source comparison.
remote_refs() { git ls-remote --refs --heads --tags "$source_repo" | LC_ALL=C sort -k2; }
remote_refs > "$work/before.tsv"
test -s "$work/before.tsv"
git clone --mirror -- "$source_repo" "$work/mirror.git"
git -C "$work/mirror.git" fsck --full --no-dangling
remote_refs > "$work/after.tsv"
cmp "$work/before.tsv" "$work/after.tsv"
git -C "$work/mirror.git" for-each-ref --format='%(objectname)%09%(refname)' refs/heads refs/tags | LC_ALL=C sort -k2 > "$work/mirror.tsv"
cmp "$work/before.tsv" "$work/mirror.tsv"
git -C "$work/mirror.git" bundle create "$work/repository.bundle" --all
git -C "$work/mirror.git" bundle verify "$work/repository.bundle"
git clone --mirror -- "$work/repository.bundle" "$work/restored.git"
git -C "$work/restored.git" fsck --full --no-dangling
for repo in mirror restored; do
  git -C "$work/$repo.git" for-each-ref --format='%(objectname)%09%(refname)' | LC_ALL=C sort -k2 > "$work/$repo-all.tsv"
done
cmp "$work/mirror-all.tsv" "$work/restored-all.tsv"
# Git bundles record refs and history, not repository settings or secrets.
headref=$(git -C "$work/mirror.git" symbolic-ref -q HEAD || true)
if [[ -n "$headref" ]]; then
  git -C "$work/restored.git" symbolic-ref HEAD "$headref"
  test "$(git -C "$work/mirror.git" rev-parse HEAD)" = "$(git -C "$work/restored.git" rev-parse HEAD)"
fi
printf '%s\n' "$headref" > "$work/HEAD.txt"
# Move verified outputs into the new private directory only after all checks pass.
mv -- "$work/repository.bundle" "$work/mirror-all.tsv" "$work/HEAD.txt" "$dest/"
(cd -- "$dest" && sha256sum repository.bundle mirror-all.tsv HEAD.txt > SHA256SUMS && sha256sum -c SHA256SUMS)
printf 'BACKUP VERIFIED branches=%s tags=%s total_refs=%s\n' "$(grep -c $'\trefs/heads/' "$work/mirror.tsv" || true)" "$(grep -c $'\trefs/tags/' "$work/mirror.tsv" || true)" "$(wc -l < "$dest/mirror-all.tsv")"
