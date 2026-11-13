'use client';
import {useState} from 'react';
import {sceneLabs,type SceneLab} from './scene-lab-model';
import VoiceDemo from './voice-demo';
import './scene-lab.css';
export function LabNavIcon({size=19}:{size?:number}){return <svg className="lab-nav-mark" width={size+7} height={size+3} viewBox="0 0 30 24" aria-hidden="true"><text x="1" y="18" fill="currentColor" fontSize="18" fontFamily="system-ui,sans-serif" fontWeight="750">3D</text></svg>;}
export default function SceneLabView({selected,onSelect}:{selected:SceneLab;onSelect:(lab:SceneLab)=>void}){
 const lab=sceneLabs.find(l=>l.id===selected);
 const [ready,setReady]=useState('');
 return <section className="scene-lab-panel" aria-label="3D Lab">
  <div className="scene-lab-heading"><div><p className="eyebrow">LEARN THROUGH EXPLORATION</p><h1>3D Lab</h1></div><p>Explore a room. Try a conversation. Stay in ChineseOS.</p></div>
  <nav className="scene-lab-tabs" aria-label="Lab experiments">{[...sceneLabs,{id:'voice' as const,title:'Voice demo'}].map(l=><button key={l.id} aria-pressed={selected===l.id} onClick={()=>onSelect(l.id)}>{l.title}</button>)}</nav>
  {selected==='voice'?<VoiceDemo/>:lab&&<><p className="scene-lab-note">{lab.note}</p>{ready!==selected&&<p role="status">Opening {lab.title.toLowerCase()}…</p>}<iframe key={selected} className="scene-lab-frame" title={lab.title+' · ChineseOS'} src={'/design-references/scene-lab/'+lab.path} onLoad={()=>setReady(selected)}/></>}
 </section>;
}
