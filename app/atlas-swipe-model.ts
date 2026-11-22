import {
  assemblyFamily, assemblyMeaning, assemblySwaps, isAssemblyGlyph,
  type assemblyIndex, type AssemblyCharacter, type AssemblyPart, type Position,
} from './atlas-assembly-model';
import {findAssemblySeed} from './atlas-assembly-families';
import {cloudWords, type CloudWord} from './atlas-cloud-model';
import {browseInScope, type BrowseScope} from './hsk-scope';
import {familyWords} from './word-family-model';
import type {Locale} from './translate';

type Index = ReturnType<typeof assemblyIndex>;

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';
export const swipeVectors: Record<SwipeDirection, [number, number]> = {
  left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1],
};

export type CharacterFrame = {character: AssemblyCharacter; part?: AssemblyPart};
export type SwipeFrame = {
  id: string;
  text: string;
  pinyin: string;
  meaning: string;
  anchor: string;
  character?: CharacterFrame;
};

const positions: Position[] = [
  'upper left', 'top', 'upper right', 'right', 'lower right', 'bottom', 'lower left', 'left',
  'middle', 'around', 'inside', 'overlapping',
];

export function swipeParts(index: Index, character: AssemblyCharacter): AssemblyPart[] {
  const parts = character.parts.filter(part => isAssemblyGlyph(part.glyph));
  if (parts.length || !index.families.has(character.data.hanzi)) return parts;
  return [{
    id: 'whole', glyph: character.data.hanzi, positions: ['middle'],
    box: {x: 0, y: 0, w: 1, h: 1},
  }];
}

export function focusCharacter(index: Index, character: AssemblyCharacter, anchor?: string, slot?: string): CharacterFrame {
  const parts = swipeParts(index, character);
  const part = parts.find(item => item.id === slot && item.glyph === anchor)
    ?? parts.find(item => item.glyph === anchor)
    ?? parts.find(item => findAssemblySeed(item.glyph))
    ?? parts[0];
  return {character, part};
}

export function swipeCharacterFrame(focus: CharacterFrame): SwipeFrame {
  const {character, part} = focus;
  return {
    id: character.data.hanzi, text: character.data.hanzi,
    pinyin: character.data.readings.join(' / '), meaning: assemblyMeaning(character),
    anchor: part?.glyph ?? '', character: focus,
  };
}

export function partFamily(index: Index, glyph: string, scope: BrowseScope) {
  return assemblyFamily(index, glyph, scope, {exact: true, nested: false});
}

export function characterFrames(index: Index, focus: CharacterFrame, scope: BrowseScope): SwipeFrame[] {
  const {part} = focus;
  if (!part) return [];
  return partFamily(index, part.glyph, scope).map(({character}) => {
    const exact = character.parts.filter(slot => slot.glyph === part.glyph);
    const placed = exact.find(slot => slot.positions[0] === part.positions[0]) ?? exact[0];
    return swipeCharacterFrame({character, part: placed});
  });
}

export function scopedCharacterFrames(index: Index, scope: BrowseScope): SwipeFrame[] {
  const groups = new Map<string, SwipeFrame[]>();
  for (const character of index.characters.values()) {
    if (character.level === undefined || !browseInScope(character.level, scope)) continue;
    const frame = swipeCharacterFrame(focusCharacter(index, character));
    const bucket = groups.get(frame.anchor) ?? [];
    bucket.push(frame);
    groups.set(frame.anchor, bucket);
  }
  return Array.from(groups.values()).flat();
}

function wordFrame(word: CloudWord, anchor: string): SwipeFrame {
  return {id: word.id, text: word.hanzi, pinyin: word.pinyin, meaning: word.meaning, anchor};
}

export function wordFrames(locale: Locale, scope: BrowseScope, anchor: string, all: boolean): SwipeFrame[] {
  const words = all ? cloudWords(locale, scope) : familyWords(anchor, locale, scope);
  const frames: SwipeFrame[] = [];
  const seen = new Set<string>();
  const groups = new Map<string, SwipeFrame[]>();
  for (const word of words) {
    if (seen.has(word.hanzi)) continue;
    seen.add(word.hanzi);
    const part = all ? [...word.hanzi][0] : anchor;
    if (!isAssemblyGlyph(part ?? '')) continue;
    const frame = wordFrame(word, part);
    if (!all) frames.push(frame);
    else {
      const group = groups.get(part) ?? [];
      group.push(frame);
      groups.set(part, group);
    }
  }
  return all ? Array.from(groups.values()).flat() : frames;
}

export type SwipeMap = ReturnType<typeof swipeMap>;
export function swipeMap(frames: SwipeFrame[], current: SwipeFrame, family: boolean) {
  const index = frames.findIndex(frame => frame.id === current.id);
  const tree = current.character?.character.tree;
  const vertical = !!tree && 'operator' in tree && (tree.operator === '⿱' || tree.operator === '⿳');
  const previous: SwipeDirection = vertical ? 'up' : 'left';
  const next: SwipeDirection = vertical ? 'down' : 'right';
  const neighbours: Partial<Record<SwipeDirection, SwipeFrame>> = {
    [previous]: frames[index - 1], [next]: frames[index + 1],
  };
  const part = current.character?.part;
  if (family && part) {
    const position = positions.indexOf(part.positions[0]);
    const alternatives = new Map<number, SwipeFrame>();
    for (const choice of frames) {
      const candidate = choice.character;
      if (!candidate || choice.id === current.id) continue;
      for (const alternative of candidate.character.parts) {
        const rank = positions.indexOf(alternative.positions[0]);
        if (alternative.glyph !== part.glyph || rank === position || alternatives.has(rank)) continue;
        alternatives.set(rank, swipeCharacterFrame({character: candidate.character, part: alternative}));
      }
    }
    const ranks = [...alternatives.keys()].sort((a, b) => a - b);
    const before = ranks.filter(rank => rank < position).at(-1);
    const after = ranks.find(rank => rank > position);
    if (before !== undefined) neighbours[vertical ? 'left' : 'up'] = alternatives.get(before);
    if (after !== undefined) neighbours[vertical ? 'right' : 'down'] = alternatives.get(after);
  }
  return {neighbours, previous, next, vertical, index, total: frames.length};
}

export function swipeDirection(dx: number, dy: number, axis: 'x' | 'y'): SwipeDirection {
  return axis === 'x' ? (dx < 0 ? 'right' : 'left') : (dy < 0 ? 'down' : 'up');
}

export function slotSwipeMap(index: Index, character: AssemblyCharacter, dragged: AssemblyPart, scope: BrowseScope) {
  if (!/^\d$/.test(dragged.id)) return;
  const fixed = character.parts.find(part => part.id.split('.')[0] !== dragged.id && isAssemblyGlyph(part.glyph));
  if (!fixed) return;
  const alternatives = assemblySwaps(index, character, fixed.glyph, scope)
    .filter(({position, character: next}) => position === dragged.positions[0] &&
      next.parts.some(part => part.id === dragged.id && part.glyph !== dragged.glyph));
  if (!alternatives.length) return;
  const source = swipeCharacterFrame({character, part: fixed});
  const allowed = new Set([source.id, ...alternatives.map(({character}) => character.data.hanzi)]);
  const frames = characterFrames(index, {character, part: fixed}, scope).filter(frame => allowed.has(frame.id));
  if (!frames.some(frame => frame.id === source.id)) frames.unshift(source);
  return {from: source, map: swipeMap(frames, source, false)};
}
