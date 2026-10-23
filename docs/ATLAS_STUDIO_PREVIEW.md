# Atlas Studio design preview

An additive, working alternative inside the existing Atlas/Learning Lab, requested on 23 October 2026. The owner narrowed the earlier global five-area proposal: keep other menus and the original learning paths unchanged until the visual alternative has been evaluated.

## Scope and design

Open `?atlas=1&studio=1`. The original Lab contains one invitation link; its original content remains underneath. The primary app navigation is unchanged. The preview has Overview, Explore, Practice and Your activity within this single area, a tree-to-woods illustrated introduction, six family collections, character/pinyin/meaning search, and focused character → whole word → handwriting steps. Stories use one selector instead of eleven simultaneous character buttons. Reduced motion disables preview transitions. EN/FR/RU use the existing language preference.

Existing character and word builders, story art/narration, Listening, Notebook and recall components are reused. Character/word actions are brought closer to the visual model. The original Atlas, comparison/recall/materials and experimental Connections first/Recall first routes remain accessible through explicit original-view links; this preview does not claim to have redesigned every legacy activity.

## Identity and progress

The preview reuses the current owner's Atlas hook/events, IDs, schedules and account sync. No storage migration, deletion, copy of learner history or auth/audience change. The experimental Lab's local-only records remain separate and are described as such. Activity counts are attempts, not mastery; word/sentence listening due work remains separate from character skills. Notebook-to-recall practice in the preview is explicitly assisted, because the model has just been shown.

Routes whitelist view, family, guided shape, scheduled target and word. `shape` and `target` are intentionally distinct: a guided workshop shape is not automatically a scheduled Atlas target. Family plus shape resolves repeated characters such as 清 and 休. Word-to-writing resolves a real constituent of the selected word and labels it on the button; it cannot silently open an unrelated previous target. All 30 words remain selectable, including 火山 and 电脑 which have no family assignment; unrelated words are not attributed to the current family. Browser Back and reload preserve these route selections. Guided assembly work has no recall credit. Transient builder/listening trial UI still follows the existing components' lifetime; the URL is not a claim of full trial-draft restoration.

## Integrated owner requests

This release also includes the executor's lesson-04 PDF typography fix (`41f2add`, integrated as `3d1e042`) and writing catalogue completion (`a69f543`, integrated as `2127ec0`). The latter retains the original 100 core IDs, adds 15 discoveries for complete workshop writing coverage, and preserves all existing audio. Total: 121 Atlas entries (100 core + 21 discoveries), with all 33 assemblies and constituents of 30 workshop words mapped. Source/audio coverage and current product counts are documented in PRODUCT.md.

## Validation

94 tests and TypeScript pass on the combined source. Three new route regressions cover malformed links, every assembly/family roundtrip and all word/prior-target combinations. Independent executor review checked owner/readiness guards, event identities, assisted recall and route normalization. Its reported stale word-to-writing target defect was fixed; UI inspection also led to separating guided shapes from scheduled IDs and preserving family identity for duplicate shapes.

Executor acceptance confirmed all six requested words open their correct handwriting target, and all 3630 word × previous-target routes preserve the word and resolve a constituent. Browser acceptance: character split/build with correct repeated parts; character → word; word selection survives reload; search without tone marks; browser Back; Listening play gate, answer/save and appearance in shared activity; handwriting opens the expected newly added 休 with loaded stroke guide; preview recall explicitly marked assisted. EN/FR/RU and 390 × 844 / 1024 × 768 responsive layouts have no observed horizontal overflow. Emulated reduced-motion reports animation:none; override reset after testing. Physical Apple Pencil, authenticated multi-device writes, exhaustive accessibility and measured learning efficacy are not claimed.

Production receipt is appended after a successful deployment of the pinned source.
