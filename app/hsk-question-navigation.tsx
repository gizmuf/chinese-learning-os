'use client';

import { useEffect, useRef, type TouchEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const arrowControls = 'input, textarea, select, audio, canvas, [contenteditable]';
const touchControls = 'button, label, a, ' + arrowControls;

export function useHskQuestionNavigation(move: (step: number) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        (event.target instanceof Element && event.target.closest(arrowControls))) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [move]);

  return {
    onTouchStart(event: TouchEvent) {
      const point = event.touches[0];
      start.current = event.touches.length === 1 && !(event.target as Element).closest(touchControls)
        ? { x: point.clientX, y: point.clientY }
        : null;
    },
    onTouchEnd(event: TouchEvent) {
      const initial = start.current;
      start.current = null;
      if (!initial || event.touches.length || !event.changedTouches.length) return;
      const { clientX, clientY } = event.changedTouches[0];
      const x = clientX - initial.x;
      const y = clientY - initial.y;
      if (Math.abs(x) >= 45 && Math.abs(x) > Math.abs(y) * 1.4) move(x < 0 ? 1 : -1);
    },
    onTouchCancel() { start.current = null; },
  };
}

export function HskQuestionNavigation({position,total,onMove}: {
  position: number; total: number; onMove: (position: number) => void;
}) {
  return <nav className="hsk-question-navigation" aria-label="Question navigation">
    <button className="secondary" type="button" aria-label="Previous question" disabled={position===0}
      onClick={()=>onMove(position-1)}><ChevronLeft size={18} aria-hidden="true"/> <span>Previous</span></button>
    <select aria-label="Jump to question" value={position} onChange={event=>onMove(Number(event.target.value))}>
      {Array.from({length:total},(_,index)=><option key={index} value={index}>{index+1} / {total}</option>)}
    </select>
    <button className="secondary" type="button" aria-label="Next question" disabled={position===total-1}
      onClick={()=>onMove(position+1)}><span>Next</span> <ChevronRight size={18} aria-hidden="true"/></button>
  </nav>;
}
