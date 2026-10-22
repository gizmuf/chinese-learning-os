"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, RotateCcw, Undo2, Volume2 } from "lucide-react";
import type { Item } from "./content";
import type { LearningEvent, Stroke } from "./learning";
import { readDraft, saveDraft } from "./local-store";
import { speak } from "./audio";
import Ink from "./ink";
import { assetPath } from "./asset-path";

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

function CharacterRow({ character, position, sheet, change, penOnly, disabled }: {
  character: string; position: number; sheet: Sheet;
  change: (key: string, strokes: Stroke[]) => void; penOnly: boolean; disabled: boolean;
}) {
  const [data, setData] = useState<CharacterData | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setFailed(false); setStep(0);
    fetch(assetPath(`/characters/${encodeURIComponent(character)}.json`), { signal: controller.signal })
      .then(r => { if (!r.ok) throw Error("Missing character"); return r.json() as Promise<CharacterData>; })
      .then(value => setData(value))
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [character, retry]);
  function cell(slot: number, trace: boolean, label: string) {
    const key = `${position}:${slot}`;
    const strokes = sheet.cells[key] ?? [];
    return <div className="notebook-cell" key={slot}>
      <div className="notebook-square">
        <Grid />
        {trace && !sheet.hidden && data && <div className="notebook-ghost"><Glyph data={data} through={data.strokes.length - 1} /></div>}
        <Ink strokes={strokes} onChange={s => change(key, s)} penOnly={penOnly} disabled={disabled} />
      </div>
      <div className="notebook-cell-tools"><small>{label}</small>
        <button aria-label={`Undo ${character} ${label}`} disabled={disabled || !strokes.length} onClick={() => change(key, strokes.slice(0, -1))}><Undo2 size={14} /></button>
        <button aria-label={`Clear ${character} ${label}`} disabled={disabled || !strokes.length} onClick={() => change(key, [])}><RotateCcw size={14} /></button>
      </div>
    </div>;
  }
  return <section className="notebook-character" aria-label={`Character ${position + 1} practice`}>
    <h3>{sheet.hidden ? `Character ${position + 1}` : character}</h3>
    {!sheet.hidden && <>
      {data ? <>
        <div className="notebook-steps" aria-label={`Stroke order for ${character}`}>
          {data.strokes.map((_, i) => <button key={i} aria-label={`${character} stroke ${i + 1}`} aria-pressed={step === i}
            className={step === i ? "selected" : ""} onClick={() => setStep(i)}>
            <Glyph data={data} through={i} active={i} /><small>{i + 1}</small>
          </button>)}
        </div>
        <div className="notebook-step-detail">
          <div className="notebook-step-glyph"><Glyph data={data} through={step} active={step} direction /></div>
          <div><strong>Stroke {step + 1} of {data.strokes.length}</strong><p>Start at the white dot and follow the highlighted stroke.</p>
            <button className="text-button" aria-label={`Previous stroke for ${character}`} disabled={step === 0} onClick={() => setStep(s => s - 1)}><ChevronLeft size={16} /> Previous</button>
            <button className="text-button" aria-label={`Next stroke for ${character}`} disabled={step === data.strokes.length - 1} onClick={() => setStep(s => s + 1)}>Next <ChevronRight size={16} /></button>
          </div>
        </div>
      </> : <p role="status">{failed ? <>Stroke guide unavailable. <button className="text-button" onClick={() => setRetry(r => r + 1)}>Retry</button> You can still write below.</> : "Loading stroke guide…"}</p>}
    </>}
    <div className="notebook-cells">
      {!sheet.hidden && <div className="notebook-cell"><div className="notebook-square"><Grid /><div className="notebook-model">{data ? <Glyph data={data} through={data.strokes.length - 1} /> : character}</div></div><small>Model</small></div>}
      {cell(0, true, "Trace 1")}{cell(1, true, "Trace 2")}
      {cell(2, false, "Copy 1")}{cell(3, false, "Copy 2")}{cell(4, false, "Copy 3")}
    </div>
  </section>;
}
function Grid() {
  return <svg className="notebook-guidelines" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 0V100 M0 50H100 M0 0L100 100 M100 0L0 100" /></svg>;
}

export default function Notebook({ item, db, penOnly, setPenOnly, record, notify, onRecall, next }: {
  item: Item; db: IDBDatabase | null; penOnly: boolean; setPenOnly: (value: boolean) => void;
  record: (event: LearningEvent) => Promise<void>; notify: (message: string) => void;
  onRecall: () => void; next: () => void;
}) {
  const [sheet, setSheet] = useState<Sheet>(emptySheet);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const started = useRef(Date.now());
  const key = `notebook:${item.id}`;
  const characters = Array.from(item.hanzi);
  useEffect(() => {
    let alive = true;
    if (!db) return;
    readDraft<Sheet>(db, key).then(draft => {
      if (alive) { if (draft) setSheet(draft); setReady(true); }
    }).catch(() => { if (alive) { setReady(true); notify("Could not restore this worksheet. You can start a new one."); } });
    return () => { alive = false; };
  }, [db, key, notify]);
  useEffect(() => {
    if (db && ready && !saved) saveDraft(db, key, sheet).catch(() => notify("Could not save the worksheet on this device."));
  }, [db, key, ready, saved, sheet, notify]);
  function change(cell: string, strokes: Stroke[]) { setSheet(old => ({ ...old, cells: { ...old.cells, [cell]: strokes } })); }
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
      notify("Notebook practice saved. Try Recall for an independent memory review.");
    } catch { notify("Could not save practice. Keep this worksheet open and try again."); }
    finally { setSaving(false); }
  }
  return <section className="panel notebook-panel" aria-label="Writing notebook">
    <div className="notebook-header"><div><span className="eyebrow">YOUR PRACTICE NOTEBOOK</span><h2>{item.english}</h2><p className="pinyin">{item.pinyin}</p></div>
      <label className="pencil-toggle"><input type="checkbox" checked={penOnly} onChange={e => setPenOnly(e.target.checked)} /> Pencil only</label>
    </div>
    <div className="notebook-actions">
      <button className="secondary" onClick={() => setSheet(s => ({ ...s, hidden: !s.hidden }))}>{sheet.hidden ? "Show guides & compare" : "Hide guides"}</button>
      <button className="audio-button" onClick={() => speak(item.hanzi, notify, item)}><Volume2 size={17} /> Hear word</button>
      <button className="text-button" onClick={() => speak(item.sentence, notify, item)}><Volume2 size={16} /> Hear example</button>
    </div>
    <p className="notebook-intro">Follow the steps, trace twice, then write in the empty boxes. Your worksheet stays on this device. Completed practice is saved in your notebook.</p>
    {!ready ? <p role="status">Loading your worksheet…</p> : <>
      {characters.map((character, position) => <CharacterRow key={`${position}:${character}`} {...{ character, position, sheet, change, penOnly }} disabled={saved} />)}
      <section className="notebook-character"><h3>Write the whole word</h3><p>{sheet.hidden ? "Write the characters together from memory." : item.hanzi}</p>
        <div className="notebook-cells notebook-whole-word">{characters.map((_, i) => <div className="notebook-cell" key={i}>
          <div className="notebook-square"><Grid /><Ink strokes={sheet.cells[`word:${i}`] ?? []} onChange={s => change(`word:${i}`, s)} penOnly={penOnly} disabled={saved} /></div>
          <div className="notebook-cell-tools"><small>Character {i + 1}</small><button aria-label={`Clear whole word character ${i + 1}`} disabled={saved || !sheet.cells[`word:${i}`]?.length} onClick={() => change(`word:${i}`, [])}><RotateCcw size={14} /></button></div>
        </div>)}</div>
      </section>
    </>}
    <div className="notebook-footer"><p>Notebook work counts as assisted practice, even with guides hidden. Use Recall for a separate memory review. Free writing is self-assessed.</p>
      {!saved ? <button className="primary" disabled={!ready || !complete || saving} onClick={() => void save()}>{saving ? "Saving…" : "Save notebook practice"}<Check size={16} /></button> : <button className="primary" onClick={next}>Saved · next word <ChevronRight size={16} /></button>}
      <button className="secondary" onClick={onRecall}>Try Recall <ChevronRight size={16} /></button>
      {!complete && <small>Write in at least one empty copy box for each character to save.</small>}
    </div>
  </section>;
}
