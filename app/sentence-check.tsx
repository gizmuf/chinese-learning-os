'use client';

import { ArrowLeft, Check, CircleHelp, Pencil, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { playRecording, releaseRecording, stopAudio } from './audio';
import { sentenceCheckRecording } from './sentence-check-recording';
import { checkSentenceRules, type SentenceCheckResult } from './sentence-check-rules';
import type { Locale } from './translate';
import { sentenceCheckCopy } from './sentence-check-copy';
import './sentence-check.css';

const examples = ['他比我很高。', '我昨天不去了学校。'];
const maxLength = 160;
const statusIcons = { correct: Check, corrected: Pencil, uncertain: CircleHelp };
function FeedbackIcon({ status }: { status: SentenceCheckResult['status'] }) {
  const Icon = statusIcons[status];
  return <Icon size={20} aria-hidden="true" />;
}

export function SentenceCheck({ locale, onBack }: { locale: Locale; onBack: () => void }) {
  const c = sentenceCheckCopy[locale];
  const [sentence, setSentence] = useState('');
  const [checked, setChecked] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const recording = useRef<HTMLAudioElement | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => () => {
    if (recording.current) releaseRecording(recording.current);
    if (utterance.current) {
      utterance.current = null;
      window.speechSynthesis.cancel();
    }
  }, []);

  function listen(text: string) {
    setAudioError(false);
    if (utterance.current) {
      utterance.current = null;
      window.speechSynthesis.cancel();
    }
    const source = sentenceCheckRecording(text);
    if (source) {
      recording.current = playRecording(source, () => setAudioError(true));
      return;
    }
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setAudioError(true);
      return;
    }
    const speech = window.speechSynthesis;
    const voices = speech.getVoices().filter(voice => voice.localService);
    const mandarin = voices.find(voice => /^zh[-_]CN$/i.test(voice.lang))
      ?? voices.find(voice => /^(zh|cmn)(?:[-_]|$)/i.test(voice.lang) && !/hk|yue|cantonese/i.test(voice.lang + ' ' + voice.name));
    if (!mandarin) {
      setAudioError(true);
      return;
    }
    stopAudio();
    const next = new SpeechSynthesisUtterance(text);
    next.lang = mandarin.lang;
    next.voice = mandarin;
    next.onend = () => {
      if (utterance.current === next) utterance.current = null;
    };
    next.onerror = () => {
      if (utterance.current !== next) return;
      utterance.current = null;
      setAudioError(true);
    };
    utterance.current = next;
    speech.cancel();
    speech.speak(next);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checkedSentence = sentence.trim();
    if (!/\p{Script=Han}/u.test(checkedSentence)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setAudioError(false);
    setChecked(checkedSentence);
  }

  function reading(text: string, pinyin: string, label: string, spokenText = text) {
    return <section className="sentence-check-reading">
      <div>
        <h3>{label}</h3>
        <p className="sentence-check-hanzi" lang="zh-Hans">{text}</p>
        {pinyin && <p className="pinyin" lang="zh-Latn-pinyin">{pinyin}</p>}
      </div>
      {spokenText && <button type="button" className="secondary" onClick={() => listen(spokenText)} aria-label={c.listen + ' · ' + label}>
        <Volume2 size={17} aria-hidden="true" />{c.listen}
      </button>}
    </section>;
  }

  const feedback = checked ? checkSentenceRules(checked, locale) : null;
  return <div className="sentence-check">
    <button type="button" className="text-button" onClick={onBack}>
      <ArrowLeft size={17} aria-hidden="true" />{c.back}
    </button>
    <header className="page-heading"><div>
      <h1>{c.title}</h1>
      <p>{c.intro}</p>
    </div></header>

    <form className="panel sentence-check-form" onSubmit={submit}>
      <label htmlFor="sentence-check-input">{c.input}</label>
      <textarea id="sentence-check-input" ref={field} value={sentence} rows={3} lang="zh-Hans"
        onChange={event => { setSentence(event.target.value); setInvalid(false); }}
        autoComplete="off" spellCheck={false} maxLength={maxLength} aria-invalid={invalid || undefined} required />
      <div className="sentence-check-examples" role="group" aria-label={c.examples}>
        <span>{c.examples}</span>
        {examples.map((example, i) => <button className="secondary" type="button" key={example}
          onClick={() => { setSentence(example); setInvalid(false); field.current?.focus(); }}>
          {c.exampleNames[i]}
        </button>)}
      </div>
      <button className="primary" type="submit" disabled={!sentence.trim()}>{c.submit}</button>
      {invalid && <p className="sentence-check-message" role="alert">{c.invalid}</p>}
    </form>

    <div className="sentence-check-live" aria-live="polite" aria-atomic="true">
      {feedback && <span className="sr-only">{c.result} · {c[feedback.status]} · <span lang="zh-Hans">{checked}</span></span>}
    </div>

    {feedback && <section className="panel sentence-check-result" aria-label={c.result}>
      <h2 className="sentence-check-status" data-status={feedback.status}><FeedbackIcon status={feedback.status} />{c[feedback.status]}</h2>
      {feedback.status === 'correct'
        ? reading(checked, feedback.pinyin, c.checked, feedback.correction)
        : reading(checked, '', c.checked, '')}
      {feedback.status === 'corrected' && feedback.correction && reading(feedback.correction, feedback.pinyin, c.correction)}
      <section className="sentence-check-explanation">
        <h3>{c.explanation}</h3>
        <p>{feedback.explanation}</p>
      </section>
      {feedback.natural && reading(feedback.natural, feedback.naturalPinyin, c.natural)}
      {audioError && <p className="sentence-check-message" role="alert">{c.noAudio}</p>}
    </section>}
  </div>;
}
