# Lesson UI contract

Use the established Intensive Course lesson list, numbering and quiet light surfaces. New material should reuse the same information structure: overview, lesson journey (examples and vocabulary), independent checks, downloadable materials. Topic visuals support the journey rather than introducing a second navigation system.

- A vocabulary item appears once. Put Listen and Write beside that item. A selected card uses a subtle border/tint; reserve dark primary buttons for primary actions.
- Put a complete example sentence directly after its explicit selector. Do not duplicate a vocabulary-only card under a sentence heading.
- Selection buttons contain plain text. Underlined Chinese text opens the dictionary. Never describe dictionary links as example selectors or nest action buttons inside a selector.
- Pinyin, translation and meaning chunks are independent display controls. Preserve the exact source sentence when splitting chunks.
- Narrative routines read vertically, with semantic illustrations. Show a clock only when a time is stated; show durations as durations, and dayparts as approximate overlapping ranges. Do not substitute “time not specified” for an action label.
- Keep the shared toolbar compact: language menu, two visibly distinct Hanzi examples, component highlight only in the stroke mode. Keep accessible names, keyboard focus and usable touch targets.
- Exploration, listening and supported writing do not create independent review grades. Preserve existing lesson/activity IDs and progress.

November 4 implementation: Lesson 12 transport cards + contextual choices; reference time lesson morning/class stories and daypart bands; shared compact appearance/language controls. Other lesson structures remain intact.
