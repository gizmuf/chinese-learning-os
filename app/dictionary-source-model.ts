import {canonicalDictionaryText,simplifiedDisplayText} from './simplified-chinese';
import {authoredCharacterReadings} from './pinyin-boundaries';
import type {Pronunciation,DictionaryEntry} from './atlas-spatial-model';
export type DictionaryContext={text:string;pinyin:string;meaning:string;sourceId?:string;audio?:Pronunciation};
export type SourceSense={pinyin:string;meaning:string;kind?:'name'|'variant'|'rare'};
export type SourceCharacter={definition?:string;pinyin?:string[];radical?:string;decomposition?:string};
export const validDictionaryText=(text:string)=>Array.from(text).length<=40&&/^[\p{Script=Han}]+$/u.test(text);
export function tonePinyin(value:string){
 return value.replace(/([a-züÜvV:]+)([0-5])/gi,(_,raw:string,tone:string)=>{
  const syllable=raw.replace(/u:/gi,'ü').replace(/v/gi,'ü'),lower=syllable.toLowerCase(),n=Number(tone);
  if(n===0||n===5)return syllable;
  let i=lower.indexOf('a');if(i<0)i=lower.indexOf('e');if(i<0&&lower.includes('ou'))i=lower.indexOf('o');if(i<0)for(let j=lower.length-1;j>=0;j--)if('aeiouü'.includes(lower[j])){i=j;break;}
  if(i<0){const syllabic=lower.search(/[nm]/);return syllabic<0?syllable+tone:syllable.slice(0,syllabic+1)+['̄','́','̌','̀'][n-1]+syllable.slice(syllabic+1);}const vowels:Record<string,string>={a:'āáǎà',e:'ēéěè',i:'īíǐì',o:'ōóǒò',u:'ūúǔù',ü:'ǖǘǚǜ'};let marked=vowels[lower[i]][n-1];if(syllable[i]!==lower[i])marked=marked.toUpperCase();return syllable.slice(0,i)+marked+syllable.slice(i+1);
 });
}
export function cedictEntry(source:string,text:string):DictionaryEntry|undefined {
 if(!validDictionaryText(text))return;
 const canonical=canonicalDictionaryText(text);if(!canonical)return;
 const senses:SourceSense[]=[];
 for(const raw of source.split('\n')){
  const line=raw.trimEnd();
  if(line.startsWith('#'))continue;const first=line.indexOf(' '),second=line.indexOf(' ',first+1);
  if(line.slice(first+1,second)!==canonical)continue;
  const match=line.match(/\[([^\]]+)\] \/(.+)\/$/);if(!match)continue;
  const rawMeaning=match[2].split('/').join('; '),kind=/^[A-Z]/.test(match[1])?'name':/^(old |archaic )?variant of /i.test(rawMeaning)?'variant':/\(rare\)|\(archaic\)/i.test(rawMeaning)?'rare':undefined;
  const sense:SourceSense={pinyin:tonePinyin(match[1]),meaning:simplifiedDisplayText(rawMeaning),...(kind?{kind}: {})};
  if(!senses.some(s=>s.pinyin===sense.pinyin&&s.meaning===sense.meaning))senses.push(sense);
 }
 if(!senses.length)return;
 const readings=[...new Map(senses.map(s=>[s.pinyin.toLowerCase(),s.pinyin.toLowerCase()])).values()];
 return {text:canonical,pinyin:readings.join(' / '),meaning:senses.map(s=>s.meaning).join(' · '),senses,sourceName:'CC-CEDICT · English',sourceURL:'https://www.mdbg.net/chinese/dictionary?page=cedict',...(Array.from(canonical).length===1?{character:canonical}:{})};
}
export function sourceCharacterEntry(text:string,source:SourceCharacter):DictionaryEntry{
 return {text,pinyin:source.pinyin?.join(' / ')??'',meaning:simplifiedDisplayText(source.definition??''),character:text,sourceName:'Make Me a Hanzi · English',sourceURL:'https://github.com/skishore/makemeahanzi',structure:source.radical&&source.decomposition?{radical:source.radical,decomposition:source.decomposition}:undefined};
}
/** Authored alignment may select one attested reading; ambiguous contexts retain all senses. */
export function contextualDictionaryEntry(entry:DictionaryEntry,context?:DictionaryContext):DictionaryEntry{
 if(context?.text===entry.text)return entry;
 if(context&&entry.senses&&new Set(entry.senses.map(sense=>sense.pinyin.toLowerCase())).size>1&&Array.from(entry.text).length===1){const readings=authoredCharacterReadings(context.text,context.pinyin)?.filter(row=>row.character===entry.text).map(row=>row.pinyin),unique=readings?[...new Set(readings)]:[];if(unique.length===1){const matches=entry.senses.filter(sense=>sense.pinyin.toLowerCase()===unique[0]);if(matches.length){const audio=entry.audio&&!entry.audio.context&&entry.audio.text===entry.text&&entry.audio.pinyin.toLowerCase()===unique[0]?entry.audio:undefined;return {...entry,word:entry.word?.pinyin.toLowerCase()===unique[0]?entry.word:undefined,pinyin:unique[0],meaning:matches.map(sense=>sense.meaning).join(' · '),audio,contextual:context};}}}
 if(entry.text==='得'&&context?.text==='早饭后，我准备出门，因为我得去学校。'&&context.pinyin.includes('děi'))return {...entry,word:undefined,pinyin:'děi',meaning:'must / have to — here: I have to go to school',audio:undefined,contextual:context};
 return context?.text.includes(entry.text)?{...entry,contextual:context}:entry;
}
const layoutNames:Record<string,[number,string]>={'⿰':[2,'Left–right'],'⿱':[2,'Top–bottom'],'⿲':[3,'Three columns'],'⿳':[3,'Three rows'],'⿴':[2,'Enclosing'],'⿵':[2,'Enclosing from above'],'⿶':[2,'Enclosing from below'],'⿷':[2,'Enclosing from the left'],'⿸':[2,'Upper-left enclosing'],'⿹':[2,'Upper-right enclosing'],'⿺':[2,'Lower-left enclosing'],'⿻':[2,'Overlapping'],'⿼':[2,'Enclosing from the right'],'⿽':[2,'Lower-right enclosing']};
export function describeStructure(ids:string){
 const points=Array.from(ids),parts:string[]=[];let index=0;
 function node():string {const glyph=points[index++];if(!glyph)return '';const layout=layoutNames[glyph];if(layout)return layout[1]+': ('+Array.from({length:layout[0]},node).join(' + ')+')';if(glyph==='？'||glyph==='?')return 'unidentified part';if(!parts.includes(glyph))parts.push(glyph);return glyph;}
 const description=node();return {description:index===points.length?description:'',parts};
}
