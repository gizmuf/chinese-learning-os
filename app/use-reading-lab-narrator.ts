'use client';

import {useLayoutEffect, useRef, useState} from 'react';
import {prepareRecording, releaseRecording} from './audio';
import {narrationCueAt, narrationPosition, narrationStep, type NarrationMode, type NarrationRate, type NarrationTrack} from './reading-lab-narrator-model';

type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'waiting' | 'ended' | 'error';
type Snapshot = {status: PlaybackStatus; position: number; index: number};
const initial: Snapshot = {status: 'idle', position: 0, index: 0};

export function useReadingLabNarrator(track?: NarrationTrack) {
  const [snapshot, setSnapshot] = useState(initial);
  const [mode, setMode] = useState<NarrationMode>('continuous');
  const [rate, setRate] = useState<NarrationRate>(0.9);
  const session = useRef({snapshot: initial, mode, rate, attempt: 0});
  const recording = useRef<HTMLAudioElement | null>(null);

  function publish(next: Snapshot) {
    session.current.snapshot = next;
    setSnapshot(next);
  }

  useLayoutEffect(() => {
    session.current.snapshot = initial;
    setSnapshot(initial);
    return () => {
      session.current.attempt++;
      const previous = recording.current;
      recording.current = null;
      if (previous) releaseRecording(previous);
    };
  }, [track]);

  function start(media: HTMLAudioElement) {
    const attempt = ++session.current.attempt;
    publish({...session.current.snapshot, status: 'loading'});
    void media.play().then(() => {
      if (recording.current === media && attempt === session.current.attempt && !media.paused
        && session.current.snapshot.status === 'loading') publish({...session.current.snapshot, status: 'playing'});
    }).catch(() => {
      if (recording.current === media && attempt === session.current.attempt) {
        publish({...session.current.snapshot, status: 'error'});
      }
    });
  }

  function getRecording(source: NarrationTrack) {
    if (recording.current?.getAttribute('src') && !recording.current.error) return recording.current;
    const previous = recording.current;
    recording.current = null;
    if (previous) releaseRecording(previous);
    const media = prepareRecording(source.source, session.current.rate);
    recording.current = media;
    let frame = 0;

    const active = () => recording.current === media;
    const stopFrame = () => cancelAnimationFrame(frame);
    function sync(time: number) {
      if (!active() || session.current.snapshot.status !== 'playing' || media.seeking) return;
      const state = session.current.snapshot;
      const step = narrationStep(source, session.current.mode, state.index, time);
      switch (step.kind) {
        case 'loop':
          media.currentTime = step.position;
          publish({...step, status: 'playing'});
          if (media.paused) start(media);
          break;
        case 'wait':
          publish({...step, status: 'waiting'});
          media.pause();
          media.currentTime = step.position;
          break;
        case 'finish':
          publish({...step, status: 'ended'});
          break;
        case 'follow':
          // The scrubber needs only tenths of a second; avoid rerendering on every frame.
          if (step.index !== state.index || Math.abs(step.position - state.position) >= 0.1) {
            publish({...step, status: 'playing'});
          }
      }
    }
    function tick() {
      if (!active() || media.paused) return;
      sync(media.currentTime);
      if (!media.paused) frame = requestAnimationFrame(tick);
    }
    media.addEventListener('playing', () => {
      const status = session.current.snapshot.status;
      if (!active() || media.paused || (status !== 'loading' && status !== 'playing')) return;
      if (status === 'loading') publish({...session.current.snapshot, status: 'playing'});
      stopFrame();
      frame = requestAnimationFrame(tick);
    });
    media.addEventListener('timeupdate', () => sync(media.currentTime));
    media.addEventListener('ended', () => {
      if (active() && media.ended) sync(source.duration);
      if (media.paused) stopFrame();
    });
    media.addEventListener('pause', () => {
      if (!active() || !media.paused || media.ended) return;
      stopFrame();
      const status = session.current.snapshot.status;
      if (status === 'loading' || status === 'playing') {
        session.current.attempt++;
        publish({...session.current.snapshot, status: 'paused'});
      }
    });
    media.addEventListener('emptied', () => {
      if (!active() || media.getAttribute('src')) return;
      stopFrame();
      recording.current = null;
      session.current.attempt++;
      const {status} = session.current.snapshot;
      if (status === 'playing' || status === 'loading') publish({...session.current.snapshot, status: 'paused'});
    });
    media.addEventListener('error', () => {
      if (!active() || !media.getAttribute('src')) return;
      stopFrame();
      session.current.attempt++;
      publish({...session.current.snapshot, status: 'error'});
    });
    return media;
  }

  function pause() {
    const state = session.current.snapshot;
    if (state.status !== 'loading' && state.status !== 'playing') return;
    session.current.attempt++;
    const media = recording.current;
    const position = track && media?.getAttribute('src') && !media.seeking && media.readyState > 0
      ? narrationPosition(track, media.currentTime) : state.position;
    const index = track && session.current.mode === 'continuous' ? narrationCueAt(track, position) : state.index;
    publish({position, index, status: 'paused'});
    media?.pause();
  }

  function move(time: number, play: boolean) {
    if (!track) return;
    const position = narrationPosition(track, time);
    const index = narrationCueAt(track, position);
    const media = play ? getRecording(track) : recording.current;
    const atEnd = position >= track.duration;
    session.current.attempt++;
    publish({position, index, status: atEnd ? 'ended' : play ? 'loading' : 'paused'});
    if (media?.getAttribute('src')) {
      media.currentTime = position;
      media.playbackRate = session.current.rate;
      if (atEnd || !play) media.pause();
      else start(media);
    }
  }

  function toggle() {
    const state = session.current.snapshot;
    if (state.status === 'playing' || state.status === 'loading') pause();
    else if (state.status === 'waiting') {
      const next = track?.cues[state.index + 1];
      if (next) move(next.start, true);
      else if (track) move(track.duration, false);
    } else move(state.status === 'ended' ? 0 : state.position, true);
  }

  return {
    snapshot, mode, rate, pause, toggle,
    seek(time: number) {
      const status = session.current.snapshot.status;
      move(time, status === 'playing' || status === 'loading');
    },
    playFrom(index: number) {
      const cue = track?.cues[index];
      if (cue) move(cue.start, true);
    },
    changeMode(next: NarrationMode) {
      session.current.mode = next;
      setMode(next);
    },
    changeRate(next: NarrationRate) {
      session.current.rate = next;
      setRate(next);
      if (recording.current) recording.current.playbackRate = next;
    },
  };
}
