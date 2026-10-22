# Authoring classroom lessons

## What is shipped

**Intensive course → lesson 03: Time, questions & experiences.** It adds classroom context to the existing HSK study tools. There are 60 numbered slots; only 03 has real content. Never invent missing class lessons or mark them completed to fill the calendar.

The lesson has six topics, four activities per topic, 58 complete words/expressions and 22 sentences. Every teaching explanation, prompt, feedback message and meaning is available in English, French and Russian. Chinese and pinyin are shared. Activities cover chronological ordering, construction choice, negation cloze and listening. Navigation, word IDs and progress of the existing 520 HSK/extra cards are preserved.

## Evidence and editorial rules

Input: the user-supplied Lesson 03 v2 workbook (30 pages), study guide (9 pages), time reference (1 page), in EN/FR/RU, plus IMG_9907–IMG_9916. All ten photos were reviewed; six useful board views are published as JPEGs. Photo metadata is stripped; original HEIC files are not published.

| Topic | Published photo | Teaching focus |
| --- | --- | --- |
| Time | IMG_9912 | Five positions for days, years, months and weeks |
| Daily rhythm | IMG_9907 | Dayparts, meals, early/late |
| Weather | IMG_9909 | 冷/凉, 有 + noun, degrees and zero |
| Questions | IMG_9910 | 吗, A-not-A, 有没有 and 没有 |
| Negation | IMG_9911 | Habitual 不 vs action not occurring with 没 |
| Experience | IMG_9916 | 过, 了, Shanghai/Suzhou and explicit current location |

The remaining photos corroborate or extend these board views. Full-word forms are taught (e.g. 上个月, 上个星期) even when classroom shorthand omits 个. Pinyin and meanings are reviewed separately rather than importing old text hidden beneath PDF overlays. Sentence s22 is explicitly labelled an additional practice example; other sentences come from the supplied class materials.

Do not turn beginner contrasts into false universal rules: 没 is not simply a past-tense marker; 了 is not a universal past tense and does not, by itself, locate a person now. 他现在在苏州 supplies that location explicitly. Writing diagrams retain complete words but render only Chinese characters, excluding sentence punctuation.

The supplied `SKILL.md` and `HANZI_PDF_TEMPLATE_SPEC.md` are reference material for the blue printable template. The supplied `build_lesson03_v2.py` repairs overlays in particular existing PDFs; it is not a general course importer. Its hidden/overlaid source text must not be imported automatically. Keep original PDFs unchanged. Improve the repo workflow, not the user's global skills, unless separately requested.

## Data and progress

- `app/course-data.ts`: lesson metadata, trilingual expressions/sentences, source-board mapping and HSK identity links.
- `app/course-exercises.ts`: stable activity IDs, distractors, accepted token sequences, hints and feedback. Shuffle choices without changing the answer key. Support tapping and keyboard operation, not drag-only tasks.
- `app/intensive-course.tsx`: additive course UI; shared notebook remains the writing tool.
- `app/course-story.tsx`: interactive earlier/now scenes for 过 vs 了. Treat the route as one possible story; use the separate location sentence as evidence for where the character is now. Respect reduced-motion preferences.
- `app/course-learning.ts`: schema and independent course scheduling. Hints and corrected retries are assisted; copying is practice, not recall. Free writing uses explicit self-assessment.
- `app/course-store.ts` / `/api/course-progress`: account-separated offline queue and authenticated sync. Reuse server identity and notebook-owner checks; never trust a user ID in JSON. Duplicate event UUIDs are idempotent per account.
- `course_events`: additive D1 migration. Existing `learning_events` is untouched. Draft ink stays in the existing per-owner device store; course events have a separate store.
- `public/course03/`: six board images, original documents and locally served Mandarin recordings. No student content is sent to a voice provider.

The language switch changes teaching copy, not IDs or schedules. Existing HSK words reuse base card IDs/audio. Course-only expressions and sentences use a `course03-` prefix. Never reuse an existing ID for different Chinese text.

## Next lesson workflow

1. Receive the class number, date and photos/documents. Preserve the actual class order. Review photos and visibly rendered PDFs; distinguish source examples from authored additions.
2. Build a topic map with complete expressions, pinyin, EN/FR/RU meanings and explicit source references. Reuse existing HSK cards by exact Chinese identity, checking homographs such as neutral-particle 过 separately.
3. Add short explanations, worked examples and four or more meaningful activities per topic. Include misunderstandings from the board as distractors. Make grammar examples contextual rather than teaching absolute rules from one sentence.
4. Add sanitized board images and language-specific documents. Generate audio only for missing expressions and sentences. The current export helper writes the course audio request JSON to `/tmp`; the generator writes a manifest with hashes. Do not overwrite the base HSK audio manifest.
5. Extend the course schema/registry deliberately for the new lesson; this first implementation accepts only `intensive-03`, so a fourth lesson needs an explicit registry/data refactor, not just a renamed folder. Keep old lesson/activity IDs stable.
6. Run typecheck, tests and production build; verify asset hashes, all writing character data, language parity, independent/hinted feedback, offline reload, account isolation, materials and narrow-screen layout. Test existing HSK writing/PDF paths again only if shared inputs change.
7. Publish the existing Site and verify its live lesson URL. Do not create a parallel application or change authentication providers, audience or other projects.

## Checks

`npm run prebuild` verifies translations, character assets, 1040 base recordings and 100 course recordings. `npm test` includes course grading/FSRS/schema/identity tests and existing HSK/PDF tests. `tests/course-api-integration.py` runs only against an isolated local Worker, alongside the original API tests. Never write synthetic progress into production accounts.
