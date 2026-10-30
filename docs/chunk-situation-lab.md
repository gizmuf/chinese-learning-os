# Situation Lab — optional preview

Base: `ac42802e7d011b56e82f8d45b550d6327dc62358`. Branch: `codex/chunk-situation-lab`. Isolated checkout: `_worktrees/chinese-os/chunk-situation-lab`. No release integration, PR or deployment is included.

Preview: `http://127.0.0.1:5189/?course=intensive&material=speaking-chunks&chunks=words&chunklab=1`.
An optional Situation Lab entry appears inside the existing chunks navigation. Only `chunklab=1` is added/removed; Back retains the course, material, collection, search/filter context, hash and the mounted original collection/lesson/recall state. The old tabs, exercises, activity IDs, history and progress implementation are unchanged.

## Bounded learning experiment

Six deterministic cases alternate request, choice and plan constructions. Each case first shows variant 1 as a worked example; variants 2/3 supply the changed-context challenges. All sentences, chunks, readings, localized meanings and recordings resolve through the existing `chunkUnits` and `chunkAudio` adapters. The existing `ChunkStrip` renderer is reused through a render prop, including dictionary rendering and audio. Scenario instructions are new EN/FR/RU/TR intent/context copy, not a second vocabulary database.

The task removes the worked example and mounts no model sentence, reading, chunk list or model audio control. Default practice is to say it aloud and then compare; there is no microphone, recording, ASR or automatic speech assessment. Hint 1 shows the construction skeleton, Hint 2 shows the varying canonical chunk(s), and an explicit reveal shows the model. Either hint or a pre-attempt reveal marks the attempt assisted.

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
