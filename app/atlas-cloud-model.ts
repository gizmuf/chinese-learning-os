/** Pure, read-only adapter for an additive Atlas experiment. No progress identities are created. */
import { items, type Item } from './content';
import { localizeItem, type Locale } from './translate';
import { atlasCharacters, atlasByHanzi, atlasComponents, componentById } from './atlas-model';
import { type AtlasCharacter } from './atlas-data';
export type CloudLevel = 'all' | 1 | 2 | 3;
export type CloudWord = {
  id: string; hanzi: string; pinyin: string; meaning: string;
  level: 1 | 2 | 3 | null; origin: 'curriculum' | 'atlas-example';
  item?: Item; atlasCharacterId?: string;
};
export type CloudRole = 'semantic' | 'phonetic' | 'visual';
const normalizedReading = (value: string) => value.normalize('NFC').toLowerCase().replace(/[\s’'·-]/g,'');
const wordKey = (hanzi: string, pinyin: string) => hanzi+'|'+normalizedReading(pinyin);
const inScope = (item: Item, level: CloudLevel) => level==='all'||(item.hskLevel!==undefined&&item.hskLevel<=level);
/** Numeric scopes include earlier levels. Extras and unlevelled examples belong only to all. */
export function cloudWords(locale: Locale, level: CloudLevel='all'): CloudWord[] {
  const canonical=items.filter(item=>inScope(item,level)).map(item=>{
    const localized=localizeItem(item,locale);
    return {id:item.id,hanzi:item.hanzi,pinyin:item.pinyin,meaning:localized.english,
      level:item.hskLevel??null,origin:'curriculum' as const,item:localized};
  });
  if(level!=='all')return canonical;
  const known=new Set(canonical.map(word=>wordKey(word.hanzi,word.pinyin)));
  const examples:CloudWord[]=[];
  for(const character of atlasCharacters){
    const key=wordKey(character.word,character.wordPinyin);
    if(known.has(key))continue;
    known.add(key);
    examples.push({id:'atlas-example:'+character.id,hanzi:character.word,pinyin:character.wordPinyin,
      meaning:character.wordMeaning[locale],level:null,origin:'atlas-example',atlasCharacterId:character.id});
  }
  return [...canonical,...examples];
}
export function wordsForCharacter(hanzi:string,locale:Locale,level:CloudLevel='all'){
  if(Array.from(hanzi).length!==1)return [];
  return cloudWords(locale,level).filter(word=>word.hanzi.includes(hanzi));
}
const scopedHanzi=(level:CloudLevel)=>new Set(items.filter(item=>inScope(item,level)).flatMap(item=>Array.from(item.hanzi)));
/** Structural AND query over the existing reviewed inventory; themes do not establish membership. */
export function familyForComponents(componentIds:string[],level:CloudLevel='all'):AtlasCharacter[]{
  const selected=[...new Set(componentIds)];
  if(selected.some(id=>!componentById.has(id)))return [];
  const allowed=level==='all'?null:scopedHanzi(level);
  return atlasCharacters.filter(character=>(!allowed||allowed.has(character.hanzi))&&selected.every(id=>character.components.includes(id)));
}
export function cloudComponents(level:CloudLevel='all'){
  const scoped=familyForComponents([],level);
  return atlasComponents.map(component=>{
    const characterIds=scoped.filter(character=>character.components.includes(component.id)).map(character=>character.id);
    return {component,characterIds,count:characterIds.length};
  });
}
export function cloudCharacter(hanzi:string,locale:Locale,level:CloudLevel='all'){
  const character=atlasByHanzi.get(hanzi);
  const parts=character?character.components.map(id=>{
    const roles:CloudRole[]=[];
    if(character.semantic===id)roles.push('semantic');
    if(character.phonetic===id)roles.push('phonetic');
    if(!roles.length)roles.push('visual');
    return {component:componentById.get(id)!,roles};
  }):[];
  return {hanzi,character:character??null,decompositionAvailable:!!character,parts,
    words:wordsForCharacter(hanzi,locale,level)};
}
export function cloudCoverage(level:CloudLevel='all'){
  const scoped=items.filter(item=>inScope(item,level));
  const hanzi=[...scopedHanzi(level)].sort();
  const mappedHanzi=hanzi.filter(char=>atlasByHanzi.has(char));
  const unmappedHanzi=hanzi.filter(char=>!atlasByHanzi.has(char));
  return {level,scheme:'HSK examination syllabus November 2025; effective July 2026',
    vocabularyEntries:scoped.length,syllabusEntries:scoped.filter(item=>item.hskLevel!==undefined).length,
    extraEntries:scoped.filter(item=>item.hskLevel===undefined).length,
    wordCharacters:hanzi.length,reviewedInventory:atlasCharacters.length,mappedCharacters:mappedHanzi.length,
    mappedHanzi,unmappedHanzi,exampleWords:cloudWords('en',level).filter(word=>word.origin==='atlas-example').length};
}
