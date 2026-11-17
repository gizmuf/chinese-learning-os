import type { RecordedAnswer } from './hsk3-speaking-model';

const name = 'chinese-os-hsk3-speaking-v1';
const storeName = 'attempt';
const latest = 'latest';
type StoredAttempt = { key:typeof latest; id:string; answers:RecordedAnswer[] };

async function useAttemptStore<T>(mode:IDBTransactionMode,run:(store:IDBObjectStore,setResult:(value:T)=>void)=>void) {
  const database=await new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open(name,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(storeName,{keyPath:'key'});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  try {
    return await new Promise<T>((resolve,reject)=>{
      const transaction=database.transaction(storeName,mode);
      let result:T;
      transaction.oncomplete=()=>resolve(result);
      transaction.onabort=()=>reject(transaction.error);
      run(transaction.objectStore(storeName),value=>{result=value;});
    });
  } finally {
    database.close();
  }
}

export const readSpeakingAnswers=()=>useAttemptStore<RecordedAnswer[]>('readonly',(store,done)=>{
  const request=store.get(latest);
  request.onsuccess=()=>done((request.result as StoredAttempt|undefined)?.answers??[]);
});

export const beginSpeakingAttempt=(id:string)=>useAttemptStore<void>('readwrite',(store)=>{
  store.put({key:latest,id,answers:[]} satisfies StoredAttempt);
});

export const saveSpeakingAnswer=(id:string,answer:RecordedAnswer)=>useAttemptStore<boolean>('readwrite',(store,done)=>{
  const request=store.get(latest);
  request.onsuccess=()=>{
    const attempt=request.result as StoredAttempt|undefined;
    if(attempt?.id!==id) {done(false);return;}
    attempt.answers=[...attempt.answers.filter(item=>item.question!==answer.question),answer];
    store.put(attempt);
    done(true);
  };
});

export const clearSpeakingAnswers=()=>useAttemptStore<void>('readwrite',store=>{store.delete(latest);});
