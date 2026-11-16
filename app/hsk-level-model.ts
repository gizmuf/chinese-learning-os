import {canonicalDictionaryText} from './simplified-chinese';
export const hskLevels=['1','2','3','4','5','6','7-9'] as const;
export type HskLevel=typeof hskLevels[number];
export type HskIndex={words:Map<string,HskLevel[]>;characters:Map<string,HskLevel[]>};
export function hskLevelIndex(raw:unknown):HskIndex{
 const data=raw as {version?:number;words?:Record<string,unknown>;characters?:Record<string,unknown>};
 if(data?.version!==1||!data.words||!data.characters)throw Error('Invalid HSK metadata');
 const words=new Map<string,HskLevel[]>(),characters=new Map<string,HskLevel[]>();
 for(const level of hskLevels){
  if(typeof data.words[level]!=='string'||typeof data.characters[level]!=='string')throw Error('Incomplete HSK metadata');
  for(const word of (data.words[level] as string).split('|'))if(word)words.set(word,[...(words.get(word)??[]),level]);
  for(const char of data.characters[level] as string){if(characters.has(char))throw Error('Duplicate recognition character');characters.set(char,[level]);}
 }
 return {words,characters};
}
export function hskClassification(index:HskIndex,text:string,preferredKind?:'word'|'character'){
 if(!/^\p{Script=Han}+$/u.test(text))return null;
 const kind=preferredKind??(Array.from(text).length===1?'character':'word');
 const table=kind==='character'?index.characters:index.words;
 const alias=table.has(text)?text:canonicalDictionaryText(text)??text;
 const levels=table.get(alias);
 if(levels)return {kind,levels};
 if(kind==='character'&&!preferredKind){
  const wordLevels=index.words.get(text)??index.words.get(alias);
  if(wordLevels)return {kind:'word' as const,levels:wordLevels};
 }
 return {kind,levels:[]};
}
