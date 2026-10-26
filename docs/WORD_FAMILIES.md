# Whole-word families

An additive fifth Atlas view, **Word families**, groups real words by a literal shared character or contiguous sequence. It complements the four existing component/character layouts; no previous view, deep link, lesson or schedule is replaced.

## Data and identity

`app/word-family-model.ts` reads the existing `cloudWords(locale, scope)` adapter. HSK scopes are cumulative: 1, 1–2 and 1–3; All includes the existing extra/Atlas examples. There is no second CSV curriculum. Canonical IDs, alternate readings and original spellings remain separate. A group is a writing pattern, not evidence of shared meaning, sound or historical origin.

Examples in HSK1: 学 12, 电 6, 大 4, 哪 5, 那 6, 学生 4 and 电影 2. The 学 family has 26 character occurrences and nine distinct hanzi. All matches remain available, including groups larger than fifteen entries. The character index counts each vocabulary entry once for each contained character. Anchor input supports one to eight Han characters, including multi-character anchors; empty groups have a recoverable empty state.

## Board and comparison

The study surface uses the original Chinese OS light palette, shared with the three hybrid views. Rows align the first shared occurrence in a fixed column; every occurrence is highlighted, including repeats in prefixes or suffixes. Words with the same prefix stay together, preserving constructive pairs such as 大学/大学生. Pinyin and localized full-word meanings sit beside the hanzi. The expanded tablet view fits all twelve 学 rows at 1024×768; exiting restores normal Atlas navigation. On phones the reading and meaning wrap beside the same aligned hanzi.

The 哪/那 comparison matches actual prefix/suffix contexts in the selected corpus. Missing counterparts say they are unavailable; no hypothetical word is constructed. Selecting a row retains the family and shows its existing sentence, pronunciation and writing entry. HSK writing uses the canonical Studio and its existing return path. Unlevelled Atlas examples explicitly offer their linked character's existing writing branch.

## Difference training

`WordFamilyReels` renders two 400 px native scroll surfaces around a fixed shared anchor. Both views use one bounded vocabulary index. Mouse drag on either side, native wheel/touch scrolling, keyboard arrows/Home/End/PageUp/PageDown, buttons and the range control choose only complete source words. Labels describe the entire word, including pinyin and localized meaning; they do not assign a word's meaning to a fragment. Row height adapts to the labels. Reduced motion uses instant positioning.

Memory mode shows the meaning prompt and fixed anchor, while hiding variable fragments, readings, sentences, shortcuts and the answer list. Reveal exposes only the current word; moving, changing locale/scope or reloading hides the new answer. A reveal token is bound to the exact word/context, so a later render cannot accidentally reveal another word. Exploring/revealing creates no learning event and introduces no new SRS skill. Existing writing gates still govern any actual saved handwriting.

## Routes

- `?atlas=1&cloud=1&layout=words&anchor=学&hsk=1`
- Add `wordview=train&entry=hsk1-028` for the 大学生 training position.
- `anchor=学生` and `anchor=电影` select literal multi-character groups.
- `compare=na` selects the board comparison; it cannot mix with training.
- `memory=1` starts a hidden-answer training state.

Anchor, scope, selected canonical entry and mode survive reload/back/return from writing. Existing layout and legacy Listening parameters keep their prior semantics.

## Verification

Model tests compare every character group against the complete canonical corpus in every scope, check the named counts, adjacency, literal reconstruction, repeated/multi-character anchors, alternative readings, missing pairs, bounded indices and route normalization. Browser checks cover both reels, native drag/wheel synchronization, masking/reveal/next, local audio HTTP 206, writing return, reload/back, EN/FR/RU, 390 px without horizontal overflow, expanded 1024×768, reduced motion, the four old layouts and legacy Listening. Architecture/UX accepted the preview independently. These checks do not claim physical-iPad/Pencil acceptance. Exact source and publication are recorded in the release receipt.

## Separate design direction

A future hybrid map can connect components → hanzi → whole words, with separate structural, semantic and phonetic relation types and explicit coverage counts. It is not part of this release. Shared writing reduces repeated material, but does not remove the need to learn each word's pronunciation, meaning and usage.
