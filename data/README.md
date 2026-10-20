# Vocabulary authoring and provenance

The library has **320 distinct words and phrases: all 300 HSK1 entries from the November 2025 examination syllabus, plus 20 everyday extras**, arranged in 14 topics. HSK1 membership is separate from the topic. The 2021 proficiency standard and the older HSK 2.0 lists use different counts; do not combine those editions or label the extras as HSK1.

## Authoring files

- `hsk1-reference.json`: numbered word identities and readings; the syllabus edition, original URL and source PDF SHA-256 are recorded alongside the factual reference.
- `hsk1-lessons.tsv`: original Chinese practice sentences, English meanings/translations and topic assignments for the 300 entries. Format: `hanzi|topic|meaning|sentence|translation`. These are practice examples, not copied official examination questions. Some examples introduce useful words outside the level-one list.
- `starter-vocabulary.json`: the original 32 items, with their existing IDs and material. These stay intact; 24 match the HSK1 list and eight are everyday extras.
- `bonus-lessons.tsv`: 12 additional everyday phrases. Together with the eight starter extras these make 20.
- `app/content.ts`: checked-in generated application data. The website needs no dictionary service at runtime.

Keep item IDs stable. New syllabus entries use `hsk1-001` through `hsk1-300`, except where an existing starter ID already owns the same word. Do not reassign an old ID to another word. The membership test compares every numbered entry, not just the total.

Regenerate with the isolated authoring environment (pypinyin 0.55.0):

```sh
python scripts/build-hsk-content.py
node scripts/export-audio-content.mjs /tmp/chinese-os-expanded-audio.json
python scripts/generate-audio.py --content /tmp/chinese-os-expanded-audio.json
npm run prebuild
npm run typecheck
npm test
npm run build
```

The audio script requires edge-tts 7.3.1. It resumes hash-verified unchanged recordings and reuses identical text. It stores progress after each successful recording, so interrupted generation does not discard completed work. Browser use plays bundled MP3s, without sending student data to a provider. Polyphonic standalone words `只` and `了` are cut from a short disambiguating context using Edge word-boundary timing and ffmpeg; that context is recorded in the manifest. This avoids the isolated-word readings zhǐ and liǎo when the lesson teaches zhī and le.

Pinyin examples are generated locally using pypinyin, including overrides for common neutral syllables, citation third tones, and contextual 一/不. The checked-in vocabulary readings follow the syllabus; the original 32 items retain their original material.

## Sources checked

- [Chinese Tests Service HSK page](https://www.chinesetest.cn/HSK) links the official examination syllabus.
- [Official November 2025 syllabus PDF](https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf). Physical pages 80–87 contain level-one entries 1–300. SHA-256: `ec74ce0439e837bbb15154be13e747ae798903b2fd3a331629df6c3b45504941`.
- [hsk-tutor.com machine-readable transcription](https://github.com/uranbekanarbaev/hsk-3.0-vocabulary-dataset) was used to cross-check the numbered words and readings. Every word identity was also compared with text extracted directly from the official PDF, with 300 matches and zero mismatches. Its [rights notice](https://github.com/uranbekanarbaev/hsk-3.0-vocabulary-dataset/blob/main/LICENSE.md) does not license source examination material under MIT; no such grant is assumed here.

Only basic word identities/readings are used as a factual syllabus reference. The source PDF and examination tasks have not been bundled. No example sentences, English definitions or recordings were copied from the source datasets. English glosses, translations, topic assignments and practice examples were authored for Chinese OS. Character graphics and application libraries retain their separate licenses in `public/licenses/`.
