'use client';

import {useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode} from 'react';
import {ArrowLeft, MessageCircle, Send} from 'lucide-react';
import type {ReadingLabExample, ReadingLabGrammar} from './reading-lab-types';
import './reading-tutor.css';

type Language = 'pl' | 'en';
type Provider = 'chatgpt' | 'deepseek';
type Turn = {question: string; answer: string};
type Status = {deepseek: boolean; chatgpt: 'connect' | 'connected' | 'unavailable'};
type Source = {chunk: string; paragraph: string; example: ReadingLabExample};
type Fragment = {before?: string; marker: string; after: string; pinyin: string; polish: string; english: string};
type Opening = {button: HTMLButtonElement; url: string; scroll: number};

const endpoint = '/api/reading-tutor';
const offline: Status = {deepseek: false, chatgpt: 'unavailable'};
const names = {chatgpt: 'ChatGPT', deepseek: 'DeepSeek'};
const languageKey = 'cos-tutor-language';
const languageEvent = 'chinese-os:tutor-language';
let chosenLanguage: Language | undefined;
const pairedSentences: Record<string, {parts: [Fragment, Fragment]; tone: string}> = {
  '我一到家就给你打电话。': {
    parts: [
      {before: '我', marker: '一', after: '到家', pinyin: 'Wǒ yí dào jiā', polish: 'jak tylko dotrę do domu', english: 'As soon as I get home,'},
      {marker: '就', after: '给你打电话。', pinyin: 'jiù gěi nǐ dǎ diànhuà.', polish: 'od razu do ciebie zadzwonię', english: 'I’ll call you.'},
    ],
    tone: 'dào',
  },
  '我以前一下班就看手机。': {
    parts: [
      {before: '我以前', marker: '一', after: '下班', pinyin: 'Wǒ yǐqián yí xiàbān', polish: 'dawniej, jak tylko kończyłem pracę', english: 'As soon as I got off work,'},
      {marker: '就', after: '看手机。', pinyin: 'jiù kàn shǒujī.', polish: 'od razu sięgałem po telefon', english: 'I used to go on my phone.'},
    ],
    tone: 'xià',
  },
};

function savedLanguage(): Language {
  if (chosenLanguage) return chosenLanguage;
  try {
    const value = localStorage.getItem(languageKey);
    if (value === 'pl' || value === 'en') return value;
  } catch {}
  return navigator.language.toLowerCase().startsWith('pl') ? 'pl' : 'en';
}

function subscribeLanguage(onChange: () => void) {
  window.addEventListener(languageEvent, onChange);
  return () => window.removeEventListener(languageEvent, onChange);
}

const defaultLanguage = (): Language => 'en';

function changeLanguage(language: Language) {
  chosenLanguage = language;
  try { localStorage.setItem(languageKey, language); } catch {}
  window.dispatchEvent(new Event(languageEvent));
}

export default function ReadingTutor({article, grammar, listen, source, onOpen}: {
  article: string; grammar: ReadingLabGrammar; listen?: ReactNode; source?: Source; onOpen: () => void;
}) {
  const titleId = useId();
  const example = source?.example ?? grammar.example;
  const paired = pairedSentences[example.hanzi];
  const sourceChunk = source?.chunk;
  const historyKey = [article, grammar.id, sourceChunk].join(':');
  const [open, setOpen] = useState(false);
  const language = useSyncExternalStore(subscribeLanguage, savedLanguage, defaultLanguage);
  const [status, setStatus] = useState<Status | null>(null);
  const [provider, setProvider] = useState<Provider>('chatgpt');
  const [turns, setTurns] = useState<Record<Provider, Turn[]>>({chatgpt: [], deepseek: []});
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<Opening | null>(null);
  const backRequested = useRef(false);
  const operation = useRef<AbortController | null>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const pl = language === 'pl';
  const name = pl ? 'Zapytaj o to' : 'Ask about this';
  const available = provider === 'chatgpt' ? status?.chatgpt === 'connected' : status?.deepseek;
  const replies = turns[provider];

  useEffect(() => {
    const button = trigger.current;
    const url = new URL(location.href);
    const result = url.searchParams.get('tutorReturn');
    const matches = url.searchParams.get('article') === article && url.searchParams.get('grammar') === grammar.id
      && (url.searchParams.get('chunk') ?? undefined) === sourceChunk;
    if (button && result && matches) {
      const frame = requestAnimationFrame(() => {
        url.searchParams.delete('tutorReturn');
        history.replaceState({...history.state, readingTutor: undefined}, '', url);
        setError(result === 'connected' ? '' : result === 'declined' ? 'declined' : 'connect_error');
        openFrom(button);
      });
      return () => {
        cancelAnimationFrame(frame);
        operation.current?.abort();
      };
    }
    if (button && history.state?.readingTutor === historyKey) {
      opener.current = {button, url: location.href, scroll: window.scrollY};
      setOpen(true);
    }
    return () => operation.current?.abort();
  // This handles only initial return from account linking and direct page reload.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyKey]);

  useEffect(() => {
    const pop = (event: PopStateEvent) => {
      backRequested.current = false;
      if (event.state?.readingTutor === historyKey && opener.current?.url === location.href) setOpen(true);
      else setOpen(false);
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, [historyKey]);

  useLayoutEffect(() => {
    if (!open) return;
    const element = dialog.current;
    if (!element) return;
    element.dataset.tutorLocation = opener.current?.url ?? location.href;
    element.showModal();
    closeButton.current?.focus({preventScroll: true});
    return () => {
      if (element.open) element.close();
      const origin = opener.current;
      if (origin?.button.isConnected && origin.url === location.href) {
        origin.button.focus({preventScroll: true});
        if (window.scrollY !== origin.scroll) window.scrollTo({top: origin.scroll, behavior: 'instant'});
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch(endpoint, {cache: 'no-store', signal: controller.signal}).then(async res => {
      if (!res.ok) throw Error();
      const data = await res.json() as Status;
      if (!['connect', 'connected', 'unavailable'].includes(data.chatgpt) || typeof data.deepseek !== 'boolean') throw Error();
      return data;
    }).catch(() => offline).then(data => {
      if (controller.signal.aborted) return;
      setStatus(data);
      setProvider(old => (old === 'deepseek' && data.deepseek) || (data.chatgpt !== 'connected' && data.deepseek) ? 'deepseek' : 'chatgpt');
    });
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    const element = conversation.current;
    if (replies.length && element) element.scrollTop = element.scrollHeight;
  }, [replies, open]);

  function openFrom(button: HTMLButtonElement) {
    const url = location.href;
    opener.current = {button, url, scroll: window.scrollY};
    if (history.state?.readingTutor !== historyKey) history.pushState({...history.state, readingTutor: historyKey}, '', url);
    onOpen();
    setOpen(true);
  }

  function close() {
    if (history.state?.readingTutor === historyKey) {
      if (backRequested.current) return;
      backRequested.current = true;
      history.back();
    } else {
      setOpen(false);
    }
  }

  function connectReturn() {
    const params = new URLSearchParams(location.search);
    params.set('grammar', grammar.id);
    params.delete('chunk');
    if (source) {
      params.set('chunk', source.chunk);
      params.set('at', source.paragraph);
    }
    return '?' + params;
  }

  async function submit(action: 'ask' | 'connect' | 'disconnect') {
    if (operation.current || (action === 'ask' && (!available || !draft.trim()))) return;
    const controller = new AbortController();
    operation.current = controller;
    setPending(true);
    setError('');
    const question = draft.trim();
    try {
      const body = action === 'ask'
        ? {article, grammar: grammar.id, ...(sourceChunk && {sourceChunk}), provider, language, question, history: replies.slice(-3)}
        : action === 'connect' ? {action, returnTo: connectReturn()} : {action};
      const response = await fetch(action === 'ask' ? endpoint : endpoint + '/plan', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, cache: 'no-store', signal: controller.signal, body: JSON.stringify(body),
      });
      const result = await response.json() as {error?: string; url?: string; provider?: string; answer?: string};
      if (!response.ok) throw new Error(result.error || 'provider_unavailable');
      if (action === 'connect') {
        if (!result.url) throw Error('connect_error');
        const url = new URL(result.url);
        if (url.origin !== 'https://auth.openai.com') throw Error('connect_error');
        window.location.assign(url.href);
      } else if (action === 'disconnect') {
        setStatus(current => current && ({...current, chatgpt: 'connect'}));
        setTurns(previous => ({...previous, chatgpt: []}));
      } else {
        const answer = result.answer;
        if (result.provider !== provider || typeof answer !== 'string' || !answer.trim()) throw Error('provider_unavailable');
        setTurns(previous => ({...previous, [provider]: [...previous[provider], {question, answer}]}));
        setDraft('');
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        const code = e instanceof Error ? e.message : 'provider_unavailable';
        if (code === 'reconnect') setStatus(current => current && ({...current, chatgpt: 'connect'}));
        setError(code);
      }
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  const suggestion = paired
    ? (pl ? 'Co się zmieni, jeśli pominę 一?' : 'What changes if I leave out 一?')
    : (pl ? 'Pokaż mi inny przykład z tą konstrukcją.' : 'Show me another example with this pattern.');
  const errorText = error === 'rate_limited'
    ? (pl ? 'Limit pytań został osiągnięty. Spróbuj później.' : 'The question limit has been reached. Try again later.')
    : error === 'plan_ineligible' ? (pl ? 'Ten plan ChatGPT nie obsługuje tutora.' : 'This ChatGPT plan doesn’t support the tutor.')
    : error === 'declined' ? (pl ? 'Logowanie anulowane.' : 'Sign-in cancelled.')
    : error === 'reconnect' || error === 'connect_error' ? (pl ? 'Połącz konto ChatGPT ponownie.' : 'Reconnect your ChatGPT account.')
    : (pl ? 'Nie udało się uzyskać odpowiedzi. Możesz ponowić pytanie.' : 'Couldn’t get a reply. You can retry your question.');
  const note = paired ? (pl
    ? <>Znak <b lang="zh-Hans">一</b> rozpoczyna pierwsze zdarzenie, a <b lang="zh-Hans">就</b> wprowadza to, co następuje zaraz po nim. Przed <i>{paired.tone}</i> czytaj <b lang="zh-Hans">一</b> jako <i>yí</i>.</>
    : <><b lang="zh-Hans">一</b> introduces the first event, and <b lang="zh-Hans">就</b> introduces what happens immediately after it. Before <i>{paired.tone}</i>, pronounce <b lang="zh-Hans">一</b> as <i>yí</i>.</>) : grammar.note;
  const descriptionId = titleId + '-sentence';
  const ask = <button className="rt-ask" type="button" ref={trigger} lang={language} aria-haspopup="dialog"
    aria-describedby={source ? descriptionId : undefined} onClick={event => openFrom(event.currentTarget)}>
    <MessageCircle size={16} aria-hidden="true"/>{name}
  </button>;

  return <>
    {source ? <><span id={descriptionId} lang="zh-Hans" hidden>{example.hanzi}</span>{ask}</> : <>
      <p className="rt-example" lang="zh-Hans">{paired ? paired.parts.map(part => <span key={part.marker}>{part.before}
        <button type="button" className="rt-inline" aria-haspopup="dialog" aria-label={part.marker + ' · ' + name}
          onClick={event => openFrom(event.currentTarget)}>{part.marker}</button>{part.after}</span>) : example.hanzi}</p>
      <p className="rl-example-pinyin">{example.pinyin}</p>
      <p lang="en">{example.english}</p>
      <div className="rt-actions">{listen}{ask}</div>
    </>}
    {open && <dialog className="rt-dialog" ref={dialog} lang={language} aria-labelledby={titleId}
      onCancel={event => {event.preventDefault(); close();}}>
      <header className="rt-head">
        <button type="button" className="rt-back" ref={closeButton}
          aria-label={pl ? 'Wróć do czytanki' : 'Back to reading'} onClick={close}><ArrowLeft size={20} aria-hidden="true"/></button>
        <h2 id={titleId}>{name}</h2>
        <select aria-label={pl ? 'Język odpowiedzi' : 'Tutor language'} value={language}
          onChange={event => changeLanguage(event.target.value === 'pl' ? 'pl' : 'en')}>
          <option value="pl">Polski</option><option value="en">English</option></select>
      </header>
      <section className="rt-pinned" aria-label={pl ? 'Przypięte zdanie' : 'Pinned sentence'}>
        <div className="rt-chunks">
          {paired ? paired.parts.map(part => <div key={part.marker}>
            <strong lang="zh-Hans">{part.before}<mark>{part.marker}</mark>{part.after}</strong>
            <span>{part.pinyin}</span>
            {pl && <small lang="pl">{part.polish}</small>}
            <small lang="en">{part.english}</small>
          </div>) : <div><strong lang="zh-Hans">{example.hanzi}</strong><span>{example.pinyin}</span><small lang="en">{example.english}</small></div>}
        </div>
        <p lang={paired ? language : 'en'}>{note}</p>
      </section>
      <div className="rt-conversation" ref={conversation}>
        {status && (status.chatgpt !== 'unavailable' || status.deepseek) && <div className="rt-providers" role="group" aria-label={pl ? 'Wybierz model' : 'Choose a provider'}>
          {(['chatgpt', 'deepseek'] as const).filter(id => id === 'chatgpt' ? status.chatgpt !== 'unavailable' : status.deepseek).map(id =>
            <button type="button" key={id} disabled={pending} aria-pressed={id === provider} onClick={() => {setProvider(id); setError('');}}>
              {id === 'chatgpt' ? (pl ? 'Mój plan ChatGPT' : 'My ChatGPT plan') : names[id]}
            </button>)}
        </div>}
        {provider === 'chatgpt' && status?.chatgpt === 'connect' && <button className="rt-connect" type="button" disabled={pending} onClick={() => void submit('connect')}>Sign in with ChatGPT</button>}
        {provider === 'chatgpt' && status?.chatgpt === 'connected' && <button className="rt-disconnect" type="button" disabled={pending} onClick={() => void submit('disconnect')}>{pl ? 'Odłącz ChatGPT od tej przeglądarki' : 'Disconnect ChatGPT from this browser'}</button>}
        {status && !status.deepseek && status.chatgpt === 'unavailable' && <p className="rt-unavailable" role="status">{pl ? 'Pytania do tutora są teraz niedostępne.' : 'Live questions are currently unavailable.'}</p>}
        {!!replies.length && <div className="rt-turns" role="log" aria-label={pl ? 'Odpowiedzi tutora' : 'Tutor replies'}>
          {replies.map((turn, index) => <div className="rt-turn" key={index}><p className="rt-question">{turn.question}</p><strong>{names[provider]}</strong><p>{turn.answer}</p></div>)}
        </div>}
      </div>
      {pending && <p className="rt-notice" role="status">{pl ? 'Czekam na odpowiedź…' : 'Waiting for a reply…'}</p>}
      {error && <p className="rt-notice" role="alert">{errorText}</p>}
      {available && <form className="rt-compose" onSubmit={event => {event.preventDefault(); void submit('ask');}}>
        {!replies.length && <button type="button" className="rt-suggestion" disabled={pending} onClick={() => {setDraft(suggestion); composer.current?.focus();}}>{suggestion}</button>}
        <div><textarea ref={composer} aria-label={pl ? 'Pytanie o zdanie' : 'Question about the sentence'} value={draft} maxLength={600} disabled={pending}
          placeholder={pl ? 'Zapytaj o to zdanie…' : 'Ask about this sentence…'} rows={2} onChange={event => setDraft(event.target.value)}/>
          <button type="submit" disabled={!draft.trim() || pending} aria-label={pl ? 'Wyślij pytanie' : 'Send question'}><Send size={20} aria-hidden="true"/></button></div>
      </form>}
    </dialog>}
  </>;
}
