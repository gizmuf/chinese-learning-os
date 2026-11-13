import type {Item, Skill, Mode} from "./content";
import type {LearningEvent} from "./learning";
export function newEvent(
  item: Item,
  skill: Skill,
  mode: Mode,
  rating: LearningEvent["rating"],
  assisted: boolean,
  detail: LearningEvent["detail"] = {},
): LearningEvent {
  return {
    id: crypto.randomUUID(),
    itemId: item.id,
    skill,
    mode,
    rating,
    assisted,
    at: Date.now(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    detail,
  };
}
