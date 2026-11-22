import {findAssemblySeed} from './atlas-assembly-families';
import {assemblyIndex} from './atlas-assembly-model';
import {cloudWords, type CloudWord} from './atlas-cloud-model';
import {pinyinKey} from './chinese-search';
import {scopeRank, type BrowseLevel, type BrowseScope} from './hsk-scope';
import {canonicalDictionaryText} from './simplified-chinese';
import type {Locale} from './translate';

export type VocabularyGrouping = 'hanzi' | 'component';
type VocabularyWord = CloudWord & {level: BrowseLevel};
type GroupedEntry = {word: VocabularyWord; highlights: string[]};
export type VocabularyGroup = {id: string; label: string; kind: VocabularyGrouping | 'pinyin'; entries: GroupedEntry[]};

export function vocabularySearchKey(text: string) {
  return text.normalize('NFD').replace(/\p{Mark}/gu, '').toLocaleLowerCase('en').trim();
}

function comparePinyin(a: VocabularyWord, b: VocabularyWord) {
  return vocabularySearchKey(a.pinyin).localeCompare(vocabularySearchKey(b.pinyin), 'en')
    || a.id.localeCompare(b.id, 'en');
}

function groupByCarrier(entries: GroupedEntry[]) {
  const counts = new Map<string, number>();
  for (const {highlights} of entries) {
    for (const glyph of highlights) counts.set(glyph, (counts.get(glyph) ?? 0) + 1);
  }
  const buckets = new Map<string, GroupedEntry[]>();
  for (const entry of entries) {
    const carrier = entry.highlights.reduce((best, glyph) =>
      counts.get(glyph)! > counts.get(best)! ? glyph : best);
    const bucket = buckets.get(carrier) ?? [];
    bucket.push(entry);
    buckets.set(carrier, bucket);
  }
  return [...buckets.values()].sort((a, b) => b.length - a.length).flat();
}

export function libraryVocabularyGroups(locale: Locale, scope: BrowseScope, onlyLevel: boolean, kind: VocabularyGrouping) {
  const words = cloudWords(locale, scope, onlyLevel).filter((word): word is VocabularyWord => word.level !== null);
  words.sort((a, b) => scopeRank(a.level) - scopeRank(b.level) || comparePinyin(a, b));
  const index = kind === 'component' ? assemblyIndex(locale) : undefined;
  const partsByGlyph = new Map<string, string[]>();
  const candidates = new Map<string, GroupedEntry[]>();

  for (const word of words) {
    const matches = new Map<string, Set<string>>();
    for (const glyph of new Set([...word.hanzi].filter(text => /\p{Script=Han}/u.test(text)))) {
      let anchors = partsByGlyph.get(glyph);
      if (!anchors) {
        anchors = kind === 'hanzi' ? [glyph]
          : [...new Set([glyph, ...(index?.characters.get(glyph)?.parts.map(part => part.glyph) ?? [])]
            .map(form => findAssemblySeed(form)?.part).filter((part): part is string => !!part))];
        partsByGlyph.set(glyph, anchors);
      }
      for (const anchor of anchors) {
        const highlights = matches.get(anchor) ?? new Set<string>();
        highlights.add(glyph);
        matches.set(anchor, highlights);
      }
    }
    for (const [anchor, glyphs] of matches) {
      const entries = candidates.get(anchor) ?? [];
      entries.push({word, highlights: [...glyphs]});
      candidates.set(anchor, entries);
    }
  }

  const groups: VocabularyGroup[] = [];
  function familyGroup(anchor: string, entries: GroupedEntry[]): VocabularyGroup {
    const label = kind === 'component' ? findAssemblySeed(anchor)?.forms.join(' / ') ?? anchor : anchor;
    return {id: `${kind}:${anchor}`, label, kind, entries: kind === 'component' ? groupByCarrier(entries) : entries};
  }
  const assigned = new Set<string>();
  const ordered = [...candidates].sort(([a, first], [b, second]) =>
    second.length - first.length || a.localeCompare(b, 'zh-Hans'));
  for (const [anchor, members] of ordered) {
    const entries = members.filter(({word}) => !assigned.has(word.id));
    if (entries.length < 2) continue;
    groups.push(familyGroup(anchor, entries));
    for (const {word} of entries) assigned.add(word.id);
  }

  const alphabetical = new Map<string, GroupedEntry[]>();
  for (const word of words) {
    if (assigned.has(word.id)) continue;
    const letter = vocabularySearchKey(word.pinyin).match(/[a-z]/u)?.[0].toUpperCase() ?? '…';
    const entries = alphabetical.get(letter) ?? [];
    entries.push({word, highlights: []});
    alphabetical.set(letter, entries);
  }
  for (const [letter, entries] of [...alphabetical].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    entries.sort((a, b) => comparePinyin(a.word, b.word));
    groups.push({id: 'pinyin:' + letter, label: letter, kind: 'pinyin', entries});
  }
  function findFamily(query: string) {
    if (!/^\p{Script=Han}$/u.test(query)) return;
    for (const glyph of new Set([query, canonicalDictionaryText(query) ?? query])) {
      const anchor = kind === 'hanzi' ? glyph : findAssemblySeed(glyph)?.part;
      const members = anchor && candidates.get(anchor);
      if (anchor && members) return familyGroup(anchor, members);
    }
  }
  return {groups, total: words.length, findFamily};
}

export function searchVocabularyGroups(model: ReturnType<typeof libraryVocabularyGroups>, query: string) {
  const term = query.trim().normalize('NFC');
  if (!term) return model.groups;
  const exact = model.findFamily(term);
  if (exact) return [exact];
  const key = vocabularySearchKey(term);
  const reading = pinyinKey(term);
  const pinyinQuery = /^[a-zv]+$/.test(reading);
  const hanzi = canonicalDictionaryText(term) ?? term;
  return model.groups.flatMap(group => {
    if (vocabularySearchKey(group.label).includes(key)) return [group];
    const entries = group.entries.filter(({word}) => word.hanzi.includes(hanzi)
      || vocabularySearchKey(word.meaning).includes(key)
      || (pinyinQuery && word.pinyin.split('/').some(option => pinyinKey(option).includes(reading))));
    return entries.length ? [{...group, entries}] : [];
  });
}
