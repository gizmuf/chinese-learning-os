# Reading Lab — local experiment

## Scope and baseline

User-authorized reading, tone annotation, contextual grammar, phrase chunks and writing experiment. Preserve the original app, prior Atlas preview and learner progress. Production is not a target of this preview task.

- Base: `770f7acea909d301213a9c623e5bd85f46c39ac7` (local unified Atlas).
- Verified deployment/integration baseline on 2026-11-14 Asia/Shanghai: `96662e261ac2964af0efc22c4c9b77f4c015a189`, both hosts release `r-5f5d12efbce4d466f9d4bb97a6798463df4b17172d7608aa111c297a9aa16ab0`.
- Worktree: `reading-studio-preview`; branch `codex/reading-studio-preview`.
- New opt-in route and an entry within the Atlas preview; retain all existing routes.

## Learning and UX contract

1. One continuous, comfortably sized Chinese reading column. Context opens beside it or in the existing popup. Avoid three independent scroll panes.
2. Three reversible aids: Hanzi only (default), tone marks above Hanzi, or pinyin. Tone marks are derived from authored contextual syllables; neutral tone has a dot. They represent citation tones, not a recording or a complete account of connected-speech tone changes.
3. Phrase grouping is optional and initially off. Enabling it preserves the exact text and natural wrapping. A phrase is not necessarily one dictionary word.
4. Eight original readings, two for each intended HSK level 2–5. Identify the November 2025 syllabus explicitly. Audit exact headwords and token/type coverage, list higher-level and unlisted vocabulary; do not equate character recognition, lexical coverage or a target label with learner mastery.
5. Grammar is tied to actual spans in each text, with an explanation and an example. Existing grammar frames are linked when relevant. Comprehension answers link back to evidence. Writing asks the learner to adapt a pattern, with no invented automatic correctness score.
6. A clicked word retains its authored sentence, reading and meaning in the shared dictionary. Nested exploration and Atlas detours return to the same article, paragraph, aids and draft.
7. No article-wide audio button unless an exact recording exists. Reuse validated clips for existing material; do not silently substitute a related word or promise new recordings.
8. Drafts and trial activity remain isolated from existing progress and review schedules. Do not change the original views to achieve the experiment.

## Work ownership and review milestones

- Root: UX, pedagogy, research synthesis, scope, integration acceptance and real browser checks.
- `story_explorer` (SOL 6.1 High): original content and annotations, then revisions from coverage/content review.
- `preview_qa` (SOL 6.1 High): shared types/models, level and alignment audits, local preview process and targeted verification.
- `unified_workspace` (SOL 6.1 High): reader UI, route/return integration, grammar/comprehension/writing interactions.
- Independent reviewer: one substantive review after the complete reading slice and dataset exist. Review source/context fidelity, Chinese/pinyin/grammar, learning value and regressions; avoid repeated acknowledgement/review loops.

Milestones: (1) verified source and design contract; (2) two seed texts and one usable end-to-end reader; (3) eight audited texts and all learning interactions; (4) independent review and bounded fixes; (5) focused checks, build, desktop/phone/tablet browser acceptance, local commit and working preview.

## Research and content rights

- [Hacking Chinese: tones without pinyin](https://www.hackingchinese.com/focusing-on-mandarin-tones-without-being-distracted-by-pinyin/) motivates an optional annotation mode; do not present it as proven superior learning.
- [Godfroid, Lin & Ryu (2017)](https://onlinelibrary.wiley.com/doi/abs/10.1111/lang.12246) compared tone-perception training aids with 303 novice learners over three weeks. The abstract reports a small practical advantage for pitch contours/numbers over color and no added benefit from doubling visual cues. This supports testing a simple cue, not a claim that tone marks above Hanzi improve reading or long-term mastery. In COS, keeping tone information above the glyph also avoids competing with the shared-component accent color.
- [Official HSK syllabus](https://www.chinesetest.cn/syllabus) is the taxonomy source used by COS.
- [Mandarin Companion](https://mandarincompanion.com/) is a design reference for controlled, repeated vocabulary and extensive reading.
- External publishers may be linked with their own level labels. No commercial story body, recording or translation is copied into the experiment. The integrated reading texts are newly authored for COS.

## Acceptance

Validate lossless text joins, syllable/Hanzi alignment, neutral tones/polyphonic readings, stable IDs, honest coverage, grammar evidence, optional aids, keyboard/mobile interaction, dictionary and Atlas returns, preserved drafts, and unchanged original route behavior. A passing build alone is insufficient. Physical iPad testing remains unperformed unless explicitly performed and recorded.

## Delivered local preview — 2026-11-14

Preview: <http://127.0.0.1:4393/?atlas=1&reader=1&hsk=2>. Start from this checkout with `node node_modules/vite/bin/vite.js --config vite.atlas-preview.config.ts --host 127.0.0.1 --port 4393 --strictPort`. The previous Atlas preview remains separately available on port 4391. Neither preview is merged into the canonical VPS checkout or deployed. Production remains at the verified baseline above.

Eight original texts contain 101–318 Hanzi. Final cumulative exact-headword occurrence coverage is HSK2 98.7%/96.1%, HSK3 99.1%/100%, HSK4 97.9%/99.5%, HSK5 98.3%/100%. Each has 0–3 distinct above-level terms, explicitly identified. This is a vocabulary classification, not certification of every grammatical sense or proof that an individual learner knows the words.

The independent review found and the implementation corrected: ambiguous pinyin reparsing in the shared popup; loss of source context and component kind on nested exploration; the contextual preference sense of 还是; missing Forward restoration for detours; and disconnected existing grammar examples. Four exact grammar matches now reuse the existing library. A corpus regression runs every sentence through the actual shared pinyin parser.

Browser acceptance used Chrome at normal desktop size, 390×844 phone viewport and 820×1180 tablet viewport. Confirmed Hanzi/tones/pinyin controls, optional chunks, exact sentence lookup, grammar evidence and reused examples, comprehension reveal/evidence, draft entry, selected-word stroke practice, and native Back/Forward. The concrete chain 图书馆 → 图 → 囗 → component family retains the authored source sentence and returns to the article, paragraph, aids and draft. Existing Atlas exposes all nine original view links and a reversible Reading Lab entry. Fixed mobile pinyin sizing (13px minimum) and a clipped stroke canvas found during these checks. Pinyin mode also displays the authored title reading. Screenshots and detailed logs are in `output/reading-studio-preview/`.

Final integration milestone: 652 tests passed, strict content audit 8/8, TypeScript and static preview build passed. Subsequent presentation-only copy/title changes receive focused validation before commit. No production commands, remote merges, account progress migrations or paid generations were performed.

Limits: physical iPad/Pencil testing and a native editorial review were not performed. Short pilot texts are newly authored, not imported news articles. Tone cues represent citation tones; connected-speech tone changes are not inferred. Article recordings and automated writing grades are absent. Writing drafts survive in-view exploration but remain in memory and are not saved across reloads. The shared guest shell and dictionary may initialize/cache local resources; the experiment does not record learning progress. The preview is LOCAL ONLY; retain the local commit/bundle and integrate against the then-current canonical source before any later release.
