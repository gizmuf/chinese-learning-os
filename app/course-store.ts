"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { authenticatedFetch } from "./auth-client";
import {
  courseEventSchema,
  type CourseEvent,
  type StoredCourseEvent,
} from "./course-learning";
function openCourseStore(owner: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("chinese-os-course-v1-" + owner, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("events", { keyPath: "id" });
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
}
function read(db: IDBDatabase) {
  return new Promise<StoredCourseEvent[]>((resolve, reject) => {
    const r = db.transaction("events").objectStore("events").getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function put(db: IDBDatabase, events: StoredCourseEvent[]) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("events", "readwrite");
    for (const event of events) tx.objectStore("events").put(event);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? Error("Storage transaction aborted"));
  });
}
export function useCourseProgress(owner: string | null) {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [events, setEvents] = useState<StoredCourseEvent[]>([]);
  const [status, setStatus] = useState("Loading your notebook…");
  const lock = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    let active = true;
    let opened: IDBDatabase | undefined;
    alive.current = true;
    openCourseStore(owner ?? "guest")
      .then(async (value) => {
        opened = value;
        if (!active) {
          value.close();
          return;
        }
        const data = await read(value);
        if (active) {
          setEvents(data);
          setDb(value);
          setStatus(owner ? "Ready to sync" : "Guest · saved on this device");
        }
      })
      .catch(() => {
        if (active) setStatus("Device storage unavailable");
      });
    return () => {
      active = false;
      alive.current = false;
      opened?.close();
    };
  }, [owner]);
  const sync = useCallback(async () => {
    if (!db || !owner || lock.current) return;
    lock.current = true;
    try {
      if (!navigator.onLine) throw Error("offline");
      if (alive.current) setStatus("Syncing…");
      let pending = (await read(db)).filter((e) => !e.synced);
      while (pending.length) {
        const batch = pending.slice(0, 20);
        const r = await authenticatedFetch(
          "/api/course-progress",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ events: batch }),
          },
          owner,
        );
        if (!r.ok) throw Error("sync");
        await put(
          db,
          batch.map((e) => ({ ...e, synced: true })),
        );
        pending = (await read(db)).filter((e) => !e.synced);
      }
      const r = await authenticatedFetch(
        "/api/course-progress",
        { cache: "no-store" },
        owner,
      );
      if (!r.ok) throw Error("sync");
      const payload = (await r.json()) as { events: unknown[] };
      const remote = payload.events.map((value) =>
        courseEventSchema.parse(value),
      );
      await put(
        db,
        remote.map((e) => ({ ...e, synced: true })),
      );
      const merged = await read(db);
      if (alive.current) {
        setEvents(merged);
        setStatus(
          merged.some((e) => !e.synced)
            ? "Saved here · sync pending"
            : "All progress synced",
        );
      }
    } catch {
      if (alive.current)
        setStatus(
          navigator.onLine
            ? "Saved here · sync pending"
            : "Offline · saved on this device",
        );
    } finally {
      lock.current = false;
    }
  }, [db, owner]);
  useEffect(() => {
    void sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, [sync]);
  useEffect(() => {
    if (events.some((e) => !e.synced)) void sync();
  }, [events, sync]);
  const record = useCallback(
    async (event: CourseEvent) => {
      if (!db) throw Error("Storage is not ready.");
      await put(db, [{ ...courseEventSchema.parse(event), synced: false }]);
      if (alive.current) {
        setEvents(await read(db));
        setStatus(
          owner ? "Saved here · syncing…" : "Guest · saved on this device",
        );
      }
    },
    [db, owner],
  );
  return { events, record, status, ready: !!db, sync };
}
