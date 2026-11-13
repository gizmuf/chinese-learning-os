import {cloudWords,type CloudLevel} from './atlas-cloud-model';
import {pinyinKey} from './chinese-search';
import {tonePinyin} from './dictionary-source-model';
import {validWordAnchor} from './word-family-model';
import type {Locale} from './translate';
const toneKey=(value:string)=>tonePinyin(value.toLowerCase().replace(/u:|v/g,'ü'))
 .normalize('NFC').replace(/[\s’'·-]/g,'');
/** Candidate choice is explicit: homophones are never silently replaced by 四. */
export function wordFamilyCandidates(query:string,locale:Locale,scope:CloudLevel){
 const text=query.trim(),hanzi=Array.from(text).filter(ch=>/\p{Script=Han}/u.test(ch)).join('');
 if(hanzi)return validWordAnchor(hanzi)?[{hanzi,pinyin:''}]:[];
 const key=pinyinKey(text);if(!key||!/^[a-zv]+$/.test(key))return [];
 const explicitlyToned=/[0-5]|[\u0300\u0301\u0304\u030c]/.test(text.normalize('NFD'));
 const wanted=toneKey(text);
 const exact:{hanzi:string;pinyin:string}[]=[],fallback:typeof exact=[];
 for(const word of cloudWords(locale,scope)){
  if(!validWordAnchor(word.hanzi))continue;
  const matching=word.pinyin.split(/[/;,|]/).filter(reading=>pinyinKey(reading)===key);
  if(!matching.length)continue;
  const sameTone=explicitlyToned&&matching.some(reading=>toneKey(reading)===wanted);
  (sameTone?exact:fallback).push({hanzi:word.hanzi,pinyin:word.pinyin});
 }
 const seen=new Set<string>();
 return [...exact,...fallback].filter(row=>!seen.has(row.hanzi)&&!!seen.add(row.hanzi));
}
