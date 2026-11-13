"use client";
import {useHanziStyle} from './hanzi-style';
import WritingHelp from "./writing-help";
import { useI18n } from "./i18n";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, RotateCcw, Undo2, Volume2 } from "lucide-react";
import type { Item } from "./content";
import type { LearningEvent, Stroke } from "./learning";
import { readDraft, saveDraft } from "./local-store";
import { speak } from "./audio";
import PinyinHandwriting from './pinyin-handwriting';
import LanguagePracticeSet from './language-practice-set';
import {authoredCharacterReadings} from './pinyin-boundaries';
import './pinyin-practice.css';
import Ink from "./ink";
import {WritingCharacterContext} from "./writing-context";

type CharacterData = { strokes: string[]; medians: number[][][] };
type Sheet = { cells: Record<string, Stroke[]>; hidden: boolean; attemptId: string };
const emptySheet = (): Sheet => ({ cells: {}, hidden: false, attemptId: crypto.randomUUID() });

function Glyph({ data, through, active, direction = false }: {
  data: CharacterData; through: number; active?: number; direction?: boolean;
}) {
  const median = active === undefined ? undefined : data.medians[active];
  return <svg viewBox="0 0 1024 1024" aria-hidden="true">
    <g transform="translate(0, 900) scale(1, -1)">
      {data.strokes.slice(0, through + 1).map((path, i) =>
        <path key={i} d={path} fill={i === active ? "#cc734b" : "currentColor"} />)}
      {direction && median && median.length > 1 && <>
        <path d={median.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ")}
          fill="none" stroke="white" strokeWidth="12" strokeLinecap="round" />
        <circle cx={median[0][0]} cy={median[0][1]} r="23" fill="white" stroke="#cc734b" strokeWidth="7" />
      </>}
    </g>
  </svg>;
}

function PrintedGlyph({character}:{character:string}){return <svg viewBox="0 0 100 100" aria-hidden="true"><text x="50" y="80" textAnchor="middle" fontSize="82" fontFamily="var(--font-hanzi),sans-serif" fill="currentColor">{character}</text></svg>;}

export function NotebookWordModel({text}:{text:string}){
 const {style}=useHanziStyle();
 const [models,setModels]=useState<Record<string,CharacterData>>({});
 useEffect(()=>{const controller=new AbortController();setModels({});if(style==='print')return()=>controller.abort();for(const character of new Set(Array.from(text))){fetch(`/characters/${encodeURIComponent(character)}.json`,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('Missing character');return r.json() as Promise<CharacterData>;}).then(data=>{if(!controller.signal.aborted&&Array.isArray(data.strokes))setModels(old=>({...old,[character]:data}));}).catch(()=>{});}return()=>controller.abort();},[text,style]);
 return <div className="notebook-whole-model" role="img" aria-label={text}>{Array.from(text).map((character,i)=><span key={i}>{style==='print'?<PrintedGlyph character={character}/>:models[character]?<Glyph data={models[character]} through={models[character].strokes.length-1}/>:<span lang="zh-Hans">{character}</span>}</span>)}</div>;
}

// Keep untouched cells stable while a neighbouring cell commits a stroke.
const EMPTY_STROKES:Stroke[]=[];
function CharacterRow({ character, reading, position, sheet, change, penOnly, disabled, notify }: {
  character: string; reading?:string; position: number; sheet: Sheet;
  change: (key: string, strokes: Stroke[]) => void; penOnly: boolean; disabled: boolean; notify:(message:string)=>void;
}) {
  const { t, locale } = useI18n();
  const {style}=useHanziStyle();
  const [data, setData] = useState<CharacterData | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setFailed(false); setStep(0);
    fetch(`/characters/${encodeURIComponent(character)}.json`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw Error("Missing character"); return r.json() as Promise<CharacterData>; })
      .then(value => setData(value))
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [character, retry]);
  function cell(slot: number, trace: boolean, label: string) {
    const key = `${position}:${slot}`;
    const strokes = sheet.cells[key] ?? EMPTY_STROKES;
    return <div className="notebook-cell" key={slot}>
      <div className="notebook-square">
        <Grid />
        {trace && !sheet.hidden && (style==='print'||data) && <div className="notebook-ghost">{style==='print'?<PrintedGlyph character={character}/>:data&&<Glyph data={data} through={data.strokes.length - 1} />}</div>}
        <Ink quietTouch lineStyle={style==='print'?'pen':'brush'} strokes={strokes} onChange={s => change(key, s)} penOnly={penOnly} disabled={disabled} />
      </div>
      <div className="notebook-cell-tools"><small>{label}</small>
        <button aria-label={t("Undo {0} {1}", [character, label])} disabled={disabled || !strokes.length} onClick={() => change(key, strokes.slice(0, -1))}><Undo2 size={14} /></button>
        <button aria-label={t("Clear {0} {1}", [character, label])} disabled={disabled || !strokes.length} onClick={() => change(key, [])}><RotateCcw size={14} /></button>
      </div>
    </div>;
  }
  return <section className="notebook-character" aria-label={t("Character {0} practice", [position + 1])}>
    <h3>{sheet.hidden ? t("Character {0}", [position + 1]) : character}</h3>
    {!sheet.hidden && <><WritingCharacterContext character={character} notify={notify}/>
      {data ? <>
        {style==='print'&&<p className="notebook-guide-note">{({en:'Stroke-order diagrams use the handwriting model. The practice boxes below use your printed font.',fr:'Les étapes suivent le modèle manuscrit. Les cases ci-dessous utilisent votre police imprimée.',ru:'Порядок штрихов показан по рукописному образцу. В клетках ниже используется печатный шрифт.',tr:'Çizgi sırası el yazısı modelini kullanır. Aşağıdaki kutular basılı yazı tipini kullanır.'}[locale])}</p>}
        <div className="notebook-steps" aria-label={t("Stroke order for {0}", [character])}>
          {data.strokes.map((_, i) => <button key={i} aria-label={t("{0} stroke {1}", [character, i + 1])} aria-pressed={step === i}
            className={step === i ? "selected" : ""} onClick={() => setStep(i)}>
            <Glyph data={data} through={i} active={i} /><small>{i + 1}</small>
          </button>)}
        </div>
        <div className="notebook-step-detail">
          <div className="notebook-step-glyph"><Glyph data={data} through={step} active={step} direction /></div>
          <div><strong>{t("Stroke {0} of {1}", [step + 1, data.strokes.length])}</strong><p>{t("Start at the white dot and follow the highlighted stroke.")}</p>
            <button className="text-button" aria-label={t("Previous stroke for {0}", [character])} disabled={step === 0} onClick={() => setStep(s => s - 1)}><ChevronLeft size={16} /> {t("Previous")}</button>
            <button className="text-button" aria-label={t("Next stroke for {0}", [character])} disabled={step === data.strokes.length - 1} onClick={() => setStep(s => s + 1)}>{t("Next")}<ChevronRight size={16} /></button>
          </div>
        </div>
      </> : <p role="status">{failed ? <>{t("Stroke guide unavailable.")}<button className="text-button" onClick={() => setRetry(r => r + 1)}>{t("Retry")}</button> {t("You can still write below.")}</> : t("Loading stroke guide…")}</p>}
    </>}
    <div className="notebook-cells">
      {!sheet.hidden && <div className="notebook-cell"><div className="notebook-square"><Grid /><div className="notebook-model">{style==='print'?<PrintedGlyph character={character}/>:data ? <Glyph data={data} through={data.strokes.length - 1} /> : character}</div></div><small>{t("Model")}</small></div>}
      {cell(0, true, t("Trace 1"))}{cell(1, true, t("Trace 2"))}
      {cell(2, false, t("Copy 1"))}{cell(3, false, t("Copy 2"))}{cell(4, false, t("Copy 3"))}
    </div>
    <div className="notebook-pinyin-practice"><h4>Pinyin with tones</h4>{!sheet.hidden&&reading&&<p className="pinyin">{reading}</p>}<p>Write the syllable and its tone mark beside your Hanzi practice.{!reading?' Use the whole-word reading above; no character reading has been guessed.':''}</p><PinyinHandwriting strokes={sheet.cells[`pinyin:${position}`]??EMPTY_STROKES} onChange={strokes=>change(`pinyin:${position}`,strokes)} penOnly={penOnly} disabled={disabled}/><button type="button" className="text-button" disabled={disabled} onClick={()=>change(`pinyin:${position}`,[])}>Clear Pinyin</button></div>
  </section>;
}
export function Grid() {
  return <svg className="notebook-guidelines" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 0V100 M0 50H100 M0 0L100 100 M100 0L0 100" /></svg>;
}

export default function Notebook({ item, db, penOnly, setPenOnly, record, notify, onRecall, next, contextAudioOnly = false }: {
  item: Item; db: IDBDatabase | null; penOnly: boolean; setPenOnly: (value: boolean) => void;
  record: (event: LearningEvent) => Promise<void>; notify: (message: string) => void;
  onRecall: () => void; next: () => void; contextAudioOnly?: boolean;
}) {
  const { t, locale } = useI18n();
  const {style}=useHanziStyle();
  const [sheet, setSheet] = useState<Sheet>(emptySheet);
  const [ready, setReady] = useState(false);
  const [languageOpen,setLanguageOpen]=useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const started = useRef(Date.now());
  const key = `notebook:${item.id}`;
  const characters = Array.from(item.hanzi).filter(c => /[\u3400-\u9fff]/.test(c));
  useEffect(() => {
    let alive = true;
    if (!db) return;
    readDraft<Sheet>(db, key).then(draft => {
      if (alive) { if (draft) setSheet(draft); setReady(true); }
    }).catch(() => { if (alive) { setReady(true); notify(t("Could not restore this worksheet. You can start a new one.")); } });
    return () => { alive = false; };
  }, [db, key, notify]);
  useEffect(() => {
    if (db && ready && !saved) saveDraft(db, key, sheet).catch(() => notify(t("Could not save the worksheet on this device.")));
  }, [db, key, ready, saved, sheet, notify]);
  function change(cell: string, strokes: Stroke[]) { setSheet(old => ({ ...old, cells: { ...old.cells, [cell]: strokes } })); }
  const readings=authoredCharacterReadings(item.hanzi,item.pinyin);
  const complete = characters.every((_, i) => [2, 3, 4].some(slot => sheet.cells[`${i}:${slot}`]?.length));
  async function save() {
    if (!complete || saving || saved) return;
    setSaving(true);
    try {
      await record({ id: sheet.attemptId, itemId: item.id, skill: "writing", mode: "copy", rating: 0, assisted: true,
        at: Date.now(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        detail: { input: penOnly ? "notebook-pen" : "notebook-mixed", duration: Date.now() - started.current } });
      setSaved(true);
      if (db) await saveDraft(db, key, undefined);
      notify(t("Notebook practice saved. Try Recall for an independent memory review."));
    } catch { notify(t("Could not save practice. Keep this worksheet open and try again.")); }
    finally { setSaving(false); }
  }
  return <section className="panel notebook-panel" aria-label={t("Writing notebook")}>
    <div className="notebook-header"><div><span className="eyebrow">{t("YOUR PRACTICE NOTEBOOK")}</span><h2>{item.english}</h2><p className="pinyin">{sheet.hidden?'Pinyin hidden · write before comparing':item.pinyin}</p></div>
      <label className="pencil-toggle"><input type="checkbox" checked={penOnly} onChange={e => setPenOnly(e.target.checked)} /> {t("Pencil only")}</label>
    </div>
    <WritingHelp/><div className="notebook-actions">
      <button className="secondary" onClick={() => setSheet(s => ({ ...s, hidden: !s.hidden }))}>{sheet.hidden ? t("Show guides & compare") : t("Hide guides")}</button>
      {!contextAudioOnly && <button className="audio-button" onClick={() => speak(item.hanzi, notify, item)}><Volume2 size={17} /> {t("Hear word")}</button>}
      <button className="text-button" onClick={() => speak(item.sentence, notify, item)}><Volume2 size={16} /> {t("Hear example")}</button>
    </div>
    <p className="notebook-intro">{t("Follow the steps, trace twice, then write in the empty boxes. Your worksheet stays on this device; saved practice syncs with your account.")}</p>
    {!ready ? <p role="status">{t("Loading your worksheet…")}</p> : <>
      {characters.map((character, position) => <CharacterRow key={`${position}:${character}`} {...{ character, position, sheet, change, penOnly, notify }} reading={readings?.[position]?.pinyin} disabled={saved} />)}
      <section className="notebook-character"><h3>{t("Write the whole word")}</h3>{sheet.hidden?<p>{t("Write the characters together from memory.")}</p>:<NotebookWordModel text={item.hanzi}/>}
        <div className="notebook-cells notebook-whole-word">{characters.map((_, i) => <div className="notebook-cell" key={i}>
          <div className="notebook-square"><Grid /><Ink quietTouch lineStyle={style==='print'?'pen':'brush'} strokes={sheet.cells[`word:${i}`] ?? EMPTY_STROKES} onChange={s => change(`word:${i}`, s)} penOnly={penOnly} disabled={saved} /></div>
          <div className="notebook-cell-tools"><small>{t("Character {0}", [i + 1])}</small><button aria-label={t("Clear whole word character {0}", [i + 1])} disabled={saved || !sheet.cells[`word:${i}`]?.length} onClick={() => change(`word:${i}`, [])}><RotateCcw size={14} /></button></div>
        </div>)}</div>
      </section>
    </>}
    <details onToggle={event=>setLanguageOpen(event.currentTarget.open)}><summary>Practise Pinyin and Chinese keyboard input</summary>{languageOpen&&<LanguagePracticeSet item={item} db={db} record={record} penOnly={penOnly} setPenOnly={setPenOnly} notify={notify} supported/>}</details>
    <div className="notebook-footer"><p>{t("Notebook work counts as assisted practice, even with guides hidden. Use Recall for a separate memory review. Free writing is self-assessed.")}</p>
      {!saved ? <button className="primary" disabled={!ready || !complete || saving} onClick={() => void save()}>{saving ? t("Saving…") : t("Save notebook practice")}<Check size={16} /></button> : <button className="primary" onClick={next}>{t("Saved · next word")}<ChevronRight size={16} /></button>}
      <button className="secondary" onClick={onRecall}>{t("Try Recall")}<ChevronRight size={16} /></button>
      {!complete && <small>{t("Write in at least one empty copy box for each character to save.")}</small>}
    </div>
  </section>;
}
