# Broad, contextual dictionary lookup

ChineseOS keeps the existing curriculum entries, identities and learning events.
The shared popup supplements them with a CC-CEDICT headword index (197,154
simplified/traditional spellings) and selected Make Me a Hanzi fields for 9,574
characters. Unknown terms are resolved through `/api/dictionary?text=…`; no paid
API, model call or credential is involved.

The server reads an immutable, licensed CC-CEDICT snapshot from this existing
repository, pinned at `fff58597c6108ed7063d9b35d3a1f8bd1eed2481` and checked by
SHA-256 before decoding. Source text is cached in the warm worker. Useful entry
results and compressed resources are cached in a separate browser CacheStorage
namespace. A failed request is not a lookup success. Real misses, loading and
retryable outages have separate states; character breakdown remains available.
Source and license links are visible in the popup and dictionary resource notes.
The first uncached compound lookup needs a network connection.

Authored sentence pinyin constrains word boundaries, avoiding false matches
across grammar words or minute/time expressions. Exact syllable alignment can
select an attested polyphonic character reading; if the same character has
multiple readings in that sentence, ChineseOS lists the source senses instead
of guessing. My Day sentence 6 therefore resolves 得 as děi, must/have to.
Wrong-reading audio is not reused. Its existing full-sentence Qwen recording is
available as explicitly labelled sentence audio, without new synthesis.

The shared definition popup is 304px wide at most, clamped to the visual viewport.
Its dedicated handle supports touch/mouse dragging, a six-pixel drag threshold,
arrow keys (16px) and Shift+arrow keys (4px). Normal text scrolling and buttons
retain their gestures. The normalized window position is stored independently
of learner progress and restored after resize, rotation and reopening.
Modern IDS operators are displayed as readable layout names. Unknown analysis
is not invented; source-based structure remains distinct from reviewed Atlas
relations. Writing receives the selected reading and meaning. Missing local
stroke data uses the existing Hanzi Writer dataset through
`/api/character-data?character=…`, with a pinned package version and real errors.

Atlas retains its structural family counts. The exact 电 / 曰 view still has
2 directly linked characters, 更 and 电, with unreviewed shape roles. A separate
word list shows 8 expressions in its current HSK scope and 611 spellings in the
broader dictionary snapshot, with 18 per page. These are literal compounds
containing 电, not characters sharing the pronunciation diàn or new etymological
claims. Words can be inspected without changing the current Atlas route.

Both new API routes are public read-only fixed-source lookups. No learner
sentences, notebooks, voice credentials or production database are sent to the
dictionary source. HK hosting must run the existing Vinext/Worker backend and
retain static dictionary assets; an nginx-only copy cannot serve these routes.
Existing intentional French, Russian and Turkish UI modes remain available.
Main English UI, source explanations and comparison labels contain no Polish.
