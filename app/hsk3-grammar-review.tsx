'use client';
import { useRef, useState } from 'react';
import { useI18n } from './i18n';
import { withTurkish } from './turkish';
import { useCourseProgress } from './course-store';
import { grammarReviewEvent, grammarReviewQueue } from './grammar-hsk3-learning';
import type { CourseEvent } from './course-learning';

const labels = {
 en: {title:'Independent grammar reviews',back:'Guided learning',due:'Due',new:'New',start:'Review due',learn:'Start new reviews',hint:'Show hint (assisted)',check:'Check answer',next:'Next',yes:'Correct',no:'Not quite',finish:'Session complete',empty:'No reviews due.',note:'Examples stay hidden until you answer. Using a hint does not earn independent recall credit.',error:'Could not save. Retry this answer.',retry:'Retry save'},
 fr: {title:'Révisions autonomes de grammaire',back:'Apprentissage guidé',due:'À revoir',new:'Nouveaux',start:'Réviser',learn:'Commencer les nouveaux',hint:'Afficher un indice (aidé)',check:'Vérifier',next:'Suivant',yes:'Correct',no:'Pas tout à fait',finish:'Session terminée',empty:'Aucune révision prévue.',note:'Les exemples restent cachés avant la réponse. Un indice ne donne aucun crédit de rappel autonome.',error:'Enregistrement impossible. Réessayez.',retry:'Réessayer l’enregistrement'},
 ru: {title:'Самостоятельное повторение грамматики',back:'Обучение с подсказками',due:'К повторению',new:'Новые',start:'Повторить',learn:'Начать новые',hint:'Показать подсказку (с помощью)',check:'Проверить',next:'Далее',yes:'Правильно',no:'Не совсем',finish:'Сессия завершена',empty:'Пока нет повторений.',note:'Примеры скрыты до ответа. Подсказка не засчитывается как самостоятельное воспроизведение.',error:'Не удалось сохранить. Повторите запись.',retry:'Сохранить снова'},
 tr: {title:'Bağımsız dil bilgisi tekrarları',back:'Rehberli öğrenme',due:'Tekrar zamanı',new:'Yeni',start:'Tekrar et',learn:'Yeni tekrarlara başla',hint:'İpucu göster (destekli)',check:'Yanıtı kontrol et',next:'Sonraki',yes:'Doğru',no:'Tam değil',finish:'Oturum tamamlandı',empty:'Tekrar zamanı gelmedi.',note:'Örnekler yanıt verene kadar gizlidir. İpucu kullanımı bağımsız hatırlama sayılmaz.',error:'Kaydedilemedi. Yeniden deneyin.',retry:'Kaydı yeniden dene'},
};
const questions = withTurkish(grammarReviewQueue([]).unseen);
type Question = (typeof questions)[number];

export default function GrammarReview({owner,onBack}:{owner:string|null;onBack:()=>void}) {
 const {locale}=useI18n(), t=labels[locale], progress=useCourseProgress(owner);
 const [queue,setQueue]=useState<Question[]|null>(null),[index,setIndex]=useState(0);
 const [picked,setPicked]=useState<number|null>(null),[hint,setHint]=useState(false);
 const [result,setResult]=useState<CourseEvent|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState(false);
 const submission=useRef<CourseEvent|null>(null),busy=useRef(false),assisted=useRef(false);
 const current=queue?.[index], available=grammarReviewQueue(progress.events);
 const start=(ids:string[])=>{setQueue(ids.map(id=>questions.find(q=>q.ex.id===id)!));setIndex(0);};
 const check=async()=>{
  if(!current||picked===null||busy.current||result)return;
  busy.current=true;setSaving(true);setError(false);
  const event=submission.current??grammarReviewEvent(current.ex.id,picked,assisted.current);
  submission.current=event;
  try{await progress.record(event);setResult(event);}catch{setError(true);}finally{busy.current=false;setSaving(false);}
 };
 const next=()=>{setIndex(i=>i+1);setPicked(null);setHint(false);setResult(null);setError(false);submission.current=null;assisted.current=false;};
 return <section className="hsk-grammar">
  <button disabled={saving} onClick={onBack}>← {t.back}</button><h1>{t.title}</h1>
  <p>{t.note}</p><p role="status">{progress.status}</p>
  {!queue?<><p>{t.due}: {available.due.length} · {t.new}: {available.unseen.length}</p>
   <button disabled={!progress.ready||!available.due.length} onClick={()=>start(available.due.map(q=>q.ex.id))}>{t.start}</button>
   <button disabled={!progress.ready||!available.unseen.length} onClick={()=>start(available.unseen.slice(0,10).map(q=>q.ex.id))}>{t.learn}</button>
   {!available.due.length&&<p>{t.empty}</p>}</>:!current?<><p role="status">{t.finish}</p><button onClick={()=>setQueue(null)}>{t.next}</button></>:<article className="grammar-card">
   <p>{index+1} / {queue.length}</p><p>{current.ex.prompt[locale]}</p><h3 className="grammar-question" lang="zh-Hans">{current.ex.sentence}</h3>
   <div className="grammar-options">{current.ex.options.map((option,i)=><button key={i} lang="zh-Hans" aria-pressed={picked===i} disabled={saving||!!result||error} onClick={()=>setPicked(i)}>{option}</button>)}</div>
   {!result&&!hint&&<button disabled={saving||error} onClick={()=>{assisted.current=true;setHint(true);}}>{t.hint}</button>}
   {(hint||result)&&<aside><h3>{current.card.pattern}</h3><p>{current.card.explanation[locale]}</p><div className="grammar-example"><strong lang="zh-Hans">{current.card.example.hanzi}</strong><span>{current.card.example.pinyin}</span><p>{current.card.example.meaning[locale]}</p></div></aside>}
   {!result?<><button className="primary" disabled={!progress.ready||picked===null||saving} onClick={()=>void check()}>{error?t.retry:t.check}</button>{error&&<p role="alert">{t.error}</p>}</>:<div role="status"><strong>{result.correct?t.yes:t.no}</strong><p lang="zh-Hans">{current.ex.sentence.replace('___',current.ex.options[current.ex.answer])}</p><p>{current.ex.explanation[locale]}</p><button onClick={next}>{t.next}</button></div>}
  </article>}
 </section>;
}
