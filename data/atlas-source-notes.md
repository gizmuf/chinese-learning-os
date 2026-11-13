# Atlas 100 content source

The target inventory, selected character senses/readings, example words and page locations come from **Hanzi Connections Atlas, Version 2, English edition**, target pages 5–24. Each of the 20 groups has five distinct targets. The dataset has exactly 100 distinct targets; the PDF's supporting characters in example words are not additional targets.

English meanings follow the selected PDF contexts. French and Russian are concise teaching translations. Target readings remain separate from word readings: 吗 is neutral `ma`, 妈 is `mā` while 妈妈 is `māma`, 生 is `shēng` while 学生 is `xuésheng`, and 过 is `guò` in 经过 `jīngguò`.

Component membership records recognizable **modern shapes**, including selected nested units, rather than claiming a complete historical decomposition. It deliberately excludes isolated stroke fragments. Named shape units and aliases are not pronunciation rules. `phonetic` is assigned only to the four families identified by the source (青, 马, 方, 包). `semantic` follows the source's explicit meaning-component clues; a theme or a shared modern shape alone does not assign it.

Review-sensitive shape connections are labelled conservatively: the 月-looking bottom of 青 does not assert a moon meaning; the lower form of 茶 resembles 木/朩; 听 describes simplified 口 + 斤. 走 is a separate whole-character component, distinct from 辶; 门 is distinct from 户; 目 is distinct from 日; and 学 has the top forms ⺍ + 冖 above 子, with no 宀 membership. Family and body themes imply no shared component. 本 includes 木, so 体 includes 人/亻, 本 and nested 木; 想 includes 相, 木, 目 and 心.

Verification during authoring: 100 unique characters and ASCII codepoint IDs; exact equality to the supplied 100-target inventory; 20 unique five-target groups matching source pages; all component and optional phonetic/semantic references registered; all three languages populated. This is a curated learning index, not an exhaustive paleographic dictionary.

## Discovery and rendering scope

Six authored discovery entries in `app/atlas-extra.ts` extend the Sun index: 星、时、春、是、间、暖. Their component inventories are deliberately partial; component-choice grading is restricted to the 100 reviewed core targets. 日 excludes the superficially similar 白 inside 怕 and the 曰-like form inside 曷/喝. These are selected teaching connections, not every sub-stroke box in a glyph.

`public/atlas/component-strokes.json` is derived from Make Me a Hanzi dictionary decomposition/matches and the existing Hanzi Writer graphic data. The artifact records the source URL, dictionary SHA256 and licenses. To reproduce it, download the official dictionary and run `node scripts/author-atlas-structure.mjs <dictionary-path>`. Only mappings with matching stroke counts are expanded recursively. Unmapped components are retained in the learning index and shown without selective colouring. Dictionary-derived mappings retain LGPL-3.0-or-later notices; graphics retain the Arphic notices. See `public/licenses/` and `docs/OPEN_SOURCE.md`.
