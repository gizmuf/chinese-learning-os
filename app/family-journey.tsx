'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUp,Maximize2,Minimize2,PenLine,Volume2,X} from 'lucide-react';
import {useI18n} from './i18n';
import type {CloudRoute} from './atlas-cloud-route';
import type {CloudWord} from './atlas-cloud-model';
import {atlasById} from './atlas-model';
import {familyJourney,journeyCoverage,journeySelection,type JourneyWord} from './family-journey-model';
import {journeyText} from './family-journey-copy';
import {SharedText} from './word-family-text';
import {playRecording,releaseRecording} from './audio';
import {wordPronunciation,sentencePronunciation} from './atlas-spatial-model';
import './family-journey.css';

type Props={route:CloudRoute;onChange:(patch:Partial<CloudRoute>)=>void;onWrite:(word:CloudWord,trigger:HTMLButtonElement)=>void;notify:(message:string)=>void;expanded:boolean;onExpand:()=>void};
export default function FamilyJourney(p:Props){
 const {locale}=useI18n(),t=(key:Parameters<typeof journeyText>[1])=>journeyText(locale,key);
 const groups=useMemo(()=>familyJourney(locale,p.route.level),[locale,p.route.level]);
 const coverage=useMemo(()=>journeyCoverage(groups),[groups]);
 const selected=journeySelection(groups,p.route.familyEntry);
 const [playing,setPlaying]=useState('');const audio=useRef<HTMLAudioElement|null>(null),root=useRef<HTMLElement|null>(null);
 function stop(){if(audio.current){releaseRecording(audio.current);audio.current=null}setPlaying('')}
 useEffect(()=>{stop()},[locale,p.route.level,p.route.familyEntry]);
 useEffect(()=>()=>{if(audio.current)releaseRecording(audio.current)},[]);
 function jump(id:string){document.getElementById(id)?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'})}
 function select(word:JourneyWord){stop();p.onChange({familyEntry:selected?.word.id===word.id?'':word.id})}
 function listen(word:JourneyWord,sentence=false){
  const clip=sentence?sentencePronunciation(word):wordPronunciation(word);if(!clip)return;
  if(playing===clip.source){stop();return}stop();setPlaying(clip.source);
  const value=playRecording(clip.source,()=>{setPlaying('');p.notify(t('audioError'))});audio.current=value;
  const ended=value.onended;value.onended=e=>{if(typeof ended==='function')ended.call(value,e);if(audio.current===value){audio.current=null;setPlaying('')}};
 }
 function context(word:JourneyWord,anchor:string){
  const sentence=sentencePronunciation(word);
  return <section className="fj-word-context" id={'fj-context-'+encodeURIComponent(word.id)} aria-label={t('context')+' · '+word.hanzi}>
   <div className="fj-context-top"><strong lang="zh-Hans">{word.hanzi}</strong><span>{word.pinyin}</span><button type="button" aria-label={t('close')} onClick={()=>{p.onChange({familyEntry:''});requestAnimationFrame(()=>document.getElementById('fj-open-'+encodeURIComponent(word.id))?.focus())}}><X size={17}/></button></div>
   {word.item?<><p className="fj-sentence" lang="zh-Hans"><SharedText text={word.item.sentence} anchor={anchor}/></p><p>{word.item.sentencePinyin}</p><p>{word.item.translation}</p></>:<p>{t('noSentence')}</p>}
   <div className="fj-context-actions">{sentence&&<button type="button" aria-label={t('listenSentence')+' · '+word.hanzi} aria-pressed={playing===sentence.source} onClick={()=>listen(word,true)}><Volume2 size={17}/>{t('sentence')}</button>}<button type="button" onClick={e=>{stop();p.onWrite(word,e.currentTarget)}}><PenLine size={17}/>{word.item?t('write'):t('writeLinked')+' '+(atlasById.get(word.atlasCharacterId??'')?.hanzi??'')}</button></div>
  </section>;
 }
 return <section className="family-journey" ref={root} id="family-journey-start" aria-labelledby="fj-title">
  <header className="fj-heading"><div><h2 id="fj-title">{t('title')}</h2><p>{t('intro')}</p></div><button type="button" onClick={p.onExpand} aria-label={t(p.expanded?'collapse':'expand')}>{p.expanded?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button></header>
  <div className="fj-controls"><label>{t('vocabulary')}<select value={p.route.level} onChange={e=>{stop();p.onChange({level:e.target.value==='all'?'all':Number(e.target.value) as 1|2|3,familyEntry:''})}}><option value="1">HSK 1 · 300</option><option value="2">HSK 1–2 · 500</option><option value="3">HSK 1–3 · 1000</option><option value="all">{t('all')}</option></select></label><p className="fj-count" aria-live="polite">{coverage.words} {t('words')} · {coverage.characters} {t('characters')} · {coverage.groups} {t('groups')}</p></div>
  <nav className="fj-tracks" aria-label={t('vocabulary')}>{coverage.tracks.map(track=><button type="button" key={track.level??'extra'} onClick={()=>jump(track.groups[0].id)}>{track.level?'HSK '+track.level:t('extras')}<span>{track.count} {t('words')}</span></button>)}</nav>
  <details className="fj-directory"><summary>{t('index')} · {groups.length}</summary><div>{coverage.tracks.map(track=><section key={track.level??'extra'}><h3>{track.level?'HSK '+track.level:t('extras')}</h3>{track.groups.map(group=><button type="button" key={group.id} onClick={()=>jump(group.id)}>{group.anchor?<><b lang="zh-Hans">{group.anchor}</b><span>{group.reading} · {group.englishTitle}</span></>:<span>{group.title}</span>}<small>{group.words.length}</small></button>)}</section>)}</div></details>
  {groups.map((group,index)=><section className="fj-group" id={group.id} key={group.id} aria-label={(group.level?'HSK '+group.level:t('extras'))+' · '+(group.anchor?group.anchor+' · '+group.reading:group.title)}>
   <header className="fj-group-heading"><span className="fj-group-number">{String(index+1).padStart(2,'0')}</span>{group.anchor&&<span className="fj-anchor" lang="zh-Hans">{group.anchor}</span>}<div><p className="fj-group-kind">{group.level?'HSK '+group.level:t('extras')} · {t(group.kind==='character'?'shared':'topic')} · {group.words.length} {t('words')}</p><h3>{group.anchor?group.reading+' · '+group.englishTitle:group.title}</h3></div></header>
   <div className="fj-column-labels" aria-hidden="true"><span>{t('word')}</span><span>{t('pinyin')}</span><span>{t('english')}{locale!=='en'?' / '+t('meaning'):''}</span></div>
   <div className="fj-words">{group.words.map(word=><div className="fj-entry" key={word.id} data-word-id={word.id}>
    <div className="fj-row"><button type="button" className="fj-open" id={'fj-open-'+encodeURIComponent(word.id)} aria-expanded={selected?.word.id===word.id} aria-controls={selected?.word.id===word.id?'fj-context-'+encodeURIComponent(word.id):undefined} aria-label={word.hanzi+' · '+word.pinyin+' · '+word.englishMeaning+(locale!=='en'?' · '+word.meaning:'')} onClick={()=>select(word)}><span className="fj-hanzi" lang="zh-Hans"><SharedText text={word.hanzi} anchor={group.anchor}/></span><span className="fj-reading">{word.pinyin}</span><span className="fj-meaning"><span lang="en">{word.englishMeaning}</span>{locale!=='en'&&<small lang={locale}>{word.meaning}</small>}</span></button><button type="button" className="fj-speaker" aria-label={t('listen')+' '+word.hanzi+' · '+word.pinyin} aria-pressed={playing===wordPronunciation(word).source} onClick={()=>listen(word)}><Volume2 size={18}/></button></div>
    {selected?.word.id===word.id&&context(word,group.anchor)}
   </div>)}</div>
  </section>)}
  <footer className="fj-end"><h3>{t('completed')}</h3><p>{coverage.words} {t('words')} · {coverage.groups} {t('groups')}</p><p>{t('note')}</p><button type="button" onClick={()=>jump('family-journey-start')}><ArrowUp size={17}/>{t('backTop')}</button></footer>
 </section>;
}
