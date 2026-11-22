'use client';

import {useState, type ReactNode} from 'react';
import {Network} from 'lucide-react';
import {useI18n} from './i18n';
import {relatedStudySentence,relatedStudyWords} from './dictionary-lesson-occurrences';
import type {DictionaryEntry,Pronunciation} from './atlas-spatial-model';
import './dictionary-exploration.css';

const labels={
 en:{choose:'Shared character',title:(ch:string)=>'Words with '+ch,atlas:'Open word family in Atlas',example:'Seen in a lesson'},
 fr:{choose:'Caractère commun',title:(ch:string)=>'Mots avec '+ch,atlas:'Ouvrir la famille de mots dans l’Atlas',example:'Vu dans une leçon'},
 ru:{choose:'Общий знак',title:(ch:string)=>'Слова со знаком '+ch,atlas:'Открыть группу слов в Атласе',example:'Пример из урока'},
 tr:{choose:'Ortak karakter',title:(ch:string)=>ch+' içeren kelimeler',atlas:'Kelime ailesini Atlas’ta aç',example:'Dersten bir örnek'},
};

export default function DictionarySharedWords({entry,onLookup,onAtlas,speaker}:{
 entry:DictionaryEntry;
 onLookup:(text:string,trigger:HTMLButtonElement)=>void;
 onAtlas?:(character:string)=>void;
 speaker:(audio:Pronunciation|undefined)=>ReactNode;
}){
 const {locale}=useI18n(),copy=labels[locale];
 // Sentences already expose their individual words in the breakdown.
 const glyphs=/^[\p{Script=Han}]{1,8}$/u.test(entry.text)?[...new Set(Array.from(entry.text))]:[];
 const lessonId=entry.contextual?.sourceId?.split(':')[0];
 const groups=glyphs.map(character=>({character,rows:relatedStudyWords(character,locale,lessonId,entry.text)}));
 const [selected,setSelected]=useState('');
 const group=groups.find(g=>g.character===selected)??groups.find(g=>g.rows.length)??groups[0];
 if(!group)return null;
 const example=group.rows.length?undefined:relatedStudySentence(group.character,locale,lessonId);
 const highlighted=(value:string)=>value.split(group.character).map((part,i)=><span key={i}>{i>0&&
  <mark className="sp-dictionary-current">{group.character}</mark>}{part}</span>);
 return <section className="sp-shared-words" aria-label={copy.title(group.character)}>
  <h3>{copy.title(group.character)}</h3>
  {groups.length>1&&<div className="sp-part-options" role="group" aria-label={copy.choose}>
   {groups.map(({character})=><button type="button" key={character} lang="zh-Hans"
    aria-pressed={character===group.character} onClick={()=>setSelected(character)}>{character}</button>)}
  </div>}
  {onAtlas&&<button type="button" className="text-button sp-shared-atlas" onClick={()=>onAtlas(group.character)}>
   <Network size={17} aria-hidden="true"/>{copy.atlas} · <span lang="zh-Hans">{group.character}</span>
  </button>}
  {group.rows.length>0&&<ul className="sp-shared-words-list">
   {group.rows.slice(0,4).map(row=><li key={row.text}>
    <button type="button" className="sp-connection-target" onClick={event=>onLookup(row.text,event.currentTarget)}>
     <strong lang="zh-Hans">{highlighted(row.text)}</strong>
     <span className="sp-reading">{row.pinyin}</span><span>{row.meaning}</span>
    </button>
    {row.audio&&speaker(row.audio)}
   </li>)}
  </ul>}
  {example&&<div className="sp-shared-example">
   <small>{copy.example} · {example.lessonLabel}</small>
   <p lang="zh-Hans">{highlighted(example.text)}</p>
   <p className="sp-reading">{example.pinyin}</p>
   <p>{example.meaning}</p>
   {example.audio&&speaker(example.audio)}
  </div>}
 </section>;
}
