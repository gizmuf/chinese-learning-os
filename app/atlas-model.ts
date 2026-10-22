import {
  characters,
  components,
  groups,
  type AtlasCharacter,
} from "./atlas-data";
import { discoveries, discoveryComponents } from "./atlas-extra";
import { items, type Item } from "./content";
import { localizeItem, type Locale } from "./translate";
export const atlasCharacters = [...characters, ...discoveries];
export const atlasById = new Map(atlasCharacters.map((c) => [c.id, c]));
export const atlasByHanzi = new Map(atlasCharacters.map((c) => [c.hanzi, c]));
export const atlasComponents = [...components, ...discoveryComponents];
export const componentById = new Map(atlasComponents.map((c) => [c.id, c]));
export const groupById = new Map(groups.map((g) => [g.id, g]));
export const coreIds = new Set(characters.map((c) => c.id));
const componentIndex=new Map(atlasComponents.map(component=>[component.id,atlasCharacters.filter(c=>c.components.includes(component.id))]));
export function containing(component:string){return componentIndex.get(component)??[];}
export function groupsFor(character: AtlasCharacter) {
  return groups.filter((g) => g.characters.includes(character.hanzi));
}
export function linkedWords(character: AtlasCharacter, locale: Locale) {
  return items
    .filter((i) => i.hanzi.includes(character.hanzi))
    .map((i) => localizeItem(i, locale));
}
export function atlasItem(c: AtlasCharacter, locale: Locale): Item {
  return {
    id: "atlas-" + c.id,
    lesson: "atlas",
    hanzi: c.hanzi,
    pinyin: c.pinyin,
    english: c.meaning[locale],
    sentence: c.word,
    sentencePinyin: c.wordPinyin,
    translation: c.wordMeaning[locale],
  };
}
export function atlasAudioItem(c: AtlasCharacter) {
  const item = atlasItem(c, "en");
  return { ...item, hanzi: c.word, pinyin: c.wordPinyin };
}
export type AtlasSkill = "meaning" | "sound" | "component" | "writing";
export type AtlasQuestion = {
  targetId: string;
  skill: Exclude<AtlasSkill, "writing">;
  prompt:
    | "Meaning in this word"
    | "Listen and choose the word"
    | "Find a component in this character";
  options: { id: string; label: string; pinyin?: string }[];
  answer: string;
};
function randomOrder<T>(values: T[], random: () => number) {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
const normalized = (s: string) =>
  s
    .normalize("NFKC")
    .replace(/[\s·'’]/g, "")
    .toLowerCase();
export function questionFor(
  targetId: string,
  skill: Exclude<AtlasSkill, "writing">,
  locale: Locale,
  random = Math.random,
): AtlasQuestion {
  const c = atlasById.get(targetId);
  if (!c) throw Error("Unknown Atlas character");
  if (skill === "component") {
    if (!coreIds.has(targetId))
      throw Error("Discovery component inventory is not certified for grading");
    const correct = componentById.get(
      c.semantic ?? c.phonetic ?? c.components[0],
    );
    if (!correct) throw Error("No component question");
    const distractors = randomOrder(
      components.filter((p) => !c.components.includes(p.id)),
      random,
    ).slice(0, 3);
    return {
      targetId,
      skill,
      prompt: "Find a component in this character",
      options: randomOrder(
        [correct, ...distractors].map((p) => ({
          id: p.id,
          label: p.glyph + " · " + p.label[locale],
        })),
        random,
      ),
      answer: correct.id,
    };
  }
  const seen = new Set([
    normalized(skill === "sound" ? c.wordPinyin : c.wordMeaning[locale]),
    normalized(c.word),
  ]);
  const distractors = randomOrder(
    atlasCharacters.filter((v) => v.id !== c.id),
    random,
  )
    .filter((v) => {
      const label = normalized(
        skill === "sound" ? v.wordPinyin : v.wordMeaning[locale],
      );
      const word = normalized(v.word);
      if (seen.has(label) || seen.has(word)) return false;
      seen.add(label);
      seen.add(word);
      return true;
    })
    .slice(0, 3);
  const options = randomOrder(
    [c, ...distractors].map((v) => ({
      id: v.id,
      label: skill === "sound" ? v.word : v.wordMeaning[locale],
    })),
    random,
  );
  return {
    targetId,
    skill,
    prompt:
      skill === "sound" ? "Listen and choose the word" : "Meaning in this word",
    options,
    answer: c.id,
  };
}
export function atlasQueue(
  ids = characters.map((c) => c.id),
  count = 8,
  random = Math.random,
) {
  return randomOrder(ids, random).slice(0, count);
}
