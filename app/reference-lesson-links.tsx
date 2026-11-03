'use client';
import './reference-lessons.css';
import {ArrowRight,Clock,MoveUpRight,Layers} from 'lucide-react';
import {referenceLessonHref,referenceLessons} from './reference-lessons-data';
import type {ReferenceMaterialId} from './reference-lesson-types';
const previews=[{hanzi:'几点？',pinyin:'jǐ diǎn?',meaning:'Time & dates',Icon:Clock},{hanzi:'上来 · 上去',pinyin:'shànglái · shàngqù',meaning:'Movement & direction',Icon:MoveUpRight},{hanzi:'上',pinyin:'shàng',meaning:'One character, many connections',Icon:Layers}];
export default function ReferenceLessonLinks({onOpen}:{onOpen?:(id:ReferenceMaterialId)=>void}){
 return <section className="panel ref-catalog"><p className="eyebrow">VISUAL REFERENCES</p><h2>Time, movement &amp; the 上 family</h2><p>Explore a connection, see it in context, then practise recalling it.</p><div className="ref-catalog-links">{referenceLessons.map((lesson,index)=><a key={lesson.id} className="secondary" href={referenceLessonHref(lesson.id)} onClick={event=>{if(onOpen&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();onOpen(lesson.id);}}}><span><span className="ref-catalog-icon">{(()=>{const Icon=previews[index].Icon;return <Icon size={20}/>;})()}</span><strong lang="zh-Hans">{previews[index].hanzi}</strong><small className="pinyin">{previews[index].pinyin}</small><span>{previews[index].meaning}</span></span><ArrowRight size={18}/></a>)}</div></section>;
}
