import type { LearningEvent } from "./learning";

export const storageTimeoutMs = 10000;
const storageError = () => new Error("Device storage did not respond. Please try again.");

export function openStore(owner: string, timeoutMs = storageTimeoutMs) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    const finish = (error?: unknown, db?: IDBDatabase) => {
      if (settled) { db?.close(); return; }
      settled = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve(db!);
    };
    const timer = setTimeout(() => finish(storageError()), timeoutMs);
    try {
      const r = indexedDB.open("chinese-os-v1-" + owner, 1);
      r.onupgradeneeded = () => {
        if (settled) { r.transaction?.abort(); return; }
        r.result.createObjectStore("events", { keyPath: "id" });
        r.result.createObjectStore("drafts");
      };
      r.onblocked = () => finish(new Error("Device storage is blocked by another tab. Close other Chinese OS tabs and retry."));
      r.onsuccess = () => {
        const db = r.result;
        db.onversionchange = () => db.close();
        finish(undefined, db);
      };
      r.onerror = () => finish(r.error ?? storageError());
    } catch (error) { finish(error); }
  });
}

/** Resolve only after commit; abort timed-out writes before offering a retry. */
export function storageTransaction<T = void>(
  db: IDBDatabase, name: string, mode: IDBTransactionMode,
  work: (store: IDBObjectStore, result: (value: T) => void, tx: IDBTransaction) => void,
  timeoutMs = storageTimeoutMs,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, mode);
    let result: T, settled = false;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (error) reject(error); else resolve(result);
    };
    const timer = setTimeout(() => {
      try { tx.abort(); } catch { /* It may already have committed. Recovery uses the event UUID. */ }
      finish(storageError());
    }, timeoutMs);
    tx.oncomplete = () => finish();
    tx.onerror = () => finish(tx.error ?? storageError());
    tx.onabort = () => finish(tx.error ?? new Error("Storage transaction aborted"));
    try { work(tx.objectStore(name), value => { result = value; }, tx); }
    catch (error) { try { tx.abort(); } catch {} finish(error); }
  });
}

export function allEvents(db: IDBDatabase): Promise<(LearningEvent & { synced: boolean })[]> {
  return storageTransaction(db, "events", "readonly", (store, result) => {
    const r = store.getAll(); r.onsuccess = () => result(r.result);
  });
}
export function putEvents(db: IDBDatabase, events: (LearningEvent & { synced: boolean })[]) {
  return storageTransaction(db, "events", "readwrite", store => {
    for (const e of events) store.put(e);
  });
}
export function saveDraft(db: IDBDatabase, key: string, value: unknown) {
  return storageTransaction(db, "drafts", "readwrite", store => {
    if (value === undefined) store.delete(key); else store.put(value, key);
  });
}
export function readDraft<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return storageTransaction(db, "drafts", "readonly", (store, result) => {
    const r = store.get(key); r.onsuccess = () => result(r.result);
  });
}
