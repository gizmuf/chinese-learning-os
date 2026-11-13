# Lesson 05 — meet, describe and get ready

The 26 October 2026 class is available at `?course=intensive&lesson=5`.
Thirty supplied photographs (`IMG_0072`–`IMG_0101`) were read locally, compared visually and deduplicated. The public lesson contains normalized text, not student photographs or screenshots of the projected video.

## Study sequence

1. Pick one of six groups: introductions; two qualities; sensory impressions; feelings/readiness; time/generations; classroom conversation.
2. Read each complete word with pinyin and meaning. Tap an underlined word for the shared Atlas dictionary popup: meaning, pinyin, pronunciation and individual-character buttons, without leaving the sentence. Atlas and this lesson use the same word renderer, popup and audio control in `app/study-dictionary.tsx`.
3. Follow the grammar blocks and the link to a familiar Lesson 03/04 construction. Change one block in the expression builder.
4. Try reading or listening without pinyin. Every one of the 65 expressions and 34 sentences has both modes: 198 checks, with topic filtering. Sixteen expression builders are guided practice.
5. Watch and trace animated strokes, or choose the optional paper-style notebook. A separate memory-writing activity is available; it honestly records supported self-assessment because its model was accessible in the worksheet.
6. Return to **Review due activities** in the lesson. Independent reading/listening answers advance the same FSRS scheduler as the earlier course lessons. Viewing, hints, builders and guided writing do not earn independent recall credit.

Course events retain separate lesson/activity IDs and the existing account-scoped sync API. No account, database or HSK/Atlas history migration is needed. A guest remains local to the browser.

## Material and provenance

`data/lesson05/content.json` is the shared text source. Each entry identifies its source as classroom board, classroom video excerpt, or authored extension, and retains supporting photo numbers. `scripts/author-lesson05.py` reproduces it; edits belong in that authoring script. `app/lesson05-data.ts` supplies sentence paths, connections, builders and checks.

Important distinctions are explicit: 问 wèn / 闻 wén; 白 bái / 百 bǎi; 高兴 gāoxìng / 兴奋 xīngfèn; duration versus a later time with 后; and result 好 versus a general past tense. The age figures on the board were not copied: 90后 means the 1990–1999 birth cohort. The walking proverb is labelled a traditional saying, not a health guarantee. Sunrise/sunset clock examples are not treated as universal times.

Grammar cross-checks:

- [Yoyo Chinese, complements of result, lesson 33](https://cdn.yoyochinese.com/attachment/PDF/LectureNotes/CHG-Lesson-033-LN.pdf): 好 as an achieved satisfactory result, including 准备好.
- [Hujiang, 既…又… / 既…也…](https://cn.hujiang.com/new/p589611/): parallel adjectives, verbs or phrases; the lesson does not restrict the pattern to positive adjectives.
- The sensory examples and introductions are transcribed from the supplied classroom boards. Added practice sentences are marked as extensions rather than attributed to the teacher/video.

## Offline pack

The EN/FR/RU/TR pack contains a 19-page study guide, 32-page Hanzi workbook and one-page quick reference per language. The workbook preserves the established A4 white/navy design, 56.1-point writing cells, pale tracing models, cumulative stroke diagrams and blank recall space. Complete words have pinyin and meanings; writing cells contain individual glyphs.

`scripts/build-lesson05-pdfs.py` takes the exported content and an authoring-only Source Han Serif font; the font is not distributed separately. Vector strokes reuse the existing licensed Hanzi Writer data. `scripts/verify-lesson05.mjs` rejects missing or stale PDFs, audio and writing data. Rendering and pagination are checked in all four languages; representative pages are cross-checked with MuPDF and Poppler.

Audio uses the existing Mandarin voice `zh-CN-XiaoxiaoNeural` at `-10%`. Exact-text clips are reused where possible. The 198 bundled word/sentence files represent 99 teaching entries; no learner data is sent to the speech service, and no speech is generated at runtime.

## Spaced-repetition audit

Vocabulary, independent Atlas activities, family-character recognition and course lessons 03–05 use FSRS, with separate targets/skills and a 90% scheduling retention setting. Reading maps, listening to examples and guided writing are study, not proof of recall. The standalone HSK3 grammar page retains its guided exercise drafts and now has a separate independent-review mode using the shared course FSRS and account-scoped sync. Existing guided answers are not migrated or credited; hints mark the new answer as assisted. See [HSK3 grammar reviews](HSK3_GRAMMAR_REVIEWS.md) for validation and deployment status. Lesson 05 grammar checks participate through its course activity IDs.

## Turkish

Türkçe is the fourth application language. Local dictionaries cover navigation, all 1,020 existing vocabulary cards, course content, HSK3 grammar, Atlas explanations/definitions and Lesson 05. Chinese text, pinyin, Mandarin voice, target IDs and saved progress are preserved. Turkish narration for the existing voiced Atlas stories uses `tr-TR-EmelNeural`; prior EN/FR/RU and Mandarin recordings remain intact. The supplied classroom PDF pack is available in EN/FR/RU/TR, with each download clearly labelled.

Translation sources are `data/turkish-{ui,vocabulary,course,lesson05,extra}.json`; `scripts/verify-turkish.mjs` checks literal source coverage, Hanzi, placeholders and pinyin. Translations have automated checks and an application review, not a native-teacher certification.
