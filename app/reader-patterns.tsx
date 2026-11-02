'use client';
import {Volume2} from 'lucide-react';
import {useI18n} from './i18n';
import {StudyText} from './study-lookup';
import {grammarFrames} from './chunk-library-data';
import {patternsForSource} from './reader-patterns-model';
import {playRecording} from './audio';
import './reader-patterns.css';

const labels={
 en:{open:'How this pattern works',source:'In the source sentence',examples:'Same construction · other examples',listen:'Listen to this example'},
 fr:{open:'Comprendre cette structure',source:'Dans la phrase source',examples:'Même structure · autres exemples',listen:'Écouter cet exemple'},
 ru:{open:'Как устроена эта конструкция',source:'В исходном предложении',examples:'Та же конструкция · другие примеры',listen:'Послушать этот пример'},
 tr:{open:'Bu kalıp nasıl çalışır',source:'Kaynak cümlede',examples:'Aynı yapı · başka örnekler',listen:'Bu örneği dinle'},
};
/** Separate construction affordance: ordinary word taps retain dictionary semantics. */
export function ReaderPatternLinks({sourceId,notify=()=>{}}:{sourceId:string;notify?:(message:string)=>void}){
 const {locale}=useI18n(),c=labels[locale];
 return <div className="reader-pattern-links">{patternsForSource(sourceId).map(occurrence=>{
  const frame=grammarFrames.find(f=>f.id===occurrence.frameId)!;
  return <details key={frame.id} data-reader-pattern={frame.id}>
   <summary>{c.open}: <span lang="zh-Hans">{frame.pattern}</span></summary>
   <div className="reader-pattern-body"><p className="reader-pattern-source">{c.source}: <span lang="zh-Hans">{occurrence.markers.map(m=>m.text).join(' … ')}</span></p><p>{frame.note[locale]}</p><h3>{c.examples}</h3>
    {frame.examples.map(example=><article key={example.id} data-study-source-id={'grammar:'+example.id} data-study-sentence={example.hanzi} data-study-pinyin={example.pinyin} data-study-meaning={example.meaning[locale]}>
     <div lang="zh-Hans"><StudyText text={example.hanzi} pinyin={example.pinyin}/></div><p className="pinyin">{example.pinyin}</p><p>{example.meaning[locale]}</p><button className="text-button" aria-label={c.listen+': '+example.hanzi} onClick={()=>playRecording('/speaking-chunks/audio/frame-'+example.id+'.mp3',notify)}><Volume2 size={16}/>{c.listen}</button>
    </article>)}
   </div>
  </details>;
 })}</div>;
}
