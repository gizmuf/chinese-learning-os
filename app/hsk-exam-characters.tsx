'use client';

import {useEffect, useState} from 'react';
import {StudyText} from './study-lookup-context';
import {examCharacters, readExamChecklist, type ExamLevel, type ExamMode} from './hsk-exam-model';
import {useI18n} from './i18n';
import './hsk-exam-characters.css';

const labels = {
  en: {title: 'HSK 3.0 exam characters', through: 'Study through', read: 'Recognize', write: 'Write', writingBand: 'HSK 1–2 share one official writing list.', prompt: 'Select a character for its reading, definition and writing practice.'},
  fr: {title: 'Caractères de l’examen HSK 3.0', through: 'Jusqu’au niveau', read: 'Reconnaître', write: 'Écrire', writingBand: 'Le HSK 1–2 partage une seule liste officielle d’écriture.', prompt: 'Sélectionnez un caractère pour voir sa prononciation, sa définition et vous entraîner à l’écrire.'},
  ru: {title: 'Иероглифы для экзамена HSK 3.0', through: 'Уровень подготовки', read: 'Узнавать', write: 'Писать', writingBand: 'Для HSK 1–2 действует общий официальный список для письма.', prompt: 'Выберите иероглиф, чтобы узнать чтение и значение и потренироваться писать.'},
  tr: {title: 'HSK 3.0 sınav karakterleri', through: 'Çalışma seviyesi', read: 'Tanıma', write: 'Yazma', writingBand: 'HSK 1–2 için tek bir resmî yazma listesi vardır.', prompt: 'Okunuşu, anlamı ve yazma alıştırması için bir karakter seçin.'},
};

const checklistCopy = {
  en: {all: 'All characters', remaining: 'Still to learn', done: 'known', left: 'left', device: 'Progress saved on this device', unsaved: 'Progress could not be saved on this device.', mark: (glyph: string, mode: ExamMode) => mode === 'recognition' ? 'I recognize ' + glyph : 'I can write ' + glyph, complete: 'You’ve checked off every character in this list.'},
  fr: {all: 'Tous les caractères', remaining: 'À apprendre', done: 'acquis', left: 'restants', device: 'Progression enregistrée sur cet appareil', unsaved: 'Impossible d’enregistrer la progression sur cet appareil.', mark: (glyph: string, mode: ExamMode) => (mode === 'recognition' ? 'Je reconnais ' : 'Je sais écrire ') + glyph, complete: 'Tous les caractères de cette liste sont cochés.'},
  ru: {all: 'Все иероглифы', remaining: 'Осталось выучить', done: 'изучено', left: 'осталось', device: 'Прогресс сохраняется на этом устройстве', unsaved: 'Не удалось сохранить прогресс на этом устройстве.', mark: (glyph: string, mode: ExamMode) => (mode === 'recognition' ? 'Я узнаю ' : 'Я умею писать ') + glyph, complete: 'Все иероглифы в этом списке отмечены.'},
  tr: {all: 'Tüm karakterler', remaining: 'Öğrenilecekler', done: 'bilinen', left: 'kalan', device: 'İlerleme bu cihazda saklanır', unsaved: 'İlerleme bu cihazda kaydedilemedi.', mark: (glyph: string, mode: ExamMode) => glyph + (mode === 'recognition' ? ' karakterini tanıyorum' : ' karakterini yazabiliyorum'), complete: 'Bu listedeki tüm karakterleri işaretlediniz.'},
};

export default function HskExamCharacters({owner}: {owner: string}) {
  const {locale} = useI18n();
  const copy = labels[locale];
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<ExamLevel>('3');
  const [mode, setMode] = useState<ExamMode>('recognition');
  const [checklist, setChecklist] = useState(() => readExamChecklist(null));
  const [ready, setReady] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [remainingOnly, setRemainingOnly] = useState(false);
  const key = 'chinese-os:hsk-exam-checklist:v1:' + owner;
  const progress = checklistCopy[locale];

  useEffect(() => {
    if (window.location.hash === '#hsk-exam') {
      const section = document.getElementById('hsk-exam') as HTMLDetailsElement | null;
      if (section) {
        section.open = true;
        requestAnimationFrame(() => section.scrollIntoView({block: 'start'}));
      }
    }
    try { setChecklist(readExamChecklist(localStorage.getItem(key))); }
    catch { setUnsaved(true); }
    setReady(true);
    function refresh(event: StorageEvent) {
      if (event.key === key || event.key === null) setChecklist(readExamChecklist(event.newValue));
    }
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, [key]);

  function mark(glyph: string, checked: boolean) {
    let latest = checklist;
    try { if (!unsaved) latest = readExamChecklist(localStorage.getItem(key)); }
    catch { /* Keep this session usable when storage is blocked. */ }
    const known = new Set(latest[mode]);
    if (checked) known.add(glyph);
    else known.delete(glyph);
    const next = {...latest, [mode]: known};
    setChecklist(next);
    try {
      localStorage.setItem(key, JSON.stringify({recognition: [...next.recognition], writing: [...next.writing]}));
      setUnsaved(false);
    } catch { setUnsaved(true); }
  }

  const lists = {recognition: examCharacters(level, 'recognition'), writing: examCharacters(level, 'writing')};
  const count = (skill: ExamMode) => lists[skill].filter(glyph => checklist[skill].has(glyph)).length;
  const characters = remainingOnly ? lists[mode].filter(glyph => !checklist[mode].has(glyph)) : lists[mode];
  const done = count(mode);
  return <details id="hsk-exam" className="hsk-exam-characters" onToggle={e => setOpen(e.currentTarget.open)}>
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
        {(['recognition', 'writing'] as const).map(skill => {
          const label = skill === 'recognition' ? copy.read : copy.write;
          return <button key={skill} className="secondary" type="button" aria-label={label} aria-pressed={mode === skill} onClick={() => setMode(skill)}>
            {label} <span className="hsk-exam-count" aria-hidden="true">{count(skill)}/{lists[skill].length}</span>
          </button>;
        })}
        <label>
          <select aria-label={progress.remaining} value={remainingOnly ? 'remaining' : 'all'} onChange={e => setRemainingOnly(e.target.value === 'remaining')}>
            <option value="all">{progress.all}</option>
            <option value="remaining">{progress.remaining}</option>
          </select>
        </label>
      </div>
      <div className="hsk-exam-progress">
        <output aria-live="polite">{done}/{lists[mode].length} {progress.done} · {lists[mode].length - done} {progress.left}</output>
        <small role={unsaved ? 'status' : undefined}>{unsaved ? progress.unsaved : progress.device}</small>
      </div>
      <p>{mode === 'writing' && level !== '3' ? copy.writingBand + ' ' : ''}{copy.prompt}</p>
      {characters.length === 0 && <p role="status">{progress.complete}</p>}
      <ul className="hsk-exam-grid" aria-label={mode === 'writing' ? copy.write : copy.read}>
        {characters.map(glyph => <li key={glyph} data-known={checklist[mode].has(glyph)}>
          <StudyText text={glyph} whole/>
          <label className="hsk-exam-check">
            <input type="checkbox" aria-label={progress.mark(glyph, mode)} disabled={!ready} checked={checklist[mode].has(glyph)} onChange={e => mark(glyph, e.target.checked)}/>
          </label>
        </li>)}
      </ul>
    </>}
  </details>;
}
