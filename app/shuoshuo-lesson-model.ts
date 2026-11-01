import source from '../data/shuoshuo-morning.json';
import {items} from './content';
import {parsePrivateLesson,privateLessonKey,openPrivateLesson,type LocalLesson} from './private-lessons-model';
export const shuoshuoMorning=source;
export const shuoshuoMorningTitle='我的早晨 · A morning with Shuoshuo';
export const shuoshuoMorningVocabulary=source.practiceTargets.map(target=>({...target,item:items.find(item=>item.id===target.canonicalItemId&&item.hanzi===target.text)}));
/** Built-in lesson content ships with the app. Only the learner's checkpoint is device-local.
 * Reuse an existing exact-content checkpoint without modifying its private library catalogue. */
export async function openShuoshuoMorning(db:IDBDatabase,owner:string,lease:string,active=()=>true):Promise<LocalLesson>{
  if(!owner||db.name!=='chinese-os-v1-'+owner)throw Error('Notebook changed.');
  const lesson=await parsePrivateLesson(JSON.stringify(source));if(!active())throw Error('Notebook changed.');
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts'),r=store.get(privateLessonKey(lesson.contentHash));
    r.onsuccess=()=>{if(!active()){tx.abort();return;}if(!r.result)store.put({version:1,lesson,revision:0,lease:'',reader:{index:0,phases:lesson.sentences.map(()=>1),showRaw:false}} satisfies LocalLesson,privateLessonKey(lesson.contentHash));};
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(Error('Could not open the lesson checkpoint.'));tx.onabort=()=>reject(Error('Notebook changed.'));
  });
  return openPrivateLesson(db,owner,lesson.contentHash,lease,active);
}
