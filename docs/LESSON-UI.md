# Lesson UI contract

Use the established Intensive Course lesson list, numbering and quiet light surfaces. New material should reuse the same information structure: overview, lesson journey (examples and vocabulary), independent checks, downloadable materials. Topic visuals support the journey rather than introducing a second navigation system.

- A vocabulary item appears once. Put Listen and Write beside that item. A selected card uses a subtle border/tint; reserve dark primary buttons for primary actions.
- Put a complete example sentence directly after its explicit selector. Do not duplicate a vocabulary-only card under a sentence heading.
- Selection buttons contain plain text. Underlined Chinese text opens the dictionary. Never describe dictionary links as example selectors or nest action buttons inside a selector.
- Pinyin, translation and meaning chunks are independent display controls. Preserve the exact source sentence when splitting chunks.
- Narrative routines read vertically, with semantic illustrations. Show a clock only when a time is stated; show durations as durations, and dayparts as approximate overlapping ranges. Do not substitute “time not specified” for an action label.
- Keep the shared toolbar compact: language menu, two visibly distinct Hanzi examples, component highlight only in the stroke mode. Keep accessible names, keyboard focus and usable touch targets.
- Exploration, listening and supported writing do not create independent review grades. Preserve existing lesson/activity IDs and progress.

November 4 implementation: Lesson 12 vocabulary/example pairs with decorative pictures + contextual checks; reference time lesson morning/class stories and daypart bands; shared compact appearance/language controls. Other lesson structures remain intact.

Lesson 12 follows Lessons 6–8 directly: Overview, numbered Lesson journey, Short checks, PDF materials. Each vocabulary card uses the standard whole-word StudyText dictionary target, Pinyin, translation, Listen and Write. Its authored sentence appears beside it on desktop and immediately beneath it on mobile. Illustrations are small and decorative. No scene-selector cards, comparison mode or per-character annotation renderer. Existing legacy links open the corresponding journey topic.

Shared Writing Studio offers Whole word / One character using the same per-character strokes and completion state. Tablet/desktop starts with whole-word fields for 2–6 character expressions; phone starts with one field. Switching layout never clears the draft. All characters must be completed before comparing/saving; missing stroke data still blocks guided completion. Pencil-only pointer filtering applies to field selection as well as ink.

Writing opened from another surface keeps an explicit Back to learning material action and a local return URL/view/scroll position. Non-review writing has an explicit word/mode/layout route; reloading it must restore that word instead of resuming an unrelated recognition review from the bare root URL. The notebook's visible whole-word model uses the same SVG stroke data as its trace guides, and disappears under Hide guides.

The shared dictionary uses one order for words and nested characters: headword/actions, highlighted source sentence, expression/character structure, extra examples. Write is available for every Hanzi expression; Atlas is offered whenever the shared route resolver has a destination. Source audio is resolved from the exact shared lesson entry, including Lesson 12. The close control uses a subtle keyboard focus ring; the resize grip is a curved corner. Lesson 12 can annotate authored character readings directly below each glyph; unsupported alignments retain the full Pinyin line, and the existing Pinyin toggle hides both forms.
