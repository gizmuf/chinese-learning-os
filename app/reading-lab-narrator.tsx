'use client';

import {Pause, Play, Volume2} from 'lucide-react';
import {narrationRates, type NarrationMode, type NarrationRate, type NarrationTrack} from './reading-lab-narrator-model';
import type {useReadingLabNarrator} from './use-reading-lab-narrator';

function clock(seconds: number) {
  const whole = Math.floor(seconds);
  return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0');
}

const modes: Record<NarrationMode, string> = {
  continuous: 'Continuous',
  repeat: 'Repeat sentence',
  'listen-repeat': 'Listen, then repeat aloud',
};

export default function ReadingLabNarrator({track, player, hidden}: {
  track?: NarrationTrack;
  player: ReturnType<typeof useReadingLabNarrator>;
  hidden: boolean;
}) {
  if (!track) return hidden ? null : <p className="rl-narration-unavailable">Narration unavailable for this reading.</p>;
  const {snapshot, rate, mode, changeMode, changeRate, seek, playFrom, toggle} = player;
  const active = snapshot.status === 'playing' || snapshot.status === 'loading';
  const last = snapshot.index === track.cues.length - 1;
  const action = active ? 'Pause' : snapshot.status === 'waiting' ? last ? 'Finish' : 'Next sentence'
    : snapshot.status === 'error' ? 'Try again' : snapshot.status === 'ended' ? 'Play from start' : 'Play';
  return <section className="rl-narrator" aria-label="Reading narrator" hidden={hidden}>
    <p className="rl-narrator-heading"><Volume2 size={18} aria-hidden="true"/> Narrator <small>Synthetic study voice · Qwen</small></p>
    <div className="rl-narrator-transport">
      <button className="rl-narrator-play" type="button" onClick={toggle}>
        {active ? <Pause size={17} aria-hidden="true"/> : <Play size={17} aria-hidden="true"/>}{action}
      </button>
      <input type="range" aria-label="Narration position" min={0} max={track.duration} step="any"
        aria-valuetext={clock(snapshot.position) + ' of ' + clock(track.duration)}
        value={snapshot.position} onChange={event => seek(event.target.valueAsNumber)}/>
      <span aria-hidden="true">{clock(snapshot.position)} / {clock(track.duration)}</span>
    </div>
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
    </div>
    <p className="rl-narrator-status" role="status">
      {snapshot.status === 'loading' ? 'Loading narration…'
        : snapshot.status === 'waiting' ? 'Your turn. Say the highlighted sentence aloud.'
        : snapshot.status === 'error' ? 'The recording could not play. Try again.'
        : snapshot.status === 'ended' ? 'End of reading.' : ''}
    </p>
  </section>;
}
