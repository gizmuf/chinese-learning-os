import {saveDraft, storageTransaction} from './local-store';
import type {Attempt, Attempts} from './hanzi-family-lesson-practice';

const prefix = 'mandarin-320:attempt:v1:';

export function readMandarin320Attempts(db: IDBDatabase) {
  return storageTransaction<Attempts>(db, 'drafts', 'readonly', (store, complete) => {
    const attemptIds = IDBKeyRange.bound(prefix, prefix + '\uffff');
    const attempts: Attempts = {};
    const request = store.openCursor(attemptIds);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        complete(attempts);
        return;
      }
      attempts[String(cursor.key).slice(prefix.length)] = cursor.value as Attempt;
      cursor.continue();
    };
  });
}

export function saveMandarin320Attempt(db: IDBDatabase, id: string, attempt: Attempt | null) {
  return saveDraft(db, prefix + id, attempt ?? undefined);
}
