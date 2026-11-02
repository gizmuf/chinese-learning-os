import lesson10Characters from '../data/lesson10/characters.json';
import {lesson10Terms,lesson10Pronunciation} from './lesson10-data';
import shuoshuoLookup from '../data/shuoshuo-morning-lookup.json';
import {extendedComponent} from './atlas-cloud-extended';
import {atlasByHanzi} from './atlas-model';
import shuoshuoMorning from '../data/shuoshuo-morning.json';
import shuoshuoAudio from '../data/shuoshuo-morning-audio.json';
import shuoshuoStructures from '../data/hanzi-structure.json';
import lesson09Characters from '../data/lesson09/characters.json';
import {lesson09Recording,lesson09Terms,lesson09Pronunciation} from './lesson09-data';
import lesson09AudioManifest from '../public/course09/audio/manifest.json';
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
import grammarLookup from '../data/speaking-chunks/grammar-lookup.json';
import {grammarChunkTasks} from './chunk-library-data';
import extraCharacters from '../data/study-dictionary-characters.json';
import writingContext from '../data/writing-character-context.json';
import {dictionaryTokens,type StudyDictionary,type DictionaryEntry} from './atlas-spatial-model';
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
 for(const v of lesson09Terms)if(!dictionary.has(v.hanzi))dictionary.set(v.hanzi,{text:v.hanzi,pinyin:v.pinyin,meaning:v.meaning[locale],phrase:v.phrase,audio:lesson09Pronunciation(v)});
 for(const v of lesson09Characters.characters)dictionary.set(v.text,{...dictionary.get(v.text),text:v.text,pinyin:v.pinyin,meaning:v.meaning[locale],character:v.text});
 for(const clip of (lesson09AudioManifest.recordings as {id:string;text:string;file:string}[]).filter(v=>v.id.startsWith('char-'))){const entry=dictionary.get(clip.text);if(entry&&!entry.audio)dictionary.set(clip.text,{...entry,audio:{text:clip.text,pinyin:entry.pinyin,context:false,source:lesson09Recording(clip.id)??'/course09/audio/'+clip.file}});}
 for(const v of lesson10Terms)if(!dictionary.has(v.hanzi))dictionary.set(v.hanzi,{text:v.hanzi,pinyin:v.pinyin,meaning:v.meaning[locale],phrase:v.phrase,audio:lesson10Pronunciation(v)});
 for(const v of lesson10Characters.characters)if(!dictionary.has(v.text))dictionary.set(v.text,{text:v.text,pinyin:v.pinyin,meaning:v.meaning.en,character:v.text});
 // The lesson also teaches complete phrases; retain their actual constituent words.
 for(const [text,pinyin,en,fr,ru,tr] of [
  ['钥匙','yàoshi','key','clé','ключ','anahtar'],
  ['汽车','qìchē','car','voiture','автомобиль','araba'],
  ['非常','fēicháng','very / extremely','très / extrêmement','очень / чрезвычайно','çok / son derece'],
  ['有意思','yǒuyìsi','interesting','intéressant','интересный','ilginç'],
 ])if(!dictionary.has(text))dictionary.set(text,{text,pinyin,meaning:{en,fr,ru,tr}[locale]});
 // Grammar expressions share the same dictionary and exact retained fragment audio.
 for(const term of grammarLookup){const old=dictionary.get(term.text),meaning=term.meaning[locale];const task=grammarChunkTasks.find(t=>t.targets.some(i=>t.parts[i]===term.text)),index=task?.targets.find(i=>task.parts[i]===term.text);dictionary.set(term.text,{...old,text:term.text,pinyin:old?.pinyin||term.pinyin,meaning:old?.meaning||meaning,...(!old?.audio&&task&&index!==undefined?{audio:{text:term.text,pinyin:term.pinyin,context:false,source:task.pieceAudio![index]}}:{})});}
 // Individual characters can have senses beyond their first HSK vocabulary entry.
 for(const [text,meaning] of Object.entries({
  点:{en:"dot / point; a little; o’clock",fr:"point ; un peu ; heure",ru:"точка; немного; час (время)",tr:"nokta; biraz; saat"},
  匙:{en:"spoon; pronounced shi in 钥匙 (key)",fr:"cuillère ; prononcé shi dans 钥匙 (clé)",ru:"ложка; читается shi в 钥匙 (ключ)",tr:"kaşık; 钥匙 (anahtar) içinde shi okunur"},
  儿:{en:"child / son; r-ending in expressions such as 一点儿",fr:"enfant / fils ; terminaison en r, comme dans 一点儿",ru:"ребёнок / сын; окончание -r, как в 一点儿",tr:"çocuk / oğul; 一点儿 gibi ifadelerde r eki"},
 })){const entry=dictionary.get(text);if(entry)dictionary.set(text,{...entry,pinyin:text==='匙'?'chí / shi':entry.pinyin,meaning:meaning[locale]});}
 // Built-in lesson text participates in the same word → character → Atlas flow.
 const structureGlyphs=new Set(shuoshuoStructures.characters.map(c=>c.hanzi));
 const characterContext:Record<string,[string,string]>={麻:['má','In 麻烦: troublesome / inconvenient. Separate character sense not recorded here.'],烦:['fán','In 麻烦: troublesome / inconvenient. Separate character sense not recorded here.'],呀:['ya','Conversational exclamation in 早上好呀.'],卧:['wò','In 卧室: bedroom. Separate character sense not recorded here.'],剪:['jiǎn','In 剪视频: cut / edit video; not the surname gloss.'],造:['zào','In 创造: create. Separate character sense not recorded here.'],番:['fān','In 番茄: tomato. The whole word supplies the meaning.'],茄:['qié','In 番茄: tomato. The whole word supplies the meaning.'],呆:['dāi','In 发呆: stare into space / zone out.'],饼:['bǐng','A flat cake / pancake; in 饼干, biscuit. Do not confuse 冰 bīng (ice).']};
 for(const glyph of new Set(shuoshuoMorning.sources.flatMap(s=>Array.from(s.hanzi).filter(c=>/\p{Script=Han}/u.test(c))))){const old=dictionary.get(glyph),context=characterContext[glyph];dictionary.set(glyph,{...old,text:glyph,pinyin:old?.pinyin??context?.[0]??'',meaning:old?.meaning??context?.[1]??'Separate character meaning not recorded here.',character:glyph,atlasAvailable:structureGlyphs.has(glyph)});}
 for(const term of shuoshuoLookup.entries)if(!dictionary.has(term.text))dictionary.set(term.text,{text:term.text,pinyin:term.pinyin,meaning:term.english});
 for(const term of shuoshuoMorning.practiceTargets){const old=dictionary.get(term.text),clip=(shuoshuoAudio.words as Record<string,{source:string}>)[term.text];dictionary.set(term.text,{...old,text:term.text,pinyin:term.pinyin,meaning:old?.meaning??term.english,...(clip?{audio:{text:term.text,pinyin:term.pinyin,source:clip.source,context:false}}:{})});}
 if(!dictionary.has('热水'))dictionary.set('热水',{text:'热水',pinyin:'rèshuǐ',meaning:'hot water'});
 for(const sentence of shuoshuoMorning.sentences)dictionary.set(sentence.hanzi,{text:sentence.hanzi,pinyin:sentence.pinyin,meaning:sentence.english,phrase:true});
 return dictionary;
}
/** Resolve the glyph actually hit; whitespace/punctuation must never open a neighbouring word. */
export function lookupAtOffset(text:string,offset:number,dictionary:StudyDictionary){
 if(!Number.isInteger(offset)||offset<0||offset>=text.length||!/[\p{Script=Han}]/u.test(String.fromCodePoint(text.codePointAt(offset)!)))return null;
 let start=0;for(const token of dictionaryTokens(text,dictionary)){const end=start+token.text.length;if(offset>=start&&offset<end)return token.chinese?token.text:null;start=end;}return null;
}
export const studyAssessmentSelector='.course-exercise,.recall-card,.course-free-recall,.atlas-quiz,.sp-recognition,.video-check';
export const studyFeedbackSelector='.lesson04-feedback,.course-feedback,.atlas-answer,.atlas-feedback,.sp-quiz-feedback,[data-study-revealed]';
/** A grammar example may need senses absent from an earlier lesson's narrower gloss. */
export function studyLookupEntry(dictionary:StudyDictionary,text:string,locale:Locale,grammarContext=false){
 const existing=dictionary.get(text),gloss=grammarContext?grammarLookup.find(term=>term.text===text):undefined;
 return gloss?{...existing,text,pinyin:gloss.pinyin,meaning:gloss.meaning[locale]}:existing;
}

/** Keep Atlas on a component that actually belongs to the selected character. */
export function studyAtlasHref(entry:DictionaryEntry){
 if(entry.atlasAvailable===false)return null;
 const hanzi=entry.character??Array.from(entry.text)[0],reviewed=atlasByHanzi.get(hanzi),structure=shuoshuoStructures.characters.find(c=>c.hanzi===hanzi);
 const part=reviewed?.semantic??reviewed?.components[0]??structure?.leafComponents.find(p=>extendedComponent(p));
 if(!part)return null;
 const p=new URLSearchParams({atlas:'1',cloud:'1',layout:'space',collection:reviewed?'atlas':'library',hanzi,part});if(entry.word){p.set('word',entry.word.id);p.set('focus','word');}return '/?'+p;
}
