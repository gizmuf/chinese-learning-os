# HSK3 vocabulary level

HSK3 is an independent study level in the existing application. It adds 500 entries (official IDs 501–1000), bringing the library to 1,000 syllabus entries plus 20 everyday extras. HSK1, HSK2, classroom lessons and Atlas retain their identities and layouts. This is vocabulary-level coverage, not a claim that all HSK3 grammar lessons, historical character stories or Atlas animations are complete.

The reference is the official HSK examination syllabus published November 2025, effective July 2026: vocabulary PDF pages 92–104. `data/hsk3-reference.json` records the URL, SHA-256, source pages, sense markers and official pronunciation. It is the same source edition used for HSK1 and HSK2; legacy 600-word HSK3 lists are not mixed in.

`data/hsk3-authoring.json` contains original contextual examples and EN/FR/RU glosses and sentence translations. The a/b/c batch files are authoring inputs to `scripts/assemble-hsk3-content.py`; edit those, assemble, then run `scripts/build-hsk-content.py` (pypinyin 0.55.0) and `scripts/build-translations.mjs`. Official word pinyin is preserved; example pinyin is generated with reviewed phrase overrides. Homographs keep separate IDs, notably 得 dé and 得 děi. Learning history uses stable `hsk3-501` through `hsk3-1000` IDs, independently of earlier levels.

All word characters use locally bundled Hanzi Writer stroke data. Existing Watch/Trace/Copy/Recall, Notebook and printable selected-word/lesson PDFs work through the same level filter. Word and example recordings use the existing Xiaoxiao Mandarin voice, rate -10%; audio is bundled locally, without student text being sent to a provider at runtime. `scripts/verify-audio.mjs` checks text identity, file size and SHA-256. `scripts/generate-audio.py` resumes verified clips and uses pronunciation contexts for ambiguous isolated words.

## Release verification

Verified 24 October 2026: 97 unit tests, TypeScript and the official Sites production build passed. Content checks cover all 500 official entries, separate filters/review pools, stable IDs, all EN/FR/RU translations, local writing assets and trilingual PDF generation. All 1,000 new MP3s decode without errors; the manifest verifies all 2,040 library recordings. All earlier audio hashes remain unchanged except the corrected HSK2 station example.

Browser checks cover selecting HSK3 (500), filtering words, FR/RU cards, both characters of 照片 in Watch and Notebook, a real Russian PDF download and visual render, audio buttons, hidden scripts before listening reveal, rating and a switch back to an untouched HSK1 review pool. The built Worker/D1 passed 21 functional API checks, including HSK3 acceptance, old history preservation and two-account isolation. The separate oversized-body transport probe is not counted: local Wrangler reported 413 but the client timed out/restarted; it is now last and can be explicitly skipped for functional local testing. Production request limits were not changed. Physical iPad/Pencil acceptance and a real external Google account login were not repeated in this release.

A source audit also corrected HSK2 entry 486 站1 to the official noun station/stop, distinct from HSK3 966 站2 (stand). Its ID and historical events are retained, while its teaching example, translations and sentence recording are corrected. Indexed HSK3 pinyin readings distinguish contextual 得, 还, 长, 教 and neutral syllables without rewriting earlier level pinyin.

No database migration or authentication/access change is required. Publication receipt follows after the existing Site reports success.
