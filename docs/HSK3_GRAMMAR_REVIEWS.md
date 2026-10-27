# Independent HSK3 grammar reviews

Prepared 27 October 2026 against `codex/shared-study-lookup` at
`2184bda280091ce0cad094d34d649fe5577e382b`; the remote base was rechecked before
preparing the patch and had not moved. This base includes the current shared
study lookup, Lesson 05 and video-study changes. Pinyin and Writing Studio
Recall changes are outside this patch.

## Behaviour

The grammar page now offers **Independent reviews** alongside the existing
12 units, 57 cards and 114 exercises. Guided study retains exactly the existing
`grammar-hsk3-v1` draft key, exercise IDs, answers and checking behaviour. No old
draft is converted into an event or independent recall credit.

Reviews show only the exercise prompt, gap sentence and choices. The rule,
example, pinyin and explanation remain unmounted until a hint is requested or
an answer is durably saved. A hint marks that attempt `assisted: true`; the
existing scheduler ignores it. Correct/wrong independent choices use the same
course FSRS ratings, 90% retention and deterministic scheduling. These are
independent multiple-choice reviews, not a claim of free-production mastery.

New answers use `lessonId: grammar-hsk3` with the authored exercise ID. The shared
course registry validates all 114 IDs; the existing `/api/course-progress`
endpoint and `course_events` table provide account-scoped server storage. The
legacy GET without `lessons=all` continues returning Lesson 03 only. Vocabulary,
Atlas and existing lesson counters are separate.

**Review due** selects scheduled due exercises, earliest first. **Start new
reviews** selects up to ten exercises without an independent schedule. Assisted
attempts do not remove a new exercise or move an existing due date. Future-due
exercises are excluded. The queue is fixed for the session; each answer is saved
once before revealing feedback, with its UUID retained across failed-save
retries. A guest remains device-only. Refreshing ends the current session, but
saved results and schedules survive.

The existing course store's IndexedDB operations and transport were extracted
into `course-persistence.ts` for testing, retaining the database name/version,
object-store name and key. Sessions guard their owner and lifetime before and
after asynchronous work. Switching accounts immediately hides the previous
snapshot and stops stale uploads/imports. A request already sent can complete
for its original owner; its continuation cannot acknowledge or import data into
the new notebook. The existing server ownership checks remain in force.

## Executed validation

- `npm test`: **210 passed, 0 failed**. Includes 7 new scheduler/persistence/sync
  tests and 4 new component/hook tests, plus the existing regressions.
- `npm run typecheck`: **passed** (`tsc --noEmit`).
- `node node_modules/vite/bin/vite.js build`: **passed** across the production
  build environments. Existing dynamic-import/chunk warnings remain.
- `node scripts/test-grammar-api.mjs`: **8 grammar + 38 course API checks passed**
  on a built local Worker and isolated local D1, using local test identity
  headers. The runner applies the repository's existing migrations to fresh
  temporary local state; it never accesses production D1.
- ESLint on `course-store.ts`, `course-persistence.ts`, `grammar-hsk3-data.ts`,
  `grammar-hsk3-learning.ts`, and `hsk3-grammar-review.tsx`: **passed**.
- `git diff --check`: **passed**.

Persistence tests use fake-indexeddb with the real IndexedDB operations. Sync
unit tests supply a controlled transport for offline/retry/remote-merge and
in-flight account changes. Component/hook tests run the actual React component
and course hook with an English context and controlled authentication transport;
they cover hidden hints, assisted results, duplicate clicks, failed-save retries
and account switches. React's test renderer emits its deprecation notice.
The separate API checks exercise the real built route and D1, including UUID
replay, matching UUIDs under different owners, malformed/cross-lesson events,
stale-owner rejection, and supported-result roundtrips.

## Delivery status

This is a source patch, not a Sites deployment. No production database migration,
production account writes, merge or publishing was performed. No physical iPad,
Apple Pencil, Safari or real multi-device sign-in session was tested. Before a
Sites rollout, perform a preview smoke test with two actual accounts and an
actual offline/reconnect cycle. Existing clients must receive the updated shared
event schema when using the new grammar events.
