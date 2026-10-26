/** A pen takes priority over a preceding palm contact. Other contacts never
 * replace an active pen, including when the browser marks the pen non-primary. */
export function acceptWritingPointer(input:{pointerType:string;button:number},penOnly:boolean,penSeen:boolean,active?:{type:string}|null){
 if(input.pointerType==='mouse'&&input.button!==0)return false;
 if(penOnly&&input.pointerType!=='pen')return false;
 if(penSeen&&input.pointerType==='touch')return false;
 return !active||(input.pointerType==='pen'&&active.type!=='pen');
}

type Bound={getPoint:()=>{x:number;y:number};preventDefault:()=>void};
/** Hanzi Writer's default SVG target uses touches[0] and document touchend.
 * This supported renderer target keeps its SVG renderer, but feeds it one
 * captured pointer so a palm cannot move or end the Pencil's stroke. */
export class WritingSvgTarget {
 node:SVGSVGElement|SVGGElement;svg:SVGSVGElement|SVGGElement;defs:SVGDefsElement;
 private start?:(e:Bound)=>void;private move?:(e:Bound)=>void;private end?:()=>void;
 private active:{id:number;type:string}|null=null;private penSeen=false;private lastPenOnly=false;
 private listeners:AbortController|null=null;
 constructor(node:SVGSVGElement|SVGGElement,defs:SVGDefsElement,private penOnly:()=>boolean){this.node=this.svg=node;this.defs=defs;}
 static create(host:HTMLElement,penOnly:()=>boolean,width:string|number='100%',height:string|number='100%'){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
  svg.setAttribute('width',String(width));svg.setAttribute('height',String(height));svg.appendChild(defs);host.appendChild(svg);
  const target=new WritingSvgTarget(svg,defs,penOnly);target.bind();return target;
 }
 private bind(){
  this.listeners=new AbortController();const options={signal:this.listeners.signal};
  this.node.addEventListener('pointerdown',raw=>{const e=raw as PointerEvent;const preference=this.penOnly();if(preference!==this.lastPenOnly){this.penSeen=false;this.lastPenOnly=preference;}
   if(!acceptWritingPointer(e,preference,this.penSeen,this.active))return;
   if(this.active)this.end?.();
   this.active={id:e.pointerId,type:e.pointerType};if(e.pointerType==='pen')this.penSeen=true;
   e.preventDefault();this.node.setPointerCapture(e.pointerId);this.start?.(this.bound(e));
  },options);
  this.node.addEventListener('pointermove',raw=>{const e=raw as PointerEvent;if(this.active?.id!==e.pointerId)return;e.preventDefault();const events=e.getCoalescedEvents?.();for(const point of events?.length?events:[e])this.move?.(this.bound(point));},options);
  const finish=(raw:Event)=>{const e=raw as PointerEvent;if(this.active?.id!==e.pointerId)return;this.active=null;this.end?.();if(this.node.hasPointerCapture(e.pointerId))this.node.releasePointerCapture(e.pointerId);};
  for(const kind of ['pointerup','pointercancel','lostpointercapture'])this.node.addEventListener(kind,finish,options);
  this.node.addEventListener('contextmenu',e=>e.preventDefault(),options);
 }
 private bound(e:PointerEvent):Bound{return {getPoint:()=>this._getMousePoint(e),preventDefault:()=>e.preventDefault()};}
 addPointerStartListener(fn:(e:Bound)=>void){this.start=fn;}
 addPointerMoveListener(fn:(e:Bound)=>void){this.move=fn;}
 addPointerEndListener(fn:()=>void){this.end=fn;}
 getBoundingClientRect(){return this.node.getBoundingClientRect();}
 updateDimensions(w:string|number,h:string|number){this.node.setAttribute('width',String(w));this.node.setAttribute('height',String(h));}
 createSubRenderTarget(){const g=document.createElementNS('http://www.w3.org/2000/svg','g');this.svg.appendChild(g);return new WritingSvgTarget(g,this.defs,this.penOnly);}
 _getMousePoint(e:MouseEvent){const box=this.node.getBoundingClientRect();return {x:e.clientX-box.left,y:e.clientY-box.top};}
 _getTouchPoint(e:TouchEvent){const box=this.node.getBoundingClientRect(),point=e.touches[0];return {x:point.clientX-box.left,y:point.clientY-box.top};}
 _eventify<T extends Event>(e:T,point:(e:T)=>{x:number;y:number}){return {getPoint:()=>point(e),preventDefault:()=>e.preventDefault()};}
 dispose(){this.listeners?.abort();this.active=null;}
}
