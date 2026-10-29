import lesson08Characters from '../data/lesson08/characters.json';
import {lesson08Terms,lesson08Pronunciation} from './lesson08-data';
import lesson08AudioManifest from '../public/course08/audio/manifest.json';
import lesson07Characters from '../data/lesson07/characters.json';
import lesson07AudioManifest from '../public/course07/audio/manifest.json';
import {lesson07Terms,lesson07Pronunciation} from './lesson07-data';
import {videoDictionary} from './video-study-data';
import lesson06Characters from '../data/lesson06/characters.json';
import {lesson06Terms,lesson06Audio} from './lesson06-data';
import lesson06AudioManifest from '../public/course06/audio/manifest.json';
import {terms,termItem} from './course-data';
import {lesson04Terms} from './lesson04-data';
import extraCharacters from '../data/study-dictionary-characters.json';
import writingContext from '../data/writing-character-context.json';
import {dictionaryTokens,type StudyDictionary} from './atlas-spatial-model';
import type {Locale} from './translate';
const lesson06Phrases=new Set(['请讲','醒了','够了','一把钥匙','一本书','两辆汽车','不难','不太难','有点儿难','很难','太难了','难极了','非常难','很有意思']);
export function appStudyDictionary(locale:Locale):StudyDictionary{
 const dictionary=videoDictionary(locale);
 for(const c of extraCharacters.characters){const existing=dictionary.get(c.text);if(!existing?.pinyin||!existing.meaning)dictionary.set(c.text,{...existing,text:c.text,pinyin:existing?.pinyin||c.pinyin,meaning:existing?.meaning||c.meaning,character:c.text});}
 for(const c of writingContext.characters)dictionary.set(c.text,{...dictionary.get(c.text),text:c.text,pinyin:c.pinyin,meaning:dictionary.get(c.text)?.meaning||c.meaning,character:c.text,audio:{text:c.text,pinyin:c.pinyin,source:c.audio,context:false}});
 for(const v of lesson04Terms)dictionary.set(v.hanzi,{...dictionary.get(v.hanzi),text:v.hanzi,pinyin:v.pinyin,meaning:v.meaning[locale],audio:{text:v.hanzi,pinyin:v.pinyin,context:false,source:'/course04/audio/course04-'+v.id+'-word.mp3'}});
 for(const v of terms){const item=termItem(v,locale);dictionary.set(v.hanzi,{...dictionary.get(v.hanzi),text:v.hanzi,pinyin:v.pinyin,meaning:v.meaning[locale],audio:{text:v.hanzi,pinyin:v.pinyin,context:false,source:(item.id.startsWith('course03-')?'/course03/audio/':'/audio/')+item.id+'-word.mp3'}});}
 for(const v of lesson06Terms)dictionary.set(v.hanzi,{...dictionary.get(v.hanzi),phrase:lesson06Phrases.has(v.hanzi),text:v.hanzi,pinyin:v.pinyin,meaning:v.meaning[locale],audio:{text:v.hanzi,pinyin:v.pinyin,context:false,source:lesson06Audio(v)}});
 for(const v of lesson06Characters.characters)dictionary.set(v.text,{...dictionary.get(v.text),text:v.text,pinyin:v.pinyin,meaning:v.meaning[locale],character:v.text});
 for(const clip of lesson06AudioManifest.recordings.filter(v=>v.id.startsWith("char-"))){const entry=dictionary.get(clip.text);if(entry)dictionary.set(clip.text,{...entry,audio:{text:clip.text,pinyin:entry.pinyin,context:false,source:"/course06/audio/"+clip.file}});}
 for(const v of lesson07Terms)if(!dictionary.has(v.hanzi))dictionary.set(v.hanzi,{...dictionary.get(v.hanzi),text:v.hanzi,pinyin:v.pinyin,meaning:v.meaning[locale],phrase:v.phrase,audio:lesson07Pronunciation(v)});
 for(const v of lesson07Characters.characters)dictionary.set(v.text,{...dictionary.get(v.text),text:v.text,pinyin:v.pinyin,meaning:v.meaning[locale],character:v.text});
 for(const clip of (lesson07AudioManifest.recordings as {id:string;text:string;file:string}[]).filter(v=>v.id.startsWith('char-'))){const entry=dictionary.get(clip.text);if(entry&&!entry.audio)dictionary.set(clip.text,{...entry,audio:{text:clip.text,pinyin:entry.pinyin,context:false,source:'/course07/audio/'+clip.file}});}
 for(const v of lesson08Terms)if(!dictionary.has(v.hanzi))dictionary.set(v.hanzi,{text:v.hanzi,pinyin:v.pinyin,meaning:v.meaning[locale],phrase:v.phrase,audio:lesson08Pronunciation(v)});
 for(const v of lesson08Characters.characters)dictionary.set(v.text,{...dictionary.get(v.text),text:v.text,pinyin:v.pinyin,meaning:v.meaning[locale],character:v.text});
 for(const clip of (lesson08AudioManifest.recordings as {id:string;text:string;file:string}[]).filter(v=>v.id.startsWith('char-'))){const entry=dictionary.get(clip.text);if(entry&&!entry.audio)dictionary.set(clip.text,{...entry,audio:{text:clip.text,pinyin:entry.pinyin,context:false,source:'/course08/audio/'+clip.file}});}
 // The lesson also teaches complete phrases; retain their actual constituent words.
 for(const [text,pinyin,en,fr,ru,tr] of [
  ['钥匙','yàoshi','key','clé','ключ','anahtar'],
  ['汽车','qìchē','car','voiture','автомобиль','araba'],
  ['非常','fēicháng','very / extremely','très / extrêmement','очень / чрезвычайно','çok / son derece'],
  ['有意思','yǒuyìsi','interesting','intéressant','интересный','ilginç'],
 ])if(!dictionary.has(text))dictionary.set(text,{text,pinyin,meaning:{en,fr,ru,tr}[locale]});
 // Individual characters can have senses beyond their first HSK vocabulary entry.
 for(const [text,meaning] of Object.entries({
  点:{en:"dot / point; a little; o’clock",fr:"point ; un peu ; heure",ru:"точка; немного; час (время)",tr:"nokta; biraz; saat"},
  匙:{en:"spoon; pronounced shi in 钥匙 (key)",fr:"cuillère ; prononcé shi dans 钥匙 (clé)",ru:"ложка; читается shi в 钥匙 (ключ)",tr:"kaşık; 钥匙 (anahtar) içinde shi okunur"},
  儿:{en:"child / son; r-ending in expressions such as 一点儿",fr:"enfant / fils ; terminaison en r, comme dans 一点儿",ru:"ребёнок / сын; окончание -r, как в 一点儿",tr:"çocuk / oğul; 一点儿 gibi ifadelerde r eki"},
 })){const entry=dictionary.get(text);if(entry)dictionary.set(text,{...entry,pinyin:text==='匙'?'chí / shi':entry.pinyin,meaning:meaning[locale]});}
 return dictionary;
}
/** Resolve the glyph actually hit; whitespace/punctuation must never open a neighbouring word. */
export function lookupAtOffset(text:string,offset:number,dictionary:StudyDictionary){
 if(!Number.isInteger(offset)||offset<0||offset>=text.length||!/[\p{Script=Han}]/u.test(String.fromCodePoint(text.codePointAt(offset)!)))return null;
 let start=0;for(const token of dictionaryTokens(text,dictionary)){const end=start+token.text.length;if(offset>=start&&offset<end)return token.chinese?token.text:null;start=end;}return null;
}
export const studyAssessmentSelector='.course-exercise,.recall-card,.course-free-recall,.atlas-quiz,.sp-recognition,.video-check';
export const studyFeedbackSelector='.lesson04-feedback,.course-feedback,.atlas-answer,.atlas-feedback,.sp-quiz-feedback,[data-study-revealed]';
