'use client';
import {withTurkish} from "./turkish";
import {useEffect,useRef,useState} from 'react';
import {useI18n} from './i18n';
import batchA from '../data/grammar-hsk3-a.json';
import batchB from '../data/grammar-hsk3-b.json';
import {readDraft,saveDraft} from './local-store';
import './hsk3-grammar.css';
type Copy=Record<'en'|'fr'|'ru'|'tr',string>;
type Exercise={id:string;prompt:Copy;sentence:string;options:string[];answer:number;explanation:Copy};
type Card={id:string;pattern:string;explanation:Copy;example:{hanzi:string;pinyin:string;meaning:Copy};exercises:Exercise[]};
type Unit={id:string;title:Copy;cards:Card[]};
export const grammarUnits:Unit[]=withTurkish([...batchA,...batchB]);
const copy={title:withTurkish({en:'HSK3 grammar',fr:'Grammaire HSK3',ru:'Грамматика HSK3'}),intro:withTurkish({en:'Small patterns. Useful sentences. Learn one idea, then try it.',fr:'Des structures simples, des phrases utiles. Apprenez une idée, puis pratiquez.',ru:'Простые конструкции и полезные фразы. Изучите правило и попробуйте его применить.'}),back:withTurkish({en:'All topics',fr:'Tous les thèmes',ru:'Все темы'}),check:withTurkish({en:'Check answer',fr:'Vérifier',ru:'Проверить'}),retry:withTurkish({en:'Try again',fr:'Réessayer',ru:'Попробовать снова'}),next:withTurkish({en:'Next',fr:'Suivant',ru:'Далее'}),prev:withTurkish({en:'Previous',fr:'Précédent',ru:'Назад'}),yes:withTurkish({en:'Correct',fr:'Correct',ru:'Правильно'}),no:withTurkish({en:'Not quite — compare the explanation.',fr:'Pas tout à fait — comparez avec l’explication.',ru:'Не совсем — сравните с объяснением.'}),practice:withTurkish({en:'Guided practice · saved on this device in your notebook. This does not award independent recall credit.',fr:'Pratique guidée · enregistrée dans votre carnet sur cet appareil. Aucun crédit de rappel autonome.',ru:'Практика с подсказками · сохраняется в вашей тетради на этом устройстве. Самостоятельное воспроизведение не засчитывается.'}),count:withTurkish({en:'exercises checked',fr:'exercices vérifiés',ru:'упражнений проверено'})};
type Answers=Record<string,{picked:number;checked:boolean}>;
export default function HSK3Grammar({db}:{db:IDBDatabase|null}){
 const {locale}=useI18n();const t=(key:keyof typeof copy)=>copy[key][locale];
 const [unitId,setUnit]=useState<string|null>(null),[index,setIndex]=useState(0),[answers,setAnswers]=useState<Answers>({}),[ready,setReady]=useState(false);
 const loadedDb=useRef<IDBDatabase|null>(null);const swipeUntil=useRef(0);
 const start=useRef<{x:number;y:number}|null>(null);
 useEffect(()=>{let current=true;loadedDb.current=null;setReady(false);setAnswers({});if(db)void readDraft(db,'grammar-hsk3-v1').then(value=>{if(current){if(value&&typeof value==='object'){const safe:Answers={};for(const unit of grammarUnits)for(const card of unit.cards)for(const ex of card.exercises){const r=(value as Answers)[ex.id];if(r&&Number.isInteger(r.picked)&&r.picked>=0&&r.picked<ex.options.length&&typeof r.checked==='boolean')safe[ex.id]=r;}setAnswers(safe);}loadedDb.current=db;setReady(true);}}).catch(()=>{if(current){loadedDb.current=db;setReady(true);}});return()=>{current=false;};},[db]);
 useEffect(()=>{if(db&&ready&&loadedDb.current===db)void saveDraft(db,'grammar-hsk3-v1',answers).catch(()=>{});},[db,ready,answers]);
 const unit=grammarUnits.find(u=>u.id===unitId);const questions=unit?.cards.flatMap(card=>card.exercises.map(ex=>({card,ex})))??[];const current=questions[index];
 const move=(delta:number)=>setIndex(i=>Math.max(0,Math.min(questions.length-1,i+delta)));
 const total=grammarUnits.flatMap(u=>u.cards.flatMap(c=>c.exercises)).length;
 const done=Object.values(answers).filter(a=>a.checked).length;
 return <section className="hsk-grammar"><div className="page-heading"><div><p className="eyebrow">HSK3</p><h1>{t('title')}<span className="orange">.</span></h1><p>{t('intro')}</p></div></div><p className="grammar-note">{done} / {total} {t('count')} · {t('practice')}</p>
 {!unit?<div className="grammar-topics">{grammarUnits.map((u,i)=><button className="grammar-topic" key={u.id} onClick={()=>{setUnit(u.id);setIndex(0);}}><small>{String(i+1).padStart(2,'0')}</small><h2>{u.title[locale]}</h2><p>{u.cards.map(c=>c.pattern).join(' · ')}</p><span>→</span></button>)}</div>:current&&<><button className="grammar-back" onClick={()=>setUnit(null)}>← {t('back')}</button><h2>{unit.title[locale]}</h2><div className="grammar-navigation"><button onClick={()=>move(-1)} disabled={index===0}>← {t('prev')}</button><span>{index+1} / {questions.length}</span><button onClick={()=>move(1)} disabled={index===questions.length-1}>{t('next')} →</button></div><article className="grammar-card" onTouchStart={e=>{if(e.touches.length===1)start.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}} onTouchEnd={e=>{const s=start.current;start.current=null;if(!s||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-s.x,dy=e.changedTouches[0].clientY-s.y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5){swipeUntil.current=Date.now()+350;move(dx<0?1:-1);}}}>
 <h3 className="grammar-pattern">{current.card.pattern}</h3><p>{current.card.explanation[locale]}</p><div className="grammar-example"><strong lang="zh-Hans">{current.card.example.hanzi}</strong><span>{current.card.example.pinyin}</span><p>{current.card.example.meaning[locale]}</p></div><hr/><p>{current.ex.prompt[locale]}</p><h3 className="grammar-question" lang="zh-Hans">{current.ex.sentence}</h3><div className="grammar-options">{current.ex.options.map((option,i)=><button key={i} aria-pressed={answers[current.ex.id]?.picked===i} disabled={answers[current.ex.id]?.checked} onClick={()=>{if(Date.now()<swipeUntil.current)return;setAnswers(a=>({...a,[current.ex.id]:{picked:i,checked:false}}));}}>{option}</button>)}</div>
 {!answers[current.ex.id]?.checked?<button className="primary" disabled={answers[current.ex.id]===undefined} onClick={()=>setAnswers(a=>({...a,[current.ex.id]:{...a[current.ex.id],checked:true}}))}>{t('check')}</button>:<div role="status"><strong>{answers[current.ex.id].picked===current.ex.answer?t('yes'):t('no')}</strong><p lang="zh-Hans" className="grammar-question">{current.ex.sentence.replace('___',current.ex.options[current.ex.answer])}</p><p>{current.ex.explanation[locale]}</p>{answers[current.ex.id].picked!==current.ex.answer&&<button onClick={()=>setAnswers(a=>{const next={...a};delete next[current.ex.id];return next;})}>{t('retry')}</button>}</div>}
 </article></>}
 </section>;
}
