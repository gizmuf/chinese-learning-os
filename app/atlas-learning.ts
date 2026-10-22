import { z } from "zod";
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card,
  type Grade,
} from "ts-fsrs";
import { atlasById, type AtlasSkill } from "./atlas-model";
export const atlasEventSchema = z
  .object({
    version: z.literal(1),
    id: z.string().uuid(),
    targetId: z.string().refine((id) => atlasById.has(id)),
    skill: z.enum(["meaning", "sound", "component", "writing"]),
    mode: z.enum(["explore", "choice", "recall", "copy"]),
    assisted: z.boolean(),
    rating: z.number().int().min(0).max(4),
    at: z.number().int().nonnegative(),
  })
  .superRefine((e, ctx) => {
    if (
      (e.mode === "explore" || e.mode === "copy") &&
      (!e.assisted || e.rating !== 0)
    )
      ctx.addIssue({
        code: "custom",
        message: "Guided activity cannot advance recall",
      });
    if ((e.mode === "copy" || e.mode === "recall") && e.skill !== "writing")
      ctx.addIssue({ code: "custom", message: "Writing skill mismatch" });
    if (
      e.mode === "choice" &&
      (e.skill === "writing" || ![1, 3].includes(e.rating))
    )
      ctx.addIssue({ code: "custom", message: "Choice grade mismatch" });
    if (e.mode === "recall" && e.rating === 0)
      ctx.addIssue({ code: "custom", message: "Recall requires a rating" });
  });
export type AtlasEvent = z.infer<typeof atlasEventSchema>;
export type StoredAtlasEvent = AtlasEvent & { synced: boolean };
const scheduler = fsrs(
  generatorParameters({ request_retention: 0.9, enable_fuzz: false }),
);
export function atlasCards(events: AtlasEvent[]) {
  const cards: Record<string, Card> = {};
  const seen = new Set<string>();
  for (const e of [...events].sort(
    (a, b) => a.at - b.at || a.id.localeCompare(b.id),
  )) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    if (
      e.assisted ||
      e.rating === 0 ||
      e.mode === "explore" ||
      e.mode === "copy"
    )
      continue;
    const key = e.targetId + ":" + e.skill;
    cards[key] = scheduler.next(
      cards[key] ?? createEmptyCard(new Date(e.at)),
      new Date(e.at),
      e.rating as Grade,
    ).card;
  }
  return cards;
}
export function atlasDue(events: AtlasEvent[], now = Date.now()) {
  return Object.entries(atlasCards(events))
    .filter(([, card]) => new Date(card.due).getTime() <= now)
    .map(([key]) => ({
      targetId: key.split(":")[0],
      skill: key.split(":")[1] as AtlasSkill,
    }));
}
export function newAtlasEvent(
  targetId: string,
  skill: AtlasSkill,
  mode: AtlasEvent["mode"],
  rating: number,
  assisted: boolean,
): AtlasEvent {
  return atlasEventSchema.parse({
    version: 1,
    id: crypto.randomUUID(),
    targetId,
    skill,
    mode,
    rating,
    assisted,
    at: Date.now(),
  });
}
