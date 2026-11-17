import type { HskExamForm } from './hsk3-form';
import { hasMockInk, type Attempt, type MockTask } from './hsk3-mock-model';
import { hskMistakeDrills } from './hsk3-practice-data';

export const hskMistakeReviewHref='/?course=hsk3&review=mistakes';
const clozeKeys=['go-home','result','negative','cause','close','simultaneous','comparative','transport','imminent','past-focus'];

export type MistakeSeed = {id:string; source:string};
export type MistakeCard = {id:string; dueAt:number; streak:number; turns:number; revision:number};
export type MistakeQueue = {cards:Record<string,MistakeCard>; sources:Record<string,true>};
export type MistakeSkill = 'recognition' | 'writing';

export function mistakeSeed(form:HskExamForm,attempt:Attempt,task:MockTask):MistakeSeed {
  const index=task.id;
  let id:string;
  if(task.kind==='character') id='write-'+task.answer;
  else if(task.kind==='sentence') id='sentence-'+(task.prompt.match(/「(.+?)」/)?.[1]??'');
  else if(index<10) id='listen-picture';
  else if(index<20) id='listen-detail';
  else if(index<30) id='listen-passage';
  else if(index<40) id='reply';
  else if(index<50) id=clozeKeys[index-40];
  else id='passage';
  return {id,source:form+':'+attempt.deadline+':'+index};
}

export function automaticMistakes(form:HskExamForm,attempt:Attempt,tasks:MockTask[]) {
  return tasks.flatMap(task=>{
    const typed=attempt.answers[task.id]?.trim();
    if(!typed||task.kind==='sentence'||typed===task.answer||hasMockInk(attempt.ink[task.id])) return [];
    return [mistakeSeed(form,attempt,task)];
  });
}

export const newMistakeQueue=():MistakeQueue=>({cards:{},sources:{}});
export function addMistakes(queue:MistakeQueue,seeds:MistakeSeed[],now:number):MistakeQueue {
  const cards={...queue.cards},sources={...queue.sources};
  let changed=false;
  // One quiz item schedules its topic once. A later exam can make the topic due again.
  for(const {id,source} of seeds) {
    if(sources[source]||!Object.hasOwn(hskMistakeDrills,id)) continue;
    const old=cards[id];
    sources[source]=true;
    cards[id]={id,dueAt:Math.min(old?.dueAt??now,now),streak:0,turns:old?.turns??0,revision:(old?.revision??0)+1};
    changed=true;
  }
  return changed?{cards,sources}:queue;
}

export function completeMistake(queue:MistakeQueue,card:MistakeCard,correct:boolean,now:number):MistakeQueue {
  if(queue.cards[card.id]?.revision!==card.revision) return queue;
  const streak=correct?card.streak+1:0;
  const days=streak>=3?7:streak===2?3:1;
  const nextDate=new Date(now);
  nextDate.setDate(nextDate.getDate()+days);
  nextDate.setHours(0,0,0,0);
  return {...queue,cards:{...queue.cards,[card.id]:{...card,dueAt:nextDate.getTime(),streak,turns:card.turns+1,revision:card.revision+1}}};
}

export const mistakeSkill=(id:string):MistakeSkill=>id.startsWith('write-')||id.startsWith('sentence-')?'writing':'recognition';
export const mistakeDrill=(card:MistakeCard)=>hskMistakeDrills[card.id]?.[card.turns%hskMistakeDrills[card.id].length];

export function mistakeSchedule(queue:MistakeQueue,now:number,skill:MistakeSkill|'all'='all') {
  const ordered=Object.values(queue.cards).filter(card=>mistakeDrill(card)&&(skill==='all'||mistakeSkill(card.id)===skill))
    .sort((a,b)=>a.dueAt-b.dueAt||a.turns-b.turns||a.id.localeCompare(b.id));
  return {due:ordered.filter(card=>card.dueAt<=now),next:ordered.find(card=>card.dueAt>now)};
}

export function normalizeDictation(text:string) {
  return text.normalize('NFKC').replace(/[\p{P}\s]/gu,'');
}

export function mistakeOptions(options:string[],card:MistakeCard) {
  const offset=(card.turns+Array.from(card.id).reduce((sum,char)=>sum+char.codePointAt(0)!,0))%options.length;
  return [...options.slice(offset),...options.slice(0,offset)];
}
