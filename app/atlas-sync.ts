import { atlasEventSchema, type StoredAtlasEvent } from "./atlas-learning";
export type AtlasSyncIO = {
  read: () => Promise<StoredAtlasEvent[]>;
  put: (events: StoredAtlasEvent[]) => Promise<void>;
  request: (
    method: "GET" | "POST",
    body?: string,
  ) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;
  isCurrent: () => boolean;
};
export async function syncAtlasEvents(
  io: AtlasSyncIO,
): Promise<StoredAtlasEvent[] | undefined> {
  let rows = await io.read();
  if (!io.isCurrent()) return;
  let pending = rows.filter((e) => !e.synced);
  while (pending.length) {
    if (!io.isCurrent()) return;
    const batch = pending.slice(0, 20);
    const r = await io.request("POST", JSON.stringify({ events: batch }));
    if (!io.isCurrent()) return;
    if (!r.ok) throw Error("sync");
    const response = (await r.json()) as { accepted?: unknown };
    if (!io.isCurrent()) return;
    const accepted = response.accepted;
    if (!Array.isArray(accepted) || batch.some((e) => !accepted.includes(e.id)))
      throw Error("Unconfirmed upload");
    await io.put(batch.map((e) => ({ ...e, synced: true })));
    if (!io.isCurrent()) return;
    rows = await io.read();
    if (!io.isCurrent()) return;
    pending = rows.filter((e) => !e.synced);
  }
  const response = await io.request("GET");
  if (!io.isCurrent()) return;
  if (!response.ok) throw Error("sync");
  const payload = (await response.json()) as { events?: unknown };
  if (!io.isCurrent()) return;
  if (!Array.isArray(payload.events)) throw Error("Invalid history");
  const remote = payload.events.map((e) => ({
    ...atlasEventSchema.parse(e),
    synced: true,
  }));
  await io.put(remote);
  if (!io.isCurrent()) return;
  const merged = await io.read();
  return io.isCurrent() ? merged : undefined;
}
