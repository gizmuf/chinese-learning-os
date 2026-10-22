"use client";
import { useI18n } from "./i18n";
import { useEffect, useRef, useState } from "react";
import type { Point, Stroke } from "./learning";
export default function Ink({
  strokes,
  onChange,
  penOnly,
  disabled = false,
}: {
  strokes: Stroke[];
  onChange: (s: Stroke[]) => void;
  penOnly: boolean;
  disabled?: boolean;
}) {
  const { t, locale } = useI18n();
  const ref = useRef<HTMLCanvasElement>(null);
  const active = useRef<{ id: number; points: Stroke } | null>(null);
  const current = useRef(strokes);
  const [touchNotice, setTouchNotice] = useState(false);
  function draw() {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#254d42";
    for (const s of [
      ...current.current,
      ...(active.current ? [active.current.points] : []),
    ]) {
      if (!s.length) continue;
      ctx.beginPath();
      ctx.moveTo(s[0].x * r.width, s[0].y * r.height);
      if (s.length === 1) {
        ctx.lineWidth = 4;
        ctx.lineTo(s[0].x * r.width + 0.1, s[0].y * r.height + 0.1);
        ctx.stroke();
      }
      for (let i = 1; i < s.length; i++) {
        ctx.beginPath();
        ctx.moveTo(s[i - 1].x * r.width, s[i - 1].y * r.height);
        ctx.lineWidth = 3 + 3 * (s[i].p || 0.5);
        ctx.lineTo(s[i].x * r.width, s[i].y * r.height);
        ctx.stroke();
      }
    }
  }
  useEffect(() => {
    current.current = strokes;
    draw();
  }, [strokes]);
  useEffect(() => {
    const c = ref.current!;
    const obs = new ResizeObserver(draw);
    obs.observe(c);
    return () => obs.disconnect();
  }, []);
  function point(e: PointerEvent | React.PointerEvent): Point {
    const r = ref.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
      p: e.pressure || 0.5,
      t: e.timeStamp,
    };
  }
  function finish(e: React.PointerEvent) {
    if (active.current?.id !== e.pointerId) return;
    const s = active.current.points;
    active.current = null;
    const next = [...current.current, s];
    current.current = next;
    onChange(next);
    draw();
  }
  return (
    <>
      <canvas
        aria-label={t("Write a character here using a pencil, finger or mouse")}
        ref={ref}
        className="ink-canvas"
        onPointerDown={(e) => {
          if (disabled || active.current || strokes.length >= 50) return;
          if (penOnly && e.pointerType !== "pen") {
            setTouchNotice(true);
            return;
          }
          setTouchNotice(false);
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          active.current = { id: e.pointerId, points: [point(e)] };
          draw();
        }}
        onPointerMove={(e) => {
          if (active.current?.id !== e.pointerId) return;
          const batch = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
          for (const p of batch)
            if (active.current.points.length < 1500)
              active.current.points.push(point(p));
          draw();
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
      />
      {touchNotice && (
        <span className="canvas-notice">
          {t("Pencil only is on. Turn it off for finger or mouse input.")}</span>
      )}
    </>
  );
}
