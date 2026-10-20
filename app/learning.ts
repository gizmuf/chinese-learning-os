import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card,
  type Grade,
} from "ts-fsrs";
import { items, type Skill, type Mode } from "./content";
export type Point = { x: number; y: number; p: number; t: number };
export type Stroke = Point[];
// Keep long Pencil attempts small enough for reliable offline synchronization.
// Preserve each stroke's endpoints and normalized geometry, never a screenshot.
export function compactStrokes(word: Stroke[][]): Stroke[][] {
  const count = word.reduce((total, character) => total + character.length, 0);
  const limit = Math.max(2, Math.floor(4096 / Math.max(1, count)));
  return word.map((character) =>
    character.map((stroke) => {
      const size = Math.min(stroke.length, limit);
      return Array.from({ length: size }, (_, index) => {
        const point =
          stroke[
            size <= 1
              ? 0
              : Math.round((index * (stroke.length - 1)) / (size - 1))
          ];
        return {
          x: +point.x.toFixed(5),
          y: +point.y.toFixed(5),
          p: +point.p.toFixed(3),
          t: +point.t.toFixed(1),
        };
      });
    }),
  );
}
export type LearningEvent = {
  id: string;
  itemId: string;
  skill: Skill;
  mode: Mode;
  rating: 0 | 1 | 2 | 3 | 4;
  assisted: boolean;
  at: number;
  timezone: string;
  detail: {
    strokes?: Stroke[][];
    hints?: number;
    mistakes?: number;
    duration?: number;
    input?: string;
  };
};
export const scheduler = fsrs(
  generatorParameters({ request_retention: 0.9, enable_fuzz: false }),
);
export function isReview(e: LearningEvent) {
  return (
    e.rating > 0 &&
    !e.assisted &&
    (e.skill !== "writing" || e.mode === "recall")
  );
}
export function getCards(events: LearningEvent[]) {
  const cards: Record<string, Card> = {};
  const seen = new Set<string>();
  for (const e of [...events].sort(
    (a, b) => a.at - b.at || a.id.localeCompare(b.id),
  )) {
    if (seen.has(e.id) || !isReview(e)) continue;
    seen.add(e.id);
    const key = e.itemId + ":" + e.skill;
    cards[key] = scheduler.next(
      cards[key] ?? createEmptyCard(new Date(e.at)),
      new Date(e.at),
      e.rating as Grade,
    ).card;
  }
  return cards;
}
export function makeQueue(events: LearningEvent[], skill: Skill) {
  const cards = getCards(events);
  const now = Date.now();
  const due = items
    .filter(
      (i) =>
        cards[i.id + ":" + skill] &&
        new Date(cards[i.id + ":" + skill].due).getTime() <= now,
    )
    .sort(
      (a, b) =>
        new Date(cards[a.id + ":" + skill].due).getTime() -
        new Date(cards[b.id + ":" + skill].due).getTime(),
    );
  return [...due, ...items.filter((i) => !cards[i.id + ":" + skill])];
}
