import {build} from 'esbuild';
import test from 'node:test';import assert from 'node:assert/strict';
import {writeFileSync,mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const cwd=process.cwd();
const queue=`let jobs=[];export function savePrivateReader(db,owner,before,next){return new Promise(resolve=>jobs.push(()=>resolve({...before,reader:next,revision:before.revision+1})))}export const pending=()=>jobs.length;export const complete=()=>jobs.shift()?.();`;
const b=await build({stdin:{contents:`export {default as Lesson} from './app/shuoshuo-lesson';export {openStore} from './app/local-store';export * from '__queue';export {indexedDB} from 'fake-indexeddb';export {createElement} from 'react';export {create,act} from 'react-test-renderer';`,resolveDir:cwd},bundle:true,format:'esm',platform:'node',write:false,loader:{'.css':'empty'},plugins:[{name:'repro',setup(b){
 b.onResolve({filter:/__queue$/},()=>({path:'queue',namespace:'mock'}));
 b.onResolve({filter:/private-lessons-model$/},a=>a.importer.endsWith('/shuoshuo-lesson.tsx')?{path:'queue',namespace:'mock'}:undefined);
 b.onResolve({filter:/^\.\/(study-lookup|audio|shared-writing|recognition-review|atlas-word-scenes|hanzi-style)$/},a=>({path:a.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='queue'?queue:a.path==='./study-lookup'?`export const StudyText=({text})=>text;export const StudyLookupButton=()=>null;`:a.path==='./audio'?`export const stopAudio=()=>{};export const playRecording=()=>({addEventListener(){}});`:a.path==='./hanzi-style'?`export const HanziDisplayControls=()=>null;`:`export default ()=>null;`,loader:'js',resolveDir:cwd}));
 }}]});
const path=join(mkdtempSync(join(tmpdir(),'shuo-queue-')),'bundle.mjs');writeFileSync(path,b.outputFiles[0].text);const m=await import(pathToFileURL(path));globalThis.indexedDB=m.indexedDB;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
test('serialized reader saves stay busy until the latest queued patch completes',async()=>{
const tick=()=>new Promise(r=>setTimeout(r,5));const flush=()=>m.act(async()=>{await tick();await tick()});const db=await m.openStore('queue-review');let r;await m.act(async()=>{r=m.create(m.createElement(m.Lesson,{owner:'queue-review',db,onBack(){}}));await tick()});
const root=()=>r.root.findByProps({'aria-label':'A morning with Shuoshuo'});for(let n=0;n<100&&root().props['aria-busy'];n++)await flush();
await m.act(async()=>{for(const input of r.root.findAllByType('input').slice(0,2))input.props.onChange({target:{checked:false}});await tick()});
const before={busy:root().props['aria-busy'],pending:m.pending()};await m.act(async()=>{m.complete();await tick();await tick()});
const between={busy:root().props['aria-busy'],pending:m.pending()};await m.act(async()=>{m.complete();await tick()});const after={busy:root().props['aria-busy'],pending:m.pending()};assert.deepEqual(before,{busy:true,pending:1});assert.deepEqual(between,{busy:true,pending:1});assert.deepEqual(after,{busy:false,pending:0});assert.deepEqual(r.root.findAllByType('input').slice(0,2).map(input=>input.props.checked),[false,false]);await m.act(()=>r.unmount());db.close();for(const h of process._getActiveHandles())if(h.constructor.name==='MessagePort')h.unref();

});
