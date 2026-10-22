"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Volume2 } from "lucide-react";
import { A } from "./atlas-data";
import { useI18n } from "./i18n";
import { familyIds, type FamilyId } from "./atlas-workshop-data";
import { listeningOptions, listeningPool, listeningQueue, type ListeningKind, type ListeningTarget } from "./atlas-listening-model";
import { atlasCards, newAtlasEvent, type AtlasEvent } from "./atlas-learning";
import { emptyAnswer, sessionTotals } from "./atlas-session";
import { playRecording, stopAudio } from "./audio";
import { useSwipeNavigation } from "./use-swipe-navigation";
const copy={
 title:A("Listen first. Find the meaning.","Écoutez d’abord. Retrouvez le sens.","Сначала слушайте. Найдите значение."),
 intro:A("New Atlas words and sentences. Hanzi and pinyin appear only after you check an answer.","Les nouveaux mots et phrases de l’Atlas. Les caractères et le pinyin apparaissent seulement après vérification.","Новые слова и предложения Атласа. Иероглифы и пиньинь появятся только после проверки ответа."),
 word:A("Words","Mots","Слова"),sentence:A("Sentences","Phrases","Предложения"),all:A("All families","Toutes les familles","Все семейства"),
 wood:A("Wood","Bois","Дерево"),light:A("Sun and moon","Soleil et lune","Солнце и луна"),water:A("Water","Eau","Вода"),person:A("People","Personnes","Люди"),mouth:A("Mouth","Bouche","Рот"),qing:A("Sound clues","Indices sonores","Звуковые подсказки"),
 choose:A("Choose activity","Choisir l’activité","Выбрать упражнение"),
 start:A("Start listening","Commencer l’écoute","Начать аудирование"),restart:A("New session","Nouvelle séance","Новая сессия"),
 question:A("What does the recording mean?","Que signifie l’enregistrement ?","Что означает запись?"),
 play:A("Play recording","Écouter l’enregistrement","Слушать запись"),
 instruction:A("Listen, then choose the meaning. You can replay as often as you need.","Écoutez, puis choisissez le sens. Réécoutez autant que nécessaire.","Послушайте и выберите значение. Запись можно повторять сколько нужно."),
 first:A("Play the recording before checking your answer.","Écoutez l’enregistrement avant de vérifier votre réponse.","Прослушайте запись перед проверкой ответа."),
 swipe:A("Swipe left/right to browse. Skipping does not record an answer.","Balayez à gauche ou à droite. Passer une question n’enregistre pas de réponse.","Листайте влево или вправо. Пропуск не записывает ответ."),
 available:A("available","disponibles","доступно"),due:A("due for review","à réviser","к повторению"),
 summary:A("Listening session summary","Bilan de l’écoute","Итоги аудирования"),
 correct:A("correct","correctes","верных"),independent:A("correct without answer hints","correctes sans indice","верных без подсказки"),answered:A("answered","réponses données","отвечено"),unanswered:A("unanswered","sans réponse","без ответа"),
 return:A("Return to unanswered questions","Revenir aux questions sans réponse","Вернуться к пропущенным вопросам"),
 choices:A("Answer choices","Choix de réponse","Варианты ответа"),family:A("Listening family","Famille à écouter","Семейство для аудирования"),kind:A("Listening activity","Activité d’écoute","Вид аудирования"),
 saved:A("Answers are saved to your Atlas history. Word and sentence listening have separate review schedules.","Les réponses sont enregistrées dans votre historique Atlas. Mots et phrases ont des révisions séparées.","Ответы сохраняются в истории Атласа. У слов и предложений отдельные расписания повторения."),
};
export default function AtlasListening({events,ready,record,notify}:{events:AtlasEvent[];ready:boolean;record:(e:AtlasEvent)=>Promise<void>;notify:(message:string)=>void}){
 const {locale,t}=useI18n();const c=(key:keyof typeof copy)=>copy[key][locale];
 const [kind,setKind]=useState<ListeningKind>("word"),[family,setFamily]=useState<FamilyId|"all">("all");
 const [tasks,setTasks]=useState<ListeningTarget[]|null>(null),[answers,setAnswers]=useState<ReturnType<typeof emptyAnswer>[]>([]),[index,setIndex]=useState(0),[done,setDone]=useState(false),[saving,setSaving]=useState(false);
 const playback=useRef<HTMLAudioElement|null>(null),pending=useRef(new Map<string,AtlasEvent>()),lock=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;playback.current=null;stopAudio();};},[]);
 const pool=listeningPool(kind,family),cards=useMemo(()=>atlasCards(events),[events]),due=pool.filter(q=>cards[q.id+":sound"]&&new Date(cards[q.id+":sound"].due).getTime()<=Date.now()).length;
 function stop(){playback.current=null;stopAudio();}
 function start(){if(lock.current)return;stop();const queue=listeningQueue(pool,events);setTasks(queue);setAnswers(queue.map(emptyAnswer));setIndex(0);setDone(false);pending.current.clear();}
 function reset(){if(lock.current)return;stop();setTasks(null);setDone(false);}
 function update(at:number,patch:Partial<ReturnType<typeof emptyAnswer>>){setAnswers(all=>all.map((a,i)=>i===at?{...a,...patch}:a));}
 function go(delta:number){if(lock.current||!tasks)return;const next=index+delta;if(next<0||next>=tasks.length)return;stop();setIndex(next);}
 const swipe=useSwipeNavigation(go,saving);
 const header=<><p className="eyebrow">{t("Listening")}</p><h2>{c("title")}</h2><p>{c("intro")}</p></>;
 if(!tasks)return <section className="panel atlas-quiz">{header}
  <div className="atlas-actions" role="group" aria-label={c("kind")}>{(["word","sentence"] as const).map(id=><button key={id} className={kind===id?"primary":"secondary"} aria-pressed={kind===id} onClick={()=>setKind(id)}>{c(id)}</button>)}</div>
  <div className="atlas-actions" role="group" aria-label={c("family")}>{(["all",...familyIds] as const).map(id=><button key={id} className={family===id?"primary":"secondary"} aria-pressed={family===id} onClick={()=>setFamily(id)}>{c(id)}</button>)}</div>
  <p>{pool.length} {c("available")} · {due} {c("due")}</p><button className="primary" disabled={!ready||!pool.length} onClick={start}><Volume2 size={18}/>{c("start")}</button><p className="atlas-swipe-note">{c("saved")}</p>
 </section>;
 const task=tasks[index],answer=answers[index],options=listeningOptions(task,locale),totals=sessionTotals(answers);
 function play(){if(lock.current)return;const at=index;const audio=playRecording(task.recording,m=>notify(t(m)));playback.current=audio;audio.addEventListener("playing",()=>{if(mounted.current&&playback.current===audio)update(at,{played:true});},{once:true});}
 async function check(){
  if(!ready||!answer.played||!answer.picked||answer.result!==null||lock.current)return;
  lock.current=true;setSaving(true);const correct=answer.picked===task.id;
  const event=pending.current.get(task.id)??newAtlasEvent(task.id,"sound","choice",correct?3:1,false);pending.current.set(task.id,event);
  try{await record(event);if(mounted.current)update(index,{result:correct,credited:correct,independent:correct});}
  catch{if(mounted.current)notify(t("Could not save this review. Please try again."));}
  finally{lock.current=false;if(mounted.current)setSaving(false);}
 }
 if(done)return <section className="panel atlas-quiz-complete"><Check size={32}/><h2>{c("summary")}</h2><p>{totals.score}/{tasks.length} {c("correct")}</p><p>{totals.independent} {c("independent")}</p><p>{totals.answered}/{tasks.length} {c("answered")} · {tasks.length-totals.answered} {c("unanswered")}</p>{totals.answered<tasks.length&&<button className="secondary" onClick={()=>{setIndex(answers.findIndex(a=>a.result===null));setDone(false);}}>{c("return")}</button>}<button className="primary" onClick={reset}>{c("restart")}</button></section>;
 return <section className="panel atlas-quiz" {...swipe} aria-label={t("Listening")}>
  <p className="eyebrow">{c(kind)}</p><div className="atlas-session-nav"><button className="text-button" disabled={saving||index===0} aria-label={t("Previous activity")} onClick={()=>go(-1)}><ArrowLeft size={16}/>{t("Previous")}</button><span>{index+1}/{tasks.length}</span><button className="text-button" disabled={saving||index===tasks.length-1} aria-label={t("Next activity")} onClick={()=>go(1)}>{t("Next")}<ArrowRight size={16}/></button></div>
  <h2>{c("question")}</h2><p>{c("instruction")}</p><p className="atlas-swipe-note">{c("swipe")}</p>
  <button className="primary atlas-listen" disabled={saving} onClick={play}><Volume2 size={24}/>{c("play")}</button>
  <div className="atlas-quiz-options" role="group" aria-label={c("choices")}>{options.map(o=><button key={o.id} disabled={saving||answer.result!==null||pending.current.has(task.id)} aria-pressed={answer.picked===o.id} className={answer.picked===o.id?"selected":""} onClick={()=>update(index,{picked:o.id})}>{o.label}</button>)}</div>
  <div className="atlas-actions"><button className="primary" disabled={!ready||saving||!answer.played||!answer.picked||answer.result!==null} onClick={()=>void check()}>{t(saving?"Saving…":"Check answer")}<Check size={16}/></button><button className="text-button" disabled={saving} onClick={reset}>{c("choose")}</button>{index===tasks.length-1&&<button className="secondary" disabled={saving} onClick={()=>{stop();setDone(true);}}>{t("Finish practice")}</button>}</div>
  {!answer.played&&answer.result===null&&<p>{c("first")}</p>}
  {answer.result!==null&&<div className={"atlas-answer "+(answer.result?"correct":"")} role="status"><strong>{t(answer.result?"Correct.":"Not yet. Compare the explanation.")}</strong><p className="atlas-question-word" lang="zh-Hans">{task.hanzi}</p><p className="pinyin">{task.pinyin}</p><p>{task.meaning[locale]}</p></div>}
 </section>;
}
