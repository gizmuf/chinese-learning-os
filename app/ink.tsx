"use client";
import { useI18n } from "./i18n";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Point, Stroke } from "./learning";
import {acceptWritingPointer} from "./writing-pointer";
import { paintInk, writingPenWidth } from "./ink-render";
export default function Ink({ strokes, onChange, penOnly, disabled = false,quietTouch=false,lineStyle='brush' }: {
  strokes: Stroke[]; onChange: (s: Stroke[]) => void; penOnly: boolean; disabled?: boolean;quietTouch?:boolean;lineStyle?:'pen'|'brush';
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLCanvasElement>(null);
  const cache = useRef<HTMLCanvasElement | null>(null);
  const active = useRef<{ id: number; type: string; points: Stroke; rect: DOMRect; captured: boolean } | null>(null);
  const current = useRef(strokes);
  // React may echo an earlier commit after a newer physical stroke has begun.
  const emitted = useRef(new WeakSet<Stroke[]>());
  const penSeen=useRef(false);
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const frame = useRef(0);
  const needsRefresh = useRef(true);
  const shownPoints = useRef(0);
  const fallback = useRef<{move:(e:PointerEvent)=>void;finish:(e:PointerEvent)=>void;cancel:(e:PointerEvent)=>void;flush:()=>void}>({move:()=>{},finish:()=>{},cancel:()=>{},flush:()=>{}});
  const [touchNotice, setTouchNotice] = useState(false);
  const draw = useCallback(() => {
    frame.current = 0;
    const canvas = ref.current, saved = cache.current;
    if (!canvas || !saved) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h, dpr } = size.current;
    if (needsRefresh.current || lineStyle === "brush") {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(saved, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      needsRefresh.current = false;
      shownPoints.current = 0;
    }
    const stroke = active.current?.points;
    if (!stroke) return;
    if (lineStyle === "brush") {
      paintInk(ctx, stroke, w, h, false, lineStyle);
      return;
    }
    // The fixed-width pen only paints the new samples in each frame. Commit
    // replaces this preview with the usual smoothed outline.
    const from = shownPoints.current;
    if (from >= stroke.length) return;
    const width = writingPenWidth(w, h);
    if (from === 0) {
      ctx.beginPath();
      ctx.arc(stroke[0].x * w, stroke[0].y * h, width / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#254d42";
      ctx.fill();
    }
    const first = stroke[Math.max(0, from - 1)];
    ctx.beginPath();
    ctx.moveTo(first.x * w, first.y * h);
    for (let i = Math.max(1, from); i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x * w, stroke[i].y * h);
    }
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#254d42";
    ctx.stroke();
    shownPoints.current = stroke.length;
  }, [lineStyle]);
  const schedule = useCallback(() => { if (!frame.current) frame.current = requestAnimationFrame(draw); }, [draw]);
  const refresh = useCallback(() => { needsRefresh.current = true; schedule(); }, [schedule]);
  const rebuild = useCallback((force = false) => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const old = size.current;
    if (!force && old.w === rect.width && old.h === rect.height && old.dpr === dpr) return;
    const width = Math.round(rect.width * dpr), height = Math.round(rect.height * dpr);
    const saved = cache.current ?? (cache.current = document.createElement("canvas"));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    saved.width = width; saved.height = height;
    size.current = { w: rect.width, h: rect.height, dpr };
    const ctx = saved.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const stroke of current.current) paintInk(ctx, stroke, rect.width, rect.height, true, lineStyle);
    refresh();
  }, [refresh, lineStyle]);
  useLayoutEffect(() => { rebuild(true); }, [rebuild]);
  // Clear, undo and restore replace the saved strokes. The local bitmap
  // already contains every committed stroke, including newer local commits.
  useLayoutEffect(() => {
    if (current.current === strokes || emitted.current.has(strokes)) return;
    current.current = strokes;
    active.current = null;
    rebuild(true);
  }, [strokes, rebuild]);
  useLayoutEffect(() => {
    const resize = () => rebuild();
    const obs = new ResizeObserver(resize);
    obs.observe(ref.current!);
    window.addEventListener("resize", resize);
    // Capture is best-effort. A contact ending outside the canvas must still
    // commit once if Safari could not capture it.
    const down=(e:PointerEvent)=>{
      const stroke=active.current;
      // A fresh physical contact in another box owns this pointer ID now.
      // Flush the abandoned stroke before the other box starts, never on palm input.
      if(e.target!==ref.current&&stroke&&((e.pointerType==='pen'&&stroke.type==='pen')||(e.pointerId===stroke.id&&e.pointerType===stroke.type)))fallback.current.flush();
    };
    const move=(e:PointerEvent)=>{if(e.target!==ref.current)fallback.current.move(e);};
    const finish=(e:PointerEvent)=>fallback.current.finish(e);
    const cancel=(e:PointerEvent)=>fallback.current.cancel(e);
    window.addEventListener('pointerdown',down,true);
    window.addEventListener('pointermove',move,{passive:false});
    window.addEventListener('pointerup',finish);
    window.addEventListener('pointercancel',cancel);
    return () => { obs.disconnect(); window.removeEventListener("resize", resize); window.removeEventListener('pointerdown',down,true); window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',finish); window.removeEventListener('pointercancel',cancel); cancelAnimationFrame(frame.current); frame.current=0; active.current = null; };
  }, [rebuild]);
  useLayoutEffect(() => { active.current = null; penSeen.current = false; refresh(); }, [disabled, penOnly, refresh]);
  function point(e: PointerEvent | React.PointerEvent, rect: DOMRect): Point {
    return { x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)), y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)), p: e.pointerType === "pen" ? Math.max(0, Math.min(1, e.pressure)) : .5, t: e.timeStamp };
  }
  function commit() {
    const stroke = active.current;
    if (!stroke) return;
    active.current = null;
    const next = [...current.current, stroke.points];
    emitted.current.add(next);
    current.current = next;
    const { w, h } = size.current;
    const ctx = cache.current?.getContext("2d");
    if (ctx) paintInk(ctx, stroke.points, w, h, true, lineStyle);
    refresh();
    onChange(next);
  }
  function cancel(e: PointerEvent | React.PointerEvent<HTMLCanvasElement>) {
    if (active.current?.id !== e.pointerId) return;
    // Keep collected ink when Safari cancels/revokes capture. Its cancellation
    // coordinates may be zeroed and must never add a line to the origin.
    commit();
  }
  function finish(e: PointerEvent | React.PointerEvent<HTMLCanvasElement>) {
    const stroke = active.current;
    if (!stroke || stroke.id !== e.pointerId) return;
    if (stroke.points.length < 1500) {
      const end = point(e, stroke.rect), last = stroke.points.at(-1)!;
      // Pointer-up commonly reports zero pressure: retain the last contact pressure.
      if (end.x !== last.x || end.y !== last.y) stroke.points.push({ ...end, p: last.p });
    }
    commit();
    if (ref.current?.hasPointerCapture(e.pointerId)) ref.current.releasePointerCapture(e.pointerId);
  }
  function move(e: PointerEvent | React.PointerEvent<HTMLCanvasElement>) {
    const stroke = active.current;
    if (!stroke || stroke.id !== e.pointerId) return;
    e.preventDefault();
    const native = 'nativeEvent' in e ? e.nativeEvent : e;
    const coalesced = native.getCoalescedEvents?.();
    for (const p of coalesced?.length ? coalesced : [native]) {
      if (stroke.points.length < 1500) stroke.points.push(point(p, stroke.rect));
    }
    schedule();
  }
  useLayoutEffect(()=>{fallback.current={move,finish,cancel,flush:commit};});
  return <>
    <canvas aria-label={t("Write a character here using a pencil, finger or mouse")} ref={ref} className="ink-canvas"
      onContextMenu={e=>e.preventDefault()}
      onPointerDown={e => {
        if (disabled) return;
        // A new physical pen contact recovers a missing up, rather than
        // consuming the next stroke and making the learner draw it twice.
        if(e.pointerType==='pen'&&active.current?.type==='pen')commit();
        if (current.current.length >= 50) return;
        if(!acceptWritingPointer(e,penOnly,penSeen.current,active.current)){if(penOnly&&e.pointerType!=="pen"){if(quietTouch)e.preventDefault();else setTouchNotice(true);}return;}
        if(e.pointerType==="pen")penSeen.current=true;
        if(active.current){const id=active.current.id;active.current=null;if(e.currentTarget.hasPointerCapture(id))e.currentTarget.releasePointerCapture(id);refresh();}
        const rect = e.currentTarget.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        setTouchNotice(false); e.preventDefault();
        // Safari can reject capture when a contact is interrupted. Do not lose
        // the entire new stroke just because capture was unavailable.
        let captured=false;
        try { e.currentTarget.setPointerCapture(e.pointerId); captured=true; } catch { /* local events remain usable */ }
        active.current = { id: e.pointerId, type:e.pointerType, points: [point(e, rect)], rect, captured }; schedule();
      }}
      onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={e=>{if(active.current?.captured&&!e.currentTarget.hasPointerCapture(e.pointerId))cancel(e);}}/>
    {touchNotice && !quietTouch && <span className="canvas-notice">{t("Pencil only is on. Turn it off for finger or mouse input.")}</span>}
  </>;
}
