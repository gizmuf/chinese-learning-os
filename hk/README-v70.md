# Hong Kong v70 adapter

Base: 90b6ab854133af3a3afbc907e01799923b84c2a2. Existing guest bootstrap and HTTP UUID compatibility are preserved from 039ee475557ce3d0547ef81a7f0b6dce17e7f3a8. No authentication or learner database is exposed or copied.

Frontend build: node node_modules/vite/bin/vite.js build --config vite.hk.config.ts --configLoader runner.
Lookup build: ./node_modules/.bin/esbuild hk/lookup-server.ts --bundle --platform=node --format=esm --target=node22 --outfile=hk/lookup.mjs.

The small Node transport imports the upstream cedictEntry/validation model. It verifies the upstream SHA256-pinned local CC-CEDICT gzip before decoding. Stroke JSON is read from installed hanzi-writer-data@2.0.1, with the same validation/status/cache semantics as the upstream route. No request to GitHub, Google or jsDelivr is required for a live lookup. Only the two existing public GET routes are exposed; other API paths remain unavailable. Fixed data roots, Han-only length bounds, bounded result cache and a non-root systemd process avoid turning these endpoints into a general file or network proxy.

Nginx proxies only the exact two routes to 127.0.0.1:8788. No new public port, credential, paid service or permission grant is needed. Runtime unit is hk/chineseos-lookup.service. Atomic static release symlink and old release assets preserve rollback and in-flight browser imports. Connection test and A/B comparison remain same-origin.

Guest IndexedDB history uses the existing HTTP origin and IDs. HTTPS and authenticated account sync remain separate pending work. Do not trust Sites identity headers on this public host. Preserve local notebook exports before any origin change.
