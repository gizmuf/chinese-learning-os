# Chinese OS — Learning Lab takeover for local Astra

Date: 23 October 2026. This is a work handoff, not a claim of publication.

## Immediate instruction from Robert

Finish the experimental Learning Lab, preserve every existing learning path, test and publish into the existing Chinese OS. The outgoing session cannot reliably reach source servers or other Codex threads. Robert explicitly requested a thorough handoff to the local Astra. The outgoing agent stops writing after committing this document. No further conversation with that agent is required to take over. Do not ask Robert to repeat requirements or manually move source files.

## Exact source and ownership

- Shared GitHub repository: https://github.com/gizmuf/chinese-learning-os
- Canonical local checkout: `/Users/gizmuf/Dev/Xcode/Chinese OS/chinese-os-web`
- Canonical working branch at last inspection: `codex/intensive-course-lesson03`.
- Lab worktree, ready for takeover: `/Users/gizmuf/Dev/Xcode/Chinese OS/_worktrees/chinese-os/learning-lab`
- Lab branch: `codex/learning-lab`.
- Original Lab implementation: `09c65f01b914aa6d0256302bf3c1549e81fc038f`.
- Integrated, validated code: **`d274f51a181761fee99a66e37958e2c04c0cd8cc`**.
- This is a merge of the Lab with the complete version-17 source **`4a032f5b4653d05817b98a3a9fee088607b0baab`**, plus listening and swipe fixes. The following documentation-only commit contains this handoff; use `git rev-parse codex/learning-lab` for the final handoff SHA.
- The worktree was clean after the implementation commit. No external writer's checkout was edited. The only merge conflict was `app/atlas.tsx`; both Listening and Lab imports, tabs, routes and views were retained.
- No successful push, PR, Lab saved Site version or Lab deployment exists from this session. Local Git objects are real and available to the other worktrees. A GitHub branch search returned no `learning-lab` branch before integration.
- Another worktree exists for `codex/atlas-motion`; leave it intact.
- Applicable instructions: `/Users/gizmuf/Dev/Xcode/AGENTS.md` and `.agent/workflows/git-safety.md`. One writer per branch/worktree; explicit staging, secret checks, draft PR handoff, pinned release commit, preserve unrelated dirty work.

## Product decisions that must survive takeover

Robert wants several optional educational paths to try and compare before unifying the UX. Do not remove old menus, replace existing lessons or declare the new approach proven superior. Keep the current visual language and Astra-style animations. Prioritize iPad with Apple Pencil, then phone and desktop browsers. This is a web/Sites project, not a native Xcode/iOS application.

User-facing teaching content is EN/FR/RU. Robert is a Mandarin beginner: ordinarily pair displayed hanzi with tone-marked pinyin; listening/recall exercises intentionally hide answer text until checking. Keep whole compound words together. Prefer meaningful component families, contrasting examples, words and sentences, original scenes and active recall over disconnected vocabulary lists. Preserve individual learner data and existing lesson-3 swipe answers.

Learning Lab is experimental and **local-device-only**, explicitly disclosed in all three languages. Do not claim its results are cloud synchronized. Existing Atlas, HSK and course records retain their own current synchronization. Do not silently merge or migrate these identities.

## What is already implemented in the Lab

Entry: `?atlas=1&lab=connections`, a lazy-loaded Learning lab subtab inside Atlas. An additive link in lesson 3's Practice lab opens it in a new tab, preserving classroom work. No additional sidebar destination.

Two sequences use the same five activities and one selected character:

1. Connections first: explore → assemble → meaning → listening → writing.
2. Recall first: meaning → listening → writing → assemble → explore.

Targets come from existing authored `assemblies`, filtered to known Atlas characters, so the content expansion is reused. Exploration reuses AtlasWorkshop. The inspector is a dialog with contextual whole words, pinyin, audio and related characters; unsupported animated targets fall back to their actual note instead of an unrelated example. Closing returns to the current activity.

Assembly uses existing exact stroke paths and accepts repeated components. Wrong choices are retained as feedback. Writing uses shared pressure-aware Ink, Pencil-only mode, clear/undo, compare and honest self-rating, not automatic handwriting recognition. Reduced-motion CSS is retained.

Results require explicit Save before advancing. Repeated saves use the same event ID. Previous navigation preserves answers. Refresh/resume uses per-tab/per-owner sessionStorage, including compacted ink, current step and hints. Ending a draft keeps already saved results. Store failures show an error and preserve the answer for retry. Owner changes remount the Lab; stale storage callbacks are ignored.

Records use IndexedDB `chinese-os-connection-lab-v1-<owner>`, isolated per account/guest. Export writes JSON of attempts and optional usefulness feedback. Each route/target/skill gets a separate experimental FSRS schedule. Guided exploration and assembly never award independent recall. Hints or answers mark subsequent activities assisted; inspector visits record guided exposure. Supported checks schedule the first independent follow-up at +24h, without awarding recall credit. Recent exposure is tracked over 30 minutes. Reviews offer one skill of one character, and recently exposed targets are temporarily withheld. Counts distinguish guided, independent and remembered attempts. Feedback and counts are descriptive, not a causal A/B experiment.

Integration fixes in d274f51:

- Lab listening plays the **word** clip, not the sentence clip.
- Answer options contain translated meanings only; no hanzi/pinyin in visible options or their accessible labels before feedback. `labQuestion` uses meaning-based distractor deduplication.
- Lab and Listening query parameters clear each other when switching tabs; both deep links remain supported.
- Shared swipe hook added to Lab: back preserves state; forward requires a saved result; saving/done/modal states disable it. Canvas and editable targets are excluded by the shared hook; exploration uses its own interactions without outer Lab swipe. Check touch behavior manually.
- Recently exposed due targets are filtered for 30 minutes to avoid immediate cued retesting of another skill.

## What the other thread already shipped (do not duplicate)

- v13 / `9dbea20`: complete PR #2/atlas-motion integration, existing animations, pressure-aware handwriting, lesson-3 swipe.
- `550167a`: six families 木 (mù), 日/月 (rì/yuè), 氵 (shuǐ), 亻 (rén), 口 (kǒu), 青 (qīng), 30 illustrated word activities.
- `9f99692`: Xiaoxiao word/sentence pronunciation.
- v16 / `41a8ec72b3f1fb67b1a70c6253787d6db4dd4902`: 30 words + 24 sentences in Listening, EN/FR/RU, hidden hanzi/pinyin before checking, swipe, account history and separate review schedules. We independently checked the v16 deployment succeeded.
- v17 / `4a032f5b4653d05817b98a3a9fee088607b0baab`: optional story trail 莫 (mò) → 暮 (mù), 幕 (mù), 摸 (mō), 模 (mó). Four words/sentences, original scenes, EN/FR/RU narration, Mandarin recordings and brief recall tasks. User supplied the other agent's confirmed deployment report; this session's `get_site` returned latest version 17. All of this source is included in the Lab merge.
- The other agent reported 68 tests, TypeScript/build, 23 published audio checks, tablet touch simulation, existing Listening/lesson-3 regression checks for v17. These are their checks, not new browser checks by this session.

## Film research and educational direction

Requested film: https://www.youtube.com/watch?v=dlUN5XEj8Aw (Chinese Decoded).

Read `docs/HANZI_TEACHING_REFERENCES.md` in the integrated checkout. The local owner documented reviewing the channel catalogue (31 videos), transcripts, relevant long-video sections and sampled visuals. The outgoing session read that document and source, but YouTube fetching here returned DisabledError; do not describe this as independently watching the film or all videos.

The useful teaching pattern is a stable component, successive scenes, contrasting meanings/sounds, then whole words/sentences and recall. The Lab already supports the exploration-versus-recall sequencing experiment. Reuse the shipped story trail rather than create a duplicate interpretation of the film.

Keep historical origin, modern meaning/sound function and invented memory scene separate. The documented CUHK cross-check supports the sunset-among-vegetation origin of 莫 (mò), its grammatical borrowing, and added 日 (rì) in 暮 (mù). It does not establish a universal “cover/hidden potential” meaning for the entire family. The channel's sun-behind-tree origin for 東 (dōng) conflicts with CUHK's tied-bag analysis; it may be labelled a mnemonic, not presented as proven history. No claim that every phonetic component is semantically empty, or that every family shares a single abstract meaning. Exact readings and tones still need teaching. Original artwork and narration only; no copied video assets.

Source links and per-character decisions are already in the teaching references. The story trail does not modify core Atlas/HSK targets or award FSRS credit. A future extension could connect trail-specific recall to Lab, but this is NOT implemented or a requirement for shipping the current Lab.

## Files owned by this change relative to v17

- `app/connection-lab.tsx`: activity/session UI, inspector, answer/save flow, swipe.
- `app/connection-lab-copy.ts`: EN/FR/RU copy.
- `app/connection-lab-model.ts`: validation, orders, guided/independent rules, isolated FSRS and question choices.
- `app/connection-lab-store.ts`: owner-scoped local storage.
- `app/connection-lab.css`: responsive and reduced-motion styling.
- `app/atlas.tsx`: additive lazy tab/deep link, preserving Listening.
- `app/course-lab.tsx`: additive new-tab link.
- `tests/connection-lab.test.mjs`: 9 model/regression tests.
- `scripts/preview-connection-lab.mjs`: standalone preview harness with synthetic owners and a subset of bundled recordings; not full production QA or all new v17 assets.
- `docs/PRODUCT.md`: current Lab contract and verification limits.
- `docs/LEARNING_LAB_HANDOFF.md`: this handoff.

Changes from the other thread are ordinary merge history. Review Lab scope with `git diff 4a032f5b4653d05817b98a3a9fee088607b0baab..codex/learning-lab`.

## Validation completed here

On the integrated code, 23 October 2026:

- `npm test`: **77 passed, 0 failed** (68 inherited + 9 Lab tests).
- `npm run typecheck`: passed.
- `node /Users/gizmuf/.codex/plugins/cache/openai-curated-remote/sites/1.1.1/scripts/build-site.mjs`: passed, all framework environments built. Nonfatal chunk-size warning remains.
- `git diff --cached --check`: passed before commit; staged path secret check passed.
- Latest logs: `/tmp/chinese-lab-tests.log`, `/tmp/chinese-lab-types.log`, `/tmp/chinese-lab-build.log`. Temporary logs can disappear; commands and results are recorded here.
- Build changed tracked `tsconfig.tsbuildinfo`; the generated working-tree change was restored to the staged version, not included as a new Lab change.

NOT performed here: interactive browser QA of the integrated Lab, API integration suite against a local Worker, physical Apple Pencil/iPad acceptance, public Lab verification. Earlier server startup failed `listen EPERM 127.0.0.1`; a file preview was denied by browser URL policy. No browser-policy workaround was attempted. Existing API integration tests must only target an isolated local Worker, never production.

## Known limitations / targeted review points

These are scope limits or review points, not confirmed production failures:

- Lab data and drafts do not sync across devices; no import UI, JSON export only.
- No automatic handwriting/pronunciation grading. No efficacy claim from small personal practice counts.
- Session restore checks essential structure but is not a full nested schema migration system. Exercise malformed/stale drafts and account switches during QA.
- Verify delayed audio callbacks cannot affect an unrelated task after pause/navigation, and blocked playback never enables an answer.
- Verify focus restoration, dialog scrolling, component interactions and nested swipe do not interfere with drawing or exploration.
- Review real widths 375px, 768px and 1024px, EN/FR/RU text wrapping, reduced motion and VoiceOver labels.
- A supported review does not postpone a due FSRS card; the 30-minute exposure guard prevents immediately retrying it. Confirm the waiting/review display is understandable.

## Environment and handoff failures (do not infer application corruption)

- Native Sites read/status/credential calls worked and identified the correct public project.
- Source helper was attempted again with a fresh credential and failed before opening: `Could not resolve host: git.chatgpt-team.site`.
- `git ls-remote` to GitHub failed: `Could not resolve host: github.com`.
- Native `read_thread` and `send_message_to_thread` for the known local thread returned `Codex app tool request failed`. Latest coordination message is NOT confirmed delivered. Do not wait for a reply.
- Known local main thread: `01a159e0-8be2-7711-bbc9-759fcd86517b`.
- An earlier push/handoff call hung and was interrupted after about 630 seconds. Its success was never established; no remote Lab branch was found later.
- This session could execute against local Mac files but its network/browser/app bridge access was restricted or failing. Do not assert the whole machine lacked internet or that cloud/local identity alone explains it.
- Do not put credentials in this document or copy expired credentials from the previous session. None are included.

## Takeover steps — no reconstruction needed

1. Read applicable AGENTS/workflow rules. Inspect both worktrees' current status and `git worktree list`; do not overwrite a new dirty main checkout. The outgoing agent relinquishes the Lab worktree after the handoff commit.
2. In the Lab worktree, verify branch and history. `git merge-base --is-ancestor 4a032f5b4653d05817b98a3a9fee088607b0baab HEAD` should succeed. HEAD should contain d274f51 and this documentation commit. If production/main has newer changes, integrate those before release; never roll the Site back to v13/v16 while adding the Lab.
3. Run local browser QA with supported tools and the actual application. Exercise both five-step paths, wrong choices, hints, repeated assembly pieces, playback failure/success, write/clear/undo/reveal/rate, Save double taps, Previous/swipe, pause/refresh/resume, finishing and feedback, JSON export, guest/account A/account B separation, storage errors, EN/FR/RU, mobile/tablet and reduced motion. Confirm due review and assistance behavior. Keep physical Pencil acceptance marked pending unless actually tested.
4. Regression-check `?atlas=1&listen=1`, `?atlas=1&story=mo`, existing writing and lesson-3 swipe. Check switching tabs removes stale `lab`/`listen` parameters and reloading opens the intended module.
5. Fix observed problems in this isolated branch and rerun relevant checks. No need to redesign the UI, regenerate working audio or redo the other thread's research. Run the existing API integration suite only on an isolated local test Worker if checking server regressions; Lab adds no server API changes.
6. Push the branch to GitHub and make the draft PR required by workspace rules, with exact SHA, v17 base, scope, tests and remaining hardware limits. This step was unavailable here; do not mark it done until it succeeds. Since all objects are in the shared local repository, no download is needed for integration. If integration ownership remains in the main thread, merge the Lab branch there only after triaging its current work. Avoid cherry-picking only the old 09c65f0, which lacks this integration and fixes.
7. Read Sites skill. Preserve the `.openai/hosting.json` project and D1 binding. Refresh `get_site`, mint fresh source credentials, use the official source workflow opening/sync and packaging. Build/upload from an exact committed state, never anonymous dirty source. Follow the helper's verified source/commit/archive output. No new Site, no audience/auth changes, no force push.
8. Save/deploy the same public project; reconcile any newer remote source before pushing. Check terminal deployment success, record actual version + release SHA + URL. Verify Lab deep link and old Listening/story links publicly. If publishing remains unavailable locally, report its exact failure with the prepared source; do not claim release.
9. Update this handoff or PRODUCT with actual release/QA facts and give Robert the working Lab link. Keep code at the existing repo and site.

## Sites identity and links

- Project: `appgprj_6ad7885e92708191a9ed6016b15c91ba`.
- Public URL: https://chinese-os-study.gizmuf.chatgpt.site/
- Intended Lab link AFTER deployment: https://chinese-os-study.gizmuf.chatgpt.site/?atlas=1&lab=connections
- Existing Listening: https://chinese-os-study.gizmuf.chatgpt.site/?atlas=1&listen=1
- Existing story trail: https://chinese-os-study.gizmuf.chatgpt.site/?atlas=1&story=mo
- Source helper installed here: `/Users/gizmuf/.codex/plugins/cache/openai-curated-remote/sites/1.1.1/scripts/site-workflow.mjs` (discover current plugin version if moved).
- Audience observed: public; authenticated user role: owner. Retain it.

## Communication to Robert

Use concise Polish, lead with what is actually ready. Do not ask again for permission already granted to finish/test/deploy. State specific blockers and unfinished verification plainly. He is frustrated by repeated handoffs and unverified “done” claims; the purpose of this file is to make the next session operational without reconstructing the conversation. Do not request unrelated accounts, re-create the site, publish a competing app, or remove existing learning paths.
