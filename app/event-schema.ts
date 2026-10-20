import { z } from "zod";
import { items } from "./content";
const point = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  p: z.number().min(0).max(1),
  t: z.number().nonnegative(),
});
export const eventSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().refine((id) => items.some((i) => i.id === id)),
  skill: z.enum(["meaning", "writing", "listening"]),
  mode: z.enum(["watch", "trace", "copy", "recall"]),
  rating: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  assisted: z.boolean(),
  at: z.number().int().min(0),
  timezone: z.string().max(100),
  detail: z.object({
    strokes: z
      .array(z.array(z.array(point).max(1500)).max(50))
      .max(10)
      .optional(),
    hints: z.number().int().nonnegative().optional(),
    mistakes: z.number().int().nonnegative().optional(),
    duration: z.number().nonnegative().optional(),
    input: z.string().max(30).optional(),
  }),
});

export const progressSchema = z.object({ events: z.array(eventSchema) });
