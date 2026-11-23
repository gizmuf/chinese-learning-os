'use client';

import {useEffect, useId, useRef, useState} from 'react';
import {useI18n} from './i18n';
import PreparedSentenceListen from './prepared-sentence-listen';
import prepared from '../data/lesson-sentence-audio.json';

const recordings: Record<string, {source: string}> = prepared.familyPractice;
import {practicalFamilyExercises, type PracticalFamilyExercise} from './practical-family-exercise-data';

const copy = {
 en: {start:'Practise this group', prompt:'Choose the missing character', correct:'Correct.', incorrect:'Correct character', next:'Next question', finish:'See result', result:'Correct answers', again:'Practise again'},
 fr: {start:'S’entraîner avec ce groupe', prompt:'Choisissez le caractère manquant', correct:'Correct.', incorrect:'Caractère correct', next:'Question suivante', finish:'Voir le résultat', result:'Bonnes réponses', again:'Recommencer'},
 ru: {start:'Потренироваться с этой группой', prompt:'Выберите пропущенный иероглиф', correct:'Верно.', incorrect:'Правильный иероглиф', next:'Следующий вопрос', finish:'Посмотреть результат', result:'Правильных ответов', again:'Попробовать ещё раз'},
 tr: {start:'Bu grupla alıştırma yap', prompt:'Eksik karakteri seçin', correct:'Doğru.', incorrect:'Doğru karakter', next:'Sonraki soru', finish:'Sonucu gör', result:'Doğru yanıtlar', again:'Tekrar alıştırma yap'},
};

const wordCopy = {
 en: {prompt:'Choose the missing word', incorrect:'Correct word'},
 fr: {prompt:'Choisissez le mot manquant', incorrect:'Mot correct'},
 ru: {prompt:'Выберите пропущенное слово', incorrect:'Правильное слово'},
 tr: {prompt:'Eksik kelimeyi seçin', incorrect:'Doğru kelime'},
};

export default function FamilyExercise({family}: {family:string}) {
 const exercises: Readonly<Partial<Record<string, PracticalFamilyExercise>>> = practicalFamilyExercises;
 const exercise = exercises[family];
 return exercise ? <ExerciseRound exercise={exercise}/> : null;
}

function ExerciseRound({exercise}: {exercise:PracticalFamilyExercise}) {
 const {locale,t} = useI18n();
 const labels = copy[locale];
 const [index, setIndex] = useState(-1);
 const [choice, setChoice] = useState<string | null>(null);
 const [score, setScore] = useState(0);
 const heading = useRef<HTMLHeadingElement>(null);
 const labelId = useId();
 const {questions, options} = exercise;
 const terms = options.some(option => [...option].length>1) ? wordCopy[locale] : labels;
 const question = questions[index];
 const answered = choice !== null;

 useEffect(() => {
  if (index >= 0) heading.current?.focus({preventScroll:true});
 }, [index]);

 function restart() {
  setChoice(null);
  setScore(0);
  setIndex(0);
 }

 if (index === -1) {
  return <button className="secondary practical-family-start" type="button" onClick={restart}>
   {labels.start} · {questions.length}
  </button>;
 }

 if (!question) {
  return <div className="practical-family-exercise">
   <h4 ref={heading} tabIndex={-1}>{labels.result} {score}/{questions.length}</h4>
   <button className="secondary" type="button" onClick={restart}>{labels.again}</button>
  </div>;
 }

 const sentence = question.before + question.answer + question.after;

 return <section className="practical-family-exercise" aria-labelledby={labelId} data-study-assessment={answered?'complete':'blocked'}>
  <h4 id={labelId} ref={heading} tabIndex={-1}>{terms.prompt} <span>{index+1}/{questions.length}</span></h4>
  <p className="practical-family-sentence" lang="zh-Hans">{question.before}<span className="practical-family-blank">＿</span>{question.after}</p>
  <div className="practical-family-options" role="group" aria-labelledby={labelId}>
   {options.map(option => <button className="secondary" type="button" key={option} lang="zh-Hans"
    aria-disabled={answered||undefined} aria-pressed={answered?choice===option:undefined}
    data-answer={answered&&option===question.answer?'correct':undefined} onClick={() => {
     if (answered) return;
     setChoice(option);
     if (option === question.answer) setScore(value => value+1);
    }}>{option}</button>)}
  </div>
  <div role="status" aria-live="polite">
   {answered && <div className="practical-family-feedback">
    <p><strong>{choice===question.answer?labels.correct:terms.incorrect+' '}</strong>
     {choice!==question.answer && <strong lang="zh-Hans">{question.answer}</strong>}</p>
    <p className="practical-family-sentence" lang="zh-Hans">{question.before}<mark>{question.answer}</mark>{question.after}</p>
    <p lang="zh-Latn">{question.pinyin}</p>
    <p>{question.meaning[locale]}</p>
    <p>{question.explanation[locale]}</p>
    <PreparedSentenceListen text={sentence} source={recordings[sentence]?.source} label={t('Listen')}/>
   </div>}
  </div>
  {answered && <button className="secondary" type="button" onClick={() => {
   setChoice(null);
   setIndex(value => value+1);
  }}>{index+1===questions.length?labels.finish:labels.next}</button>}
 </section>;
}
