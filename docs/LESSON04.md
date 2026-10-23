# Intensive course — lesson 04

23 October 2026. Lesson 04 belongs to the 60-day classroom course. It does not expand the universal Atlas or relabel the HSK library.

## Content and learner route

Public classroom JPEG copies have EXIF/XMP/IPTC/comments removed without recompressing pixels; original owner files are untouched. `scripts/strip-board-metadata.py` reproduces that cleanup.

The owner's twelve boards are transcribed in `data/lesson04/content.json`: 73 expressions and 28 sentences, of which 24 are photographed classroom examples and four are explicitly marked additions. Seven groups cover introductions/polite questions, location, work/negation, sports, colours, food and character components. All teaching copy is EN/FR/RU.

The additive course entry opens `?course=intensive&lesson=4`. Existing visual classes and shared audio/Notebook/Ink/swipe tools are reused. Learners can study a group with its classroom photo, assemble twelve whole expressions, try 24 short checks (16 reading, eight listening), or write in Notebook. Listening hides hanzi/pinyin and disables choices until playback starts. Navigation/swipe is free and records no answer; selected blocks and answers survive changing cards and device-local refresh. Desktop buttons remain.

Builders, revealed hints, copying and the writing worksheet's memory comparison are supported practice. The latter already made its model available, so it does not claim independent recall. Unhinted reading/listening checks enter separate lesson-04 FSRS schedules. An overview button offers due check activities. Counts are activities tried, not mastery. Handwriting is self-assessed, never automatically recognised.

Existing account-scoped course storage/API is extended with a per-lesson activity allowlist. Cross-lesson IDs and unassisted builder credit are rejected. Legacy clients keep the lesson-03-only GET response; updated clients request `?lessons=all`. This avoids making already-open lesson-03 clients fail when a classmate saves lesson 04. No database migration, auth, audience or HSK identity change is needed. Lesson-03 completion/due queues filter to lesson 03; Atlas/Lab histories remain separate.

## Offline files and reproduction

Six searchable vector PDFs share the same dataset: a **36-page workbook** and **14-page study guide** in each language. Workbook models use the approved Noto serif face, centred by actual glyph bounds in 56.1-point white cells with pale outlines/guides, cumulative stroke diagrams and full-expression practice. The guide includes grammar contrasts, grouped vocabulary, full examples, a no-pinyin reading check and answer key. Topic boundaries and pagination match across languages. Public files live under `public/course04/materials`; friendly download copies and a ZIP are in `output/pdf`.

Run `node scripts/export-lesson04.mjs /absolute/path/lesson04.json`, then `python scripts/build-lesson04-pdfs.py --content /absolute/path/lesson04.json --cjk-font /absolute/path/NotoSerifCJKsc-Regular.otf`. Authoring dependencies: PyMuPDF, fonttools; the original full Noto Serif CJK SC font is an external local input. The CFF subset must retain glyph IDs; otherwise rendered Chinese can disappear despite valid text extraction. No standalone serif font is committed. The generator refreshes `data/lesson04/materials-manifest.json` after all PDFs finish; review the resulting pages before committing. Prebuild verifies content/PDF hashes, page parity, boards, writing data and all 202 word/sentence files (101 unique clips, duplicated only for the existing audio API's two filename kinds).

`python scripts/generate-lesson04-audio.py` generates/reuses exact-text hash-verified Mandarin in the existing Xiaoxiao voice/rate and checks decoding. It is authoring-only and never receives student data. Production playback uses bundled files.

## Source decisions and validation

The later ChatGPT 24-page workbook/14-page guide were reviewed as inspiration after our independent transcription. The useful contrasts were retained; their raster-only pages were not copied into the new searchable PDFs.

CUHK checks support the conventional-name distinction for [彳](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=彳) (walking/steps, not literally two people) and the shared phonetic 監 in [籃](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=籃) / [藍](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=藍). Simplified 篮/蓝 preserve that comparison. [沒](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=沒) has a water component, but this does not define the everyday negative word méi. 青 is contextual blue/green, not one universal swatch. 不/没 is taught through the classroom examples, not an absolute past/future rule.

The channel audit refreshed all 31 catalogue IDs, retained exact transcript-reading coverage and cross-checked named claims against CUHK. It is not a claim of watching every minute or validating every derivative. Private transcripts stay outside the repository; no channel video/art assets are redistributed.

Current checks: 88 unit tests, TypeScript and official Sites build; 24 isolated Worker/D1 course API checks including lesson-03 regression, owner isolation, idempotence and lesson-04 allowlists. The oversize-body probe stays last: local Wrangler can restart after that deliberately rejected request. This does not constitute a production stress test. PDFs render in MuPDF with all-page contact review; Poppler independently checks sample EN/RU handwriting pages. Physical iPad/Pencil acceptance remains separate. Final browser/release evidence is recorded below before handoff.

## Browser evidence and release handoff

The real app runs locally at `http://127.0.0.1:5176/?course=intensive&lesson=4`. Browser checks cover correct builder/save and back/forward preservation, wrong reading answer, listening pre-play gating/hidden text and answer reveal, EN/FR/RU changes, Notebook guides for new characters, self-assessed writing save, refresh/restored check selection, and 390px/1024px layouts without horizontal overflow. Synthetic touch PointerEvents exercise the shared swipe handler; physical touch/Pencil acceptance is not claimed. The existing desktop previous/next buttons remain. The final release preserves the deployed v19 base at `6428cfd` (documentation receipt above source `25f3e0e`).

The designated architect owns creative UX and the next Sites release. Review this additive UI before publication; no existing navigation or animation has been redesigned here. This worktree does not publish Sites or change sign-in/audience. Use the pushed lesson-04 branch/PR and verify its remote SHA. No migration is required. Production acceptance must separately confirm lesson 04, lesson 03, Atlas Listening/story trail/Lab, all six PDF links and account progress after release.
