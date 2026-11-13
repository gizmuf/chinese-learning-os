/** Lookup only: never use this normalization to grade pronunciation or written answers. */
export type SearchMode = 'pinyin' | 'english';
export type SearchFields = {hanzi:string;pinyin:string;english?:string};
/** Keep ü distinct from u; v and u: are keyboard-friendly aliases. */
export function pinyinKey(value:string):string {
 return value.toLowerCase().normalize('NFD').replace(/u\u0308/g,'v').replace(/u:/g,'v').replace(/[\u0300-\u036f]/g,'').replace(/[1-5]/g,'').replace(/[\s’'·-]/g,'').normalize('NFC');
}
const readings=(value:string)=>value.split(/\s*[/;,|]\s*/).filter(Boolean);
const textKey=(value:string)=>value.normalize('NFKC').toLocaleLowerCase().trim();
/** Lower is better. Exact forms beat prefixes; English cannot leak into pinyin mode. */
export function searchScore(row:SearchFields,query:string,mode:SearchMode='pinyin'):number|null {
 const q=query.trim();if(!q)return 0;
 if(/\p{Script=Han}/u.test(q))return row.hanzi===q?0:row.hanzi.startsWith(q)?10:row.hanzi.includes(q)?20:null;
 if(mode==='english'){
  const term=textKey(q),meaning=textKey(row.english??'');
  if(meaning===term)return 0;
  if(meaning.split(/[^\p{L}\p{N}]+/u).includes(term))return 10;
  return meaning.split(/[^\p{L}\p{N}]+/u).some(word=>word.startsWith(term))?20:meaning.includes(term)&&term.length>2?30:null;
 }
 const key=pinyinKey(q);if(!key||!/^[a-zv]+$/.test(key))return null;
 let best=Infinity;
 for(const reading of readings(row.pinyin)){
  const value=pinyinKey(reading);
  if(value===key){best=Math.min(best,0);continue;}
  const syllables=reading.split(/[\s’'·-]+/).map(pinyinKey);
  if(syllables.includes(key)){best=Math.min(best,10);continue;}
  if(value.startsWith(key))best=Math.min(best,20);
  else if(syllables.some(s=>s.startsWith(key)))best=Math.min(best,30);
 }
 return Number.isFinite(best)?best:null;
}
export function rankSearch<T>(rows:readonly T[],query:string,mode:SearchMode,fields:(row:T)=>SearchFields):T[]{
 if(!query.trim())return [...rows];
 return rows.map((row,index)=>({row,index,score:searchScore(fields(row),query,mode)})).filter(hit=>hit.score!==null).sort((a,b)=>a.score!-b.score!||a.index-b.index).map(hit=>hit.row);
}
