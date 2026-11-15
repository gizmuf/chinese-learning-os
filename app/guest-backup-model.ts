import {z} from 'zod';
import {storageTimeoutMs} from './local-store';
import {privateLibraryKey, privateLessonKey, type LocalLesson} from './private-lessons-model';
import {practiceBookKey, readPracticeChoices} from './practice-book';
import {readingLabGuestKey, validateReadingLabSession} from './reading-lab-session';
import {mergeReadingReviewStores, readingReviewGuestKey, validateReadingReviewStore} from './reading-lab-review-model';
import {checkBackupTree, eventStores, isKnownDraft, isKnownPreference, sameBackupValue, validateDraft, validateEvent, validateLibrary, validatePreference, type EventStore} from './guest-backup-validation';

export const guestBackupLimit = 64 * 1024 * 1024;
const recordLimit = 100_000;
const format = 'chinese-os-guest-backup';
const databases = [
 {name:'chinese-os-v1-guest',group:'progress',store:'events'},
 {name:'chinese-os-atlas-v1-guest',group:'atlas',store:'events'},
 {name:'chinese-os-course-v1-guest',group:'course',store:'events'},
 {name:'chinese-os-recognition-v1-guest',group:'recognition',store:'events'},
 {name:'chinese-os-connection-lab-v1-guest',group:'connectionLab',store:'records'},
] as const;
type Database = typeof databases[number];
type EventRow = ReturnType<typeof validateEvent>;
type DraftRow = {key:string;value:unknown};
type PreferenceRow = {key:string;value:string};
type Counts = {added:number;skipped:number};
type BackupStorage = Pick<Storage,'length'|'key'|'getItem'|'setItem'|'removeItem'>;
type Devices = {factory:IDBFactory;storage:BackupStorage};
type Backup = {data:BackupData; counts:Record<EventStore|'drafts'|'privateLessons'|'preferences',number>};
type BackupData = {
 format:typeof format; version:1; owner:'guest'; createdAt:string;
 events:Record<EventStore,EventRow[]>; drafts:DraftRow[]; preferences:PreferenceRow[];
};
const groups = ['notebook','atlas','course','recognition','connectionLab','preferences'] as const;
type Group = typeof groups[number];
export type GuestRestore = {groups:Partial<Record<Group,Counts>>; failed:Group[]};
const emptyCounts = ():Counts => ({added:0,skipped:0});

function openGuestDatabase(factory:IDBFactory, spec:Database) {
 return new Promise<IDBDatabase>((resolve,reject)=>{
  const request=factory.open(spec.name,1);
  let settled=false;
  const finish=(error?:Error)=>{
   if(settled)return;
   settled=true;
   clearTimeout(timeout);
   if(error)reject(error);else resolve(request.result);
  };
  const timeout=setTimeout(()=>finish(Error('Device storage did not respond.')),storageTimeoutMs);
  request.onblocked=()=>finish(Error('Close other tabs using this notebook.'));
  request.onupgradeneeded=()=>{
   if(settled){request.transaction?.abort();return;}
   request.result.createObjectStore(spec.store,{keyPath:'id'});
   if(spec.group==='progress')request.result.createObjectStore('drafts');
  };
  request.onerror=()=>finish(request.error??Error('Device storage unavailable.'));
  request.onsuccess=()=>{
   if(settled){request.result.close();return;}
   request.result.onversionchange=()=>request.result.close();
   finish();
  };
 });
}

async function withDatabase<T>(factory:IDBFactory,spec:Database,use:(db:IDBDatabase)=>Promise<T>) {
 const db=await openGuestDatabase(factory,spec);
 try{return await use(db);}finally{db.close();}
}

function inTransaction<T>(db:IDBDatabase, stores:string[], mode:IDBTransactionMode, use:(tx:IDBTransaction)=>T) {
 return new Promise<T>((resolve,reject)=>{
  const tx=db.transaction(stores,mode);
  const timer=setTimeout(()=>{try{tx.abort();}catch{}},storageTimeoutMs);
  tx.oncomplete=()=>{clearTimeout(timer);resolve(value);};
  tx.onabort=()=>{clearTimeout(timer);reject(tx.error??Error('Storage transaction cancelled.'));};
  let value:T;
  try{value=use(tx);}catch(error){tx.abort();reject(error);}
 });
}

function readBackupRows(db:IDBDatabase,spec:Database) {
 const stores=spec.group==='progress'?[spec.store,'drafts']:[spec.store];
 return inTransaction(db,stores,'readonly',tx=>{
  const rows:{events:unknown[];drafts:DraftRow[];omittedDrafts:number}={events:[],drafts:[],omittedDrafts:0};
  const events=tx.objectStore(spec.store).getAll(undefined,recordLimit+1);
  events.onsuccess=()=>{rows.events=events.result;};
  if(spec.group==='progress'){
   const request=tx.objectStore('drafts').openCursor();
   request.onsuccess=()=>{
    const cursor=request.result;
    if(!cursor)return;
    if(typeof cursor.key==='string' && isKnownDraft(cursor.key))rows.drafts.push({key:cursor.key,value:cursor.value});
    else rows.omittedDrafts++;
    if(rows.drafts.length<=recordLimit)cursor.continue();
   };
  }
  return rows;
 });
}

const maxRows=z.array(z.unknown()).max(recordLimit);
const envelope=z.object({
 format:z.literal(format),version:z.literal(1),owner:z.literal('guest'),createdAt:z.string().datetime(),
 events:z.object({progress:maxRows,atlas:maxRows,course:maxRows,recognition:maxRows,connectionLab:maxRows}).strict(),
 drafts:z.array(z.object({key:z.string(),value:z.unknown()}).strict()).max(recordLimit),
 preferences:z.array(z.object({key:z.string().max(300),value:z.string().max(2_000_000)}).strict()).max(recordLimit),
}).strict();

function unique(values:string[]) {
 if(new Set(values).size!==values.length)throw Error('The backup contains duplicate records.');
}

async function validateBackup(raw:unknown):Promise<Backup> {
 checkBackupTree(raw);
 const candidate=envelope.parse(raw);
 const events=candidate.events as BackupData['events'];
 for(const group of eventStores){
  events[group]=candidate.events[group].map(row=>validateEvent(group,row));
  unique(events[group].map(row=>row.id));
 }
 unique(candidate.drafts.map(row=>row.key));
 const records=new Map<string,unknown>();
 const drafts:DraftRow[]=[];
 for(const row of candidate.drafts){
  const value=await validateDraft(row.key,row.value);
  records.set(row.key,value);
  drafts.push({key:row.key,value});
 }
 if(records.has(privateLibraryKey)){
  const library=validateLibrary(records.get(privateLibraryKey));
  for(const row of library.entries){
   const record=records.get(privateLessonKey(row.contentHash)) as LocalLesson|undefined;
   if(!record || record.lesson.sourceHash!==row.sourceHash || record.lesson.title!==row.title
      || record.lesson.sources.length!==row.sourceCount || record.lesson.sentences.length!==row.sentenceCount)throw Error('A private lesson is missing or does not match its catalogue.');
  }
 }
 unique(candidate.preferences.map(row=>row.key));
 const preferences=candidate.preferences.map(row=>({key:row.key,value:validatePreference(row.key,row.value)}));
 return {data:{...candidate,events,drafts,preferences},counts:{
  progress:events.progress.length,atlas:events.atlas.length,course:events.course.length,recognition:events.recognition.length,
  connectionLab:events.connectionLab.length,drafts:drafts.length,privateLessons:drafts.filter(row=>row.key.startsWith('private-lessons:content:v1:')).length,
  preferences:preferences.length,
 }};
}

export async function parseGuestBackup(content:string) {
 if(content.length>guestBackupLimit || new TextEncoder().encode(content).length>guestBackupLimit)throw Error('The backup exceeds 64 MiB.');
 try{return await validateBackup(JSON.parse(content));}
 catch(error){
  if(error instanceof z.ZodError || error instanceof SyntaxError)throw Error('This is not a valid Chinese OS guest backup.');
  throw error;
 }
}

export async function exportGuestBackup({factory,storage}:Devices) {
 const events={} as Record<EventStore,unknown[]>;
 const drafts:DraftRow[]=[];
 let omittedDrafts=0;
 for(const spec of databases){
  const rows=await withDatabase(factory,spec,db=>readBackupRows(db,spec));
  events[spec.group]=rows.events;
  for(const draft of rows.drafts)drafts.push(draft);
  omittedDrafts+=rows.omittedDrafts;
 }
 const preferences:PreferenceRow[]=[];
 for(let index=0;index<storage.length;index++){
  const key=storage.key(index);
  if(!key || !isKnownPreference(key))continue;
  const value=storage.getItem(key);
  if(value!==null)preferences.push({key,value});
 }
 const clean=await validateBackup({format,version:1,owner:'guest',createdAt:new Date().toISOString(),events,drafts,preferences});
 const file=new Blob([JSON.stringify(clean.data)],{type:'application/json'});
 if(file.size>guestBackupLimit)throw Error('The backup exceeds 64 MiB.');
 return {file,counts:clean.counts,omittedDrafts};
}

function mergeDraft(key:string, incoming:unknown, existing:unknown):unknown {
 if(existing===undefined)return incoming;
 if(key===privateLibraryKey){
  const before=validateLibrary(existing),backup=validateLibrary(incoming);
  const retained=new Set(before.entries.map(entry=>entry.sourceHash));
  const added=backup.entries.filter(entry=>!retained.has(entry.sourceHash)).slice(0,50-before.entries.length);
  return added.length?{...before,revision:before.revision+1,entries:[...before.entries,...added]}:existing;
 }
 if(key===practiceBookKey){
  const before=readPracticeChoices(existing),backup=readPracticeChoices(incoming);
  if(!Array.isArray(existing)||before.length!==existing.length)return existing;
  const retained=new Set(before.map(choice=>choice.text));
  const added=backup.filter(choice=>!retained.has(choice.text));
  return added.length?[...before,...added]:existing;
 }
 return existing;
}

function writeBackupRows(db:IDBDatabase, spec:Database, backup:BackupData) {
 const events=backup.events[spec.group], drafts=spec.group==='progress'?backup.drafts:[];
 const stores=spec.group==='progress'?[spec.store,'drafts']:[spec.store];
 return inTransaction(db,stores,'readwrite',tx=>{
  const counts=emptyCounts(), eventStore=tx.objectStore(spec.store);
  for(const event of events){
   const get=eventStore.getKey(event.id);
   get.onsuccess=()=>{
    if(get.result!==undefined){counts.skipped++;return;}
    eventStore.add(event);
    counts.added++;
   };
  }
  if(drafts.length){
   const store=tx.objectStore('drafts');
   for(const {key,value} of drafts){
    const get=store.get(key);
    get.onsuccess=()=>{
     try{
      const merged=mergeDraft(key,value,get.result);
      if(merged===get.result){counts.skipped++;return;}
      const restored=key.startsWith('practice-book-ink:')?Object.fromEntries(Object.entries(merged as Record<string,unknown[]>)
       .map(([entry,cells])=>[entry,cells.map(cell=>cell===null?undefined:cell)])):merged;
      store.put(restored,key);
      counts.added++;
     }catch{tx.abort();}
    };
   }
  }
  return counts;
 });
}

function mergeReadingPreference(key:string, previous:string, value:string) {
 if(key!==readingLabGuestKey && key!==readingReviewGuestKey)return previous;
 let existing:unknown;
 try{existing=JSON.parse(previous);}catch{return previous;}
 const incoming:unknown=JSON.parse(value);
 if(key===readingReviewGuestKey){
  const current=validateReadingReviewStore(existing), backup=validateReadingReviewStore(incoming);
  if(!current||!backup||!sameBackupValue(current,existing))return previous;
  const merged=mergeReadingReviewStores(current,backup);
  return sameBackupValue(merged,current)?previous:JSON.stringify(merged);
 }
 const current=validateReadingLabSession(existing), backup=validateReadingLabSession(incoming);
 if(!current||!backup||!sameBackupValue(current,existing))return previous;
 const merged={...current,resume:current.resume??backup.resume,drafts:{...backup.drafts,...current.drafts}};
 return sameBackupValue(merged,current)?previous:JSON.stringify(merged);
}

function writeBackupPreferences(storage:BackupStorage, rows:PreferenceRow[]) {
 const counts=emptyCounts();
 const written:{key:string;previous:string|null}[]=[];
 try{
  for(const {key,value} of rows){
   const previous=storage.getItem(key);
   const next=previous===null?value:mergeReadingPreference(key,previous,value);
   if(next===previous){counts.skipped++;continue;}
   storage.setItem(key,next);written.push({key,previous});counts.added++;
  }
 }catch(error){
  for(const {key,previous} of written.reverse()){
   try{if(previous===null)storage.removeItem(key);else storage.setItem(key,previous);}catch{/* Preserve any existing value if rollback is blocked. */}
  }
  throw error;
 }
 return counts;
}

/** Confirmed import. Each IDB group is atomic; earlier committed groups stay useful and are safe to retry. */
export async function restoreGuestBackup({factory,storage}:Devices,file:Backup):Promise<GuestRestore> {
 const result:GuestRestore={groups:{},failed:[]};
 for(const spec of databases){
  const group=spec.group==='progress'?'notebook':spec.group;
  if(!file.data.events[spec.group].length && (group!=='notebook'||!file.data.drafts.length))continue;
  try{result.groups[group]=await withDatabase(factory,spec,db=>writeBackupRows(db,spec,file.data));}
  catch{result.failed.push(group);}
 }
 if(file.data.preferences.length){
  try{result.groups.preferences=writeBackupPreferences(storage,file.data.preferences);}
  catch{result.failed.push('preferences');}
 }
 return result;
}
