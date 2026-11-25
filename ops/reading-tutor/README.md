# Reading Lab tutor on Contabo and Alibaba HK

Contabo runs the tutor and the sentence checker in the same worker with the same D1 state and daily counter. Alibaba sends only `GET` and `POST` for `/api/reading-tutor` through a same-origin reverse proxy. The browser stays on its current Reading Lab lesson. The HK proxy verifies Contabo TLS and SNI, forwards only the expected request headers, and hides cookies and CORS response headers. For `GET`, it supplies its own origin so the worker reports ChatGPT plan access as unavailable on HK. For `POST`, it requires and forwards the browser's exact HK `Origin`.

## Contabo activation with Main's release

Use the current one-instance release procedure and operate on the current production base. Stage against the active root confirmed with `systemctl show chineseos-vps-test-20261108.service -p User -p WorkingDirectory` and the public `/__vps/release.json`. On the observed stack, the gateway is `$HOME/chineseos-vps-test/20261108-v105-ui/gateway.mjs`, the public-facing Caddy forwards to `127.0.0.1:18765`, and Wrangler listens on `127.0.0.1:18766`. Caddy already drops `Cookie`, `Authorization`, and authenticated-user headers before the loopback gateway. Its current configuration is sufficient.

From the integrated checkout, render from the active gateway into the candidate release directory. Run this before Main updates `publicRelease` and rewrites the loopback ports for an isolated candidate. The gateway resolves its tutor module in the worker checkout, so the same patch works in both locations. The renderer fails on ambiguous or missing anchors and accepts an already rendered gateway.

```sh
node ops/reading-tutor/render-contabo-gateway.mjs \
  "$active_root/gateway.mjs" "$work_dir/gateway.tutor.mjs"
node --check "$work_dir/gateway.tutor.mjs"
```

The active checkout's `.dev.vars` points to `$active_root/.sentence-check.dev.vars`. Keep that protected path and the symlink through the switch. Add only `DEEPSEEK_READING_TUTOR_ADDITIONAL_ORIGIN=https://cos.l00p.network`; the existing key, `DEEPSEEK_SENTENCE_CHECK_ORIGIN` and `DEEPSEEK_SENTENCE_CHECK_DAILY_LIMIT` carry forward. The live limit observed during preparation was 100 per UTC day. Keep the existing `.wrangler/vps-test-state` and reject a release that would establish a second production D1 counter.

Prepare the binding file in a new mode-0700 subdirectory on the same filesystem as `$active_root`. Use Main's transaction to retain the previous protected file in the same private work area, atomically move the new file into its stable path with the same service-user ownership and mode 0600, and atomically install the new gateway. Never print or transfer either binding file off Contabo. For the isolated candidate, use its own test D1 and bindings. Restore the previous protected file and gateway together with the previous source and its live D1 state if the switch fails. The run-stack working directory must be the active candidate source, as it is today.

```sh
python3 ops/reading-tutor/render-contabo-bindings.py \
  "$active_root/.sentence-check.dev.vars" "$private_work_dir/protected-vars.new"
```

Before switching Alibaba, verify Contabo with ordinary public `GET` and a read-only comparison of the release and process state. The tutor status must report `deepseek: true` and ChatGPT unavailable. Send an invalid JSON/foreign-origin `POST` and expect 400/403 without using credit. Check the sentence checker `GET` and the existing Reading Lab narration capability as well. Confirm `Cache-Control` contains `no-store`, the tutor response has no `Set-Cookie` and no CORS grant, and unrelated guest writes are still denied. Use one short valid tutor `POST` for public acceptance and verify the server-reported provider and a contextual answer, then check the shared row through Main's read-only state procedure if measuring usage. Do not exhaust the public counter to test 429; set a small limit in an isolated fixture and exhaust that instead.

## Alibaba HK activation

After Contabo passes, stage only the exact snippet and vhost renderer using the existing administrator profile and Main's release transaction. Run `nginx -v`, `systemctl is-active nginx`, and read the current `/etc/nginx/conf.d/chineseos-hk.conf`. Check that the live vhost serves `cos.l00p.network` on port 443 and resolves `chineseos.l00p.network` to the expected Contabo service. Run a verified TLS request to Contabo from HK before installing the snippet.

```sh
curl -fsS --max-time 10 https://chineseos.l00p.network/__vps/release.json
python3 render-alibaba-vhost.py /etc/nginx/conf.d/chineseos-hk.conf > chineseos-hk.conf.candidate
```

Retain a mode-preserving copy of the current vhost and of the prior snippet if it exists, in the transaction's private scratch directory. Install `alibaba-reading-tutor.conf` as `/etc/nginx/snippets/chineseos-reading-tutor.conf` and the rendered vhost at its original path, owned by root and mode 0644. Install via temporary files in the target directories and same-filesystem `mv` operations. If both installed files compare equal, skip replacement and reload. Run `nginx -t` before `systemctl reload nginx`. If either fails, restore both files (remove the snippet only if it was absent before this transaction), run `nginx -t` and reload the restored configuration. Roll HK back first if reverting the Contabo tutor entirely. Keep the previous files only through acceptance under the one-instance policy.

```sh
curl -fsS --max-time 10 https://cos.l00p.network/api/reading-tutor
curl -sS -o /dev/null -w '%{http_code}\n' -X POST \
  -H 'Origin: https://chineseos.l00p.network' \
  https://cos.l00p.network/api/reading-tutor
curl -sS -o /dev/null -w '%{http_code}\n' -X PUT \
  https://cos.l00p.network/api/reading-tutor
curl -sS -o /dev/null -w '%{http_code}\n' \
  https://cos.l00p.network/api/reading-tutor/plan/callback
```

Expected results are enabled DeepSeek with unavailable ChatGPT, 403, 405 and 404 respectively. Check again in a browser from the Reading Lab lesson on each public origin. Submit one short valid tutor question on HK when accepting the release and verify the origin and lesson stay on HK. Check the public release metadata from each host after Main's frontend switch and verify that one unrelated existing HK API still behaves as it did before.

## Future ChatGPT plan access on Contabo

The guest gateway's `READING_TUTOR_PLAN_ENABLED` stays unset until approved credentials and the canonical `https://chineseos.l00p.network/api/reading-tutor/plan/callback` are ready. The worker's capability must agree with the gateway's setting. For an approved rollout, add a Caddy matcher for exactly `/api/reading-tutor`, `/api/reading-tutor/plan`, and `/api/reading-tutor/plan/callback` inside the existing canonical vhost. Route it before the default reverse proxy to the same loopback gateway, retaining the current stripping of `Authorization` and `oai-authenticated-user-*`. On just those paths, let the loopback gateway inspect `Cookie`. It passes the validated canonical host and only the exact tutor session and flow cookies to the worker. It returns the app's host-only tutor cookies on canonical handshake paths and can clear the tutor session after a 401 response from the tutor. Leave the default Caddy rule stripping cookies on all other paths. At initial deployment the default Caddy rule continues to cover all paths, and there is no HK plan proxy.

If an HK launch is requested after approval, use a top-level link to the canonical Contabo Reading Lab with the validated lesson and sentence in its normal route. The canonical page can then start the flow with an explicit user action. The return stays on the same lesson and sentence, using the verified callback state and the canonical host's cookies. Carry only the route fields in this link.
