# Lab 02: Cloud Atlas

## Product decision

The owner rejected a sequential exercise-first Atlas on 24 October 2026. The core job is seeing a whole related family, following any component into another family, then moving between components, characters, lexical words and sentences without losing context. Existing Atlas/Lab/Studio variants remain intact. This is an additional experiment at `?atlas=1&cloud=1`, not a replacement of global navigation or evidence that one method should replace the whole course.

The architect owns this interaction/frontend/motion. The existing SOL executor owns the graph adapter, structural index, coverage/provenance, data integrity and most technical implementation. Separate worktrees and immutable commits preserve the already published HSK3 v22 source `90c8a065d0a21449e8431470f9302f9b15f9db31`.

## Interaction model

Four persistent spatial zones: parts on the left, the whole matching character family and larger selected centre, lexical words on the right, and a sentence below. Clicking a part recentres its family; clicking a character changes the centre and words while retaining the family when applicable. Clicking a word promotes the whole word to the centre, with each constituent clickable. Sentence links lead back into lexical navigation. Pinyin and meaning accompany characters and words. Different roles distinguish meaning clues, sound clues and modern visual membership, including nested parts; a shared shape does not prove shared etymology or meaning.

Stable 2D positions were chosen for this first prototype instead of a rotating 3D globe: labels should stay upright, nodes should remain selectable, and the route should stay comprehensible. A short entrance motion tracks a clicked character into the centre; reduced-motion disables it. Buttons and a horizontal swipe on the central card support family traversal. Families above twelve nodes use a grid automatically to prevent overlap; all results are available, with scrolling when they exceed the viewport. The Grid control allows a compact alternative. Expand map provides a single-screen layout on a tablet in landscape; phone layout stacks the same four zones.

Component intersection shows real indexed characters containing every selected part. It is a search, not a claim that the selected parts exhaust a character's decomposition or may be arbitrarily assembled into new characters. Variants such as 人/亻 are displayed explicitly.

HSK scopes are cumulative and belong to vocabulary entries, not to components. Scheme: November 2025 examination syllabus used by the existing app. Unknown/unlevelled examples appear only in All. “All” is the included library, not all Chinese. Same written form with distinct readings/senses retains canonical identities.

## Writing and state

Whole-word writing calls the existing `onWord` flow with the canonical Item; its existing return preserves the mounted map and exact route. Reviewed Atlas character writing opens the existing Notebook in a modal and records only against the existing Atlas ID. Memory practice immediately after seeing the model is marked assisted. New structure-index IDs must never be passed to the Atlas progress API. Map browsing, selection and combination are not learning-completion events. No authentication, storage schema or progress migration is part of the experiment.

URL state stores selected character, family, word, focus kind, vocabulary scope and component intersection. Back/refresh restore the visible material. Search accepts hanzi, pinyin without tone marks and localized meanings. Transient exercise state is still owned by existing practice components.

## Research and rationale

- [HanziGraph](https://hanzigraph.com/) is a close precedent for exploring character-to-word connections alongside example sentences. Its author explicitly describes word-forming connections; that is not the same as a complete component decomposition graph.
- [HanziCraft](https://hanzicraft.com/) demonstrates nested character breakdown, phonetic sets and productive components. It supports the feasibility of the lower-level part/character navigation.
- [Outlier: Getting Radical About Radicals](https://www.outlier-linguistics.com/post/getting-radical-about-radicals) distinguishes dictionary indexing radicals from functional meaning/sound components. The product therefore labels relation types and does not equate all visible pieces with radicals.
- [Xu and Padilla, 2013, DOI 10.1111/flan.12039](https://doi.org/10.1111/flan.12039), [author-uploaded full text](https://www.researchgate.net/publication/263385124_Using_Meaningful_Interpretation_and_Chunking_to_Enhance_Memory_The_Case_of_Chinese_Character_Learning), discusses 132 bujian within a particular chunking approach to 3500 frequently used characters. Their experiment supports studying meaningful grouping and retention, but does not validate this UI or prove a globe/map beats other study formats.
- [Chinese Ministry of Education component standard announcement](https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/tnull_45766.html) describes a different formal decomposition: 514 components grouped into 441 groups for 3500 common characters. There is no single universal “132 radicals” inventory to hardcode.
- [Official HSK syllabus](https://www.chinesetest.cn/syllabus) is the versioned authority. The existing application's exact source PDF and hash live in `data/hsk3-reference.json`.

## Evaluation boundary

The useful next user evaluation is whether they can follow a component into a new family, find its words, reach an example, practise writing and return without losing orientation. Compare this against Lab01 before any replacement. Learning effectiveness requires delayed independent recall, not map clicks or satisfaction alone. Inline grammar notes cover a small selected set of exact examples. The combined release also includes the dedicated HSK3 grammar curriculum at `?grammar=hsk3` (57 cards, 114 exercises, 12 themes); its implementation and limits are owned by `docs/HSK3_GRAMMAR.md`.

## Coverage and provenance

The default HSK map indexes 655 distinct characters appearing in the 1,000 HSK1–3 entries. The alternate Atlas collection retains its 121 curated targets. Structural data from Make Me a Hanzi is separately licensed and cited in `docs/ATLAS_CLOUD_DATA.md` and `data/hanzi-structure.json`; 574 character breakdowns are complete according to that source and 81 are partial/unknown. This is not 655 manually verified etymologies. Unreviewed character definitions/readings have an explicit English/source label; contextual word readings come from the existing curriculum.

Default families match direct IDS decomposition parts, including shape variants. The nested-parts switch includes the deeper structural index. Neither view proves a semantic relationship: for example a geometrical 人 in a larger shape is not automatically a person meaning clue. The URL retains collection and nested/direct mode. Whole-word writing is used for new structural characters; only existing curated IDs enter Atlas writing progress.

## Validation

- Integrated immutable v22 source plus executor data/adapter and grammar commits; preserved existing routes, owner-scoped progress and word-writing return flow.
- TypeScript passed; 108 tests passed. The vocabulary audit found zero lemma/pinyin/structural errors across 1,000 entries and 655 distinct characters (not a native-speaker certification).
- Browser: character→component→family, direct/nested families, AND intersection, pinyin search, HSK filtering, collection switch, canonical words/sentences, writing and exact map return, refresh, EN/FR/RU, phone and tablet layout.
- 1024×768 expanded map: all four zones fit; tested six-node ring has zero centre collisions. 390×844 Russian layout has no horizontal overflow. Larger families use scrollable grids; a phone stacks zones rather than compressing the entire map illegibly.
- Reduced-motion disabled animations; no console errors in tested states. Horizontal pointer swipe is implemented, but native iPad touch acceptance remains unverified because this browser surface does not support raw touch dispatch. No test progress was written to the public account.
- Executor separately verified the grammar interactions and full audio index; final public smoke checks and immutable publication receipt follow below.
