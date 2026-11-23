'use client';

import {useEffect, useRef, useState} from 'react';
import {ArrowRightLeft, PenLine, Volume2, X} from 'lucide-react';
import {StudyText} from './study-lookup-context';
import SharedWriting from './shared-writing';
import {playRecording, releaseRecording} from './audio';
import audio from '../data/connectors-phone-audio.json';
import prepared from '../data/lesson-sentence-audio.json';
import {frequencyAlternatives, resultAlternatives, type ConnectorsRow} from './connectors-phone-model';

export type ConnectorsDisplay = {pinyin: boolean; english: boolean};
const recordings: Record<string, {text: string; source: string}> = {...prepared.connectors, ...audio.recordings};

export function ConnectorsDisplayControls({value, onChange}: {value: ConnectorsDisplay; onChange: (next: ConnectorsDisplay) => void}) {
  return <div className="cl-display" role="group" aria-label="Study hints">
    <button type="button" aria-pressed={value.pinyin} onClick={() => onChange({...value, pinyin: !value.pinyin})}>Pinyin</button>
    <button type="button" aria-pressed={value.english} onClick={() => onChange({...value, english: !value.english})}>English</button>
  </div>;
}

/** Exact source text, with the established course voice prepared before delivery. */
export function ConnectorsListen({text}: {text: string}) {
  const [error, setError] = useState('');
  const playing = useRef<HTMLAudioElement | null>(null);
  const clip = recordings[text];
  useEffect(() => () => {
    if (playing.current) releaseRecording(playing.current);
  }, []);
  if (!clip || clip.text !== text) return null;
  function listen() {
    setError('');
    playing.current = playRecording(clip.source, setError) ?? null;
  }
  return <><button type="button" className="text-button" onClick={listen} aria-label={'Listen: ' + text}>
    <Volume2 size={17} aria-hidden="true"/>Listen</button>{error && <small role="status">{error}</small>}</>;
}

export function ConnectorsEntry({row, display, onWrite, listen = true}: {
  row: ConnectorsRow; display: ConnectorsDisplay; onWrite?: (row: ConnectorsRow) => void; listen?: boolean;
}) {
  return <div className="cl-entry" data-study-sentence={row.hanzi} data-study-pinyin={row.pinyin}
    data-study-meaning={row.english} data-study-source-id={'connectors-phone:' + row.hanzi}>
    <div className="cl-hanzi" lang="zh-Hans"><StudyText text={row.hanzi} pinyin={row.pinyin}/></div>
    {display.pinyin && <p className="cl-pinyin" lang="zh-Latn">{row.pinyin}</p>}
    {display.english && <p lang="en">{row.english}</p>}
    {(listen || onWrite) && <div className="cl-actions">
      {listen && <ConnectorsListen text={row.hanzi}/>}
      {onWrite && <button type="button" className="text-button" aria-label={'Write: ' + row.hanzi} onClick={() => onWrite(row)}>
        <PenLine size={17} aria-hidden="true"/>Write</button>}
    </div>}
  </div>;
}

export function ConnectorsWriting({row, onClose}: {row: ConnectorsRow | null; onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (row) {trigger.current = document.activeElement as HTMLElement; dialog.current?.showModal();}
    else if (dialog.current?.open) {dialog.current.close(); trigger.current?.focus({preventScroll: true});}
  }, [row]);
  return <dialog ref={dialog} className="cl-writing" aria-label="Writing practice" onCancel={event => {event.preventDefault(); onClose();}}>
    <header><h2>Write & remember</h2><button type="button" className="icon-button" aria-label="Close writing practice" onClick={onClose}><X size={20}/></button></header>
    {row && <SharedWriting key={row.hanzi} hanzi={row.hanzi} pinyin={row.pinyin} meaning={row.english} onBack={onClose}/>}
  </dialog>;
}

export function ConnectorsCompare({kind, display, beforeOpen}: {
  kind: 'frequency' | 'bring'; display: ConnectorsDisplay; beforeOpen?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const close = () => {dialog.current?.close(); trigger.current?.focus({preventScroll: true});};
  return <>
    <button ref={trigger} type="button" className="text-button cl-compare-button" onClick={() => {beforeOpen?.(); dialog.current?.showModal();}}>
      <ArrowRightLeft size={16} aria-hidden="true"/>{kind === 'frequency' ? 'Compare frequency expressions' : 'Compare 带来了'}</button>
    <dialog ref={dialog} className="cl-compare" aria-label={kind === 'frequency' ? 'Frequency in context' : 'What did it bring?'}
      onCancel={event => {event.preventDefault(); close();}}>
      <header><h2>{kind === 'frequency' ? 'Frequency in context' : 'What did it bring?'}</h2>
        <button type="button" className="icon-button" aria-label="Close comparison" onClick={close}><X size={20}/></button></header>
      <p className="cl-source-note">Additional practice · the source text stays unchanged.</p>
      {kind === 'frequency' ? <>
        <p><StudyText text="经常 / 常常"/> are near-synonyms meaning “often”. The other choices change how often something happens.</p>
        <p>Subject + frequency + action. Keep the action the same to compare the meaning.</p>
        <ol className="cl-compare-list">{frequencyAlternatives.map(item => <li key={item.term}>
          <span className="cl-term"><StudyText text={item.term} pinyin={item.pinyin} whole/></span>
          {display.pinyin && <span className="cl-pinyin">{item.pinyin}</span>}
          {display.english && <span>{item.english} · {item.role}</span>}
          <ConnectorsEntry row={{hanzi: item.example, pinyin: item.examplePinyin, english: item.exampleEnglish}} display={display}/>
        </li>)}</ol>
        <h3>And 然后?</h3><p><StudyText text="然后"/> (ránhòu, “then”) orders actions. It needs a sequence; it does not describe frequency.</p>
        <ConnectorsEntry row={{hanzi: '我先坐地铁，然后走路。', pinyin: 'Wǒ xiān zuò dìtiě, ránhòu zǒulù.', english: 'First I take the metro, then I walk.'}} display={display}/>
      </> : <>
        <p><StudyText text="带来了"/> can introduce benefits or disadvantages. Look at the two uses from the reading first.</p>
        {resultAlternatives.slice(0, 2).map(row => <ConnectorsEntry key={row.hanzi} row={row} display={display} listen={false}/>)}
        <h3>A different construction for an adverse result</h3>
        <p><StudyText text="造成了"/> means “caused” here, with an adverse outcome. It is not a general replacement for bringing benefits.</p>
        <ConnectorsEntry row={resultAlternatives[2]} display={display}/>
      </>}
    </dialog>
  </>;
}
