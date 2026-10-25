'use client';
import {useEffect,useLayoutEffect,useRef,type PointerEvent,type MouseEvent} from 'react';
import {spatialSwipe} from './atlas-spatial-model';
import {settleDeckFlight} from './atlas-deck-flight';

export const deckTransform=(offset:number,progress=0)=>{
 const remaining=1-progress;
 return `translateX(${offset*35*remaining}px) translateY(${Math.abs(offset)*13*remaining}px) translateZ(${-Math.abs(offset)*90*remaining}px) rotateY(${-offset*14*remaining}deg)`;
};
/** The deck stays still. Only the front card follows the pointer; its successor rises underneath. */
export function useDeckMotion(key:string){
 const ref=useRef<HTMLDivElement>(null),animations=useRef<Animation[]>([]),locked=useRef(false),mounted=useRef(true),suppress=useRef(0);
 const gesture=useRef<{id:number;x:number;y:number;dx:number;horizontal:boolean}|null>(null),flight=useRef<ReturnType<typeof settleDeckFlight>|null>(null);
 const previous=useRef(key),snapshots=useRef<Map<string,{transform:string;opacity:string}>|null>(null);
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const cards=()=>Array.from(ref.current?.querySelectorAll<HTMLElement>('.sp-card')??[]);
 function stop(){flight.current?.cancel();flight.current=null;animations.current.forEach(a=>a.cancel());animations.current=[];}
 function restore(){for(const card of cards()){card.style.transform=deckTransform(Number(card.dataset.deckOffset));card.style.opacity='';card.style.zIndex=String(5-Math.abs(Number(card.dataset.deckOffset)))}ref.current?.removeAttribute('data-deck-moving')}
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;stop()}},[]);
 function abort(){gesture.current=null;stop();locked.current=false;restore()}
 useEffect(()=>{
  const hidden=()=>{if(document.hidden)abort()},outside=(e:globalThis.PointerEvent)=>{if(gesture.current?.id===e.pointerId&&!ref.current?.contains(e.target as Node))abort()};
  window.addEventListener('blur',abort);document.addEventListener('visibilitychange',hidden);window.addEventListener('pointerup',outside,true);
  return()=>{window.removeEventListener('blur',abort);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pointerup',outside,true)};
 },[]);
 useLayoutEffect(()=>{
  if(previous.current===key)return;previous.current=key;gesture.current=null;stop();restore();locked.current=false;
  const before=snapshots.current;snapshots.current=null;
  if(before&&!reduced())for(const card of cards()){
   const old=before.get(card.dataset.deckHanzi??'');if(!old||card.classList.contains('is-active'))continue;
   animations.current.push(card.animate([old,{transform:deckTransform(Number(card.dataset.deckOffset)),opacity:1}],{duration:220,easing:'cubic-bezier(.2,.7,.3,1)'}));
  }
 },[key]);
 function paint(dx:number){
  const root=ref.current,front=root?.querySelector<HTMLElement>('.is-active');if(!root||!front)return;
  root.setAttribute('data-deck-moving','');
  // Reset the old successor if the pointer reverses direction.
  for(const card of cards())if(card!==front){card.style.transform=deckTransform(Number(card.dataset.deckOffset));card.style.zIndex=String(5-Math.abs(Number(card.dataset.deckOffset)))}
  front.style.transform=`translateX(${dx}px) rotateZ(${Math.max(-16,Math.min(16,dx/24))}deg)`;front.style.zIndex='20';
  const direction=dx<0?1:-1,next=root.querySelector<HTMLElement>(`[data-deck-offset="${direction}"]`);
  if(next){next.style.zIndex='19';next.style.transform=deckTransform(direction,Math.min(.92,Math.abs(dx)/Math.max(1,front.offsetWidth*.8)))}
 }
 function snapBack(){
  const before=cards().map(card=>({card,transform:getComputedStyle(card).transform}));restore();
  if(!reduced())for(const {card,transform} of before)animations.current.push(card.animate([{transform},{transform:deckTransform(Number(card.dataset.deckOffset))}],{duration:200,easing:'cubic-bezier(.2,.7,.3,1)'}));
 }
 function transition(direction:-1|1,commit:()=>void,targetOffset:number=direction){
  if(locked.current)return false;
  const root=ref.current,front=root?.querySelector<HTMLElement>('.is-active'),next=root?.querySelector<HTMLElement>(`[data-deck-offset="${targetOffset}"]`);
  if(!root||!front||!next)return false;
  stop();if(reduced()){restore();commit();return true}
  locked.current=true;root.setAttribute('data-deck-moving','');front.style.zIndex='20';next.style.zIndex='19';
  const distance=(root.offsetWidth+front.offsetWidth)*.65;
  const outgoing=front.animate([{transform:getComputedStyle(front).transform,opacity:1},{transform:`translateX(${-direction*distance}px) rotateZ(${-direction*18}deg)`,opacity:0}],{duration:280,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'});
  const incoming=next.animate([{transform:getComputedStyle(next).transform},{transform:deckTransform(0)}],{duration:280,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'});
  animations.current=[outgoing,incoming];
  flight.current=settleDeckFlight(outgoing.finished,()=>{if(!mounted.current||animations.current[0]!==outgoing)return;snapshots.current=new Map(cards().map(card=>[card.dataset.deckHanzi??'',{transform:getComputedStyle(card).transform,opacity:getComputedStyle(card).opacity}]));locked.current=false;commit()},abort,()=>{outgoing.finish();incoming.finish()});
  return true;
 }
 function pointerDown(e:PointerEvent<HTMLElement>){if(e.button!==0||!e.isPrimary||locked.current)return;if(gesture.current)abort();stop();suppress.current=0;gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,horizontal:false}}
 function pointerMove(e:PointerEvent<HTMLElement>){const g=gesture.current;if(!g||g.id!==e.pointerId||locked.current)return;if(e.pointerType==='mouse'&&e.buttons===0){abort();return}const dx=e.clientX-g.x,dy=e.clientY-g.y;if(!g.horizontal){if(Math.abs(dy)>9&&Math.abs(dy)>Math.abs(dx)){gesture.current=null;return}if(Math.abs(dx)<=9||Math.abs(dx)<=Math.abs(dy)*1.3)return;g.horizontal=true;try{e.currentTarget.setPointerCapture(e.pointerId)}catch{abort();return}}g.dx=dx;suppress.current=Date.now()+500;if(!reduced())paint(dx)}
 function pointerUp(e:PointerEvent<HTMLElement>,navigate:(d:-1|1)=>boolean){const g=gesture.current;if(!g||g.id!==e.pointerId)return;gesture.current=null;if(!g.horizontal)return;const direction=spatialSwipe(e.clientX-g.x,e.clientY-g.y);e.preventDefault();suppress.current=Date.now()+500;try{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}catch{}if(!direction||!navigate(direction))snapBack()}
 return {ref,transition,pointerDown,pointerMove,pointerUp,pointerCancel:abort,lostPointerCapture:(e:PointerEvent<HTMLElement>)=>{if(gesture.current?.id===e.pointerId)abort()},clickCapture:(e:MouseEvent)=>{if(Date.now()<suppress.current){e.preventDefault();e.stopPropagation()}}};
}
