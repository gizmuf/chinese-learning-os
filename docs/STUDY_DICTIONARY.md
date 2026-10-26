# Shared study dictionary

`StudyLookupProvider` wraps the application's main study area once. It reuses the existing Atlas `StudyDictionaryDialog` and `DictionaryAudio`, with the same word → character interaction, pronunciations, close behavior and optional Atlas action. It does not create another dictionary design or replace existing card/map navigation.

`StudyText` provides individual keyboard-accessible word targets; `whole` opens a complete displayed expression before offering its characters. It preserves shared-character coloring. It is used explicitly in Family Journey family anchors, expanded words and example sentences; hybrid/word-family context; the HSK library; and recognition recall. Journey's original row still expands its sentence. A separate book icon opens its word definition without changing the row's expanded state.

Passive Chinese text elsewhere in the main learning area also supports click/tap lookup through a delegated handler. It reads the clicked text node and verifies the actual glyph bounds rather than treating an entire paragraph as the target. It does not mutate React-owned DOM. Standard [caretPositionFromPoint](https://developer.mozilla.org/en-US/docs/Web/API/Document/caretPositionFromPoint) is preferred; [caretRangeFromPoint](https://developer.mozilla.org/en-US/docs/Web/API/Document/caretRangeFromPoint) supplies the WebKit fallback. Whitespace, punctuation, selected text, modifier clicks, buttons, answer choices, links, inputs, SVG maps, canvases and handwriting surfaces keep their existing behavior.

The shared vocabulary includes the existing HSK/Atlas dictionary, Lesson 3/4/5 terms, video characters and source-backed metadata for all 968 locally served writing characters. The metadata comes from the previously used Make Me a Hanzi dictionary and retains its LGPL/source attribution in `public/licenses/hanzi-structure-*`. Reviewed/localized definitions take precedence. Unreviewed fallback character definitions may be English. No new audio is generated: the dictionary uses validated existing character, word and course recordings and labels whole-word pronunciation context accurately.

## Assessment integrity

A dictionary help event is handled by each opted-in exercise's existing assisted/hint state. HSK recognition recall, Lessons 3/4/5 checks and classic Atlas practice save lookup-assisted results as assisted; they do not advance independent recall. For recognition/listening formats whose event schema does not represent assistance, lookup stays unavailable before checking and becomes available in feedback. Answer-choice buttons continue to answer the question, rather than opening a definition. Drawing surfaces are excluded from passive lookup.

## Validation

Focused tests cover the reported `请从这个门出。` example, word/character targets, punctuation hit rejection, localized metadata, source audio paths, shared-character highlights, and absence of nested buttons. Browser checks cover Journey → 门 → mén/door, FR/RU/TR variants, word → character → writing → return, passive text outside Atlas, and a real assisted HSK recall result (one supported attempt, zero independent reviews). Existing lessons, PDFs, Atlas views and deck-motion code are retained.
