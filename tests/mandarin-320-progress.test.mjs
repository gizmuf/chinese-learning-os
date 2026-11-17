import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {indexedDB, IDBKeyRange} from 'fake-indexeddb';

const {outputFiles:[bundle]} = await build({
  stdin:{contents:"export * from './app/mandarin-320-progress-store'; export * from './app/local-store';",resolveDir:process.cwd()},
  bundle:true, write:false, format:'esm', platform:'node',
});
const {openStore, readDraft, saveDraft, readMandarin320Attempts, saveMandarin320Attempt} =
  await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));

test('Mandarin 320 saves each attempt separately and preserves earlier drafts and owner isolation', async () => {
  Object.assign(globalThis, {indexedDB, IDBKeyRange});
  const guest = await openStore('progress-test-guest');
  const otherConnection = await openStore('progress-test-guest');
  const account = await openStore('progress-test-account');
  try {
    const existingDraft = {source:'hanzi-families',writing:[1,2,3]};
    await saveDraft(guest, 'legacy-writing-draft', existingDraft);
    const handwritten = {outcome:'compare', response:'', strokes:[[{x:.15,y:.3,p:.6,t:1}]]};
    const typed = {outcome:'correct', response:'出去'};
    await Promise.all([
      saveMandarin320Attempt(guest, 'recall-1', handwritten),
      saveMandarin320Attempt(otherConnection, 'sentence-320', typed),
    ]);
    assert.deepEqual(await readMandarin320Attempts(otherConnection), {'recall-1':handwritten,'sentence-320':typed});
    assert.deepEqual(await readMandarin320Attempts(account), {});
    await saveMandarin320Attempt(otherConnection, 'recall-1', null);
    assert.deepEqual(await readMandarin320Attempts(guest), {'sentence-320':typed});
    assert.deepEqual(await readDraft(guest, 'legacy-writing-draft'), existingDraft);
  } finally {
    guest.close();
    otherConnection.close();
    account.close();
  }
});
