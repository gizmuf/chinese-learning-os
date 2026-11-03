#!/usr/bin/env bash
# Execute only through an existing authorized HK admin channel, after preflight review.
set -euo pipefail
umask 022
: "${CHINESEOS_NGINX_CONFIG:?Set the verified existing nginx server config path}"
: "${CHINESEOS_ARCHIVE:?Set the uploaded verified static archive path}"
: "${CHINESEOS_ARCHIVE_SHA256:?Set the delivery receipt SHA256}"
CHINESEOS_NGINX_CONFIG=$(readlink -f "$CHINESEOS_NGINX_CONFIG")
[[ "$CHINESEOS_NGINX_CONFIG" == /etc/nginx/* ]]
release=v72-hk2-lesson10
base=/var/www/chineseos
expected=$base/releases/v72-hk2
current=$(readlink -f "$base/current")
[[ "$current" == "$expected" ]] || { echo 'Current release changed; reconcile first.' >&2; exit 1; }
[[ "$(sha256sum "$CHINESEOS_ARCHIVE" | cut -d' ' -f1)" == "$CHINESEOS_ARCHIVE_SHA256" ]]
[[ -f "$CHINESEOS_NGINX_CONFIG" && ! -e "$base/releases/$release" ]]
lookup_pid=$(systemctl show -p MainPID --value chineseos-lookup.service)
[[ "$lookup_pid" -gt 0 && "$(readlink -f "/proc/$lookup_pid/cwd")" == /home/ecs-assist-user/chineseos-v70 ]]
[[ "$(tr '\0' ' ' < "/proc/$lookup_pid/cmdline")" == *'/opt/chineseos-lookup/v70/lookup.mjs'* ]]
nginx -t
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup=$base/backups/lesson10-$stamp
mkdir -p "$backup" "$base/releases/$release" /etc/nginx/snippets
chmod 700 "$backup"
cp -a "$CHINESEOS_NGINX_CONFIG" "$backup/nginx.conf"
tar -czf "$backup/previous-static.tar.gz" -C "$current" .
tar -tzf "$backup/previous-static.tar.gz" > "$backup/previous-static-files.txt"
sha256sum "$backup/previous-static.tar.gz" > "$backup/previous-static.sha256"
printf '%s\n' "$current" > "$backup/previous-release"
for snippet in chineseos-lesson10-maps.conf chineseos-lesson10-location.conf; do
 if [[ -e /etc/nginx/snippets/$snippet ]]; then cp -a "/etc/nginx/snippets/$snippet" "$backup/original-$snippet"; fi
done
# Archive contains only approved public frontend files and two nginx snippets.
python3 - "$CHINESEOS_ARCHIVE" "$base/releases/$release" "$backup" <<'PY'
import tarfile,sys,pathlib
archive,dest,backup=sys.argv[1:]
with tarfile.open(archive,'r:gz') as t:
 for m in t.getmembers():
  p=pathlib.PurePosixPath(m.name)
  if p.is_absolute() or '..' in p.parts or m.issym() or m.islnk() or not (m.isfile() or m.isdir()):raise SystemExit('Unsafe archive member')
  if not (m.name.startswith('public/') or m.name in ['nginx/lesson10-maps.conf','nginx/lesson10-location.conf'] or m.isdir() and m.name in ['public','nginx']):raise SystemExit('Unexpected package path')
 for m in t.getmembers():
  if not m.isfile():continue
  if m.name.startswith('public/'):target=pathlib.Path(dest)/m.name.removeprefix('public/')
  else:target=pathlib.Path(backup)/('incoming-'+pathlib.PurePosixPath(m.name).name)
  target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(t.extractfile(m).read());target.chmod(0o644)
PY
[[ -s "$base/releases/$release/release.json" && -s "$base/releases/$release/index.html" ]]
# Keep hashed assets requested by a browser that loaded the previous release.
cp -an "$current/assets/." "$base/releases/$release/assets/"
# Prepare rollback BEFORE any active configuration changes.
cat > "$backup/rollback.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cp -a '$backup/nginx.conf' '$CHINESEOS_NGINX_CONFIG'
for snippet in chineseos-lesson10-maps.conf chineseos-lesson10-location.conf; do
 if [[ -f '$backup/original-'\$snippet ]]; then cp -a '$backup/original-'\$snippet /etc/nginx/snippets/\$snippet; else rm -f /etc/nginx/snippets/\$snippet; fi
done
ln -s '$current' '$base/.rollback-$stamp'
mv -Tf '$base/.rollback-$stamp' '$base/current'
nginx -t
systemctl reload nginx
EOF
chmod 700 "$backup/rollback.sh"
trap '"$backup/rollback.sh"' ERR
install -m 644 "$backup/incoming-lesson10-maps.conf" /etc/nginx/snippets/chineseos-lesson10-maps.conf
install -m 644 "$backup/incoming-lesson10-location.conf" /etc/nginx/snippets/chineseos-lesson10-location.conf
python3 - "$CHINESEOS_NGINX_CONFIG" <<'PY'
import pathlib,sys
p=pathlib.Path(sys.argv[1]);s=p.read_text()
if 'chineseos-lesson10' in s:raise SystemExit('An existing Lesson10 route needs reconciliation')
if s.count('root /var/www/chineseos/current;')!=1:raise SystemExit('Unexpected server root')
# This file must already be included in nginx http context; do not replace other server configuration.
s='include /etc/nginx/snippets/chineseos-lesson10-maps.conf;\n'+s
s=s.replace('root /var/www/chineseos/current;','root /var/www/chineseos/current;\n include /etc/nginx/snippets/chineseos-lesson10-location.conf;')
p.write_text(s)
PY
if ! nginx -t; then "$backup/rollback.sh"; exit 1; fi
ln -s "$base/releases/$release" "$base/.next-$stamp"
mv -Tf "$base/.next-$stamp" "$base/current"
if ! systemctl reload nginx; then "$backup/rollback.sh"; exit 1; fi
[[ "$(systemctl show -p MainPID --value chineseos-lookup.service)" == "$lookup_pid" ]] || { "$backup/rollback.sh"; exit 1; }
for url in / /release.json /connection-test/ /audio-comparison/my-day-first10/ '/api/dictionary?text=%E5%91%86' '/api/character-data?character=%E5%91%86'; do
 if ! curl -fsS --max-time 20 "http://127.0.0.1$url" -o /dev/null; then "$backup/rollback.sh"; exit 1; fi
done
python3 - "$base/releases/$release/lesson10-materials/manifest.json" <<'PY'
import json,sys,urllib.request,hashlib
for f in json.load(open(sys.argv[1]))['materials']:
 with urllib.request.urlopen('http://127.0.0.1/api/lesson10-material?file='+f['id'],timeout=30) as r:
  b=r.read();assert r.status==200 and r.headers['Content-Type']=='application/pdf';assert f['filename'] in r.headers['Content-Disposition'];assert len(b)==f['bytes'] and hashlib.sha256(b).hexdigest()==f['sha256']
print('All six exact local PDF GETs passed.')
PY
trap - ERR
printf 'Release=%s\nRollback=%s/rollback.sh\nLookupPID=%s\n' "$release" "$backup" "$lookup_pid"
