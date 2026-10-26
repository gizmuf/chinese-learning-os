import {items} from './content';
import vocabulary from '../data/turkish-vocabulary.json';
import extra from '../data/turkish-extra.json';
import ui from '../data/turkish-ui.json';
import course from '../data/turkish-course.json';
import lesson05 from '../data/turkish-lesson05.json';
const words=vocabulary as Record<string,{english:string;translation:string}>;
const dictionary:Record<string,string>={...Object.fromEntries(items.flatMap(item=>words[item.id]?[[item.english,words[item.id].english],[item.translation,words[item.id].translation]]:[])),...ui,...course,...lesson05,...extra};
export const turkishText=(text:string)=>dictionary[text]??text;
type TurkishCopies<T>=T extends {en:infer E;fr:unknown;ru:unknown}?T&{tr:E}:T extends readonly unknown[]?{[K in keyof T]:TurkishCopies<T[K]>}:T extends object?{[K in keyof T]:TurkishCopies<T[K]>}:T;
function translatedTree(value:unknown):unknown{return typeof value==='string'?turkishText(value):Array.isArray(value)?value.map(translatedTree):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,translatedTree(v)])):value;}
/** Add the Turkish sibling to copy records without mutating source data or other locales. */
export function withTurkish<T>(value:T):TurkishCopies<T>{
 if(Array.isArray(value))return value.map(v=>withTurkish(v)) as TurkishCopies<T>;
 if(value&&typeof value==='object'){
  const record=value as Record<string,unknown>;
  if('en' in record&&'fr' in record&&'ru' in record)return {...record,tr:record.tr??translatedTree(record.en)} as TurkishCopies<T>;
  return Object.fromEntries(Object.entries(record).map(([k,v])=>[k,withTurkish(v)])) as TurkishCopies<T>;
 }
 return value as TurkishCopies<T>;
}
