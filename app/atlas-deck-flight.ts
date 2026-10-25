/** A browser animation may reject or stop reporting completion after losing focus. */
export function settleDeckFlight(finished:Promise<unknown>,commit:()=>void,abort:()=>void,forceFinish:()=>void,timeout=650){
 let active=true;
 const finish=()=>{if(!active)return;active=false;clearTimeout(timer);commit()};
 const timer=setTimeout(()=>{if(!active)return;try{forceFinish();finish()}catch{if(active){active=false;abort()}}},timeout);
 void finished.then(finish,()=>{if(!active)return;active=false;clearTimeout(timer);abort()});
 return {cancel(){active=false;clearTimeout(timer)}};
}
