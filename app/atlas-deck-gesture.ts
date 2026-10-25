/** A short flick is intentional by speed; a slow drag is intentional by distance. */
export function deckSwipe(dx:number,dy:number,durationMs:number,velocity=0):-1|0|1{
 if(![dx,dy,durationMs,velocity].every(Number.isFinite))return 0;
 const distance=Math.abs(dx);if(distance<16||distance<=Math.abs(dy)*1.3)return 0;
 const sameDirection=velocity*dx>0;
 return distance>=36||distance/Math.max(16,durationMs)>=.25||(sameDirection&&Math.abs(velocity)>=.25)?dx<0?1:-1:0;
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
