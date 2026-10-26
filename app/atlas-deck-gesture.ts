/** A deliberate short horizontal drag turns one card, independent of speed or hold time. */
export function deckSwipe(dx:number,dy:number):-1|0|1{
 if(![dx,dy].every(Number.isFinite))return 0;
 return Math.abs(dx)>=18&&Math.abs(dx)>Math.abs(dy)*1.3?(dx<0?1:-1):0;
}
export type WheelGesture={at:number;distance:number;handled:boolean};
/** Trackpad momentum belongs to one gesture, rather than a stream of card turns. */
export function deckWheel(previous:WheelGesture,dx:number,dy:number,at:number){
 const state=at-previous.at>180?{at,distance:0,handled:false}:{...previous,at};
 if(![dx,dy,at].every(Number.isFinite)||Math.abs(dx)<2||Math.abs(dx)<=Math.abs(dy)*1.3)return {state,direction:0 as -1|0|1,consume:false};
 state.distance+=dx;let direction:-1|0|1=0;
 if(!state.handled&&Math.abs(state.distance)>=24){direction=state.distance>0?1:-1;state.handled=true}
 return {state,direction,consume:true};
}
