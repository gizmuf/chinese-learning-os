import type { LearningEvent } from "./learning";
export function openStore(owner: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("chinese-os-v1-" + owner, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("events", { keyPath: "id" });
      r.result.createObjectStore("drafts");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function allEvents(
  db: IDBDatabase,
): Promise<(LearningEvent & { synced: boolean })[]> {
  return new Promise((resolve, reject) => {
    const r = db.transaction("events").objectStore("events").getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export function putEvents(
  db: IDBDatabase,
  events: (LearningEvent & { synced: boolean })[],
) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("events", "readwrite");
    for (const e of events) tx.objectStore("events").put(e);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () =>
      reject(tx.error ?? new Error("Storage transaction aborted"));
  });
}
export function saveDraft(db: IDBDatabase, key: string, value: unknown) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("drafts", "readwrite");
    if (value === undefined) tx.objectStore("drafts").delete(key);
    else tx.objectStore("drafts").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () =>
      reject(tx.error ?? new Error("Storage transaction aborted"));
  });
}
export function readDraft<T>(
  db: IDBDatabase,
  key: string,
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const r = db.transaction("drafts").objectStore("drafts").get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
