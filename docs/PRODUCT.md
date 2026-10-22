# Chinese OS

A calm daily Chinese practice space for beginner classmates. Works in a browser on iPad, iPhone and desktop; no Xcode or native app installation is required. The interface and learning translations are available in English, French and Russian. Learning material pairs simplified characters with tone-marked pinyin and translations.

## Daily use

1. Open **Today** and choose a short practice session, or explore **My lessons**.
2. In **Writing studio**, progress through **Watch → Trace → Copy → Recall**. Complete whole words one character at a time.
3. For Recall, write before comparing the answer. Rate your memory: Again, Hard, Good or Easy. This is honest self-assessment, not automatic handwriting recognition.
4. Use **Review** for separate recognition, listening and writing queues. Choose an estimated 5, 10 or 20 minute session; the displayed duration is a workload estimate, not a countdown.
5. **My progress** shows attempts and each skill's next review. Export your history as JSON for a personal backup.

The optional **Notebook · Zeszyt** layout in Writing studio adds worksheet practice without replacing Watch, Trace, Copy or Recall. Each character has cumulative stroke-order diagrams (the new stroke is orange), selectable enlarged steps with a start dot, a model, two trace boxes and three empty copy boxes, plus a final whole-word row. Hide guides removes models and stroke diagrams; it remains assisted practice. Save requires at least one empty copy box per character. Worksheets and drawings persist locally per account and word; the saved practice event syncs with account history as assisted copying and never advances the independent FSRS schedule. The existing Recall mode remains the route for self-assessed memory reviews. Worksheets adapt to HSK1, HSK2 and extras and use the existing bundled character data.

**Printable notebooks:** use **Print notebook PDF** in My lessons or Writing studio. Select individual words, or choose a lesson and select all shown. The export is restricted to the active HSK1, HSK2 or extras level. It downloads an A4 PDF with pinyin, localized meanings, vector stroke-order diagrams, a model, two trace models and six blank practice boxes per character, plus page numbers and name/date fields. Font and character resources come from this Site; PDF generation runs in the browser and does not upload progress or drawings. Exporting does not record practice.

**Languages:** the top-bar selector offers English, Français and Русский for navigation, instructions, account screens, lessons, all 520 word meanings and sentence translations, and PDF headings. Chinese, pinyin and Mandarin audio remain the learning material. The language preference is stored in this browser; changing language preserves word IDs, review queues, history and active handwriting. Translation source files are in `data/`; no runtime translation service is required.

**Pencil only** rejects finger/mouse drawing inside the writing surface. Turn it off for finger practice. The left-handed layout moves the reference away from the writing hand. Undo, Clear, Hint, Replay and Next character remain available in the studio. Completed free-writing strokes and drafts survive page refresh and screen rotation.

## Learning rules

- Vocabulary items are whole words, including words containing more than one character.
- FSRS tracks recognition, listening and writing independently, with a 90% target retention. This target is a scheduling setting, not a measured success rate.
- Watch, Trace, Copy and assisted attempts are practice records; they do not earn successful independent-recall credit.
- Due reviews precede new words. A session has a finite number of words and a completion screen.
- The library contains 520 learning cards across 14 topics: all 300 HSK1 and 200 HSK2 entries from the November 2025 examination syllabus, plus 20 practical extras. The study-level selector keeps HSK1, HSK2 and extras separate throughout the library, writing choices, daily summaries, review queues and progress views. HSK1 is the default. The chosen level is remembered in this browser with the notebook settings. Topic filters and pinyin search remain available. This is a vocabulary practice library, not the complete grammar/task syllabus. See `data/README.md` for authoring and provenance.

## Accounts, saving and privacy

A guest notebook belongs to the current browser. Clearing browser data can remove it. Sign in with Google, ChatGPT or email/password for an account notebook synchronized through Sites D1. No ChatGPT account is required. Email accounts must verify their address before syncing. Google and ChatGPT are the two prominent sign-in options. Email is a smaller collapsed “Use email instead” section; its registration, verification and password reset remain available. Guest and signed-in notebooks are separate; signing in does not silently import another notebook.

Each learning event has a unique ID. History and backups retain all levels; changing level filters the active view and never deletes history. The server derives the owner from authenticated identity, never from a client-submitted user ID. Repeated uploads are deduplicated per user. Review state is replayed deterministically from event time and ID, preserving both devices' history. There is no teacher dashboard or access to classmates' progress.

An already open page can continue saving attempts while offline and synchronize when the network returns. Status text distinguishes device-only storage, pending synchronization and synced progress. First loading the app while fully offline is not supported in this release.

## Audio and current boundaries

Pronunciation recordings are delivered with the app; see `public/audio/manifest.json` for voice and generation details. No student text or microphone recording is sent to a speech provider during use. Natural and slower playback preserve pitch.

Real Apple Pencil pressure, palm rejection, device speakers and installed browser behavior need acceptance on the actual iPad. Free writing uses self-assessment; it does not claim stroke-shape scoring or OCR. Pronunciation grading, speech recognition, teacher assignments, custom lesson import in the UI, and cold-start offline support remain future work.

## Adding a lesson

Edit the authoring files in `data/` and run `scripts/build-hsk-content.py` to regenerate `app/content.ts`. Each item needs a stable unique ID, full word, tone-marked pinyin, English meaning, Chinese example, example pinyin and translation. Never repurpose an existing ID: historical reviews depend on it. Generate bundled audio for the new text and run `npm run prebuild` to add character data. Run the documented checks and deploy an updated version of the same Site.

## Account identity and deployment

Firebase Authentication is isolated in `chinese-os-gizmuf-auth` (Chinese OS Auth); it stores credentials, not learning records. Google and Email/Password are enabled. Passwords need at least 8 characters; email enumeration protection is enabled. Google support contact: gizmuf@gmail.com. Only verified Firebase ID tokens issued by this exact project are accepted. The server verifies RS256 signatures, issuer, audience, expiry, subject, and verification status. Learning records remain in the existing Sites D1 database under `firebase:<uid>`.

The existing ChatGPT sign-in remains available for existing notebooks. ChatGPT and Firebase identities are not merged by email. Use the original sign-in method to see an old notebook. Guest work is also separate. The client remounts its notebook on identity changes and binds every sync request to the expected owner; the server rejects an owner mismatch. Clearing local data does not remove synchronized account records.

Production uses a Sites runtime variable `FIREBASE_WEB_CONFIG`, containing the Firebase web client fields apiKey, authDomain, projectId, and appId. These are public client configuration, served by `/api/auth/config`; they grant no admin access. Never store admin credentials in the browser or repository. The Firebase authorized domains include the production Sites hostname and local development loopback. For development use an ignored `.dev.vars` file, not a committed config.

## Intensive classroom course

The existing study space now includes a separate **Intensive course** with 60 lesson slots. Only lesson 03 is published; other numbers await real class material. Lesson 03 contains six topics, 58 expressions, 22 sentences, 24 interactive activities, six classroom-board photos and the nine supplied EN/FR/RU documents. HSK1, HSK2, extra cards and their identifiers stay unchanged.

The experience topic includes an interactive two-scene map comparing 过 and 了, with explicit sentences establishing the current location. The negation topic adds breakfast scenes comparing a repeated 不 routine with yesterday’s non-occurrence using 没. A “What about today?” view explicitly leaves today unknown rather than inventing a new event. Both scenes reuse the existing sentence recordings and support EN/FR/RU.

Course activities have their own account-scoped event table, local offline queue and FSRS schedule. Reading, guided copying, revealed answers and corrected retries never advance independent recall. The course overview counts distinct activities attempted, not mastery. Handwriting is self-assessed; drafts remain on the current device. Existing HSK words reuse their original writing identity; their guided course practice can appear in both histories.

See [COURSE_AUTHORING.md](COURSE_AUTHORING.md) for source review, lesson structure and the next-lesson workflow.

## Cloud Atlas

A separate **Atlas** navigation entry adds a connection-based learning route alongside HSK vocabulary and the intensive course. It starts with 100 targets in 20 constellations from the supplied Atlas PDF, plus six discovery entries (星、时、春、是、间、暖). All teaching text is available in English, French and Russian. Existing word IDs, histories and course content remain unchanged.

Click a component to see every indexed match, including matches across teaching groups and selected nested forms. For example, 日 lists 12 entries; 晴 bridges 日 → 青, and 情 bridges 青 → 心. The radial map previews ten neighbours; the grid always lists every result. Group membership and component membership are separate: a family/body theme does not imply a common shape. Back restores both the previous constellation and selected target. URLs retain the component/group and target for sharing.

Compare pairs, listen to contextual example words, practise four skills, and use the existing Notebook worksheet or independent handwriting Recall. Contextual recordings avoid ambiguous isolated readings and homophones. There are 212 bundled recordings, generated with the existing Xiaoxiao Mandarin voice. Handwriting Recall is self-assessed after writing and revealing the model; there is no automatic handwriting recognition.

Atlas events use their own owner-scoped IndexedDB and `atlas_events` D1 table/API. Meaning, listening, components and writing each have a separate FSRS schedule. Exploration, copying, hints and guided constellation practice do not advance independent recall. Anonymous practice stays on the device; authenticated history syncs with the current account. Account generation guards stop a completed request from writing into another account's notebook. History can be exported from Materials.

This is a curated index of 106 entries, not a whole-language dictionary or an exhaustive decomposition into arbitrary stroke fragments. Extra discovery entries have a partial component inventory and are excluded from component-choice grading. Component colours use verified stroke mappings; four unmapped combinations (洗/⺧, 喝/勹, 喝/人, 走/龰) show the full character with an explicit notice rather than guessed highlighting. Meanings, sounds, shapes and themes are labelled as different types of connection, not historical etymology. Materials includes the supplied English PDF and source/license notices.

Checks: `npm test`, `npm run typecheck`, the Sites build helper, and the isolated local Worker checks in `tests/atlas-api-integration.py`. The latter must never run against a production Site. Asset verification runs in prebuild, checking contextual audio hashes, writing data, component mapping bounds, licenses and the original PDF.

### Cloud Atlas navigation and visual stories

The module name follows the interface language: **Cloud Atlas**, **Atlas des nuages**, **Атлас облаков**. Single-character Notebook and Recall stay inside the Atlas. Opening a linked HSK word enters the existing Writing studio with **Back to Cloud Atlas**. This bridge keeps the Atlas mounted and restores its selected character, constellation, search and trail plus scroll position; other sidebar destinations end the temporary bridge. It does not merge word/character schedules.

Mixed/guided practice supports unrestricted Previous/Next browsing and horizontal touch swipes. Vertical movement remains page scrolling. Answers, hints and audio-play state are kept separately for each question during the session, and returning to a question preserves its options and result. Browsing/skipping does not write a learning event. Results show answered and unanswered counts; unfinished questions can be revisited. Only explicit answer checks save results; revisiting a checked answer does not save another result. A corrected answer remains assisted.

The detail panel now contains **Make the connection**, with three modes: Picture stories, Character families and Whole words. It follows supported selected characters while retaining an independent gallery. EN/FR/RU copy, persistent pinyin, 44px touch controls and reduced-motion alternatives apply throughout.

Six picture stories cover 日 (rì), 木 (mù), 月 (yuè), 水 (shuǐ), 火 (huǒ) and 山 (shān). Click a chapter to animate toward it; the scrubber remains available for precise exploration. Play/Pause, restart and narration remain available for the original sun/tree stories (18 existing recordings); the four new stories are silent, with localized captions. No missing narration URLs are requested. The final frame uses exact local glyph outlines. The middle drawings are mnemonic illustrations, not historical inscription facsimiles or a stroke-order lesson. References link to CUHK and Dong Chinese; adapted teaching notes carry attribution and CC BY-SA 4.0 in the UI and `public/licenses/atlas-teaching-notes.txt`.

Character families cover 林 (lín), 森 (sēn), 休 (xiū), 清 (qīng), 晴 (qíng), 情 (qíng), 请 (qǐng) and 明 (míng). Selecting a sibling keeps the shared component, moving/resizing its canonical shape as needed while other components enter. It resolves into the exact whole-character outlines after the transition. Meaning, sound and modern-shape roles are labelled separately. Modern sun-plus-moon is explicitly a mnemonic, not the historical derivation of 明 (míng). Tap a part to isolate it; take apart/reassemble, or build by choosing component tiles. Repeated parts occupy separate slots, wrong choices do not advance, and hints/restart remain available. This is guided exploration; it writes no learning events or independent FSRS credit.

Whole-word scenes cover 森林 (sēnlín), 火山 (huǒshān), 清水 (qīngshuǐ), 明天 (míngtiān), 手机 (shǒujī) and 电脑 (diànnǎo). Characters move together into a scene; meanings and full compound pinyin remain visible. A separate guided mode places them in reading order. Only existing matching recordings expose audio controls. Word mnemonics are labelled separately from character etymology, and the contextual meaning of 明 (míng) in 明天 (míngtiān) is explained.

Handwriting now uses the MIT `perfect-freehand` outline algorithm with real pen pressure, moderate smoothing, coalesced events and one render per animation frame. Completed strokes have a cached canvas layer; the live canvas is resized only when layout/scale changes. Pointer cancellation discards the interrupted stroke instead of saving it; mouse/right-button, Pencil-only and input caps remain enforced. Stored normalized points, timestamps, account ownership, exports and learning/scoring semantics are unchanged. The small upstream algorithm is vendored with license and exact per-file Git blob hashes because the package registry was unavailable.

For a standalone preview run `node scripts/preview-atlas-story.mjs`; `outputs/atlas-story-preview.html` bundles the real workshop, all supported existing audio, source notices and a handwriting pad. Outputs are not a replacement deployment.

**Integration and verification (23 October 2026):** the complete PR #2 branch (local handoff `1b763f56032fcd8cdfed9337d706a630ef228c62`, published equivalent `569177d17e6fd654a3aeb36a0963046a718be9e7` with identical source trees), is merged into the existing lesson-3 integration branch, together with touch navigation for the Practice lab. All 55 tests, TypeScript and the official Sites build pass. Interactive Chrome QA covers continuous narrated sun/tree playback, chapter selection, the new mountain story, reduced motion, family assembly including repeated parts and wrong choices, ordered word assembly, EN/FR/RU switching, tablet/desktop layout and lesson-3 swipe with preserved answers. Workshop feedback now translates immediately when language changes. Shared handwriting was checked with touch, simulated pen pressure, Pencil-only, right-button rejection and pointer cancellation. Physical Apple Pencil/iPad acceptance remains outstanding; emulation does not establish hardware acceptance. Existing course activity IDs, counters and student storage are unchanged.

**Publication target:** existing public Site `appgprj_6ad7885e92708191a9ed6016b15c91ba` remains the sole deployment destination. The source service recovered on 23 October and the official helper successfully synchronized the integration. Publish the verified integration through the official helper, save and deploy to the same Site, preserving its audience and bindings. Deployment success must be established by the returned saved version and deployment result, independently of GitHub integration.

### Lesson 03: Practice lab

Lesson 03 adds a separate Practice lab tab alongside its existing views: 14 tappable expression builders, four typed word families and ten short no-pinyin checks (six reading, four written recall). Full instructions and content are available in EN/FR/RU. Builders support removing blocks, hints and safe time-unit swaps; family cards reuse existing audio and Notebook, with a return to the lab. Short checks hide pinyin/audio before checking and support typed or self-assessed handwritten recall. Navigation does not record results. New results sync through the existing course account history; guided work stays assisted. The original 24-activity completion count and all HSK/Atlas histories remain unchanged. Open directly with `?course=intensive&lesson=3&lab=1`. See `docs/COURSE_AUTHORING.md` for source, scoring and session-draft limits.

### Learning lab: optional connection journeys (experiment 01)

An additive **Learning lab** tab lives inside Cloud Atlas (`?atlas=1&lab=connections`). Lesson 03's existing Practice lab links to it in a new tab, keeping classroom answers in place. No sidebar destination, course activity, HSK item or Atlas review identity is removed or repurposed. The lab uses the existing authored assemblies and workshop; subsequent compatible content additions become available without duplicating those assets.

Two paths use the same five activities: **Connections first** (explore, assemble, meaning, listening, writing) and **Recall first** (meaning, listening, writing, assemble, explore). Start with one character. A modal inspector shows meaning, word pronunciation, component relationships and supported animations, then restores focus to the same activity. All new copy is EN/FR/RU. Component tiles assemble exact existing stroke outlines, with reduced-motion support. Handwriting uses the shared pressure-aware Ink component and honest self-assessment. Listening requires successful audio playback before answering. The launch picker shows meanings/pinyin rather than the character answer.

Lab records are deliberately separate from existing account histories and FSRS cards. They live in an owner-scoped IndexedDB (`chinese-os-connection-lab-v1-<owner>`), **on this device only**; the UI states that cloud sync is not included yet. JSON export includes attempts and optional usefulness feedback. A tab/account-scoped draft preserves in-progress answers, completed steps, hints, feedback and compact handwriting through refresh. Ending a session discards only its unfinished draft; saved results remain. Failed result saves keep the answer available for retry. Event IDs prevent refresh/retry from advancing a result twice. Account changes remount the notebook and stale async storage callbacks are discarded.

Meaning, listening and writing have separate experimental schedules for each route. Assembly and exploration are guided activities, never independent recall. Once an answer or hint is seen, subsequent checks in the session remain assisted; an inspector visit is also a guided exploration record. Recent exposure in the preceding 30 minutes marks a new attempt assisted, including across route switches. Supported checks seed a first follow-up at +24 hours without awarding successful recall credit; independent checks update the isolated FSRS schedule. A review tests one skill of one character, avoiding within-session answer leakage. Comparison shows supported attempts, independent attempts and remembered answers per skill and route, plus feedback response counts. These are descriptive personal records, not a causal efficacy study or automatic pronunciation/handwriting scores.

New source: `app/connection-lab*`, `tests/connection-lab.test.mjs`, `scripts/preview-connection-lab.mjs`. Integration changes are limited to `app/atlas.tsx` and a link in `app/course-lab.tsx`; existing animation/content files are untouched so the concurrent content expansion can merge independently. The standalone HTML harness is for local QA, with isolated test account names and bundled recordings; it is not a separate deployed app.

Learning lab validation: 62 tests, TypeScript and the official Sites build passed. Browser interaction QA is outstanding in this session: starting the local server returned `listen EPERM`, and opening the standalone `file:` preview was explicitly rejected by browser URL policy. No browser workaround was attempted. Test the five-step paths, refresh/resume, hints, wrong choices, audio failure, drawing/reveal/rating, double-save protection, EN/FR/RU, phone layout and account switching before the integration owner publishes this experimental UI. The separate physical iPad/Pencil acceptance also remains outstanding.
