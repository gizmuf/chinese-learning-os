# Chinese OS

Chinese practice for iPad, phone and desktop: whole-word vocabulary, Pencil/finger handwriting, listening, independent FSRS queues and private student progress. Built with React, Vinext, Hanzi Writer, ts-fsrs and Sites D1.

Read [the product guide](docs/PRODUCT.md) for study instructions, learning rules, saving behavior and release boundaries.

## Development

Requirements: Node.js 22.13+ and npm. Use the installed official Sites plugin's helpers for hosted development.

```sh
npm run install:ci
npm run db:generate       # only after schema changes
npm run typecheck
npm test
npm run build
```

`npm run prebuild` bundles the library's Hanzi Writer character data and required licenses. `dev` and `build` run it automatically. Audio is pre-generated and versioned with the source, so a normal build needs no speech API credentials.

For local D1 testing, build once, apply each pending SQL migration in `drizzle/` to the local database, then start the app:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_stale_morlun.sql
npm run dev
```

Apply a migration only once per local database. The development server has the starter's loopback-only mock sign-in. Production supports Google and verified email/password through the isolated Firebase project `chinese-os-gizmuf-auth`, plus existing ChatGPT notebooks. Configure `FIREBASE_WEB_CONFIG` in Sites runtime variables (or ignored `.dev.vars` locally), with the web app's apiKey, authDomain, projectId and appId as JSON. The server verifies signed Firebase tokens; never trust a client-provided user ID as authorization. See `docs/PRODUCT.md` for account boundaries and deployment details.

## Deployment and source

Reuse `project_id` from `.openai/hosting.json`; do not create a new Site. Sites provides its own required source remote. The same accepted source commit is mirrored to `gizmuf/chinese-learning-os` on GitHub, preserving one application.

Open/package source with the official `site-workflow.mjs` helper, build with `build-site.mjs`, then save/deploy that exact source commit and archive through native Sites tools. Keep credentials in memory/stdin. Sites applies the committed D1 migrations before uploading the Worker. Keep the current audience unless the owner explicitly changes sharing.

## Key files

- `app/content.ts`: stable vocabulary and lesson IDs.
- `app/study-app.tsx`, `app/ink.tsx`, `app/guided.tsx`: study interface and handwriting.
- `app/learning.ts`: skill-specific FSRS replay and queues.
- `app/local-store.ts`: account-scoped IndexedDB and unfinished attempts.
- `app/event-schema.ts`, `app/api/progress/route.ts`: validated account-bound sync.
- `db/schema.ts`, `drizzle/`: persistent events and schema migrations.
- `public/audio/`, `scripts/generate-audio.py`: recorded Mandarin and reproducible generation.
- `tests/learning.test.mjs`: learning, queue, duplicate replay and sync validation tests.

Runtime does not need OpenAI, PulsAI or speech-provider API keys. No microphone permission is required.

## Regenerating pronunciation recordings

Generate recordings only when lesson text changes. Use a separate tool environment; the running app never calls a speech service.

```sh
python3 -m venv .sites-runtime/audio-venv
.sites-runtime/audio-venv/bin/pip install edge-tts==7.3.1
node scripts/export-audio-content.mjs /tmp/chinese-os-audio-content.json
.sites-runtime/audio-venv/bin/python scripts/generate-audio.py --content /tmp/chinese-os-audio-content.json
```

The generator uses Mandarin `zh-CN-XiaoxiaoNeural`, a gently reduced generation rate and per-file hashes. It sends only the lesson text to the speech service during preparation. Audio, manifest and generation script are versioned together. Review new vocabulary and listening examples before release.
