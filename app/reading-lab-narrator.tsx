'use client';

import {LocateFixed, Pause, Play, Repeat, RotateCcw, Settings2, Square} from 'lucide-react';
import {narrationLoopLimit, narrationRates, type NarrationMode, type NarrationRate, type NarrationTrack} from './reading-lab-narrator-model';
import type {useReadingLabNarrator} from './use-reading-lab-narrator';

function clock(seconds: number) {
  const whole = Math.floor(seconds);
  return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0');
}

const modes: Record<NarrationMode, string> = {
  continuous: 'Read through',
  repeat: 'Repeat sentence',
  'listen-repeat': 'Listen, then repeat aloud',
};

export default function ReadingLabNarrator({track, player, hidden, onShowSentence, voice = track?.voice ?? 'Synthetic study voice · Qwen'}: {
  track?: NarrationTrack;
  player: ReturnType<typeof useReadingLabNarrator>;
  hidden: boolean;
  onShowSentence: () => void;
  voice?: string;
}) {
  if (!track) return hidden ? null : <p className="rl-narration-unavailable">Narration unavailable for this reading.</p>;
  const {snapshot, rate, mode, loopPass, followText, setFollowText, changeMode, changeRate, seek, playFrom, stop, toggle, toggleLoop} = player;
  const active = snapshot.status === 'playing' || snapshot.status === 'loading';
  const last = snapshot.index === track.cues.length - 1;
  const action = active ? 'Pause' : snapshot.status === 'waiting' ? last ? 'Finish' : 'Next sentence'
    : snapshot.status === 'error' ? 'Try again' : snapshot.status === 'ended' ? 'Play from start' : 'Play';
  return <section className="rl-narrator" aria-label="Reading narrator" hidden={hidden}>
    <div className="rl-narrator-transport">
      <button className="rl-narrator-play" type="button" onClick={toggle}>
        {active ? <Pause size={17} aria-hidden="true"/> : <Play size={17} aria-hidden="true"/>}{action}
      </button>
      <button className="rl-narrator-icon" type="button" aria-label="Stop" title="Stop" onClick={stop}>
        <Square size={17} aria-hidden="true"/>
      </button>
      <button className="rl-narrator-replay" type="button" aria-label="Replay sentence" title="Replay sentence"
        onClick={() => playFrom(snapshot.index)}>
        <RotateCcw size={17} aria-hidden="true"/><span>Replay sentence</span>
      </button>
      <button className="rl-narrator-icon" type="button" aria-label="Show current sentence" title="Show current sentence" onClick={onShowSentence}>
        <LocateFixed size={19} aria-hidden="true"/>
      </button>
      <button type="button" className="rl-narrator-loop" aria-pressed={loopPass > 0} onClick={toggleLoop}
        aria-label="Continuous play" title="Continuous play (up to 20 listens)">
        <Repeat size={17} aria-hidden="true"/><span>Continuous play</span>
      </button>
      <details className="rl-narrator-settings">
        <summary aria-label="Playback settings" title="Playback settings"><Settings2 size={18} aria-hidden="true"/></summary>
        <div className="rl-narrator-options">
          <label>Speed <select value={rate} onChange={event => changeRate(Number(event.target.value) as NarrationRate)}>
            {narrationRates.map(value => <option key={value} value={value}>{value}×</option>)}
          </select></label>
          <label>Playback <select value={mode} onChange={event => changeMode(event.target.value as NarrationMode)}>
            {Object.entries(modes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>Play from sentence <select value="" onChange={event => playFrom(Number(event.target.value))}>
            <option value="" disabled>Choose a sentence</option>
            {track.cues.map((cue, index) => <option key={cue.key} value={index}>{index + 1}. {cue.text}</option>)}
          </select></label>
          <label className="rl-narrator-follow"><input type="checkbox" checked={followText}
            onChange={event => setFollowText(event.target.checked)}/> Follow text</label>
          <small>{voice}</small>
        </div>
      </details>
    </div>
    <div className="rl-narrator-progress">
      <input type="range" aria-label="Narration position" min={0} max={track.duration} step="any"
        aria-valuetext={clock(snapshot.position) + ' of ' + clock(track.duration)}
        value={snapshot.position} onChange={event => seek(event.target.valueAsNumber)}/>
      <span aria-hidden="true">{clock(snapshot.position)} / {clock(track.duration)}</span>
      {loopPass > 0 && <span>Listen {loopPass} of {narrationLoopLimit}</span>}
    </div>
    <p className="rl-narrator-status" role="status">
      {snapshot.status === 'loading' ? 'Loading narration…'
        : snapshot.status === 'waiting' ? 'Your turn. Say the highlighted sentence aloud.'
        : snapshot.status === 'error' ? 'The recording could not play. Try again.'
        : snapshot.status === 'ended' ? snapshot.loopComplete ? narrationLoopLimit + ' listens complete.' : 'End of reading.' : ''}
    </p>
  </section>;
}
