'use client';
import {useEffect,useId,useMemo,useRef,useState,type CSSProperties} from 'react';
import {ArrowLeft,ArrowRight,Volume2,X} from 'lucide-react';
import {useI18n} from './i18n';
import {playRecording,releaseRecording} from './audio';
import {useSwipeNavigation} from './use-swipe-navigation';
import {appStudyDictionary} from './study-lookup-model';
import {DictionaryAudio,DictionaryWords,StudyDictionaryDialog} from './study-dictionary';
import type {DictionaryEntry,Pronunciation} from './atlas-spatial-model';
import {confusionDictionary,confusionGroups,confusionItems,confusionRecording,contrastCategories} from './often-confused-data';
import './often-confused.css';
import {ContrastPicture} from './often-confused-pictures';
export {ContrastPicture} from './often-confused-pictures';

const L=(en:string,fr:string,ru:string,tr:string)=>({en,fr,ru,tr});
export const confusionCopy={
 title:L('Often confused','Souvent confondus','Часто путают','Sık karıştırılanlar'),
 pilot:L('Picture · sound · meaning','Image · son · sens','Картинка · звук · смысл','Görsel · ses · anlam'),
 intro:L('Compare the pictures and sounds. Tap a Chinese word to explore its meaning.','Comparez les images et les sons. Touchez un mot chinois pour explorer son sens.','Сравните картинки и звучание. Нажмите на китайское слово, чтобы узнать значение.','Görselleri ve sesleri karşılaştır. Anlamını incelemek için Çince kelimeye dokun.'),
 close:L('Back to my cards','Retour à mes cartes','Вернуться к карточкам','Kartlarıma dön'),
 groups:L('Choose a contrast','Choisir un contraste','Выбрать сравнение','Bir karşılaştırma seç'),
 previous:L('Previous set','Groupe précédent','Предыдущий набор','Önceki grup'),
 next:L('Next set','Groupe suivant','Следующий набор','Sonraki grup'),
 word:L('Word','Mot','Слово','Kelime'),
 sentence:L('Sentence','Phrase','Предложение','Cümle'),
 note:L('Pictures are memory cues, not explanations of character origins.','Les images aident à mémoriser ; elles ne racontent pas l’origine des caractères.','Картинки помогают запоминать, но не объясняют происхождение знаков.','Görseller hatırlama ipuçlarıdır; karakterlerin kökenini açıklamaz.'),
 browse:L('Browse all sets','Parcourir tous les groupes','Все наборы','Tüm grupları incele'),
 search:L('Find a word, sound or meaning','Chercher un mot, un son ou un sens','Найти слово, звучание или значение','Kelime, ses veya anlam ara'),
 all:L('All sets','Tous les groupes','Все наборы','Tüm gruplar'),
 tone:L('Tone contrasts','Contrastes de tons','Различия тонов','Ton farkları'),
 sound:L('Similar sounds','Sons proches','Похожие звуки','Benzer sesler'),
 homophone:L('Same sound','Même prononciation','Одинаковое звучание','Aynı ses'),
 meaning:L('Meaning contrasts','Contrastes de sens','Различия значений','Anlam farkları'),
 learn:L('See everything','Tout voir','Показать всё','Hepsini gör'),
 recall:L('Recall from the picture','Retrouver à partir de l’image','Вспомнить по картинке','Görselden hatırla'),
 recallHelp:L('Say the word and its tone before revealing it. This is a self-check; no result or pronunciation score is saved.','Dites le mot avec son ton avant de l’afficher. C’est une auto-évaluation : aucun résultat ni score de prononciation n’est enregistré.','Сначала произнесите слово с тоном, затем откройте ответ. Это самопроверка: результат и оценка произношения не сохраняются.','Açmadan önce kelimeyi tonuyla söyle. Bu bir öz kontroldür; sonuç veya telaffuz puanı kaydedilmez.'),
 reveal:L('Reveal word & example','Afficher le mot et l’exemple','Открыть слово и пример','Kelime ve örneği göster'),
 hearReveal:L('Listen & reveal','Écouter et afficher','Послушать и открыть','Dinle ve göster'),
 hidden:L('Remember the Chinese word','Retrouvez le mot chinois','Вспомните китайское слово','Çince kelimeyi hatırla'),
 empty:L('No matching set. Try a shorter word or another filter.','Aucun groupe trouvé. Essayez un mot plus court ou un autre filtre.','Ничего не найдено. Попробуйте более короткое слово или другой фильтр.','Eşleşen grup yok. Daha kısa bir kelime veya başka filtre dene.'),
};

type Category='all'|'tone'|'sound'|'homophone'|'meaning';
const searchForm=(text:string)=>text.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
export function matchesContrast(group:typeof confusionGroups[number],query:string,locale:ReturnType<typeof useI18n>['locale']){
 const values=[group.title[locale],...group.items.flatMap(id=>{const i=confusionItems.find(v=>v.id===id)!;return [i.hanzi,i.pinyin,i.meaning[locale],i.meaning.en]})];
 return searchForm(values.join(' ')).includes(searchForm(query.trim()));
}

export default function OftenConfused({onClose,notify,initialIndex=0,onIndexChange}:{onClose:()=>void;notify:(message:string)=>void;initialIndex?:number;onIndexChange?:(index:number)=>void}){
 const {locale,t}=useI18n(),c=(key:keyof typeof confusionCopy)=>confusionCopy[key][locale];
 const [index,setIndex]=useState(()=>Math.max(0,Math.min(confusionGroups.length-1,initialIndex))),[entry,setEntry]=useState<DictionaryEntry|null>(null),[playing,setPlaying]=useState<string|null>(null);
 const [browse,setBrowse]=useState(false),[query,setQuery]=useState(''),[category,setCategory]=useState<Category>('all'),[recall,setRecall]=useState(false),[revealed,setRevealed]=useState<string[]>([]);
 const dialog=useRef<HTMLDialogElement>(null),definition=useRef<HTMLDialogElement>(null),opener=useRef<HTMLElement|null>(null),audio=useRef<HTMLAudioElement|null>(null),titleId=useId();
 const dictionary=useMemo(()=>confusionDictionary(appStudyDictionary(locale),locale),[locale]);
 function stop(){if(audio.current)releaseRecording(audio.current);audio.current=null;setPlaying(null)}
 useEffect(()=>{dialog.current?.showModal();return()=>{if(audio.current)releaseRecording(audio.current)}},[]);
 useEffect(()=>{stop();setEntry(null);setRevealed([]);if(dialog.current)dialog.current.scrollTop=0},[index,locale]);
 useEffect(()=>onIndexChange?.(index),[index,onIndexChange]);
 function move(delta:number){setIndex(i=>Math.max(0,Math.min(confusionGroups.length-1,i+delta)))}
 const swipe=useSwipeNavigation(move);
 function listen(clip:Pronunciation){const player=playRecording(clip.source,m=>notify(t(m)));audio.current=player;setPlaying(clip.source);const ended=player.onended,error=player.onerror;player.onended=e=>{if(typeof ended==='function')ended.call(player,e);if(audio.current===player){audio.current=null;setPlaying(null)}};player.onerror=(...args)=>{if(typeof error==='function')error.apply(player,args);if(audio.current===player)setPlaying(null)};}
 function lookup(text:string,trigger:HTMLButtonElement){if(!definition.current?.open)opener.current=trigger;setEntry(dictionary.get(text)??{text,pinyin:'',meaning:t('Not yet in this study dictionary.')})}
 function closeDefinition(){setEntry(null);stop();requestAnimationFrame(()=>opener.current?.isConnected&&opener.current.focus())}
 const group=confusionGroups[index];
 return <><dialog ref={dialog} className="oc-dialog" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target!==dialog.current)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose()}}>
  <header className="oc-header"><div><small>{c('pilot')}</small><h2 id={titleId}>{c('title')}</h2></div><button type="button" className="secondary" aria-label={c('close')} onClick={onClose}><X size={20}/></button></header>
  <p className="oc-intro">{c('intro')}</p>
  <div className="oc-tools"><button type="button" className="secondary" aria-expanded={browse} onClick={()=>setBrowse(!browse)}>{c('browse')} · {confusionGroups.length}</button><div className="oc-learning-modes" role="group" aria-label={c('title')}><button type="button" className="secondary" aria-pressed={!recall} onClick={()=>{setRecall(false);setRevealed([])}}>{c('learn')}</button><button type="button" className="secondary" aria-pressed={recall} onClick={()=>{setRecall(true);setRevealed([]);stop()}}>{c('recall')}</button></div></div>
  {browse&&<section className="oc-library" aria-label={c('groups')}><label>{c('search')}<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label><nav className="oc-categories" aria-label={c('groups')}>{(['all','tone','sound','homophone','meaning'] as const).map(key=><button type="button" key={key} aria-pressed={category===key} onClick={()=>setCategory(key)}>{c(key)}</button>)}</nav><div className="oc-library-grid">{confusionGroups.map((g,i)=>({g,i})).filter(({g})=>(category==='all'||contrastCategories(g).includes(category))&&matchesContrast(g,query,locale)).map(({g,i})=><button type="button" key={g.id} aria-pressed={index===i} onClick={()=>{setIndex(i);setBrowse(false)}}><strong>{g.title[locale]}</strong><span lang="zh-Hans">{g.items.map(id=>confusionItems.find(v=>v.id===id)!.hanzi).join(' / ')}</span><small>{g.items.map(id=>confusionItems.find(v=>v.id===id)!.pinyin).join(' / ')}</small></button>)}</div>{!confusionGroups.some(g=>(category==='all'||contrastCategories(g).includes(category))&&matchesContrast(g,query,locale))&&<p role="status">{c('empty')}</p>}</section>}
  {recall&&<p className="oc-recall-help">{c('recallHelp')}</p>}
  <section className="oc-board" {...swipe} aria-label={group.title[locale]}><div className="oc-board-title"><h3>{group.title[locale]}</h3><span>{index+1} / {confusionGroups.length}</span></div>
   <div className="oc-cards" style={{'--oc-columns':group.items.length} as CSSProperties}>{group.items.map(id=>{const item=confusionItems.find(v=>v.id===id)!,visible=!recall||revealed.includes(id);return <article className="oc-card" key={id} aria-label={visible?item.hanzi+' · '+item.pinyin+' · '+item.meaning[locale]:item.meaning[locale]}>
    {visible?<><div className="oc-word-head"><div><div className="oc-word" lang="zh-Hans"><DictionaryWords text={item.hanzi} dictionary={dictionary} onLookup={lookup}/></div><p className="oc-pinyin">{item.pinyin}</p></div><ContrastPicture scene={item.scene}/></div><h4>{item.meaning[locale]}</h4>
    <button type="button" className="secondary oc-audio" aria-label={c('word')+': '+item.hanzi+' · '+item.pinyin} onClick={()=>listen(confusionRecording(id,'word'))}><Volume2 size={17}/>{c('word')}</button>
    <p className="oc-example" lang="zh-Hans"><DictionaryWords text={item.sentence} dictionary={dictionary} onLookup={lookup}/></p><p className="oc-example-pinyin">{item.sentencePinyin}</p><p className="oc-translation">{item.translation[locale]}</p>
    <button type="button" className="secondary oc-audio" aria-label={c('sentence')+': '+item.sentence} onClick={()=>listen(confusionRecording(id,'sentence'))}><Volume2 size={17}/>{c('sentence')}</button></>:<><ContrastPicture scene={item.scene}/><h4>{item.meaning[locale]}</h4><p className="oc-covered">{c('hidden')}</p><button type="button" className="secondary oc-reveal" onClick={()=>setRevealed(old=>[...old,id])}>{c('reveal')}</button><button type="button" className="secondary oc-audio" onClick={()=>{setRevealed(old=>[...old,id]);listen(confusionRecording(id,'word'))}}><Volume2 size={17}/>{c('hearReveal')}</button></>}
   </article>})}</div>{(!recall||group.items.every(id=>revealed.includes(id)))&&<p className="oc-contrast-note">{group.note[locale]}</p>}
  </section>
  <nav className="oc-navigation" aria-label={c('groups')}><button type="button" className="secondary" aria-label={c('previous')} disabled={index===0} onClick={()=>move(-1)}><ArrowLeft size={19}/></button><span>{index+1} / {confusionGroups.length}</span><button type="button" className="secondary" aria-label={c('next')} disabled={index===confusionGroups.length-1} onClick={()=>move(1)}><ArrowRight size={19}/></button></nav><p className="oc-footnote">{c('note')}</p>
 </dialog><StudyDictionaryDialog entry={entry} dictionary={dictionary} dialog={definition} opener={opener} headingId={titleId+'-definition'} onClose={closeDefinition} onLookup={lookup} speaker={clip=><DictionaryAudio recording={clip} playing={playing} onPlay={listen}/>}/></>;
}
