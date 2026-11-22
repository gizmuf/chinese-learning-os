import {mappedAssemblyGroups} from './atlas-assembly-outlines';
import {isAssemblyGlyph, type AssemblyCharacter, type AssemblyPart, type assemblyIndex} from './atlas-assembly-model';

type Index = ReturnType<typeof assemblyIndex>;
export type SwipeRegion = {part: AssemblyPart; strokes: number[]};
export type SwipeLens = {hanzi: string; trail: SwipeRegion[]; active?: string};

export function rootSwipeRegions(character: AssemblyCharacter): SwipeRegion[] {
  const groups = mappedAssemblyGroups(character);
  return groups ? character.parts.map((part, index) => ({part, strokes: groups[index]})) : [];
}

export function childSwipeRegions(index: Index, region: SwipeRegion, ancestors: string[]): SwipeRegion[] {
  const parent = region.part;
  if (ancestors.includes(parent.glyph) || ancestors.length > 6) return [];
  const character = index.characters.get(parent.glyph);
  if (!character) return [];
  // The parent contributes its original stroke order to the containing character.
  // Project the complete inner mapping only when every stroke has a matching index.
  const groups = mappedAssemblyGroups(character, region.strokes.length);
  if (!groups || character.parts.some(part => !isAssemblyGlyph(part.glyph) || part.glyph === parent.glyph)) return [];
  return character.parts.map((part, offset) => ({
    part: {
      ...part, id: parent.id + '.' + part.id,
      box: {
        x: parent.box.x + part.box.x * parent.box.w, y: parent.box.y + part.box.y * parent.box.h,
        w: part.box.w * parent.box.w, h: part.box.h * parent.box.h,
      },
    },
    strokes: groups[offset].map(stroke => region.strokes[stroke]),
  }));
}
