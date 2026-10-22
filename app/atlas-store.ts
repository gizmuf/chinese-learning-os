"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { authenticatedFetch } from "./auth-client";
import {
  atlasEventSchema,
  type AtlasEvent,
  type StoredAtlasEvent,
} from "./atlas-learning";
import { syncAtlasEvents } from "./atlas-sync";
function open(owner: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("chinese-os-atlas-v1-" + owner, 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("events", { keyPath: "id" });
    r.onsuccess = () => {
      r.result.onversionchange = () => r.result.close();
      resolve(r.result);
    };
    r.onerror = () => reject(r.error);
  });
}
function read(db: IDBDatabase) {
  return new Promise<StoredAtlasEvent[]>((resolve, reject) => {
    const r = db.transaction("events").objectStore("events").getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function put(db: IDBDatabase, events: StoredAtlasEvent[]) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("events", "readwrite");
    for (const event of events) tx.objectStore("events").put(event);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? Error("Storage transaction aborted"));
  });
}
export function useAtlasProgress(owner: string | null) {
  const [connection, setConnection] = useState<{
    db: IDBDatabase;
    owner: string | null;
    token: number;
  } | null>(null);
  const [events, setEvents] = useState<StoredAtlasEvent[]>([]);
  const [status, setStatus] = useState("Loading your notebook…");
  const generation = useRef(0);
  const lock = useRef<number | null>(null);
  const db = connection?.owner === owner ? connection.db : null;
  useEffect(() => {
    const token = ++generation.current;
    let opened: IDBDatabase | undefined;
    setConnection(null);
    setEvents([]);
    setStatus("Loading your notebook…");
    open(owner ?? "guest")
      .then(async (value) => {
        opened = value;
        if (generation.current !== token) {
          value.close();
          return;
        }
        const rows = await read(value);
        if (generation.current === token) {
          setEvents(rows);
          setConnection({ db: value, owner, token });
          setStatus(owner ? "Ready to sync" : "Guest · saved on this device");
        }
      })
      .catch(() => {
        if (generation.current === token)
          setStatus("Device storage unavailable");
      });
    return () => {
      if (generation.current === token) generation.current++;
      opened?.close();
    };
  }, [owner]);
  const sync = useCallback(async () => {
    if (
      !db ||
      !owner ||
      !connection ||
      generation.current !== connection.token ||
      lock.current === connection.token
    )
      return;
    const token = connection.token;
    const current = () => generation.current === token;
    lock.current = token;
    try {
      if (!navigator.onLine) throw Error("offline");
      setStatus("Syncing…");
      const merged = await syncAtlasEvents({
        read: () => read(db),
        put: (rows) => put(db, rows),
        isCurrent: current,
        request: (method, body) =>
          authenticatedFetch(
            "/api/atlas-progress",
            method === "GET"
              ? { cache: "no-store" }
              : {
                  method,
                  headers: { "Content-Type": "application/json" },
                  body,
                },
            owner,
          ),
      });
      if (merged && current()) {
        setEvents(merged);
        setStatus(
          merged.some((e) => !e.synced)
            ? "Saved here · sync pending"
            : "All progress synced",
        );
      }
    } catch {
      if (current())
        setStatus(
          navigator.onLine
            ? "Saved here · sync pending"
            : "Offline · saved on this device",
        );
    } finally {
      if (lock.current === token) lock.current = null;
    }
  }, [db, owner, connection]);
  useEffect(() => {
    void sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, [sync]);
  useEffect(() => {
    if (events.some((e) => !e.synced)) void sync();
  }, [events, sync]);
  const record = useCallback(
    async (event: AtlasEvent) => {
      if (!db || !connection || generation.current !== connection.token)
        throw Error("Storage is not ready.");
      const token = connection.token;
      await put(db, [{ ...atlasEventSchema.parse(event), synced: false }]);
      if (generation.current !== token) return;
      const rows = await read(db);
      if (generation.current === token) {
        setEvents(rows);
        setStatus(
          owner ? "Saved here · syncing…" : "Guest · saved on this device",
        );
      }
    },
    [db, owner, connection],
  );
  return {
    events: db ? events : [],
    status: db ? status : "Loading your notebook…",
    record,
    sync,
    ready: !!db,
  };
}
