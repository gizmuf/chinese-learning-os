import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {createRequire} from 'node:module';import {mkdtempSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);globalThis.require=require;globalThis.IS_REACT_ACT_ENVIRONMENT=true;const listeners=new Map();globalThis.window={devicePixelRatio:1,addEventListener(k,f){if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(f)},removeEventListener(k,f){listeners.get(k)?.delete(f)}};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const captures=new Set(),ctx={setTransform(){},clearRect(){},drawImage(){}},canvas=()=>({width:0,height:0,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:200,height:200}),setPointerCapture:id=>captures.add(id),releasePointerCapture:id=>captures.delete(id),hasPointerCapture:id=>captures.has(id)});globalThis.document={createElement:canvas};const target=canvas();
const b=await build({stdin:{contents:`import React,{useState} from 'react';import Ink from './app/ink';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';export function Harness(){const [strokes,setStrokes]=useState([]);globalThis.__clearInk=()=>setStrokes([]);globalThis.__echoInk=value=>setStrokes(value);return React.createElement(Ink,{strokes,penOnly:true,quietTouch:globalThis.__quietTouch,onChange:value=>{globalThis.__committedInk.push(value);setStrokes(value);}});}`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'mocks',setup(b){b.onResolve({filter:/^(react|react-test-renderer)$/},a=>({path:require.resolve(a.path),external:true}));b.onResolve({filter:/^\.\/(i18n|ink-render)$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='./i18n'?`export const useI18n=()=>({t:s=>s});`:`export const paintInk=()=>{};`}));}}]});const file=join(mkdtempSync(join(tmpdir(),'rapid-ink-')),'bundle.mjs');writeFileSync(file,b.outputFiles[0].text);const m=await import(pathToFileURL(file));
const event=(id,x=20,type='pen')=>({pointerId:id,pointerType:type,button:0,clientX:x,clientY:30,pressure:.5,timeStamp:x,currentTarget:target,preventDefault(){},nativeEvent:{pointerId:id,pointerType:type,clientX:x,clientY:30,pressure:.5,timeStamp:x}});
async function mount(){captures.clear();globalThis.__committedInk=[];let r;await m.act(()=>{r=m.renderer.create(m.createElement(m.Harness),{createNodeMock:n=>n.type==='canvas'?target:null});});return r;}

test('two canvases do not cross-write after missing up and reused Pencil id',async()=>{
 globalThis.__committedInk=[];const a=canvas(),b=canvas();a.setPointerCapture=()=>{throw Error('NotFoundError')};let ra,rb;
 await m.act(()=>{ra=m.renderer.create(m.createElement(m.Harness),{createNodeMock:n=>n.type==='canvas'?a:null});rb=m.renderer.create(m.createElement(m.Harness),{createNodeMock:n=>n.type==='canvas'?b:null});});
 const pa=()=>ra.root.findByType('canvas').props,pb=()=>rb.root.findByType('canvas').props;
 await m.act(()=>{pa().onPointerDown({...event(7,20),currentTarget:a});pa().onPointerMove({...event(7,40),currentTarget:a});});
 await m.act(()=>{for(const f of listeners.get('pointerdown'))f({...event(8,50,'touch').nativeEvent,target:b});});
 assert.equal(__committedInk.length,0,'a palm in another box must not end the active Pencil');
 // No up arrived for A. The next physical stroke starts in B using ID 7.
 await m.act(()=>{for(const f of listeners.get('pointerdown'))f({...event(7,60).nativeEvent,target:b});pb().onPointerDown({...event(7,60),currentTarget:b});const e={...event(7,80).nativeEvent,target:b,preventDefault(){}};pb().onPointerMove({...event(7,80),currentTarget:b});for(const f of listeners.get('pointermove'))f(e);for(const f of listeners.get('pointerup'))f({...event(7,100).nativeEvent,target:b});});

 assert.deepEqual(__committedInk[0][0].map(p=>p.x),[.1,.2], 'new B stroke must not extend old A stroke');
 assert.deepEqual(__committedInk[1][0].map(p=>p.x),[.3,.4,.5]);
 await m.act(()=>{ra.unmount();rb.unmount();});
 assert.equal([...listeners.values()].reduce((n,set)=>n+set.size,0),0);
});
