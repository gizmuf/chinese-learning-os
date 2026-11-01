'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Download,FileUp,LockKeyhole} from 'lucide-react';
import {importPrivateLesson,openPrivateLesson,parsePrivateLesson,privateFileLimit,readPrivateLibrary,savePrivateReader,selectPrivateLesson,type LocalLesson,type PrivateLesson,type PrivateLibrary,type ReaderState} from './private-lessons-model';
import SharedWriting from './shared-writing';
import {items} from './content';
import './private-lessons.css';

export default function PrivateLessons({owner,db,onBack,onSignIn}:{owner:string|null;db:IDBDatabase|null;onBack:()=>void;onSignIn:()=>void}){
  const [writing,setWriting]=useState<{owner:string;id:string}|null>(null);
  const [snapshot,setSnapshot]=useState<{owner:string;library:PrivateLibrary;record:LocalLesson|null}|null>(null);
  const [preview,setPreview]=useState<{owner:string;lesson:PrivateLesson}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const state=useRef(snapshot),generation=useRef(0),alive=useRef(false),queue=useRef(Promise.resolve()),reading=useRef(false);
  const store=owner&&db?.name==='chinese-os-v1-'+owner?db:null;
  const visible=snapshot?.owner===owner?snapshot:null,pending=preview?.owner===owner?preview.lesson:null;
  function display(value:NonNullable<typeof snapshot>){state.current=value;setSnapshot(value);}
  useEffect(()=>{
    const token=++generation.current;alive.current=true;state.current=null;setSnapshot(null);setPreview(null);setWriting(null);setError('');setBusy(false);reading.current=false;
    const active=()=>alive.current&&generation.current===token;
    if(store&&owner)void (async()=>{try{const library=await readPrivateLibrary(store,owner);if(!active())return;const record=library.selected?await openPrivateLesson(store,owner,library.selected,crypto.randomUUID(),active):null;if(active())display({owner,library,record});}catch{if(active())setError('Your local library could not be opened. Reload to retry.');}})();
    return()=>{alive.current=false;};
  },[owner,store]);
  function run(work:(current:NonNullable<typeof snapshot>,active:()=>boolean)=>Promise<NonNullable<typeof snapshot>>){
    const token=generation.current;setBusy(true);const active=()=>alive.current&&generation.current===token;
    const task=queue.current.then(async()=>{const current=state.current;if(!active()||!current||current.owner!==owner)throw Error();const next=await work(current,active);if(active()){display(next);setError('');}});
    queue.current=task.catch(()=>{if(active())setError('The local operation could not finish. Existing content is retained. Reload before retrying.');}).finally(()=>{if(active())setBusy(false);});return task;
  }
  async function chooseFile(file:File|undefined){
    if(!file||!owner||!store||reading.current||busy)return;
    const token=generation.current;reading.current=true;setBusy(true);setPreview(null);setError('');
    try{if(file.size>privateFileLimit)throw Error();const lesson=await parsePrivateLesson(await file.text());if(alive.current&&generation.current===token)setPreview({owner,lesson});}
    catch{if(alive.current&&generation.current===token)setError('This file could not be validated. Choose a supported private lesson JSON under 1 MB. Nothing was imported.');}
    finally{if(alive.current&&generation.current===token){reading.current=false;setBusy(false);}}
  }
  function open(hash:string){if(!store||!owner)return;void run(async(current,active)=>{const library=await selectPrivateLesson(store,owner,current.library,hash,active);const record=await openPrivateLesson(store,owner,hash,crypto.randomUUID(),active);return {owner,library,record};});}
  function importFile(){if(!pending||!store||!owner)return;const lesson=pending;void run(async(current,active)=>{const library=await importPrivateLesson(store,owner,lesson,current.library.revision,active);const record=await openPrivateLesson(store,owner,lesson.contentHash,crypto.randomUUID(),active);if(active())setPreview(null);return {owner,library,record};});}
  function read(patch:(before:ReaderState)=>ReaderState){if(!store||!owner)return;void run(async(current,active)=>{if(!current.record)throw Error();const record=await savePrivateReader(store,owner,current.record,patch(current.record.reader),active);return {...current,record};});}
  function library(){if(!store||!owner)return;void run(async(current,active)=>({...current,library:await selectPrivateLesson(store,owner,current.library,null,active),record:null}));}
  function saveWriting(){if(!store||!owner||!writing)return Promise.reject(Error('Writing notebook changed.'));const id=writing.id;return run(async(current,active)=>{if(!current.record||!current.record.lesson.practiceTargets.some(t=>t.canonicalItemId===id&&items.some(item=>item.id===id&&item.hanzi===t.text)))throw Error('Writing target changed.');const before=current.record.reader;const record=await savePrivateReader(store,owner,current.record,{...before,written:[...new Set([...(before.written??[]),id])]},active);return {...current,record};});}
  function exportFile(){const lesson=visible?.record?.lesson;if(!lesson)return;const url=URL.createObjectURL(new Blob([JSON.stringify(lesson,null,2)+'\n'],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='private-lesson.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  const record=visible?.record,row=record?.lesson.sentences[record.reader.index],phase=record?.reader.phases[record.reader.index]??1;
  const writingItem=writing?.owner===owner&&record?.lesson.practiceTargets.some(t=>t.canonicalItemId===writing.id&&items.some(item=>item.id===writing.id&&item.hanzi===t.text))?items.find(item=>item.id===writing.id):undefined;
  return <section className="private-lessons" aria-label="Private lessons on this device" data-study-lookup="off">
    <button className="text-button" disabled={busy} onClick={onBack}><ArrowLeft size={16}/>Back to study</button>
    <header><p className="eyebrow"><LockKeyhole size={15}/>YOUR LOCAL NOTEBOOK</p><h1>Private lessons on this device</h1><p>Import your own study JSON. The file stays in this browser’s signed-in notebook; it is not uploaded or synced. Import it separately on your other devices.</p></header>
    {!owner?<div className="pl-panel"><h2>Sign in to use a separate notebook</h2><p>Private imports are unavailable in the shared guest notebook.</p><button className="primary" onClick={onSignIn}>Sign in</button></div>:!store||!visible?<p role="status">{error||'Opening your local library…'}</p>:<>
      {error&&<p className="pl-error" role="alert">{error}</p>}
      {!record&&<div className="pl-panel"><label className="pl-file"><FileUp size={19}/><span>Choose private lesson JSON</span><input aria-label="Choose private lesson JSON" type="file" accept="application/json,.json" disabled={busy} onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';void chooseFile(file);}}/></label><p>No file is sent anywhere. Your original file remains your portable backup.</p>
        {pending&&<div className="pl-preview"><h2>{pending.title}</h2><p>{pending.sources.length} source segments · {pending.sentences.length} reading groups</p>{visible.library.entries.some(e=>e.sourceHash===pending.sourceHash&&e.contentHash!==pending.contentHash)&&<p>A different revision is saved here. Importing this revision retains the older local content; export your current lesson first if you need a separate file backup.</p>}<button className="primary" disabled={busy} onClick={importFile}>Import into this device</button><button className="secondary" disabled={busy} onClick={()=>setPreview(null)}>Cancel</button></div>}
        <h2>Saved in this notebook</h2>{visible.library.entries.length===0?<p>No private lessons imported yet.</p>:<ul className="pl-list">{visible.library.entries.map(entry=><li key={entry.sourceHash}><button disabled={busy} onClick={()=>open(entry.contentHash)}><strong>{entry.title}</strong><span>{entry.sentenceCount} groups · local revision {entry.revision}<ArrowRight size={15}/></span></button></li>)}</ul>}
      </div>}
      {record&&row&&<><div hidden={!!writingItem}><div className="pl-toolbar"><button className="secondary" disabled={busy} onClick={library}><ArrowLeft size={15}/>Back to local library</button><button className="secondary" onClick={exportFile}><Download size={15}/>Export lesson JSON</button></div><h2>{record.lesson.title}</h2><p className="pl-note">Personal rehearsal, not graded. Pinyin and English are study aids. The imported text is not independently verified here.</p>{record.lesson.source.videoUrl&&<a href={record.lesson.source.videoUrl} target="_blank" rel="noopener noreferrer">Open the original video for listening</a>}
        <article className="pl-panel pl-reading" aria-busy={busy}><header><span>Group {record.reader.index+1} / {record.lesson.sentences.length}</span><small>Source IDs: {row.sourceIds.join(', ')}</small></header><div className="pl-hanzi" lang="zh-Hans">{row.hanzi}</div>{phase>=2&&<p className="pl-pinyin">{row.pinyin}</p>}{phase>=3&&<p className="pl-english">{row.english}</p>}
          {phase<3?<button className="primary" disabled={busy} onClick={()=>read(s=>({...s,phases:s.phases.map((p,i)=>i===s.index?(p===1?2:3):p)}))}>{phase===1?'Show pinyin':'Show English'}<ArrowRight size={15}/></button>:<button className="secondary" disabled={busy} onClick={()=>read(s=>({...s,phases:s.phases.map((p,i)=>i===s.index?1:p)}))}>Hide reading and meaning</button>}
          {row.uncertain&&<p className="pl-uncertain">Source wording or pronunciation needs care. See the notes below.</p>}{row.notes.map((note,i)=><p className="pl-uncertain" key={i}>{note}</p>)}
          <footer><button className="secondary" disabled={busy||record.reader.index===0} onClick={()=>read(s=>({...s,index:s.index-1}))}><ArrowLeft size={15}/>Previous</button><button className="secondary" disabled={busy||record.reader.index===record.lesson.sentences.length-1} onClick={()=>read(s=>({...s,index:s.index+1}))}>Next<ArrowRight size={15}/></button></footer>
          <button className="text-button" disabled={busy} aria-expanded={record.reader.showRaw} onClick={()=>read(s=>({...s,showRaw:!s.showRaw}))}>{record.reader.showRaw?'Hide raw source':'Show raw source and mapping'}</button>{record.reader.showRaw&&<div className="pl-raw">{row.sourceIds.map(id=>{const raw=record.lesson.sources.find(s=>s.id===id)!;return <p key={id}><b>{id}</b> {raw.hanzi}{raw.rawPinyin&&<small> · supplied pinyin: {raw.rawPinyin}</small>}</p>;})}</div>}
        </article>
        {record.lesson.practiceTargets.length>0&&<details className="pl-panel"><summary>Vocabulary and writing practice</summary><p>Write exact existing vocabulary using Watch, Trace, Copy and Recall. Saves stay local and ungraded. Unknown expressions remain lesson-only reference material.</p>{record.lesson.practiceTargets.map((target,i)=><p key={i}><b>{target.text}</b> · {target.pinyin} · {target.english}<small> · {target.canonicalItemId?'Existing vocabulary: '+target.canonicalItemId:'No exact scored vocabulary ID'}</small>{target.canonicalItemId&&<button className="secondary" disabled={busy} onClick={()=>setWriting({owner:owner!,id:target.canonicalItemId!})}>Write {target.text}</button>}</p>)}</details>}
      </div>{writingItem&&<section className="pl-panel" aria-label="Private lesson writing"><button className="secondary" disabled={busy} onClick={()=>setWriting(null)}>Back to sentence</button><p>Supported writing · local and ungraded. No review schedule credit.</p>{record.reader.written?.includes(writingItem.id)&&<p role="status">Writing practice saved on this device.</p>}<SharedWriting key={writingItem.id} hanzi={writingItem.hanzi} item={writingItem} audio={{}} onSave={saveWriting} onBack={()=>setWriting(null)}/></section>}</>}
    </>}
  </section>;
}
