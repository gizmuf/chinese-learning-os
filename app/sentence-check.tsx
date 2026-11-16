'use client';

import { ArrowLeft, Check, CircleHelp, Pencil, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { playRecording, releaseRecording } from './audio';
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
  const [aiEnabled, setAIEnabled] = useState(false);
  const [aiBusy, setAIBusy] = useState(false);
  const [aiError, setAIError] = useState(false);
  const [aiFeedback, setAIFeedback] = useState<{ locale: Locale; feedback: SentenceCheckResult } | null>(null);
  const aiRequest = useRef<AbortController | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const recording = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/sentence-check', { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) return false;
        const settings: { enabled?: boolean } = await response.json();
        return settings?.enabled === true;
      })
      .then(enabled => { if (enabled && !controller.signal.aborted) setAIEnabled(true); })
      .catch(() => {});
    return () => {
      controller.abort();
      aiRequest.current?.abort();
    };
  }, []);

  useEffect(() => () => {
    if (recording.current) releaseRecording(recording.current);
  }, []);

  function listen(source: string) {
    setAudioError(false);
    recording.current = playRecording(source, () => setAudioError(true));
  }

  function inputForCheck() {
    const text = sentence.trim();
    if (!/\p{Script=Han}/u.test(text) || /[\r\n]/u.test(text)) {
      setInvalid(true);
      field.current?.focus();
      return null;
    }
    setInvalid(false);
    setAudioError(false);
    setAIError(false);
    setAIFeedback(null);
    return text;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = inputForCheck();
    if (text) setChecked(text);
  }

  async function checkWithAI() {
    if (aiRequest.current) return;
    const text = inputForCheck();
    if (!text) return;
    const controller = new AbortController();
    aiRequest.current = controller;
    setAIBusy(true);
    try {
      const response = await fetch('/api/sentence-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence: text, locale }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Sentence check unavailable');
      const feedback: SentenceCheckResult = await response.json();
      if (controller.signal.aborted) return;
      setChecked(text);
      setAIFeedback({ locale, feedback });
    } catch {
      if (controller.signal.aborted) return;
      setChecked(text);
      setAIError(true);
    } finally {
      if (aiRequest.current === controller) {
        aiRequest.current = null;
        if (!controller.signal.aborted) setAIBusy(false);
      }
    }
  }

  function reading(text: string, pinyin: string, label: string, spokenText = text) {
    const source = spokenText ? sentenceCheckRecording(spokenText) : undefined;
    return <section className="sentence-check-reading">
      <div>
        <h3>{label}</h3>
        <p className="sentence-check-hanzi" lang="zh-Hans">{text}</p>
        {pinyin && <p className="pinyin" lang="zh-Latn-pinyin">{pinyin}</p>}
      </div>
      {source && <button type="button" className="secondary" onClick={() => listen(source)} aria-label={c.listen + ' · ' + label}>
        <Volume2 size={17} aria-hidden="true" />{c.listen}
      </button>}
      {spokenText && !source && <p className="sentence-check-disclosure">{c.noAudio}</p>}
    </section>;
  }

  const activeAIFeedback = aiFeedback?.locale === locale ? aiFeedback.feedback : null;
  const feedback = activeAIFeedback ?? (checked ? checkSentenceRules(checked, locale) : null);
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
      <div className="sentence-check-examples">
        <button className="primary" type="submit" disabled={!sentence.trim() || aiBusy}>{c.submit}</button>
        {aiEnabled && <button className="secondary" type="button" aria-describedby="sentence-ai-privacy"
          disabled={!sentence.trim() || aiBusy} onClick={checkWithAI}>{aiBusy ? c.aiPending : c.ai}</button>}
      </div>
      {aiEnabled && <p id="sentence-ai-privacy" className="sentence-check-disclosure">{c.aiPrivacy}</p>}
      {aiBusy && <span className="sr-only" role="status">{c.aiPending}</span>}
      {invalid && <p className="sentence-check-message" role="alert">{c.invalid}</p>}
    </form>

    <div className="sentence-check-live" aria-live="polite" aria-atomic="true">
      {feedback && <span className="sr-only">{c.result} · {c[feedback.status]} · <span lang="zh-Hans">{checked}</span></span>}
    </div>

    {feedback && <section className="panel sentence-check-result" aria-label={c.result}>
      {activeAIFeedback && <p className="sentence-check-disclosure">{c.aiResult}</p>}
      {aiError && <p className="sentence-check-message" role="status">{c.aiUnavailable}</p>}
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
      {audioError && <p className="sentence-check-message" role="alert">{c.playError}</p>}
    </section>}
  </div>;
}
