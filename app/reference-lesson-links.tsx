'use client';
import './reference-lessons.css';
import {ArrowRight} from 'lucide-react';
import {referenceLessonHref,referenceLessons} from './reference-lessons-data';
import type {ReferenceMaterialId} from './reference-lesson-types';
export default function ReferenceLessonLinks({onOpen}:{onOpen?:(id:ReferenceMaterialId)=>void}){
 return <section className="panel ref-catalog"><p className="eyebrow">VISUAL REFERENCES</p><h2>Time, movement &amp; the 上 family</h2><p>Three reference lessons with interactive explanations, source examples, writing and recall. Separate from the numbered classroom calendar.</p><div className="ref-catalog-links">{referenceLessons.map(lesson=><a key={lesson.id} className="secondary" href={referenceLessonHref(lesson.id)} onClick={event=>{if(onOpen&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();onOpen(lesson.id);}}}><span><strong>{lesson.title}</strong><small>{lesson.topics.length} topics · {lesson.source.pages}-page visual reference</small></span><ArrowRight size={18}/></a>)}</div></section>;
}
