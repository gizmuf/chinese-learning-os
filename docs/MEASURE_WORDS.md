# Measure words

Open `/?study=measure-words`, the **Measure words** sidebar destination, or its link in **My lessons**.

This is a curated beginner resource: **72 entries, 144 authored example phrases, 12 groups**. It includes common individual classifiers, containers/portions, action counters, standard units and time expressions; these categories are distinguished in the UI. It does not claim to enumerate every classifier or every valid noun pairing in Mandarin.

The classroom examples are **一扇门 yí shàn mén**, **一扇窗 yí shàn chuāng**, and **一只猫 yì zhī māo**. 扇 is **shàn**, fourth tone, in this use. It differs from 山 shān and the verb reading 扇 shān. 只 zhī (classifier) differs from 只 zhǐ (only), and 支 zhī (pens). Examples show spoken 一 tone changes; headwords retain lexical tones and third tones retain standard written marks. Learn the phrase, since classifier choice depends on the noun and intended meaning.

## Content and sources

- `data/measure-words.json`: stable resource IDs, tone-marked headwords, English glosses/notes, group IDs and two natural examples per entry. Examples and English teaching copy are authored for this resource. They are not a transcription of the unavailable classroom photo.
- Ministry of Education Mandarin dictionary, [扇](https://dict.revised.moe.edu.tw/dictView.jsp?ID=8940): distinguishes shàn as a classifier for doors/windows or panel-like objects from shān as the verb. The UI links to this reference. Dictionary facts are paraphrased; examples are independently authored.
- The existing shared dictionary keeps its pinned [CC-CEDICT and character-source notices](../data/dictionary-sources.json). This feature does not download, replace or regenerate the lexicon.
- Interface labels support EN/FR/RU/TR. The collection explicitly labels teaching meanings/examples as English; it does not pretend they are translated lesson content.

Coverage: people; animals/groups; home/objects; clothing/pairs; places/buildings; books/study/language; transport; food/containers; nature/types; actions/repetitions; standard units; time patterns. Includes contrasts such as 部/场 for a film/showing, 门/节 for a course/session, 只/双 for a single item/pair, and 道/盘 for a dish/plateful. Standard units and time expressions are supplementary patterns, not all object classifiers.

## Learning and identity boundaries

`app/measure-words-model.ts` searches Hanzi, marked/unmarked/numbered pinyin and English, including noun examples. Its exact-reading lookup reuses **40 existing vocabulary IDs**. It never adds cards to `app/content.ts`, changes the 300/200/500 HSK counts, changes the 20 extras, or creates a new review registry.

The shared dictionary receives one headword per spelling and additional classifier senses. Existing readings, word identities and recordings are preserved. Phrase examples retain authored reading context for nested word/character lookup. Existing remote dictionary enrichment remains in use.

**Learn** shows the headword and examples. **Recall** hides the Chinese/pinyin until an explicit reveal. This oral self-check is ungraded and allows alternative valid pairings. Reading, filtering and revealing write no progress events.

**Write classifier** and **Practise phrase** open the existing `SharedWriting` studio: Watch/Trace/Copy/Recall, common Print/Stroke shapes, ink drafts, and its shared Pinyin/tones/Chinese keyboard practice. Exact existing headwords reuse their IDs; contextual practice remains assisted. New headwords/phrases use supported local writing/language drafts, not invented independent SRS cards. The component is keyed by account in `StudyApp`; writing persistence remains in the existing account-scoped database. Returning to the resource preserves its current filter/reveal state while mounted. Reload opens the resource catalog; it does not restore the catalog's current writing destination.

No recordings are generated. Existing canonical word audio is retained; unavailable pronunciation buttons in contextual writing stay disabled. No speech service, new provider, credentials, database migration, merge or deployment is required.

## Authoring and checks

Add a unique resource row and its group to the JSON, preserving existing IDs. Use natural noun pairings and reviewed tone-marked pinyin. `scripts/prepare-learning-assets.mjs` includes this data when bundling Hanzi Writer data: all characters in headwords and examples must have local stroke data and retained dataset licensing.

`tests/measure-words.test.mjs` checks tone/alignment and stroke coverage for every phrase, required classroom examples, search, fixed HSK identities, exact-reading reuse, idempotent dictionary enrichment, contextual 只 disambiguation, hidden-answer recall, filters, shared writing targets, Back and discovery links. Existing shared-writing/Pinyin tests continue to cover grading and storage semantics.

Source base: `3ea10d342ca44681d72f9c3c2c00188a649220c1` on `codex/pinyin-ime-writing` (draft PR #36), independently checked against remote on 5 November 2026. Main remained `3d63cbb868386fd1d8c733f96dd78f82b0b26b5b`, older than the live lesson work. Work is isolated in its own clone/branch; release ownership stays with the existing source owner. A stacked draft PR is for review only.
