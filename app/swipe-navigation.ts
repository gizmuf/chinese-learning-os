export function swipeStep(x: number, y: number, endX: number, endY: number) {
  const dx = endX - x,
    dy = endY - y;
  return Math.abs(dx) >= 70 && Math.abs(dx) > Math.abs(dy) * 1.5
    ? dx < 0
      ? 1
      : -1
    : 0;
}
type Point = { id: number; x: number; y: number };
export function createSwipeGesture() {
  let start: Point | null = null,
    suppress = false;
  return {
    begin(point: Point & { type: string; primary: boolean; blocked: boolean }) {
      suppress = false;
      start =
        point.type === "touch" && point.primary && !point.blocked
          ? point
          : null;
    },
    move(point: Point) {
      return (
        !!start &&
        point.id === start.id &&
        swipeStep(start.x, start.y, point.x, point.y) !== 0
      );
    },
    end(point: Point, disabled = false) {
      const first = start;
      start = null;
      if (!first || disabled || point.id !== first.id) return 0;
      const delta = swipeStep(first.x, first.y, point.x, point.y);
      suppress = delta !== 0;
      return delta;
    },
    cancel() {
      start = null;
    },
    consumeClick() {
      const result = suppress;
      suppress = false;
      return result;
    },
  };
}
