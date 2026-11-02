# Context-preserving study — acceptance and release checks

Baseline: production v71, source `65110a36230ecae41c7e65136cf4f9e90a02c577`. This is the test plan for the eleven accepted findings in the completed private UX audit, not a new audit or a replacement design. Medium owns context/Atlas integration and final release; High owns reader/family presentation, Studio honesty and independent technical/browser acceptance. Each author's changes receive the other's review before the release SHA is accepted. The A/B prototypes stay outside the application.

## Required user journeys

| Finding | Observable acceptance | Supporting checks |
|---|---|---|
| F1 | My Day sentence 6 → 得 shows `děi / must`, the original breakfast/school sentence, and matching available audio; writing retains that usage. Returning or cancelling restores the source and layer visibility. An unrelated 得 example cannot replace it. | Source-context identity/reading tests; real dictionary → character → writing flow. Unknown senses must not receive an unrelated curriculum identity or recall credit. |
| F2 | Shuoshuo sentence 2 → 电视 → 电 → Atlas → writing → Back returns to the same reader, sentence, token, layer/reveal state and scroll position. Atlas history/camera survive child writing. Closing with Escape and the explicit Back control work. | Browser history/refresh, nested cancel and focus tests; state round-trip tests. No forced new tab for ordinary exploration. |
| F3 | Literal word membership, direct/recursive component structure and reviewed meaning/sound roles have distinct visible labels and counts. | Known 曰 direct 2 vs recursive 5; 电 course vs broad spellings. No etymology inferred from shape. |
| F4 | A reader sentence is visible sooner on desktop/tablet/phone, while setup and scene/source details remain reachable. Pinyin/English and focus/full modes keep their behavior and stored values. | Same route/data/layers and viewport before/after; measure first sentence top and visible height, not assumed performance gains. |
| F5 | Atlas retains all existing routes under compact current-view/other-view controls; the family remains discoverable on mobile. | Switch away and back, keyboard controls, preserved query/hash and selected family. |
| F6 | Meaning groups reconstruct source text exactly. Construction links identify actual reviewed frame examples, separately from word lookup; source text is unchanged. | Lossless grouping and reviewed occurrence tests; click one lexical word vs explicit construction action and return. |
| F7 | Word-family rows expose pinyin and meaning without requiring the word popup. Current vocabulary can render immediately; broad results load in bounded visible batches. | Singleton, 学, 子 and 电, next/previous page, stale response after family/page change, cache, missing entry vs network failure and retry. |
| F8 | StudyStudio's four movement examples have that name; the full 26-sentence My Day has a separate working entry. | Fixture commands and persisted `day` checkpoints remain valid; real route opens the full lesson. |
| F9 | A character beyond the HSK structure map remains available for dictionary/writing. Unknown structure, empty filtered results, unreviewed roles and resource errors have distinct explanations. | Outside-HSK source character; unsupported component; controlled failed lookup/resource then retry. No invented graph edges or HSK cap. |
| F10 | The complete 42-sentence Shuoshuo lesson opens normally. Source uncertainty stays available separately from the reading, without an import gate or fabricated synchronized audio. | Text/data hashes, all 65 source rows and 42 groups; source-note access; exact clip lookup only. |
| F11 | Companion is visibly a five-action demonstration, with no suggestion that arbitrary AI questions are answered. | Preset actions, unavailable/unknown command behavior, no new network/credentials/model calls; checkpoint/account isolation. |

## Environments and safeguards

- Use CUA for browser interaction. Desktop, 1024×768 tablet and 390×844 phone are viewport checks; they do not establish physical iPad/Pencil acceptance. Reset viewport overrides after QA.
- Browser tests use a disposable local notebook. Production smoke checks only navigate, inspect and play existing audio: no saved learning attempt, mastery, FSRS or account-progress writes.
- Check keyboard focus, Escape/Back, accessible control names, reduced motion and separation of card swipes from normal reader scroll. Physical palm rejection remains an explicit unverified device check unless actual hardware is tested.
- Preserve canonical item IDs, database schema, scheduler, 54 Situation Lab cases, My Day 26 sentences, Shuoshuo 42 sentences/65 source rows, Qwen 333 curriculum clips and ten A/B clips. Compare identities/assets against the base; no corpus regeneration.
- Run focused state/component/data regressions, TypeScript and the official Sites build. Browser acceptance and code review apply to the exact integrated source SHA. New failures require diagnosis; unchanged successful checks are reused.
- Medium alone publishes the accepted artifact to the existing Sites project. HK receives that exact reviewed artifact through its existing runtime owner; distinguish source-ready, Sites-published and HK-live evidence. No duplicate deployments or replacement hosting projects.

Record measured outcomes and unresolved limits in the release receipt; do not promise zero defects or a measured learning-speed improvement.
