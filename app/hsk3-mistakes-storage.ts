import { addMistakes, completeMistake, newMistakeQueue, type MistakeCard, type MistakeQueue, type MistakeSeed } from './hsk3-mistakes-model';

const storeName='queue';

async function withQueue(edit?:(queue:MistakeQueue)=>MistakeQueue) {
  const database=await new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open('chinese-os-hsk3-mistakes-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore(storeName);
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  try {
    return await new Promise<MistakeQueue>((resolve,reject)=>{
      const transaction=database.transaction(storeName,edit?'readwrite':'readonly');
      const store=transaction.objectStore(storeName);
      let updated:MistakeQueue;
      const request=store.get('progress');
      request.onsuccess=()=>{
        const current=(request.result as MistakeQueue|undefined)??newMistakeQueue();
        updated=edit?edit(current):current;
        if(updated!==current)store.put(updated,'progress');
      };
      transaction.onabort=()=>reject(transaction.error);
      transaction.oncomplete=()=>resolve(updated);
    });
  } finally {
    database.close();
  }
}

export const readMistakeQueue=()=>withQueue();
export const saveExamMistakes=(seeds:MistakeSeed[])=>withQueue(queue=>addMistakes(queue,seeds,Date.now()));
export const saveMistakePractice=(card:MistakeCard,correct:boolean)=>withQueue(queue=>completeMistake(queue,card,correct,Date.now()));
