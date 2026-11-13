# Atlas hybrid layouts

Three extra Atlas layout buttons let students compare the same material without replacing Cloud map, Family + context, Full path, Space + cards or Word families:

- **Layer map** shows readable source components → selected hanzi → words containing it. Clicking a component exposes other characters containing that source component within the selected material.
- **Family constellations** shows eight frequent characters with membership counts; selecting a less frequent character from the complete index brings it into the orbit. Families overlap, so membership counts are not additive.
- **Repetition matrix** has canonical whole-word rows and character columns. A dot means literal presence. Row and column pages are independent and bounded, with 12 words per page and 3–10 responsive columns. Touch horizontal swipes also change the word page; native vertical scrolling remains available.

The shared Material picker selects a literal character family (one to eight hanzi), the first 100 curriculum entries in the current vocabulary scope, or every available entry in that scope. HSK 1, cumulative 1–2, cumulative 1–3 and All use the existing `cloudWords` source. No additional curriculum IDs, progress identities or grading writes are created.

The full character index gives access to every unique hanzi in the selected words. Canonical IDs and alternative readings are retained. Repeated characters count once toward word membership and separately toward total occurrences. For example, the HSK1 学 family has 12 entries, nine distinct hanzi and 26 occurrences; the first 100 HSK1 entries have 113 distinct hanzi and 159 occurrences. These are material counts, not promises of learning outcomes.

Structural components come from the existing reviewed/derived `hanzi-structure.json` adapter, with curated Atlas data used for extra examples outside the HSK inventory. Unsupported private-use glyphs are omitted and incompleteness is disclosed, never replaced by guesses. Dashed lines mean modern written structure; solid lines mean literal inclusion in a word. They do not establish shared meaning or historical etymology. Curated localized character meanings are shown where available; full word meanings, sentence translations, labels and controls use existing EN/FR/RU content.

Word and sentence speaker buttons use the existing bundled Mandarin recordings and single audio player. Full word/pinyin/context are visible beside the control so the clip has a clear referent. Writing opens the existing animated Writing studio and its existing return route. Atlas-only examples explicitly offer their linked character, not an unrelated full-word writing exercise.

## Routes

`?atlas=1&cloud=1&layout=layers&hsk=1&hanzi=学`

Layouts: `layers`, `constellations`, `matrix`. Shared state: `anchor`, `entry`, `hsk`, `hanzi`; additional state: `mapset=family|hundred|scope`, `mappart=<glyph>`, `wordpage=<zero-based>`, `charpage=<zero-based>`. URLs survive reload and browser Back/Forward. Changing material/scope clears stale page and word selections; layout switching preserves the comparison context. Invalid values fall back safely.

## Verification

Pure model tests cover canonical coverage at all scopes, exact counts, repeated occurrences, source-grounded component membership, selection consistency, exhaustive page coverage, safe URL round-trips, old layout defaults and all three language labels. Browser verification additionally checks responsive layouts, selection, source links, pagination, audio, writing return, language switching and retention of old layouts. Physical iPad/Pencil acceptance requires a real device.
