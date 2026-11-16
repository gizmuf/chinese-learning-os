'use client';

import {useEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, PenLine, Volume2} from 'lucide-react';
import {playRecording, stopAudio} from './audio';
import {useI18n} from './i18n';
import SharedWriting from './shared-writing';
import {StudyText} from './study-lookup-context';
import {practicalLessonCopy} from './practical-lesson-copy';
import {
 activePracticalScene, buildPracticalSentence, practicalLesson, practicalLessonAudio, practicalLessonHref,
 type PracticalExample,
} from './practical-lesson-data';
import './practical-lesson.css';

function SentenceText({example, chunks, pinyin}: {
 example: PracticalExample | ReturnType<typeof buildPracticalSentence>; chunks?: string[]; pinyin: boolean;
}) {
 let offset = 0;
 return <p className={'practical-hanzi'+(chunks?' has-chunks':'')} lang="zh-Hans">
  {(chunks??[example.hanzi]).map((part,index)=>{
   const start=offset;
   offset+=part.length;
   return <span className="practical-chunk" key={index}>
    <StudyText text={part} pinyin={example.pinyin} sourceText={example.hanzi} offset={start}/>
   </span>;
  })}
  {pinyin&&<span className="practical-pinyin" lang="zh-Latn">{example.pinyin}</span>}
 </p>;
}

export default function PracticalLesson({notify}: {notify:(message:string)=>void}){
 const {locale}=useI18n(),copy=practicalLessonCopy(locale);
 const [scene,setScene]=useState(()=>activePracticalScene(typeof location==='undefined'?'':location.search));
 const [pinyin,setPinyin]=useState(true),[chunks,setChunks]=useState(true),[translation,setTranslation]=useState(true);
 const [revealed,setRevealed]=useState(false);
 const [writing,setWriting]=useState<{example:PracticalExample;id:string}>();
 const [drink,setDrink]=useState<'tea'|'coffee'>('tea'),[temperature,setTemperature]=useState<'hot'|'iced'>('hot');
 const dialog=useRef<HTMLDialogElement>(null),heading=useRef<HTMLHeadingElement>(null),opener=useRef<HTMLButtonElement>(null);
 const index=practicalLesson.scenes.indexOf(scene);
 const built=buildPracticalSentence(drink,temperature);
 const challenge=scene.lines.at(-1)!;

 useEffect(()=>{
  const back=()=>{stopAudio();setRevealed(false);setScene(activePracticalScene(location.search));};
  window.addEventListener('popstate',back);
  return()=>{window.removeEventListener('popstate',back);stopAudio();};
 },[]);
 useEffect(()=>{
  if(writing&&!dialog.current?.open)dialog.current?.showModal();
  if(!writing&&dialog.current?.open)dialog.current.close();
 },[writing]);

 function visit(next:number){
  const target=practicalLesson.scenes[next];
  if(!target||target===scene)return;
  stopAudio();
  setRevealed(false);
  setScene(target);
  history.pushState(null,'',practicalLessonHref+'&scene='+encodeURIComponent(target.id));
  requestAnimationFrame(()=>heading.current?.focus());
 }
 function closeWriting(){
  stopAudio();
  setWriting(undefined);
  requestAnimationFrame(()=>opener.current?.focus());
 }
 function listen(text:string){
  const source=practicalLessonAudio[text];
  return source&&<button className="secondary" type="button" aria-label={copy.listen+' · '+text} onClick={()=>playRecording(source,notify)}><Volume2 size={17}/>{copy.listen}</button>;
 }

 return <article className="course-space practical-lesson">
  <a className="text-button" href="/?course=intensive"><ArrowLeft size={17}/>{copy.back}</a>
  <header className="practical-heading">
   <div><p className="eyebrow">{copy.date}</p><h1>{practicalLesson.title[locale]}</h1><p>{copy.intro}</p></div>
   <span lang="zh-Hans" aria-hidden="true">吃 · 喝 · 聊</span>
  </header>
  <nav className="practical-scenes" aria-label={copy.scenes}>
   {practicalLesson.scenes.map((section,i)=><button className="secondary" type="button" key={section.id} aria-current={section===scene?'step':undefined} onClick={()=>visit(i)}>{section.title[locale]}</button>)}
  </nav>
  <div className="practical-aids">
   <label><input type="checkbox" checked={pinyin} onChange={e=>setPinyin(e.target.checked)}/>{copy.pinyin}</label>
   <label><input type="checkbox" checked={chunks} onChange={e=>setChunks(e.target.checked)}/>{copy.chunks}</label>
   <label><input type="checkbox" checked={translation} onChange={e=>setTranslation(e.target.checked)}/>{copy.translation}</label>
  </div>
  <div className="practical-grid">
   <section aria-labelledby="practical-scene">
    <h2 id="practical-scene" ref={heading} tabIndex={-1}>{scene.title[locale]}</h2>
    <div className="practical-lines" key={scene.id}>{scene.lines.map((line,i)=>{
     const id=scene.id+'-'+(i+1);
     return <article className="panel practical-line" key={id} data-study-source-id={'practical-2026-11-16:'+id}
      data-study-sentence={line.hanzi} data-study-pinyin={line.pinyin} data-study-meaning={line.meaning[locale]} data-study-audio={practicalLessonAudio[line.hanzi]}>
      <small>{copy[line.source==='pdf'?'source':'adapted']}</small>
      <SentenceText example={line} chunks={chunks?line.chunks:undefined} pinyin={pinyin}/>
      {translation&&<p className="practical-translation">{line.meaning[locale]}</p>}
      <div className="practical-actions">{listen(line.hanzi)}
       <button className="secondary" type="button" onClick={e=>{opener.current=e.currentTarget;stopAudio();setWriting({example:line,id});}}><PenLine size={17}/>{copy.write}</button>
      </div>
      {!!line.variants?.length&&<details className="practical-variants"><summary>{copy.more} · {line.variants.length}</summary>
       {line.variants.map((item,j)=><div key={item.hanzi} data-study-source-id={'practical-2026-11-16:'+id+':variant:'+j} data-study-sentence={item.hanzi} data-study-pinyin={item.pinyin} data-study-meaning={item.meaning[locale]} data-study-audio={practicalLessonAudio[item.hanzi]}>
        <SentenceText example={item} pinyin={pinyin}/>{translation&&<p>{item.meaning[locale]}</p>}{listen(item.hanzi)}
       </div>)}
      </details>}
     </article>;
    })}</div>
    <section className="panel practical-line practical-recall" aria-label={copy.practice} data-study-assessment={revealed?'complete':'blocked'}>
     <h3>{copy.practice}</h3><p>{copy.prompt}</p><p>{challenge.meaning[locale]}</p>
     {revealed&&<><SentenceText example={challenge} pinyin={pinyin}/>{listen(challenge.hanzi)}</>}
     <button className="secondary" type="button" aria-expanded={revealed} onClick={()=>setRevealed(!revealed)}>{revealed?copy.hide:copy.reveal}</button>
    </section>
    <div className="practical-pagination">
     <button className="secondary" type="button" disabled={!index} aria-label={practicalLesson.scenes[index-1]?.title[locale]??'Previous'} onClick={()=>visit(index-1)}><ArrowLeft size={17}/></button>
     <span>{index+1} / {practicalLesson.scenes.length}</span>
     <button className="secondary" type="button" disabled={index===practicalLesson.scenes.length-1} aria-label={practicalLesson.scenes[index+1]?.title[locale]??'Next'} onClick={()=>visit(index+1)}><ArrowRight size={17}/></button>
    </div>
   </section>
   <aside className="practical-sidebar">
    <section className="panel practical-line">
     <h3>{copy.build}</h3><p>{copy.buildNote}</p>
     <label>{copy.drink}<select value={drink} onChange={e=>setDrink(e.target.value as typeof drink)}>
      <option value="tea">茶 · chá · {copy.tea}</option><option value="coffee">咖啡 · kāfēi · {copy.coffee}</option>
     </select></label>
     <label>{copy.temperature}<select value={temperature} onChange={e=>setTemperature(e.target.value as typeof temperature)}>
      <option value="hot">热 · rè · {copy.hot}</option><option value="iced">冰 · bīng · {copy.iced}</option>
     </select></label>
     <div aria-live="polite"><SentenceText example={built} chunks={built.chunks} pinyin={pinyin}/></div>{listen(built.hanzi)}
    </section>
    <section className="panel practical-line"><h3>{copy.families}</h3>
     {practicalLesson.families?.map(family=><details className="practical-variants" key={family.anchor}><summary lang="zh-Hans">{family.anchor} · {family.examples.join(' · ')}</summary>
      <p>{family.note[locale]}</p><p className="practical-family-words" lang="zh-Hans">{family.examples.map(word=><StudyText key={word} text={word} whole/>)}</p>
      {/^\p{Script=Han}$/u.test(family.anchor)&&<a href={'/?atlas=1&workspace=1&anchor='+encodeURIComponent(family.anchor)}>{copy.explore} {family.anchor} →</a>}
     </details>)}
    </section>
   </aside>
  </div>
  <dialog ref={dialog} className="study-writing-dialog practical-writing" aria-label={copy.write} onCancel={e=>{e.preventDefault();closeWriting();}}>
   <header><h2>{copy.write}</h2><button type="button" className="secondary" onClick={closeWriting}>{copy.close}</button></header>
   {writing&&<SharedWriting key={writing.id} hanzi={writing.example.hanzi} pinyin={writing.example.pinyin} meaning={writing.example.meaning[locale]}
    contextual={{text:writing.example.hanzi,pinyin:writing.example.pinyin,meaning:writing.example.meaning[locale],sourceId:'practical-2026-11-16:'+writing.id}}
    audio={{sentence:practicalLessonAudio[writing.example.hanzi]}} onBack={closeWriting}/>}
  </dialog>
 </article>;
}
