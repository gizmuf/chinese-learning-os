"use client";
import { useState, type HTMLAttributes } from "react";
import { createSwipeGesture } from "./swipe-navigation";
const ignore =
  'input,textarea,select,canvas,[contenteditable]:not([contenteditable="false"]),[data-swipe-ignore]';
export function useSwipeNavigation(
  onMove: (delta: number) => void,
  disabled = false,
): HTMLAttributes<HTMLElement> {
  const [gesture] = useState(createSwipeGesture);
  return {
    onPointerDown(e) {
      gesture.begin({
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        type: e.pointerType,
        primary: e.isPrimary,
        blocked:
          disabled ||
          (e.target instanceof Element && !!e.target.closest(ignore)),
      });
    },
    onPointerMove(e) {
      if (disabled) {
        gesture.cancel();
        return;
      }
      if (gesture.move({ id: e.pointerId, x: e.clientX, y: e.clientY }))
        e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerCancel() {
      gesture.cancel();
    },
    onPointerUp(e) {
      const delta = gesture.end(
        { id: e.pointerId, x: e.clientX, y: e.clientY },
        disabled,
      );
      if (delta) onMove(delta);
    },
    onClickCapture(e) {
      if (gesture.consumeClick()) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
  };
}
