'use client';
import HskBadge from './hsk-badge';
import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {useI18n} from './i18n';
import {loadDictionaryResources,fetchDictionaryEntry} from './dictionary-client';
import {dictionaryCharacterFamily,dictionaryFamilyParts} from './dictionary-character-family-model';
import {dictionaryWordFamily} from './dictionary-word-family-model';
import {studyOccurrenceCorpus,studyOccurrences,occurrencePage} from './dictionary-lesson-occurrences';
import CloudHighlight from './atlas-cloud-highlight';
import {atlasByHanzi,componentById} from './atlas-model';
import type {DictionaryEntry,StudyDictionary,Pronunciation} from './atlas-spatial-model';
import './dictionary-exploration.css';

const copy={
 en:{title:'Follow a connection',family:'Character families',words:'Related words',lessons:'In lessons',character:'Explore a character',part:'Shared part',shape:'Characters with this written component.',wordNote:'Words containing this character. Lesson vocabulary appears first; the full dictionary remains available.',empty:'No matching entries in the available material.',loading:'Loading connections…',error:'Could not load connections.',retry:'Retry',previous:'Previous',next:'Next',all:'All lessons',word:'Word',sentence:'Sentence',source:'Source',back:'This preview stays in your current definition.'},
 fr:{title:'Suivre un lien',family:'Familles de caractères',words:'Mots associés',lessons:'Dans les leçons',character:'Explorer un caractère',part:'Composant commun',shape:'Caractères contenant ce composant écrit.',wordNote:'Mots contenant ce caractère. Le vocabulaire des leçons apparaît en premier ; le dictionnaire complet reste accessible.',empty:'Aucun résultat dans le contenu disponible.',loading:'Chargement des liens…',error:'Impossible de charger les liens.',retry:'Réessayer',previous:'Précédent',next:'Suivant',all:'Toutes les leçons',word:'Mot',sentence:'Phrase',source:'Source',back:'Cet aperçu reste dans la définition actuelle.'},
 ru:{title:'Проследить связь',family:'Семьи знаков',words:'Связанные слова',lessons:'В уроках',character:'Выбрать знак',part:'Общий компонент',shape:'Знаки с этим письменным компонентом.',wordNote:'Слова с этим знаком. Сначала лексика уроков; доступен и полный словарь.',empty:'Совпадений в доступном материале нет.',loading:'Загрузка связей…',error:'Не удалось загрузить связи.',retry:'Повторить',previous:'Назад',next:'Далее',all:'Все уроки',word:'Слово',sentence:'Предложение',source:'Источник',back:'Просмотр остаётся в текущем окне словаря.'},
 tr:{title:'Bir bağlantıyı izle',family:'Karakter aileleri',words:'İlgili kelimeler',lessons:'Derslerde',character:'Karakteri incele',part:'Ortak parça',shape:'Bu yazılı parçayı içeren karakterler.',wordNote:'Bu karakteri içeren kelimeler. Önce ders kelimeleri; sözlüğün tamamı da kullanılabilir.',empty:'Mevcut materyalde eşleşme yok.',loading:'Bağlantılar yükleniyor…',error:'Bağlantılar yüklenemedi.',retry:'Yeniden dene',previous:'Önceki',next:'Sonraki',all:'Tüm dersler',word:'Kelime',sentence:'Cümle',source:'Kaynak',back:'Bu önizleme geçerli sözlük penceresinde kalır.'}
};
type PreviewJob={text:string;active:()=>boolean;resolve:(entry:DictionaryEntry|undefined)=>void;reject:(error:unknown)=>void};
const previewJobs:PreviewJob[]=[];let previewsRunning=0;
function drainPreviews(){while(previewsRunning<3&&previewJobs.length){const job=previewJobs.shift()!;if(!job.active()){job.resolve(undefined);continue;}previewsRunning++;void fetchDictionaryEntry(job.text).then(job.resolve,job.reject).finally(()=>{previewsRunning--;drainPreviews();});}}
function requestPreview(text:string,active:()=>boolean){return new Promise<DictionaryEntry|undefined>((resolve,reject)=>{previewJobs.push({text,active,resolve,reject});drainPreviews();});}
type Tab='family'|'words'|'lessons';
export type ExplorationView={selected:string;tab:Tab;part:string;page:number;lesson:string};
export default function DictionaryExploration({entry,dictionary,onLookup,speaker,renderSentence,views}:{views:Map<string,ExplorationView>;entry:DictionaryEntry;dictionary:StudyDictionary;onLookup:(text:string,trigger:HTMLButtonElement)=>void;speaker:(v:Pronunciation|undefined)=>ReactNode;renderSentence:(text:string,pinyin:string)=>ReactNode}){
 const {locale}=useI18n(),c=copy[locale];
 const characters=[...new Set(Array.from(entry.text).filter(ch=>/\p{Script=Han}/u.test(ch)))];
 const key=locale+':'+entry.text,saved=views.get(key);
 const [selected,setSelected]=useState(saved?.selected??characters[0]??''),[tab,setTab]=useState<Tab>(saved?.tab??(characters.length===1?'family':'words')),[partChoice,setPartChoice]=useState(saved?.part??''),[page,setPage]=useState(saved?.page??0),[lesson,setLesson]=useState(saved?.lesson??'');
 useEffect(()=>{views.set(key,{selected,tab,part:partChoice,page,lesson});},[views,key,selected,tab,partChoice,page,lesson]);
 const [resources,setResources]=useState<Awaited<ReturnType<typeof loadDictionaryResources>>|null>(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[wordReadings,setWordReadings]=useState<Map<string,DictionaryEntry>>(()=>new Map());
 const character=characters.includes(selected)?selected:characters[0]??'';
 useEffect(()=>{let active=true;setError(false);void loadDictionaryResources().then(value=>{if(active)setResources(value);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[attempt]);
 const allCharacters=useMemo(()=>new Map([...(resources?.characters??[]),...dictionary]),[resources,dictionary]);
 const corpus=useMemo(()=>studyOccurrenceCorpus(locale),[locale]);
 const priority=useMemo(()=>[...new Set(corpus.filter(row=>row.kind==='word').map(row=>row.text))],[corpus]);
 const reviewed=atlasByHanzi.get(character),preferred=reviewed?.phonetic?componentById.get(reviewed.phonetic)?.glyph:undefined;
 const parts=useMemo(()=>dictionaryFamilyParts(character,allCharacters,preferred),[character,allCharacters,preferred]),part=parts.includes(partChoice)?partChoice:parts[0]??character;
 const family=useMemo(()=>tab==='family'?dictionaryCharacterFamily(character,part,allCharacters,priority):[],[tab,character,part,allCharacters,priority]);
 const words=useMemo(()=>tab==='words'?dictionaryWordFamily(resources?.headwords??[],character,priority):[],[tab,resources,character,priority]);
 const occurrences=useMemo(()=>tab==='lessons'?studyOccurrences(entry.text,locale):[],[tab,entry.text,locale]);
 const lessonOptions=[...new Map(occurrences.map(row=>[row.lessonId,row.lessonLabel])).entries()];
 const filtered=lesson?occurrences.filter(row=>row.lessonId===lesson):occurrences;
 const shown=occurrencePage<DictionaryEntry|string>(tab==='family'?family:words,page,8),shownLessons=occurrencePage(filtered,page,5);
 const wordPageKey=tab==='words'?shown.rows.join('\0'):'';
 useEffect(()=>{
  if(tab!=='words')return;let active=true,index=0;const queue=shown.rows as string[];
  async function worker(){while(active&&index<queue.length){const word=queue[index++];if(allCharacters.get(word)?.meaning||wordReadings.has(word))continue;try{const value=await requestPreview(word,()=>active);if(active&&value)setWordReadings(old=>new Map(old).set(word,value));}catch{/* A failed preview never prevents opening the full definition and its retry control. */}}}
  void Promise.all([worker(),worker(),worker()]);return()=>{active=false;};
  // The key represents exactly the visible word requests; successful readings remain cached across pages.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[wordPageKey,allCharacters]);
 function changeTab(value:Tab){setTab(value);setPage(0);setLesson('');}
 function preview(value:DictionaryEntry){return <div className="sp-connection-card" key={value.text}><button type="button" className="sp-connection-target" onClick={e=>onLookup(value.text,e.currentTarget)}><strong lang="zh-Hans"><CloudHighlight hanzi={value.text} component={tab==='family'?part:character}/></strong><span className="sp-reading">{value.pinyin}</span><span>{value.meaning}</span></button><HskBadge text={value.text}/>{value.audio&&speaker(value.audio)}</div>;}
 const paging=tab==='lessons'?shownLessons:shown,total=tab==='family'?family.length:tab==='words'?words.length:filtered.length;
 return <section className="sp-exploration" aria-label={c.title} data-study-exploration="true">
  <h3>{c.title}</h3>
  <div className="sp-exploration-tabs" role="group" aria-label={c.title}>{(['family','words','lessons'] as const).map(value=><button type="button" key={value} aria-pressed={tab===value} onClick={()=>changeTab(value)}>{c[value]}</button>)}</div>
  {tab!=='lessons'&&characters.length>1&&<div className="sp-part-options" role="group" aria-label={c.character}>{characters.map(ch=><button type="button" lang="zh-Hans" key={ch} aria-pressed={character===ch} onClick={()=>{setSelected(ch);setPartChoice('');setPage(0);}}>{ch}</button>)}</div>}
  {tab==='family'&&<><div className="sp-part-options" role="group" aria-label={c.part}><small>{c.part}</small>{parts.map(ch=><button type="button" key={ch} lang="zh-Hans" aria-pressed={part===ch} onClick={()=>{setPartChoice(ch);setPage(0);}}>{ch}</button>)}</div><p className="sp-connection-note">{c.shape}</p></>}
  {tab==='words'&&<p className="sp-connection-note">{c.wordNote}</p>}
  {tab==='lessons'&&<label className="sp-occurrence-filter">{c.lessons}<select value={lesson} onChange={e=>{setLesson(e.target.value);setPage(0);}}><option value="">{c.all}</option>{lessonOptions.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}
  {error&&<p role="alert">{c.error} <button type="button" onClick={()=>setAttempt(v=>v+1)}>{c.retry}</button></p>}
  {!resources&&tab!=='lessons'&&!error?<p role="status">{c.loading}</p>:<>
   {tab==='family'&&<div className="sp-connection-grid">{(shown.rows as DictionaryEntry[]).map(preview)}</div>}
   {tab==='words'&&<div className="sp-connection-grid">{(shown.rows as string[]).map(text=>preview((allCharacters.get(text)?.meaning?allCharacters.get(text):wordReadings.get(text))??{text,pinyin:'',meaning:''}))}</div>}
   {tab==='lessons'&&<div className="sp-occurrences">{shownLessons.rows.map(row=><article key={row.id} data-study-sentence={row.kind==='sentence'?row.text:undefined} data-study-pinyin={row.kind==='sentence'?row.pinyin:undefined} data-study-meaning={row.kind==='sentence'?row.meaning:undefined} data-study-source-id={row.sourceId}><small>{row.lessonLabel} · {row.kind==='word'?c.word:c.sentence}</small><div lang="zh-Hans">{renderSentence(row.text,row.pinyin)}</div><p className="sp-reading">{row.pinyin}</p><p>{row.meaning}</p>{row.note&&<small>{row.note}</small>}{row.audio&&speaker(row.audio)}{row.kind==='word'&&<HskBadge text={row.text}/>}</article>)}</div>}
   {!total&&<p className="sp-connection-note">{c.empty}</p>}
   {total>0&&<nav className="sp-connection-pages" aria-label={c[tab]}><button type="button" disabled={paging.page===0} onClick={()=>setPage(paging.page-1)}>{c.previous}</button><span>{paging.page*(tab==='lessons'?5:8)+1}–{Math.min(total,(paging.page+1)*(tab==='lessons'?5:8))} / {total}</span><button type="button" disabled={paging.page>=paging.pages-1} onClick={()=>setPage(paging.page+1)}>{c.next}</button></nav>}
  </>}
 </section>;
}
