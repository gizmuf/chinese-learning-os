/** Pure, read-only adapter for an additive Atlas experiment. No progress identities are created. */
import { items, type Item } from './content';
import {simplifiedDisplayText} from './simplified-chinese';
import {browseWords,browseLevel,browseInScope,scopeRank,type BrowseScope,type BrowseLevel} from './hsk-browse';
import { localizeItem, type Locale } from './translate';
import { atlasCharacters, atlasByHanzi, atlasComponents, componentById } from './atlas-model';
import { type AtlasCharacter } from './atlas-data';
export type CloudLevel = BrowseScope;
export type CloudWord = {
  id: string; hanzi: string; pinyin: string; meaning: string;
  level: BrowseLevel | null; origin: 'curriculum' | 'atlas-example' | 'dictionary';
  item?: Item; atlasCharacterId?: string;
  recordingPinyin?: string; aliases?: string[];
};
export type CloudRole = 'semantic' | 'phonetic' | 'visual';
const normalizedReading = (value: string) => value.normalize('NFC').toLowerCase().replace(/[\s’'·-]/g,'');
const wordKey = (hanzi: string, pinyin: string) => hanzi+'|'+normalizedReading(pinyin);
const inScope = (item: Item, level: CloudLevel) => level==='all'||(item.hskLevel!==undefined&&item.hskLevel<=scopeRank(level));
/** Scopes are cumulative unless a single official band is requested. */
const wordCache=new Map<string,CloudWord[]>();
export function cloudWords(locale: Locale, level: CloudLevel='all', onlyLevel = false): CloudWord[] {
  const exactBand = onlyLevel && level !== 'all';
  const key = `${locale}|${level}|${exactBand}`;
  let result = wordCache.get(key);
  if (!result) {
    result = buildCloudWords(locale, level, exactBand);
    wordCache.set(key, result);
  }
  return [...result];
}
function buildCloudWords(locale: Locale, level: CloudLevel, exactBand: boolean): CloudWord[] {
  const canonical: CloudWord[] = items.filter(item => exactBand ? item.hskLevel === level : inScope(item, level)).map(item => {
    const localized=localizeItem(item,locale);
    return {id:item.id,hanzi:item.hanzi,pinyin:item.pinyin,meaning:localized.english,
      level:item.hskLevel??null,origin:'curriculum' as const,item:localized};
  });
  const listedHanzi = new Set(canonical.filter(word => word.level !== null).map(word => word.hanzi));
  const extras = new Map(canonical.filter(word => word.level === null).map(word => [wordKey(word.hanzi, word.pinyin), word]));
  const dictionary: CloudWord[] = [];
  for (const word of browseWords) {
    const band = browseLevel(word.level);
    if (!(exactBand ? band === level : browseInScope(band, level)) || listedHanzi.has(word.hanzi)) continue;
    listedHanzi.add(word.hanzi);
    const extra = extras.get(wordKey(word.hanzi, word.pinyin));
    if (extra) {
      // The catalogue can show the confirmed level while the course item keeps its original identity.
      extra.level = band;
      extra.aliases = [word.id];
    } else {
      dictionary.push({...word, meaning: simplifiedDisplayText(word.meaning), level: band, origin: 'dictionary'});
    }
  }
  if(level!=='all')return [...canonical,...dictionary];
  const known=new Set(canonical.map(word=>wordKey(word.hanzi,word.pinyin)));
  const listedReadings = new Map<string, CloudWord>();
  for (const word of [...dictionary, ...canonical]) {
    if (word.level === null) continue;
    for (const reading of word.pinyin.split('/')) listedReadings.set(wordKey(word.hanzi, reading), word);
  }
  const examples:CloudWord[]=[];
  for(const character of atlasCharacters){
    const key=wordKey(character.word,character.wordPinyin);
    const exampleId = 'atlas-example:' + character.id;
    // The Atlas example 学生 uses a neutral second syllable for the same word.
    const catalogueKey = key === '学生|xuésheng' ? '学生|xuéshēng' : key;
    const listed = listedReadings.get(catalogueKey);
    if (listed) {
      (listed.aliases ??= []).push(exampleId);
      if (listed.origin === 'dictionary' && !listed.atlasCharacterId) {
        listed.atlasCharacterId = character.id;
        listed.recordingPinyin = character.wordPinyin;
        if (locale !== 'en') listed.meaning = character.wordMeaning[locale];
      }
      continue;
    }
    if(known.has(key))continue;
    known.add(key);
    examples.push({id:exampleId,hanzi:character.word,pinyin:character.wordPinyin,
      meaning:character.wordMeaning[locale],level:null,origin:'atlas-example',atlasCharacterId:character.id});
  }
  return [...canonical,...examples,...dictionary];
}
export function matchesCloudWordId(word: CloudWord, id: string) {
  return word.id === id || !!word.aliases?.includes(id);
}
export function wordsForCharacter(hanzi:string,locale:Locale,level:CloudLevel='all'){
  if(Array.from(hanzi).length!==1)return [];
  return cloudWords(locale,level).filter(word=>word.hanzi.includes(hanzi));
}
const scopedHanzi=(level:CloudLevel)=>new Set(cloudWords('en',level).flatMap(item=>Array.from(item.hanzi)));
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
