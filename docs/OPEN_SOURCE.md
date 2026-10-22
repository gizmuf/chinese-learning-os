# Reuse for Chinese OS

Reviewed for this content expansion, 21 October 2026. Keep the existing browser UI, identity and progress model. Reuse focused components and documented data rather than replacing the application.

| Project | Useful material | License / boundary | Decision |
| --- | --- | --- | --- |
| [Hanzi Writer](https://github.com/chanind/hanzi-writer) | Stroke animation, trace quizzes, stroke-order feedback | MIT code; character data has its own license | Already used. Keep the existing integration and ship stroke data for the expanded library locally. |
| [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) | Character strokes and medians | Graphics derive from Arphic fonts; dictionary and graphics have different licenses | Reuse through the installed `hanzi-writer-data` package. Preserve its Arphic notices. No need to write a stroke engine. |
| [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | Spaced-repetition scheduling | MIT | Already used for three separate skills. Keep existing schedules and historical IDs. |
| [Inkstone](https://github.com/skishore/inkstone) | Complete offline Chinese writing app; useful reference for hints and practice | GPL-3.0; an older Android application | Useful UX reference. No source imported and no replacement/native app introduced. |
| [krmanik/HSK-3.0](https://github.com/krmanik/HSK-3.0) | HSK/Anki lists, handwriting lists and grammar references | Mixed source notices; includes the 2021 standard as well as newer material | Useful cross-check and future export reference. Do not treat all folders as the same syllabus or copy a whole deck under an assumed blanket license. |
| [HSK 3.0 vocabulary dataset](https://github.com/uranbekanarbaev/hsk-3.0-vocabulary-dataset) | Numbered 2025-syllabus transcription | Original browser code MIT, selected original additions CC BY 4.0; source syllabus and transcriptions excluded from those grants | Cross-checked factual membership/readings against the official PDF. Authored our own teaching material. See `data/README.md`. |

This release adds content, not another learning engine. A future Anki export could reuse the stable IDs and existing scheduling history, but no new account system, dictionary service, dependency upgrade or imported application code is needed for this expansion.

## Atlas component mappings

The Atlas reuses Make Me a Hanzi's **dictionary** decomposition/matches in addition to the existing graphic strokes. Dictionary data is LGPL-3.0-or-later; graphics derive from Arphic fonts and retain their separate notices. The generated mapping artifact records upstream URL and input SHA256. The derivation script is `scripts/author-atlas-structure.mjs`; no runtime dictionary service or new application dependency is introduced. License texts are shipped as `makemeahanzi-COPYING.txt`, `makemeahanzi-dictionary-LGPL.txt` and `makemeahanzi-GPL-3.0.txt`, alongside the existing graphic notices. Teaching translations, grouping navigation and six discovery entries are authored application content; the original supplied Atlas PDF is downloadable from Materials.
