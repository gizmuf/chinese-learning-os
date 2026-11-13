import {courseCards,type CourseEvent} from './course-learning';
import {referenceLessonEventIds,referenceLessons} from './reference-lessons-data';
import type {ReferenceLesson} from './reference-lesson-types';
export function referenceReviewSummary(events:CourseEvent[],lesson:ReferenceLesson,now=Date.now()){
 const allowed=new Set(lesson.checks.map(check=>check.id)),seen=new Set<string>();
 const independent=[...events].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id)).filter(event=>{
  if(event.lessonId!==referenceLessonEventIds[lesson.id]||event.kind!=='answer'||event.assisted||!allowed.has(event.activityId)||seen.has(event.id))return false;
  seen.add(event.id);return true;
 });
 const cards=courseCards(independent),latest=new Map<string,CourseEvent>();for(const event of independent)latest.set(event.activityId,event);
 const ordered=Object.keys(cards).sort((a,b)=>new Date(cards[a].due).getTime()-new Date(cards[b].due).getTime()||a.localeCompare(b));
 return {due:ordered.filter(id=>new Date(cards[id].due).getTime()<=now),difficult:[...latest.values()].filter(event=>!event.correct).map(event=>event.activityId),attempted:latest.size,nextDue:ordered.map(id=>new Date(cards[id].due).getTime()).find(at=>at>now)??null};
}
export const allReferenceReviewSummaries=(events:CourseEvent[],now=Date.now())=>referenceLessons.map(lesson=>({lesson,...referenceReviewSummary(events,lesson,now)}));
