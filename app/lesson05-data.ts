import {withTurkish} from "./turkish";
import rawSource from '../data/lesson05/content.json';
import {L,type Copy} from './course-data';
import type {Locale} from './translate';
import type {Item} from './content';
const source=withTurkish(rawSource);
export const lesson05={id:'intensive-05' as const,number:5,date:source.date,title:source.title as Copy};
export type Lesson05Entry={id:string;topic:string;hanzi:string;pinyin:string;meaning:Copy;source:string;photos:number[]};
export const lesson05Topics=source.topics;
export const lesson05Terms:Lesson05Entry[]=source.terms;
export const lesson05Sentences:Lesson05Entry[]=source.sentences;
export const lesson05All=[...lesson05Terms,...lesson05Sentences];
export function lesson05Item(v:Lesson05Entry,locale:Locale):Item{return {id:'course05-'+v.id,lesson:lesson05.id,hanzi:v.hanzi,pinyin:v.pinyin,english:v.meaning[locale],sentence:v.hanzi,sentencePinyin:v.pinyin,translation:v.meaning[locale]};}
const blocks=[
 ['我','叫','小花'],['认识你','我','也','很高兴'],['请','介绍一下','你自己'],['我','自己','做'],
 ['这个包子','又','便宜','又','好吃'],['这个包子','又','贵','又','不好吃'],['在这里','学习中文','既','简单','又','有趣'],
 ['这个苹果','看起来','很','好吃'],['这首歌','听起来','很','好听'],['臭豆腐','闻起来','很','臭'],['这个包子','尝起来','很','好吃'],
 ['咖啡','让','我','兴奋'],['我','准备','好','了'],['十五分钟后','我','准备好了'],['八点后','我','在家'],['所以','今天','我们','会','谈谈','这个话题'],
];
const sentenceIds=[1,4,5,6,9,8,10,12,13,14,15,17,20,22,23,33];
export const lesson05Builders=blocks.map((b,i)=>({id:'c05-build-'+(i+1),blocks:b,sentence:b.join('')}));
export const lesson05BuilderCopy=sentenceIds.map(n=>lesson05Sentences[n-1]);
// Same-topic distractors test a distinction rather than a translation's screen position.
export const lesson05Checks=lesson05Topics.flatMap((topic,g)=>{
 const terms=lesson05Terms.filter(v=>v.topic===topic.id),sentences=lesson05Sentences.filter(v=>v.topic===topic.id);
 return [...terms,...sentences].flatMap((v,i)=>{
  const pool=v.id.includes('-t')?terms:sentences;
  const alternatives=[v,...pool.filter(w=>w.id!==v.id).slice(0,3)];
  const shift=(i+g+1)%alternatives.length,optionIds=[...alternatives.slice(shift),...alternatives.slice(0,shift)].map(w=>w.id);
  return (['read','listen'] as const).map(mode=>({id:`c05-check-${v.id}-${mode}`,targetId:v.id,optionIds,mode}));
 });
});
export const lesson05ActivityIds=[...lesson05Builders.map(v=>v.id),...lesson05Checks.map(v=>v.id),...lesson05All.map(v=>'write:'+v.id),...lesson05Topics.map(v=>'study:c05-'+v.id)];
export const lesson05Connections=[
 {topic:'meet',before:L('Lesson 4: 你叫什么名字？','Leçon 4 : 你叫什么名字？','Урок 4: 你叫什么名字？'),after:L('Now answer and introduce yourself: 我叫… → 请介绍一下你自己。','Répondez puis présentez-vous : 我叫… → 请介绍一下你自己。','Теперь ответьте и представьтесь: 我叫… → 请介绍一下你自己。')},
 {topic:'both',before:L('Lesson 4: 我喜欢吃牛肉。','Leçon 4 : 我喜欢吃牛肉。','Урок 4: 我喜欢吃牛肉。'),after:L('Describe the food using two qualities: 又便宜又好吃。','Décrivez l’aliment avec deux qualités : 又便宜又好吃。','Опишите еду двумя качествами: 又便宜又好吃。')},
 {topic:'senses',before:L('Known word: 好吃 hǎochī — tasty','Mot connu : 好吃 hǎochī — bon','Знакомое слово: 好吃 hǎochī — вкусный'),after:L('A visual impression: 看起来很好吃。 A taste impression: 尝起来很好吃。','Impression visuelle : 看起来很好吃。 Impression gustative : 尝起来很好吃。','На вид: 看起来很好吃。 На вкус: 尝起来很好吃。')},
 {topic:'ready',before:L('Lesson 3: 了 marks a change or a completed event in context.','Leçon 3 : 了 marque un changement ou un événement accompli selon le contexte.','Урок 3: 了 обозначает изменение или завершённое событие в контексте.') ,after:L('Here the result is readiness: 准备 → 准备好 → 准备好了。','Ici, le résultat est d’être prêt : 准备 → 准备好 → 准备好了。','Здесь результат — готовность: 准备 → 准备好 → 准备好了。')},
 {topic:'time',before:L('Lesson 3: 昨天 → 今天 → 明天 → 后天','Leçon 3 : 昨天 → 今天 → 明天 → 后天','Урок 3: 昨天 → 今天 → 明天 → 后天'),after:L('Reuse 后 after an event or duration: 饭后 · 十五分钟后。','Réutilisez 后 après un événement ou une durée : 饭后 · 十五分钟后。','Используйте 后 после события или длительности: 饭后 · 十五分钟后。')},
 {topic:'classroom',before:L('Lesson 4: 我在教室学习。','Leçon 4 : 我在教室学习。','Урок 4: 我在教室学习。'),after:L('A new setting, same useful order: 在新的课堂上，人们会问这个问题。','Nouveau contexte, même ordre utile : 在新的课堂上，人们会问这个问题。','Новая ситуация, знакомый порядок: 在新的课堂上，人们会问这个问题。')},
];
export const lesson05Paths=[
 {topic:'meet',target:'c05-s05',parts:[['请',L('polite request','demande polie','вежливая просьба')],['介绍一下',L('brief action','action brève','краткое действие')],['你自己',L('who is introduced','qui est présenté','кого представляют')]]},
 {topic:'both',target:'c05-s08',parts:[['这个包子',L('subject','sujet','подлежащее')],['又贵',L('first quality','première qualité','первое качество')],['又不好吃',L('second quality, negated','seconde qualité, négative','второе качество с отрицанием')]]},
 {topic:'senses',target:'c05-s12',parts:[['这个苹果',L('subject','sujet','подлежащее')],['看起来',L('visual impression','impression visuelle','зрительное впечатление')],['很好吃',L('description','description','описание')]]},
 {topic:'ready',target:'c05-s20',parts:[['我',L('subject','sujet','подлежащее')],['准备',L('action','action','действие')],['好',L('achieved result','résultat obtenu','достигнутый результат')],['了',L('new situation','nouvelle situation','новая ситуация')]]},
 {topic:'time',target:'c05-s22',parts:[['十五分钟后',L('time setting','repère temporel','время')],['我',L('subject','sujet','подлежащее')],['准备好了',L('ready now','prêt à présent','уже готов')]]},
 {topic:'classroom',target:'c05-s33',parts:[['所以',L('connection: so','lien : donc','связь: поэтому')],['今天',L('time','moment','время')],['我们',L('subject','sujet','подлежащее')],['会谈谈',L('will talk a little','allons parler un peu','немного поговорим')],['这个话题',L('topic / object','sujet abordé / objet','тема / дополнение')]]},
];
