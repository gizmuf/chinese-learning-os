import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {createRequire} from 'node:module';import {mkdtempSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);globalThis.require=require;globalThis.IS_REACT_ACT_ENVIRONMENT=true;const listeners=new Map();globalThis.window={devicePixelRatio:1,addEventListener(k,f){listeners.set(k,f)},removeEventListener(k){listeners.delete(k)}};globalThis.ResizeObserver=class{observe(){}disconnect(){}};let nextFrame=0;
const frames=new Map();
globalThis.requestAnimationFrame=draw=>{frames.set(++nextFrame,draw);return nextFrame;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
function paintFrame(){for(const [id,draw] of [...frames]){frames.delete(id);draw();}}
const draws={copies:0,lines:0,commits:0};
const captures=new Set(),ctx={setTransform(){},clearRect(){},drawImage(){draws.copies++;},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){draws.lines++;},stroke(){}},canvas=()=>({width:0,height:0,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:200,height:200}),setPointerCapture:id=>captures.add(id),releasePointerCapture:id=>captures.delete(id),hasPointerCapture:id=>captures.has(id)});globalThis.document={createElement:canvas};const target=canvas();
const b=await build({stdin:{contents:`import React,{useState} from 'react';import Ink from './app/ink';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';export function Harness(){const [strokes,setStrokes]=useState([]);globalThis.__clearInk=()=>setStrokes([]);globalThis.__echoInk=value=>setStrokes(value);return React.createElement(Ink,{strokes,penOnly:true,lineStyle:'pen',quietTouch:globalThis.__quietTouch,onChange:value=>{globalThis.__committedInk.push(value);setStrokes(value);}});}`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'mocks',setup(b){b.onResolve({filter:/^(react|react-test-renderer)$/},a=>({path:require.resolve(a.path),external:true}));b.onResolve({filter:/^\.\/(i18n|ink-render)$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='./i18n'?`export const useI18n=()=>({t:s=>s});`:`export const writingPenWidth=()=>2.8;export const paintInk=(_ctx,_stroke,_w,_h,complete)=>{if(complete)globalThis.__recordInkCommit();};`}));}}]});const file=join(mkdtempSync(join(tmpdir(),'rapid-ink-')),'bundle.mjs');writeFileSync(file,b.outputFiles[0].text);const m=await import(pathToFileURL(file));
const event=(id,x=20,type='pen')=>({pointerId:id,pointerType:type,button:0,clientX:x,clientY:30,pressure:.5,timeStamp:x,currentTarget:target,preventDefault(){},nativeEvent:{pointerId:id,pointerType:type,clientX:x,clientY:30,pressure:.5,timeStamp:x}});
globalThis.__recordInkCommit=()=>draws.commits++;
async function mount(){captures.clear();globalThis.__committedInk=[];let r;await m.act(()=>{r=m.renderer.create(m.createElement(m.Harness),{createNodeMock:n=>n.type==='canvas'?target:null});});return r;}
test('starting the next Pencil stroke before React echoes the previous stroke must not lose the new contact',async()=>{const r=await mount();const ink=()=>r.root.findByType('canvas').props;await m.act(()=>{ink().onPointerDown(event(7));ink().onPointerUp(event(7,40));ink().onPointerDown(event(7,60));});await m.act(()=>{ink().onPointerMove(event(7,80));ink().onPointerUp(event(7,100));});assert.equal(__committedInk.length,2);assert.equal(__committedInk.at(-1).length,2);await m.act(()=>r.unmount());});
test('a delayed lost-capture notification from the previous contact cannot cancel a newly captured stroke with the reused Pencil ID',async()=>{const r=await mount();const ink=()=>r.root.findByType('canvas').props;await m.act(()=>{ink().onPointerDown(event(7));ink().onPointerUp(event(7,40));});await m.act(()=>{ink().onPointerDown(event(7,60));ink().onLostPointerCapture(event(7,40));ink().onPointerUp(event(7,100));});assert.equal(__committedInk.at(-1).length,2);await m.act(()=>r.unmount());});
test('an external Clear still cancels unfinished ink, and a palm cannot end a Pencil stroke',async()=>{const r=await mount();const ink=()=>r.root.findByType('canvas').props;await m.act(()=>ink().onPointerDown(event(7)));await m.act(()=>__clearInk());await m.act(()=>ink().onPointerUp(event(7,40)));assert.equal(__committedInk.length,0);await m.act(()=>{ink().onPointerDown(event(7));ink().onPointerCancel(event(9,40,'touch'));ink().onPointerUp(event(7,60));});assert.equal(__committedInk.at(-1).length,1);await m.act(()=>r.unmount());});

test('a resting palm is silently rejected in the notebook without stealing the active Pencil contact',async()=>{globalThis.__quietTouch=true;const r=await mount();const ink=()=>r.root.findByType('canvas').props;let prevented=0;await m.act(()=>{ink().onPointerDown(event(7));ink().onPointerDown({...event(8,45,'touch'),preventDefault(){prevented++;}});ink().onPointerUp(event(7,60));});assert.equal(prevented,1);assert.equal(__committedInk.at(-1).length,1);assert.equal(r.root.findAllByProps({className:'canvas-notice'}).length,0);await m.act(()=>r.unmount());globalThis.__quietTouch=false;});

test('an interrupted Pencil contact keeps its collected ink and the very next contact writes immediately',async()=>{
 const r=await mount();const ink=()=>r.root.findByType('canvas').props;
 await m.act(()=>{ink().onPointerDown(event(7));ink().onPointerMove(event(7,40));ink().onPointerCancel(event(7,0));});
 assert.equal(__committedInk.length,1,'a browser cancellation must not discard accepted Pencil points');
 assert.equal(__committedInk[0][0].at(-1).x,.2,'cancellation coordinates must not add a false line to the origin');
 await m.act(()=>{ink().onPointerDown(event(7,60));ink().onPointerUp(event(7,90));});
 assert.equal(__committedInk.at(-1).length,2);await m.act(()=>r.unmount());
});
test('a fresh Pencil down recovers a missing previous up instead of consuming the next stroke',async()=>{
 const r=await mount();const ink=()=>r.root.findByType('canvas').props;
 await m.act(()=>{ink().onPointerDown(event(7));ink().onPointerMove(event(7,40));});
 await m.act(()=>{ink().onPointerDown(event(7,60));ink().onPointerMove(event(7,80));ink().onPointerUp(event(7,100));});
 assert.equal(__committedInk.length,2,'retain the interrupted contact and accept the new stroke on its first attempt');
 assert.equal(__committedInk.at(-1)[1][0].x,.3);await m.act(()=>r.unmount());
});
test('losing capture retains collected points once, and a later up cannot duplicate them',async()=>{
 const r=await mount();const ink=()=>r.root.findByType('canvas').props;
 await m.act(()=>{ink().onPointerDown(event(7));ink().onPointerMove(event(7,40));captures.delete(7);ink().onLostPointerCapture(event(7,0));ink().onPointerUp(event(7,60));});
 assert.equal(__committedInk.length,1);assert.equal(__committedInk[0][0].length,2);await m.act(()=>r.unmount());
});

test('a delayed echo of an older committed stroke cannot erase a newer stroke in progress',async()=>{
 const r=await mount();const ink=()=>r.root.findByType('canvas').props;
 await m.act(()=>{ink().onPointerDown(event(7));ink().onPointerUp(event(7,40));});
 const first=__committedInk[0];
 await m.act(()=>{ink().onPointerDown(event(7,50));ink().onPointerUp(event(7,70));});
 await m.act(()=>{ink().onPointerDown(event(7,80));__echoInk(first);});
 await m.act(()=>{ink().onPointerMove(event(7,100));ink().onPointerUp(event(7,120));});
 assert.equal(__committedInk.at(-1).length,3);await m.act(()=>r.unmount());
});
test('Safari capture rejection must not discard a valid contact or require drawing it twice',async()=>{
 const r=await mount();const ink=()=>r.root.findByType('canvas').props;const old=target.setPointerCapture;
 target.setPointerCapture=()=>{throw new Error('NotFoundError');};
 try{await m.act(()=>{ink().onPointerDown(event(7));ink().onPointerMove(event(7,50));ink().onPointerUp(event(7,80));});assert.equal(__committedInk.at(-1).length,1);}
 finally{target.setPointerCapture=old;await m.act(()=>r.unmount());}
});

test('capture fallback continues and finishes a stroke outside the canvas exactly once',async()=>{
 const r=await mount();const ink=()=>r.root.findByType('canvas').props;const old=target.setPointerCapture;
 target.setPointerCapture=()=>{throw new Error('NotFoundError');};
 try{await m.act(()=>{ink().onPointerDown(event(7));listeners.get('pointermove')({...event(7,60).nativeEvent,preventDefault(){}});listeners.get('pointerup')({...event(7,90).nativeEvent,preventDefault(){}});ink().onPointerUp(event(7,90));});assert.equal(__committedInk.length,1);assert.equal(__committedInk[0][0].at(-1).x,.45);}
 finally{target.setPointerCapture=old;await m.act(()=>r.unmount());}assert.equal(listeners.size,0);
});

test('late loss of old capture does not truncate a new contact whose capture was rejected',async()=>{
 const r=await mount();const ink=()=>r.root.findByType('canvas').props;const old=target.setPointerCapture;
 await m.act(()=>{ink().onPointerDown(event(7));ink().onPointerUp(event(7,40));});
 target.setPointerCapture=()=>{throw new Error('NotFoundError');};
 try{await m.act(()=>{ink().onPointerDown(event(7,60));ink().onLostPointerCapture(event(7,40));ink().onPointerMove(event(7,80));ink().onPointerUp(event(7,100));});assert.deepEqual(__committedInk.at(-1)[1].map(p=>p.x),[.3,.4,.5]);}
 finally{target.setPointerCapture=old;await m.act(()=>r.unmount());}
});

test('pen preview appends new samples and pointer-up paints only the newly saved stroke',async()=>{
 const r=await mount();const ink=()=>r.root.findByType('canvas').props;
 try{
  paintFrame();
  await m.act(()=>{ink().onPointerDown(event(7));ink().onPointerUp(event(7,35));});
  paintFrame();
  Object.assign(draws,{copies:0,lines:0,commits:0});
  await m.act(()=>{ink().onPointerDown(event(7,40));ink().onPointerMove(event(7,60));});
  paintFrame();
  assert.deepEqual(draws,{copies:0,lines:1,commits:0});
  await m.act(()=>{ink().onPointerMove(event(7,80));ink().onPointerMove(event(7,100));});
  paintFrame();
  assert.deepEqual(draws,{copies:0,lines:3,commits:0});
  await m.act(()=>ink().onPointerUp(event(7,100)));
  paintFrame();
  assert.deepEqual(draws,{copies:1,lines:3,commits:1});
 }finally{await m.act(()=>r.unmount());}
});
