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

export const shuoshuoScenes=[
 {id:'wake',title:'Wake up & begin',scene:'morning' as const,start:0,end:5,words:['起床','睡觉','早上','习惯']},
 {id:'water',title:'Water, coffee & reading',scene:'washing' as const,start:5,end:13,words:['水','咖啡','烧水','泡咖啡','看书']},
 {id:'home',title:'Look outside · rooms & home',scene:'house' as const,start:13,end:19,words:['阳台','喜欢','觉得']},
 {id:'focus',title:'Make time for focused work',scene:'clock' as const,start:19,end:29,words:['工作','时间','开始','完成','学习']},
 {id:'class',title:'Class, promises & a café',scene:'notebook' as const,start:29,end:36,words:['上课','下课','马上','休息','东西']},
 {id:'routine',title:'Compare your own routine',scene:'greeting' as const,start:36,end:42,words:['上午','下午','晚上','我们','欢迎']},
];
export const shuoshuoCharacters=[...new Set(source.sources.flatMap(s=>Array.from(s.hanzi).filter(c=>/\p{Script=Han}/u.test(c))))];
export const shuoshuoPracticeItems=shuoshuoMorningVocabulary.flatMap(word=>word.item?[word.item]:[]);
export const shuoshuoPracticeKey='shuoshuo-morning-recognition-v1';
