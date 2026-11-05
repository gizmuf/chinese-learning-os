import {terms,sentences,termItem} from './course-data';
import {lesson04All} from './lesson04-data';
import {lesson05All} from './lesson05-data';
import {lesson06All,lesson06Audio} from './lesson06-data';
import {lesson07All,lesson07Pronunciation} from './lesson07-data';
import {lesson08All,lesson08Pronunciation} from './lesson08-data';
import {lesson09All,lesson09Pronunciation} from './lesson09-data';
import {lesson10Terms,lesson10Sentences,lesson10Pronunciation} from './lesson10-data';
import {lesson11Terms,lesson11Sentences,lesson11Pronunciation} from './lesson11-data';
import {lesson12All,lesson12Pronunciation} from './lesson12-data';
import {referenceLessons} from './reference-lessons-data';
import {items,lessons as libraryLessons} from './content';
import {localizeItem,translate,type Locale} from './translate';
import morning from '../data/shuoshuo-morning.json';
import myDay from '../data/my-day-01-v2.json';
import {shuoshuoSentenceAudio} from './shuoshuo-audio';
import {speakingClip} from './my-day-speaking-model';
import {canonicalDictionaryText} from './simplified-chinese';
import type {Pronunciation} from './atlas-spatial-model';

/** Canonical lesson locations stay separate even when two lessons reuse a sentence. */
export type StudyOccurrence={id:string;sourceId:string;lessonId:string;lessonLabel:string;kind:'word'|'sentence';text:string;pinyin:string;meaning:string;note?:string;audio?:Pronunciation};
type Row={id:string;hanzi:string;pinyin:string;meaning:Record<Locale,string>;origin?:string};
const corpora=new Map<Locale,readonly StudyOccurrence[]>();
const labels={en:'Lesson',fr:'Leçon',ru:'Урок',tr:'Ders'};
export function studyOccurrenceCorpus(locale:Locale):readonly StudyOccurrence[]{
 const cached=corpora.get(locale);if(cached)return cached;
 const rows:StudyOccurrence[]=[];
 function add(lessonId:string,lessonLabel:string,sourceId:string,kind:StudyOccurrence['kind'],text:string,pinyin:string,meaning:string,audio?:Pronunciation,note?:string){
  if(!text||!pinyin||!meaning)return;
  rows.push({id:lessonId+':'+kind+':'+sourceId,sourceId,lessonId,lessonLabel,kind,text,pinyin,meaning,...(note?{note}:{}),...(audio&&audio.text===text?{audio:{...audio,kind,context:false}}:{})});
 }
 function course<T extends Row>(number:number,values:readonly T[],audio:(v:T)=>Pronunciation|undefined){
  for(const v of values)add('intensive-'+String(number).padStart(2,'0'),labels[locale]+' '+number,v.id,/[。！？!?，,；;]/u.test(v.hanzi)?'sentence':'word',v.hanzi,v.pinyin,v.meaning[locale],audio(v),v.origin==='board-opinion'?{en:'Classroom comparison: a speaker’s opinion, not a factual ranking.',fr:'Comparaison en classe : opinion du locuteur, pas un classement factuel.',ru:'Сравнение в классе: мнение говорящего, а не объективный рейтинг.',tr:'Sınıf karşılaştırması: konuşanın görüşü, nesnel bir sıralama değil.'}[locale]:undefined);
 }
 const clip=(v:Row,path:string):Pronunciation=>({text:v.hanzi,pinyin:v.pinyin,source:path,context:false});
 course(3,terms,v=>{const item=termItem(v,locale);return clip(v,(item.id.startsWith('course03-')?'/course03/audio/':'/audio/')+item.id+'-word.mp3');});
 course(3,sentences,v=>clip(v,'/course03/audio/course03-'+v.id+'-word.mp3'));
 course(4,lesson04All,v=>clip(v,'/course04/audio/course04-'+v.id+'-word.mp3'));
 course(5,lesson05All,v=>clip(v,'/course05/audio/course05-'+v.id+'-word.mp3'));
 course(6,lesson06All,v=>clip(v,lesson06Audio(v)));
 course(7,lesson07All,lesson07Pronunciation);
 course(8,lesson08All,lesson08Pronunciation);
 course(9,lesson09All,lesson09Pronunciation);
 course(10,[...lesson10Terms,...lesson10Sentences],lesson10Pronunciation);
 course(11,[...lesson11Terms,...lesson11Sentences],lesson11Pronunciation);
 course(12,lesson12All,lesson12Pronunciation);
 for(const lesson of referenceLessons)for(const v of [...lesson.terms,...lesson.examples])add('reference-'+lesson.id,lesson.title,v.id,lesson.examples.includes(v)?'sentence':'word',v.hanzi,v.pinyin,v.en);
 for(const v of morning.sentences){const audio=shuoshuoSentenceAudio(v.id,v.hanzi);add('shuoshuo-morning','Shuoshuo · Morning','shuoshuo:'+v.id,'sentence',v.hanzi,v.pinyin,v.english,audio?{...audio,text:v.hanzi,pinyin:v.pinyin,context:false}:undefined,v.uncertain?{en:'Original source wording marked uncertain.',fr:'Formulation de la source signalée comme incertaine.',ru:'Исходная формулировка отмечена как неточная.',tr:'Kaynak ifadesi belirsiz olarak işaretlenmiş.'}[locale]:undefined);}
 let dayIndex=0;myDay.sections.forEach(section=>section.rows.forEach(v=>{const clip=speakingClip(v.hanzi);add('my-day-01-v2','My day · '+section.title,'my-day-01-v2:'+String(++dayIndex),'sentence',v.hanzi,v.pinyin,v.english,clip?{text:clip.text,source:clip.source,pinyin:v.pinyin,context:false}:undefined);}));
 for(const raw of items){const v=localizeItem(raw,locale),label=(raw.hskLevel?'HSK '+raw.hskLevel+' · ':'')+translate(libraryLessons.find(lesson=>lesson.id===v.lesson)?.title??v.lesson,locale);
  add('library:'+raw.lesson,label,raw.id,'word',v.hanzi,v.pinyin,v.english,{text:v.hanzi,pinyin:v.pinyin,source:'/audio/'+raw.id+'-word.mp3',context:false});
  add('library:'+raw.lesson,label,raw.id,'sentence',v.sentence,v.sentencePinyin,v.translation,{text:v.sentence,pinyin:v.sentencePinyin,source:'/audio/'+raw.id+'-sentence.mp3',context:false});
 }
 const unique=[...new Map(rows.map(row=>[row.id,row])).values()];corpora.set(locale,unique);return unique;
}

export function studyOccurrences(text:string,locale:Locale):StudyOccurrence[]{
 const target=canonicalDictionaryText(text);if(!target)return [];
 return studyOccurrenceCorpus(locale).filter(row=>row.text.includes(target));
}
export function occurrencePage<T>(rows:readonly T[],page:number,size=6){const pages=Math.max(1,Math.ceil(rows.length/size)),safe=Number.isFinite(page)?Math.max(0,Math.min(pages-1,Math.floor(page))):0;return {page:safe,pages,rows:rows.slice(safe*size,(safe+1)*size)};}
