import {lesson07Sentences,lesson07Audio} from './lesson07-data';
import type {Locale} from './translate';
import {cloudWords} from './atlas-cloud-model';
import {sentencePronunciation,type DictionaryEntry,type StudyDictionary,type Pronunciation,dictionaryTokens} from './atlas-spatial-model';
import {sentences} from './course-data';
import {lesson04Sentences} from './lesson04-data';
import {lesson05Sentences} from './lesson05-data';
import {lesson06Sentences,lesson06Audio} from './lesson06-data';
import extra from '../data/lesson06/usage-examples.json';
export type StudyExample={id:string;text:string;pinyin:string;meaning:string;audio?:Pronunciation};
const pools=new Map<Locale,StudyExample[]>();
function examples(locale:Locale){
 let pool=pools.get(locale);if(pool)return pool;
 const row=(v:{id:string;hanzi:string;pinyin:string;meaning:Record<Locale,string>},source:string):StudyExample=>({id:v.id,text:v.hanzi,pinyin:v.pinyin,meaning:v.meaning[locale],audio:{text:v.hanzi,pinyin:v.pinyin,source,context:false,kind:'sentence'}});
 pool=[...lesson06Sentences.map(v=>row(v,lesson06Audio(v))),
  ...lesson07Sentences.filter(v=>v.origin!=='board-opinion'&&!v.excludeFromChecks).map(v=>row(v,lesson07Audio(v))),
  ...extra.map(([word,text,pinyin,en,fr,ru,tr])=>({id:'usage:'+word,text,pinyin,meaning:{en,fr,ru,tr}[locale]})),
  ...lesson05Sentences.map(v=>row(v,'/course05/audio/course05-'+v.id+'-word.mp3')),
  ...lesson04Sentences.map(v=>row(v,'/course04/audio/course04-'+v.id+'-word.mp3')),
  ...sentences.map(v=>row(v,'/course03/audio/course03-'+v.id+'-word.mp3')),
  ...cloudWords(locale).flatMap(word=>word.item?[{id:word.item.id,text:word.item.sentence,pinyin:word.item.sentencePinyin,meaning:word.item.translation,audio:sentencePronunciation(word)}]:[])];
 pools.set(locale,pool);return pool;
}
/** Real authored sentences only: never use the isolated expression as its own example. */
export function studyExamples(text:string,locale:Locale,limit=2,priority=''):StudyExample[]{
 if(!text||limit<1)return [];
 const normalized=(value:string)=>value.replace(/[\s\p{P}]/gu,'');
 const seen=new Set<string>(),result:StudyExample[]=[];
 for(const value of [...examples(locale)].sort((a,b)=>priority?Number(b.id.startsWith(priority))-Number(a.id.startsWith(priority)):0)){
  if(!value.text.includes(text)||normalized(value.text)===normalized(text)||!/[。！？!?]/u.test(value.text)||seen.has(value.text))continue;
  seen.add(value.text);result.push(value);if(result.length>=limit)break;
 }
 return result;
}
export function dictionaryBreakdown(entry:DictionaryEntry,dictionary:StudyDictionary,locale:Locale='en'){
 const sentence=/[。！？!?，,；;]/u.test(entry.text),phrase=entry.phrase===true;
 const tokens=sentence||phrase?dictionaryTokens(entry.text,new Map([...dictionary].filter(([text])=>text!==entry.text))):Array.from(entry.text).map(text=>({text,chinese:/\p{Script=Han}/u.test(text)}));
 return {sentence,phrase,parts:tokens.filter(t=>t.chinese).map(t=>{
  let detail=dictionary.get(t.text);
  const ending=new Set(['一点儿','有点儿','哪儿','这儿','那儿','玩儿']);
  if(!sentence&&!phrase&&ending.has(entry.text)&&detail){
   if(t.text==='儿')detail={...detail,pinyin:'r',meaning:{en:'r-ending here; no separate meaning',fr:'terminaison en r ici ; pas de sens séparé',ru:'Здесь окончание -r, без отдельного значения',tr:'Burada r eki; ayrı bir anlamı yok'}[locale]};
   if(t.text==='点')detail={...detail,meaning:{en:'a small amount or degree here',fr:'une petite quantité ou un faible degré ici',ru:'Здесь небольшое количество или степень',tr:'Burada az miktar veya düşük derece'}[locale]};
  }
  if(detail){
   const roles:Record<string,Record<Locale,string>>={
    '一把钥匙|把':{en:'classifier for keys and handled objects here',fr:'classificateur des clés et objets à manche ici',ru:'Здесь счётное слово для ключей и предметов с ручкой',tr:'Burada anahtar ve saplı nesneler için sayma sözcüğü'},
    '一本书|本':{en:'classifier for books here',fr:'classificateur des livres ici',ru:'Здесь счётное слово для книг',tr:'Burada kitaplar için sayma sözcüğü'},
    '两辆汽车|辆':{en:'classifier for vehicles here',fr:'classificateur des véhicules ici',ru:'Здесь счётное слово для транспорта',tr:'Burada taşıtlar için sayma sözcüğü'},
    '钥匙|匙':{en:'part of 钥匙 (key); not “spoon” here',fr:'dans 钥匙 (clé) ; pas « cuillère » ici',ru:'Часть слова 钥匙 (ключ); здесь не «ложка»',tr:'钥匙 (anahtar) sözcüğünün parçası; burada “kaşık” değil'},
   };
   const role=roles[entry.text+'|'+t.text];if(role)detail={...detail,pinyin:entry.text==='钥匙'&&t.text==='匙'?'shi':detail.pinyin,meaning:role[locale]};
  }
  return {text:t.text,entry:detail};
 })};
}
