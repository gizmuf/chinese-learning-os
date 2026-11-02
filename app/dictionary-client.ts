import {canonicalDictionaryText,isSimplifiedHeadword} from './simplified-chinese';
import sourceMeta from '../data/dictionary-sources.json';
import {sourceCharacterEntry,type SourceCharacter} from './dictionary-source-model';
import type {DictionaryEntry} from './atlas-spatial-model';
const cacheName='chinese-os-dictionary-'+sourceMeta.cedict.sha256.slice(0,12)+'-'+sourceMeta.cedict.policySHA256.slice(0,12)+'-3';
async function storage(){try{return typeof caches==='undefined'?undefined:await caches.open(cacheName);}catch{return undefined;}}
async function resource(path:string){
 const cache=await storage(),cached=await cache?.match(path),response=cached??await fetch(path);
 if(!response.ok)throw Error('Could not load dictionary data');
 const bytes=await response.clone().arrayBuffer();if(bytes.byteLength>10000000)throw Error('Unexpected dictionary data');
 const body=new Uint8Array(bytes);const text=body[0]===31&&body[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(body);
 const data=JSON.parse(text);if(!cached)await cache?.put(path,response).catch(()=>{});return data;
}
let resources:Promise<{headwords:Set<string>;characters:Map<string,DictionaryEntry>}>|undefined;
export function loadDictionaryResources(){
 if(!resources)resources=Promise.all([resource('/dictionary/headwords.json.gz?v='+sourceMeta.cedict.policySHA256.slice(0,12)),resource('/dictionary/characters.json.gz')]).then(([words,characters]:[unknown,unknown])=>{
  if(!Array.isArray(words)||!words.every(w=>typeof w==='string')||!characters||typeof characters!=='object')throw Error('Invalid dictionary resources');
  return {headwords:new Set<string>(words.filter(isSimplifiedHeadword)),characters:new Map(Object.entries(characters).filter(([text])=>isSimplifiedHeadword(text)).map(([text,row])=>[text,sourceCharacterEntry(text,row as SourceCharacter)]))};
 }).catch(error=>{resources=undefined;throw error;});return resources;
}
const inFlight=new Map<string,Promise<DictionaryEntry|undefined>>();
export function fetchDictionaryEntry(text:string){
 const canonical=canonicalDictionaryText(text);if(!canonical)return Promise.resolve(undefined);text=canonical;
 const previous=inFlight.get(text);if(previous)return previous;
 const task=(async()=>{
  const url='/api/dictionary?'+new URLSearchParams({text,v:'3'}),cache=await storage(),cached=await cache?.match(url);
  if(cached&&Date.now()-Number(cached.headers.get('X-Dictionary-Cached-At'))<7*86400000){const entry=await cached.json() as DictionaryEntry;if(entry.text===text&&typeof entry.pinyin==='string'&&typeof entry.meaning==='string')return entry;}
  const response=await fetch(url);if(response.status===404)return undefined;if(!response.ok)throw Error('Could not load the dictionary. Please retry.');
  const data=await response.json() as {status:string;entry:DictionaryEntry};
  if(data.status!=='found'||data.entry?.text!==text||typeof data.entry.meaning!=='string'||!data.entry.meaning||typeof data.entry.pinyin!=='string')throw Error('Invalid dictionary response');
  await cache?.put(url,new Response(JSON.stringify(data.entry),{headers:{'Content-Type':'application/json','X-Dictionary-Cached-At':String(Date.now())}})).catch(()=>{});return data.entry;
 })().finally(()=>inFlight.delete(text));inFlight.set(text,task);return task;
}
