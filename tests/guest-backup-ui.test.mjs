import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
import {build} from 'esbuild';
import {IDBFactory, IDBObjectStore} from 'fake-indexeddb';
import {createElement} from 'react';
import {act, create} from 'react-test-renderer';

const {outputFiles:[bundle]}=await build({
 stdin:{contents:`export {default as GuestBackup} from './app/guest-backup';
 export {openStore, allEvents, readDraft} from './app/local-store';`,resolveDir:process.cwd()},
 bundle:true, platform:'node', format:'cjs', jsx:'automatic', write:false,
 external:['react','react/jsx-runtime','react/jsx-dev-runtime'],
});
const module={exports:{}};
new Function('require','exports','module',bundle.text)(createRequire(import.meta.url),module.exports,module);
const {GuestBackup,openStore,allEvents,readDraft}=module.exports;

const readingKey='chinese-os:reading-lab:v1:guest';
const writingId='notebook:hello';
const stroke=[{x:0.5,y:0.6,p:0.4,t:1}];
const event={
 id:'542815b9-7b3d-4308-8f52-a80f9c40426f',itemId:'hello',skill:'meaning',mode:'recall',
 rating:3,assisted:false,at:1,timezone:'UTC',detail:{},synced:false,
};
const fixture=JSON.stringify({
 format:'chinese-os-guest-backup',version:1,owner:'guest',createdAt:'2026-11-15T00:00:00.000Z',
 events:{progress:[event],atlas:[],course:[],recognition:[],connectionLab:[]},
 drafts:[{key:writingId,value:{cells:{'0:0':[stroke]},hidden:false,attemptId:'f064cdff-c622-459f-8b7a-ad95ddb73aa7'}}],
 preferences:[{key:readingKey,value:JSON.stringify({version:1,drafts:{'hsk2-library-meeting':'在图书馆见。'}})}],
});
function text(node) {
 if(typeof node==='string')return node;
 if(Array.isArray(node))return node.map(text).join('');
 return node?.children?text(node.children):'';
}
const content=root=>text(root.toJSON());
const file=(value=fixture)=>new File([value],'notebook.json',{type:'application/json'});
const item=(root,label)=>root.root.findAllByType('button').find(node=>node.props.children.includes?.(label));
const click=(root,label)=>act(async()=>{const node=item(root,label);assert.ok(node,label);assert.equal(node.props.disabled,false);node.props.onClick();});

async function until(check) {
 for(let attempt=0;attempt<80;attempt++){
  if(check())return;
  await act(async()=>new Promise(resolve=>setTimeout(resolve,2)));
 }
 assert.ok(check(),'expected state did not settle');
}
async function mount(t) {
 const saved=Object.fromEntries(['FileReader','localStorage','indexedDB','IS_REACT_ACT_ENVIRONMENT'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const settings=new Map(), readers=[];
 globalThis.indexedDB=new IDBFactory();
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  get length(){return settings.size;},key:index=>[...settings.keys()][index]??null,getItem:key=>settings.get(key)??null,
  setItem:(key,value)=>settings.set(key,value),removeItem:key=>settings.delete(key),
 }});
 globalThis.FileReader=class {
  readAsText(selected){this.file=selected;readers.push(this);}
  async succeed(){this.result=await this.file.text();this.onload();this.onloadend();}
  fail(){this.onerror();this.onloadend();}
  abort(){this.aborted=true;this.onabort();this.onloadend();}
 };
 let root;
 t.after(async()=>{
  if(root)await act(async()=>root.unmount());
  for(const [key,descriptor] of Object.entries(saved)){
   if(descriptor)Object.defineProperty(globalThis,key,descriptor);
   else delete globalThis[key];
  }
 });
 await act(async()=>{root=create(createElement(GuestBackup,{disabled:false}));});
 return {
  root, settings, readers,
  async select(selected=file()){
   const input={files:[selected],value:'notebook.json'};
   const before=readers.length;
   await act(async()=>root.root.findByType('input').props.onChange({currentTarget:input}));
   await until(()=>readers.length>before);
   return {reader:readers.at(-1),input};
  },
  async unmount(){await act(async()=>root.unmount());root=null;},
 };
}
async function localRows(){
 const db=await openStore('guest');
 try{return {events:await allEvents(db),writing:await readDraft(db,writingId)};}finally{db.close();}
}

test('mounted guest panel previews a real backup, restores only on confirmation, and reports kept records on repeat',async t=>{
 const {root,select,settings}=await mount(t);
 const {reader,input}=await select();
 assert.match(content(root),/Working with the notebook/);
 assert.equal(input.value,'notebook.json');
 await act(async()=>reader.succeed());
 await until(()=>content(root).includes('Records in this backup'));
 assert.match(content(root),/Vocabulary attempts · 1/);
 assert.match(content(root),/Notebook records · 1/);
 assert.match(content(root),/Preferences and reading checkpoints · 1/);
 assert.equal(input.value,'');
 assert.deepEqual(await localRows(),{events:[],writing:undefined});
 assert.equal(settings.size,0);
 await click(root,'Restore to this device');
 await until(()=>content(root).includes('Restore finished'));
 assert.deepEqual((await localRows()).events,[event]);
 assert.deepEqual((await localRows()).writing.cells,{'0:0':[stroke]});
 assert.equal(JSON.parse(settings.get(readingKey)).drafts['hsk2-library-meeting'],'在图书馆见。');

 const repeated=await select();
 await act(async()=>repeated.reader.succeed());
 await until(()=>content(root).includes('Records in this backup'));
 await click(root,'Restore to this device');
 await until(()=>content(root).includes('Restore finished'));
 assert.match(content(root),/Preferences and learning checkpoints · 0 added or merged, 1 kept/);
 assert.equal((await localRows()).events.length,1);
});

test('mounted guest panel keeps a failed group retryable without rolling back independent progress',async t=>{
 const {root,select,settings}=await mount(t);
 const selected=await select();
 await act(async()=>selected.reader.succeed());
 await until(()=>content(root).includes('Records in this backup'));
 const original=IDBObjectStore.prototype.put;
 const quota=t.mock.method(IDBObjectStore.prototype,'put',function(...args){
  if(this.name==='drafts')throw new DOMException('quota','QuotaExceededError');
  return original.apply(this,args);
 });
 await click(root,'Restore to this device');
 await until(()=>content(root).includes('Restore did not finish'));
 assert.match(content(root),/Restore did not finish for Vocabulary progress and notebook/);
 assert.doesNotMatch(content(root),/Restore finished/);
 assert.ok(settings.has(readingKey));
 assert.deepEqual(await localRows(),{events:[],writing:undefined});
 quota.mock.restore();
 await click(root,'Retry restore');
 await until(()=>content(root).includes('Restore finished'));
 assert.deepEqual((await localRows()).events,[event]);
 assert.deepEqual((await localRows()).writing.cells,{'0:0':[stroke]});
});

test('file error and validation failure unlock the picker for a known-good retry',async t=>{
 const {root,select}=await mount(t);
 const first=await select();
 await act(async()=>first.reader.fail());
 await until(()=>content(root).includes('The backup file could not be read'));
 assert.equal(first.input.value,'');
 assert.equal(root.root.findByType('input').props.disabled,false);
 const malformed=await select(file('bad JSON'));
 await act(async()=>malformed.reader.succeed());
 await until(()=>content(root).includes('This is not a valid Chinese OS guest backup'));
 assert.equal(item(root,'Restore to this device'),undefined);
 const valid=await select();
 await act(async()=>valid.reader.succeed());
 await until(()=>content(root).includes('Records in this backup'));
 assert.equal(root.root.findAllByProps({role:'alert'}).length,0);
});

test('a hung file read aborts at its deadline, unlocks retry, and ignores a stale successful result',async t=>{
 const {root,select}=await mount(t);
 const realTimeout=globalThis.setTimeout;
 const deadlines=[];
 t.mock.method(globalThis,'setTimeout',(callback,delay,...args)=>{
  if(delay===10_000){deadlines.push(callback);return realTimeout(()=>{},60_000);}
  return realTimeout(callback,delay,...args);
 });
 const stale=await select();
 assert.equal(deadlines.length,1);
 await act(async()=>deadlines[0]());
 await until(()=>content(root).includes('The backup file did not open'));
 assert.equal(stale.reader.aborted,true);
 assert.equal(stale.input.value,'');
 assert.equal(root.root.findByType('input').props.disabled,false);
 const next=await select(file('bad new file'));
 await act(async()=>stale.reader.succeed());
 assert.equal(item(root,'Restore to this device'),undefined);
 await act(async()=>next.reader.succeed());
 await until(()=>content(root).includes('This is not a valid Chinese OS guest backup'));
});

test('unmount aborts the active FileReader and clears the selected file handle',async t=>{
 const app=await mount(t);
 const {reader,input}=await app.select();
 await app.unmount();
 assert.equal(reader.aborted,true);
 assert.equal(input.value,'');
 assert.deepEqual(await localRows(),{events:[],writing:undefined});
 assert.equal(app.settings.size,0);
});
