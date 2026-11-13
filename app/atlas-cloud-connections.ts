import { atlasByHanzi, atlasComponents } from './atlas-model';
import source from '../public/atlas/component-strokes.json';
import extended from '../public/atlas/extended-component-strokes.json';

export type CloudRelation = 'meaning' | 'sound' | 'shape';
export type CloudHighlightAvailability = 'whole' | 'mapped' | 'none';

/** Only declared IDs/glyphs/aliases are equivalent; visual resemblance is not evidence. */
export function cloudComponentIds(component: string | undefined): string[] {
  if (!component) return [];
  return atlasComponents
    .filter(part => part.id === component || part.glyph === component || part.aliases.includes(component))
    .map(part => part.id);
}

export function cloudRelation(hanzi: string, component: string | undefined): CloudRelation {
  const character = atlasByHanzi.get(hanzi);
  const ids = cloudComponentIds(component);
  if (character?.semantic && ids.includes(character.semantic)) return 'meaning';
  if (character?.phonetic && ids.includes(character.phonetic)) return 'sound';
  return 'shape';
}

export function cloudStandaloneComponent(hanzi: string, component: string | undefined): boolean {
  if (!component || Array.from(hanzi).length !== 1) return false;
  // Literal equality also supports the exact named PUA terminals introduced in v25.
  if (hanzi === component) return true;
  const ids = cloudComponentIds(component);
  return atlasComponents.some(part => ids.includes(part.id) && (part.glyph === hanzi || part.aliases.includes(hanzi)));
}

function characterMapping(hanzi: string, mappings: unknown): Record<string, unknown> | null {
  if (Array.from(hanzi).length !== 1 || !mappings || typeof mappings !== 'object') return null;
  const key = 'u' + hanzi.codePointAt(0)!.toString(16);
  const row = (mappings as Record<string, unknown>)[key];
  return row && typeof row === 'object' && !Array.isArray(row) ? row as Record<string, unknown> : null;
}
function extendedKeys(component:string|undefined){
 if(!component)return [];
 const ids=cloudComponentIds(component),parts=atlasComponents.filter(p=>ids.includes(p.id));
 return [...new Set([component,...parts.flatMap(p=>[p.glyph,...p.aliases])])];
}
function selectedMapping(hanzi:string,component:string|undefined,mappings:unknown){
 const row=characterMapping(hanzi,mappings),keys=cloudComponentIds(component);
 if(row&&keys.some(key=>Object.hasOwn(row,key)))return {row,keys};
 // Custom validation inputs never fall through to another dataset.
 if(mappings!==source.mappings)return {row,keys};
 return {row:characterMapping(hanzi,extended.mappings),keys:extendedKeys(component)};
}

/** Availability is structural only; 'mapped' still requires glyph/range validation before drawing. */
export function cloudHighlightAvailability(hanzi: string, component: string | undefined): CloudHighlightAvailability {
  if (cloudStandaloneComponent(hanzi, component)) return 'whole';
  const {row,keys}=selectedMapping(hanzi,component,source.mappings);
  return row && keys.some(id => Array.isArray(row[id]) && row[id].length > 0) ? 'mapped' : 'none';
}

/** No partial acceptance: malformed indices invalidate the entire selected highlight. */
export function cloudHighlightStrokes(
  hanzi: string,
  component: string | undefined,
  strokeCount: number,
  mappings: unknown = source.mappings,
): number[] | null {
  if (!Number.isInteger(strokeCount) || strokeCount <= 0) return null;
  const {row,keys}=selectedMapping(hanzi,component,mappings);
  if (!row) return null;
  const candidates = keys.filter(id => Object.hasOwn(row, id));
  if (!candidates.length) return null;
  const selected = new Set<number>();
  for (const id of candidates) {
    const indices = row[id];
    if (!Array.isArray(indices) || !indices.length || indices.some(index => !Number.isInteger(index) || index < 0 || index >= strokeCount)) return null;
    if (new Set(indices).size !== indices.length) return null;
    for (const index of indices) selected.add(index);
  }
  return [...selected].sort((a, b) => a - b);
}
