# Teaching references for Atlas

## Review scope — 23 October 2026

[Chinese Decoded](https://www.youtube.com/@Chinese.Decoded/videos) had eight long videos and 23 Shorts in the inspected channel catalogue. Transcripts were obtained for all 31, including retries after the player loaded. All Shorts and the relevant linguistic sections of the long videos were inspected; visual sequences from the original 莫 video were sampled. This is **not** a claim to have watched every minute of all 31 videos or verified every historical, cultural and linguistic assertion. Working transcripts stay outside the repository and release assets.

The channel repeatedly teaches families through a stable component, a scene, related words and semantic contrasts. These are useful organizational ideas for original Chinese OS lessons. They do not establish that every proposed shared abstract meaning is a historical derivation.

## Claims checked against primary scholarly entries

The [CUHK Multi-function Chinese Character Database](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/) supplies early forms, explanations, cited texts and competing interpretations. Read its modern explanation alongside the older Shuowen quotation: the two can differ.

| Claim / character | Evidence and implementation decision |
| --- | --- |
| [莫](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=莫): sunset among plants | Supported. Early forms show sun among vegetation. The lower part later changed toward the modern 大-like shape. Use the sunset scene. |
| 莫 negation derived from “cover / hidden potential” | The channel proposes this derivation. CUHK instead describes borrowing for grammatical negation and pronouns. Teach the borrowing account; do not present the proposed semantic chain as settled history. |
| [暮](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=暮): added 日 | Supported: an additional 日 distinguished the original dusk meaning after 莫 acquired grammatical uses. |
| [幕](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=幕), [摸](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=摸), [模](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=模), [漠](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=漠) | The entries identify 莫 as the sound component. This does not rule out all semantic association, but does not establish a universal “cover” derivation. Use original cloth, touch and model scenes with explicit meaning/sound clues. |
| [東](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=東): sun behind a tree | A concrete conflict: the channel's element video (about 5:11) presents this as formation. CUHK explains the earliest shape as a tied bag borrowed for east, and explicitly rejects the sun-in-tree analysis. The sunrise/tree image could be a labelled mnemonic, not an origin lesson. |
| [巠](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=巠): one universal pathway | CUHK retains both warp-thread and waterway interpretations. Its analysis supports keeping uncertainty; it does not prove every family member derives from a single abstract pathway concept. |
| [艮](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=艮) / [很](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=很): boundary → extremely | CUHK discusses stalemate, looking back and stopping for 艮. It identifies 艮 as sound in 很, with disobedience as the original meaning and the degree adverb as a later sense. “Walk to the extreme” is a possible memory hook, not a verified origin here. |
| [元](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=元) / [玩](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=玩) | Head → first/beginning is supported for 元. 玩 is analysed with 玉 meaning and 元 sound. The video's “return jade to a state before assigned duties” story is not established by that entry. |

Conclusion for content authoring: adopt verified explanations and useful teaching structure; assess a new family character by character. A sound component may also carry meaning in a particular character. Neither “all phonetics are meaningless” nor “every shared component predicts meaning” is our teaching rule.

## Other teaching approaches inspected

- [Outlier Linguistics: Three Attributes, Three Functions](https://www.outlier-linguistics.com/post/three-attributes-three-functions): distinguish form, sound and meaning functions, including cases with more than one function. This informs our component labels and comparison tasks.
- [Hacking Chinese: mnemonics for abstract or overlapping components](https://www.hackingchinese.com/how-to-create-mnemonics-for-general-or-abstract-character-components/): use concrete, distinguishable memory hooks and avoid stories that collapse similar characters into the same vague scene. This is pedagogical advice, not a measured effectiveness result for Chinese OS.

Apply these as original teaching designs: scene → component contrast → whole word and sentence → guided retrieval. Learn exact word readings and tones rather than guessing them from a family resemblance. A short pilot lets learners judge clarity and integration before larger content expansion.

## Shipped pilot: 莫 story trail

Five cards: 莫, 暮, 幕, 摸, 模. Four contextual words: 暮色, 夜幕, 摸摸, 模型, each with a sentence. All explanations, prompts, feedback and narration are in EN/FR/RU. The Mandarin word and sentence recordings use the existing Xiaoxiao voice. 模's alternate mú reading in 模具 is explained, without inventing an identical pronunciation across the family.

Chinese OS scenes and copy are original. Do not copy channel artwork, narration or transcript into assets. Early-image schematics are labelled as explanatory illustrations, not inscription facsimiles. Origin accounts and memory scenes have separate labels and per-character source links.

This optional trail does not expand core Atlas/HSK targets, change existing lesson schedules or award FSRS credit. Existing picture stories, family assemblies, writing and listening remain available.

## Authoring and verification

Data: `app/atlas-family-stories-data.ts`; UI/art: `app/atlas-family-stories.tsx`; motion: `app/atlas-family-stories.css`.

```sh
node scripts/export-atlas-family-stories.mjs /tmp/chinese-atlas-family-stories.json
# In an authoring venv with edge-tts==7.3.1 and ffmpeg available:
python scripts/generate-atlas-family-stories.py --content /tmp/chinese-atlas-family-stories.json
node scripts/verify-atlas-family-stories.mjs
```

Generation is authoring-only and sends authored text, never learner data. Exact text/voice/rate, SHA-256 and MP3 decoding gate reuse; bounded retries write a temporary recording before replacing the prior file. Prebuild verifies the checked-in inventory and hashes. Changes to captions require regenerated matching narration.
