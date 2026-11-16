'use client';

import { ArrowLeft, Check, CircleHelp, Pencil, Volume2 } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { playRecording, releaseRecording } from './audio';
import { sentenceCheckRecording } from './sentence-check-recording';
import { checkSentenceRules, type SentenceCheckResult } from './sentence-check-rules';
import type { Locale } from './translate';
import { sentenceCheckCopy } from './sentence-check-copy';
import './sentence-check.css';

const examples = ['他比我很高。', '我昨天不去了学校。'];
const maxLength = 160;
const statusIcons = { correct: Check, corrected: Pencil, uncertain: CircleHelp };
type ReadingKind = 'correction' | 'natural';
type AudioTicket = { expires: number; signature: string };
type AIFeedback = SentenceCheckResult & { audio?: Partial<Record<ReadingKind, AudioTicket>> };
type AudioStatus = { kind: ReadingKind; state: 'loading' | 'loadError' | 'playError' | 'ready' };

function FeedbackIcon({ status }: { status: SentenceCheckResult['status'] }) {
  const Icon = statusIcons[status];
  return <Icon size={20} aria-hidden="true" />;
}

function SentenceReading({ text, pinyin, label, copy: c, onListen, expectsAudio, status, privacyId }: {
  text: string;
  pinyin?: string;
  label: string;
  copy: typeof sentenceCheckCopy[Locale];
  onListen?: () => void;
  expectsAudio?: boolean;
  status?: AudioStatus['state'];
  privacyId?: string;
}) {
  const loading = status === 'loading';
  return <section className="sentence-check-reading">
    <div>
      <h3>{label}</h3>
      <p className="sentence-check-hanzi" lang="zh-Hans">{text}</p>
      {pinyin && <p className="pinyin" lang="zh-Latn-pinyin">{pinyin}</p>}
    </div>
    {onListen && <button type="button" className="secondary" onClick={onListen} disabled={loading}
      aria-describedby={privacyId} aria-label={`${loading ? c.audioLoading : c.listen} · ${label}`}>
      <Volume2 size={17} aria-hidden="true" />{loading ? c.audioLoading : c.listen}
    </button>}
    {expectsAudio && !onListen && <p className="sentence-check-disclosure">{c.noAudio}</p>}
    {loading && <span className="sr-only" role="status">{c.audioLoading} · {label}</span>}
    {status === 'ready' && <p className="sentence-check-message" role="status">{c.audioReady}</p>}
    {status === 'loadError' && <p className="sentence-check-message" role="alert">{c.audioLoadError}</p>}
    {status === 'playError' && <p className="sentence-check-message" role="alert">{c.playError}</p>}
  </section>;
}

function SentenceCheckResultPanel({ locale, checked, feedback, aiFeedback, aiError }: {
  locale: Locale;
  checked: string;
  feedback: SentenceCheckResult;
  aiFeedback: AIFeedback | null;
  aiError: boolean;
}) {
  const c = sentenceCheckCopy[locale];
  const privacyId = useId();
  const [audioStatus, setAudioStatus] = useState<AudioStatus | null>(null);
  const pendingAudio = useRef<AbortController | null>(null);
  const recording = useRef<HTMLAudioElement | null>(null);
  const generatedSources = useRef(new Map<string, string>());
  const correctionSource = sentenceCheckRecording(feedback.correction);
  const naturalSource = sentenceCheckRecording(feedback.natural);
  const correctionTicket = !correctionSource ? aiFeedback?.audio?.correction : undefined;
  const naturalTicket = !naturalSource ? aiFeedback?.audio?.natural : undefined;

  useLayoutEffect(() => {
    const sources = generatedSources.current;
    return () => {
      pendingAudio.current?.abort();
      if (recording.current) releaseRecording(recording.current);
      for (const source of sources.values()) URL.revokeObjectURL(source);
      sources.clear();
    };
  }, []);

  async function listen(kind: ReadingKind, text: string, recordingSource?: string, ticket?: AudioTicket) {
    pendingAudio.current?.abort();
    pendingAudio.current = null;
    if (recording.current) {
      releaseRecording(recording.current);
      recording.current = null;
    }
    setAudioStatus(null);

    let source = recordingSource ?? generatedSources.current.get(text);
    let fetched = false;
    if (!source && ticket) {
      const controller = new AbortController();
      pendingAudio.current = controller;
      setAudioStatus({ kind, state: 'loading' });
      try {
        const response = await fetch('/api/sentence-check/audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, expires: ticket.expires, signature: ticket.signature }),
          signal: controller.signal,
        });
        if (!response.ok || !response.headers.get('Content-Type')?.startsWith('audio/')) {
          throw new Error('Sentence audio unavailable');
        }
        const audio = await response.blob();
        if (controller.signal.aborted) return;
        if (!audio.size) throw new Error('Sentence audio is empty');
        source = URL.createObjectURL(audio);
        generatedSources.current.set(text, source);
        fetched = true;
        setAudioStatus(null);
      } catch {
        if (!controller.signal.aborted) setAudioStatus({ kind, state: 'loadError' });
        return;
      } finally {
        if (pendingAudio.current === controller) pendingAudio.current = null;
      }
    }
    if (source) {
      recording.current = playRecording(source, () => setAudioStatus({ kind, state: fetched ? 'ready' : 'playError' }));
    }
  }

  const alreadyCorrect = feedback.status === 'correct';
  return <section className="panel sentence-check-result" aria-label={c.result}>
    {aiFeedback && <p className="sentence-check-disclosure">{c.aiResult}</p>}
    {aiError && <p className="sentence-check-message" role="status">{c.aiUnavailable}</p>}
    <h2 className="sentence-check-status" data-status={feedback.status}><FeedbackIcon status={feedback.status} />{c[feedback.status]}</h2>
    {(correctionTicket || naturalTicket) && <p id={privacyId} className="sentence-check-disclosure">{c.audioPrivacy}</p>}
    {!alreadyCorrect && <SentenceReading text={checked} label={c.checked} copy={c} />}
    {(alreadyCorrect || feedback.status === 'corrected') && (alreadyCorrect || feedback.correction) &&
      <SentenceReading text={alreadyCorrect ? checked : feedback.correction} pinyin={feedback.pinyin}
        label={alreadyCorrect ? c.checked : c.correction} copy={c} expectsAudio={Boolean(feedback.correction)}
        onListen={correctionSource || correctionTicket
          ? () => void listen('correction', feedback.correction, correctionSource, correctionTicket) : undefined}
        status={audioStatus?.kind === 'correction' ? audioStatus.state : undefined}
        privacyId={correctionTicket ? privacyId : undefined} />}
    <section className="sentence-check-explanation">
      <h3>{c.explanation}</h3>
      <p>{feedback.explanation}</p>
    </section>
    {feedback.natural && <SentenceReading text={feedback.natural} pinyin={feedback.naturalPinyin}
      label={c.natural} copy={c} expectsAudio
      onListen={naturalSource || naturalTicket ? () => void listen('natural', feedback.natural, naturalSource, naturalTicket) : undefined}
      status={audioStatus?.kind === 'natural' ? audioStatus.state : undefined}
      privacyId={naturalTicket ? privacyId : undefined} />}
  </section>;
}

export function SentenceCheck({ locale, onBack }: { locale: Locale; onBack: () => void }) {
  const c = sentenceCheckCopy[locale];
  const [sentence, setSentence] = useState('');
  const [checked, setChecked] = useState('');
  const [aiEnabled, setAIEnabled] = useState(false);
  const [aiBusy, setAIBusy] = useState(false);
  const [aiError, setAIError] = useState(false);
  const [aiFeedback, setAIFeedback] = useState<{ locale: Locale; feedback: AIFeedback } | null>(null);
  const aiRequest = useRef<AbortController | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [checkVersion, setCheckVersion] = useState(0);
  const field = useRef<HTMLTextAreaElement>(null);

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

  function inputForCheck() {
    const text = sentence.trim();
    if (!/\p{Script=Han}/u.test(text) || /[\r\n]/u.test(text)) {
      setInvalid(true);
      field.current?.focus();
      return null;
    }
    setInvalid(false);
    setCheckVersion(version => version + 1);
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
      const feedback: AIFeedback = await response.json();
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

    {feedback && <SentenceCheckResultPanel key={`${locale}:${checkVersion}:${checked}:${Boolean(activeAIFeedback)}`}
      locale={locale} checked={checked} feedback={feedback} aiFeedback={activeAIFeedback} aiError={aiError} />}
  </div>;
}
