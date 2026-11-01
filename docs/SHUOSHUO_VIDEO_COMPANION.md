# ShuoshuoChinese video companion — Day 01 (draft)

## Source and rights
- Creator: ShuoshuoChinese说说中文 (Shuo).
- User-supplied original YouTube link: https://www.youtube.com/watch?v=V6SrjHDisDs
- Exact video transcript: **not retrieved and not included**. Gmail search returned promotional course messages, not a transcript for this video. The video link did not expose captions through the available reader.
- All six teaching sentences are newly authored, not quotes, paraphrases attributed to the creator, a video transcript, or a claim about particular scenes. Video remains embedded/linked from the source; no third-party footage, sound or thumbnails are copied into this repository.
- Data source: `data/shuoshuo-day-companion-01.json`, with `verifiedTranscript:false`. Do not change that flag without checking an authorized text source and re-reviewing claims.
- This allows independent practice without republishing the creator's lesson.

## Where it lives
- Open **My lessons** → **A Day with Shuo**, or use `/?rehearsal=shuo-video-day-01`.
- The existing **My Day · Day 01 V2** screen also links to this companion.
- New files: `app/shuoshuo-day-companion.tsx`, `app/shuoshuo-day-companion.css`, `data/shuoshuo-day-companion-01.json`, `tests/shuoshuo-day-companion.test.mjs`.
- This branch stacks on `codex/my-day-01-v2` from draft PR #31, not the stale main branch.

## Learning workflow
1. Watch the linked original clip. If YouTube is blocked, use the open-in-YouTube link with an appropriate connection.
2. Study one of six original Chinese day-scenes, switching on Hanzi, tone-marked pinyin and English separately.
3. Tap phrase/character text for the shared dictionary; the limited matching canonical vocabulary exposes the Atlas and shared writing tools.
4. Recognize 23 vocabulary targets in Hanzi → pinyin → meaning reveal order, then practise producing a parallel personal story.
5. Optional **supported practice** uses exact existing `Item` identities. No invented vocabulary IDs or new FSRS curriculum records are introduced. Mere reading, navigation and reveals have no grading side effects.

## Next stage for exact video-derived study
When a transcript/captions are supplied by the learner, extract vocabulary, meanings, grammar patterns and timestamps; verify against the source and tag each as `verified`. Keep original independent examples clearly separate. For public/app publication, avoid republishing a lengthy verbatim transcript without appropriate permission. Add true source-aligned timestamps and audio **only after validation**; never invent these fields.

## Validation
- `npm test -- tests/shuoshuo-day-companion.test.mjs` (repo script runs the suite; `node --test tests/shuoshuo-day-companion.test.mjs` runs only these checks)
- `npm run typecheck`
- `npm run build`
- Browser acceptance: both catalog and deep-link entry, original YouTube fallback, the six scene buttons, 23 reveal cards, dictionary/Atlas, shared writing, practice-only review, mobile 390px and iPad 1024px. These have **not yet been executed in this session**.
- This work is a draft PR, not a production deployment.
