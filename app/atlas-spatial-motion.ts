'use client';
import {useEffect,useLayoutEffect,useRef,type PointerEvent,type MouseEvent} from 'react';
import {spatialSwipe} from './atlas-spatial-model';
/** Same short transition for buttons, keyboard and swipes; no loop or autoplay. */
export function useSpatialMotion(key:string){
 const ref=useRef<HTMLDivElement>(null),animation=useRef<Animation|null>(null),pending=useRef<-1|0|1>(0),locked=useRef(false),mounted=useRef(true),previous=useRef(key),start=useRef<{x:number;y:number}|null>(null),suppress=useRef(0);
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;animation.current?.cancel()}},[]);
 useLayoutEffect(()=>{if(previous.current===key)return;previous.current=key;const direction=pending.current;pending.current=0;animation.current?.cancel();const el=ref.current;if(!el)return;el.style.transform='';if(!direction||reduced()){locked.current=false;return}const current=el.animate([{transform:`translateX(${direction*34}px)`,opacity:0},{transform:'translateX(0)',opacity:1}],{duration:190,easing:'cubic-bezier(.2,.7,.3,1)'});animation.current=current;void current.finished.then(()=>{if(animation.current===current)locked.current=false}).catch(()=>{});},[key]);
 function transition(direction:-1|1,commit:()=>void){const el=ref.current;if(locked.current)return false;if(!el||reduced()){if(el)el.style.transform='';commit();return true}locked.current=true;pending.current=direction;animation.current?.cancel();const current=el.animate([{transform:getComputedStyle(el).transform,opacity:1},{transform:`translateX(${-direction*34}px)`,opacity:0}],{duration:95,easing:'ease-in',fill:'forwards'});animation.current=current;void current.finished.then(()=>{if(mounted.current&&animation.current===current){el.style.transform='';commit()}}).catch(()=>{});return true}
 function snapBack(){const el=ref.current;if(!el)return;const from=el.style.transform;el.style.transform='';if(from&&!reduced())el.animate([{transform:from},{transform:'translateX(0)'}],{duration:150,easing:'ease-out'})}
 function pointerDown(e:PointerEvent<HTMLElement>){if(e.button!==0||!e.isPrimary||locked.current)return;suppress.current=0;start.current={x:e.clientX,y:e.clientY};((e.target as Element).closest('button')??e.currentTarget).setPointerCapture(e.pointerId)}
 function pointerMove(e:PointerEvent<HTMLElement>){if(!start.current||!ref.current)return;const dx=e.clientX-start.current.x,dy=e.clientY-start.current.y;if(Math.abs(dx)>9&&Math.abs(dx)>Math.abs(dy)*1.3){ref.current.style.transform=`translateX(${Math.max(-58,Math.min(58,dx*.42))}px)`}}
 function pointerUp(e:PointerEvent<HTMLElement>,navigate:(direction:-1|1)=>boolean){if(!start.current)return;const direction=spatialSwipe(e.clientX-start.current.x,e.clientY-start.current.y);start.current=null;if(direction){e.preventDefault();suppress.current=Date.now()+450;if(!navigate(direction))snapBack()}else snapBack()}
 return {ref,transition,pointerDown,pointerMove,pointerUp,pointerCancel:()=>{start.current=null;snapBack()},clickCapture:(e:MouseEvent)=>{if(Date.now()<suppress.current){e.preventDefault();e.stopPropagation()}}};
}
