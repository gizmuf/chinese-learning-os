'use client';

import {useState} from 'react';
import {StudyText} from './study-lookup-context';
import {examCharacters, type ExamLevel} from './hsk-exam-model';
import {useI18n} from './i18n';
import './hsk-exam-characters.css';

const labels = {
  en: {title: 'HSK 3.0 exam characters', through: 'Study through', read: 'Recognize', write: 'Write', writingBand: 'HSK 1–2 share one official writing list.', prompt: 'Select a character for its reading, definition and writing practice.'},
  fr: {title: 'Caractères de l’examen HSK 3.0', through: 'Jusqu’au niveau', read: 'Reconnaître', write: 'Écrire', writingBand: 'Le HSK 1–2 partage une seule liste officielle d’écriture.', prompt: 'Sélectionnez un caractère pour voir sa prononciation, sa définition et vous entraîner à l’écrire.'},
  ru: {title: 'Иероглифы для экзамена HSK 3.0', through: 'Уровень подготовки', read: 'Узнавать', write: 'Писать', writingBand: 'Для HSK 1–2 действует общий официальный список для письма.', prompt: 'Выберите иероглиф, чтобы узнать чтение и значение и потренироваться писать.'},
  tr: {title: 'HSK 3.0 sınav karakterleri', through: 'Çalışma seviyesi', read: 'Tanıma', write: 'Yazma', writingBand: 'HSK 1–2 için tek bir resmî yazma listesi vardır.', prompt: 'Okunuşu, anlamı ve yazma alıştırması için bir karakter seçin.'},
};

export default function HskExamCharacters() {
  const {locale} = useI18n();
  const copy = labels[locale];
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<ExamLevel>('3');
  const [mode, setMode] = useState<'recognition' | 'writing'>('recognition');
  const characters = examCharacters(level, mode);
  return <details className="hsk-exam-characters" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>{copy.title}</summary>
    {open && <>
      <div className="hsk-exam-controls">
        <label>{copy.through}{' '}
          <select value={level} onChange={e => setLevel(e.target.value as ExamLevel)}>
            <option value="1">HSK 1</option>
            <option value="2">HSK 1–2</option>
            <option value="3">HSK 1–3</option>
          </select>
        </label>
        <button className="secondary" type="button" aria-pressed={mode === 'recognition'} onClick={() => setMode('recognition')}>{copy.read}</button>
        <button className="secondary" type="button" aria-pressed={mode === 'writing'} onClick={() => setMode('writing')}>{copy.write}</button>
        <output aria-live="polite">{characters.length}</output>
      </div>
      <p>{mode === 'writing' && level !== '3' ? copy.writingBand + ' ' : ''}{copy.prompt}</p>
      <ul className="hsk-exam-grid" aria-label={mode === 'writing' ? copy.write : copy.read}>
        {characters.map(glyph => <li key={glyph}><StudyText text={glyph} whole/></li>)}
      </ul>
    </>}
  </details>;
}
