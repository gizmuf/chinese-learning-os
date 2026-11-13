/** Use authored pinyin word spacing to keep dictionary matching inside the lesson's words. */
const initials=['zh','ch','sh','b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s','y','w',''];
const finals=['iang','iong','uang','ueng','ang','eng','ong','ian','iao','ing','uan','uai','üan','ai','an','ao','ou','ei','en','er','ia','ie','in','iu','ua','ue','ui','un','uo','üe','ün','a','e','i','o','u','ü'];
const syllables=[...new Set(initials.flatMap(initial=>finals.map(final=>initial+final)))].sort((a,b)=>b.length-a.length);
function countSyllables(word:string){
 const plain=word.toLowerCase().replace(/ü/g,'v').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/v/g,'ü').replace(/[0-5]/g,'');
 let index=0,count=0;while(index<plain.length){if(plain[index]==="'"||plain[index]==='’'){index++;continue;}const syllable=syllables.find(s=>plain.startsWith(s,index));if(!syllable)return 0;index+=syllable.length;count++;}return count;
}
export function authoredPinyinBoundaries(text:string,pinyin:string):Set<number>|undefined{
 const glyphs:{end:number}[]=[];let offset=0;for(const glyph of text){offset+=glyph.length;if(/\p{Script=Han}/u.test(glyph))glyphs.push({end:offset});else if(/[\p{Letter}\p{Number}]/u.test(glyph))return;}
 const words=pinyin.match(/[\p{Letter}\p{Mark}0-5'’]+/gu)??[],counts=words.map(countSyllables);
 if(!counts.length||counts.some(n=>!n)||counts.reduce((a,b)=>a+b,0)!==glyphs.length)return;
 const boundaries=new Set<number>();let position=0;for(const count of counts){position+=count;boundaries.add(glyphs[position-1].end);}return boundaries;
}
/** A character reading is selected only when authored text and syllables align exactly. */
export function authoredCharacterReadings(text:string,pinyin:string):{character:string;pinyin:string}[]|undefined{
 const characters=Array.from(text).filter(glyph=>/\p{Script=Han}/u.test(glyph));if(!authoredPinyinBoundaries(text,pinyin))return;
 const readings:string[]=[];
 for(const word of pinyin.match(/[\p{Letter}\p{Mark}0-5'’]+/gu)??[]){
  if(/[0-5]/.test(word))return;const original=word.normalize('NFC').toLowerCase(),plain=original.replace(/ü/g,'v').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/v/g,'ü');if(original.length!==plain.length)return;
  let index=0;while(index<plain.length){if(plain[index]==="'"||plain[index]==='’'){index++;continue;}const syllable=syllables.find(s=>plain.startsWith(s,index));if(!syllable)return;readings.push(original.slice(index,index+syllable.length));index+=syllable.length;}
 }
 if(readings.length!==characters.length)return;return characters.map((character,i)=>({character,pinyin:readings[i]}));
}
