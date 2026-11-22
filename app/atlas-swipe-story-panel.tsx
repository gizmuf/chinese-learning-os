'use client';

import {useEffect, useEffectEvent, useId, useRef, useState, type KeyboardEvent, type PointerEvent} from 'react';
import {BookOpen, ChevronLeft, ChevronRight, Volume2, X} from 'lucide-react';
import type {SwipeStory} from './atlas-swipe-story-data';
import {playRecording, releaseRecording} from './audio';
import './atlas-swipe-story-panel.css';

type StoryPanelProps = {
  story: SwipeStory;
  showPinyin: boolean;
  showMeaning: boolean;
  onClose: () => void;
  onFocusPart: (focus: string | undefined) => void;
  onCompare?: (hanzi: string) => void;
};

type StorySwipe = {pointer: number; x: number; y: number};

export default function AtlasSwipeStoryPanel({
  story, showPinyin, showMeaning, onClose, onFocusPart, onCompare,
}: StoryPanelProps) {
  const titleId = useId();
  const closeButton = useRef<HTMLButtonElement>(null);
  const swipe = useRef<StorySwipe | undefined>(undefined);
  const audio = useRef<HTMLAudioElement | undefined>(undefined);
  const [step, setStep] = useState(0);
  const [audioError, setAudioError] = useState('');
  const frame = story.frames[step];
  const related = story.related;
  const focus = frame?.focus;
  const lastStep = story.frames.length;
  const announceFocus = useEffectEvent((part: string | undefined) => onFocusPart(part));

  useEffect(() => {
    closeButton.current?.focus({preventScroll: true});
  }, []);

  useEffect(() => {
    announceFocus(focus);
  }, [focus]);

  useEffect(() => () => announceFocus(undefined), []);

  useEffect(() => () => {
    if (audio.current) releaseRecording(audio.current);
    audio.current = undefined;
  }, [step]);

  function move(direction: number) {
    if (step + direction < 0 || step + direction > lastStep) return;
    setAudioError('');
    setStep(current => Math.min(lastStep, Math.max(0, current + direction)));
  }

  function listen() {
    if (!story.example.recording) return;
    setAudioError('');
    audio.current = playRecording(story.example.recording, setAudioError);
  }

  function keyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  }

  function startSwipe(event: PointerEvent<HTMLElement>) {
    if (!event.isPrimary || event.pointerType === 'mouse' || event.button !== 0 ||
      (event.target instanceof Element && event.target.closest('button'))) return;
    swipe.current = {pointer: event.pointerId, x: event.clientX, y: event.clientY};
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function endSwipe(event: PointerEvent<HTMLElement>) {
    const active = swipe.current;
    if (active?.pointer !== event.pointerId) return;
    swipe.current = undefined;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    if (Math.abs(dx) >= 42 && Math.abs(dx) >= Math.abs(dy) * 1.4) move(dx < 0 ? 1 : -1);
  }

  function cancelSwipe(event: PointerEvent<HTMLElement>) {
    if (swipe.current?.pointer === event.pointerId) swipe.current = undefined;
  }

  return <section className="as-story" aria-labelledby={titleId} data-swipe-control
    onKeyDown={keyDown} onPointerDown={startSwipe} onPointerUp={endSwipe}
    onPointerCancel={cancelSwipe} onLostPointerCapture={cancelSwipe}>
    <header className="as-story-header">
      <h2 id={titleId}><BookOpen size={19} aria-hidden="true"/> Story</h2>
      <button className="as-story-close" ref={closeButton} type="button" aria-label="Close story" onClick={onClose}>
        <X size={20} aria-hidden="true"/>
      </button>
    </header>
    <div className="as-story-live" aria-live="polite" aria-atomic="true">
      <span className="as-story-sr-only">Step {step + 1} of {lastStep + 1}.</span>
      {frame ? <div key={step} className="as-story-beat">
        <div className="as-story-note">
          <h3>Structure</h3>
          <p>{frame.structure}</p>
        </div>
        <div className="as-story-note as-story-note-memory">
          <h3>Memory cue</h3>
          <p>{frame.scene}</p>
        </div>
      </div> : <div key={step} className="as-story-beat">
        <div className="as-story-note as-story-example">
          <h3>Example</h3>
          <div className="as-story-phrase-row">
            <p className="as-story-hanzi" lang="zh-Hans">{story.example.hanzi}</p>
            {story.example.recording && <button className="as-story-listen" type="button"
              aria-label="Listen to example" onClick={listen}>
              <Volume2 size={19} aria-hidden="true"/> Listen
            </button>}
          </div>
          {showPinyin && <p className="as-story-pinyin" lang="zh-Latn-pinyin">{story.example.pinyin}</p>}
          {showMeaning && <p className="as-story-translation">{story.example.english}</p>}
        </div>
        {related && <div className="as-story-note as-story-related">
          <h3>Related</h3>
          <div className="as-story-phrase-row">
            <p className="as-story-hanzi" lang="zh-Hans">{related.hanzi}</p>
            {onCompare && <button className="as-story-compare" type="button" onClick={() => onCompare(related.hanzi)}>
              Compare <span lang="zh-Hans">{related.hanzi}</span><ChevronRight size={16} aria-hidden="true"/>
            </button>}
          </div>
          {showPinyin && <p className="as-story-pinyin" lang="zh-Latn-pinyin">{related.pinyin}</p>}
          {showMeaning && <p className="as-story-translation">{related.english}</p>}
        </div>}
      </div>}
    </div>
    <p className="as-story-audio-error" role="status">{audioError}</p>
    <div className="as-story-navigation" role="group" aria-label="Story navigation">
      <button className="as-story-back" type="button" aria-disabled={step === 0} onClick={() => move(-1)}>
        <ChevronLeft size={17} aria-hidden="true"/> Back
      </button>
      <div className="as-story-progress" aria-hidden="true">
        <div className="as-story-track">
          {Array.from({length: lastStep + 1}, (_, index) =>
            <span key={index} data-step={index === step ? 'current' : index < step ? 'visited' : undefined}/>)}
        </div>
        <span>{step + 1} of {lastStep + 1}</span>
      </div>
      <button className="as-story-next" type="button" onClick={step === lastStep ? onClose : () => move(1)}>
        {step === lastStep ? 'Done' : <>Next <ChevronRight size={17} aria-hidden="true"/></>}
      </button>
    </div>
  </section>;
}
