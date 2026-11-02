export type WindowPoint={x:number;y:number};
export type WindowBounds={left:number;top:number;width:number;height:number};
export type WindowSize={width:number;height:number};
const margin=12;
export function clampDictionaryPosition(point:WindowPoint,bounds:WindowBounds,size:WindowSize):WindowPoint{
 const maxX=Math.max(bounds.left+margin,bounds.left+bounds.width-size.width-margin),maxY=Math.max(bounds.top+margin,bounds.top+bounds.height-size.height-margin);
 return {x:Math.max(bounds.left+margin,Math.min(maxX,point.x)),y:Math.max(bounds.top+margin,Math.min(maxY,point.y))};
}
export function normalizeDictionaryPosition(point:WindowPoint,bounds:WindowBounds,size:WindowSize):WindowPoint{
 const safe=clampDictionaryPosition(point,bounds,size);return {x:(safe.x-bounds.left-margin)/Math.max(1,bounds.width-size.width-margin*2),y:(safe.y-bounds.top-margin)/Math.max(1,bounds.height-size.height-margin*2)};
}
export function restoreDictionaryPosition(value:unknown,bounds:WindowBounds,size:WindowSize):WindowPoint|undefined{
 if(!value||typeof value!=='object')return;const {x,y}=value as WindowPoint;if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1||y<0||y>1)return;
 return clampDictionaryPosition({x:bounds.left+margin+x*Math.max(0,bounds.width-size.width-margin*2),y:bounds.top+margin+y*Math.max(0,bounds.height-size.height-margin*2)},bounds,size);
}
