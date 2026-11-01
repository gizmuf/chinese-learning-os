# Situation Lab — optional preview

Current extension: `codex/situation-grammar-expansion`, based on production v56 source `7ddac33bfca76ceb4a10a390c8d5820ec1a4ae8f`. This keeps the original six cases and adds twenty situations adapted from ten existing Grammar & frames constructions. The selector offers all 26, everyday requests/plans (6), comparison/distance (8), connecting ideas (6), sequence/immediate actions (4), and interests (2). Switching sets explicitly starts a fresh local round. No other view or progress contract changes.

Approved source: `804b2d7b71149a18f0d348582e0fe6716816433c`, based on `ac42802e7d011b56e82f8d45b550d6327dc62358`. Source branch: `codex/chunk-situation-lab`. Integration branch `codex/situation-lab-integration` merges the whole feature onto live v55 source `f390264dbd15f7942828937d1f14be605ced18db`, preserving Family practice Lab and Often confused.

Preview: `http://127.0.0.1:5189/?course=intensive&material=speaking-chunks&chunks=words&chunklab=1`.
An optional Situation Lab entry appears inside the existing chunks navigation. Only `chunklab=1` is added/removed; Back retains the course, material, collection, search/filter context, hash and the mounted original collection/lesson/recall state. The old tabs, exercises, activity IDs, history and progress implementation are unchanged.

## Bounded learning experiment

The six original cases alternate request, choice and plan constructions using worked variant 1 and challenge variants 2/3. The twenty additional cases reuse the exact canonical `grammarFrames` examples, notes, translations and existing frame audio. Grammar support cards reuse the glossary and connected readings, including contextual tones in 一…就…. Each of the two examples can be the model or challenge; targets are interleaved across frames. The existing `ChunkStrip` renderer is reused through a render prop, including dictionary rendering and audio. Scenario instructions are new EN/FR/RU/TR intent/context copy, not a second vocabulary database.

The task removes the worked example and mounts no model sentence, reading, chunk list or model audio control. Default practice is to say it aloud and then compare; there is no microphone, recording, ASR or automatic speech assessment. Hint 1 shows the construction skeleton. Hint 2 shows the original varying chunks or the grammar connectors with canonical readings, localized meanings and individual audio controls. An explicit reveal shows the full model. Either hint or a pre-attempt reveal marks the attempt assisted.

Optional typing compares with the studied model using the existing punctuation/spacing-tolerant `matchesChunkAnswer` validator. It says “matches the model pattern” or invites comparison, never declares alternative Chinese semantically wrong. IME composition guards prevent submission before composition completes. After a spoken attempt, learners compare with the canonical model and report whether they expressed the idea or want another attempt; this remains a self-check.

Summaries distinguish unaided typed model matches, unaided spoken self-checks and assisted attempts. A bounded retry includes assisted or comparison-needed cases. All session state is in memory and disappears on leaving/reloading. There are no new progress/SRS/mastery writes, storage/schema/auth changes, metrics, external generation, or model calls.

## Rationale and limits

Design hypothesis: reuse a known construction under a changed communicative purpose, inspired by learner sentence-mining discussions. [Task repetition and construction reuse research](https://onlinelibrary.wiley.com/doi/10.1002/tesq.3103) offers English L2 evidence relevant to investigating reuse; it does not establish this interface as the best Chinese learning method or constitute a Chinese-specific RCT. No learner discussion, YouTube or Reddit content is imported.

## Verification, 2026-10-30

- TypeScript check passed with incremental output disabled.
- 21 tests passed across the new lab and existing speaking-chunks/library/UI suites. Coverage includes canonical variant identities and existing audio file validity, six-case order, old collection/query/hash round trips, task/hint masking, assisted classification, typed IME guard, model-only language feedback, full self-check/reveal summary and bounded retry, and four-locale copy completeness.
- New lab TypeScript/TSX files pass ESLint. `speaking-chunks.tsx` retains the pinned base's single purity error and single effect-dependency warning; before/after rules were compared directly. No new lint findings.
- Full application build passed on a single retry after the first run hit disk ENOSPC. Only this worktree's generated `dist` was removed to recover space; the successful build output was also removed after verification to restore disk headroom. Existing shared dependency install and all other checkouts/previews were preserved.
- Preview returned HTTP 200. Worker-owned source dev server: port 5189, initially PID 29694, execution session 28726; verify ownership again before reusing/stopping.
- Browser acceptance is pending. The required CUA connection failed before Chrome inspection (`transport closed before response`), and one inventory retry failed identically. No browser screenshots were produced. Desktop/mobile layout, real audio playback, focus, IME and Back interactions must be checked through the live preview once browser tooling is available. Component tests are not a substitute for those checks.
- No speech, handwriting, learning-effectiveness, global mastery or production acceptance claim is made.

## Integration verification, 2026-10-30

The first integrated browser run reproduced a Back regression: Words in context lost its HSK filter and unsaved search when the Lab unmounted the original collection. The original view now remains mounted but hidden while the optional Lab is open. A regression test verifies retained component state and forbids progress writes. Chrome confirmed HSK2 + 学, grammar extension/search filters and an open 即使…也… explanation survive the round trip. Existing exercise state is retained by the same boundary; no old event IDs or progress implementation changed.

The IME guard additionally handles candidate-confirmation Enter with keyCode 229; its test failed before the fix. The answer input follows the global Hanzi font preference. All 285 application tests passed, including nine Situation Lab/integration tests, and TypeScript passed. Chrome completed all six situations with a 1 typed / 4 spoken self-check / 1 assisted summary and a one-item retry. EN/FR/RU/TR copy was inspected. Desktop and 1024 × 768 tablet layout were checked with no horizontal overflow. Existing example and target audio returned 206 audio responses in the local development preview. No console errors were observed. Physical iPad, hardware IME and subjective audio-quality acceptance remain separate.

The first official integration build hit ENOSPC on the Mac. Only this executor's incomplete build and temporary bundles were removed. Release building and packaging use an isolated copy of the exact committed source on ORICO_APFS; other projects and owners' artifacts are untouched. Native publication and public smoke receipts are recorded outside source after deployment.

## Grammar extension verification, 2026-11-01

All 26 IDs are unique; twenty grammar cases retain exact canonical text, readings and translation identities. Every model and connector audio file is checked for existence, nontrivial size and MP3 format. The connected reading of 一 in 我一到家… is tested as yí. Regression tests cover the 26/6/8/6/4/2 set sizes, all four languages, hidden target text/pinyin/audio before assistance, staged marker hints, assisted scoring, switching sets, bounded retries and the original six-case flow. No old activity ID or stored event format is changed.

Chrome checked a typed comparison, a complete six-case connecting-ideas round (five unaided spoken self-checks, one assisted attempt, one-item retry), French task copy, Russian sequence examples and Turkish comparisons. The 390px phone and 1024px tablet views have no horizontal overflow. Back preserved the core grammar filter and 比 search (two examples), with guest progress unchanged at 0/30 and 0/1138. No console errors were observed. Physical device/IME and subjective voice-quality acceptance remain outside these automated/browser checks. Build, remote SHA and publication receipts are retained in task output after release.
