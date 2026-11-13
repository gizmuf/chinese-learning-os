import {cloudWords,type CloudLevel} from './atlas-cloud-model';
import {pinyinKey} from './chinese-search';
import {validWordAnchor} from './word-family-model';
import type {Locale} from './translate';
/** Candidate choice is explicit: homophones are never silently replaced by 四. */
export function wordFamilyCandidates(query:string,locale:Locale,scope:CloudLevel){
 const text=query.trim(),hanzi=Array.from(text).filter(ch=>/\p{Script=Han}/u.test(ch)).join('');
 if(hanzi)return validWordAnchor(hanzi)?[{hanzi,pinyin:''}]:[];
 const key=pinyinKey(text);if(!key||!/^[a-zv]+$/.test(key))return [];
 const seen=new Set<string>();
 return cloudWords(locale,scope).filter(word=>validWordAnchor(word.hanzi)&&word.pinyin.split(/[/;,|]/).some(reading=>pinyinKey(reading)===key)&&!seen.has(word.hanzi)&&!!seen.add(word.hanzi)).map(({hanzi,pinyin})=>({hanzi,pinyin}));
}
