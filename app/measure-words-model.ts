import data from '../data/measure-words.json';
import {items,type Item} from './content';
import type {StudyDictionary} from './atlas-spatial-model';
export type MeasureWord = typeof data[number];
export const measureWords:readonly MeasureWord[]=data;
export const measureGroups=['people','animals','home','clothing','places','study','travel','food','nature','actions','units','time'] as const;
const normalize=(text:string)=>text.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ü/g,'u').replace(/u:|v/g,'u').replace(/[1-5]/g,'').replace(/\s+/g,'');
/** English glosses, Hanzi, marked/unmarked or numbered pinyin, including noun pairings. */
export function matchesMeasureWord(word:MeasureWord,query:string){
 return normalize([word.hanzi,word.pinyin,word.meaning,word.note,...word.examples.flatMap(e=>[e.hanzi,e.pinyin,e.english])].join(' ')).includes(normalize(query.trim()));
}
/** Reuse exact existing cards, including reading: 只 zhī must not resolve to 只 zhǐ. */
export function measureCanonical(word:MeasureWord):Item|undefined{
 return items.find(item=>item.hanzi===word.hanzi&&item.pinyin.normalize('NFC').toLowerCase().replace(/\s/g,'')===word.pinyin.normalize('NFC').toLowerCase().replace(/\s/g,''));
}
/** One shared headword per spelling; retain previous senses, recordings and curriculum IDs. */
export function addMeasureDictionary(dictionary:StudyDictionary){
 for(const word of measureWords){
  const old=dictionary.get(word.hanzi),meaning='Measure word · English: '+word.meaning;
  const senses=[...(old?.senses??(old?[{pinyin:old.pinyin,meaning:old.meaning}]:[]))];
  const alreadyAdded=senses.some(s=>s.pinyin===word.pinyin&&s.meaning===meaning);
  if(!alreadyAdded)senses.push({pinyin:word.pinyin,meaning});
  dictionary.set(word.hanzi,{...old,text:word.hanzi,pinyin:old?.pinyin||word.pinyin,meaning:old?.meaning?old.meaning+(alreadyAdded?'':' · '+meaning):meaning,senses,...(word.hanzi.length===1?{character:word.hanzi}:{})});
  for(const example of word.examples)if(!dictionary.has(example.hanzi))dictionary.set(example.hanzi,{text:example.hanzi,pinyin:example.pinyin,meaning:example.english,phrase:true});
 }
 return dictionary;
}
