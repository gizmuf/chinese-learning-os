# Lesson10 on the preserved Hong Kong frontend

This candidate starts at application source `008478fcb8f9ef21ce199aa62d02de415ebe669e`,
not the latest Sites UI. Its HK adapter comes from the coordinator-supplied
`/tmp/chineseos-hk-v72-preserved-adapter.patch` for combined release
`d2a53daa0650ab11825e04bbe32c3ffb90c01271`. It selectively imports Lesson10 from
`27241e40b4818ce4d9d8bec133aba42c2c2b26e7`. Atlas, the dictionary source contract,
MyDay, Shuoshuo, identity and learner stores retain the current source.
The digest parameter has a TypeScript-only ArrayBuffer annotation; the emitted
HTTP content-hash implementation is unchanged. No authentication shim is added.

## Reproduce on Account2 VPS

Use Node22.23.2 and the unchanged lockfile. In this checkout:

```
npm ci --ignore-scripts --no-audit --no-fund
node node_modules/vite/bin/vite.js build --config vite.hk.config.ts --configLoader runner
node scripts/prepare-hk-lesson10.mjs
npm run typecheck
node --test tests/lesson10*.test.mjs tests/hk-content-digest.test.mjs
node scripts/package-hk-lesson10.mjs /absolute/private/delivery-directory
```

The package is public static application data only: no notebook databases,
credentials, raw classroom attachments, `.git`, logs or browser profile.
All baseline public assets must remain byte-identical. The unchanged lookup
service is not rebuilt, installed, restarted or replaced. All six approved PDF
files are included locally, with the four46-page complete packs as primary
materials and the two existing English supplements retained.

The Nginx exact download location serves the original same-origin URL
`/api/lesson10-material?file=workbook-en` (fr/ru/tr analogous), with strict file
mapping, PDF attachment filename, length, strong hash validator, HEAD,
conditional304 and Range206 support. It requires no upstream fetch, credential,
account login or paid API. Unknown IDs/files remain404. There is no new port.

## Access state and next authorized action

Account2 currently has no Alibaba CLI/config/environment credential or HK SSH
route. Its PulsAI SSH key is unrelated and is not used. Public HTTP read access
is not administrative access. SSH must remain closed; no new keys, RAM grants,
persistent access, account login, networking or billing changes are permitted.

Use an EXISTING authorized Alibaba Cloud Assistant `RunCommand`/Session Manager
route on instance `i-j6c57f6b54252gvitp4d` only. First read the live nginx config
path (`nginx -T` with output filtered to server/root/includes), current release,
lookup MainPID/cwd/executable and free disk space. Match the existing v72-hk2
release before proceeding. Transfer the prepared archive using that existing
route and verify its receipt SHA256. Do not bootstrap another public server or
open SSH for transport.

For recurring VPS-only execution, an existing scoped Alibaba API/Session Manager
identity must already be callable from this VPS. None has been found. If there
is no existing identity/channel, the owner must approve the exact access action
at action time; this package does not create credentials or persistent grants.
Mac console access alone is not a VPS-only deployment path.

After live reconciliation, execute the packaged script as an existing authorized
administrator, with these three variables: `CHINESEOS_NGINX_CONFIG` (verified
existing server config), `CHINESEOS_ARCHIVE` (uploaded local archive), and
`CHINESEOS_ARCHIVE_SHA256` (delivery receipt). Review `deploy-lesson10.sh` first.
The script backs up the existing static release and Nginx configuration, verifies
the backup archive, stages a new release, preserves old hashed assets, creates
rollback before touching active configuration, validates Nginx, atomically swaps
`/var/www/chineseos/current`, reloads Nginx, verifies the lookup PID is unchanged
and checks the existing endpoints plus every PDF's exact bytes. Failures after
configuration changes automatically restore the previous config and symlink.
It never copies or writes server learner data.

Then independently GET the public release receipt and four PDF URLs with SHA256
checks, and repeat actual desktop/mobile Course→Lesson10→download checks on HK.
Also verify dictionary, strokes, Atlas, MyDay, Shuoshuo, media, `/connection-test/`
and `/audio-comparison/my-day-first10/`. No Save, grade or notebook mutation is
part of QA. Build/local tests are not proof of deployment; final acceptance stays
pending until the live checks pass. Existing source-owner checkout and Sites
production remain untouched.
