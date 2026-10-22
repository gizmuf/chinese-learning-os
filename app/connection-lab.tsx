'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Download, FlaskConical, Volume2, X } from 'lucide-react';
import { useI18n } from './i18n';
import { atlasById, atlasByHanzi, atlasItem, containing } from './atlas-model';
import type { AtlasCharacter } from './atlas-data';
import { assemblies, checkAssemblyChoice } from './atlas-workshop-data';
import AtlasWorkshop from './atlas-workshop';
import { atlasStories } from './atlas-stories';
import { seededQuestion } from './atlas-session';
import { playRecording, speak, stopAudio } from './audio';
import Ink from './ink';
import { compactStrokes, type Stroke } from './learning';
import { LAB_VERSION, routes, skills, taskOrder, labSchedules, dueLabTasks, labStats, recentlyExposed, type LabEvent, type LabRoute, type LabTask } from './connection-lab-model';
import { useLabStore } from './connection-lab-store';
import { L } from './connection-lab-copy';
import './connection-lab.css';
type Answer = {
    pick: string;
    placed: number[];
    ink: Stroke[];
    revealed: boolean;
    hinted: boolean;
    listened: boolean;
    rating: number | null;
    saved: boolean;
    mistake: boolean;
    started: number;
    assisted?: boolean;
    at?: number;
    durationMs?: number;
};
type Session = {
    version: 1;
    id: string;
    route: LabRoute;
    tasks: LabTask[];
    index: number;
    answers: Record<string, Answer>;
    exposed: boolean;
    done: boolean;
    feedbackId: string;
    feedback: number | null;
    review: boolean;
};
const blank = (): Answer => ({ pick: '', placed: [], ink: [], revealed: false, hinted: false, listened: false, rating: null, saved: false, mistake: false, started: Date.now() });
const candidates = assemblies.filter(a => atlasByHanzi.has(a.hanzi));
function createSession(route: LabRoute, targetId: string): Session {
    const tasks = taskOrder(route).map(skill => ({ id: crypto.randomUUID(), targetId, skill }));
    return { version: 1, id: crypto.randomUUID(), route, tasks, index: 0, answers: Object.fromEntries(tasks.map(t => [t.id, blank()])), exposed: false, done: false, feedbackId: crypto.randomUUID(), feedback: null, review: false };
}
// The draft is per browser tab and account. Results use a separate IndexedDB store.
function restore(raw: string | null): Session | null {
    if (!raw)
        return null;
    try {
        const s = JSON.parse(raw) as Session;
        if (s.version !== 1 || !routes.includes(s.route) || !Array.isArray(s.tasks) || !s.tasks.length || s.tasks.length > 30 || !Number.isInteger(s.index) || s.index < 0 || s.index >= s.tasks.length || typeof s.exposed !== 'boolean' || typeof s.done !== 'boolean')
            return null;
        if (!s.tasks.every(t => atlasById.has(t.targetId) && ['watch', ...skills].includes(t.skill) && s.answers[t.id] && Array.isArray(s.answers[t.id].ink) && Array.isArray(s.answers[t.id].placed)))
            return null;
        return s;
    }
    catch {
        return null;
    }
}
export default function ConnectionLab(props: {
    owner: string | null;
    penOnly: boolean;
    setPenOnly: (v: boolean) => void;
    notify: (m: string) => void;
}) {
    return <LabNotebook key={props.owner ?? 'guest'} {...props}/>;
}
function LabNotebook({ owner, penOnly, setPenOnly, notify }: {
    owner: string | null;
    penOnly: boolean;
    setPenOnly: (v: boolean) => void;
    notify: (m: string) => void;
}) {
    const { locale } = useI18n(), c = (key: keyof typeof L) => L[key][locale];
    const store = useLabStore(owner);
    const [route, setRoute] = useState<LabRoute>('connections'), [target, setTarget] = useState(candidates[0].hanzi);
    const [session, setSession] = useState<Session | null>(null), [active, setActive] = useState(false), [draftReady, setDraftReady] = useState(false), [draftError, setDraftError] = useState(false);
    const [inspected, setInspected] = useState<string | null>(null), [saving, setSaving] = useState(false), [error, setError] = useState(false);
    const inspectedAt = useRef<Record<string, number>>({});
    const saveLock = useRef(false), dialog = useRef<HTMLDialogElement>(null), heading = useRef<HTMLHeadingElement>(null);
    const draftKey = 'chinese-os-' + LAB_VERSION + '-draft-' + (owner ?? 'guest');
    useEffect(() => { try {
        const old = restore(sessionStorage.getItem(draftKey));
        if (old)
            setSession(old);
    }
    catch {
        setDraftError(true);
    } setDraftReady(true); return () => stopAudio(); }, [draftKey]);
    useEffect(() => { if (!draftReady)
        return; try {
        if (session)
            sessionStorage.setItem(draftKey, JSON.stringify(session));
        else
            sessionStorage.removeItem(draftKey);
    }
    catch {
        setDraftError(true);
    } }, [session, draftReady, draftKey]);
    useEffect(() => { if (inspected)
        dialog.current?.showModal();
    else
        dialog.current?.close(); }, [inspected]);
    useEffect(() => { if (active)
        heading.current?.focus(); }, [active, session?.index, session?.done]);
    const task = session?.tasks[session.index], answer = task && session?.answers[task.id];
    const current = task ? atlasById.get(task.targetId)! : undefined;
    const entry = current ? assemblies.find(a => a.hanzi === current.hanzi) : undefined;
    const question = useMemo(() => task && (task.skill === 'meaning' || task.skill === 'sound') ? seededQuestion(task.targetId, task.skill, locale, Number.parseInt(task.id.replaceAll('-', '').slice(0, 6), 16)) : null, [task, locale]);
    const schedules = useMemo(() => labSchedules(store.records), [store.records]);
    const due = dueLabTasks(store.records);
    const feedbackCounts = routes.map(route => ({ route, values: store.records.filter(r => r.kind === 'feedback' && r.route === route) }));
    const displayedSaved = !!task && (answer?.saved || store.records.some(r => r.id === task.id));
    const inspectedCharacter = inspected ? atlasByHanzi.get(inspected) : undefined;
    function update(patch: Partial<Answer>) { if (!task)
        return; setSession(s => s ? { ...s, answers: { ...s.answers, [task.id]: { ...s.answers[task.id], ...patch } } } : s); }
    function expose() { setSession(s => s ? { ...s, exposed: true } : s); }
    function inspect(hanzi: string) { stopAudio(); inspectedAt.current[hanzi] = Date.now(); if (active)
        expose(); setInspected(hanzi); const char = atlasByHanzi.get(hanzi); if (char && store.ready)
        void store.record({ version: 1, experiment: LAB_VERSION, kind: 'attempt', id: crypto.randomUUID(), sessionId: session?.id ?? crypto.randomUUID(), route: session?.route ?? route, targetId: char.id, skill: 'watch', at: Date.now(), durationMs: 0, assisted: true, rating: 0 }).catch(() => setError(true)); }
    function begin(nextRoute = route) { stopAudio(); const targetId = atlasByHanzi.get(target)!.id, next = createSession(nextRoute, targetId); next.exposed = recentlyExposed(store.records, targetId) || Date.now() - (inspectedAt.current[target] ?? 0) < 1800000; setSession(next); setActive(true); setError(false); }
    function beginDue() {
        if (!due.length)
            return;
        const next = createSession(due[0].route, due[0].targetId);
        // Review one due skill at a time, preserving its originating experimental route.
        next.tasks = [{ id: crypto.randomUUID(), targetId: due[0].targetId, skill: due[0].skill }];
        next.answers = { [next.tasks[0].id]: blank() };
        next.review = true;
        next.exposed = recentlyExposed(store.records, due[0].targetId) || Date.now() - (inspectedAt.current[atlasById.get(due[0].targetId)!.hanzi] ?? 0) < 1800000;
        setSession(next);
        setActive(true);
        setError(false);
    }
    function move(delta: number) { stopAudio(); setError(false); setSession(s => { if (!s)
        return s; const i = s.index + delta; if (i >= s.tasks.length)
        return { ...s, done: true }; return { ...s, index: Math.max(0, i), answers: { ...s.answers, [s.tasks[Math.max(0, i)].id]: { ...s.answers[s.tasks[Math.max(0, i)].id], started: Date.now() } } }; }); }
    function lockAnswer(rating: number) {
        if (!session || !answer || displayedSaved || answer.rating !== null)
            return;
        update({ rating, revealed: true, assisted: session.exposed || answer.hinted || task?.skill === 'component' || task?.skill === 'watch', at: Date.now(), durationMs: Math.min(3600000, Math.max(0, Date.now() - answer.started)) });
        expose();
    }
    async function saveResult() {
        if (!session || !task || !answer || answer.rating === null || displayedSaved || saveLock.current)
            return;
        saveLock.current = true;
        setSaving(true);
        setError(false);
        const e: LabEvent = { version: 1, experiment: LAB_VERSION, kind: 'attempt', id: task.id, sessionId: session.id, route: session.route, targetId: task.targetId, skill: task.skill, rating: answer.rating, assisted: answer.assisted ?? true, at: answer.at ?? Date.now(), durationMs: answer.durationMs ?? 0 };
        try {
            await store.record(e);
            update({ saved: true });
        }
        catch {
            setError(true);
        }
        finally {
            saveLock.current = false;
            setSaving(false);
        }
    }
    async function feedback(score: number) { if (!session || saveLock.current)
        return; saveLock.current = true; setSaving(true); setError(false); try {
        await store.record({ version: 1, experiment: LAB_VERSION, kind: 'feedback', id: session.feedbackId, sessionId: session.id, route: session.route, at: Date.now(), score });
        setSession(s => s ? { ...s, feedback: score } : s);
    }
    catch {
        setError(true);
    }
    finally {
        saveLock.current = false;
        setSaving(false);
    } }
    function exportHistory() { const blob = new Blob([JSON.stringify({ experiment: LAB_VERSION, exportedAt: new Date().toISOString(), records: store.records }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'Chinese-OS-Learning-Lab.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    function pause() { stopAudio(); setActive(false); }
    const canAnswer = store.ready && !saving && !displayedSaved && answer?.rating === null;
    function showContext(char: AtlasCharacter) { return <div className="cl-context"><span>{c('context')}</span><p><strong lang="zh-Hans">{char.word}</strong> <span className="pinyin">{char.wordPinyin}</span></p><p>{char.wordMeaning[locale]}</p><div className="cl-actions">{Array.from(new Set(char.word)).map(h => { const member = atlasByHanzi.get(h); return member ? <button key={h} className="cl-chip" onClick={() => inspect(h)}><strong>{h}</strong><span>{member.pinyin}</span></button> : null; })}<button className="secondary" onClick={() => speak(char.word, notify, atlasItem(char, locale))}><Volume2 size={16}/>{c('hear')}</button></div></div>; }
    return <section className="connection-lab" aria-label={c('title')}>
  <header className="cl-header"><p className="eyebrow"><FlaskConical size={16}/>{c('badge')}</p><h2 ref={heading} tabIndex={-1}>{active && session ? session.done ? c('completed') : c(task!.skill) : c('title')}</h2><p>{active && session ? c(session.route) : c('intro')}</p></header>
  {!store.ready && <p role="status">{store.error ? c('unavailable') : c('loading')}</p>}
  {draftError && <p role="status">{c('draftError')}</p>}
  {!active ? <>
   <p className="cl-muted">{c('scope')}</p>
   {session && !session.done && <div className="cl-resume"><span>{c(session.route)} · {session.index + 1}/{session.tasks.length}</span><button className="primary" disabled={!store.ready} onClick={() => { setActive(true); setError(false); }}>{c('resume')}<ArrowRight size={16}/></button><button className="text-button" onClick={() => setSession(null)}>{c('endSession')}</button></div>}
   <div className="cl-routes">{routes.map((r, i) => <button key={r} aria-pressed={route === r} className="cl-route" onClick={() => setRoute(r)}><span>0{i + 1}</span><h3>{c(r)}</h3><p>{c(r === 'connections' ? 'connectionsNote' : 'recallNote')}</p></button>)}</div>
   <h3>{c('select')}</h3><div className="cl-targets">{candidates.map(a => <button key={a.hanzi} className="cl-chip" aria-pressed={target === a.hanzi} onClick={() => setTarget(a.hanzi)}><strong className="cl-target-meaning">{a.meaning[locale]}</strong><span>{a.pinyin}</span></button>)}</div>
   <div className="cl-actions"><button className="primary" disabled={!store.ready || !draftReady || !!session && !session.done} onClick={() => begin()}>{c('start')}<ArrowRight size={16}/></button><button className="secondary" onClick={() => inspect(target)}>{c('inspect')}</button></div>
   <div className="cl-review"><div><h3>{c('review')} <span className="cl-count">{due.length}</span></h3><p>{c('reviewNote')}</p><p>{schedules.length ? due.length ? '' : c('noDue') : c('empty')}</p>{schedules[0] && <p>{c('later')}: {new Date(schedules[0].due).toLocaleString(locale)}</p>}</div><button className="secondary" disabled={!store.ready || !due.length || !!session && !session.done} onClick={beginDue}>{c('review')}<ArrowRight size={16}/></button></div>
   <h3>{c('compareRoutes')}</h3><p className="cl-muted">{c('evidence')}</p><p className="cl-muted">{c('counts')}</p><div className="cl-table"><table><thead><tr><th>{c('title')}</th>{skills.map(s => <th key={s}>{c(s)}</th>)}</tr></thead><tbody>{routes.map(r => <tr key={r}><th>{c(r)}</th>{skills.map(s => { const n = labStats(store.records, r, s); return <td key={s}>{n.guided} · {n.independent} · {n.remembered}</td>; })}</tr>)}</tbody></table></div>
   <div className="cl-feedback-summary">{feedbackCounts.map(f => <p key={f.route}>{c(f.route)} · {c('feedbackCount')}: {f.values.length}</p>)}</div>
   <div className="cl-actions"><button className="secondary" disabled={!store.ready} onClick={exportHistory}><Download size={16}/>{c('export')}</button></div>
  </> : session?.done ? <>
   <div className="cl-complete"><Check size={32}/><h3>{session.tasks.length}/{session.tasks.length}</h3><p>{c('assistance')}</p></div><h3>{c('reflect')}</h3><div className="cl-actions">{([1, 2, 3] as const).map(n => <button className="secondary" key={n} disabled={saving || !!session.feedback} onClick={() => void feedback(n)}>{c(`feedback${n}`)}</button>)}</div>{session.feedback && <p role="status">{c('feedbackSaved')}</p>}
   <div className="cl-actions"><button className="primary" onClick={pause}>{c('overview')}</button><button className="secondary" onClick={() => { setRoute(session.route === 'connections' ? 'recall' : 'connections'); setActive(false); }}>{c('tryOther')}</button></div>
  </> : session && task && answer && current ? <>
   <div className="cl-stepbar" aria-label={c('title')}>{session.tasks.map((s, i) => <span key={s.id} aria-current={i === session.index ? 'step' : undefined} className={i === session.index ? 'current' : ''}>{i + 1}. {c(s.skill)}{session.answers[s.id].saved && <Check size={12}/>}</span>)}</div>
   <p className="cl-muted">{c('assistance')}</p>
   {task.skill === 'watch' ? <>
    <AtlasWorkshop character={current.hanzi} onComponent={id => { const next = containing(id)[0]; if (next)
                inspect(next.hanzi); }} onCharacter={inspect} notify={notify}/>
    {showContext(current)}<button className="primary" disabled={!canAnswer} onClick={() => lockAnswer(0)}>{c('learned')}<Check size={16}/></button>
   </> : task.skill === 'component' && entry ? <>
    <h3>{entry.meaning[locale]} <span className="pinyin">{entry.pinyin}</span></h3><p>{c('buildPrompt')}</p>
    <svg className="cl-assembly" viewBox="0 0 1024 1024" aria-label={c('component')} role="img"><path d="M512 0V1024M0 512H1024" stroke="#dae2d8" strokeDasharray="12 20"/>
     <g transform="translate(0 900) scale(1 -1)">{entry.parts.map((part, i) => <g key={i} className={answer.placed.includes(i) ? 'cl-part placed' : 'cl-part'} style={{ opacity: answer.placed.includes(i) ? 1 : answer.hinted ? .2 : 0, transform: `translate(${answer.placed.includes(i) ? 0 : i % 2 ? 130 : -130}px,0)` }} fill={part.role === 'sound' ? '#aa7b46' : '#456b55'}>{part.strokes.map(j => <path key={j} d={entry.data.strokes[j]}/>)}</g>)}</g>
    </svg>
    <div className="cl-targets">{[...new Map([...entry.parts, { glyph: '日', pinyin: 'rì' }, { glyph: '月', pinyin: 'yuè' }].map(p => [p.glyph, p])).values()].sort((a, b) => a.glyph.localeCompare(b.glyph)).map(p => <button className="cl-chip" key={p.glyph} disabled={!canAnswer} onClick={() => { const i = checkAssemblyChoice(entry.parts, answer.placed, p.glyph); if (i < 0) {
                update({ mistake: true });
                return;
            } const placed = [...answer.placed, i]; update({ placed, mistake: false }); if (placed.length === entry.parts.length)
                lockAnswer(0); }}><strong>{p.glyph}</strong><span>{p.pinyin}</span></button>)}</div>
    <p role="status">{answer.rating === 0 ? c('buildDone') : answer.mistake ? c('wrongPiece') : answer.placed.length + ' / ' + entry.parts.length}</p>
    {answer.rating !== null && <><p>{entry.note[locale]}</p>{showContext(current)}</>}
   </> : task.skill === 'writing' ? <>
    <h3>{current.meaning[locale]}</h3><p className="pinyin">{current.pinyin}</p><p>{c('writePrompt')}</p>
    <label className="cl-pen"><input type="checkbox" checked={penOnly} onChange={e => setPenOnly(e.target.checked)}/>{c('pen')}</label>
    <div className="cl-writing"><svg viewBox="0 0 100 100" className="notebook-guidelines" aria-hidden="true"><path d="M50 0V100M0 50H100M0 0L100 100M100 0L0 100"/></svg><Ink strokes={answer.ink} onChange={ink => update({ ink: compactStrokes([ink])[0] })} penOnly={penOnly} disabled={!store.ready || answer.revealed || displayedSaved}/></div>
    {!answer.revealed ? <div className="cl-actions"><button className="secondary" onClick={() => update({ ink: answer.ink.slice(0, -1) })} disabled={!answer.ink.length}>{c('undo')}</button><button className="secondary" onClick={() => update({ ink: [] })} disabled={!answer.ink.length}>{c('clear')}</button><button className="primary" disabled={!store.ready || !answer.ink.length} onClick={() => { update({ revealed: true, assisted: session.exposed || answer.hinted }); expose(); }}>{c('compare')}</button></div> : <><p className="cl-model"><strong>{current.hanzi}</strong><span>{current.pinyin}</span></p><p>{c('self')}</p><div className="cl-actions">{(['again', 'hard', 'good', 'easy'] as const).map((key, i) => <button key={key} className="secondary" disabled={answer.rating !== null || displayedSaved} onClick={() => update({ rating: i + 1, at: Date.now(), durationMs: Math.min(3600000, Math.max(0, Date.now() - answer.started)) })}>{c(key)}</button>)}</div></>}
   </> : question ? <>
    <h3>{c(task.skill === 'meaning' ? 'meaningPrompt' : 'soundPrompt')}</h3>
    {task.skill === 'meaning' ? <p className="cl-model"><strong lang="zh-Hans">{current.word}</strong><span>{current.wordPinyin}</span></p> : <button className="primary" onClick={() => { const audio = playRecording('/atlas/audio/atlas-' + current.id + '-sentence.mp3', notify); audio.onplaying = () => update({ listened: true }); }}><Volume2 size={18}/>{c('hear')}</button>}
    <div className="cl-options">{question.options.map(o => <button key={o.id} className={'secondary ' + (answer.pick === o.id ? 'picked' : '')} disabled={!canAnswer || (task.skill === 'sound' && !answer.listened)} onClick={() => { update({ pick: o.id }); lockAnswer(o.id === question.answer ? 3 : 1); }}>{o.label}{task.skill === 'sound' && <span>{atlasById.get(o.id)?.wordPinyin}</span>}</button>)}</div>
    {answer.rating !== null && <div role="status"><p>{c(answer.rating >= 3 ? 'correct' : 'incorrect')}</p>{showContext(current)}</div>}
   </> : null}
   {task.skill !== 'watch' && answer.rating === null && !answer.revealed && <button className="text-button" onClick={() => { update({ hinted: true }); expose(); inspect(current.hanzi); }}>{c('hint')}</button>}
   {answer.rating !== null && <div className="cl-save"><p>{c(answer.assisted ? 'guided' : 'independent')}</p>{displayedSaved ? <span role="status"><Check size={16}/>{c('saved')}</span> : <button className="primary" disabled={saving || !store.ready} onClick={() => void saveResult()}>{c('save')}</button>}</div>}
   <footer className="cl-footer"><button className="secondary" disabled={saving || session.index === 0} onClick={() => move(-1)}><ArrowLeft size={16}/>{c('previous')}</button><span>{session.index + 1}/{session.tasks.length}</span><button className="primary" disabled={!displayedSaved || saving} onClick={() => move(1)}>{c(session.index === session.tasks.length - 1 ? 'finish' : 'next')}<ArrowRight size={16}/></button></footer>
   <button className="text-button" disabled={saving} onClick={pause}>{c('pause')}</button>
  </> : null}
  {error && <p role="alert">{c('saveError')}</p>}
  <p className="cl-device">{c('device')}</p>
  <dialog ref={dialog} aria-label={c('inspect')} className="cl-dialog" onCancel={() => { stopAudio(); setInspected(null); }} onClose={() => { stopAudio(); setInspected(null); }}>
   <button className="secondary cl-close" onClick={() => { stopAudio(); setInspected(null); }}><X size={18}/>{c('close')}</button>
   {inspectedCharacter && <><h2>{inspectedCharacter.hanzi} <span className="pinyin">{inspectedCharacter.pinyin}</span></h2><p>{inspectedCharacter.meaning[locale]}</p>{showContext(inspectedCharacter)}{(assemblies.some(a => a.hanzi === inspectedCharacter.hanzi) || Object.values(atlasStories).some(s => s.character === inspectedCharacter.hanzi)) ? <AtlasWorkshop character={inspectedCharacter.hanzi} onComponent={id => { const char = containing(id)[0]; if (char)
        inspect(char.hanzi); }} onCharacter={inspect} notify={notify}/> : <p>{inspectedCharacter.note[locale]}</p>}<h3>{c('family')}</h3><div className="cl-targets">{[...new Map(inspectedCharacter.components.flatMap(id => containing(id)).map(c => [c.id, c])).values()].slice(0, 12).map(char => <button key={char.id} className="cl-chip" onClick={() => inspect(char.hanzi)}><strong>{char.hanzi}</strong><span>{char.pinyin}</span><small>{char.meaning[locale]}</small></button>)}</div></>}
  </dialog>
 </section>;
}
