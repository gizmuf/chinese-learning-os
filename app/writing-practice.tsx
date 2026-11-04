"use client";
import {HanziDisplayControls,useHanziStyle} from './hanzi-style';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Check,ChevronRight,Lightbulb,PenLine,Play,Sparkles,Trash2,Undo2,Volume2} from 'lucide-react';
import type {Item,Mode} from './content';
import {compactStrokes,type LearningEvent,type Stroke} from './learning';
import {readDraft,saveDraft} from './local-store';
import {useI18n} from './i18n';
import {StudyText} from './study-lookup';
import {speak,playRecording} from './audio';
import Ink from './ink';
import Guided from './guided';
import Ratings from './review-ratings';
import {newEvent} from './learning-event';
type Draft = {
  strokes: Stroke[][];
  index: number;
  assisted: boolean;
  hints: number;
  revealed?: boolean;
  completed?: number[];
  attemptId?: string;
};
export default function Writing({
  item,
  mode,
  setMode,
  db,
  record,
  next,
  penOnly,
  setPenOnly,
  left,
  notify,
  session,
  audio,
  supported = false,
  nextLabel,
  contextExample = false,
}: {
  item: Item;
  mode: Mode;
  setMode: (m: Mode) => void;
  db: IDBDatabase | null;
  record: (e: LearningEvent) => Promise<void>;
  next: () => void;
  penOnly: boolean;
  setPenOnly: (v: boolean) => void;
  left: boolean;
  notify: (m: string) => void;
  session: boolean;
  audio?: {word?:string;sentence?:string};
  supported?: boolean;
  nextLabel?: string;
  contextExample?: boolean;
}) {
  const { t, locale } = useI18n();
  const {style}=useHanziStyle();
  function listen(kind:'word'|'sentence') {
    if (audio) {const source=audio[kind];if(source)playRecording(source,notify);}
    else speak(kind==='word'?item.hanzi:item.sentence,notify,item);
  }
  const [strokes, setStrokes] = useState<Stroke[][]>(
    Array.from(item.hanzi, () => []),
  );
  const [index, setIndex] = useState(0);
  const [wholeWord,setWholeWord]=useState(false),[cellReplay,setCellReplay]=useState<Record<number,number>>({});
  useEffect(()=>{setWholeWord(item.hanzi.length>1&&item.hanzi.length<=6&&typeof window!=='undefined'&&!!window.matchMedia?.("(min-width: 768px)").matches);},[item.id,item.hanzi]);
  const [assisted, setAssisted] = useState(supported);
  const [hints, setHints] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [replay, setReplay] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [unavailable,setUnavailable]=useState<Set<number>>(new Set());
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveLock=useRef(false);
  const [ready, setReady] = useState(false);
  const started = useRef(Date.now());
  const attemptId = useRef(crypto.randomUUID());
  const key = "writing:" + item.id + ":" + mode;
  useEffect(() => {
    let alive = true;
    if (!db) return;
    readDraft<Draft>(db, key)
      .then((d) => {
        if (!alive) return;
        if (d) {
          setStrokes(d.strokes);
          setIndex(d.index);
          setAssisted(d.assisted || supported);
          setHints(d.hints);
          setRevealed(d.revealed ?? false);
          setCompleted(new Set(d.completed ?? []));
          if (d.attemptId) attemptId.current = d.attemptId;
        }
        setReady(true);
      })
      .catch(() => {
        setReady(true);
        notify(
          t("Could not restore the last drawing. You can still start a new attempt."),
        );
      });
    return () => {
      alive = false;
    };
  }, [db, key, notify]);
  useEffect(() => {
    if (db && ready && !saved)
      saveDraft(db, key, {
        strokes,
        index,
        assisted,
        hints,
        revealed,
        completed: [...completed],
        attemptId: attemptId.current,
      }).catch(() => notify(t("Could not save this drawing on your device.")));
  }, [
    db,
    ready,
    saved,
    key,
    strokes,
    index,
    assisted,
    hints,
    revealed,
    completed,
    notify,
  ]);
  const characters = Array.from(item.hanzi);
  const printedTrace=style==='print'&&mode==='trace',free = mode === "copy" || mode === "recall" || printedTrace;
  const allWritten = free
    ? strokes.every((s) => s.length > 0)
    : completed.size === characters.length&&unavailable.size===0;
  function changeStrokes(s: Stroke[],at=index) {
    setStrokes((old) => old.map((v, i) => (i === at ? s : v)));
  }
  async function save(r: LearningEvent["rating"]) {
    if (saved || saveLock.current) return;
    saveLock.current=true; setSaving(true);
    try {
      const event = newEvent(
        item,
        "writing",
        mode,
        r,
        assisted || mode !== "recall",
        {
          strokes: compactStrokes(strokes),
          hints,
          mistakes,
          duration: Date.now() - started.current,
          input: penOnly ? "pen" : "mixed",
        },
      );
      event.id = attemptId.current;
      await record(event);
      setSaved(true);
      if (db) await saveDraft(db, key, undefined);
      notify(
        mode === "recall" && !assisted
          ? t("Review saved. Your next writing review is scheduled.")
          : t("Practice saved. Independent recall has its own schedule."),
      );
    } catch {
      notify(t("Could not save. Keep this page open and try again."));
    } finally {
      saveLock.current=false; setSaving(false);
    }
  }
  return (
    <div className={"studio-grid " + (left ? "left-handed" : "")}>
      <section className="writing-panel panel">
        <div className="studio-top">
          <div className="mode-tabs">
            {(["watch", "trace", "copy", "recall"] as Mode[]).map((m, i) => (
              <button
                disabled={saving || (session && m !== "recall")}
                key={m}
                className={mode === m ? "selected" : ""}
                onClick={() => setMode(m)}
              >
                <span>{i + 1}</span>
                {t(m[0].toUpperCase() + m.slice(1))}
              </button>
            ))}
          </div>
          <label className="pencil-toggle">
            <input
              type="checkbox"
              checked={penOnly}
              onChange={(e) => setPenOnly(e.target.checked)}
            />
            {t("Pencil only")}</label>
        </div>
        <div className="writing-prompt">
          <span className="eyebrow">
            {mode === "recall"
              ? t("WRITE FROM MEMORY")
              : t("LET YOUR HAND LEARN THE SHAPE")}
          </span>
          <h2>{item.english}</h2>
          <span className="pinyin">{item.pinyin}</span>
        </div>
        <div className="character-tabs">
          {characters.map((c, i) => (
            <button
              key={i}
              className={index === i ? "selected" : ""}
              onClick={() => setIndex(i)}
              aria-label={t("Character {0}", [i + 1])}
            >
              {mode === "recall" && !revealed ? i + 1 : c}
              {completed.has(i) && <Check size={11} />}
            </button>
          ))}
        </div>
        {characters.length>1&&<div className="writing-layout-controls" role="group" aria-label={t('Writing layout')}>{[false,true].map(whole=><button type="button" className="secondary" key={String(whole)} aria-pressed={wholeWord===whole} onClick={()=>setWholeWord(whole)}>{whole?({en:'Whole word',fr:'Mot entier',ru:'Целое слово',tr:'Tüm sözcük'}[locale]):({en:'One character',fr:'Un caractère',ru:'Один иероглиф',tr:'Tek karakter'}[locale])}</button>)}</div>}
        {!session&&<HanziDisplayControls compact showHighlight={false}/>}<div className={wholeWord?'whole-word-writing':'single-character-writing'}>{(wholeWord?characters.map((_,i)=>i):[index]).map(i=><div className={'writing-word-cell'+(i===index?' is-active':'')} key={i} onPointerDownCapture={event=>{if(!penOnly||event.pointerType==='pen')setIndex(i);}} onFocusCapture={()=>setIndex(i)}><div className="writing-grid"><div className="grid-line horizontal"/><div className="grid-line vertical"/><div className="grid-line diagonal-one"/><div className="grid-line diagonal-two"/>{printedTrace&&<svg className="writing-print-guide" viewBox="0 0 100 100" aria-hidden="true"><text x="50" y="80" textAnchor="middle" fontSize="82" fontFamily="var(--font-hanzi),sans-serif">{characters[i]}</text></svg>}{free?(ready?<Ink lineStyle={style==='print'?'pen':'brush'} disabled={saved} strokes={strokes[i]??[]} onChange={value=>changeStrokes(value,i)} penOnly={penOnly}/>:<span className="canvas-notice">{t('Loading your saved drawing…')}</span>):<Guided character={characters[i]} mode={mode as 'watch'|'trace'} penOnly={penOnly} replay={replay+(cellReplay[i]??0)} onMistake={()=>setMistakes(n=>n+1)} onAvailabilityChange={available=>setUnavailable(previous=>{const next=new Set(previous);if(available)next.delete(i);else next.add(i);return next;})} onComplete={()=>setCompleted(previous=>new Set([...previous,i]))}/>}</div>{wholeWord&&<button type="button" className="text-button" aria-pressed={i===index} onClick={()=>setIndex(i)}>{t('Character')} {i+1}{completed.has(i)&&!unavailable.has(i)?' ✓':''}</button>}</div>)}</div>
        <p className="canvas-caption">
          {completed.has(index) && !unavailable.has(index) && !free
            ? t("✓ Character complete. Choose the next cell.")
            : mode === "watch"
              ? t("Follow the stroke order. Replay whenever you like.")
              : mode === "trace"
                ? printedTrace?({en:'Trace the printed shape with a pen. This is free tracing, without automatic stroke scoring.',fr:'Repassez la forme imprimée au stylet. Tracé libre, sans évaluation automatique des traits.',ru:'Обведите печатную форму пером. Свободная обводка без автоматической оценки штрихов.',tr:'Basılı şekli kalemle çiz. Otomatik çizgi puanlaması olmayan serbest çizim.'}[locale]):t("Follow the outline, one stroke at a time.")
                : mode === "copy"
                  ? t("Look at the reference. Write in the empty grid.")
                  : t("Write the whole word, then compare your answer.")}
        </p>
        <div className="writing-tools">
          <button
            disabled={!free || saved || !strokes[index]?.length}
            onClick={() => changeStrokes(strokes[index].slice(0, -1))}
          >
            <Undo2 size={17} />
            {t("Undo")}</button>
          <button
            disabled={saved}
            onClick={() => {
              if (free) changeStrokes([]);
              else {
                setCellReplay(previous=>({...previous,[index]:(previous[index]??0)+1}));
                setCompleted((p) => {
                  const n = new Set(p);
                  n.delete(index);
                  return n;
                });
              }
            }}
          >
            <Trash2 size={17} />
            {t("Clear")}</button>
          <button
            disabled={saved || revealed}
            onClick={() => {
              setAssisted(true);
              setHints((n) => n + 1);
              setRevealed(true);
            }}
          >
            <Lightbulb size={17} />
            {t("Hint")}</button>
          <button
            disabled={saved}
            onClick={() => {
              if (free) {
                setAssisted(true);
                setHints((n) => n + 1);
                setRevealed(true);
                listen('word');
              } else setReplay((r) => r + 1);
            }}
          >
            <Play size={17} />
            {t("Replay")}</button>
        </div>
        <div className="writing-bottom">
          <span>
            {t("Character")} {t("{0} of {1}", [index + 1, characters.length])}
          </span>
          {!wholeWord && index < characters.length - 1 ? (
            <button
              className="secondary"
              onClick={() => setIndex((i) => i + 1)}
            >
              {t("Next character")}<ChevronRight size={16} />
            </button>
          ) : !revealed && mode === "recall" ? (
            <button
              className="primary"
              disabled={!allWritten}
              onClick={() => setRevealed(true)}
            >
              {t("Compare answer")}<ArrowRight size={16} />
            </button>
          ) : null}
        </div>
      </section>
      <aside className="reference-panel">
        <section className="panel reference-card">
          <span className="eyebrow">
            {mode === "recall" && !revealed ? t("YOUR PROMPT") : t("WORD IN FOCUS")}
          </span>
          {mode === "recall" && !revealed ? (
            <div className="hidden-answer">
              <PenLine size={33} />
              <h3>{t("Trust your memory.")}</h3>
              <p>
                {t("The answer stays hidden until you finish. A hint counts as assisted practice.")}</p>
            </div>
          ) : (
            <>
              <div className="reference-hanzi">{item.hanzi}</div>
              <p className="pinyin">{item.pinyin}</p>
              <h3>{item.english}</h3>
              <button
                className="audio-button"
                disabled={!!audio&&!audio.word}
                onClick={() => listen('word')}
              >
                <Volume2 size={17} /> {t("Hear pronunciation")}</button>
              {item.sentence && <div className="reference-example">
                <span className="eyebrow">{contextExample?"IN YOUR SOURCE SENTENCE":t("IN EVERYDAY LIFE")}</span>
                <p>{item.sentence}</p>
                <p className="pinyin">{item.sentencePinyin}</p>
                <small>{item.translation}</small>
                <button
                  className="text-button"
                  disabled={!!audio&&!audio.sentence}
                  onClick={() => listen('sentence')}
                >
                  <Volume2 size={14} /> {t("Listen to example")}</button>
              </div>}
            </>
          )}
        </section>
        <section className="practice-feedback">
          <span className="soft-icon">
            <Sparkles size={18} />
          </span>
          <h3>
            {saved
              ? t("A small step, saved.")
              : mode === "recall"
                ? t("Recall first. Refine second.")
                : t("Familiarity comes with practice.")}
          </h3>
          <p>
            {mode === "recall"
              ? t("Compare your completed word and rate your memory. This exercise uses self-assessment; free writing is not automatically graded.")
              : t("Watching, tracing and copying help your hand learn. Try recall next to check your memory.")}
          </p>
          {mode === "recall" && revealed && !saved && (
            <>
              <p className="rating-instruction">
                {assisted
                  ? t("You used help. This saves practice only.")
                  : t("How well did you remember before comparing?")}
              </p>
              <Ratings
                onRate={(r) => void save(r)}
                disabled={saving || !allWritten}
              />
            </>
          )}
          {mode !== "recall" && !saved && (
            <button
              className="secondary"
              disabled={!allWritten || saving || !ready}
              onClick={() => void save(0)}
            >
              {t("Save practice")}<Check size={16} />
            </button>
          )}
          {saved && (
            <button className="primary" onClick={next}>
              {nextLabel ?? t("Next word")}<ArrowRight size={17} />
            </button>
          )}
        </section>
      </aside>
    </div>
  );
}
