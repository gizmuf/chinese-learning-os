import {z} from 'zod';
import {items} from './content';
export const privateFileLimit=1000000;
const hash=z.string().regex(/^[a-f0-9]{64}$/),text=(max:number)=>z.string().min(1).max(max).refine(v=>!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v));
function videoUrl(value:string|null){if(value===null)return true;try{const u=new URL(value);return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&!u.hash&&(u.hostname==='youtu.be'?/^\/[A-Za-z0-9_-]{11}$/.test(u.pathname)&&!u.search:['youtube.com','www.youtube.com'].includes(u.hostname)&&u.pathname==='/watch'&&/^[A-Za-z0-9_-]{11}$/.test(u.searchParams.get('v')??'')&&[...u.searchParams.keys()].length===1&&u.searchParams.has('v'));}catch{return false;}}
const id=z.number().int().min(1).max(200),ids=z.array(id).min(1).max(200);
export const privateLessonSchema=z.object({
  schemaVersion:z.literal(1),title:text(180),
  source:z.object({kind:z.literal('user-provided'),videoUrl:z.string().max(240).nullable().refine(videoUrl),verificationAgainstAudio:z.boolean(),notes:z.array(text(1200)).max(12)}).strict(),
  sources:z.array(z.object({id,hanzi:text(1000),rawPinyin:text(1000).nullable()}).strict()).min(1).max(200),
  sentences:z.array(z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),sourceIds:ids,hanzi:text(4000),pinyin:text(6000),english:text(6000),notes:z.array(text(1200)).max(12),uncertain:z.boolean()}).strict()).min(1).max(200),
  practiceTargets:z.array(z.object({text:text(30),pinyin:text(150),english:text(400),canonicalItemId:z.string().max(80).nullable(),sourceIds:ids}).strict()).max(40),
  sourceHash:hash,contentHash:hash,
}).strict().superRefine((v,ctx)=>{
  const sourceIds=v.sources.map(s=>s.id),mapped=v.sentences.flatMap(s=>s.sourceIds),byId=new Map(v.sources.map(s=>[s.id,s]));
  if(sourceIds.some((id,i)=>id!==i+1)||JSON.stringify(mapped)!==JSON.stringify(sourceIds)||new Set(v.sentences.map(s=>s.id)).size!==v.sentences.length)ctx.addIssue({code:'custom',message:'Invalid source mapping'});
  if(v.sentences.some(s=>s.hanzi!==s.sourceIds.map(id=>byId.get(id)?.hanzi??'').join('')))ctx.addIssue({code:'custom',message:'Source text must be preserved'});
  if(v.practiceTargets.some(t=>new Set(t.sourceIds).size!==t.sourceIds.length||t.sourceIds.some(id=>!byId.get(id)?.hanzi.includes(t.text))||t.canonicalItemId!==null&&!items.some(i=>i.id===t.canonicalItemId&&i.hanzi===t.text)))ctx.addIssue({code:'custom',message:'Invalid practice mapping'});
});
export type PrivateLesson=z.infer<typeof privateLessonSchema>;
export function stablePrivateJson(value:unknown):string {if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(stablePrivateJson).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stablePrivateJson((value as Record<string,unknown>)[k])).join(',')+'}';}
export async function privateDigest(value:unknown){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stablePrivateJson(value)));return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');}
export async function parsePrivateLesson(input:string):Promise<PrivateLesson>{
  try{
    if(new TextEncoder().encode(input).length>privateFileLimit)throw Error();
    const value=privateLessonSchema.parse(JSON.parse(input)),{sourceHash,contentHash,...base}=value;
    if(await privateDigest(value.sources)!==sourceHash||await privateDigest(base)!==contentHash)throw Error();
    return value;
  }catch{throw Error('File format, source mapping or integrity check failed. Nothing was imported.');}
}
export type ReaderState={index:number;phases:(1|2|3)[];showRaw:boolean};
export type LocalLesson={version:1;lesson:PrivateLesson;revision:number;lease:string;reader:ReaderState};
type Entry={sourceHash:string;contentHash:string;title:string;revision:number;sourceCount:number;sentenceCount:number};
export type PrivateLibrary={version:1;revision:number;selected:string|null;entries:Entry[]};
export const privateLibraryKey='private-lessons:library:v1';
export const privateLessonKey=(value:string)=>'private-lessons:content:v1:'+value;
const emptyLibrary=():PrivateLibrary=>({version:1,revision:0,selected:null,entries:[]});
function ownerStore(db:IDBDatabase,owner:string){if(!owner||db.name!=='chinese-os-v1-'+owner)throw Error('Sign in to the correct local notebook first.');}
const activeGuard=(active:()=>boolean)=>{if(!active())throw Error('Notebook changed. Import cancelled.');};
function validLibrary(v:PrivateLibrary){return v?.version===1&&Number.isSafeInteger(v.revision)&&v.revision>=0&&Array.isArray(v.entries)&&v.entries.length<=50&&v.entries.every(e=>hash.safeParse(e.contentHash).success&&hash.safeParse(e.sourceHash).success&&typeof e.title==='string'&&Number.isSafeInteger(e.revision))&&(v.selected===null||v.entries.some(e=>e.contentHash===v.selected));}
export function validReader(v:ReaderState,n:number){return !!v&&Number.isInteger(v.index)&&v.index>=0&&v.index<n&&Array.isArray(v.phases)&&v.phases.length===n&&v.phases.every(p=>[1,2,3].includes(p))&&typeof v.showRaw==='boolean';}
function getDraft<T>(db:IDBDatabase,key:string):Promise<T|undefined>{return new Promise((resolve,reject)=>{const r=db.transaction('drafts').objectStore('drafts').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Local notebook could not be read.'));});}
export async function readPrivateLibrary(db:IDBDatabase,owner:string){ownerStore(db,owner);const value=await getDraft<PrivateLibrary>(db,privateLibraryKey)??emptyLibrary();if(!validLibrary(value))throw Error('Local library could not be read.');return value;}
export async function importPrivateLesson(db:IDBDatabase,owner:string,lesson:PrivateLesson,expectedRevision:number,active=()=>true):Promise<PrivateLibrary>{
  ownerStore(db,owner);const clean=await parsePrivateLesson(JSON.stringify(lesson));activeGuard(active);
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts'),r=store.get(privateLibraryKey);let result:PrivateLibrary;
    r.onsuccess=()=>{
      const before=r.result??emptyLibrary();if(!active()||!validLibrary(before)||before.revision!==expectedRevision){tx.abort();return;}
      const previous=before.entries.find((e:Entry)=>e.sourceHash===clean.sourceHash),duplicate=previous?.contentHash===clean.contentHash;
      if(!previous&&before.entries.length>=50){tx.abort();return;}
      if(!duplicate){const entry:Entry={sourceHash:clean.sourceHash,contentHash:clean.contentHash,title:clean.title,revision:(previous?.revision??0)+1,sourceCount:clean.sources.length,sentenceCount:clean.sentences.length};
        // Old content revisions are retained; importing never deletes prior drafts or learning events.
        result={version:1,revision:before.revision+1,selected:clean.contentHash,entries:[...before.entries.filter((e:Entry)=>e.sourceHash!==clean.sourceHash),entry]};
      }else result={...before,revision:before.revision+1,selected:clean.contentHash};
      const existing=store.get(privateLessonKey(clean.contentHash));
      existing.onsuccess=()=>{if(!active()){tx.abort();return;}if(!existing.result)store.put({version:1,lesson:clean,revision:0,lease:'',reader:{index:0,phases:clean.sentences.map(()=>1),showRaw:false}} satisfies LocalLesson,privateLessonKey(clean.contentHash));store.put(result,privateLibraryKey);};
    };
    tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(Error('Local import failed. Existing lessons remain unchanged.'));tx.onabort=()=>reject(Error('Local library changed or reached its limit. Reload before importing.'));
  });
}
export function selectPrivateLesson(db:IDBDatabase,owner:string,before:PrivateLibrary,selected:string|null,active=()=>true):Promise<PrivateLibrary>{
  ownerStore(db,owner);activeGuard(active);
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts'),r=store.get(privateLibraryKey);const next={...before,revision:before.revision+1,selected};
    r.onsuccess=()=>{const current=r.result??emptyLibrary();if(!active()||!validLibrary(current)||current.revision!==before.revision||selected!==null&&!current.entries.some((e:Entry)=>e.contentHash===selected)){tx.abort();return;}store.put(next,privateLibraryKey);};
    tx.oncomplete=()=>resolve(next);tx.onerror=()=>reject(Error('Local selection could not be saved.'));tx.onabort=()=>reject(Error('Local library changed. Reload to continue.'));
  });
}
export async function openPrivateLesson(db:IDBDatabase,owner:string,contentHash:string,lease:string,active=()=>true):Promise<LocalLesson>{
  ownerStore(db,owner);const stored=await getDraft<LocalLesson>(db,privateLessonKey(contentHash));if(!stored)throw Error('Local lesson is unavailable.');
  const lesson=await parsePrivateLesson(JSON.stringify(stored.lesson));activeGuard(active);
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts'),r=store.get(privateLessonKey(contentHash));let next:LocalLesson;
    r.onsuccess=()=>{const v=r.result as LocalLesson;if(!active()||!v||v.lesson.contentHash!==lesson.contentHash||!validReader(v.reader,lesson.sentences.length)||!Number.isSafeInteger(v.revision)){tx.abort();return;}next={...v,lesson,revision:v.revision+1,lease};store.put(next,privateLessonKey(contentHash));};
    tx.oncomplete=()=>resolve(next);tx.onerror=()=>reject(Error('Local lesson could not be opened.'));tx.onabort=()=>reject(Error('Local lesson changed. Reload to continue.'));
  });
}
export function savePrivateReader(db:IDBDatabase,owner:string,before:LocalLesson,reader:ReaderState,active=()=>true):Promise<LocalLesson>{
  ownerStore(db,owner);activeGuard(active);if(!validReader(reader,before.lesson.sentences.length))return Promise.reject(Error('Invalid reading position.'));
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts'),r=store.get(privateLessonKey(before.lesson.contentHash)),next={...before,revision:before.revision+1,reader};
    r.onsuccess=()=>{if(!active()||r.result?.revision!==before.revision||r.result?.lease!==before.lease){tx.abort();return;}store.put(next,privateLessonKey(before.lesson.contentHash));};
    tx.oncomplete=()=>resolve(next);tx.onerror=()=>reject(Error('Reading position could not be saved.'));tx.onabort=()=>reject(Error('Lesson opened in another tab. Reload to continue.'));
  });
}
