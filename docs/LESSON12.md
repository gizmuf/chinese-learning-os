# Lesson 12 — home, daily routine and campus directions

Class date: 4 November 2026. Additive to accepted Sites v88 `4d617a97758925e86c4a2806b62acd1c792be046`.

`data/lesson12/content.json` contains 89 terms and 65 sentences in EN/FR/RU/TR. Core home/day material comes from the four supplied Home Day PDFs; campus/locality material comes from IMG_0455–0457, rain/money terms from IMG_0433/0435. The supplied straight-ahead screenshot contributes 一直往前走. Related connecting examples are marked `practice`. Original photographs, faces and PDF source files remain private local inputs; none are published.

The redrawn teaching campus is not a real map. North remains up; all eight map questions derive answers from aligned building coordinates. Relative front/back/left/right is taught separately with a north/south viewpoint switch. The dormitory text uses front/back rows of the complex, not a universal equivalence between front and north.

The reader uses existing StudyText lookup, global Print/Stroke appearance, three independent Pinyin/translation/chunk controls, shared writing and the existing Pinyin/IME practice. Character previews contextualize 行 in 银行, 舍 in 宿舍 and 觉 in 睡觉 without changing standalone dictionary entries. New usage examples are appended after existing example pools to preserve prior lessons.

Checks use existing course events and D1 sync; no new table or account migration. Hints persist in an owner-scoped checkpoint and mark attempts assisted. An event UUID and timestamp are saved before recording, preserved on retry/reload. Today uses the same assessment and a separate review-session checkpoint. Existing Lesson11 Today session rendering is restored as part of integration. Read/map exploration and skipped questions do not create grades.

All 154 expressions have exact-text audio: 127 new Microsoft Xiaoxiao recordings (Edge Read Aloud, -10% generation rate, no new key or paid provider) plus 27 reused clips. MP3s are decoded by ffmpeg and listed with SHA-256/size in `audio.json` and `assets.json`. No on-demand synthesis or assembled syllables.

Four 40-page hybrid PDFs contain maps, viewpoint comparisons, all reading sentences, vocabulary, paired Hanzi/Pinyin handwriting, IME, recall and answers. CFF subsets retain glyph identities. All 154 Hanzi expressions extract exactly in every locale; visual review includes Poppler and PyMuPDF. Generator: `scripts/build-lesson12-pdfs.py`; its full CJK font is an explicit local input, not assumed recoverable from deployment archives.

`/api/lesson12-asset?file=<allowlisted id>` serves new MP3s and PDFs from immutable GitHub asset commit in `assets.json`, verifies byte count and SHA-256, supports GET/HEAD/ETag/Range and returns proper MIME/download filenames. Assets live under `resources/lesson12`, outside the size-constrained Sites static package. Reused recordings keep existing URLs.

HK integration must preserve guest adapter, existing media/character/dictionary endpoints, versioned Scene Lab links and `/teacher/`. The HK owner must implement the same new allowlist route against copied immutable files; a static catch-all HTML response is not an audio/PDF response. No authentication or learner-data migration is part of this lesson.

## Reviewed visual and transport supplement (4 November)

Compared all 42 raster source pages in the supplied Visual Directions EN and Home Day Transport EN v3 PDFs using local OCR and visual review. Added 24 terms and 25 complete chunked sentences, including all twelve travel modes, the 走/骑/坐/开/打/叫/租 contrasts, bank-location dialogue and rain/money usage. The original 65 term and 40 sentence IDs and text remain exact. Eight contextual usage checks use the existing immutable-attempt / hint / review machinery; exploration does not grade.

The Transport in pictures section uses twelve selectable icons, full expression and full sentence, independent display toggles, existing lookup and writing. The location formula changes A/B and east/west while keeping building positions fixed. No new navigation system or storage model.

Four combined 40-page workbooks now include three new vector diagram pages and transport handwriting. Two reorganized searchable EN companion editions replace the supplied raster-only representation: visual directions (25 pages), home/day/transport (28 pages). Both use embedded fonts, selectable Hanzi/Pinyin, vector drawings and five paired handwriting repetitions. Originals stay private and unchanged. Companion IDs and hashes are in supplements.json; the same immutable allowlist delivers all six PDFs. Generator retains CFF glyph IDs and fails on text overflow.
