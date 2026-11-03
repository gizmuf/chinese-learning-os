'use client';
import {referenceLessonHref} from './reference-lessons-data';
import {allReferenceReviewSummaries} from './reference-lesson-review';
import type {CourseEvent} from './course-learning';
export default function ReferenceTodayLinks({events,now}:{events:CourseEvent[];now:number}){
 return <div className="ref-today-links"><h3>Visual reference reviews</h3>{allReferenceReviewSummaries(events,now).map(row=><article key={row.lesson.id}><a href={referenceLessonHref(row.lesson.id)}>{row.lesson.title}</a><span>{row.due.length} due · {row.difficult.length} to try again</span><div className="course-actions">{row.due.length>0&&<a className="text-button" href={referenceLessonHref(row.lesson.id,'practice','due')}>Review due checks →</a>}{row.difficult.length>0&&<a className="text-button" href={referenceLessonHref(row.lesson.id,'practice','difficult')}>Practise difficult checks →</a>}</div></article>)}<p className="ref-note">Only independent checked answers schedule these reviews. Reading, animation and guided writing are supported practice.</p></div>;
}
