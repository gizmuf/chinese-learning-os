# Pinyin, Hanzi and Chinese keyboard practice

Writing Studio and Review offer three additional skills: `pinyin` (Hanzi → typed or handwritten Pinyin), `hanzi-from-pinyin` (Pinyin + meaning → characters), and `ime` (untoned keyboard reading + meaning → committed Chinese characters). These use the existing learning-events table and IndexedDB store with new skill keys. Existing item IDs, events and writing/recognition schedules are unchanged. The content generator retains the expanded type and display names.

Tone-marked and numbered Pinyin normalize to the same reading while preserving tones and ü. Missing, incorrect, conflicting or invalid tone numbers fail. Hanzi checks compare the committed characters, with spacing and punctuation ignored. English context disambiguates the expected expression.

IME Enter is ignored during composition, including Safari's key code 229. The browser neither installs nor selects an OS keyboard. Learners select the Chinese Pinyin keyboard themselves and choose its candidate. Paste/drop marks an attempt supported.

The existing Ink canvas handles Pencil, pressure and palm rejection. Notebook adds lined Pinyin fields using additive cell keys; previous worksheets remain readable. Handwriting is frozen before revealing the model, then explicitly self-assessed. There is no handwriting recognition claim.

Shared lesson/dictionary/Atlas entry points are supported practice because the model was visible. Their drafts have a separate namespace and their events never receive independent SRS credit. Atlas writing hides the Pinyin cue until requested; requesting it persists assistance. Closed language disclosures do not mount or expose the model.

Attempts preserve UUID, submitted event, assistance and completed state across reload. Failed writes retry the immutable original event. A deliberate new attempt or review series creates a new identity. New review series use a run ID in the URL and draft key; reload within a series stays readonly after grading. Owner databases remain isolated, and asynchronous completion is guarded by component lifetime.

Verification covers tone cases, event-schema compatibility, separate SRS keys, composition events, readonly reload, assistance persistence, immutable retries, review-run identities and existing shared writing regressions. Browser QA uses a local guest only. Responsive iPad dimensions and synthetic pen input do not establish physical iPad/Pencil or native iPad IME acceptance.

Reverse handwriting uses numbered Hanzi grid cells and character-specific comparison labels. Previous handwritten drafts without a grid marker retain their original surface geometry until the learner explicitly clears or starts a new attempt. Shared lesson dialogs keep a centered frame and sticky close header; nested exercise headers stay vertical despite course-dialog flex styles.
