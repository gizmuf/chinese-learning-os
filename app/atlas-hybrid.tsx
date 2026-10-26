'use client';
import {useEffect,useLayoutEffect,useMemo,useRef,useState,type RefObject} from 'react';
import {ArrowLeft,ArrowRight,Maximize2,Minimize2,PenLine,Search,Volume2,X} from 'lucide-react';
import {useI18n} from './i18n';
import type {CloudRoute} from './atlas-cloud-route';
import type {CloudWord} from './atlas-cloud-model';
import {atlasById} from './atlas-model';
import {hybridInventory,hybridWords,hybridPartFamily,hybridSelection,hybridPage,hybridSwipe,type HybridLayout,type HybridSet} from './atlas-hybrid-model';
import {hybridText} from './atlas-hybrid-copy';
import {validWordAnchor} from './word-family-model';
import {StudyText} from './study-lookup';
import {SharedText} from './word-family-text';
import {playRecording,releaseRecording} from './audio';
import {wordPronunciation,sentencePronunciation} from './atlas-spatial-model';
import './atlas-hybrid.css';

type Props={route:CloudRoute;onChange:(patch:Partial<CloudRoute>)=>void;onWrite:(word:CloudWord,trigger:HTMLButtonElement)=>void;notify:(message:string)=>void;expanded:boolean;onExpand:()=>void};

/** Connections follow the actual responsive DOM positions, including wrapped word rows. */
function LayerLinks({host,revision}:{host:RefObject<HTMLDivElement|null>;revision:string}){
 const [drawing,setDrawing]=useState({width:1,height:1,parts:[] as string[],words:[] as string[]});
 useLayoutEffect(()=>{
  const node=host.current;if(!node)return;
  let frame=0;
  function measure(){
   if(!node)return;const box=node.getBoundingClientRect(),center=node.querySelector('[data-map-hanzi]')?.getBoundingClientRect();if(!center)return;
   const cx=center.left-box.left+center.width/2,cy=center.top-box.top+center.height/2;
   const paths=(selector:string)=>Array.from(node.querySelectorAll(selector)).map(el=>{const b=el.getBoundingClientRect(),x=b.left-box.left+b.width/2,y=b.top-box.top+b.height/2;return `M${x},${y}L${cx},${cy}`});
   const next={width:box.width,height:box.height,parts:paths('[data-map-part]'),words:paths('[data-map-word]')};
   setDrawing(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);
  }
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure)};
  const observer=new ResizeObserver(schedule);observer.observe(node);node.querySelectorAll('[data-map-part],[data-map-hanzi],[data-map-word]').forEach(el=>observer.observe(el));schedule();
  return()=>{cancelAnimationFrame(frame);observer.disconnect()};
 },[host,revision]);
 return <svg className="ah-links" viewBox={`0 0 ${drawing.width} ${drawing.height}`} aria-hidden="true"><g className="ah-structure-links">{drawing.parts.map((d,i)=><path key={i} d={d}/>)}</g><g>{drawing.words.map((d,i)=><path key={i} d={d}/>)}</g></svg>;
}

export default function AtlasHybrid(p:Props){
 const {locale}=useI18n(),t=(key:Parameters<typeof hybridText>[1])=>hybridText(locale,key);
 const mode=p.route.layout as HybridLayout;
 const words=useMemo(()=>hybridWords(p.route.mapSet,p.route.anchor,locale,p.route.level),[p.route.mapSet,p.route.anchor,locale,p.route.level]);
 const inventory=useMemo(()=>hybridInventory(words,locale),[words,locale]);
 const {characters}=inventory;
 const {character,relatives,word}=hybridSelection(words,characters,p.route.hanzi,p.route.familyEntry);
 const part=p.route.mapPart&&character&&(character.hanzi===p.route.mapPart||character.components.includes(p.route.mapPart))?p.route.mapPart:'';
 const partFamily=part?hybridPartFamily(characters,part):[];
 const [draft,setDraft]=useState(p.route.anchor),[error,setError]=useState(''),[indexOpen,setIndexOpen]=useState(false),[playing,setPlaying]=useState(''),[columns,setColumns]=useState(6);
 const audio=useRef<HTMLAudioElement|null>(null),root=useRef<HTMLElement|null>(null),graph=useRef<HTMLDivElement|null>(null);
 const touch=useRef<{x:number;y:number}|null>(null),suppressClick=useRef(0);
 const wordPage=hybridPage(mode==='matrix'?words.length:relatives.length,p.route.mapWordPage,mode==='matrix'?12:16);
 const charPage=hybridPage(characters.length,p.route.mapCharPage,columns);
 function stop(){if(audio.current){releaseRecording(audio.current);audio.current=null}setPlaying('')}
 useEffect(()=>{setDraft(p.route.anchor);setError('')},[p.route.anchor]);
 useEffect(()=>{stop()},[word?.id,locale,mode,p.route.mapSet,p.route.level,p.route.anchor]);
 useEffect(()=>()=>{if(audio.current)releaseRecording(audio.current)},[]);
 useLayoutEffect(()=>{
  const node=root.current;if(!node)return;const observer=new ResizeObserver(()=>setColumns(Math.max(3,Math.min(10,Math.floor((node.clientWidth-135)/46)))));observer.observe(node);return()=>observer.disconnect();
 },[]);
 function change(patch:Partial<CloudRoute>){stop();setError('');p.onChange(patch)}
 function chooseCharacter(hanzi:string){change({hanzi,familyEntry:'',mapWordPage:mode==='matrix'?p.route.mapWordPage:0,mapPart:part&&hybridPartFamily(characters,part).some(ch=>ch.hanzi===hanzi)?part:''})}
 function chooseWord(next:CloudWord,hanzi?:string){const h=hanzi??(character&&next.hanzi.includes(character.hanzi)?character.hanzi:Array.from(next.hanzi).find(h=>characters.some(ch=>ch.hanzi===h)));change({familyEntry:next.id,...(h?{hanzi:h}:{}),mapPart:''})}
 function findFamily(){const value=draft.trim();if(!validWordAnchor(value)){setError(t('invalid'));return}setError('');change({anchor:value,wordCompare:false,mapSet:'family',mapPart:'',mapWordPage:0,mapCharPage:0,familyEntry:'',hanzi:Array.from(value)[0]})}
 function choosePart(glyph:string){change({mapPart:part===glyph?'':glyph})}
 function listen(sentence=false){if(!word)return;const clip=sentence?sentencePronunciation(word):wordPronunciation(word);if(!clip)return;stop();setPlaying(clip.source);const value=playRecording(clip.source,()=>{setPlaying('');p.notify(t('audioError'))});audio.current=value;const ended=value.onended;value.onended=e=>{if(typeof ended==='function')ended.call(value,e);if(audio.current===value){audio.current=null;setPlaying('')}}}
 const visibleWords=relatives.slice(wordPage.start,wordPage.end);
 const top=characters.slice(0,8);if(character&&!top.includes(character))top.splice(Math.max(0,top.length-1),1,character);
 const contextAudio=word?wordPronunciation(word):null,sentenceAudio=word?sentencePronunciation(word):null;
 function wordButton(w:CloudWord,linked=false){return <button type="button" key={w.id} data-map-word={linked?'':undefined} aria-pressed={word?.id===w.id} aria-label={w.hanzi+' · '+w.pinyin+' · '+w.meaning} onClick={()=>chooseWord(w)} lang="zh-Hans"><span lang="zh-Hans"><SharedText text={w.hanzi} anchor={character?.hanzi??''}/></span><small className="ah-visible-reading">{w.pinyin}</small><small className="ah-visible-meaning">{w.meaning}</small></button>}
 function paging(axis:'words'|'chars'){
  const page=axis==='words'?wordPage:charPage,total=axis==='words'?(mode==='matrix'?words.length:relatives.length):characters.length;
  if(!total)return null;
  return <nav className="ah-paging" aria-label={t(axis==='words'?'words':'characters')}><button type="button" disabled={page.page===0} onClick={()=>change(axis==='words'?{mapWordPage:page.page-1}:{mapCharPage:page.page-1})}><ArrowLeft size={15}/>{t(axis==='words'?'previousWords':'previousChars')}</button><span aria-live="polite">{page.start+1}–{page.end} / {total}</span><button type="button" disabled={page.page>=page.pages-1} onClick={()=>change(axis==='words'?{mapWordPage:page.page+1}:{mapCharPage:page.page+1})}>{t(axis==='words'?'nextWords':'nextChars')}<ArrowRight size={15}/></button></nav>;
 }
 return <section className="atlas-hybrid" ref={root} aria-labelledby="ah-title">
  <header className="ah-heading"><div><h2 id="ah-title">{t(mode)}</h2><p>{t('intro')}</p></div><button type="button" onClick={p.onExpand} aria-label={t(p.expanded?'collapse':'expand')}>{p.expanded?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button></header>
  <div className="ah-controls"><label>{t('material')}<select value={p.route.mapSet} onChange={e=>change({mapSet:e.target.value as HybridSet,mapPart:'',mapWordPage:0,mapCharPage:0,familyEntry:''})}><option value="family">{t('family')}</option><option value="hundred">{t('hundred')}</option><option value="scope">{t('scope')}</option></select></label><label>{t('vocabulary')}<select value={p.route.level} onChange={e=>change({level:e.target.value==='all'?'all':Number(e.target.value) as 1|2|3,mapPart:'',mapWordPage:0,mapCharPage:0,familyEntry:''})}><option value="1">HSK 1</option><option value="2">HSK 1–2</option><option value="3">HSK 1–3</option><option value="all">{t('all')}</option></select></label>{p.route.mapSet==='family'&&<form onSubmit={e=>{e.preventDefault();findFamily()}}><label htmlFor="ah-anchor">{t('anchor')}</label><div><input id="ah-anchor" value={draft} maxLength={16} onChange={e=>setDraft(e.target.value)} autoComplete="off" placeholder="学 / 学生 / 电"/><button type="submit" aria-label={t('find')}><Search size={17}/></button></div></form>}</div>
  {error&&<p role="alert">{error}</p>}
  {p.route.mapSet==='family'&&<nav className="ah-seeds" aria-label={t('family')}>{['学','学生','电','大','人','子'].map(anchor=><button type="button" key={anchor} aria-pressed={p.route.anchor===anchor} onClick={()=>{setDraft(anchor);change({anchor,wordCompare:false,hanzi:Array.from(anchor)[0],familyEntry:'',mapPart:'',mapWordPage:0,mapCharPage:0})}} lang="zh-Hans">{anchor}</button>)}</nav>}
  <p className="ah-counts" aria-live="polite">{inventory.wordCount} {t('words')} · {inventory.characterCount} {t('characters')} · {inventory.occurrences} {t('occurrences')}</p>
  {!character?<p className="ah-empty">{t('empty')}</p>:<>
   <div className="ah-interaction" onClickCapture={e=>{if(performance.now()<suppressClick.current){e.preventDefault();e.stopPropagation()}}} onPointerDown={e=>{if(e.pointerType!=='mouse'&&!(e.target as HTMLElement).closest('input,select'))touch.current={x:e.clientX,y:e.clientY}}} onPointerCancel={()=>{touch.current=null}} onPointerUp={e=>{const start=touch.current;touch.current=null;if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;const direction=hybridSwipe(dx,dy);if(!direction)return;const next=wordPage.page+direction;suppressClick.current=performance.now()+350;if(next>=0&&next<wordPage.pages)change({mapWordPage:next})}}>
   {mode==='layers'?<>
    <div className="ah-layers" ref={graph} role="group" aria-label={t('diagram')}>
     <LayerLinks host={graph} revision={[character.hanzi,character.parts.join(''),visibleWords.map(w=>w.id).join('|'),locale,part].join('|')}/>
     <div className="ah-parts"><h3>{t('component')}</h3>{character.parts.map(glyph=><button type="button" key={glyph} data-map-part aria-pressed={part===glyph} onClick={()=>choosePart(glyph)} lang="zh-Hans">{glyph}</button>)}{!character.parts.length&&<p className="ah-muted">{t('noParts')}</p>}{!character.complete&&<small>{t('partial')}</small>}</div>
     <div className="ah-center"><h3>{t('character')}</h3><span data-map-hanzi className="ah-main-hanzi" lang="zh-Hans">{character.hanzi}</span><span>{character.pinyin}</span>{character.meaning&&<small>{character.meaning}</small>}<small>{relatives.length} {t('words')}</small></div>
     <div className="ah-word-column"><h3>{t('word')} · {relatives.length}</h3><div className="ah-word-buttons">{visibleWords.map(w=>wordButton(w,true))}</div></div>
    </div>
    {part&&<section className="ah-part-family" aria-label={t('related')}><div><h3>{t('related')} · <span lang="zh-Hans">{part}</span> · {partFamily.length}</h3><button type="button" onClick={()=>change({mapPart:''})} aria-label={t('clear')}><X size={17}/></button></div><div>{partFamily.map(ch=><button type="button" key={ch.hanzi} aria-pressed={ch===character} onClick={()=>chooseCharacter(ch.hanzi)}><span lang="zh-Hans">{ch.hanzi}</span><small>{ch.wordIds.length}</small></button>)}</div></section>}
    {wordPage.pages>1&&paging('words')}<p className="ah-legend">{t('structure')}</p>
   </>:mode==='constellations'?<>
    <div className="ah-orbit-layout"><div><div className="ah-orbit" role="group" aria-label={t('constellations')}><div className="ah-orbit-ring"/><div className="ah-orbit-center"><strong>{words.length}</strong>{t('inSet')}</div>{top.map((ch,i)=>{const angle=2*Math.PI*i/top.length-Math.PI/2;return <button type="button" key={ch.hanzi} className="ah-cluster" style={{left:`${50+35*Math.cos(angle)}%`,top:`${50+35*Math.sin(angle)}%`}} aria-label={ch.hanzi+' · '+ch.wordIds.length+' '+t('words')} aria-pressed={character===ch} onClick={()=>chooseCharacter(ch.hanzi)}><span lang="zh-Hans">{ch.hanzi}</span><small>{ch.pinyin}</small><small>{ch.wordIds.length}</small></button>})}</div><p className="ah-legend">{t('top')}</p></div><div className="ah-orbit-words"><h3><span className="ah-selected-hanzi" lang="zh-Hans">{character.hanzi}</span> · {relatives.length} {t('words')}</h3><div className="ah-word-buttons">{visibleWords.map(w=>wordButton(w))}</div>{wordPage.pages>1&&paging('words')}</div></div>
   </>:<>
    <p className="ah-legend">{t('matrixHelp')}</p><table className="ah-matrix" aria-label={t('matrixLabel')}><thead><tr><th scope="col">{t('word')}</th>{characters.slice(charPage.start,charPage.end).map(ch=><th scope="col" key={ch.hanzi}><button type="button" aria-pressed={character===ch} onClick={()=>chooseCharacter(ch.hanzi)} lang="zh-Hans"><span>{ch.hanzi}</span><small className="ah-visible-reading">{ch.pinyin}</small></button></th>)}</tr></thead><tbody>{words.slice(wordPage.start,wordPage.end).map(w=><tr key={w.id}><th scope="row"><button type="button" aria-pressed={word?.id===w.id} aria-label={w.hanzi+' · '+w.pinyin+' · '+w.meaning} onClick={()=>chooseWord(w)} lang="zh-Hans"><span>{w.hanzi}</span><small className="ah-visible-reading">{w.pinyin}</small><small className="ah-visible-meaning">{w.meaning}</small></button></th>{characters.slice(charPage.start,charPage.end).map(ch=><td key={ch.hanzi}>{w.hanzi.includes(ch.hanzi)?<button type="button" className={'ah-dot '+(character===ch?'is-shared':'')} aria-label={ch.hanzi+' '+t('inWord')+' '+w.hanzi} aria-pressed={character===ch&&word?.id===w.id} onClick={()=>chooseWord(w,ch.hanzi)}/>:<span aria-hidden="true">·</span>}</td>)}</tr>)}</tbody></table>{paging('words')}{paging('chars')}
   </>}
   </div>
   {word&&<section className="ah-detail" aria-label={t('context')}><div className="ah-detail-heading"><div><strong lang="zh-Hans"><StudyText text={word.hanzi} anchor={character.hanzi} whole/></strong><span>{word.pinyin}</span><p>{word.meaning}</p></div><div className="ah-detail-actions"><button type="button" aria-label={t('listenWord')+' '+word.hanzi} aria-pressed={playing===contextAudio?.source} onClick={()=>listen()}><Volume2 size={17}/>{t('word')}</button><button type="button" onClick={e=>{stop();p.onWrite(word,e.currentTarget)}}><PenLine size={17}/>{word.item?t('write'):t('writeLinked')+' '+(atlasById.get(word.atlasCharacterId??'')?.hanzi??'')}</button></div></div>{word.item?<div className="ah-sentence"><p lang="zh-Hans"><StudyText text={word.item.sentence} anchor={character.hanzi}/></p><p>{word.item.sentencePinyin}</p><p>{word.item.translation}</p>{sentenceAudio&&<button type="button" aria-label={t('listenSentence')} aria-pressed={playing===sentenceAudio.source} onClick={()=>listen(true)}><Volume2 size={17}/>{t('sentence')}</button>}</div>:<p className="ah-muted">{t('noSentence')}</p>}</section>}
   <details className="ah-index" open={indexOpen} onToggle={e=>setIndexOpen(e.currentTarget.open)}><summary>{t('index')} · {characters.length}</summary>{indexOpen&&<div>{characters.map(ch=><button type="button" key={ch.hanzi} aria-pressed={ch===character} aria-label={ch.hanzi+' · '+ch.wordIds.length+' '+t('words')} onClick={()=>chooseCharacter(ch.hanzi)}><span lang="zh-Hans">{ch.hanzi}</span><small>{ch.wordIds.length}</small></button>)}</div>}</details>
  </>}
  <p className="ah-note">{t('note')}</p>
 </section>;
}
