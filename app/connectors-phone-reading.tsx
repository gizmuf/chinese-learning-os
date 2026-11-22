'use client';

import {useEffect, useEffectEvent, useRef, useState} from 'react';
import {PenLine, Volume2} from 'lucide-react';
import lesson from '../data/connectors-phone-lesson.json';
import audio from '../data/connectors-phone-audio.json';
import {StudyText} from './study-lookup-context';
import ReadingLabNarrator from './reading-lab-narrator';
import {useReadingLabNarrator} from './use-reading-lab-narrator';
import {ConnectorsCompare, ConnectorsDisplayControls, ConnectorsWriting, type ConnectorsDisplay} from './connectors-phone-shared';
import type {ConnectorsRow} from './connectors-phone-model';
import type {NarrationTrack} from './reading-lab-narrator-model';
import './reading-lab.css';
import './connectors-phone.css';

export const connectorsPhoneTrack: NarrationTrack = {
  source: audio.source, duration: audio.frames / audio.sampleRate,
  cues: audio.cues.map(cue => ({key: cue.key, text: cue.text, start: cue.startFrame / audio.sampleRate})),
};

/** The lesson and Reading Lab share this renderer and the same exact recording. */
export default function ConnectorsPhoneReading({active = true, display: controlledDisplay, onDisplayChange, controls = true}: {
  active?: boolean; display?: ConnectorsDisplay; onDisplayChange?: (display: ConnectorsDisplay) => void; controls?: boolean;
}) {
  const [localDisplay, setLocalDisplay] = useState<ConnectorsDisplay>({pinyin: true, english: false});
  const display = controlledDisplay ?? localDisplay, setDisplay = onDisplayChange ?? setLocalDisplay;
  const [writing, setWriting] = useState<ConnectorsRow | null>(null);
  const player = useReadingLabNarrator(connectorsPhoneTrack);
  const pane = useRef<HTMLDivElement>(null), list = useRef<HTMLOListElement>(null);
  const selected = player.snapshot.status === 'idle' ? undefined : player.snapshot.index;
  const pauseWhenHidden = useEffectEvent(() => player.pause());
  const followSentence = useEffectEvent(() => showSentence());
  useEffect(() => {if (!active) pauseWhenHidden();}, [active]); // Keep the sentence and audio position when changing lesson sections.
  useEffect(() => {
    if (active && player.followText && selected !== undefined) followSentence();
  }, [active, selected, player.followText]);
  function showSentence() {
    const row = list.current?.children[player.snapshot.index] as HTMLElement | undefined;
    if (row && pane.current) pane.current.scrollTo({top: Math.max(0, row.offsetTop - pane.current.offsetTop - 12), behavior: 'smooth'});
  }
  return <section className="cl-reader rl-own-result" aria-label="Full 低头族 reading">
    <header className="rl-own-result-header"><div><h2 lang="zh-Hans">低头族</h2>
      {display.pinyin && <p className="cl-pinyin">Dītóuzú</p>}
      <p className="cl-source-note">Full reading · 15 sentences · PDF pages 5–7</p></div>
      {controls && <ConnectorsDisplayControls value={display} onChange={setDisplay}/>}</header>
    <div className="rl-own-scroll" ref={pane}>
      <ol className="rl-own-sentences" ref={list}>{lesson.reading.map((row, index) => <li key={row.id}
        data-narration-cue={row.id} data-narration-active={selected === index || undefined}
        data-study-source-id={'connectors-phone:' + row.id} data-study-sentence={row.hanzi}
        data-study-pinyin={row.pinyin} data-study-meaning={row.english}>
        <div className="rl-own-sentence-row"><div>
          <div className="cl-hanzi" lang="zh-Hans" onClickCapture={event => {
            if ((event.target as HTMLElement).closest('.study-word')) player.pause();
          }}><StudyText text={row.hanzi} pinyin={row.pinyin}/></div>
          {display.pinyin && <p className="cl-pinyin" lang="zh-Latn">{row.pinyin}</p>}
          {display.english && <p lang="en">{row.english}</p>}
        </div></div>
        <div className="cl-actions">
          <button type="button" className="text-button" aria-label={'Play sentence ' + (index + 1)} onClick={() => player.playFrom(index)}><Volume2 size={17}/>Listen</button>
          <button type="button" className="text-button" aria-label={'Write sentence ' + (index + 1)} onClick={() => {player.pause(); setWriting(row);}}><PenLine size={17}/>Write</button>
          {row.hanzi.includes('带来了') && <ConnectorsCompare kind="bring" display={display} beforeOpen={player.pause}/>}
          {row.hanzi.includes('有时候') && <ConnectorsCompare kind="frequency" display={display} beforeOpen={player.pause}/>}
        </div>
      </li>)}</ol>
    </div>
    <ReadingLabNarrator track={connectorsPhoneTrack} player={player} hidden={false} onShowSentence={showSentence} voice={'Synthetic study voice · ' + audio.voice}/>
    <ConnectorsWriting row={writing} onClose={() => setWriting(null)}/>
  </section>;
}
