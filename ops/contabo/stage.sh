#!/usr/bin/env bash
set -euo pipefail
umask 077

release_dir="$(cd "$(dirname "$0")" && pwd -P)"
case "$release_dir" in /dev/shm/chineseos-*) ;; *) exit 64;; esac
test "$(id -un)" = codex-account2
cd "$release_dir"
base="$HOME/chineseos-vps-test/20261108-v105-ui"
live="$base/source"
candidate="$release_dir/source"
dependencies="$base/runtime-dependencies/node_modules"
source_sha="$(jq -er '.sourceCommit | select(test("^[a-f0-9]{40}$"))' PACKAGE-RECEIPT.json)"
base_sha="$(jq -er '.baseSource | select(test("^[a-f0-9]{40}$"))' PACKAGE-RECEIPT.json)"
base_release="$(jq -er '.baseLiveRelease | select(test("^r-[a-f0-9]{64}$"))' PACKAGE-RECEIPT.json)"
digest="$(jq -er '.sha256 | select(test("^[a-f0-9]{64}$"))' PACKAGE-RECEIPT.json)"
worker_port=18967
gateway_port=18968

test "$(git -C "$live" rev-parse HEAD)" = "$base_sha"
test "$(sha256sum source.bundle | cut -d' ' -f1)" = "$digest"
test -d "$dependencies/wrangler"
test ! -e "$candidate"
test -z "$(ss -ltnH "sport = :$worker_port or sport = :$gateway_port")"
curl -fsS --max-time 15 https://chineseos.l00p.network/__vps/release.json |
  jq -e --arg sha "$base_sha" --arg release "$base_release" '.source==$sha and .release==$release and .sentenceAudio and .readingLabQwen' >/dev/null

git -C "$live" bundle verify "$release_dir/source.bundle"
git clone -q --local --no-hardlinks --no-checkout "$live" "$candidate"
git -C "$candidate" fetch --no-tags "$release_dir/source.bundle" "$source_sha"
test "$(git -C "$candidate" rev-parse FETCH_HEAD)" = "$source_sha"
git -C "$candidate" merge-base --is-ancestor "$base_sha" "$source_sha"
git -C "$candidate" checkout -q --detach "$source_sha"
git -C "$candidate" diff --check "$base_sha"..HEAD
cmp "$live/package-lock.json" "$candidate/package-lock.json"
cp -p "$live/wrangler.vps-local.json" "$candidate/"
ln -s "$dependencies" "$candidate/node_modules"

export WRANGLER_SEND_METRICS=false CLOUDFLARE_CF_FETCH_ENABLED=false WRANGLER_WRITE_LOGS=false
cd "$candidate"
npm run build > "$release_dir/build.log" 2>&1 || { tail -n 24 "$release_dir/build.log"; exit 1; }
rg -q '"missingRequiredImports":0' "$release_dir/build.log"
test -s dist/server/index.js

worker_pid=''
gateway_pid=''
on_error() {
  local status=$?
  if ((status != 0)); then
    for pid in "$worker_pid" "$gateway_pid"; do
      if [[ -n "$pid" ]] && [[ "$(readlink "/proc/$pid/cwd" 2>/dev/null || true)" == "$candidate" ]]; then
        kill "$pid" 2>/dev/null || true
      fi
    done
  fi
  return "$status"
}
trap on_error EXIT

export WRANGLER_REGISTRY_PATH="$candidate/.wrangler/stage-registry"
export MINIFLARE_REGISTRY_PATH="$candidate/.wrangler/stage-miniflare"
nohup node node_modules/wrangler/bin/wrangler.js dev --config wrangler.vps-local.json --local \
  --persist-to .wrangler/stage-state --ip 127.0.0.1 --port "$worker_port" --inspector-port 0 \
  --log-level warn > "$release_dir/worker.log" 2>&1 </dev/null &
worker_pid=$!
printf '%s\n' "$worker_pid" > "$release_dir/worker.pid"

mkdir "$release_dir/gateway"
cp "$base/runtime-compat.js" "$release_dir/gateway/"
python3 - "$release_dir" "$base" "$source_sha" "$digest" "$base_release" "$worker_port" "$gateway_port" <<'PY'
import json
from pathlib import Path
import re
import sys

stage, base = map(Path, sys.argv[1:3])
source, digest, previous, worker_port, gateway_port = sys.argv[3:]
old = (base/'gateway.mjs').read_text()
match = re.search(r'const publicRelease=(.*?);', old)
manifest = json.loads(match[1])
assert manifest['release'] == previous
manifest.update(source=source, release='r-'+digest)
gateway = old[:match.start(1)] + json.dumps(manifest) + old[match.end(1):]
assert '18766' in gateway and '18765' in gateway
(stage/'gateway/gateway.mjs').write_text(gateway.replace('18766',worker_port).replace('18765',gateway_port))
PY
nohup node "$release_dir/gateway/gateway.mjs" > "$release_dir/gateway.log" 2>&1 </dev/null &
gateway_pid=$!
printf '%s\n' "$gateway_pid" > "$release_dir/gateway.pid"

for _ in $(seq 1 35); do
  if curl -fsS --max-time 8 "http://127.0.0.1:$gateway_port/?notebook=1" > "$release_dir/notebook.html"; then
    if grep -q '/__vps/runtime-compat.js' "$release_dir/notebook.html"; then break; fi
  fi
  kill -0 "$worker_pid" "$gateway_pid"
  sleep 1
done
grep -q '/__vps/runtime-compat.js' "$release_dir/notebook.html"
curl -fsS --max-time 15 "http://127.0.0.1:$gateway_port/__vps/release.json" |
  tee "$release_dir/STAGED.json" |
  jq -e --arg sha "$source_sha" --arg release "r-$digest" '.source==$sha and .release==$release and .sentenceAudio and .readingLabQwen' >/dev/null
printf 'Staged %s using RAM. Worker %s, gateway %s.\n' "$source_sha" "$worker_pid" "$gateway_pid"
