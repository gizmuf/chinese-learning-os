import {taskByActivity} from './chunk-library-data';
import {knownHskInScope} from './global-hsk-model';
import type {BrowseScope} from './hsk-scope';
import {chunkActivityIds,chunkMaterialId} from './speaking-chunks-data';
import {courseCards,type CourseEvent} from './course-learning';
export function chunkActivityInHskScope(id:string,scope:BrowseScope) {
 const task=taskByActivity(id);
 return task?.level===0 || knownHskInScope(task?.level,scope);
}
export function chunkReviewSummary(events:CourseEvent[],now=Date.now(),scope:BrowseScope='all'){
 const valid=events.filter(e=>e.lessonId===chunkMaterialId&&e.kind==='answer'&&!e.assisted&&chunkActivityIds.includes(e.activityId)&&chunkActivityInHskScope(e.activityId,scope));
 const latest=new Map<string,CourseEvent>();
 for(const e of [...valid].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id)))latest.set(e.activityId,e);
 const cards=courseCards(valid),due=Object.entries(cards).filter(([,v])=>new Date(v.due).getTime()<=now).sort((a,b)=>new Date(a[1].due).getTime()-new Date(b[1].due).getTime()||a[0].localeCompare(b[0])).map(([id])=>id);
 const future=Object.values(cards).map(v=>new Date(v.due).getTime()).filter(t=>t>now);
 return {due,difficult:[...latest.values()].filter(e=>!e.correct).map(e=>e.activityId),known:[...latest.values()].filter(e=>e.correct).length,nextDue:future.length?Math.min(...future):null};
}
