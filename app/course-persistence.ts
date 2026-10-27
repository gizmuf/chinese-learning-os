import {courseEventSchema,type CourseEvent,type StoredCourseEvent} from "./course-learning";
export function openCourseStore(owner: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("chinese-os-course-v1-" + owner, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("events", { keyPath: "id" });
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
}
export function readCourseEvents(db: IDBDatabase) {
  return new Promise<StoredCourseEvent[]>((resolve, reject) => {
    const r = db.transaction("events").objectStore("events").getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export function putCourseEvents(db: IDBDatabase, events: StoredCourseEvent[]) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("events", "readwrite");
    for (const event of events) tx.objectStore("events").put(event);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? Error("Storage transaction aborted"));
  });
}

/** One owner and one lifetime. Never resume a disposed account's network work. */
export function courseSession(db: IDBDatabase, owner: string|null, isCurrent:()=>boolean,
 fetchForOwner:(input:string, init:RequestInit, owner:string)=>Promise<Response>) {
 let disposed=false, locked=false;
 const active=()=>!disposed&&isCurrent();
 const guard=()=>{if(!active())throw Error('Account changed; reopen the active notebook');};
 return {
  active,
  dispose(){disposed=true;db.close();},
  async record(event:CourseEvent){guard();await putCourseEvents(db,[{...courseEventSchema.parse(event),synced:false}]);guard();return readCourseEvents(db);},
  async sync(){
   if(!owner||locked||!active())return null;
   locked=true;
   try{
    let pending=(await readCourseEvents(db)).filter(e=>!e.synced);guard();
    while(pending.length){
     guard();const batch=pending.slice(0,20);
     const r=await fetchForOwner('/api/course-progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events:batch})},owner);
     guard();if(!r.ok)throw Error('sync');
     await putCourseEvents(db,batch.map(e=>({...e,synced:true})));
     guard();pending=(await readCourseEvents(db)).filter(e=>!e.synced);
    }
    guard();const r=await fetchForOwner('/api/course-progress?lessons=all',{cache:'no-store'},owner);
    guard();if(!r.ok)throw Error('sync');
    const payload=await r.json() as {events:unknown[]};guard();
    const remote=payload.events.map(value=>({...courseEventSchema.parse(value),synced:true}));
    await putCourseEvents(db,remote);guard();
    return await readCourseEvents(db);
   }finally{locked=false;}
  },
 };
}
