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
export function appStudyDictionary(locale:Locale):StudyDictionary{
 const dictionary=videoDictionary(locale);
 for(const c of extraCharacters.characters){const existing=dictionary.get(c.text);if(!existing?.pinyin||!existing.meaning)dictionary.set(c.text,{...existing,text:c.text,pinyin:existing?.pinyin||c.pinyin,meaning:existing?.meaning||c.meaning,character:c.text});}
 for(const c of writingContext.characters)dictionary.set(c.text,{...dictionary.get(c.text),text:c.text,pinyin:c.pinyin,meaning:dictionary.get(c.text)?.meaning||c.meaning,character:c.text,audio:{text:c.text,pinyin:c.pinyin,source:c.audio,context:false}});
 for(const v of lesson04Terms)dictionary.set(v.hanzi,{...dictionary.get(v.hanzi),text:v.hanzi,pinyin:v.pinyin,meaning:v.meaning[locale],audio:{text:v.hanzi,pinyin:v.pinyin,context:false,source:'/course04/audio/course04-'+v.id+'-word.mp3'}});
 for(const v of terms){const item=termItem(v,locale);dictionary.set(v.hanzi,{...dictionary.get(v.hanzi),text:v.hanzi,pinyin:v.pinyin,meaning:v.meaning[locale],audio:{text:v.hanzi,pinyin:v.pinyin,context:false,source:(item.id.startsWith('course03-')?'/course03/audio/':'/audio/')+item.id+'-word.mp3'}});}
 for(const v of lesson06Terms)dictionary.set(v.hanzi,{...dictionary.get(v.hanzi),text:v.hanzi,pinyin:v.pinyin,meaning:v.meaning[locale],audio:{text:v.hanzi,pinyin:v.pinyin,context:false,source:lesson06Audio(v)}});
 for(const v of lesson06Characters.characters)dictionary.set(v.text,{...dictionary.get(v.text),text:v.text,pinyin:v.pinyin,meaning:v.meaning[locale],character:v.text});
 for(const clip of lesson06AudioManifest.recordings.filter(v=>v.id.startsWith("char-"))){const entry=dictionary.get(clip.text);if(entry)dictionary.set(clip.text,{...entry,audio:{text:clip.text,pinyin:entry.pinyin,context:false,source:"/course06/audio/"+clip.file}});}
 return dictionary;
}
/** Resolve the glyph actually hit; whitespace/punctuation must never open a neighbouring word. */
export function lookupAtOffset(text:string,offset:number,dictionary:StudyDictionary){
 if(!Number.isInteger(offset)||offset<0||offset>=text.length||!/[\p{Script=Han}]/u.test(String.fromCodePoint(text.codePointAt(offset)!)))return null;
 let start=0;for(const token of dictionaryTokens(text,dictionary)){const end=start+token.text.length;if(offset>=start&&offset<end)return token.chinese?token.text:null;start=end;}return null;
}
export const studyAssessmentSelector='.course-exercise,.recall-card,.course-free-recall,.atlas-quiz,.sp-recognition,.video-check';
export const studyFeedbackSelector='.lesson04-feedback,.course-feedback,.atlas-answer,.atlas-feedback,.sp-quiz-feedback,[data-study-revealed]';
