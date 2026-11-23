'use client';

import {lazy, Suspense, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {BookOpen} from 'lucide-react';
import './dictionary-study-card.css';

const AtlasStudyCard = lazy(() => import('./atlas-study-card'));

export function DictionaryStudyCard({hanzi, label}: {hanzi: string; label: string}) {
  const [selected, setSelected] = useState<string>();
  const modal = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const open = !!selected;

  useEffect(() => {
    if (!open || !modal.current) return;
    const dialog = modal.current;
    const opener = trigger.current;
    dialog.showModal();
    return () => {
      dialog.close();
      opener?.focus({preventScroll: true});
    };
  }, [open]);

  return <>
    <button ref={trigger} type="button" className="text-button" aria-haspopup="dialog" onClick={() => setSelected(hanzi)}>
      <BookOpen size={17} aria-hidden="true"/>{label} · <span lang="zh-Hans">{hanzi}</span>
    </button>
    {selected && createPortal(<dialog ref={modal} className="dictionary-study-card" aria-label={label} data-study-lookup="off"
      onCancel={event => {event.preventDefault(); event.stopPropagation(); setSelected(undefined);}}>
      <Suspense fallback={<p role="status">Opening study cards…</p>}>
        <AtlasStudyCard returnLabel="Słownik" hanzi={selected} onNavigate={glyph => {
          setSelected(glyph);
          modal.current?.scrollTo(0, 0);
        }} onClose={() => setSelected(undefined)}/>
      </Suspense>
    </dialog>, document.body)}
  </>;
}
