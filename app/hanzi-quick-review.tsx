'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Layers, X } from 'lucide-react';
import { useI18n } from './i18n';
import './hanzi-quick-review.css';

type Entry = { hanzi: string; pinyin: string; meaning: string };
const copy = {
  en: { title: 'Quick review', pinyin: 'Reveal pinyin', meaning: 'Reveal English', next: 'Next card', easy: 'Easy', hard: 'Hard', done: 'Round complete', again: 'Review again', close: 'Close review' },
  fr: { title: 'Révision rapide', pinyin: 'Afficher le pinyin', meaning: 'Afficher la traduction anglaise', next: 'Carte suivante', easy: 'Facile', hard: 'Difficile', done: 'Série terminée', again: 'Recommencer', close: 'Fermer la révision' },
  ru: { title: 'Быстрое повторение', pinyin: 'Показать пиньинь', meaning: 'Показать перевод на английский', next: 'Следующая карточка', easy: 'Легко', hard: 'Сложно', done: 'Раунд завершён', again: 'Повторить', close: 'Закрыть повторение' },
  tr: { title: 'Hızlı tekrar', pinyin: 'Pinyini göster', meaning: 'İngilizce anlamı göster', next: 'Sonraki kart', easy: 'Kolay', hard: 'Zor', done: 'Tur tamamlandı', again: 'Yeniden çalış', close: 'Tekrarı kapat' },
};

function QuickReviewDialog({ entries, onClose }: { entries: readonly Entry[]; onClose: () => void }) {
  const { locale } = useI18n();
  const c = copy[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  const card = useRef<HTMLButtonElement>(null);
  const heading = useId();
  const [round, setRound] = useState({ index: 0, step: 0, repeat: [] as Entry[] });
  const { index, step, repeat } = round;
  const total = entries.length + repeat.length;
  const entry = entries[index] ?? repeat[index - entries.length];

  useEffect(() => {
    dialog.current?.showModal();
    card.current?.focus({ preventScroll: true });
  }, []);

  function advance(hard = false) {
    setRound(previous => ({
      index: previous.index + 1,
      step: 0,
      repeat: hard && previous.index < entries.length ? [...previous.repeat, entries[previous.index]] : previous.repeat,
    }));
    card.current?.focus({ preventScroll: true });
  }

  function reveal() {
    if (step === 2) advance();
    else setRound(previous => ({ ...previous, step: previous.step + 1 }));
  }

  return <dialog className="hanzi-quick-dialog" ref={dialog} aria-labelledby={heading} onClose={onClose}>
    <header className="hanzi-quick-heading">
      <h3 id={heading}>{c.title}</h3>
      <span aria-live="polite">{Math.min(index + 1, total)} / {total}</span>
      <button type="button" className="icon-button" aria-label={c.close} onClick={() => dialog.current?.close()}><X size={19}/></button>
    </header>
    <button ref={card} type="button" className="hanzi-quick-card" onClick={entry ? reveal : () => setRound({index:0,step:0,repeat:[]})}>
      <span className="hanzi-quick-glyph" lang={entry ? 'zh-Hans' : undefined}>{entry?.hanzi ?? c.done}</span>
      <span className="hanzi-quick-reading" lang="zh-Latn-pinyin" data-revealed={Boolean(entry && step >= 1)}>{entry?.pinyin}</span>
      <span className="hanzi-quick-meaning" lang="en" data-revealed={Boolean(entry && step >= 2)}>{entry?.meaning}</span>
      <span className="hanzi-quick-action">{entry ? [c.pinyin, c.meaning, c.next][step] : c.again}</span>
    </button>
    <div className="hanzi-quick-ratings">
      <button type="button" className="secondary" disabled={!entry || step < 2} onClick={() => advance(true)}>{c.hard}</button>
      <button type="button" className="secondary" disabled={!entry || step < 2} onClick={() => advance()}>{c.easy}</button>
    </div>
  </dialog>;
}

export default function HanziQuickReview({ entries }: { entries: readonly Entry[] }) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  if (!entries.length) return null;
  return <>
    <button ref={trigger} type="button" className="secondary" onClick={() => setOpen(true)}><Layers size={16} aria-hidden="true"/>{copy[locale].title}</button>
    {open && <QuickReviewDialog entries={entries} onClose={() => {
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
    }}/>}
  </>;
}
