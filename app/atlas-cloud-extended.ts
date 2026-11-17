import {turkishText,withTurkish} from "./turkish";
/** Dataset-derived structural browsing, distinct from the 121 curated/gradable Atlas targets. */
import {hanziStructureData as rawData} from './browse-data';
import {browseCharacters,browseWords,browseLevel,browseInScope,scopeRank,type BrowseScope} from './hsk-browse';
const data=withTurkish(rawData);
import {recognitionCharsByLevel} from './hsk-exam-model';
import {atlasByHanzi,componentById} from './atlas-model';
import {items,type Item} from './content';
import {localizeItem,type Locale} from './translate';
export type ExtendedScope=BrowseScope;
const rows=[...data.characters,...browseCharacters];
const recognitionLevels=Object.entries(recognitionCharsByLevel).flatMap(([level, chars]) =>
 [...chars].map(glyph => [glyph, level === '7-9' ? 9 : Number(level)] as const));
const recognitionLevelByGlyph=new Map(recognitionLevels);
const scopedItems=(scope:ExtendedScope)=>items.filter(item=>scope==='all'?item.hskLevel!==undefined:item.hskLevel!==undefined&&item.hskLevel<=scopeRank(scope));
export function extendedWords(hanzi:string,locale:Locale,scope:ExtendedScope='all'):Item[]{return Array.from(hanzi).length===1?scopedItems(scope).filter(item=>item.hanzi.includes(hanzi)).map(item=>localizeItem(item,locale)):[];}
export function extendedCharacters(locale:Locale,scope:ExtendedScope='all'){
 return rows.filter(row=>(recognitionLevelByGlyph.get(row.hanzi)??Infinity)<=scopeRank(scope)).map(row=>{
  const reviewed=atlasByHanzi.get(row.hanzi);
  return {id:'structure-u'+row.hanzi.codePointAt(0)!.toString(16),hanzi:row.hanzi,
   readings:row.readings,englishMeaning:reviewed?.meaning.en??row.definition,meaning:reviewed?.meaning[locale]??(locale==='tr'?turkishText(row.definition):row.definition),meaningLocale:reviewed||locale==='tr'&&turkishText(row.definition)!==row.definition?locale:'en' as Locale,
   sourceStatus:'dataset-derived-modern-structure' as const,complete:row.decompositionComplete,structureSource:'structureSource' in row?row.structureSource:null,
   decomposition:row.decomposition,radical:row.radical,unresolved:row.unresolvedComponents,
   components:row.recursiveComponents as string[],leafComponents:row.leafComponents,wordIds:row.wordIds,reviewed};
 });
}
export type ExtendedCharacter=ReturnType<typeof extendedCharacters>[number];
/** Accept a curated Atlas component ID or a literal indexed glyph. Alias sets are shape variants only. */
export function extendedComponent(idOrGlyph:string){
 const curated=componentById.get(idOrGlyph);
 const candidates=curated?[curated.glyph,...curated.aliases]:[idOrGlyph];
 const variants=[...new Set(candidates.filter(value=>Array.from(value).length===1))];
 const valid=variants.some(glyph=>Object.hasOwn(data.reverseIndex,glyph)||rows.some(row=>row.hanzi===glyph||(row.recursiveComponents as string[]).includes(glyph)));
 const glyph=curated?.glyph??idOrGlyph;const definition=rows.find(row=>row.hanzi===glyph)?.definition??glyph;
 const named=(data.namedComponents as Record<string,{label:Record<Locale,string>}>)[glyph];
 return valid?{id:idOrGlyph,glyph,variants,aliases:variants.filter(value=>value!==glyph),label:curated?.label??named?.label??withTurkish({en:definition,fr:definition,ru:definition}),labelLocale:curated||named?null:"en",curated:curated??null}:null;
}
export function extendedFamily(componentIds:string[],locale:Locale,scope:ExtendedScope='all'){
 const components=[...new Set(componentIds)].map(extendedComponent);
 if(components.some(component=>!component))return [];
 return extendedCharacters(locale,scope).filter(node=>components.every(component=>component!.variants.some(glyph=>node.hanzi===glyph||node.components.includes(glyph))));
}
export function extendedCoverage(scope:ExtendedScope='all'){
 const nodes=extendedCharacters('en',scope);return {scope,words:scopedItems(scope).length+browseWords.filter(row=>browseInScope(browseLevel(row.level),scope)).length,characters:nodes.length,
  complete:nodes.filter(node=>node.complete).length,partial:nodes.filter(node=>!node.complete).length,
  reviewed:nodes.filter(node=>node.reviewed).length,componentKeys:Object.keys(data.reverseIndex).length,
  sourceUrl:data.sourceUrl,sourceStatus:data.sourceStatus};
}
