import type { RecordedAnswer } from './hsk3-speaking-model';

const name = 'chinese-os-hsk3-speaking-v1';
const storeName = 'attempt';
const latest = 'latest';
type StoredAnswer = { question:number; bytes:ArrayBuffer; mime:string };
type StoredAttempt = { key:typeof latest; id:string; answers:(StoredAnswer|RecordedAnswer)[] };
type SpeakingAttempt = { id:string; answers:RecordedAnswer[] };

async function withAttemptStore<T>(mode:IDBTransactionMode,run:(store:IDBObjectStore,setResult:(value:T)=>void)=>void) {
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

export const readSpeakingAttempt=()=>withAttemptStore<SpeakingAttempt|undefined>('readonly',(store,done)=>{
  const request=store.get(latest);
  request.onsuccess=()=>{
    const attempt=request.result as StoredAttempt|undefined;
    if(!attempt) {done(undefined);return;}
    const answers=attempt.answers.map(answer=>'audio' in answer?answer:{
      question:answer.question,
      audio:new Blob([answer.bytes],{type:answer.mime}),
    });
    done({id:attempt.id,answers});
  };
});

export const beginSpeakingAttempt=(id:string)=>withAttemptStore<void>('readwrite',(store)=>{
  store.put({key:latest,id,answers:[]} satisfies StoredAttempt);
});

export async function saveSpeakingAnswer(id:string,answer:RecordedAnswer) {
  // WebKit may reject MediaRecorder-backed Blobs in IndexedDB. Materialize
  // the bytes before opening the transaction and rebuild a Blob for playback.
  const stored:StoredAnswer={question:answer.question,bytes:await answer.audio.arrayBuffer(),mime:answer.audio.type};
  return withAttemptStore<boolean>('readwrite',(store,done)=>{
    const request=store.get(latest);
    request.onsuccess=()=>{
      const attempt=request.result as StoredAttempt|undefined;
      if(attempt?.id!==id) {done(false);return;}
      attempt.answers=[...attempt.answers.filter(item=>item.question!==stored.question),stored];
      store.put(attempt);
      done(true);
    };
  });
}

export const clearSpeakingAnswers=(id:string)=>withAttemptStore<boolean>('readwrite',(store,done)=>{
  const request=store.get(latest);
  request.onsuccess=()=>{
    const attempt=request.result as StoredAttempt|undefined;
    if(attempt&&attempt.id!==id) {done(false);return;}
    if(attempt)store.delete(latest);
    done(true);
  };
});
