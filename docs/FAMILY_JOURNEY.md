# Family journey

An additive Atlas layout, `layout=journey`, provides one continuous native vertical scroll through the complete selected vocabulary. The default Atlas entry opens cumulative HSK1–3 (1000 entries, 655 distinct hanzi); scope controls also offer HSK1 (300), HSK1–2 (500), and All (including extras/Atlas examples). All existing layouts remain available.

## Grouping and coverage

The planner uses existing canonical IDs from `cloudWords`. Each entry has exactly one main location. HSK1, HSK2 and HSK3 are grouped independently and appear in ascending level order, followed by unlevelled extras when All is selected. Expanding the scope cannot change earlier-level group assignments.

Within each level, up to ten useful literal-character families are formed. Preferred simple anchors start with 学, 电 and 天; remaining slots use productive anchors, with at least three still-unassigned words and readable source pronunciation/meaning. Existing prefix ordering keeps constructive pairs together. Words not assigned to a character family retain their existing lesson/topic group. Topic groups are explicitly labelled separately from shared-writing groups. The planner does not infer semantic or etymological function from containment.

Current data produces 24 sections per HSK level: 72 sections and 1000 entries through HSK3. All currently has 1069 entries in 83 sections. These counts are derived, not fixed limits. There is no pagination, infinite-loader gate or hidden vocabulary subset; every row is rendered. The optional group index and level buttons jump within the same document.

## Reading, audio and context

Every row always shows hanzi, full-word pinyin and canonical English meaning. FR/RU add the existing localized meaning while retaining English. Character-family headers show the anchor's source reading and English definition; these do not replace the full word pronunciation. Topic labels and all controls support EN/FR/RU.

Each row has a speaker tied to that exact word's existing bundled Mandarin recording. Clicking the word expands its existing sentence, sentence pinyin, translated context, sentence speaker and writing action inline, preserving the journey. Audio uses the existing single player and speed controls, stops on scope/language/selection/navigation changes, and never creates mastery events. Writing reuses the current animated Studio and existing return route. Atlas-only entries explicitly offer their linked character and disclose missing sentence context.

`entry=<canonical-id>` preserves the expanded word in the URL across refresh and Studio return. Closing details returns keyboard focus to the word. Native page scrolling remains available on desktop/iPad; reduced motion disables smooth jumps. The page-end message reports coverage, not mastery.

## Verification

Model tests cover exact one-time coverage in all scopes/locales, distinct HSK tracks, stable earlier assignments, literal group membership, English/pinyin retention in FR/RU, exact recording references, selection and URL round-trips. Browser verification covers the complete row count, scrolling/jumping through HSK3, inline context, actual audio responses, writing return, language/scope changes, original light palette, narrow-screen layout and retained old views. Bundled word recordings are checked for every entry. Physical iPad/Pencil acceptance requires a real device.
