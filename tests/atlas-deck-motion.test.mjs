import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
// Run the real hook against a small DOM boundary. Animation never completes:
// releasing the mouse must still select the next card synchronously.
const result=await build({entryPoints:['app/atlas-deck-motion.ts'],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'hook-boundary',setup(b){b.onResolve({filter:/^react$/},()=>({path:'react',namespace:'hooks'}));b.onLoad({filter:/.*/,namespace:'hooks'},()=>({contents:`export const refs=[];export function useRef(current){const ref={current};refs.push(ref);return ref}export function useEffect(){}export function useLayoutEffect(fn){fn()}` ,loader:'js'}))}}]});
const {useDeckMotion}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('A drag commits on mouse release without waiting for animation completion',()=>{
 const saved={matchMedia:globalThis.matchMedia,getComputedStyle:globalThis.getComputedStyle};
 globalThis.matchMedia=()=>({matches:false});globalThis.getComputedStyle=el=>({transform:el.style.transform??'none'});
 try{
  const front={dataset:{deckOffset:'0',deckHanzi:'日'},style:{},offsetWidth:300};
  const next={dataset:{deckOffset:'1',deckHanzi:'旧'},style:{}};
  let capture=0,commits=0,prevented=0;
  const button={setPointerCapture(id){capture=id}};
  const root={querySelectorAll:()=>[front,next],querySelector:s=>s==='.is-active'?front:next,setAttribute(){},removeAttribute(){}};
  const hook=useDeckMotion('日',()=>true);hook.ref.current=root;
  const event=(x,buttons=1)=>({button:0,isPrimary:true,pointerType:'mouse',pointerId:7,clientX:x,clientY:10,buttons,target:{closest:()=>button},currentTarget:root,preventDefault(){prevented++}});
  hook.pointerDown(event(200));assert.equal(capture,7);
  hook.pointerMove(event(176));
  // Some mouse paths report the released buttons before delivering pointerup.
  hook.pointerMove(event(176,0));
  hook.pointerUp(event(176,0),d=>{assert.equal(d,1);return hook.transition(d,()=>commits++)});
  assert.equal(commits,1);assert.equal(prevented,1);
  hook.lostPointerCapture(event(176,0));assert.equal(commits,1);
  let suppressed=0;hook.clickCapture({preventDefault(){suppressed++},stopPropagation(){}});assert.equal(suppressed,1);
 }finally{for(const [key,value] of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value}}
});
