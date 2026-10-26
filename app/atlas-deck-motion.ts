'use client';
import {useEffect,useLayoutEffect,useRef,type PointerEvent,type MouseEvent} from 'react';
import {deckSwipe,deckWheel,type WheelGesture} from './atlas-deck-gesture';

export const deckTransform=(offset:number,progress=0)=>{
 const remaining=1-progress;
 return `translateX(${offset*35*remaining}px) translateY(${Math.abs(offset)*13*remaining}px) translateZ(${-Math.abs(offset)*90*remaining}px) rotateY(${-offset*14*remaining}deg)`;
};
/** Navigation commits on release. Animation only presents the selected state. */
export function useDeckMotion(key:string,navigate:(direction:-1|1)=>boolean){
 const ref=useRef<HTMLDivElement>(null),animations=useRef<Animation[]>([]),suppress=useRef(0);
 const gesture=useRef<{id:number;x:number;y:number;horizontal:boolean}|null>(null);
 const navigateRef=useRef(navigate),wheel=useRef<WheelGesture>({at:0,distance:0,handled:false});
 const previous=useRef(key),snapshots=useRef<Map<string,string>|null>(null);
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const cards=()=>Array.from(ref.current?.querySelectorAll<HTMLElement>('.sp-card')??[]);
 function stop(){animations.current.forEach(a=>a.cancel());animations.current=[];}
 function restore(){for(const card of cards()){card.style.transform=deckTransform(Number(card.dataset.deckOffset));card.style.opacity='';card.style.zIndex=String(5-Math.abs(Number(card.dataset.deckOffset)))}ref.current?.removeAttribute('data-deck-moving')}
 function capture(){return new Map(cards().map(card=>[card.dataset.deckHanzi??'',getComputedStyle(card).transform]))}
 function animateFrom(before:Map<string,string>){
  if(reduced())return;
  for(const card of cards()){
   const from=before.get(card.dataset.deckHanzi??'');if(!from)continue;
   animations.current.push(card.animate([{transform:from},{transform:deckTransform(Number(card.dataset.deckOffset))}],{duration:220,easing:'cubic-bezier(.2,.7,.3,1)'}));
  }
 }
 function abort(){gesture.current=null;stop();restore()}
 useLayoutEffect(()=>{navigateRef.current=navigate},[navigate]);
 useEffect(()=>()=>stop(),[]);
 useEffect(()=>{const hidden=()=>{if(document.hidden)abort()};window.addEventListener('blur',abort);document.addEventListener('visibilitychange',hidden);return()=>{window.removeEventListener('blur',abort);document.removeEventListener('visibilitychange',hidden)}},[]);
 useEffect(()=>{const root=ref.current;if(!root)return;const onWheel=(e:WheelEvent)=>{if(e.ctrlKey||e.metaKey)return;const scale=e.deltaMode===1?16:e.deltaMode===2?root.clientWidth:1;const result=deckWheel(wheel.current,e.deltaX*scale,e.deltaY*scale,performance.now());wheel.current=result.state;if(!result.consume)return;e.preventDefault();if(result.direction)navigateRef.current(result.direction)};root.addEventListener('wheel',onWheel,{passive:false});return()=>root.removeEventListener('wheel',onWheel)},[key]);
 useLayoutEffect(()=>{
  if(previous.current===key)return;previous.current=key;gesture.current=null;
  const before=snapshots.current;snapshots.current=null;stop();restore();if(before)animateFrom(before);
 },[key]);
 function paint(dx:number){
  const root=ref.current,front=root?.querySelector<HTMLElement>('.is-active');if(!root||!front)return;
  root.setAttribute('data-deck-moving','');
  for(const card of cards())if(card!==front){card.style.transform=deckTransform(Number(card.dataset.deckOffset));card.style.zIndex=String(5-Math.abs(Number(card.dataset.deckOffset)))}
  front.style.transform=`translateX(${dx}px) rotateZ(${Math.max(-16,Math.min(16,dx/24))}deg)`;front.style.zIndex='20';
  const direction=dx<0?1:-1,next=root.querySelector<HTMLElement>(`[data-deck-offset="${direction}"]`);
  if(next){next.style.zIndex='19';next.style.transform=deckTransform(direction,Math.min(.92,Math.abs(dx)/Math.max(1,front.offsetWidth*.8)))}
 }
 function snapBack(){const before=capture();stop();restore();animateFrom(before)}
 function transition(_direction:-1|1,commit:()=>void){
  snapshots.current=capture();stop();commit();return true;
 }
 function pointerDown(e:PointerEvent<HTMLElement>){
  if(e.button!==0||!e.isPrimary)return;
  if(gesture.current)abort();stop();suppress.current=0;
  gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,horizontal:false};
  // Keep the original button as the capture target, including a release outside the deck.
  const target=(e.target as Element).closest('button')??e.currentTarget;
  target.setPointerCapture(e.pointerId);
 }
 function pointerMove(e:PointerEvent<HTMLElement>){
  const g=gesture.current;if(!g||g.id!==e.pointerId)return;
  const dx=e.clientX-g.x,dy=e.clientY-g.y;
  if(!g.horizontal){if(Math.abs(dy)>9&&Math.abs(dy)>Math.abs(dx)){gesture.current=null;return}if(Math.abs(dx)<=9||Math.abs(dx)<=Math.abs(dy)*1.3)return;g.horizontal=true}
  suppress.current=Date.now()+500;if(!reduced())paint(dx);
 }
 function pointerUp(e:PointerEvent<HTMLElement>,move:(d:-1|1)=>boolean){
  const g=gesture.current;if(!g||g.id!==e.pointerId)return;gesture.current=null;
  const direction=deckSwipe(e.clientX-g.x,e.clientY-g.y);
  if(g.horizontal||direction){e.preventDefault();suppress.current=Date.now()+500}
  if(!direction||!move(direction))snapBack();
 }
 return {ref,transition,pointerDown,pointerMove,pointerUp,pointerCancel:abort,lostPointerCapture:(e:PointerEvent<HTMLElement>)=>{if(gesture.current?.id===e.pointerId)abort()},clickCapture:(e:MouseEvent)=>{if(Date.now()<suppress.current){e.preventDefault();e.stopPropagation()}}};
}
