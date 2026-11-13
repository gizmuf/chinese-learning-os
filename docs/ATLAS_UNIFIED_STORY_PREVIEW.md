# Atlas unified story preview

The local preview starts from `96662e261ac2964af0efc22c4c9b77f4c015a189`, which includes the Study Studio measure-word catalogue. It opens through `?atlas=1&workspace=1` in the HK guest app. Dictionary lookup uses the pinned CC-CEDICT snapshot in the checkout. The guest app keeps its browser state on the preview origin.

- [Atlas workspace](http://127.0.0.1:4391/?atlas=1&workspace=1)
- [HSK 1 生](http://127.0.0.1:4391/?atlas=1&workspace=1&mode=read&hsk=1&anchor=%E7%94%9F&group=journey-1-character-751f)
- [幕 Story](http://127.0.0.1:4391/?atlas=1&workspace=1&mode=read&wsstory=%E5%B9%95)
- [Original Atlas Journey](http://127.0.0.1:4391/?atlas=1&cloud=1&layout=journey&hsk=1)

## Run locally

From the preview checkout, use Node 22 and the locked dependencies. Install them with `npm ci --prefer-offline --no-audit --no-fund` if `node_modules` is missing.

```sh
node node_modules/vite/bin/vite.js --config vite.atlas-preview.config.ts --host 127.0.0.1 --port 4391 --strictPort
```

The preview binds to loopback. Use a fresh browser profile when checking practice flows. To stop the foreground server, press Control-C. For a background server, read its PID from `output/atlas-unified-preview/preview-server.pid`. Use `ps -p PID -o pid,user,command`, `lsof -a -p PID -d cwd -Fn`, and `lsof -a -p PID -nP -iTCP:4391 -sTCP:LISTEN` to confirm the owner, checkout and listener before running `kill -TERM PID`.

## Verification

Browser checks used desktop 1440 × 900, tablet 1024 × 768, and phone 390 × 844 viewports. The tablet check used a browser viewport. Verification ran on localhost.

- The HSK 1 生 Journey shows three assigned words. Opening the full family shows seven.
- 幕 → 莫 opens an 11-member family in the wider scope. Back restores the prior Story step and HSK selection.
- 明天 → 明天见 opens its sentence. Browser Back restores the Story. 姓 → 生 reaches the seven-word HSK 1 family.
- The 姓 dictionary popup opens 女. Back restores 姓, then Explore Story opens its Story. The popup’s Explore in Atlas action opens 女 in the workspace.
- Speaking Chunks opens with the 大学生 query and returns to the workspace selection. Original Word Families keeps the return link after interaction and reload.
- Original Family + context opens 大学生 through 子 → 学. The HSK 1 学 matrix shows all nine words with pinyin and English meanings.
- Recall mode shows the English cue while hiding the answer trail and inspector. Reveal answer restores the selected word. The 明天 scene advances to sunrise, and starting its recording exposes Stop audio.

The integrated suite passed 639 tests. The final snapshot passed 26 focused tests, the TypeScript check and the static build. The focused checks cover 学 and 大学生 opening a matching component family and preserving the selected word and return route.

```sh
node --test tests/atlas-unified-preview.test.mjs tests/atlas-workspace.test.mjs tests/atlas-cloud-route.test.mjs tests/atlas-chunks-context.test.mjs tests/atlas-story-explorer.test.mjs
npm run typecheck -- --incremental false
node node_modules/vite/bin/vite.js build --config vite.atlas-preview.config.ts
```

Build output and local logs are under `output/atlas-unified-preview/`. Serve the static build with its dictionary endpoint using `node node_modules/vite/bin/vite.js preview --config vite.atlas-preview.config.ts --host 127.0.0.1 --port 4392 --strictPort` from the checkout.

## Rollback

Open the original Atlas Journey link to return to the prior layout. To retire the experiment, stop the verified preview process, preserve any local changes you want to keep, and remove the isolated worktree from its parent repository. Use the baseline commit above if a clean prior checkout is needed.
