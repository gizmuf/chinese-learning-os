# Family practice · Lab

An opt-in experiment authored at `ce5750570f0f9da5524c650a75e46e2de164ad9b` from base `4be1bd642a7e74fab1448c1d343206ecc54d34aa`. The approved branch is merged onto Sites v54 source `0d66c204105ffcc9478b55252dda49461776edf4` on `codex/family-lab-integration`, preserving Often confused and every existing Atlas view.

Open `?atlas=1&cloud=1&layout=words&familylab=1&anchor=学&hsk=1`. The optional entry appears only inside Word families. Back to family removes the lab flag and retains the selected anchor, scope, canonical word identity, Board/Difference training mode, memory flag and comparison state. Changing family/scope/locale or leaving the lab starts a fresh practice session.

## Behavior

- Explore reuses the exact existing family board renderer, canonical word inventory, typography, word detail, writing links and audio. All twelve HSK 1 学 rows fit at 1024 × 768 in expanded mode.
- Spot the difference resolves 大学/大学生, 小学/小学生 and 中学/中学生 from the selected canonical inventory. Pinyin and localized meaning remain visible. The shared 学 is red; the added 生 is underlined and described only for these examples. Other anchors truthfully report that no contrast set exists yet.
- Recall alternates six deterministic place/person cues across those examples. Only exact NFC-normalized, trimmed canonical Hanzi is accepted. No pinyin, handwriting or oral assessment is claimed. No answer glyphs, reading, position list or comparison pair is mounted before checking/revealing.
- A reveal is assisted and cannot count as successful recall. Consulting Explore/Spot during a pending cue also marks that answer assisted. Wrong answers show the canonical pair. A session summary offers a bounded retry of wrong/assisted prompts.
- Results exist only in component memory. There are no progress/SRS/mastery writes, storage keys, new schemas, authentication changes, metrics or network calls in the lab. Reload/unmount clears this session.
- English, French, Russian and Turkish have explicit UI copy. Vocabulary meanings and recordings reuse existing application localization/audio.

## Verification, 2026-10-29

- 15 focused and existing family tests passed: scope/canonical identity, deterministic cue order, strict Hanzi checking, assisted scoring/retries, route preservation, rendered answer concealment, consultation assistance, truthful unsupported families and four-locale copy completeness.
- TypeScript check and full application build passed. New lab files, extracted board and routing pass ESLint. The existing `word-families.tsx` retains the pinned base's four React-hook lint errors and one dependency warning; these were compared directly with the base. No new warnings remain.
- Chrome UI: correct 大学 response, incorrect 小学 response for 小学生, and assisted 中学 reveal produced the expected feedback and full pair. Original Board and two-reel Difference training remain accessible; lab entry/Back retained 学, HSK 1 and original training mode.
- Expanded 1024 × 768: twelve board rows, shared-anchor alignment, final row bottom y=688. Phone 390 × 844: document width 390, lab width/scroll width 354, contrast columns width/scroll width 148. Contrast order is role, Hanzi, pinyin, meaning. Temporary viewport override reset.
- Physical touch, handwriting, speech assessment and a complete production acceptance run are outside this experimental preview. No claim about global learning improvement or mastery is made.

Local preview: `http://127.0.0.1:5187/?atlas=1&cloud=1&layout=words&familylab=1&anchor=%E5%AD%A6&hsk=1`.
The worker-owned dev process uses this isolated checkout. A local review screenshot is retained at `outputs/family-practice-lab-compare.png` (ignored build evidence).

## Integration safeguards, 2026-10-30

Chinese IME composition cannot submit a provisional candidate; Enter during composition is reserved for selecting the character. Lab flags are read/emitted only for Word families, and explicit Atlas layout navigation exits the opt-in experiment. The new contrast/input typography follows the existing Print / Stroke shapes setting. The optional entry keeps a 44px touch target. No API, event identity, storage schema, existing progress or scoring migration is introduced.

Integrated verification: 276 application tests passed, including nine focused Lab tests; TypeScript and the official Sites build passed. The new tests reproduced and now prevent premature IME submission and a Lab flag leaking into other layouts. Chrome verified all three stages, correct/incorrect/assisted answers, a 4/6 independent-recall summary and retrying exactly the two missed/assisted cues. EN/FR/RU/TR navigation and vocabulary were inspected. The expanded 1024 × 768 board shows all twelve rows (last row bottom 688); the 390 × 844 contrast view has no horizontal overflow. Back preserves the original Difference training mode and selected `student` entry; explicit Space → Word families returns outside the Lab. Both Hanzi appearance modes render through the existing preference. No console errors were observed in this local run. Physical iPad/IME hardware acceptance remains separate from browser and automated composition tests.
