"use client";
import { useI18n } from "./i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Point, Stroke } from "./learning";
import { paintInk } from "./ink-render";
export default function Ink({ strokes, onChange, penOnly, disabled = false }: {
  strokes: Stroke[]; onChange: (s: Stroke[]) => void; penOnly: boolean; disabled?: boolean;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLCanvasElement>(null);
  const cache = useRef<HTMLCanvasElement | null>(null);
  const active = useRef<{ id: number; points: Stroke; rect: DOMRect } | null>(null);
  const current = useRef(strokes);
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const frame = useRef(0);
  const [touchNotice, setTouchNotice] = useState(false);
  const draw = useCallback(() => {
    frame.current = 0;
    const canvas = ref.current, saved = cache.current;
    if (!canvas || !saved) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h, dpr } = size.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(saved, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (active.current) paintInk(ctx, active.current.points, w, h, false);
  }, []);
  const schedule = useCallback(() => { if (!frame.current) frame.current = requestAnimationFrame(draw); }, [draw]);
  const rebuild = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const width = Math.round(rect.width * dpr), height = Math.round(rect.height * dpr);
    const saved = cache.current ?? (cache.current = document.createElement("canvas"));
    // Only resize backing stores after layout/scale changes, never per pointer event.
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    saved.width = width; saved.height = height;
    size.current = { w: rect.width, h: rect.height, dpr };
    const ctx = saved.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const stroke of current.current) paintInk(ctx, stroke, rect.width, rect.height);
    schedule();
  }, [schedule]);
  useEffect(() => { current.current = strokes; active.current = null; rebuild(); }, [strokes, rebuild]);
  useEffect(() => {
    const obs = new ResizeObserver(rebuild);
    obs.observe(ref.current!);
    window.addEventListener("resize", rebuild);
    return () => { obs.disconnect(); window.removeEventListener("resize", rebuild); cancelAnimationFrame(frame.current); active.current = null; };
  }, [rebuild]);
  useEffect(() => { active.current = null; schedule(); }, [disabled, penOnly, schedule]);
  function point(e: PointerEvent | React.PointerEvent, rect: DOMRect): Point {
    return { x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)), y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)), p: e.pointerType === "pen" ? Math.max(0, Math.min(1, e.pressure)) : .5, t: e.timeStamp };
  }
  function cancel(e: React.PointerEvent) {
    if (active.current?.id !== e.pointerId) return;
    active.current = null; schedule();
  }
  function finish(e: React.PointerEvent) {
    const stroke = active.current;
    if (!stroke || stroke.id !== e.pointerId) return;
    if (stroke.points.length < 1500) {
      const end = point(e, stroke.rect), last = stroke.points.at(-1)!;
      // Pointer-up commonly reports zero pressure: retain the last contact pressure.
      if (end.x !== last.x || end.y !== last.y) stroke.points.push({ ...end, p: last.p });
    }
    active.current = null;
    const next = [...current.current, stroke.points];
    current.current = next; onChange(next); rebuild();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }
  return <>
    <canvas aria-label={t("Write a character here using a pencil, finger or mouse")} ref={ref} className="ink-canvas"
      onPointerDown={e => {
        if (disabled || active.current || current.current.length >= 50 || (e.pointerType === "mouse" && e.button !== 0)) return;
        if (penOnly && e.pointerType !== "pen") { setTouchNotice(true); return; }
        const rect = e.currentTarget.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        setTouchNotice(false); e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
        active.current = { id: e.pointerId, points: [point(e, rect)], rect }; schedule();
      }}
      onPointerMove={e => {
        const stroke = active.current;
        if (!stroke || stroke.id !== e.pointerId) return;
        const coalesced = e.nativeEvent.getCoalescedEvents?.();
        for (const p of coalesced?.length ? coalesced : [e.nativeEvent]) {
          if (stroke.points.length < 1500) stroke.points.push(point(p, stroke.rect));
        }
        schedule();
      }} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={cancel}/>
    {touchNotice && <span className="canvas-notice">{t("Pencil only is on. Turn it off for finger or mouse input.")}</span>}
  </>;
}
