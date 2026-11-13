"use client";
import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { items, lessons, isInLevel, matchesItem, type StudyLevel } from "./content";
import { localizeItem } from "./translate";
import { useI18n } from "./i18n";
export default function PdfExport({level, initialIds=[], onClose}:{level:StudyLevel;initialIds?:string[];onClose:()=>void}){
 const {t,locale}=useI18n();const [lesson,setLesson]=useState('all');const [query,setQuery]=useState('');const [selected,setSelected]=useState(new Set(initialIds));const [busy,setBusy]=useState(false);const [error,setError]=useState('');const dialog=useRef<HTMLDivElement>(null);
 const pool=items.filter(item=>isInLevel(item,level)).map(item=>localizeItem(item,locale));const shown=pool.filter(item=>matchesItem(item,query,lesson));
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.focus();const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previousOverflow;previous?.focus();};},[]);
 async function download(){setBusy(true);setError('');try{const {downloadNotebookPdf}=await import('./notebook-pdf');await downloadNotebookPdf(pool.filter(item=>selected.has(item.id)),level,locale);}catch{setError(t('Could not create the PDF. Please try again.'));}finally{setBusy(false);}}
 return <div className="modal-backdrop" onClick={()=>{if(!busy)onClose();}}><div className="panel pdf-dialog" role="dialog" aria-modal="true" aria-labelledby="pdf-title" ref={dialog} tabIndex={-1} onClick={e=>e.stopPropagation()} onKeyDown={e=>{
  if(e.key==='Escape'&&!busy)onClose();
  if(e.key==='Tab'){const controls=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, [tabindex="0"]')??[]);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
 }}>
 <div className="section-top"><div><span className="eyebrow">{level==='bonus'?t('Everyday extras'):level.toUpperCase()}</span><h2 id="pdf-title">{t('Printable notebook')}</h2></div><button className="icon-button" disabled={busy} aria-label={t('Close PDF export')} onClick={onClose}><X size={20}/></button></div>
 <p>{t('Choose words or a whole lesson. A4 pages include stroke order, trace models and empty practice grids.')}</p>
 <div className="pdf-filters"><select aria-label={t('Choose lesson')} value={lesson} onChange={e=>{setLesson(e.target.value);setSelected(new Set());}}><option value="all">{t('All lessons')}</option>{lessons.filter(l=>pool.some(i=>i.lesson===l.id)).map(l=><option key={l.id} value={l.id}>{t(l.title)}</option>)}</select><input aria-label={t('Find a word, pinyin or meaning…')} placeholder={t('Find a word, pinyin or meaning…')} value={query} onChange={e=>setQuery(e.target.value)}/></div>
 <div className="pdf-selection-tools"><button className="text-button" onClick={()=>setSelected(new Set([...selected,...shown.map(i=>i.id)]))}>{t('Select all shown')} ({shown.length})</button><button className="text-button" onClick={()=>setSelected(new Set())}>{t('Clear selection')}</button><strong aria-live="polite">{selected.size} {t('selected')}</strong></div>
 <div className="pdf-word-list">{shown.map(item=><label key={item.id}><input type="checkbox" checked={selected.has(item.id)} onChange={e=>setSelected(old=>{const next=new Set(old);if(e.target.checked)next.add(item.id);else next.delete(item.id);return next;})}/><span lang="zh-Hans">{item.hanzi}</span><span className="pinyin">{item.pinyin}</span><small>{item.english}</small></label>)}{!shown.length&&<p>{t('No words found. Try another spelling or lesson.')}</p>}</div>
 {error&&<p role="alert">{t(error)}</p>}<button className="primary" disabled={busy||!selected.size} onClick={()=>void download()}><Download size={17}/>{busy?t('Preparing PDF…'):t('Download PDF')} ({selected.size})</button>
 </div></div>;
}
