'use client';
import './reference-lessons.css';
import {ArrowRight,Clock,MoveUpRight,Layers} from 'lucide-react';
import {referenceLessonHref,referenceLessons} from './reference-lessons-data';
import {useI18n} from './i18n';
import type {ReferenceMaterialId} from './reference-lesson-types';
const previews=[{hanzi:'几点？',pinyin:'jǐ diǎn?',meaning:'Time & dates',Icon:Clock},{hanzi:'上来 · 上去',pinyin:'shànglái · shàngqù',meaning:'Movement & direction',Icon:MoveUpRight},{hanzi:'上',pinyin:'shàng',meaning:'One character, many connections',Icon:Layers}];
export default function ReferenceLessonLinks({onOpen,compact=false}:{compact?:boolean;onOpen?:(id:ReferenceMaterialId)=>void}){
 const {locale}=useI18n();
 if(compact)return <>{referenceLessons.map((lesson,index)=>{const Icon=previews[index].Icon;const labels={en:['Time & dates','Movement','The 上 family'],fr:['Heures et dates','Mouvement','La famille 上'],ru:['Время и даты','Движение','Семейство 上'],tr:['Saat ve tarihler','Hareket','上 ailesi']}[locale];return <a key={lesson.id} href={referenceLessonHref(lesson.id)} onClick={event=>{if(onOpen&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();onOpen(lesson.id);}}}><Icon size={15}/>{labels[index]}</a>;})}</>;
 return <section className="panel ref-catalog"><p className="eyebrow">VISUAL REFERENCES</p><h2>Time, movement &amp; the 上 family</h2><p>Explore a connection, see it in context, then practise recalling it.</p><div className="ref-catalog-links">{referenceLessons.map((lesson,index)=><a key={lesson.id} className="secondary" href={referenceLessonHref(lesson.id)} onClick={event=>{if(onOpen&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();onOpen(lesson.id);}}}><span><span className="ref-catalog-icon">{(()=>{const Icon=previews[index].Icon;return <Icon size={20}/>;})()}</span><strong lang="zh-Hans">{previews[index].hanzi}</strong><small className="pinyin">{previews[index].pinyin}</small><span>{previews[index].meaning}</span></span><ArrowRight size={18}/></a>)}</div></section>;
}
