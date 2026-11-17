'use client';

import {useEffect, useEffectEvent, useRef, useState} from 'react';
import type {Attempt, Attempts} from './hanzi-family-lesson-practice';
import {openStore} from './local-store';
import {readMandarin320Attempts, saveMandarin320Attempt} from './mandarin-320-progress-store';

export function useMandarin320Progress(owner: string, notify: (message: string) => void) {
  const [attempts, setAttempts] = useState<Attempts | null>(null);
  const [pending, setPending] = useState(false);
  const connection = useRef<IDBDatabase | null>(null);
  const mounted = useRef(false);
  const saving = useRef(false);
  const warned = useRef(false);

  const showStorageWarning = useEffectEvent(() => {
    notify('Practice progress is available while this page stays open.');
  });

  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    openStore(owner).then(async db => {
      if (cancelled) {
        db.close();
        return;
      }
      connection.current = db;
      const stored = await readMandarin320Attempts(db);
      if (!cancelled) setAttempts(stored);
    }).catch(() => {
      if (cancelled) return;
      connection.current?.close();
      connection.current = null;
      warned.current = true;
      showStorageWarning();
      setAttempts({});
    });
    return () => {
      cancelled = true;
      mounted.current = false;
      connection.current?.close();
      connection.current = null;
    };
  }, [owner]);

  async function save(id: string, attempt: Attempt | null) {
    if (saving.current || !attempts) return;
    saving.current = true;
    setPending(true);
    try {
      if (connection.current) await saveMandarin320Attempt(connection.current, id, attempt);
    } catch {
      if (mounted.current && !warned.current) {
        warned.current = true;
        notify('This attempt is available while this page stays open.');
      }
    } finally {
      saving.current = false;
    }
    if (!mounted.current) return;
    setAttempts(previous => {
      const next = {...previous};
      if (attempt) next[id] = attempt;
      else delete next[id];
      return next;
    });
    setPending(false);
  }

  return {attempts, pending, save};
}
