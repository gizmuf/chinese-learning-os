'use client';
import {useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,Volume2,X} from 'lucide-react';
import {useI18n} from './i18n';
import {checkRecognition,recognitionQuestions,type RecognitionAnswer,type SpatialCharacter} from './atlas-spatial-model';
import {useSpatialMotion} from './atlas-spatial-motion';
import type {CloudWord} from './atlas-cloud-model';
type Props={family:SpatialCharacter[];initialHanzi:string;onExit:()=>void;onListen:(word:CloudWord)=>void;onStop:()=>void};
export default function AtlasRecognition({family,initialHanzi,onExit,onListen,onStop}:Props){
 const {locale}=useI18n(),c=(en:string,fr:string,ru:string)=>({en,fr,ru})[locale];
 const questions=useMemo(()=>recognitionQuestions(family,locale),[family,locale]);
 const [index,setIndex]=useState(()=>{const member=family.findIndex(ch=>ch.hanzi===initialHanzi),group=Math.floor(Math.max(0,member)/4);const found=questions.findIndex(q=>Math.floor(family.findIndex(ch=>ch.hanzi===q.target)/4)===group);return Math.max(0,found)});
 const [attempts,setAttempts]=useState<Record<string,{choice?:string;answer?:RecognitionAnswer}>>({});
 const question=questions[index],attempt=question?attempts[question.id]:undefined,answer=attempt?.answer;
 const motion=useSpatialMotion(question?.id??'empty');
 function move(direction:-1|1){const next=index+direction;if(next<0||next>=questions.length)return false;return motion.transition(direction,()=>{onStop();setIndex(next)})}
 if(!question)return <div className="sp-quiz-empty"><p>{c('This family needs at least two characters with word examples for recognition practice.','Il faut au moins deux caractères avec des mots exemples pour cet exercice.','Для упражнения нужны хотя бы два знака с примерами слов.')}</p><button onClick={onExit}>{c('Back to Compare 4','Retour à Comparer 4','Назад к сравнению')}</button></div>;
 return <section className="sp-recognition" aria-label={c('Family recognition practice','Reconnaissance des caractères','Распознавание знаков')}>
  <div className="sp-panel-heading"><h2>{c('Quick recognition','Reconnaissance rapide','Быстрое распознавание')}</h2><button type="button" onClick={onExit}>{c('Back to study','Retour à l’étude','Вернуться к изучению')}</button></div>
  <p className="sp-position" aria-live="polite">{index+1} / {questions.length} · {c('This session only','Cette session uniquement','Только эта сессия')}</p>
  <p className="sp-quiz-instruction">{c('Which character completes this word?','Quel caractère complète ce mot ?','Какой знак завершает это слово?')}</p>
  <p className="sp-quiz-meaning">{question.word.meaning}</p><p className="sp-quiz-mask" lang="zh-Hans">{question.masked}</p>
  <p className="sp-quiz-note">{c('Pinyin and meanings stay hidden until you check. You can swipe past any question.','Le pinyin et les sens restent cachés jusqu’à la vérification. Vous pouvez passer toute question par balayage.','Пиньинь и значения скрыты до проверки. Любой вопрос можно пропустить свайпом.')}</p>
  <div ref={motion.ref} className="sp-quiz-choices" role="group" aria-label={c('Choose a character','Choisir un caractère','Выберите знак')} onPointerDown={motion.pointerDown} onPointerMove={motion.pointerMove} onPointerUp={e=>motion.pointerUp(e,move)} onPointerCancel={motion.pointerCancel} onClickCapture={motion.clickCapture} onDragStart={e=>e.preventDefault()} onKeyDown={e=>{if(e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1)}}}>
   {question.choices.map(h=><button type="button" key={h} aria-pressed={attempt?.choice===h} aria-label={h} className={(answer&&h===question.target?'is-correct ':'')+(answer&&!answer.correct&&h===answer.choice?'is-wrong':'')} onClick={()=>{if(!answer)setAttempts(previous=>({...previous,[question.id]:{choice:h}}))}}><span lang="zh-Hans">{h}</span>{answer&&h===question.target&&<Check size={19}/>} {answer&&!answer.correct&&h===answer.choice&&<X size={19}/>}</button>)}
  </div>
  <div className="sp-quiz-check"><button type="button" disabled={!attempt?.choice||!!answer} onClick={()=>{const checked=checkRecognition(question,attempt!.choice!,answer);if(checked)setAttempts(previous=>({...previous,[question.id]:{choice:attempt!.choice,answer:checked}}))}}>{c('Check answer','Vérifier','Проверить ответ')}</button></div>
  <div className="sp-quiz-feedback" aria-live="polite">{answer&&<><strong>{answer.correct?c('Correct','Correct','Верно'):c('The answer is','La réponse est','Правильный ответ')} · <span lang="zh-Hans">{question.target}</span></strong><p lang="zh-Hans">{question.word.hanzi}</p><p>{question.word.pinyin} · {question.word.meaning}</p><button type="button" onClick={()=>onListen(question.word)}><Volume2 size={16}/>{c('Listen to the whole word','Écouter le mot entier','Слушать целое слово')} · {question.word.hanzi}</button></>}</div>
  <nav className="sp-card-navigation" aria-label={c('Recognition questions','Questions de reconnaissance','Вопросы на распознавание')}><button type="button" disabled={index===0} aria-label={c('Previous question','Question précédente','Предыдущий вопрос')} onClick={()=>move(-1)}><ArrowLeft size={17}/></button><span>{c('Swipe between questions','Balayez entre les questions','Листайте вопросы свайпом')}</span><button type="button" disabled={index===questions.length-1} aria-label={c('Next question','Question suivante','Следующий вопрос')} onClick={()=>move(1)}><ArrowRight size={17}/></button></nav>
 </section>
}
