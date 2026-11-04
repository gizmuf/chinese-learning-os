'use client';
import {useEffect,useRef,useState} from 'react';
import {PanelRightClose,RotateCcw,Undo2} from 'lucide-react';
import Ink from './ink';
import {Grid,NotebookWordModel} from './notebook';
import type {Stroke} from './learning';
import {readPracticeInk} from './practice-book';
import {readDraft,saveDraft} from './local-store';
import {useI18n} from './i18n';
const EMPTY:Stroke[]=[];
const copy={en:{title:'Notebook',close:'Fold notebook',pen:'Pencil only',note:'Copy a few times, then try without looking.',character:'Character',clear:'Clear box',undo:'Undo in box'},fr:{title:'Cahier',close:'Replier le cahier',pen:'Stylet uniquement',note:'Copiez quelques fois, puis essayez sans regarder.',character:'Caractère',clear:'Effacer la case',undo:'Annuler dans la case'},ru:{title:'Тетрадь',close:'Свернуть тетрадь',pen:'Только стилус',note:'Напишите несколько раз, затем попробуйте не глядя.',character:'Знак',clear:'Очистить клетку',undo:'Отменить в клетке'},tr:{title:'Defter',close:'Defteri kapat',pen:'Yalnızca kalem',note:'Birkaç kez yaz, sonra bakmadan dene.',character:'Karakter',clear:'Kutuyu temizle',undo:'Kutuda geri al'}};
/** Temporary supported practice beside the definition. Never records an SRS grade. */
export default function DictionaryMiniNotebook({text,visible,onClose,wholeWord=false,persist=false,db=null}:{text:string;visible:boolean;onClose:()=>void;wholeWord?:boolean;persist?:boolean;db?:IDBDatabase|null}){
 const {locale}=useI18n(),c=copy[locale],characters=[...new Set(Array.from(text).filter(ch=>/\p{Script=Han}/u.test(ch)))];
 const [choice,setChoice]=useState(''),[penOnly,setPenOnly]=useState(true),[pages,setPages]=useState<Record<string,Stroke[][]>>({});
 const character=characters.includes(choice)?choice:characters[0],glyphs=Array.from(text).filter(ch=>/\p{Script=Han}/u.test(ch)),page=wholeWord?'word:'+text:character;
 const wordRows=glyphs.length===1?Array.from({length:2},()=>Array(4).fill(glyphs[0]) as string[]):glyphs.length===2?Array.from({length:2},()=>[...glyphs,...glyphs]):Array.from({length:glyphs.length===3?3:2},()=>glyphs);
 const pagesRef=useRef(pages);pagesRef.current=pages;const queue=useRef(Promise.resolve()),[loaded,setLoaded]=useState(''),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0),key='practice-book-ink:'+text,target=db?.name+':'+key;
 const ready=!persist||(!!db&&loaded===target);
 useEffect(()=>{if(!persist||!visible||!db||loaded===target)return;let active=true;setFailed(false);void readDraft<Record<string,Stroke[][]>>(db,key).then(value=>{if(active){const restored=readPracticeInk(value);pagesRef.current=restored;setPages(restored);setLoaded(target);}}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[persist,visible,db,key,target,loaded,retry]);
 function save(next:Record<string,Stroke[][]>){if(!persist||!db||!ready)return;const destination=db;queue.current=queue.current.then(()=>saveDraft(destination,key,next)).then(()=>setFailed(false)).catch(()=>setFailed(true));}
 function change(slot:number,strokes:Stroke[]){const cells=[...(pagesRef.current[page]??[])];cells[slot]=strokes;const next={...pagesRef.current,[page]:cells};pagesRef.current=next;setPages(next);save(next);}
 function cell(slot:number,ch:string){const strokes=pages[page]?.[slot]??EMPTY;return <div className="sp-mini-notebook-cell" key={page+slot} role="group" aria-label={ch+' · '+(slot+1)}><div className="notebook-square"><Grid/><Ink disabled={!ready} strokes={strokes} onChange={s=>change(slot,s)} penOnly={penOnly}/></div><div className="sp-mini-notebook-tools"><small>{slot+1}</small><button type="button" aria-label={c.undo+' '+(slot+1)} disabled={!strokes.length||!ready} onClick={()=>change(slot,strokes.slice(0,-1))}><Undo2 size={14}/></button><button type="button" aria-label={c.clear+' '+(slot+1)} disabled={!strokes.length||!ready} onClick={()=>change(slot,[])}><RotateCcw size={14}/></button></div></div>;}
 return <aside className={"sp-mini-notebook"+(wholeWord?" is-library-notebook":"")} aria-label={c.title} hidden={!visible}>
  <header><h3>{c.title}</h3>{!wholeWord&&<button type="button" className="icon-button" aria-label={c.close} onClick={onClose}><PanelRightClose size={19}/></button>}</header>
  {visible&&character&&<><div className="sp-mini-notebook-model">{!wholeWord&&<NotebookWordModel text={character}/>} {!wholeWord&&characters.length>1&&<div role="group" aria-label={c.character}>{characters.map(ch=><button type="button" key={ch} lang="zh-Hans" aria-pressed={character===ch} onClick={()=>setChoice(ch)}>{ch}</button>)}</div>}<label><input type="checkbox" checked={penOnly} onChange={e=>setPenOnly(e.target.checked)}/>{c.pen}</label></div>
  {persist&&!ready&&<p role="status">{failed?'Could not load saved writing.':'Loading saved writing…'}</p>}{failed&&<button type="button" className="text-button" onClick={()=>{if(ready)save(pagesRef.current);else setRetry(v=>v+1);}}>Retry saving</button>}
  {wholeWord?<div className="sp-mini-word-pages">{wordRows.map((row,rep)=><div className="sp-mini-word-repetition" key={rep} style={{gridTemplateColumns:`repeat(${Math.min(row.length,4)},minmax(0,1fr))`,maxWidth:(Math.min(row.length,4)*158-8)+'px'}}>{row.map((ch,i)=>cell(wordRows.slice(0,rep).reduce((n,r)=>n+r.length,0)+i,ch))}</div>)}</div>:<div className="sp-mini-notebook-grid">{Array.from({length:8},(_,slot)=>cell(slot,character))}</div>}<p>{c.note}</p></>}
 </aside>;
}
