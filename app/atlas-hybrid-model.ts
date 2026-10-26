import {cloudWords, type CloudLevel, type CloudWord} from './atlas-cloud-model';
import {extendedCharacters} from './atlas-cloud-extended';
import {atlasByHanzi, componentById} from './atlas-model';
import {familyWords} from './word-family-model';
import type {Locale} from './translate';

export type HybridLayout = 'layers' | 'constellations' | 'matrix';
export type HybridSet = 'family' | 'hundred' | 'scope';
export const isHybridLayout = (value:string): value is HybridLayout => ['layers','constellations','matrix'].includes(value);
export const isHanzi = (value:string) => /^\p{Script=Han}$/u.test(value);
/** Opaque source glyphs are never substituted with a guessed component. */
export function readableComponent(value:string){
 const n=value.codePointAt(0)??0;
 return Array.from(value).length===1 && n>0 && !(n>=0xe000&&n<=0xf8ff) && !(n>=0xf0000&&n<=0xffffd) && !(n>=0x100000&&n<=0x10fffd) && !/[？?\u2ff0-\u2fff]/u.test(value);
}
export function hybridWords(set:HybridSet,anchor:string,locale:Locale,level:CloudLevel):CloudWord[]{
 if(set==='family')return familyWords(anchor,locale,level);
 const words=cloudWords(locale,level);
 return set==='hundred'?words.filter(w=>w.origin==='curriculum').slice(0,100):words;
}
export type HybridCharacter={hanzi:string;pinyin:string;meaning?:string;parts:string[];components:string[];complete:boolean;wordIds:string[]};
/** A literal reverse index; repeated glyphs count once per entry, occurrences count each time. */
export function hybridInventory(words:readonly CloudWord[],locale:Locale){
 const source=new Map(extendedCharacters(locale,3).map(ch=>[ch.hanzi,ch]));
 const members=new Map<string,string[]>();let occurrences=0;
 for(const word of words){const glyphs=Array.from(word.hanzi).filter(isHanzi);occurrences+=glyphs.length;for(const h of new Set(glyphs)){const ids=members.get(h)??[];ids.push(word.id);members.set(h,ids)}}
 const characters:HybridCharacter[]=[...members].map(([hanzi,wordIds])=>{
  const node=source.get(hanzi),reviewed=atlasByHanzi.get(hanzi);
  const fallback=reviewed?.components.map(id=>componentById.get(id)!.glyph)??[];
  const raw=node?.leafComponents??fallback;
  const parts=[...new Set(raw.filter(p=>p!==hanzi&&readableComponent(p)))];
  return {hanzi,pinyin:reviewed?.pinyin??node?.readings.join(' / ')??'',meaning:reviewed?.meaning[locale],parts,
   components:node?.components??fallback,complete:Boolean(node?.complete??reviewed)&&raw.every(readableComponent),wordIds};
 }).sort((a,b)=>b.wordIds.length-a.wordIds.length||a.hanzi.localeCompare(b.hanzi,'zh'));
 return {characters,occurrences,wordCount:words.length,characterCount:characters.length};
}
export function hybridPartFamily(characters:readonly HybridCharacter[],part:string){return characters.filter(ch=>ch.hanzi===part||ch.components.includes(part))}
export function hybridSelection(words:readonly CloudWord[],characters:readonly HybridCharacter[],hanzi:string,entry:string){
 const character=characters.find(ch=>ch.hanzi===hanzi)??characters[0];
 const relatives=character?words.filter(w=>character.wordIds.includes(w.id)):[];
 return {character,relatives,word:relatives.find(w=>w.id===entry)??relatives[0]};
}
export function hybridPage(total:number,page:number,size:number){
 const pages=Math.ceil(total/size),safe=Math.max(0,Math.min(Math.max(0,pages-1),Math.floor(Number.isFinite(page)?page:0)));
 return {page:safe,start:safe*size,end:Math.min(total,(safe+1)*size),pages};
}
export function hybridSwipe(dx:number,dy:number):-1|0|1{return Math.abs(dx)>=44&&Math.abs(dx)>Math.abs(dy)*1.3?(dx<0?1:-1):0}
