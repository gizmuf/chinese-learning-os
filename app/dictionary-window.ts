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
export type WindowRect=WindowPoint&WindowSize;
export type ResizeEdge='n'|'s'|'e'|'w'|'ne'|'nw'|'se'|'sw';
export function readDictionarySize(value:unknown):WindowSize|undefined{
 if(!value||typeof value!=='object')return;const {width,height}=value as WindowSize;
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return;
 return {width:Math.min(760,width),height:Math.min(2000,height)};
}
export function fitDictionarySize(size:WindowSize,bounds:WindowBounds):WindowSize{
 const width=Math.max(1,bounds.width-24),height=Math.max(1,bounds.height-24);
 return {width:Math.min(width,Math.max(Math.min(260,width),Math.min(760,size.width))),height:Math.min(height,Math.max(Math.min(240,height),size.height))};
}
export function resizeDictionaryWindow(rect:WindowRect,edge:ResizeEdge,delta:WindowPoint,bounds:WindowBounds):WindowRect{
 const minWidth=Math.min(260,bounds.width-24),minHeight=Math.min(240,bounds.height-24);
 let left=rect.x,top=rect.y,right=rect.x+rect.width,bottom=rect.y+rect.height;
 if(edge.includes('w'))left=Math.max(bounds.left+12,right-760,Math.min(right-minWidth,rect.x+delta.x));
 if(edge.includes('e'))right=Math.min(bounds.left+bounds.width-12,left+760,Math.max(left+minWidth,right+delta.x));
 if(edge.includes('n'))top=Math.max(bounds.top+12,Math.min(bottom-minHeight,rect.y+delta.y));
 if(edge.includes('s'))bottom=Math.min(bounds.top+bounds.height-12,Math.max(top+minHeight,bottom+delta.y));
 return {x:left,y:top,width:right-left,height:bottom-top};
}
