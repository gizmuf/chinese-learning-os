import {cloudWords,type CloudLevel,type CloudWord} from './atlas-cloud-model';
import type {Locale} from './translate';
export type WordParts={before:string;anchor:string;after:string};
export function validWordAnchor(value:string){return /^[\p{Script=Han}]{1,8}$/u.test(value)}
export function splitFamilyWord(word:string,anchor:string):WordParts|null{
 if(!validWordAnchor(anchor))return null;const at=word.indexOf(anchor);return at<0?null:{before:word.slice(0,at),anchor,after:word.slice(at+anchor.length)};
}
/** Literal writing groups, not claims about etymology or the meaning of a fragment. */
export function familyWords(anchor:string,locale:Locale,level:CloudLevel='all'):CloudWord[]{
 if(!validWordAnchor(anchor))return [];
 const members=cloudWords(locale,level).filter(w=>w.hanzi.includes(anchor));
 const prefixes=new Map<string,number>([['',0]]);for(const word of members){const prefix=splitFamilyWord(word.hanzi,anchor)!.before;if(!prefixes.has(prefix))prefixes.set(prefix,prefixes.size)}
 return members.map((word,index)=>({word,index,parts:splitFamilyWord(word.hanzi,anchor)!})).sort((a,b)=>prefixes.get(a.parts.before)!-prefixes.get(b.parts.before)!||Array.from(a.parts.after).length-Array.from(b.parts.after).length||a.index-b.index).map(row=>row.word);
}
export function familyAnchors(locale:Locale,level:CloudLevel){
 const groups=new Map<string,Set<string>>();for(const word of cloudWords(locale,level))for(const hanzi of new Set(Array.from(word.hanzi))){if(!validWordAnchor(hanzi))continue;const ids=groups.get(hanzi)??new Set<string>();ids.add(word.id);groups.set(hanzi,ids)}
 return [...groups].map(([anchor,ids])=>({anchor,count:ids.size})).sort((a,b)=>b.count-a.count||a.anchor.localeCompare(b.anchor));
}
export function familyColumns(words:readonly CloudWord[],anchor:string){const parts=words.map(w=>splitFamilyWord(w.hanzi,anchor)).filter((p):p is WordParts=>!!p);return {before:Math.max(1,...parts.map(p=>Array.from(p.before).length)),anchor:Array.from(anchor).length,after:Math.max(1,...parts.map(p=>Array.from(p.after).length))}}
export function compareWordFamilies(left:string,right:string,locale:Locale,level:CloudLevel){
 const groups=new Map<string,{key:string;before:string;after:string;left:CloudWord[];right:CloudWord[]}>();
 for(const [anchor,side] of [[left,'left'],[right,'right']] as const)for(const word of familyWords(anchor,locale,level)){const p=splitFamilyWord(word.hanzi,anchor)!;const key=JSON.stringify([p.before,p.after]);const row=groups.get(key)??{key,before:p.before,after:p.after,left:[],right:[]};row[side].push(word);groups.set(key,row)}
 return [...groups.values()].sort((a,b)=>Array.from(a.before+a.after).length-Array.from(b.before+b.after).length||a.key.localeCompare(b.key));
}
export function boundedFamilyIndex(index:number,count:number){return count?Math.max(0,Math.min(count-1,Math.round(Number.isFinite(index)?index:0))):0}
