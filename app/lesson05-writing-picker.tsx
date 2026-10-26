'use client';
import {useState} from 'react';
import {ArrowLeft,ArrowRight,Search} from 'lucide-react';
import {useI18n} from './i18n';
import {lesson05All,lesson05Topics} from './lesson05-data';
const labels={en:['Find a word or sentence','All topics','Previous','Next'],fr:['Chercher un mot ou une phrase','Tous les thèmes','Précédent','Suivant'],ru:['Найти слово или предложение','Все темы','Назад','Далее'],tr:['Kelime veya cümle ara','Tüm konular','Önceki','Sonraki']};
export default function Lesson05WritingPicker({value,onChange}:{value:string;onChange:(id:string)=>void}){
 const {locale}=useI18n();const [query,setQuery]=useState(''),[topic,setTopic]=useState('all');const copy=labels[locale];
 const rows=lesson05All.filter(v=>(topic==='all'||v.topic===topic)&&(!query||[v.hanzi,v.pinyin,v.meaning.en,v.meaning[locale]].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase()))),index=rows.findIndex(v=>v.id===value);
 return <section className="lesson05-picker"><div className="course-actions"><label><Search size={16}/><input type="search" value={query} placeholder={copy[0]} aria-label={copy[0]} onChange={e=>setQuery(e.target.value)}/></label><select aria-label={copy[1]} value={topic} onChange={e=>setTopic(e.target.value)}><option value="all">{copy[1]}</option>{lesson05Topics.map(t=><option key={t.id} value={t.id}>{t.title[locale]}</option>)}</select><button className="secondary" disabled={index<=0} onClick={()=>onChange(rows[index-1].id)}><ArrowLeft size={16}/>{copy[2]}</button><span>{rows.length?Math.max(0,index+1):0} / {rows.length}</span><button className="secondary" disabled={!rows.length||index>=rows.length-1} onClick={()=>onChange(rows[index+1].id)}>{copy[3]}<ArrowRight size={16}/></button></div><div className="lesson05-picker-rows">{rows.map(v=><button type="button" aria-pressed={v.id===value} key={v.id} onClick={()=>onChange(v.id)}><strong lang="zh-Hans">{v.hanzi}</strong><span className="pinyin">{v.pinyin}</span><small>{v.meaning[locale]}</small></button>)}</div></section>;
}
