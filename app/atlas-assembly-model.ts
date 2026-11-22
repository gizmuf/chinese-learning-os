import {findAssemblySeed} from './atlas-assembly-families';
import {extendedCharacters, type ExtendedCharacter} from './atlas-cloud-extended';
import {recognitionCharsByLevel} from './hsk-exam-model';
import {browseInScope, browseLevel, type BrowseLevel, type BrowseScope} from './hsk-scope';
import type {Locale} from './translate';

const splits = {
  '⿰': ['left', 'right'],
  '⿱': ['top', 'bottom'],
  '⿲': ['left', 'middle', 'right'],
  '⿳': ['top', 'middle', 'bottom'],
  '⿴': ['around', 'inside'],
  '⿵': ['around', 'inside'],
  '⿶': ['around', 'inside'],
  '⿷': ['around', 'inside'],
  '⿸': ['around', 'inside'],
  '⿹': ['around', 'inside'],
  '⿺': ['around', 'inside'],
  '⿻': ['overlapping', 'overlapping'],
  '⿼': ['around', 'inside'],
  '⿽': ['around', 'inside'],
} as const;

type Operator = keyof typeof splits;
type Region = typeof splits[Operator][number];
export const assemblyPositions = [
  'left', 'right', 'top', 'bottom', 'upper left', 'upper right', 'lower left', 'lower right',
  'middle', 'around', 'inside', 'overlapping',
] as const;
export type Position = typeof assemblyPositions[number];
export type Tree = {glyph: string} | {operator: Operator; operands: Tree[]};

export function parseAssembly(ids: string): Tree | undefined {
  const tokens = Array.from(ids);
  let cursor = 0;
  function next(): Tree | undefined {
    const token = tokens[cursor++];
    if (!token) return;
    if (!Object.hasOwn(splits, token)) {
      if (!/[\u2ff0-\u2fff\u31ef]/u.test(token)) return {glyph: token === '?' ? '？' : token};
      return;
    }
    const operator = token as Operator;
    const operands: Tree[] = [];
    for (const _ of splits[operator]) {
      const operand = next();
      if (!operand) return;
      operands.push(operand);
    }
    return {operator, operands};
  }
  const tree = next();
  if (cursor === tokens.length) return tree;
}

function treeCode(tree: Tree): string {
  return 'glyph' in tree ? tree.glyph : tree.operator + tree.operands.map(treeCode).join('');
}

type Step = {operator: Operator; index: number};

function describePositions(path: Step[]): Position[] {
  const first = new Map<'x' | 'y' | 'frame', Region>();
  for (const {operator, index} of path) {
    const axis = operator === '⿰' || operator === '⿲' ? 'x' : operator === '⿱' || operator === '⿳' ? 'y' : 'frame';
    if (!first.has(axis)) first.set(axis, splits[operator][index]);
  }
  const x = first.get('x');
  const y = first.get('y');
  const corner = (x === 'left' || x === 'right') && (y === 'top' || y === 'bottom')
    ? (y === 'top' ? 'upper ' : 'lower ') + x as Position : undefined;
  const regions = [...first.values()];
  return [...new Set(corner && first.keys().next().value !== 'frame' ? [corner, ...regions] : regions)];
}

type Box = {x: number; y: number; w: number; h: number};
const fullBox: Box = {x: 0, y: 0, w: 1, h: 1};
function place(box: Box, operator: Operator, index: number): Box {
  const {x, y, w, h} = box;
  const length = splits[operator].length;
  if (operator === '⿰' || operator === '⿲') return {x: x + index * w / length, y, w: w / length, h};
  if (operator === '⿱' || operator === '⿳') return {x, y: y + index * h / length, w, h: h / length};
  if (operator === '⿻') return {x: x + index * w * .22, y: y + index * h * .22, w: w * .78, h: h * .78};
  if (index === 0) return box;
  const insets: Partial<Record<Operator, [number, number, number, number]>> = {
    '⿵': [.2, .22, .2, .06], '⿶': [.2, .06, .2, .24], '⿷': [.23, .2, .04, .2],
    '⿸': [.31, .32, .04, .04], '⿹': [.04, .32, .31, .04],
    '⿺': [.28, .04, .04, .24], '⿼': [.04, .2, .23, .2], '⿽': [.04, .04, .31, .30],
  };
  const [left, top, right, bottom] = insets[operator] ?? [.24, .24, .24, .24];
  return {x: x + w * left, y: y + h * top, w: w * (1 - left - right), h: h * (1 - top - bottom)};
}

export type AssemblyPart = {id: string; glyph: string; positions: Position[]; box: Box};

export function assemblyParts(tree: Tree | undefined): AssemblyPart[] {
  if (!tree || !('operator' in tree)) return [];
  const parts: AssemblyPart[] = [];
  function visit(node: Tree, path: number[], steps: Step[], box: Box) {
    if ('glyph' in node) {
      parts.push({id: path.join('.'), glyph: node.glyph, positions: describePositions(steps), box});
      return;
    }
    node.operands.forEach((operand, index) =>
      visit(operand, [...path, index], [...steps, {operator: node.operator, index}], place(box, node.operator, index)));
  }
  visit(tree, [], [], fullBox);
  return parts;
}

export function isAssemblyGlyph(value: string) {
  return /^[\p{Script=Han}\u2e80-\u2fff\u31c0-\u31ee\ue000-\uf8ff]$/u.test(value) &&
    !/[\u2ff0-\u2fff]/u.test(value);
}

const levels = new Map<string, BrowseLevel>(Object.entries(recognitionCharsByLevel).flatMap(([level, glyphs]) =>
  Array.from(glyphs, glyph => [glyph, browseLevel(level)] as const)));

export type AssemblyCharacter = {
  data: ExtendedCharacter;
  tree: Tree | undefined;
  parts: AssemblyPart[];
  level: BrowseLevel | undefined;
};

const demoMeanings: Record<string, string> = {
  推: 'push', 拉: 'pull', 抱: 'hug', 打: 'hit', 撞: 'bump into', 挤: 'squeeze; be crowded',
  拖: 'drag', 挖: 'dig', 抓: 'grab', 拍: 'pat; take a photo', 拿: 'take; hold', 掌: 'palm',
  掰: 'tear apart', 拜: 'bow', 齐: 'even; together', 济: 'help; ferry across', 剂: 'dose',
  让: 'let; make; give way', 说: 'speak', 讲: 'explain; talk', 请: 'please; invite', 谢: 'thank',
  认: 'recognize', 记: 'remember', 试: 'try', 话: 'speech; words', 语: 'language',
  森: 'forest', 想: 'think; want', 问: 'ask', 然: 'so; in this way', 燃: 'burn',
};

export function assemblyMeaning(character: AssemblyCharacter, compact = false) {
  const meaning = demoMeanings[character.data.hanzi] ?? character.data.meaning;
  return compact && meaning ? meaning.split(/[,;]/u)[0] : meaning;
}

type Occurrence = {glyph: string; positions: Position[]; via?: string};
export type FamilyMember = {character: AssemblyCharacter; occurrences: Occurrence[]};
type Replacement = {character: AssemblyCharacter; operand: Tree; position: Region};
type BuildIndex = {
  characters: Map<string, AssemblyCharacter>;
  families: Map<string, FamilyMember[]>;
  swaps: Map<string, Replacement[]>;
};

const indices = new Map<Locale, BuildIndex>();
function swapKey(tree: Extract<Tree, {operator: Operator}>, slot: number) {
  return tree.operator + tree.operands.map((operand, index) => index === slot ? '*' : treeCode(operand)).join('|');
}

function knownGlyphs(tree: Tree): string[] {
  if ('glyph' in tree) return [tree.glyph];
  return tree.operands.flatMap(knownGlyphs);
}

export function assemblyIndex(locale: Locale): BuildIndex {
  const cached = indices.get(locale);
  if (cached) return cached;
  const characters = new Map(extendedCharacters(locale).map(data => {
    const tree = parseAssembly(data.decomposition);
    return [data.hanzi, {data, tree, parts: assemblyParts(tree), level: levels.get(data.hanzi)}];
  }));
  const families = new Map<string, FamilyMember[]>();
  const swaps = new Map<string, Replacement[]>();
  for (const character of characters.values()) {
    const {tree, data} = character;
    if (!tree || !('operator' in tree)) continue;
    const seenOccurrences = new Map<string, Occurrence[]>();
    const stack = new Set([data.hanzi]);
    function collect(node: Tree, steps: Step[], via?: string) {
      if ('operator' in node) {
        node.operands.forEach((operand, index) => collect(operand, [...steps, {operator: node.operator, index}], via));
        return;
      }
      const {glyph} = node;
      if (!isAssemblyGlyph(glyph) || stack.has(glyph)) return;
      const occurrences = seenOccurrences.get(glyph) ?? [];
      occurrences.push({glyph, positions: describePositions(steps), via});
      seenOccurrences.set(glyph, occurrences);
      const nested = characters.get(glyph)?.tree;
      if (!nested || !('operator' in nested)) return;
      stack.add(glyph);
      collect(nested, steps, via ?? glyph);
      stack.delete(glyph);
    }
    collect(tree, []);
    for (const [glyph, occurrences] of seenOccurrences) {
      const members = families.get(glyph) ?? [];
      members.push({character, occurrences});
      families.set(glyph, members);
    }
    if (knownGlyphs(tree).includes('？')) continue;
    tree.operands.forEach((operand, slot) => {
      const key = swapKey(tree, slot);
      const options = swaps.get(key) ?? [];
      options.push({character, operand, position: splits[tree.operator][slot]});
      swaps.set(key, options);
    });
  }
  const index = {characters, families, swaps};
  indices.set(locale, index);
  return index;
}

function compareLevel(a: AssemblyCharacter, b: AssemblyCharacter) {
  const rank = (level: BrowseLevel | undefined) => level === '7-9' ? 9 : level ?? 10;
  return rank(a.level) - rank(b.level) || a.data.hanzi.localeCompare(b.data.hanzi, 'zh');
}

export function assemblyFamily(index: BuildIndex, part: string, scope: BrowseScope, {
  exact = false, nested = true,
}: {exact?: boolean; nested?: boolean} = {}): FamilyMember[] {
  const seed = findAssemblySeed(part);
  const variants = part ? exact ? [part] : seed?.forms ?? [part] : [];
  const inScope = (character: AssemblyCharacter) => scope === 'all' || !!character.level && browseInScope(character.level, scope);
  const members = new Map<string, FamilyMember>();
  if (!variants.length) {
    for (const character of index.characters.values()) {
      if (inScope(character)) members.set(character.data.hanzi, {character, occurrences: []});
    }
  }
  for (const glyph of variants) {
    for (const {character, occurrences} of index.families.get(glyph) ?? []) {
      if (!inScope(character)) continue;
      const matches = nested ? occurrences : occurrences.filter(match => !match.via);
      if (!matches.length) continue;
      const previous = members.get(character.data.hanzi);
      members.set(character.data.hanzi, {character, occurrences: [...(previous?.occurrences ?? []), ...matches]});
    }
  }
  const examples = Array.from(seed?.examples ?? '');
  const priority = (hanzi: string) => {
    const rank = examples.indexOf(hanzi);
    return rank < 0 ? examples.length : rank;
  };
  return [...members.values()].sort((a, b) =>
    priority(a.character.data.hanzi) - priority(b.character.data.hanzi) || compareLevel(a.character, b.character));
}

export function assemblySwaps(index: BuildIndex, character: AssemblyCharacter, pin: string, scope: BrowseScope): Replacement[] {
  const {tree} = character;
  if (!pin || !tree || !('operator' in tree) || knownGlyphs(tree).includes('？')) return [];
  if (!tree.operands.some(operand => knownGlyphs(operand).includes(pin))) return [];
  return tree.operands.flatMap((operand, slot) => {
    if (knownGlyphs(operand).includes(pin)) return [];
    const options = index.swaps.get(swapKey(tree, slot)) ?? [];
    const counts = new Map<string, number>();
    for (const option of options) {
      const code = treeCode(option.operand);
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    // Some distinct glyphs share an IDS (e.g. 我 and 找). Keep them in the family,
    // but don't present an ambiguous replacement as a one-to-one recipe.
    return options.filter(option => {
      const code = treeCode(option.operand);
      return code !== treeCode(operand) && counts.get(code) === 1 &&
        (scope === 'all' || !!option.character.level && browseInScope(option.character.level, scope));
    });
  }).sort((a, b) => compareLevel(a.character, b.character));
}

export function assemblyOperandText(tree: Tree) {
  return knownGlyphs(tree).join(' + ');
}

export function assemblyStrokeGroups(
  parts: AssemblyPart[], ids: string, mapping: {ids: string; paths: string[]} | undefined, strokeCount: number,
): number[][] | undefined {
  if (mapping?.ids !== ids || mapping.paths.length !== strokeCount) return;
  const paths = new Map(parts.map((part, index) => [part.id, index]));
  const groups = parts.map(() => [] as number[]);
  for (const [index, path] of mapping.paths.entries()) {
    const slot = paths.get(path);
    if (slot === undefined) return;
    groups[slot].push(index);
  }
  if (groups.every(group => group.length)) return groups;
}
