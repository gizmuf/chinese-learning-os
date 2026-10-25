'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,RotateCcw} from 'lucide-react';
import {useI18n} from './i18n';
import {useRecognitionProgress} from './recognition-store';
import {recognitionReviewQuestions,recognitionSummary,type PracticeQuestion} from './recognition-history';
import AtlasRecognition from './atlas-recognition';
import RecognitionDashboard from './recognition-dashboard';
import {playRecording,releaseRecording} from './audio';
import {wordPronunciation} from './atlas-spatial-model';
import './atlas-spatial.css';
import './today-recognition.css';

export default function TodayRecognition({owner}:{owner:string|null}){
 const {locale}=useI18n(),c=(en:string,fr:string,ru:string)=>({en,fr,ru})[locale];
 const progress=useRecognitionProgress(owner),[now,setNow]=useState(()=>Date.now());
 const summary=useMemo(()=>recognitionSummary(progress.events,now),[progress.events,now]);
 const [session,setSession]=useState<{id:string;kind:'difficult'|'due';questions:PracticeQuestion[];initialIndex:number}|null>(null);
 const audio=useRef<HTMLAudioElement|null>(null),[audioError,setAudioError]=useState(false);
 function stop(){if(audio.current){releaseRecording(audio.current);audio.current=null}}
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>{clearInterval(timer);stop()}},[]);
 function review(kind:'difficult'|'due',target?:string){const questions=recognitionReviewQuestions(progress.events,kind,locale);if(!questions.length)return;stop();setSession({id:crypto.randomUUID(),kind,questions,initialIndex:Math.max(0,questions.findIndex(q=>q.target===target))})}
 return <section className="sp-atlas today-recognition panel" aria-labelledby="today-recognition-title">
  <div className="today-recognition-heading"><div><p className="eyebrow">{c('YOUR ATLAS PRACTICE','VOTRE PRATIQUE DE L’ATLAS','ВАША ПРАКТИКА В АТЛАСЕ')}</p><h2 id="today-recognition-title">{c('A little attention for tricky characters','Un peu d’attention aux caractères difficiles','Немного внимания трудным знакам')}</h2></div><RotateCcw size={22} aria-hidden="true"/></div>
  {session?<AtlasRecognition key={session.id} {...session} exitLabel={c('Back to Today','Retour à Aujourd’hui','Вернуться к «Сегодня»')} onExit={()=>{stop();setSession(null)}} onStop={stop} onQuestion={()=>{}} onSave={progress.record} onListen={word=>{stop();setAudioError(false);audio.current=playRecording(wordPronunciation(word).source,()=>setAudioError(true))}}/>:<>
   {!progress.ready?<p role="status">{progress.status==='Device storage unavailable'?c('Device storage is unavailable. Refresh to try again.','Le stockage local est indisponible. Actualisez pour réessayer.','Хранилище устройства недоступно. Обновите страницу.'):c('Loading your reviews…','Chargement de vos révisions…','Загрузка ваших повторений…')}</p>:<>
    <p className="today-recognition-lead">{summary.difficult.length||summary.due.length?c('Your own Atlas results show what needs another look.','Vos résultats dans l’Atlas indiquent ce qui mérite une nouvelle révision.','Ваши результаты в Атласе подскажут, что стоит повторить.'):summary.checked?c('No tricky characters or scheduled reviews right now. Keep exploring the Atlas.','Aucun caractère difficile ni révision prévue pour le moment. Continuez à explorer l’Atlas.','Сейчас нет трудных знаков и повторений по расписанию. Продолжайте изучать Атлас.'):c('Practise recognition in Atlas Compare 4. Your difficult characters and scheduled reviews will appear here.','Entraînez-vous à reconnaître les caractères dans Comparer 4 de l’Atlas. Vos caractères difficiles et révisions prévues apparaîtront ici.','Практикуйте распознавание в разделе «Сравнить 4» Атласа. Здесь появятся ваши трудные знаки и повторения по расписанию.')}</p>
    <div className="today-recognition-options">
     <div><strong>{summary.difficult.length}</strong><span>{c('Needs another try','À réessayer','Нужна ещё попытка')}</span><button type="button" disabled={!summary.difficult.length} onClick={()=>review('difficult')}>{c('Practise difficult characters','Revoir les caractères difficiles','Повторить трудные знаки')}<ArrowRight size={16}/></button></div>
     <div><strong>{summary.due.length}</strong><span>{c('Due for review','À réviser','Пора повторить')}</span><button type="button" disabled={!summary.due.length} onClick={()=>review('due')}>{c('Start scheduled review','Commencer la révision prévue','Начать повторение по расписанию')}<ArrowRight size={16}/></button></div>
    </div>
    {!!summary.difficult.length&&<div className="today-recognition-preview" aria-label={c('Your difficult characters','Vos caractères difficiles','Ваши трудные знаки')}>{summary.difficult.slice(0,8).map(ch=><button type="button" key={ch.target} onClick={()=>review('difficult',ch.target)} aria-label={c('Practise ','Réviser ','Повторить ')+ch.target} lang="zh-Hans">{ch.target}</button>)}{summary.difficult.length>8&&<span>+{summary.difficult.length-8}</span>}</div>}
   </>}
  </>}
  {session&&audioError&&<p role="status">{c('Could not play the recording. Tap the speaker to retry.','Lecture impossible. Touchez le haut-parleur pour réessayer.','Не удалось воспроизвести запись. Нажмите динамик ещё раз.')}</p>}
  <RecognitionDashboard owner={owner} progress={progress} summary={summary} onReview={review}/>
 </section>;
}
