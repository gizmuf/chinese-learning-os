import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {IDBFactory, IDBObjectStore} from 'fake-indexeddb';

const {outputFiles:[bundle]}=await build({
 stdin:{contents:`export * from './app/guest-backup-model';
 export {shuoshuoMorning} from './app/shuoshuo-lesson-model';
 export {items} from './app/content'; export {privateLibraryKey,privateLessonKey,privateDigest} from './app/private-lessons-model';
 export {readingLabGuestKey} from './app/reading-lab-session'; export {newCourseEvent} from './app/course-learning';
 export {persistReadingReview,readReadingReviewStore,readingReviewGuestKey,readingReviewSchedule,validateReadingReviewStore} from './app/reading-lab-review-model';
 export {findReadingReviewSource,readingReviewTargets,resolveReadingReviewTarget} from './app/reading-lab-review-data';
 export {recognitionQuestions} from './app/atlas-spatial-model'; export {newRecognitionAttempt} from './app/recognition-history';
 export {extendedFamily} from './app/atlas-cloud-extended';`,
 resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,
});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.text).toString('base64'));
const request=(r)=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
function memory(initial={}){
 const rows=new Map(Object.entries(initial));
 return {get length(){return rows.size;},key:index=>[...rows.keys()][index]??null,getItem:key=>rows.get(key)??null,
 setItem:(key,value)=>rows.set(key,value),removeItem:key=>rows.delete(key)};
}
const device=(initial)=>({factory:new IDBFactory(),storage:memory(initial)});
const id=()=>crypto.randomUUID();
const event=(patch={})=>({id:id(),itemId:m.items[0].id,skill:'meaning',mode:'recall',rating:3,assisted:false,at:20,timezone:'UTC',detail:{},synced:false,...patch});
const atlas=(patch={})=>({version:1,id:id(),targetId:'u6e05',skill:'writing',mode:'copy',assisted:true,rating:0,at:12,synced:false,...patch});
const course=()=>({...m.newCourseEvent('study:time','study',null,true),synced:false});
const lab=()=>({version:1,experiment:'connections-v1',kind:'feedback',id:id(),sessionId:id(),route:'connections',at:45,score:2});
const settings={penOnly:false,left:false,minutes:10};
const coords=[{x:.1,y:.2,p:.5,t:7}];
const choice=(text,meaning)=>({text,pinyin:'shū',meaning,addedAt:12});
const notebook=(factory,store='events')=>open(factory,'chinese-os-v1-guest',store);
async function open(factory,name,store){
 const r=factory.open(name,1);
 r.onupgradeneeded=()=>{
  const db=r.result;
  if(name.startsWith('chinese-os-v1-')){db.createObjectStore('events',{keyPath:'id'});db.createObjectStore('drafts');}
  else db.createObjectStore(store,{keyPath:'id'});
 };
 return request(r);
}
async function put(db,store,row,key){
 const tx=db.transaction(store,'readwrite');
 const done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});
 tx.objectStore(store).put(row,key);
 await done;
}
async function get(factory,name,store,key){
 const db=await open(factory,name,store);
 try{return await request(db.transaction(store).objectStore(store).get(key));}finally{db.close();}
}
async function seedPrivate(db,lesson){
 const reader={index:2,phases:lesson.sentences.map(()=>2),showRaw:false};
 const row={version:1,lesson,revision:2,lease:'lease',reader};
 const entry={sourceHash:lesson.sourceHash,contentHash:lesson.contentHash,title:lesson.title,revision:1,
 sourceCount:lesson.sources.length,sentenceCount:lesson.sentences.length};
 await put(db,'drafts',row,m.privateLessonKey(lesson.contentHash));
 await put(db,'drafts',{version:1,revision:2,selected:lesson.contentHash,entries:[entry]},m.privateLibraryKey);
 return row;
}

test('guest round-trip includes allowlisted stores, lesson content and Reader drafts; account and credential stores stay out',async()=>{
 const guest=device({'chinese-os-language':'fr','chinese-os:reading-lab:v1:owner:abc':'signed state','firebase:user':'secret credentials',
  'scene-lab-discovery-v1':JSON.stringify({objects:['table'],actions:['read']}),
  [m.readingLabGuestKey]:JSON.stringify({version:1,drafts:{'hsk2-library-meeting':'我的写作草稿'}})});
 const db=await notebook(guest.factory);
 const progress=event(), source=m.shuoshuoMorning;
 const privateRow=await seedPrivate(db,source);
 await put(db,'events',progress);
 await put(db,'drafts',settings,'settings');
 await put(db,'drafts',{cells:{'0:0':[coords]},hidden:false,attemptId:id()},'notebook:'+m.items[0].id);
 await put(db,'drafts',{书:[, [coords]]},'practice-book-ink:书');
 await put(db,'drafts','SECRET','unknown-private-token');
 db.close();
 const question=m.recognitionQuestions(m.extendedFamily(['water'],'en',3),'en')[0];
 const recognition={...m.newRecognitionAttempt({...question,partId:'water'},question.target),synced:false};
 const rows=[
  ['chinese-os-atlas-v1-guest','events',atlas()],
  ['chinese-os-recognition-v1-guest','events',recognition],['chinese-os-course-v1-guest','events',course()],
  ['chinese-os-connection-lab-v1-guest','records',lab()],
 ];
 for(const [name,store,event] of rows){
  const db=await open(guest.factory,name,store);await put(db,store,event);db.close();
 }
 const owner=await open(guest.factory,'chinese-os-v1-firebase:abc','events');
 await put(owner,'events',event({itemId:'SIGNED_SECRET'}));owner.close();
 const {file,counts,omittedDrafts}=await m.exportGuestBackup(guest);
 assert.equal(omittedDrafts,1);
 const raw=await file.text();
 assert.doesNotMatch(raw,/SECRET|signed state|firebase:user|secret credentials/);
 assert.deepEqual(counts,{progress:1,atlas:1,course:1,recognition:1,connectionLab:1,drafts:5,privateLessons:1,preferences:3});
 const target=device({'chinese-os-language':'en',[m.readingLabGuestKey]:JSON.stringify({version:1,drafts:{'hsk2-library-meeting':'现有文字','hsk2-cooking-together':'备用草稿'}})});
 const preview=await m.parseGuestBackup(raw);
 assert.equal(target.storage.getItem('chinese-os-language'),'en');
 const first=await m.restoreGuestBackup(target,preview);
 assert.deepEqual(first.failed,[]);
 assert.deepEqual(first.groups.notebook,{added:6,skipped:0});
 assert.deepEqual(first.groups.preferences,{added:1,skipped:2});
 assert.deepEqual(JSON.parse(target.storage.getItem('scene-lab-discovery-v1')),{objects:['table'],actions:['read']});
 assert.equal((await get(target.factory,'chinese-os-v1-guest','events',progress.id)).id,progress.id);
 assert.deepEqual(await get(target.factory,'chinese-os-v1-guest','drafts',m.privateLessonKey(source.contentHash)),privateRow);
 assert.deepEqual(await get(target.factory,'chinese-os-v1-guest','drafts','practice-book-ink:书'),{书:[undefined,[coords]]});
 for(const [name,store,row] of rows)assert.deepEqual(await get(target.factory,name,store,row.id),row);
 const again=await m.restoreGuestBackup(target,preview);
 assert.deepEqual(again.failed,[]);
 assert.ok(Object.values(again.groups).every(group=>group.added===0));
});

test('a merge preserves destination event and draft conflicts and adds new practice choices and Reader drafts',async()=>{
 const source=device({[m.readingLabGuestKey]:JSON.stringify({version:1,drafts:{'hsk2-library-meeting':'backup','hsk2-cooking-together':'new'}})});
 const target=device({[m.readingLabGuestKey]:JSON.stringify({version:1,drafts:{'hsk2-library-meeting':'existing'}})});
 const original=event(), dest={...original,at:99};
 for(const [data,row,choices] of [[source,original,[choice('书','backup'),choice('门','door')]],[target,dest,[choice('书','existing')]]]){
  const db=await notebook(data.factory);
  await put(db,'events',row);
  await put(db,'drafts',choices,'practice-book:v1');
  db.close();
 }
 const parsed=await m.parseGuestBackup(await (await m.exportGuestBackup(source)).file.text());
 assert.deepEqual((await m.restoreGuestBackup(target,parsed)).failed,[]);
 assert.deepEqual(await get(target.factory,'chinese-os-v1-guest','events',original.id),dest);
 assert.deepEqual(await get(target.factory,'chinese-os-v1-guest','drafts','practice-book:v1'),[choice('书','existing'),choice('门','door')]);
 assert.deepEqual(JSON.parse(target.storage.getItem(m.readingLabGuestKey)).drafts,{'hsk2-library-meeting':'existing','hsk2-cooking-together':'new'});
});

test('foreign, malformed, polluted, credential, and dangling private lesson backups fail validation before restore',async()=>{
 const clean=await (await m.exportGuestBackup(device())).file.text();
 for(const bad of [
  clean.replace('"guest"','"firebase:abc"'),
  clean.replace('"version":1','"version":2'),
  clean.replace('"preferences":[]','"preferences":[{"key":"firebase:user","value":"secret"}]'),
  clean.replace('"drafts":[]','"drafts":[{"key":"settings","value":{"__proto__":{"polluted":true}}}]'),
  clean.replace('"drafts":[]','"drafts":[{"key":"settings","value":{"refreshToken":"secret"}}]'),
  clean.replace('"drafts":[]','"drafts":[{"key":"settings","value":{"penOnly":"no"}}]'),
  clean.replace('"drafts":[]','"drafts":[{"key":"notebook:foreign","value":{"cells":{"0:0":[[{}]]},"hidden":false,"attemptId":"'+id()+'"}}]'),
  clean.replace('"preferences":[]','"preferences":[{"key":"chinese-os:reading-lab:v1:guest","value":"{\\"version\\":1,\\"drafts\\":{\\"bad\\":\\"foreign\\"}}"}]'),
  clean.slice(0,-1),
 ]) await assert.rejects(m.parseGuestBackup(bad));
 assert.equal({}.polluted,undefined);
 const input=device();
 const db=await notebook(input.factory);
 await seedPrivate(db,m.shuoshuoMorning);
 db.close();
 const data=JSON.parse(await (await m.exportGuestBackup(input)).file.text());
 data.drafts=data.drafts.filter(row=>row.key===m.privateLibraryKey);
 await assert.rejects(m.parseGuestBackup(JSON.stringify(data)),/missing or does not match/);
});

test('quota abort rolls back the affected database, independent groups remain usable and retry does not duplicate',async t=>{
 const input=device({'chinese-os-language':'fr'});
 const row=event(), a=atlas();
 let db=await notebook(input.factory);await put(db,'events',row);await put(db,'drafts',settings,'settings');db.close();
 db=await open(input.factory,'chinese-os-atlas-v1-guest','events');await put(db,'events',a);db.close();
 const parsed=await m.parseGuestBackup(await (await m.exportGuestBackup(input)).file.text());
 const target=device();
 const existing=event();db=await notebook(target.factory);await put(db,'events',existing);db.close();
 const realPut=IDBObjectStore.prototype.put;
 const quota=t.mock.method(IDBObjectStore.prototype,'put',function (...args){
  if(this.transaction.db.name==='chinese-os-v1-guest'&&this.name==='drafts')throw new DOMException('quota','QuotaExceededError');
  return realPut.apply(this,args);
 });
 const failed=await m.restoreGuestBackup(target,parsed);
 assert.deepEqual(failed.failed,['notebook']);
 assert.equal(await get(target.factory,'chinese-os-v1-guest','events',row.id),undefined);
 assert.deepEqual(await get(target.factory,'chinese-os-v1-guest','events',existing.id),existing);
 assert.deepEqual(await get(target.factory,'chinese-os-atlas-v1-guest','events',a.id),a);
 assert.equal(target.storage.getItem('chinese-os-language'),'fr');
 quota.mock.restore();
 const finished=await m.restoreGuestBackup(target,parsed);
 assert.deepEqual(finished.failed,[]);
 assert.deepEqual(finished.groups.notebook,{added:2,skipped:0});
 assert.deepEqual(finished.groups.atlas,{added:0,skipped:1});
});

test('HTTP fallback verifies private lesson digests and detects altered content before restore',async t=>{
 const stored=device();
 const db=await notebook(stored.factory);
 await seedPrivate(db,m.shuoshuoMorning);db.close();
 const payload=await (await m.exportGuestBackup(stored)).file.text();
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:{randomUUID:crypto.randomUUID.bind(crypto)}});
 t.after(()=>Object.defineProperty(globalThis,'crypto',descriptor));
 assert.equal((await m.parseGuestBackup(payload)).counts.privateLessons,1);
 const edited=JSON.parse(payload);
 edited.drafts.find(row=>row.key.startsWith('private-lessons:content:')).value.lesson.source.notes=['Synthetic edit'];
 await assert.rejects(m.parseGuestBackup(JSON.stringify(edited)),/integrity check/);
});

test('a localStorage quota error rolls back preferences and the Reader merge together',async()=>{
 const firstKey='chinese-os-language';
 const oldReader=JSON.stringify({version:1,drafts:{'hsk2-library-meeting':'existing'}});
 const source=device({[firstKey]:'fr',[m.readingLabGuestKey]:JSON.stringify({version:1,drafts:{'hsk2-cooking-together':'incoming'}}),
  'chinese-os:hanzi-appearance:v1':JSON.stringify({style:'print',highlight:false})});
 const destination=device({[m.readingLabGuestKey]:oldReader});
 const original=destination.storage.setItem;
 destination.storage.setItem=(key,value)=>{
  if(key==='chinese-os:hanzi-appearance:v1')throw new DOMException('quota','QuotaExceededError');
  original(key,value);
 };
 const file=await m.parseGuestBackup(await (await m.exportGuestBackup(source)).file.text());
 const restored=await m.restoreGuestBackup(destination,file);
 assert.deepEqual(restored.failed,['preferences']);
 assert.equal(destination.storage.getItem(firstKey),null);
 assert.equal(destination.storage.getItem(m.readingLabGuestKey),oldReader);
 destination.storage.setItem=original;
 assert.deepEqual((await m.restoreGuestBackup(destination,file)).failed,[]);
 assert.equal(destination.storage.getItem(firstKey),'fr');
 assert.deepEqual(JSON.parse(destination.storage.getItem(m.readingLabGuestKey)).drafts,
  {'hsk2-library-meeting':'existing','hsk2-cooking-together':'incoming'});
});

function reviewFixture() {
 const [first,second]=m.readingReviewTargets;
 const initial={dueAt:86_400_000,step:0,reviewCount:0,revision:0};
 const pending={id:id(),startedAt:86_400_000,expectedDueAt:initial.dueAt,expectedRevision:0,stage:'recall',
  word:'图',sentence:'',help:false,sampleShown:false,sourceSeen:false};
 return {first:first.id,second:second.id,initial,pending};
}

test('a review backup v1 excludes signed-in queues and merges whole cards without replacing local pending work',async()=>{
 const {first,second,initial,pending}=reviewFixture();
 const importedPending={...pending,id:id(),stage:'sentence',word:'',sentence:'这条路旁边有树。',help:true,sampleShown:true};
 const lastResponse={word:'图书馆',sentence:'爸爸今天在图书馆看书。',completedAt:86_400_000,
  scenarioIndex:0,outcome:'remembered',early:false,supported:false};
 const completed={dueAt:345_600_000,step:1,reviewCount:1,revision:1,lastAttemptId:id(),lastResponse};
 const incoming={version:1,cards:{[first]:completed,[second]:{...initial,pending:importedPending}}};
 const local={version:1,cards:{[first]:{...initial,pending}}};
 const guestKey=m.readingReviewGuestKey, ownerKey='chinese-os:reading-reviews:v1:owner:learner';
 assert.deepEqual(m.validateReadingReviewStore(incoming),incoming);
 assert.deepEqual(m.validateReadingReviewStore(local),local);
 const source=device({[guestKey]:JSON.stringify(incoming),[ownerKey]:'signed-in'});
 const target=device({[guestKey]:JSON.stringify(local),[ownerKey]:'keep-signed-in'});
 const {file}=await m.exportGuestBackup(source);
 const preview=await m.parseGuestBackup(await file.text());
 assert.equal(preview.data.version,1);
 assert.equal(preview.counts.preferences,1);
 assert.deepEqual(preview.data.preferences.map(row=>row.key),[guestKey]);
 assert.deepEqual((await m.restoreGuestBackup(target,preview)).groups.preferences,{added:1,skipped:0});
 assert.deepEqual(JSON.parse(target.storage.getItem(guestKey)),{version:1,cards:{...incoming.cards,...local.cards}});
 assert.equal(target.storage.getItem(ownerKey),'keep-signed-in');
 assert.deepEqual((await m.restoreGuestBackup(target,preview)).groups.preferences,{added:0,skipped:1});
 const emptyTarget=device();
 assert.deepEqual((await m.restoreGuestBackup(emptyTarget,preview)).groups.preferences,{added:1,skipped:0});
 assert.deepEqual(JSON.parse(emptyTarget.storage.getItem(guestKey)),incoming);
 const malformedTarget=device({[guestKey]:'existing unsupported content'});
 assert.deepEqual((await m.restoreGuestBackup(malformedTarget,preview)).groups.preferences,{added:0,skipped:1});
 assert.equal(malformedTarget.storage.getItem(guestKey),'existing unsupported content');
});

test('review backup rejects account keys, invented targets and malformed progress before importing',async()=>{
 const {first,initial,pending}=reviewFixture();
 const clean=JSON.parse(await (await m.exportGuestBackup(device())).file.text());
 const guestKey=m.readingReviewGuestKey;
 for(const [key,record] of [
  ['chinese-os:reading-reviews:v1:owner:g',{version:1,cards:{[first]:initial}}],
  [guestKey,{version:1,cards:{invented:initial}}],
  [guestKey,{version:1,cards:{[first]:{...initial,dueAt:-1}}}],
  [guestKey,{version:1,cards:{[first]:{...initial,pending:{...pending,stage:'unsupported'}}}}],
  [guestKey,{version:1,cards:{[first]:{...initial,grade:100}}}],
 ]){
  await assert.rejects(m.parseGuestBackup(JSON.stringify({...clean,preferences:[{key,value:JSON.stringify(record)}]})));
 }
});

function saveClickedReview(storage,article,chunk,tokenIndex,now=0){
 const target=m.findReadingReviewSource(article,chunk,tokenIndex);
 assert.ok(target);
 const key=article+':'+chunk+':'+tokenIndex;
 return {key,target,store:m.persistReadingReview(storage,null,key,{type:'save',target},now)};
}

test('clicked-word backup v1 restores complete local targets alongside authored targets and preserves a pending conflict',async()=>{
 const input=device(), destination=device(), empty=device(), guest=m.readingReviewGuestKey;
 const day=86_400_000;
 const [authored]=m.readingReviewTargets;
 m.persistReadingReview(input.storage,null,authored.id,{type:'save'},0);
 const clicked=saveClickedReview(input.storage,'hsk4-repair-before-replace','p1-c9',1);
 const other=saveClickedReview(input.storage,'hsk5-building-secondhand','p2-c12',4);
 m.persistReadingReview(input.storage,null,other.key,{type:'begin',attempt:id()},day);
 saveClickedReview(destination.storage,'hsk4-repair-before-replace','p1-c9',1,day);
 const pending=id();
 m.persistReadingReview(destination.storage,null,clicked.key,{type:'begin',attempt:pending},2*day);
 m.persistReadingReview(destination.storage,null,clicked.key,{type:'edit',attempt:pending,field:'word',value:'只'},2*day);
 const before=m.readReadingReviewStore(destination.storage,null);
 const source=m.readReadingReviewStore(input.storage,null);
 const payload=await m.parseGuestBackup(await (await m.exportGuestBackup(input)).file.text());
 assert.equal(payload.data.version,1);
 assert.deepEqual(JSON.parse(payload.data.preferences.find(row=>row.key===guest).value),source);
 assert.deepEqual((await m.restoreGuestBackup(empty,payload)).failed,[]);
 assert.deepEqual(m.readReadingReviewStore(empty.storage,null),source);
 assert.deepEqual((await m.restoreGuestBackup(destination,payload)).groups.preferences,{added:1,skipped:0});
 const merged=m.readReadingReviewStore(destination.storage,null);
 assert.deepEqual(merged.cards[clicked.key],before.cards[clicked.key]);
 assert.deepEqual(merged.cards[other.key],source.cards[other.key]);
 assert.deepEqual(merged.cards[authored.id],source.cards[authored.id]);
 assert.deepEqual((await m.restoreGuestBackup(destination,payload)).groups.preferences,{added:0,skipped:1});
});

test('a well-formed retired pin survives guest backup but cannot be selected; malformed pins are rejected',async()=>{
 const deviceData=device(), destination=device(), guest=m.readingReviewGuestKey;
 const {key}=saveClickedReview(deviceData.storage,'hsk4-repair-before-replace','p1-c9',1);
 const retired=m.readReadingReviewStore(deviceData.storage,null);
 retired.cards[key].target.sentence='只需要换个灯泡。';
 assert.equal(m.resolveReadingReviewTarget(key,retired.cards[key]),undefined);
 assert.deepEqual(m.readingReviewSchedule(retired,Number.MAX_SAFE_INTEGER).due,[]);
 deviceData.storage.setItem(guest,JSON.stringify(retired));
 const saved=JSON.parse(await (await m.exportGuestBackup(deviceData)).file.text());
 const restored=await m.parseGuestBackup(JSON.stringify(saved));
 assert.deepEqual((await m.restoreGuestBackup(destination,restored)).failed,[]);
 assert.deepEqual(m.readReadingReviewStore(destination.storage,null),retired);
 const raw=saved.preferences.find(row=>row.key===guest);
 for(const patch of [{hanzi:'<script>'},{pinyin:['ri5']},{tokenIndex:-1},{externalURL:'https://example.test/'},{sentence:'不再是这个词。'}]){
  const wrong=structuredClone(retired);
  Object.assign(wrong.cards[key].target,patch);
  raw.value=JSON.stringify(wrong);
  await assert.rejects(m.parseGuestBackup(JSON.stringify(saved)));
 }
});


test('merging two valid review queues past the card limit preserves the destination queue',async()=>{
 const guest=m.readingReviewGuestKey;
 function queue(prefix,count){
  const cards={};
  for(let i=0;i<count;i++){
   const article=prefix+'-'+i,chunk='p1-c1',tokenIndex=0;
   cards[article+':'+chunk+':'+tokenIndex]={dueAt:86_400_000,step:0,reviewCount:0,revision:0,
    target:{article,chunk,tokenIndex,hanzi:'读',pinyin:['dú'],sentence:'我读书。'}};
  }
  return {version:1,cards};
 }
 const source=queue('older-source',2049), current=queue('older-destination',2048);
 const from=device({[guest]:JSON.stringify(source)}), to=device({[guest]:JSON.stringify(current)});
 const rawBefore=to.storage.getItem(guest);
 const {file}=await m.exportGuestBackup(from);
 const backup=await m.parseGuestBackup(await file.text());
 assert.deepEqual((await m.restoreGuestBackup(to,backup)).failed,['preferences']);
 assert.equal(to.storage.getItem(guest),rawBefore);
 assert.deepEqual(m.readReadingReviewStore(to.storage,null),current);
});
