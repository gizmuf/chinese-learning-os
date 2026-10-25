'use client';
import {useEffect,useLayoutEffect,useRef,useState,type PointerEvent,type CSSProperties} from 'react';
import type {CloudWord} from './atlas-cloud-model';
import {boundedFamilyIndex,splitFamilyWord} from './word-family-model';
import {useI18n} from './i18n';
import {SharedText} from './word-family-text';
type Props={words:CloudWord[];anchor:string;index:number;memory:boolean;revealed:boolean;onSelect:(index:number)=>void};
/** Both scroll surfaces are views of one canonical word index. They cannot form invented combinations. */
export default function WordFamilyReels(p:Props){
 const {locale}=useI18n(),c=(en:string,fr:string,ru:string)=>({en,fr,ru})[locale];
 const left=useRef<HTMLDivElement>(null),right=useRef<HTMLDivElement>(null),active=useRef<HTMLDivElement|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),suppress=useRef(0);
 const drag=useRef<{node:HTMLDivElement;id:number;y:number;top:number;moved:boolean}|null>(null);
 const [rowHeight,setRowHeight]=useState(144),layout=useRef<{key:string;rowHeight:number;index:number}|null>(null),current=useRef(p);
 useLayoutEffect(()=>{current.current=p});
 const key=p.words.map(w=>w.id).join('|');
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function clearTimer(){if(timer.current){clearTimeout(timer.current);timer.current=null}}
 function position(index:number,smooth:boolean){active.current=null;for(const node of [left.current,right.current])node?.scrollTo({top:index*rowHeight,behavior:smooth&&!reduced()?'smooth':'instant'})}
 function settle(node:HTMLDivElement){clearTimer();const index=boundedFamilyIndex(node.scrollTop/rowHeight,current.current.words.length);position(index,true);if(index!==current.current.index)current.current.onSelect(index)}
 useLayoutEffect(()=>{clearTimer();const d=drag.current;drag.current=null;if(d){d.node.classList.remove('is-dragging');try{if(d.node.hasPointerCapture(d.id))d.node.releasePointerCapture(d.id)}catch{}}const old=layout.current;const smooth=!!old&&old.key===key&&old.rowHeight===rowHeight&&old.index!==p.index;layout.current={key,rowHeight,index:p.index};position(p.index,smooth)},[p.index,rowHeight,key,p.memory,p.revealed]);
 useLayoutEffect(()=>{
  const measure=()=>{const labels=[...left.current?.querySelectorAll<HTMLElement>('.wf-reel-content')??[],...right.current?.querySelectorAll<HTMLElement>('.wf-reel-content')??[]];const needed=Math.max(128,...labels.map(el=>Math.ceil(el.getBoundingClientRect().height)+12));setRowHeight(old=>old===needed?old:needed)};
  measure();const observer=new ResizeObserver(measure);if(left.current)observer.observe(left.current);return()=>observer.disconnect();
 },[key,p.anchor,p.memory,p.revealed,locale]);
 useEffect(()=>()=>{clearTimer()},[]);
 useEffect(()=>{const cancel=()=>{const d=drag.current;drag.current=null;if(d){d.node.classList.remove('is-dragging');settle(d.node)}};window.addEventListener('blur',cancel);return()=>window.removeEventListener('blur',cancel)},[rowHeight]);
 function scroll(node:HTMLDivElement){if(active.current!==node)return;const other=node===left.current?right.current:left.current;if(other)other.scrollTop=node.scrollTop;clearTimer();timer.current=setTimeout(()=>{if(!drag.current)settle(node)},160)}
 function down(e:PointerEvent<HTMLDivElement>){active.current=e.currentTarget;clearTimer();if(e.pointerType!=='mouse'||e.button!==0)return;drag.current={node:e.currentTarget,id:e.pointerId,y:e.clientY,top:e.currentTarget.scrollTop,moved:false};suppress.current=0}
 function move(e:PointerEvent<HTMLDivElement>){const d=drag.current;if(!d||d.node!==e.currentTarget||d.id!==e.pointerId)return;if((e.buttons&1)===0){finish();return}const dy=e.clientY-d.y;if(!d.moved&&Math.abs(dy)<5)return;if(!d.moved){d.moved=true;d.node.setPointerCapture(e.pointerId);d.node.classList.add('is-dragging')}e.preventDefault();suppress.current=Date.now()+450;d.node.scrollTop=Math.max(0,Math.min((p.words.length-1)*rowHeight,d.top-dy));scroll(d.node)}
 function finish(){const d=drag.current;drag.current=null;if(!d)return;d.node.classList.remove('is-dragging');if(d.node.hasPointerCapture(d.id))d.node.releasePointerCapture(d.id);if(d.moved)settle(d.node)}
 const masked=p.memory&&!p.revealed;
 return <div className={'wf-reels'+(masked?' is-masked':'')} style={{'--reel-row':rowHeight+'px','--anchor-length':Array.from(p.anchor).length} as CSSProperties}>
  {(['left','right'] as const).map(side=><div key={side} className={'wf-reel wf-reel-'+side} ref={side==='left'?left:right} role="listbox" aria-activedescendant={'wf-reel-'+side+'-'+p.index} aria-label={side==='left'?c('Left word fragments','Fragments de gauche','Левые части слов'):c('Right word fragments','Fragments de droite','Правые части слов')} tabIndex={0} onScroll={e=>scroll(e.currentTarget)} onWheel={e=>{active.current=e.currentTarget}} onPointerDown={down} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={e=>{if(e.target===e.currentTarget&&drag.current?.id===e.pointerId)finish()}} onClickCapture={e=>{if(Date.now()<suppress.current){e.preventDefault();e.stopPropagation()}}} onKeyDown={e=>{const delta=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:e.key==='PageDown'?3:e.key==='PageUp'?-3:0;const next=e.key==='Home'?0:e.key==='End'?p.words.length-1:p.index+delta;if(delta||e.key==='Home'||e.key==='End'){e.preventDefault();p.onSelect(boundedFamilyIndex(next,p.words.length));position(boundedFamilyIndex(next,p.words.length),true)}}}>
   <div className="wf-reel-padding" aria-hidden="true"/>{p.words.map((word,index)=>{const part=splitFamilyWord(word.hanzi,p.anchor)!,hide=p.memory&&(!p.revealed||index!==p.index),fragment=side==='left'?part.before:part.after;return <button type="button" role="option" id={'wf-reel-'+side+'-'+index} key={word.id} className="wf-reel-row" aria-selected={index===p.index} tabIndex={-1} aria-label={hide?c('Word ','Mot ','Слово ')+(index+1):word.hanzi+' · '+word.pinyin+' · '+word.meaning} onClick={()=>{p.onSelect(index);position(index,true)}}><span className="wf-reel-content"><span className="wf-fragment" lang="zh-Hans">{hide?'?':fragment?<SharedText text={fragment} anchor={p.anchor}/>:'—'}</span><span className="wf-reel-reading">{hide?c('Recall the word','Rappelez le mot','Вспомните слово'):word.pinyin}</span><span className="wf-reel-meaning">{hide?c('Answer hidden','Réponse masquée','Ответ скрыт'):word.meaning}</span></span></button>})}<div className="wf-reel-padding" aria-hidden="true"/>
  </div>)}
  <div className="wf-fixed-anchor" aria-label={c('Fixed shared characters','Caractères communs fixes','Общие знаки остаются на месте')}><span lang="zh-Hans">{p.anchor}</span><small>{c('shared','commun','общее')}</small></div>
 </div>;
}
