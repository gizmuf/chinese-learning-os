import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card,
  type Grade,
} from "ts-fsrs";
import { z } from "zod";
import { labActivityIds, labExtraTerms } from "./course-lab-data";
import { exercises } from "./course-exercises";
import { terms, sentences, topicInfo, course } from "./course-data";
export const activityIds = [
  ...exercises.map((e) => e.id),
  ...labActivityIds,
  ...labExtraTerms.map(t=>"write:"+t.id),
  ...Object.keys(topicInfo).map((t) => "study:" + t),
  ...terms.map((t) => "write:" + t.id),
  ...sentences.map((s) => "write:" + s.id),
];
export const courseEventSchema = z
  .object({
    id: z.string().uuid(),
    lessonId: z.literal("intensive-03"),
    activityId: z.string().refine((id) => activityIds.includes(id)),
    kind: z.enum(["answer", "study", "writing"]),
    correct: z.boolean().nullable(),
    assisted: z.boolean(),
    at: z.number().int().nonnegative(),
    rating: z.number().int().min(0).max(4).optional(),
  })
  .superRefine((event, ctx) => {
    if(event.activityId.startsWith("lab-family-")&&!event.assisted) ctx.addIssue({code:"custom",message:"Visible family examples require assisted practice"});
    const expected = event.activityId.startsWith("study:")
      ? "study"
      : event.activityId.startsWith("write:")
        ? "writing"
        : "answer";
    if (
      event.kind !== expected ||
      (event.kind === "study" ? event.correct !== null : event.correct === null)
    )
      ctx.addIssue({ code: "custom", message: "Activity kind mismatch" });
  });
export type CourseEvent = z.infer<typeof courseEventSchema>;
export type StoredCourseEvent = CourseEvent & { synced: boolean };
const scheduler = fsrs(
  generatorParameters({ request_retention: 0.9, enable_fuzz: false }),
);
export function courseCards(events: CourseEvent[]) {
  const cards: Record<string, Card> = {};
  const seen = new Set<string>();
  for (const e of [...events].sort(
    (a, b) => a.at - b.at || a.id.localeCompare(b.id),
  )) {
    if (seen.has(e.id) || e.assisted || e.kind === "study") continue;
    seen.add(e.id);
    const grade =
      e.kind === "writing"
        ? (e.rating ?? (e.correct ? 3 : 1))
        : e.correct
          ? 3
          : 1;
    if (grade < 1) continue;
    cards[e.activityId] = scheduler.next(
      cards[e.activityId] ?? createEmptyCard(new Date(e.at)),
      new Date(e.at),
      grade as Grade,
    ).card;
  }
  return cards;
}
export function courseSummary(events: CourseEvent[], now = Date.now()) {
  const answers = events.filter((e) => e.kind === "answer" && exercises.some(activity=>activity.id===e.activityId));
  const independent = answers.filter((e) => !e.assisted);
  const cards = courseCards(events);
  const attempted = new Set(answers.map((e) => e.activityId));
  return {
    attempted: attempted.size,
    total: exercises.length,
    practiced: exercises.every((e) => attempted.has(e.id)),
    independent: independent.length,
    correct: independent.filter((e) => e.correct).length,
    due: Object.entries(cards)
      .filter(([, c]) => new Date(c.due).getTime() <= now)
      .map(([id]) => id),
  };
}
export function newCourseEvent(
  activityId: string,
  kind: CourseEvent["kind"],
  correct: boolean | null,
  assisted: boolean,
  rating?: number,
): CourseEvent {
  return {
    id: crypto.randomUUID(),
    lessonId: "intensive-03",
    activityId,
    kind,
    correct,
    assisted,
    at: Date.now(),
    ...(rating === undefined ? {} : { rating }),
  };
}
