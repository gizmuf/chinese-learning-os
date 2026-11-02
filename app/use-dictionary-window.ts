'use client';
import {useEffect,useRef,type RefObject,type PointerEvent,type KeyboardEvent} from 'react';
import {clampDictionaryPosition,normalizeDictionaryPosition,restoreDictionaryPosition,type WindowPoint} from './dictionary-window';
const key='chinese-os:dictionary-position-v1';
export function useDictionaryWindow(dialog:RefObject<HTMLDialogElement|null>,opener:RefObject<HTMLElement|null>,entry:unknown){
 const entryText=entry&&typeof entry==='object'&&'text' in entry?String(entry.text):undefined;
 const saved=useRef<WindowPoint|undefined>(undefined),loaded=useRef(false),drag=useRef<{id:number;start:WindowPoint;origin:WindowPoint;moved:boolean}|null>(null);
 function bounds(){const v=window.visualViewport;return {left:v?.offsetLeft??0,top:v?.offsetTop??0,width:v?.width??innerWidth,height:v?.height??innerHeight};}
 function size(){const r=dialog.current!.getBoundingClientRect();return {width:r.width,height:r.height};}
 function move(point:WindowPoint){const el=dialog.current;if(!el)return;const safe=clampDictionaryPosition(point,bounds(),size());el.style.left=safe.x+'px';el.style.top=safe.y+'px';return safe;}
 function remember(){const r=dialog.current?.getBoundingClientRect();if(!r)return;saved.current=normalizeDictionaryPosition({x:r.left,y:r.top},bounds(),size());try{localStorage.setItem(key,JSON.stringify(saved.current));}catch{/* Position is optional; learning progress is separate. */}}
 useEffect(()=>{
  const el=dialog.current;if(!entry||!el)return;
  if(!loaded.current){loaded.current=true;try{saved.current=JSON.parse(localStorage.getItem(key)??'null')??undefined;}catch{saved.current=undefined;}}
  function position(){if(!el?.open)return;const b=bounds();el.style.width=Math.max(40,Math.min(304,b.width-24))+'px';el.style.maxHeight=Math.max(40,Math.min(560,b.height*.65,b.height-24))+'px';const s=size(),restored=restoreDictionaryPosition(saved.current,b,s),anchor=opener.current?.getBoundingClientRect();move(restored??{x:anchor?.left??b.left+b.width-s.width-12,y:anchor?anchor.bottom+8:b.top+32});}
  position();const observer=new ResizeObserver(()=>{if(el.open){const r=el.getBoundingClientRect();move({x:r.left,y:r.top});}});observer.observe(el);addEventListener('resize',position);window.visualViewport?.addEventListener('resize',position);window.visualViewport?.addEventListener('scroll',position);
  return()=>{observer.disconnect();removeEventListener('resize',position);window.visualViewport?.removeEventListener('resize',position);window.visualViewport?.removeEventListener('scroll',position);drag.current=null;};
 },[entryText,dialog,opener]);
 function onPointerDown(e:PointerEvent<HTMLButtonElement>){if(!dialog.current||drag.current||(e.pointerType==='mouse'&&e.button!==0))return;const r=dialog.current.getBoundingClientRect();drag.current={id:e.pointerId,start:{x:e.clientX,y:e.clientY},origin:{x:r.left,y:r.top},moved:false};e.currentTarget.setPointerCapture(e.pointerId);}
 function onPointerMove(e:PointerEvent<HTMLButtonElement>){const d=drag.current;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.start.x,dy=e.clientY-d.start.y;if(!d.moved&&Math.hypot(dx,dy)<6)return;d.moved=true;move({x:d.origin.x+dx,y:d.origin.y+dy});}
 function onPointerUp(e:PointerEvent<HTMLButtonElement>){if(drag.current?.id!==e.pointerId)return;const moved=drag.current.moved;drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);if(moved)remember();}
 function onPointerCancel(e:PointerEvent<HTMLButtonElement>){if(drag.current?.id===e.pointerId){drag.current=null;remember();}}
 function onKeyDown(e:KeyboardEvent<HTMLButtonElement>){const step=e.shiftKey?4:16,offset:Record<string,WindowPoint>={ArrowLeft:{x:-step,y:0},ArrowRight:{x:step,y:0},ArrowUp:{x:0,y:-step},ArrowDown:{x:0,y:step}};const delta=offset[e.key];if(!delta||!dialog.current)return;e.preventDefault();const r=dialog.current.getBoundingClientRect();move({x:r.left+delta.x,y:r.top+delta.y});remember();}
 return {onPointerDown,onPointerMove,onPointerUp,onPointerCancel,onLostPointerCapture:onPointerCancel,onKeyDown};
}
