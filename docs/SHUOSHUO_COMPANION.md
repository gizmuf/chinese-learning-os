# Shuoshuo vocabulary companion

Based on deployed v63 `a7a13964c7b4b0818f1d4e639e1edaf1f8710d60`. The additive `?companion=shuoshuo` entry is available from My lessons and StudyStudio. It preserves My day V2, existing curriculum/progress and the 32 audio-comparison assets.

## Content and learner contract

Exactly ten common words/phrases are selected from the coordinator-verified Baolingo text associated with YouTube ID `V6SrjHDisDs`. This is third-party text evidence, **not audio verification**. Official video and text-source links, creator attribution and independent-companion status are visible. There are no copied transcript passages, invented timestamps, creator-sentence quotations, media downloads, new recordings or partnership claims. All ten example sentences are original ChineseOS practice examples. This is limited vocabulary practice, **not a complete exact-sentence listening lesson**.

| Exact expression | Existing canonical Item | Treatment |
| --- | --- | --- |
| 起床 | hsk1-161 | Supported, ungraded companion practice |
| 刷牙 | none | Whole-expression lesson-only practice |
| 洗脸 | none | Whole-expression lesson-only practice |
| 烧水 | none | Whole-expression lesson-only practice |
| 泡咖啡 | none | Whole-expression lesson-only practice; never replaced by 咖啡 |
| 阳台 | none | Whole-expression lesson-only practice |
| 看书 | none | Whole-expression lesson-only practice; never replaced by 看 or 书 |
| 工作 | hsk1-063 | Supported, ungraded companion practice |
| 上课 | hsk1-177 | Context-dependent attend/teach sense; no creator role inferred |
| 休息 | hsk1-246 | Supported, ungraded companion practice |

Atlas links only point to actual mapped characters/components and are labelled character links, not equivalent vocabulary IDs. Writing reuses SharedWriting Watch/Trace/Copy/Recall for the complete expression. Existing locally served stroke files cover every selected glyph. An explicit empty audio override disables unverified recording choices without changing existing callers.

The existing owner notebook's `drafts` store holds `vocabulary-companion:shuoshuo-v1`: selected word, reveal phases, active writing term/mode and local practice-save flags. Revision/lease checks fence stale tabs; owner checks and async generations prevent cross-owner restore. Raw ink stays in existing writing drafts. This is device-local practice state, not cloud-synced learning events. Reading, revealing and writing saves in this companion emit no FSRS grades. The onSave adapter saves only an ungraded local practice flag and retains ordinary save-failure handling.

## Existing RecognitionReview synchronization gate — diagnosis only

The producer in `app/recognition-review.tsx` emits the exact `detail.input` string:

```text
hanzi > pinyin > English; self-assessed
```

It is 39 characters. `app/event-schema.ts` accepts only strings of length <=30 for that field. This restriction predates the producer (`git blame`: validator `b486b4e2`; producer introduced by `4944a95fefdf9e054b8ed47db2d6b0e6ba49cc0b`, 1 November 2026 14:35:01 Shanghai, “feat: streamline recognition reviews and reuse full writing studio”). Source comparison confirms the mismatch in v60 `ba35ec3`, v61 `12ba587`, v62 `558295b` and v63 `a7a1396`; this companion does not introduce it.

`RecognitionReview.rate` constructs the payload unless retrying a pre-existing `a.event`, persists its UUID/payload in the recognition draft, then invokes the shell's record callback. `study-app.tsx` stores it locally with `synced:false` via `local-store.ts:putEvents`, which does not apply the server schema. Local schedule calculation can therefore succeed for an independent meaning event even though upload will fail. Assisted/practice meaning events contain the same rejected marker, although they do not create FSRS cards.

`StudyApp.synchronize` groups pending main-learning events in batches of up to 20 and posts to `/api/progress`. That route validates the **whole batch** against eventSchema before inserting anything; a batch containing this marker returns 400 “Invalid learning event”. The client throws before marking that batch synced, leaves original UUIDs/payloads/local records intact and stops that sync pass. Other valid main-learning events in the same batch, plus later batches, can consequently remain pending. Earlier successful batches remain synced. This is source/fixture evidence, not an inspection of real learner records.

The direct producer is RecognitionReview's meaning/recall flow, both assisted and independent. Existing writing events use `pen`/`mixed`, which pass this field constraint. Separate Atlas/course/recognition-progress endpoints do not use this exact main-learning payload. Their unrelated traffic was not audited or changed; main-learning writing uploads can still be held behind a bad meaning event in a shared batch.

Proposed separate bounded repair: use a <=30-character marker for new events and narrowly allow the **exact legacy marker** alongside ordinary <=30 strings in the validator, with producer/API/legacy-UUID retry tests. This would avoid deleting or rewriting pending events. **No such repair, schema change, registry change, migration or normalization is part of this release.**

## Validation and limits

Focused tests exercise the real companion with fake owner notebooks: exact content/mapping, no shorter-ID substitution, local glyph availability, reveal ordering, Back, reload/writing-mode restore, stale writes, owner switches and zero learning events. A real RecognitionReview fixture is driven through reveal/rating with canonical IDs in assisted and independent modes; the actual emitted event fails the real validator, while a writing fixture passes and a mixed batch fails. This test documents the gate rather than fixing it.

Browser/mobile interaction acceptance is unavailable because the latest supported CUA check reported the Mac locked; no unlock, alternate DOM/browser path or retry was attempted. React interaction tests, responsive CSS review, type checking, production build and native Sites publication are distinct from real browser/iPad/Pencil acceptance.
