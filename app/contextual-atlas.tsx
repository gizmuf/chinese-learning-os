'use client';
import {lazy,Suspense,useEffect,useMemo,useRef,useState} from 'react';
import type {Item} from './content';
import type {DictionaryEntry} from './atlas-spatial-model';
import {readCloudRoute,cloudRouteHref,type CloudRoute} from './atlas-cloud-route';
import {useAtlasProgress} from './atlas-store';
import {HanziDisplayControls} from './hanzi-style';
import {StudyText} from './study-lookup-context';
import {atlasWritingEntry} from './writing-context-model';
import {studyAtlasHref} from './study-lookup-model';
const AtlasCloud=lazy(()=>import('./atlas-cloud'));
export type AtlasVisit={entry:DictionaryEntry;route:CloudRoute;originY:number;originURL:string;trail?:string[];scrollTop?:number};
export default function ContextualAtlas({visit,owner,db,penOnly,setPenOnly,notify,onClose,onWrite,onChange}:{visit:AtlasVisit;owner:string|null;db:IDBDatabase|null;penOnly:boolean;setPenOnly:(value:boolean)=>void;notify:(message:string)=>void;onClose:()=>void;onWrite:(entry:DictionaryEntry)=>void;onChange:(route:CloudRoute,trail:string[],scrollTop:number)=>void}){
 const modal=useRef<HTMLDialogElement>(null),progress=useAtlasProgress(owner),[route,setRoute]=useState(visit.route),[trail,setTrail]=useState<CloudRoute[]>((visit.trail??[]).map(readCloudRoute)),[assessment,setAssessment]=useState(false);
 const source=visit.entry.contextual;
 const scrollTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),latestView=useRef({route,trail,onChange});latestView.current={route,trail,onChange};
 useEffect(()=>()=>clearTimeout(scrollTimer.current),[]);
 function rememberScroll(){clearTimeout(scrollTimer.current);scrollTimer.current=setTimeout(()=>{const view=latestView.current;view.onChange(view.route,view.trail.map(cloudRouteHref),modal.current?.scrollTop??0);},140);}
 useEffect(()=>{modal.current?.showModal();if(modal.current)modal.current.scrollTop=visit.scrollTop??0;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=overflow;};},[]);
 useEffect(()=>{if(cloudRouteHref(visit.route)!==cloudRouteHref(route)){const history=[...trail,route].slice(-24);setTrail(history);setRoute(visit.route);onChange(visit.route,history.map(cloudRouteHref),modal.current?.scrollTop??0);}},[visit.route]);
 function navigate(next:CloudRoute){const history=cloudRouteHref(next)!==cloudRouteHref(route)?[...trail,route].slice(-24):trail;setTrail(history);setRoute(next);onChange(next,history.map(cloudRouteHref),modal.current?.scrollTop??0);}
 const embedded=useMemo(()=>({route,contextEntry:visit.entry,onRoute:navigate,onAssessmentChange:setAssessment,onContextWrite:(item:Item)=>onWrite(atlasWritingEntry(visit.entry,item,route.kind))}),[route,source]);
 return <dialog ref={modal} className="context-atlas-dialog" aria-label="Atlas alongside your lesson" onScroll={rememberScroll} onCancel={event=>{event.preventDefault();if(!assessment)onClose();}}>
  <header className="context-atlas-top"><button className="secondary" disabled={assessment} onClick={onClose}>← Back to definition</button><strong>Character connections</strong><button className="secondary" disabled={assessment||!trail.length} onClick={()=>{const previous=trail.at(-1);if(previous){setTrail(old=>old.slice(0,-1));setRoute(previous);onChange(previous,trail.slice(0,-1).map(cloudRouteHref),modal.current?.scrollTop??0);}}}>Previous connection</button></header>
  <section className="context-atlas-views" aria-label="Atlas views"><div className="cloud-view-switch" role="group" aria-label="Context Atlas views">{(['space','family','path','journey','cloud','words','layers','constellations','matrix'] as const).map(layout=><button key={layout} aria-pressed={route.layout===layout} onClick={()=>navigate({...route,layout})}>{({space:'3D cards',family:'Family + context',path:'Complete path',journey:'Family journey',cloud:'Cloud',words:'Word families',layers:'Layer map',constellations:'Constellations',matrix:'Repetition matrix'})[layout]}</button>)}</div><HanziDisplayControls compact/></section>
  {source&&<details open className="context-atlas-origin"><summary>Your source sentence</summary><div data-study-sentence={source.text} data-study-pinyin={source.pinyin} data-study-meaning={source.meaning} data-study-source-id={source.sourceId}><p lang="zh-Hans"><StudyText text={source.text} pinyin={source.pinyin}/></p><p className="pinyin">{source.pinyin}</p><p>{source.meaning}</p></div></details>}
  <Suspense fallback={<p role="status">Opening your character connections…</p>}><AtlasCloud owner={owner} db={db} penOnly={penOnly} setPenOnly={setPenOnly} notify={notify} progress={progress} onWord={embedded.onContextWrite} embedded={embedded}/></Suspense>
 </dialog>;
}
export function atlasVisit(entry:DictionaryEntry):AtlasVisit|null{const href=studyAtlasHref(entry);return href?{entry,route:readCloudRoute(href.slice(href.indexOf('?'))),originY:window.scrollY,originURL:location.pathname+location.search}:null;}
