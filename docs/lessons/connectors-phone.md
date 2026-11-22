# Connectors, frequency & phone habits

One lesson in **My Lessons**, with the full source reading also available in Reading Lab.

## Source and coverage

Source: `Mandarin_Connectors_Phone_Reading_and_Hanzi.pdf`, 27 pages, provided as a local file on 22 November 2026.

SHA-256: `74b5db271fea7c66eb57512eb6b3cbb91c0561051052a620adf8774c21d32b54`.

The unchanged PDF is included at `/assets/connectors-phone/Mandarin_Connectors_Phone_Reading_and_Hanzi-74b5db271fea.pdf`. Its credits and license pages remain intact.

| Source pages | Lesson section | Coverage |
| --- | --- | --- |
| 1–2 | Connectors & frequency | 18 constructions, 10 frequency/time expressions, five phone-related expressions, five examples |
| 3–4 | Trends & relationships | 越来越, 越…越, six main examples, four variants/combined examples, four gap exercises continued in practice |
| 5–7 | Read & listen | All 15 sentences, original tone-marked pinyin, all 15 English translations |
| 8 | Be careful | All seven contextual caution examples |
| 9–11 | Use it yourself | Six contextual writing prompts with model answers, four grammar gaps with explanations, two speaking challenges |
| 12–24 | Hanzi & pinyin | All 63 characters, source readings and stroke counts, shared notebook and Writing Studio |
| 25–27 | Source PDF | Original attribution and license pages |

Page 7 of this supplied edition is the full English translation. It is retained. The earlier instruction to omit an isolated “Recall the words” page does not remove any material from this edition, which has no such page.

## Additional contextual practice

The additional 然 group is stored separately in `data/connectors-phone-ran.json`: 然后、当然、突然、仍然、果然、居然、不然、要不然. Each word has pinyin, a short contextual example, shared dictionary/writing actions and an active gap exercise. 然后 is contrasted with both event + 以后 and future-oriented 以后. Shared written characters are not presented as synonymous meanings.

The frequency comparison distinguishes 经常 / 常常 as near-synonyms from 有时候、很少、几乎从不、从不 as frequency contrasts. 然后 is explained as sequence, with a different construction. 带来了好处 and 带来了坏处 precede the optional adverse-result example with 造成了.

## Routes and persistence

- My Lessons: `/?study=library&material=connectors-phone&from=lessons`.
- Reading Lab: `/?atlas=1&reader=1&hsk=2&readingText=ditouzu-full`.
- The existing `readingText=ditouzu` excerpt is preserved.
- Reading and writing dialogs stay in the current lesson. Dictionary navigation uses the existing shared popup.
- Source sentence/English/pinyin context is attached to clickable text. English and pinyin reveal are independent.
- The shared narrator keeps the current sentence and playback position through comparisons, dictionary lookups and writing detours.
- Hanzi and pinyin answers are stored in the current notebook’s IndexedDB under `lesson:connectors-phone:answers`. Latest-write confirmation waits for the latest queued write. Existing learning events and grades are not migrated or replaced.
- Notebook handwriting uses the existing shared notebook and its persistence. Revealing a model or using the notebook does not create an independent SRS grade.

## Audio

The full 15-sentence reading is **85.752 seconds**, with exact per-sentence cues. The 64 fixed word/example recordings and the joined reading use the established `zh-CN-XiaoxiaoNeural` course voice at −10%. Hashes, cue frames and text-to-recording mappings are recorded in `data/connectors-phone-audio.json`. Opening the lesson does not request synthesis or invoke a system voice.

The previous nine-fragment Qwen excerpt omits five source sentences and is not substituted for the full reading. Its route and files remain intact.

## Verification and delivery boundary

- 68 focused source, narration, Reading Lab, shared writing and lesson tests passed.
- TypeScript check and focused ESLint passed.
- HK static production build passed.
- Chrome checked My Lessons discovery, dictionary, independent reveals, all 15 reading rows, real muted audio, sentence/position continuity, shared writing, Hanzi/pinyin draft restoration, grammar gaps and the last character notebook.
- WebKit with an iPad Pro 11 profile checked direct Reading Lab entry, touch actions, muted audio playback/resume, popup continuity and notebook input. Three rapid synthetic pen contacts were saved; an additional palm touch did not add ink. This is browser validation, not a physical Apple Pencil test.
- Responsive checks at 390 px found no horizontal page overflow. Screenshots and machine-readable evidence are under `output/playwright/` and `output/connectors-phone-20261122/` in the working checkout.

The lesson was first reviewed locally in `867adc72`. The authorized integration targets Alibaba and Contabo using their current host-specific source parents. The PDF uses an existing allowed static asset directory and a content-specific filename; publication policy and audiences remain unchanged. No new shared-reading token or Sites operation is required. Current host releases and activation evidence belong in `CHINESE-OS-STATUS.md` and `output/connectors-phone-deploy-20261122/`.
