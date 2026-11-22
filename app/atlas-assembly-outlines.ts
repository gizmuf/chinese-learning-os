import source from '../data/atlas-assembly-strokes.json';
import {assemblyStrokeGroups, type AssemblyCharacter} from './atlas-assembly-model';

const mappings: Record<string, {ids: string; paths: string[]}> = source.mappings;

export function mappedAssemblyGroups(character: AssemblyCharacter, strokeCount?: number) {
  const mapping = mappings[character.data.hanzi];
  return mapping && assemblyStrokeGroups(
    character.parts, character.data.decomposition, mapping, strokeCount ?? mapping.paths.length,
  );
}
