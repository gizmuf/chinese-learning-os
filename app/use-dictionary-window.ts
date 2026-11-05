'use client';
import {useEffect,useRef,type RefObject,type PointerEvent,type KeyboardEvent} from 'react';
import {clampDictionaryPosition,normalizeDictionaryPosition,restoreDictionaryPosition,fitDictionarySize,readDictionarySize,resizeDictionaryWindow,expandDictionaryForNotebook,type WindowPoint,type WindowRect,type WindowSize,type ResizeEdge} from './dictionary-window';
const key='chinese-os:dictionary-window-v2',legacyKey='chinese-os:dictionary-position-v1';
const interactive='button,a,input,select,textarea,summary,[contenteditable=true]';
export function useDictionaryWindow(dialog:RefObject<HTMLDialogElement|null>,opener:RefObject<HTMLElement|null>,entry:unknown,expanded=false){
 const entryText=entry&&typeof entry==='object'&&'text' in entry?String(entry.text):undefined;
 const saved=useRef<WindowPoint|undefined>(undefined),preferred=useRef<WindowSize>({width:360,height:560}),loaded=useRef(false);
 const compact=useRef<WindowRect|undefined>(undefined),wasExpanded=useRef(false);
 const gesture=useRef<{id:number;start:WindowPoint;origin:WindowRect;edge?:ResizeEdge;target:HTMLElement;moved:boolean}|null>(null);
 function bounds(){const v=window.visualViewport;return {left:v?.offsetLeft??0,top:v?.offsetTop??0,width:v?.width??innerWidth,height:v?.height??innerHeight};}
 function rect():WindowRect{const r=dialog.current!.getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height};}
 function apply(value:WindowRect){const el=dialog.current;if(!el)return;const size=fitDictionarySize(value,bounds(),expanded?1000:760),point=clampDictionaryPosition(value,bounds(),size);Object.assign(el.style,{left:point.x+'px',top:point.y+'px',width:size.width+'px',height:size.height+'px'});}
 function remember(resized=false){if(!dialog.current||expanded)return;const r=rect();if(resized)preferred.current={width:r.width,height:r.height};saved.current=normalizeDictionaryPosition(r,bounds(),r);try{localStorage.setItem(key,JSON.stringify({version:2,position:saved.current,size:preferred.current}));}catch{/* Optional window preference, separate from learner data. */}}
 function cancel(){const g=gesture.current;gesture.current=null;if(g?.target.hasPointerCapture(g.id))g.target.releasePointerCapture(g.id);}
 useEffect(()=>{
  const el=dialog.current;if(!entry||!el)return;
  if(!loaded.current){loaded.current=true;try{const value=JSON.parse(localStorage.getItem(key)??'null');if(value?.version===2){saved.current=value.position;preferred.current=readDictionarySize(value.size)??preferred.current;}else saved.current=JSON.parse(localStorage.getItem(legacyKey)??'null')??undefined;}catch{/* Use defaults if saved UI state is corrupt. */}}
  function position(){if(!el?.open)return;cancel();const b=bounds();if(expanded){if(!compact.current)compact.current=rect();apply(expandDictionaryForNotebook(compact.current,b));wasExpanded.current=true;return;}if(wasExpanded.current&&compact.current){apply(compact.current);compact.current=undefined;wasExpanded.current=false;return;}const s=fitDictionarySize(preferred.current,b),restored=restoreDictionaryPosition(saved.current,b,s),anchor=opener.current?.getBoundingClientRect();apply({...s,...(restored??{x:anchor?.left??b.left+b.width-s.width-12,y:anchor?anchor.bottom+8:b.top+32})});}
  position();addEventListener('resize',position);window.visualViewport?.addEventListener('resize',position);window.visualViewport?.addEventListener('scroll',position);
  return()=>{removeEventListener('resize',position);window.visualViewport?.removeEventListener('resize',position);window.visualViewport?.removeEventListener('scroll',position);cancel();};
 },[entryText,dialog,opener,expanded]);
 function handlers(edge?:ResizeEdge){return {
  onPointerDown(e:PointerEvent<HTMLElement>){if(!dialog.current||gesture.current||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0)||(!edge&&(e.target as HTMLElement).closest(interactive)))return;e.preventDefault();gesture.current={id:e.pointerId,start:{x:e.clientX,y:e.clientY},origin:rect(),edge,target:e.currentTarget,moved:false};e.currentTarget.setPointerCapture(e.pointerId);},
  onPointerMove(e:PointerEvent<HTMLElement>){const g=gesture.current;if(!g||g.id!==e.pointerId)return;const delta={x:e.clientX-g.start.x,y:e.clientY-g.start.y};if(!g.moved&&Math.hypot(delta.x,delta.y)<6)return;g.moved=true;apply(g.edge?resizeDictionaryWindow(g.origin,g.edge,delta,bounds(),expanded?1000:760):{...g.origin,x:g.origin.x+delta.x,y:g.origin.y+delta.y});},
  onPointerUp(e:PointerEvent<HTMLElement>){const g=gesture.current;if(g?.id!==e.pointerId)return;if(g.moved)remember(!!g.edge);cancel();},
  onPointerCancel(e:PointerEvent<HTMLElement>){const g=gesture.current;if(g?.id!==e.pointerId)return;if(g.moved)remember(!!g.edge);cancel();},
  onLostPointerCapture(e:PointerEvent<HTMLElement>){const g=gesture.current;if(g?.id===e.pointerId){if(g.moved)remember(!!g.edge);gesture.current=null;}},
  onKeyDown(e:KeyboardEvent<HTMLElement>){if(e.target!==e.currentTarget||!dialog.current)return;const step=e.shiftKey?4:16,delta=({ArrowLeft:{x:-step,y:0},ArrowRight:{x:step,y:0},ArrowUp:{x:0,y:-step},ArrowDown:{x:0,y:step}} as Record<string,WindowPoint>)[e.key];if(!delta)return;e.preventDefault();const r=rect();apply(edge?resizeDictionaryWindow(r,edge,delta,bounds(),expanded?1000:760):{...r,x:r.x+delta.x,y:r.y+delta.y});remember(!!edge);}
 };}
 return {moving:handlers(),resizing:handlers};
}
