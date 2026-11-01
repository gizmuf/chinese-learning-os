'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,PenLine} from 'lucide-react';
import {openShuoshuoMorning,shuoshuoMorning,shuoshuoMorningTitle,shuoshuoMorningVocabulary} from './shuoshuo-lesson-model';
import {savePrivateReader,type LocalLesson,type ReaderState} from './private-lessons-model';
import SharedWriting from './shared-writing';
import './private-lessons.css';
import './shuoshuo-lesson.css';
export default function ShuoshuoLesson({owner,db,onBack}:{owner:string|null;db:IDBDatabase|null;onBack:()=>void}){
  const notebook=owner??'guest',store=db?.name==='chinese-os-v1-'+notebook?db:null;
  const [snapshot,setSnapshot]=useState<{owner:string;record:LocalLesson}|null>(null),[writing,setWriting]=useState<{owner:string;id:string}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const current=useRef(snapshot),generation=useRef(0),alive=useRef(false),tail=useRef(Promise.resolve());
  useEffect(()=>{
    const token=++generation.current;alive.current=true;current.current=null;setSnapshot(null);setWriting(null);setError('');setBusy(false);
    const active=()=>alive.current&&generation.current===token;
    if(store)void openShuoshuoMorning(store,notebook,crypto.randomUUID(),active).then(record=>{if(active()){current.current={owner:notebook,record};setSnapshot(current.current);}}).catch(()=>{if(active())setError('Could not open your lesson checkpoint. Reload to retry.');});
    return()=>{alive.current=false;};
  },[store,notebook]);
  function update(patch:(reader:ReaderState)=>ReaderState){
    const token=generation.current,active=()=>alive.current&&generation.current===token;setBusy(true);
    const task=tail.current.then(async()=>{const before=current.current;if(!active()||!store||before?.owner!==notebook)throw Error('Notebook changed.');const record=await savePrivateReader(store,notebook,before.record,patch(before.record.reader),active);if(active()){current.current={owner:notebook,record};setSnapshot(current.current);setError('');}});
    tail.current=task.catch(()=>{if(active())setError('Your checkpoint changed. Reload before continuing; existing progress is retained.');}).finally(()=>{if(active())setBusy(false);});return task;
  }
  const visible=snapshot?.owner===notebook?snapshot.record:null,reader=visible?.reader,row=reader?shuoshuoMorning.sentences[reader.index]:null,phase=reader?.phases[reader.index]??1;
  const target=writing?.owner===notebook?shuoshuoMorningVocabulary.find(t=>t.item?.id===writing.id):undefined;
  return <section className="private-lessons shuoshuo-lesson" aria-label="A morning with Shuoshuo" data-study-lookup="off">
    <button className="text-button" onClick={onBack} disabled={busy}><ArrowLeft size={16}/>Back to study</button>
    <header><p className="eyebrow">VIDEO LESSON · SENTENCE REHEARSAL</p><h1>{shuoshuoMorningTitle}</h1><p>42 reading groups · 65 original source segments · 40 vocabulary references. Read aloud, reveal pinyin and meaning, then practise writing the known words.</p><span className="pill">Supported practice · ungraded</span></header>
    <aside className="pl-panel"><p>Source text supplied for study from the Shuoshuo video. Pinyin and English are study aids; wording and pronunciation have not been checked against the recording. Uncertain passages are marked below.</p><a href={shuoshuoMorning.source.videoUrl??undefined} target="_blank" rel="noopener noreferrer">Watch the original video</a></aside>
    {error&&<p className="pl-error" role="alert">{error}</p>}
    {!reader||!row?<p role="status">{error||'Opening your lesson…'}</p>:<>
      <div hidden={!!target}>
        <nav className="sl-groups" aria-label="Lesson reading groups">{shuoshuoMorning.sentences.map((group,i)=><button key={group.id} disabled={busy} aria-current={reader.index===i?'step':undefined} onClick={()=>{void update(s=>({...s,index:i}));}}>{i+1}</button>)}</nav>
        <article className="pl-panel pl-reading" aria-busy={busy}><header><span>Group {reader.index+1} / 42</span><small>Source IDs: {row.sourceIds.join(', ')}</small></header><div className="pl-hanzi" lang="zh-Hans">{row.hanzi}</div>{phase>=2&&<p className="pl-pinyin">{row.pinyin}</p>}{phase>=3&&<p className="pl-english">{row.english}</p>}
          {phase<3?<button className="primary" disabled={busy} onClick={()=>{void update(s=>({...s,phases:s.phases.map((p,i)=>i===s.index?(p===1?2:3):p)}));}}>{phase===1?'Show pinyin':'Show English'}<ArrowRight size={15}/></button>:<button className="secondary" disabled={busy} onClick={()=>{void update(s=>({...s,phases:s.phases.map((p,i)=>i===s.index?1:p)}));}}>Hide reading and meaning</button>}
          {row.uncertain&&<p className="pl-uncertain">Source wording or pronunciation needs care.</p>}{row.notes.map((note,i)=><p className="pl-uncertain" key={i}>{note}</p>)}
          <footer><button className="secondary" disabled={busy||reader.index===0} onClick={()=>{void update(s=>({...s,index:s.index-1}));}}><ArrowLeft size={15}/>Previous</button><button className="secondary" disabled={busy||reader.index===41} onClick={()=>{void update(s=>({...s,index:s.index+1}));}}>Next<ArrowRight size={15}/></button></footer>
          <button className="text-button" disabled={busy} aria-expanded={reader.showRaw} onClick={()=>{void update(s=>({...s,showRaw:!s.showRaw}));}}>{reader.showRaw?'Hide raw source':'Show raw source and mapping'}</button>{reader.showRaw&&<div className="pl-raw">{row.sourceIds.map(id=>{const raw=shuoshuoMorning.sources[id-1];return <p key={id}><b>{id}</b> {raw.hanzi}{raw.rawPinyin&&<small> · supplied pinyin: {raw.rawPinyin}</small>}</p>;})}</div>}
        </article>
        <section className="pl-panel"><h2>Vocabulary and writing</h2><p>34 exact vocabulary matches support Watch, Trace, Copy and Recall. Six complete expressions remain lesson-only references. Reading and writing saves here are ungraded.</p><div className="sl-vocabulary">{shuoshuoMorningVocabulary.map(word=><article key={word.text}><h3 lang="zh-Hans">{word.text}</h3><p className="pl-pinyin">{word.pinyin}</p><p>{word.english}</p>{word.item?<button className="secondary" disabled={busy} onClick={()=>setWriting({owner:notebook,id:word.item!.id})}><PenLine size={15}/>Write {word.text}</button>:<small>Lesson-only expression</small>}</article>)}</div></section>
        <details className="pl-panel"><summary>Source notes and vocabulary attribution</summary>{shuoshuoMorning.source.notes.map((note,i)=><p key={i}>{note}</p>)}<p>Vocabulary input: gizmuf/chinese-learning-os, codex/shuoshuo-vlog-vocabulary-20261102, commit 3edd44de6448acbf5028014710ba99e3d004d2d7. English gloss source: CC-CEDICT / MDBG, CC-BY-SA 4.0; selected glosses have context corrections.</p><a href="https://www.mdbg.net/chinese/dictionary?page=cedict" target="_blank" rel="noopener noreferrer">CC-CEDICT / MDBG</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC-BY-SA 4.0</a></details>
      </div>
      {target?.item&&<section className="pl-panel" aria-label="Lesson writing"><button className="secondary" disabled={busy} onClick={()=>setWriting(null)}>Back to sentence</button><p>Supported writing · saved on this device without a grade.</p>{reader.written?.includes(target.item.id)&&<p role="status">Writing practice saved on this device.</p>}<SharedWriting key={target.item.id} item={target.item} hanzi={target.item.hanzi} audio={{}} onSave={()=>update(s=>({...s,written:[...new Set([...(s.written??[]),target.item!.id])]}))} onBack={()=>setWriting(null)}/></section>}
    </>}
  </section>;
}
