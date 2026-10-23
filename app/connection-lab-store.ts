'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { feedbackSchema, labEventSchema, type LabRecord } from './connection-lab-model';
function parse(value: unknown): LabRecord { return (value as LabRecord)?.kind === 'feedback' ? feedbackSchema.parse(value) : labEventSchema.parse(value); }
export function useLabStore(owner: string | null) {
    const [records, setRecords] = useState<LabRecord[]>([]), [ready, setReady] = useState(false), [error, setError] = useState(false);
    const ref = useRef<IDBDatabase | null>(null);
    const generation = useRef(0);
    useEffect(() => {
        const token = ++generation.current;
        let db: IDBDatabase | undefined;
        setReady(false);
        setError(false);
        setRecords([]);
        let request: IDBOpenDBRequest;
        try { request = indexedDB.open('chinese-os-connection-lab-v1-' + (owner ?? 'guest'), 1); }
        catch { setError(true); return; }
        request.onblocked = () => { if (token === generation.current) setError(true); };
        request.onupgradeneeded = () => request.result.createObjectStore('records', { keyPath: 'id' });
        request.onerror = () => { if (token === generation.current)
            setError(true); };
        request.onsuccess = () => {
            db = request.result;
            if (token !== generation.current) {
                db.close();
                return;
            }
            ref.current = db;
            db.onversionchange = () => { db?.close(); if (token === generation.current) {
                ref.current = null;
                setReady(false);
                setError(true);
            } };
            let read: IDBRequest<unknown[]>;
            try { read = db.transaction('records').objectStore('records').getAll(); }
            catch { setError(true); return; }
            read.onsuccess = () => { if (token !== generation.current)
                return; try {
                setRecords(read.result.map(parse));
                setReady(true);
            }
            catch {
                setError(true);
            } };
            read.onerror = () => { if (token === generation.current)
                setError(true); };
        };
        return () => { generation.current++; ref.current = null; db?.close(); };
    }, [owner]);
    const record = useCallback(async (value: LabRecord) => {
        const row = parse(value), db = ref.current, token = generation.current;
        if (!db || !ready)
            throw Error('Storage unavailable');
        await new Promise<void>((resolve, reject) => { const tx = db.transaction('records', 'readwrite'); tx.objectStore('records').put(row); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error ?? Error('Aborted')); });
        if (token === generation.current)
            setRecords(rows => [...rows.filter(r => r.id !== row.id), row]);
    }, [ready]);
    return { records, ready, error, record };
}
