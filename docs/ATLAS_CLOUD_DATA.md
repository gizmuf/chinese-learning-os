# Cloud map data adapter

Source-only handoff for the additive Atlas experiment; no UI, routes, auth, learning events, assets or publication changes. Based on live HSK3 source `90c8a065d0a21449e8431470f9302f9b15f9db31` (Sites v22).

`app/atlas-cloud-model.ts` exports `CloudLevel = 'all' | 1 | 2 | 3` and `CloudWord` with `id`, `hanzi`, `pinyin`, localized `meaning`, `level` (or null), `origin: 'curriculum' | 'atlas-example'`, optional localized canonical `item`, and optional `atlasCharacterId`.

- `cloudWords(locale, level='all')`: numeric scopes are cumulative: 300, 500 and 1000 canonical syllabus entries. All adds 20 extras and reviewed Atlas example words absent from the canonical word/reading inventory. Canonical IDs and polyphonic/sense distinctions are retained. Unlevelled examples are available only in all and have no Item, fabricated sentence, HSK/audio identity or review schedule.
- `wordsForCharacter(hanzi, locale, level='all')`: actual lexical membership only; one-character query, no arbitrary word construction.
- `familyForComponents(componentIds, level='all')`: structural AND intersection over the existing 121-character inventory. Empty selection shows all scoped reviewed characters, unknown components return none. Numeric scope comes from actual vocabulary characters; components never receive invented HSK levels.
- `cloudComponents(level='all')`: existing component object plus exact reverse `characterIds` and `count`.
- `cloudCharacter(hanzi, locale, level='all')`: nullable reviewed `character`, explicit `decompositionAvailable`, `parts` containing `component` and `roles` (semantic/phonetic/visual), and lexical `words`. An unreviewed character can have words while its decomposition remains unavailable. These are the existing modern structural annotations, not new etymological certification; discoveries retain existing grading limitations.
- `cloudCoverage(level='all')`: actual curriculum entries, extras, unique word characters, reviewed inventory, mapped/unmapped character lists, and added example count. Word-character inventory is not presented as the official separate recognition-character syllabus.

The adapter reads `app/content.ts`, `app/translate.ts` and existing Atlas model/data only; no dataset import or new license. Theme groups never establish structural membership. Canonical sentence/grammar context comes from `CloudWord.item`; Atlas-only examples intentionally have no invented sentence/grammar. Reuse existing writing callbacks with the canonical Item or Atlas constituent character.

Five focused tests cover cumulative filtering, exact IDs/polyphones, examples such as 晴天, structural AND/reverse indexes, explicit unmapped coverage and trilingual meanings. TypeScript also passes. Integration/publication belongs to the frontend owner after merging this source-only handoff.
