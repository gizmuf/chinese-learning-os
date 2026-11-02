import {makeQueue,type LearningEvent} from './learning';
import type {Item,StudyLevel,Skill} from './content';
export function buildReviewQueue(events:LearningEvent[],skill:Skill,pool:Item[],minutes:number,scope:'scheduled'|'extra'|'all'='scheduled') {
 if(scope==='all')return [...pool];
 const count=Math.max(1,Math.floor((minutes*60)/(skill==='writing'?90:25)));
 return (scope==='extra'?pool:makeQueue(events,skill,pool)).slice(0,count);
}
export function allReviewLevel(search:string):StudyLevel|null {
 const p=new URLSearchParams(search);if(p.get('practice')!=='all')return null;
 return ({'1':'hsk1','2':'hsk2','3':'hsk3'} as const)[p.get('hsk') as '1'|'2'|'3']??null;
}
export function allReviewHref(level:StudyLevel){return level==='bonus'?null:'?practice=all&hsk='+({hsk1:1,hsk2:2,hsk3:3}[level]);}
