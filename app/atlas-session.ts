import { questionFor, type AtlasSkill } from "./atlas-model";
import type { Locale } from "./translate";
export function emptyAnswer() {
  return {
    picked: "",
    result: null as boolean | null,
    hint: false,
    played: false,
    retry: false,
    credited: false,
    independent: false,
  };
}
export function sessionTotals(answers: ReturnType<typeof emptyAnswer>[]) {
  return {
    score: answers.filter((a) => a.credited).length,
    independent: answers.filter((a) => a.independent).length,
    answered: answers.filter((a) => a.result !== null).length,
  };
}
export function swipeStep(x: number, y: number, endX: number, endY: number) {
  const dx = endX - x,
    dy = endY - y;
  return Math.abs(dx) >= 70 && Math.abs(dx) > Math.abs(dy) * 1.5
    ? dx < 0
      ? 1
      : -1
    : 0;
}
export function seededQuestion(
  targetId: string,
  skill: Exclude<AtlasSkill, "writing">,
  locale: Locale,
  index: number,
) {
  let seed = Array.from(targetId + skill + index).reduce(
    (a, c) => (a * 31 + c.charCodeAt(0)) >>> 0,
    17,
  );
  return questionFor(targetId, skill, locale, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
}
