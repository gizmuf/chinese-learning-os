import {course} from './course-data';
import {exercises} from './course-exercises';
import {lesson04,lesson04Checks} from './lesson04-data';
import {lesson05,lesson05Checks} from './lesson05-data';
import {lesson06,lesson06Checks} from './lesson06-data';
import {courseCards,type CourseEvent} from './course-learning';
export const reviewableCourseLessons=[
 {id:'intensive-03',number:3,title:course.lessonTitle,activities:exercises.map(q=>q.id)},
 {id:'intensive-04',number:4,title:lesson04.title,activities:lesson04Checks.map(q=>q.id)},
 {id:'intensive-05',number:5,title:lesson05.title,activities:lesson05Checks.map(q=>q.id)},
 {id:'intensive-06',number:6,title:lesson06.title,activities:lesson06Checks.map(q=>q.id)},
] as const;
export type CourseReviewKind='due'|'difficult';
/** Only independently scored lesson checks are reviewable here. Each caller supplies one student's events. */
export function courseReviewSummary(events:CourseEvent[],now=Date.now()){
 const lessons=reviewableCourseLessons.map(lesson=>{
  const allowed=new Set<string>(lesson.activities),seen=new Set<string>();
  const independent=[...events].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id)).filter(e=>{
   if(e.lessonId!==lesson.id||e.kind!=='answer'||e.assisted||!allowed.has(e.activityId)||seen.has(e.id))return false;
   seen.add(e.id);return true;
  });
  const cards=courseCards(independent),latest=new Map<string,CourseEvent>();
  for(const event of independent)latest.set(event.activityId,event);
  const ordered=Object.entries(cards).sort(([a,ca],[b,cb])=>new Date(ca.due).getTime()-new Date(cb.due).getTime()||a.localeCompare(b));
  return {...lesson,due:ordered.filter(([,card])=>new Date(card.due).getTime()<=now).map(([id])=>id),difficult:[...latest.values()].filter(e=>!e.correct).sort((a,b)=>a.at-b.at||a.activityId.localeCompare(b.activityId)).map(e=>e.activityId),nextDue:ordered.map(([,card])=>new Date(card.due).getTime()).find(at=>at>now)??null,attempted:latest.size};
 });
 return {lessons,due:lessons.reduce((n,l)=>n+l.due.length,0),difficult:lessons.reduce((n,l)=>n+l.difficult.length,0),attempted:lessons.reduce((n,l)=>n+l.attempted,0)};
}
