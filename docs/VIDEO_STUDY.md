# Independent video study

Open Course → **Tell me about yourself**, or `/?course=intensive&material=self-introduction`. This material has its own identity, independent of classroom lessons 03–05 and future lesson 06.

## Content and provenance

Source: the student's edited transcript of [Tell me about yourself](https://www.youtube.com/watch?v=SQNNy5e3VXI), supplied on 26 October 2026. All 308 timestamped source spans are preserved, in order, inside 80 reading passages and ten thematic chapters. The incomplete source phrase around 14:28 is explicitly flagged; no missing noun was invented. Learner explanations are editorial. Pinyin uses standard dictionary tones, with contextual polyphones reviewed; it is not a phonetic transcription of the original performance.

`data/video-self-introduction/content.json` owns Chinese, pinyin, EN/FR/RU/TR translations, 19 grammar explanations and 32 comprehension questions. The authoring script reproduces the source mapping and contextual reading checks. No student photos are included in the publication.

The character dictionary adds all 427 source characters using the existing Make Me a Hanzi source and attribution (`characters.json`, `public/licenses/hanzi-structure-*`). Existing reviewed Atlas meanings take precedence. Additional source definitions may be English when no reviewed local translation exists. Word lookup reuses Lesson 5 vocabulary and the shared Atlas dictionary dialog; it never registers whole transcript passages as dictionary words. Learners can choose character-by-character lookup explicitly. Dictionary writing opens in place and closes back to the passage.

## Learning and progress

Read & listen offers chapter filtering, search, optional hidden pinyin/translation and timestamp links to the original film. Grammar refers back to real passages. Short checks provide 32 reading and 32 listening activities; listening hides Chinese/pinyin before answering and requires actual playback. Previous/Next and the existing touch swipe mechanism support navigation.

Progress uses the existing per-owner course store and authenticated `/api/course-progress?lessons=all` synchronization, with material ID `video-self-introduction` and registered activity IDs. Reading/listening have separate FSRS cards. Due and difficult queues are available within the material. Guided character writing is always assisted and does not claim independent recall. Guest results remain on this device; account results use the established sync flow. Existing legacy lesson-03 clients retain their filtered API response. No database migration or auth change.

## Media and offline material

There are 80 passage recordings plus 427 exact-character recordings, using `zh-CN-XiaoxiaoNeural`, rate `-10%`, as in earlier lessons. These are generated readings, not extracted film audio. Generation reuses only exact-text clips matching voice/rate and hash, writes manifests atomically and validates decoded audio. IDs/text/hashes are checked before builds.

Four complete PDF study/practice guides contain the transcript, pinyin, translated meanings, grammar, quizzes, answer keys and a writing appendix. EN is 74 pages; FR/RU/TR are 75 each. The public material manifest binds source, generator and output hashes. Rendered QA and copies are under the workspace `outputs/video-self-introduction/` directory. Earlier lesson PDFs are unchanged.

## Writing repair

The original notebook could invoke Safari selection/callout. The original Hanzi Writer SVG target also used `touches[0]` and global `touchend`, allowing a second contact to interfere. `writing-pointer.ts` replaces only its input target through the supported renderer override, retaining the SVG renderer, stroke data and grading. It tracks/captures one pointer, prioritizes a pen over an earlier touch, ignores other contacts, and disposes listeners on unmount. Free ink uses the same input policy. Drawing surfaces disable selection/callout; the surrounding page can scroll. Pencil-only remains an explicit preference, with guidance to enable it before resting a hand.

Lesson 5's long dropdown is replaced by search, topical filtering, labeled word cards and Previous/Next. The active character has adjacent reading, meaning and audio. Twelve previously unindexed Lesson 5 characters have source-backed fallback definitions and exact-character recordings in `writing-character-context.json` / `public/writing-context/audio`. Notebook mode retains its printable stroke strips as an alternative.

## Verification and limits

Run `npm test`, `npm run typecheck`, `node scripts/verify-turkish.mjs`, `node scripts/verify-video-study.mjs`, then the official Sites build. The local course API integration test includes account separation, replay idempotency, video reading/listening identities, and cross-material rejection; run it only against an isolated loopback Worker/D1.

Browser QA covers lookup → individual character → writing → return, mouse drawing, reading/listening controls, no pre-answer Chinese/pinyin in listening, PDF links, and Atlas routes. Synthetic competing-pointer tests cover pen/palm move, lift and cancellation. A physical iPad/Pencil palm-rest test remains necessary for device acceptance; desktop simulation cannot certify hardware palm rejection.
