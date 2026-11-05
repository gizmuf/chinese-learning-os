import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {indexedDB} from 'fake-indexeddb';
const built=await build({entryPoints:['app/local-store.ts'],bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent'});
const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

test('blocked, rejected, unavailable and hanging opens reject; late successful opens close',async()=>{
 const original=globalThis.indexedDB;
 try{
  for(const scenario of ['blocked','error','hang','throw']){
   const request={};let closed=0;
   globalThis.indexedDB={open(){if(scenario==='throw')throw Error('denied');return request}};
   const result=m.openStore(scenario,10);
   const rejected=assert.rejects(result);
   if(scenario==='blocked')request.onblocked();
   if(scenario==='error'){request.error=Error('failed');request.onerror();}
   await rejected;
   if(scenario!=='throw'){request.result={close(){closed++}};request.onsuccess();assert.equal(closed,1);}
  }
 }finally{globalThis.indexedDB=original}
});

test('version changes close the connection; opening again retains saved data',async()=>{
 globalThis.indexedDB=indexedDB;
 let db=await m.openStore('storage-retention');await m.saveDraft(db,'saved',{id:'original'});
 db.onversionchange();db=await m.openStore('storage-retention');assert.deepEqual(await m.readDraft(db,'saved'),{id:'original'});db.close();
});

test('transaction abort after a successful read rejects instead of using uncommitted data',async()=>{
 let tx,request;
 const db={transaction(){tx={objectStore(){return {get(){request={};return request}}}};return tx}};
 const pending=m.readDraft(db,'draft');const rejected=assert.rejects(pending);
 request.result={id:'not-committed'};request.onsuccess();tx.onabort();await rejected;
});

test('hanging writes abort before rejecting, while committed writes resolve',async()=>{
 let aborted=0;
 const tx={objectStore(){return {}},abort(){aborted++}};
 await assert.rejects(m.storageTransaction({transaction(){return tx}},'drafts','readwrite',()=>{},10));assert.equal(aborted,1);
 const complete=m.storageTransaction({transaction(){return tx}},'drafts','readwrite',(_s,result)=>result('committed'),10);
 tx.oncomplete();assert.equal(await complete,'committed');
});

test('write failure preserves existing events and drafts',async()=>{
 globalThis.indexedDB=indexedDB;const db=await m.openStore('storage-rollback');
 const event={id:'original',itemId:'test',synced:true};await m.putEvents(db,[event]);await m.saveDraft(db,'saved',{id:'original'});
 await assert.rejects(m.storageTransaction(db,'events','readwrite',store=>{store.put({id:'uncommitted'});throw Error('failed')}));
 assert.deepEqual(await m.allEvents(db),[event]);assert.deepEqual(await m.readDraft(db,'saved'),{id:'original'});db.close();
});
