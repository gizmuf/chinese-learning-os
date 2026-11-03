import {referenceMovementDeixis,type ReferencePoint} from './reference-lesson-state';
export const referenceDirections=[
 {id:'in',label:'Into a room',root:'进',pinyin:'jìn',from:{x:100,y:245},to:{x:490,y:245}},
 {id:'out',label:'Out of a room',root:'出',pinyin:'chū',from:{x:490,y:245},to:{x:100,y:245}},
 {id:'over',label:'Across / over',root:'过',pinyin:'guò',from:{x:100,y:245},to:{x:520,y:245}},
 {id:'back',label:'Back to a place',root:'回',pinyin:'huí',from:{x:500,y:245},to:{x:110,y:245}},
 {id:'up',label:'Up the stairs',root:'上',pinyin:'shàng',from:{x:130,y:250},to:{x:490,y:70}},
 {id:'down',label:'Down the stairs',root:'下',pinyin:'xià',from:{x:490,y:70},to:{x:130,y:250}},
] as const;
export function referenceMovementState(direction:number,speakerAtEnd:boolean,progress:number){
 const scene=referenceDirections[Math.max(0,Math.min(referenceDirections.length-1,Math.trunc(direction)))],speaker:ReferencePoint=speakerAtEnd?scene.to:scene.from,suffix=referenceMovementDeixis(speaker,scene.from,scene.to),t=Math.max(0,Math.min(1,progress));
 let actor={x:scene.from.x+(scene.to.x-scene.from.x)*t,y:scene.from.y+(scene.to.y-scene.from.y)*t};
 // The stair actor follows actual horizontal treads and vertical risers.
 if(scene.id==='up'||scene.id==='down'){
  const start=scene.id==='up'?scene.from:scene.to,end=scene.id==='up'?scene.to:scene.from,u=scene.id==='up'?t:1-t,step=Math.min(3,Math.floor(u*4)),within=u===1?1:u*4-step;
  actor={x:start.x+(end.x-start.x)*(step+Math.min(1,within*2))/4,y:start.y+(end.y-start.y)*(step+Math.max(0,within*2-1))/4};
 }
 return {scene,speaker,actor,suffix,hanzi:scene.root+suffix,pinyin:scene.pinyin+' '+(suffix==='来'?'lái':'qù'),en:(suffix==='来'?'toward the speaker':'away from the speaker')+' · '+scene.label.toLowerCase(),arrived:t===1};
}
