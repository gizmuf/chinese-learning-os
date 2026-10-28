import source from '../data/lesson07/content.json';
import {C,lesson06Sentences,lesson06Audio} from './lesson06-data';
import {lesson05Sentences} from './lesson05-data';
import type {Copy} from './course-data';
import type {Pronunciation} from './atlas-spatial-model';
export {C};
export type Lesson07Entry={id:string;hanzi:string;pinyin:string;meaning:Copy;family?:string;topic?:string;phrase?:boolean;origin:string;pdfPages:number[];equivalence?:string;excludeFromChecks?:boolean;audioText?:string;audioPinyin?:string};
export const lesson07={id:'intensive-07' as const,number:7,date:source.date,title:C('Comparisons & daily life','Comparaisons et vie quotidienne','Сравнения и повседневная жизнь','Karşılaştırmalar ve günlük yaşam')};
export const lesson07Terms:Lesson07Entry[]=source.words;
export const lesson07Sentences:Lesson07Entry[]=source.sentences;
export const lesson07All=[...lesson07Terms,...lesson07Sentences];
export const lesson07ById=new Map(lesson07All.map(v=>[v.id,v]));
export const lesson07Topics=source.topics;
export const lesson07Audio=(v:Pick<Lesson07Entry,'id'>)=>'/course07/audio/'+v.id+'.mp3';
export const lesson07Pronunciation=(v:Lesson07Entry):Pronunciation=>({text:v.audioText??v.hanzi,pinyin:v.audioPinyin??v.pinyin,source:lesson07Audio(v),context:!!v.audioText,kind:v.topic?'sentence':'word'});
const sentenceIds=source.sourceSentenceIds as Record<string,string>;
export const lesson07Builders=lesson07Topics.map((v,i)=>({id:'c07-build-'+(i+1),blocks:v.blocks,targetId:sentenceIds[v.target]}));
export type Lesson07Question={id:string;topic:string;mode:'read'|'listen';targetId:string;optionIds:string[];prompt?:Copy;sentence?:string;options:Copy[];answer:number;explanation?:Copy;passageId?:string};
export const lesson07Checks:Lesson07Question[]=lesson07All.filter(v=>!v.excludeFromChecks).flatMap((v,i)=>{
 const topic=v.family??v.topic!,pool=lesson07All.filter(w=>!w.excludeFromChecks&&(w.family??w.topic)===topic&&w.id!==v.id&&(!v.equivalence||v.equivalence!==w.equivalence));
 const options=[v];for(const w of pool){if(options.length>=4)break;if(options.every(old=>Object.keys(v.meaning).every(locale=>w.meaning[locale as keyof Copy]!==old.meaning[locale as keyof Copy])))options.push(w);}const shift=(i+1)%options.length,ordered=[...options.slice(shift),...options.slice(0,shift)];
 return (v.audioText?['read'] as const:['read','listen'] as const).map(mode=>({id:'c07-check-'+v.id+'-'+mode,targetId:v.id,topic,mode,optionIds:ordered.map(w=>w.id),options:ordered.map(w=>w.meaning),answer:ordered.findIndex(w=>w.id===v.id)}));
});
export const lesson07Connections=lesson07Topics.map(v=>{
 const before=v.beforeLesson===6?lesson06Sentences.find(s=>s.id===v.beforeId)!:lesson05Sentences.find(s=>s.hanzi==='请介绍一下你自己。')!;
 const after=lesson07ById.get(sentenceIds[v.target])!;
 return {topic:v.id,before:{...before,lesson:v.beforeLesson},after,beforeAudio:v.beforeLesson===6?lesson06Audio(before):'/course05/audio/course05-'+before.id+'-sentence.mp3',note:v.note};
});

export const lesson07ActivityIds=[...lesson07Checks.map(q=>q.id),...lesson07Builders.map(b=>b.id),...lesson07Topics.map(v=>"study:c07-"+v.id)];
export const lesson07Readings=[['prices','phone','buy'],['saturday-guihua','pond','noon'],['study','electrician','buy-cola','order']].map((keys,i)=>({id:'c07-reading-'+(i+1),sentences:keys.map(k=>lesson07ById.get(sentenceIds[k])!)}));
export const lesson07Speaking=[
 {prompt:C('A is 180 cm, B is 175 cm. State the exact difference.','A mesure 180 cm, B 175 cm. Donnez la différence exacte.','Рост A — 180 см, B — 175 см. Назовите точную разницу.','A 180 cm, B 175 cm. Tam farkı söyleyin.'),keys:['five']},
 {prompt:C('Compare the ¥1,800 phone with the ¥10,000 phone. Start with “this phone” and say “much cheaper”.','Comparez les téléphones à 1 800 et 10 000 yuans. Commencez par « ce téléphone » et dites « beaucoup moins cher ».','Сравните телефоны за 1800 и 10000 юаней. Начните с «этот телефон» и скажите «намного дешевле».','1.800 ve 10.000 yuanlık telefonları karşılaştırın. “Bu telefon” ile başlayıp “çok daha ucuz” deyin.'),keys:['cheaper']},
 {prompt:C('Your fictional character goes to Guihua Park every Saturday morning.','Votre personnage fictif va au parc Guihua chaque samedi matin.','Ваш вымышленный персонаж ходит в парк Гуйхуа каждую субботу утром.','Kurgusal karakteriniz her cumartesi sabahı Guihua Parkına gidiyor.'),keys:['saturday-guihua']},
 {prompt:C('Order sugar-free cola with no ice.','Commandez un cola sans sucre et sans glaçons.','Закажите колу без сахара и льда.','Şekersiz ve buzsuz kola sipariş edin.'),keys:['order']},
 {prompt:C('In a fictional role, say you study electrical engineering and your friend is an electrician.','Dans un rôle fictif, dites que vous étudiez le génie électrique et que votre ami est électricien.','В вымышленной роли скажите: вы изучаете электротехнику, ваш друг — электрик.','Kurgusal bir rolde elektrik mühendisliği okuduğunuzu ve arkadaşınızın elektrikçi olduğunu söyleyin.'),keys:['study','electrician']},
 {prompt:C('Say there is a pond in the park. Then say where you eat on campus.','Dites qu’il y a un étang dans le parc, puis où vous mangez sur le campus.','Скажите, что в парке есть пруд, а затем — где вы едите в кампусе.','Parkta gölet olduğunu söyleyin, ardından kampüste nerede yemek yediğinizi belirtin.'),keys:['pond','canteen']}
].map((v,i)=>({...v,id:'c07-speak-'+(i+1),answers:v.keys.map(k=>lesson07ById.get(sentenceIds[k])!)}));
