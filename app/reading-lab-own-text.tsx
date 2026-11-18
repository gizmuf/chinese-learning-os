'use client';

import {useEffect, useRef, useState, type FormEvent} from 'react';
import {StudyText} from './study-lookup-context';
import ReadingLabNarrator from './reading-lab-narrator';
import {useReadingLabNarrator} from './use-reading-lab-narrator';
import {importReading, type ImportedReading} from './reading-lab-own-text-model';
import {generateReadingAudio, readingAudioTicketsPath, ReadingAudioError} from './reading-lab-own-audio';
import type {NarrationTrack} from './reading-lab-narrator-model';
import {readSavedReadingAudio, saveReadingAudio} from './reading-lab-audio-cache';

const microsoftVoice = 'Microsoft Xiaoxiao';
const qwenVoice = 'Qwen · Longanhuan';
import {parseReadingAudioSentences, readingAudioTextLimit, readingAudioSentenceLimit, readingAudioSentenceSize} from '../lib/reading-lab-audio-policy';

export default function ReadingLabOwnText() {
  const [source, setSource] = useState('');
  const [reading, setReading] = useState<ImportedReading>();
  const [error, setError] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (source.length > readingAudioTextLimit) return setError('Shorten the text to ' + readingAudioTextLimit + ' characters and try again.');
    const next = importReading(source);
    if (!next.sentences.length) return setError('Paste some Chinese text to start.');
    if (next.sentences.length > readingAudioSentenceLimit) return setError('Use up to ' + readingAudioSentenceLimit + ' sentences per reading.');
    setError('');
    setReading(next);
  }

  if (reading) return <ImportedText reading={reading} onEdit={() => {
    setReading(undefined);
    requestAnimationFrame(() => field.current?.focus());
  }}/>;

  return <form className="rl-own-form" onSubmit={prepare}>
    <label htmlFor="reading-lab-own-source">Paste Chinese text</label>
    <textarea ref={field} id="reading-lab-own-source" lang="zh-Hans" value={source}
      onChange={event => {setSource(event.target.value); setError('');}} rows={8} autoFocus required/>
    <small>Up to {readingAudioTextLimit} characters and {readingAudioSentenceLimit} sentences. Pinyin and supported grammar patterns are prepared on this device.</small>
    <button type="submit" className="primary">Prepare reading</button>
    {error && <p role="alert">{error}</p>}
  </form>;
}

function ImportedText({reading, onEdit}: {reading: ImportedReading; onEdit: () => void}) {
  const [showPinyin, setShowPinyin] = useState(true);
  const [available, setAvailable] = useState<boolean>();
  const [track, setTrack] = useState<NarrationTrack>();
  const [voice, setVoice] = useState(microsoftVoice);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const source = useRef<string | undefined>(undefined);
  const result = useRef<HTMLHeadingElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const player = useReadingLabNarrator(track);
  const active = player.snapshot.status !== 'idle' ? track?.cues[player.snapshot.index]?.key : undefined;
  const sentences = reading.sentences;
  const canGenerate = Boolean(parseReadingAudioSentences({sentences: sentences.map(sentence => sentence.text)}));

  useEffect(() => {
    result.current?.focus();
    const controller = new AbortController();
    async function prepareAudio() {
      const saved = await readSavedReadingAudio(sentences).catch(() => undefined);
      if (controller.signal.aborted) return;
      if (saved) {
        const url = URL.createObjectURL(saved.wav);
        source.current = url;
        setVoice(saved.voice);
        setTrack({source: url, duration: saved.duration, cues: saved.cues});
        setStatus('Saved narration ready. Tap Play to listen.');
        return;
      }
      if (!canGenerate) return;
      try {
        const response = await fetch(readingAudioTicketsPath, {signal: controller.signal, cache: 'no-store'});
        const settings = response.ok ? await response.json() as {enabled?: boolean; voice?: string} : null;
        if (!controller.signal.aborted) {
          setVoice(settings?.voice === 'qwen' ? qwenVoice : microsoftVoice);
          setAvailable(settings?.enabled === true);
        }
      } catch {
        if (!controller.signal.aborted) setAvailable(false);
      }
    }
    void prepareAudio();
    return () => controller.abort();
  }, [canGenerate, sentences]);

  useEffect(() => {
    if (!active || player.snapshot.status !== 'playing') return;
    const sentence = list.current?.querySelector('[data-narration-active="true"]');
    const dialog = list.current?.closest('dialog');
    if (!sentence || !dialog) return;
    const bounds = sentence.getBoundingClientRect();
    const frame = dialog.getBoundingClientRect();
    if (bounds.top < frame.top || bounds.bottom > frame.bottom) sentence.scrollIntoView({block: 'nearest'});
  }, [active, player.snapshot.status]);

  useEffect(() => () => {
    request.current?.abort();
    if (source.current) URL.revokeObjectURL(source.current);
  }, []);

  async function generate() {
    if (request.current || track || !available || !canGenerate) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setStatus('Preparing narration…');
    try {
      const ready = await generateReadingAudio(sentences, controller.signal, (count, total) =>
        setStatus('Preparing narration · ' + count + '/' + total + ' recordings'));
      if (controller.signal.aborted) return;
      const saved = await saveReadingAudio(sentences, {...ready, voice}).then(() => true, () => false);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(ready.wav);
      source.current = url;
      setTrack({source: url, duration: ready.duration, cues: ready.cues});
      setStatus(saved ? 'Narration saved. Tap Play to listen.' : 'Narration ready for this session. Browser storage is unavailable.');
    } catch (error) {
      if (!controller.signal.aborted) setStatus(error instanceof ReadingAudioError && error.quota
        ? 'The daily audio allowance has been used. Try again tomorrow.'
        : 'Narration could not be prepared. Try again.');
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return <div className="rl-own-result">
    <header className="rl-own-result-header">
      <div>
        <h2 ref={result} tabIndex={-1} lang={reading.title ? 'zh-Hans' : undefined}>{reading.title || 'Your reading'}</h2>
        {showPinyin && reading.titlePinyin && <p className="rl-own-pinyin" lang="zh-Latn">{reading.titlePinyin}</p>}
      </div>
      <div className="rl-modes" aria-label="Reading options">
        <button type="button" aria-pressed={showPinyin} onClick={() => setShowPinyin(!showPinyin)}>Pinyin</button>
        <button type="button" onClick={onEdit}>Edit text</button>
      </div>
    </header>
    {track ? <ReadingLabNarrator track={track} player={player} hidden={false} voice={'Synthetic study voice · ' + voice}/> :
      <section className="rl-own-audio" aria-label="Generate narration">
        {available && <button type="button" className="primary" onClick={generate} disabled={busy}>Generate narration</button>}
        <p>{!canGenerate ? 'To generate narration, keep each sentence under ' + (readingAudioSentenceSize + 1) + ' characters.'
          : available === false ? 'Narration generation is unavailable on this site.'
          : available ? 'Generating narration sends these sentences to ' + voice + ' for speech synthesis.'
          : 'Checking narration availability…'}</p>
      </section>}
    {status && <p role="status" className="rl-own-pinyin">{status}</p>}
    <ol ref={list} className="rl-own-sentences">
      {sentences.map((sentence, index) => <li key={sentence.key}
        data-narration-cue={sentence.key} data-narration-active={sentence.key === active || undefined}>
        <div className="rl-own-sentence" lang="zh-Hans" onClickCapture={event => {
          if ((event.target as HTMLElement).closest('.study-word')) player.pause();
        }}><StudyText text={sentence.text} pinyin={sentence.pinyin}/></div>
        {showPinyin && <p className="rl-own-pinyin" lang="zh-Latn">{sentence.pinyin}</p>}
        {track && <button type="button" className="text-button" aria-label={'Play sentence ' + (index + 1)}
          onClick={() => player.playFrom(index)}>Play sentence</button>}
        {sentence.grammar.length > 0 && <details className="rl-own-grammar">
          <summary>Grammar · {sentence.grammar.map(pattern => pattern.label).join(' · ')}</summary>
          <dl>{sentence.grammar.map(pattern => <div key={pattern.label}>
            <dt lang="zh-Hans">{pattern.example}</dt><dd>{pattern.note}</dd>
          </div>)}</dl>
        </details>}
      </li>)}
    </ol>
    {!sentences.some(sentence => sentence.grammar.length) && <p className="rl-own-pinyin">No supported grammar patterns found in this reading.</p>}
  </div>;
}
