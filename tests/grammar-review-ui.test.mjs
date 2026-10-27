import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {indexedDB, IDBObjectStore} from 'fake-indexeddb';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const b=await build({stdin:{contents:`export {default as Review} from './app/hsk3-grammar-review';export {useCourseProgress} from './app/course-store';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent',alias:{react:require.resolve('react').replace(/\/index\.js$/,'')},plugins:[{name:'test-context',setup(build){build.onResolve({filter:/^\.\/i18n$/},()=>({path:'i18n',namespace:'test'}));build.onResolve({filter:/^\.\/auth-client$/},()=>({path:'auth',namespace:'test'}));build.onLoad({filter:/.*/,namespace:'test'},args=>({contents:args.path==='i18n'?`export const useI18n=()=>({locale:'en'});`:`export const authenticatedFetch=(...args)=>globalThis.grammarFetch(...args);`,loader:'js'}));}}]});
// Bundled React and its renderer share one instance; CJS libraries need require.
globalThis.require=require;
const file=join(mkdtempSync(join(tmpdir(),'grammar-ui-')),'bundle.mjs');writeFileSync(file,b.outputFiles[0].text);
const m=await import(pathToFileURL(file));
globalThis.indexedDB=indexedDB;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.window=new EventTarget();Object.defineProperty(navigator,'onLine',{value:true,configurable:true});
const tick=()=>new Promise(r=>setTimeout(r,10));
const button=(node,label)=>node.root.findAllByType('button').find(b=>b.children.join('')===label);
async function settle(){await m.act(async()=>{await tick();});}
async function mount(owner=null){let root;await m.act(async()=>{root=m.renderer.create(m.createElement(m.Review,{owner,onBack(){}}));});await settle();return root;}
test('actual review component hides hints, persists one answer for double click, without duplicate credit',async()=>{
 globalThis.grammarFetch=async()=>Response.json({events:[]});
 const root=await mount();
 await m.act(async()=>button(root,'Start new reviews').props.onClick());
 assert.equal(root.root.findAllByType('aside').length,0);
 const option=root.root.findAllByType('button').find(b=>b.props['aria-pressed']===false);
 await m.act(async()=>option.props.onClick());
 const check=button(root,'Check answer');await m.act(async()=>{check.props.onClick();check.props.onClick();await tick();});
 assert.equal(root.root.findAllByType('aside').length,1);
 const db=await indexedDB.open('chinese-os-course-v1-guest');
 // Read through a separate normal IDB connection.
 const opened=await new Promise((resolve,reject)=>{db.onsuccess=()=>resolve(db.result);db.onerror=()=>reject(db.error);});
 const rows=await new Promise(resolve=>{const r=opened.transaction('events').objectStore('events').getAll();r.onsuccess=()=>resolve(r.result);});
 assert.equal(rows.length,1);assert.equal(rows[0].assisted,false);assert.equal(rows[0].lessonId,'grammar-hsk3');opened.close();
 await m.act(async()=>root.unmount());
});
test('hint is recorded as assisted; explanations remain hidden before use',async()=>{
 const root=await mount('hint-'+crypto.randomUUID());
 await m.act(async()=>button(root,'Start new reviews').props.onClick());
 assert.equal(root.root.findAllByType('aside').length,0);
 await m.act(async()=>button(root,'Show hint (assisted)').props.onClick());
 assert.equal(root.root.findAllByType('aside').length,1);
 let uploaded;
 globalThis.grammarFetch=async(url,init)=>{if(init.method==='POST')uploaded=JSON.parse(init.body).events[0];return Response.json({events:uploaded?[uploaded]:[]});};
 await m.act(async()=>root.root.findAllByType('button').find(b=>b.props['aria-pressed']===false).props.onClick());
 await m.act(async()=>{button(root,'Check answer').props.onClick();await tick();});await settle();await settle();
 assert.equal(uploaded?.assisted,true);
 await m.act(async()=>root.unmount());
});
test('failed device save reveals no answer and retry reuses the original submission UUID',async()=>{
 globalThis.grammarFetch=async()=>Response.json({events:[]});
 const root=await mount('retry-'+crypto.randomUUID());
 await m.act(async()=>button(root,'Start new reviews').props.onClick());
 await m.act(async()=>root.root.findAllByType('button').find(b=>b.props['aria-pressed']===false).props.onClick());
 const original=IDBObjectStore.prototype.put, ids=[];
 IDBObjectStore.prototype.put=function(value,...args){ids.push(value.id);if(ids.length===1)throw Error('Disk failure');return original.call(this,value,...args);};
 try{
  await m.act(async()=>{button(root,'Check answer').props.onClick();await tick();});
  assert.equal(root.root.findAllByType('aside').length,0);
  assert.equal(root.root.findAllByProps({role:'alert'}).length,1);
  await m.act(async()=>{button(root,'Retry save').props.onClick();await tick();});
  assert.equal(root.root.findAllByType('aside').length,1);
  assert.ok(ids.length>=2);assert.equal(new Set(ids).size,1);
 }finally{IDBObjectStore.prototype.put=original;await m.act(async()=>root.unmount());}
});
test('hook immediately hides previous-owner history and readiness while the new notebook opens',async()=>{
 globalThis.grammarFetch=async()=>Response.json({events:[]});
 let progress;
 function Probe({owner}){progress=m.useCourseProgress(owner);return null;}
 let root;await m.act(async()=>{root=m.renderer.create(m.createElement(Probe,{owner:null}));});await settle();
 assert.equal(progress.ready,true);
 const oldRecord=progress.record;
 await m.act(async()=>root.update(m.createElement(Probe,{owner:'bob-'+crypto.randomUUID()})));
 assert.equal(progress.ready,false);assert.deepEqual(progress.events,[]);
 await assert.rejects(oldRecord({}),/Account changed/);
 await settle();assert.equal(progress.ready,true);
 await m.act(async()=>root.unmount());
});
test.after(()=>{for(const handle of process._getActiveHandles())if(handle.constructor.name==='MessagePort')handle.unref();});
