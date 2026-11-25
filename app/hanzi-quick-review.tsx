'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Layers, X } from 'lucide-react';
import { hanziSprintCopy } from './hanzi-sprint-copy';
import { useI18n } from './i18n';
import { useStudyLookup } from './study-lookup-context';
import './hanzi-quick-review.css';

type Entry = { hanzi: string; pinyin: string; meaning: string };
const copy = {
  en: { title: 'Quick review', pinyin: 'Reveal pinyin', meaning: 'Reveal English', next: 'Next card', easy: 'Easy', hard: 'Hard', rate: 'Rate this card', repeat: 'Hard cards return once at the end of this round.', done: 'Round complete', again: 'Review again', close: 'Close review' },
  fr: { title: 'Révision rapide', pinyin: 'Afficher le pinyin', meaning: 'Afficher la traduction anglaise', next: 'Carte suivante', easy: 'Facile', hard: 'Difficile', rate: 'Évaluer cette carte', repeat: 'Les cartes difficiles reviennent une fois en fin de série.', done: 'Série terminée', again: 'Recommencer', close: 'Fermer la révision' },
  ru: { title: 'Быстрое повторение', pinyin: 'Показать пиньинь', meaning: 'Показать перевод на английский', next: 'Следующая карточка', easy: 'Легко', hard: 'Сложно', rate: 'Оцените карточку', repeat: 'Сложные карточки появятся ещё раз в конце раунда.', done: 'Раунд завершён', again: 'Повторить', close: 'Закрыть повторение' },
  tr: { title: 'Hızlı tekrar', pinyin: 'Pinyini göster', meaning: 'İngilizce anlamı göster', next: 'Sonraki kart', easy: 'Kolay', hard: 'Zor', rate: 'Bu kartı değerlendir', repeat: 'Zor kartlar turun sonunda bir kez daha gösterilir.', done: 'Tur tamamlandı', again: 'Yeniden çalış', close: 'Tekrarı kapat' },
};

const modes = ['preview', 'scored'] as const;
const inspectLabel = {
  en: 'Explore character and family',
  fr: 'Explorer le caractère et sa famille',
  ru: 'Исследовать знак и его семейство',
  tr: 'Karakteri ve ailesini keşfet',
};
const newRound = () => ({ index: 0, step: 0, repeat: [] as Entry[] });

function QuickReviewDialog({ entries, onClose }: { entries: readonly Entry[]; onClose: () => void }) {
  const { locale } = useI18n();
  const lookup = useStudyLookup();
  const c = copy[locale];
  const modeLabels = hanziSprintCopy[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  const card = useRef<HTMLButtonElement>(null);
  const heading = useId();
  const [mode, setMode] = useState<typeof modes[number]>('preview');
  const [round, setRound] = useState(newRound);
  const { index, step, repeat } = round;
  const total = entries.length + repeat.length;
  const entry = entries[index] ?? repeat[index - entries.length];
  const scored = mode === 'scored';
  const rateCard = Boolean(scored && entry && step === 2);
  const action = entry ? [c.pinyin, c.meaning, scored ? c.rate : c.next][step] : c.again;

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
    if (!entry) {
      setRound(newRound());
    } else if (step < 2) {
      setRound(previous => ({ ...previous, step: Math.min(previous.step + 1, 2) }));
    } else if (!scored) {
      advance();
    }
  }

  return <dialog className="hanzi-quick-dialog" ref={dialog} aria-labelledby={heading} onClose={onClose}>
    <header className="hanzi-quick-heading">
      <h3 id={heading}>{c.title}</h3>
      <span aria-live="polite">{Math.min(index + 1, total)} / {total}</span>
      <button type="button" className="icon-button" aria-label={c.close} onClick={() => dialog.current?.close()}><X size={19}/></button>
    </header>
    <div className="hanzi-quick-modes" role="group" aria-label={modeLabels.cardMode}>
      {modes.map(value => <button type="button" className="secondary" key={value}
        aria-pressed={mode === value} onClick={() => setMode(value)}>{modeLabels[value]}</button>)}
    </div>
    <div className="hanzi-quick-card-shell">
      <button ref={card} type="button" className="hanzi-quick-card" onClick={reveal} aria-disabled={rateCard || undefined}>
        <span key={index} className="hanzi-quick-glyph" lang={entry ? 'zh-Hans' : undefined}>
          {!scored && lookup && entry ? <span className="hanzi-quick-sr-only">{entry.hanzi}</span> : entry?.hanzi ?? c.done}
        </span>
        <span className="hanzi-quick-reading" lang="zh-Latn-pinyin" data-revealed={Boolean(entry && step >= 1)}>{step >= 1 && entry?.pinyin}</span>
        <span className="hanzi-quick-meaning" lang="en" data-revealed={Boolean(entry && step === 2)}>{step === 2 && entry?.meaning}</span>
        <span className="hanzi-quick-action">{action}{entry && step === 2 && !scored && <ArrowRight size={15} aria-hidden="true"/>}</span>
      </button>
      {!scored && lookup && entry && <button key={index} type="button" className="hanzi-quick-inspect"
        aria-label={inspectLabel[locale] + ': ' + entry.hanzi}
        title={inspectLabel[locale]}
        onClick={event => {
          event.stopPropagation();
          lookup.open(entry.hanzi, event.currentTarget);
        }}>
        <span className="hanzi-quick-glyph" lang="zh-Hans">{entry.hanzi}</span>
        <BookOpen size={14} aria-hidden="true"/>
      </button>}
    </div>
    {scored && <>
      <p className="hanzi-quick-repeat-note">{c.repeat}</p>
      <div className="hanzi-quick-ratings">
        {rateCard && <div role="group" aria-label={c.rate}>
          <button type="button" className="secondary" onClick={() => advance(true)}>{c.hard}</button>
          <button type="button" className="secondary" onClick={() => advance()}>{c.easy}</button>
        </div>}
      </div>
    </>}
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
