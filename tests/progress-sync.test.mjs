import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const {outputFiles: [bundle]} = await build({
  stdin: {contents: "export {synchronizeProgress} from './app/progress-sync'; export {items} from './app/content';", resolveDir: process.cwd()},
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const {synchronizeProgress, items} = await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));
const event = (extra = {}) => ({
  id: crypto.randomUUID(), itemId: items[0].id, skill: 'meaning', mode: 'recall',
  rating: 3, assisted: false, at: 1, timezone: 'UTC', detail: {}, synced: false, ...extra,
});
const accepted = events => Response.json({accepted: events.map(event => event.id)});

function notebook(initial, request) {
  const rows = new Map(initial.map(row => [row.id, row]));
  return {rows, async read() {return [...rows.values()];}, async put(events) {
    for (const row of events) rows.set(row.id, row);
  }, request};
}

test('a validation rejection keeps its original row and permits later uploads and remote pull', async () => {
  const invalid = event({at: Date.now() + 360000});
  const valid = event();
  const remote = event();
  const calls = [];
  const storage = notebook([invalid, valid], async (method, body) => {
    if (method === 'GET') {
      calls.push('GET');
      return Response.json({events: [remote, {...invalid, at: 8}]});
    }
    const {events} = JSON.parse(body);
    calls.push(events.map(event => event.id));
    return events.some(event => event.id === invalid.id)
      ? Response.json({error: 'Invalid learning event.'}, {status: 400})
      : accepted(events);
  });
  const result = await synchronizeProgress(storage);
  assert.deepEqual(calls, [[invalid.id, valid.id], [invalid.id], [valid.id], 'GET']);
  assert.deepEqual(storage.rows.get(invalid.id), invalid);
  assert.equal(storage.rows.get(valid.id).synced, true);
  assert.equal(storage.rows.get(remote.id).synced, true);
  assert.equal(result.pending, true);
});

test('only IDs acknowledged by the upload are marked synced', async () => {
  const omitted = event();
  const confirmed = event();
  const storage = notebook([omitted, confirmed], async method => method === 'POST'
    ? accepted([confirmed]) : Response.json({events: []}));
  const result = await synchronizeProgress(storage);
  assert.equal(result.pending, true);
  assert.deepEqual(storage.rows.get(omitted.id), omitted);
  assert.equal(storage.rows.get(confirmed.id).synced, true);
});

test('non-validation 400, authentication and transient failures do not split or mutate the queue', async () => {
  for (const status of [400, 401, 403, 503]) {
    const initial = [event(), event()];
    const calls = [];
    const storage = notebook(initial, async method => {
      calls.push(method);
      return Response.json({error: 'Other failure.'}, {status});
    });
    await assert.rejects(synchronizeProgress(storage), /Progress upload failed/);
    assert.deepEqual(calls, ['POST']);
    assert.deepEqual(await storage.read(), initial);
  }
});

test('an oversized local row stays pending while a normal row and the download proceed', async () => {
  const large = event({detail: {input: 'x'.repeat(900000)}});
  const valid = event();
  const calls = [];
  const storage = notebook([large, valid], async (method, body) => {
    if (method === 'GET') {
      calls.push('GET');
      return Response.json({events: []});
    }
    const {events} = JSON.parse(body);
    calls.push(events.map(event => event.id));
    return accepted(events);
  });
  const result = await synchronizeProgress(storage);
  assert.deepEqual(calls, [[valid.id], 'GET']);
  assert.deepEqual(storage.rows.get(large.id), large);
  assert.equal(result.pending, true);
});

test('an empty pending queue still downloads remote progress', async () => {
  const remote = event();
  const storage = notebook([], async method => {
    assert.equal(method, 'GET');
    return Response.json({events: [remote]});
  });
  const result = await synchronizeProgress(storage);
  assert.deepEqual(result, {pending: false, events: [{...remote, synced: true}]});
});

test('a long invalid queue has a bounded probe budget and leaves later normal batches and pull available', async () => {
  const future = Date.now() + 360000;
  const invalid = Array.from({length: 1000}, () => event({at: future}));
  const valid = Array.from({length: 20}, () => event());
  const remote = event();
  const requests = [];
  const storage = notebook([...invalid, ...valid], async (method, body) => {
    if (method === 'GET') {
      requests.push(method);
      return Response.json({events: [remote]});
    }
    const {events} = JSON.parse(body);
    requests.push(events);
    return events.some(event => event.at === future)
      ? Response.json({error: 'Invalid learning event.'}, {status: 400})
      : accepted(events);
  });
  const result = await synchronizeProgress(storage);
  assert.equal(requests.filter(batch => Array.isArray(batch) && batch.length === 20).length, 51);
  assert.equal(requests.filter(batch => Array.isArray(batch) && batch.length < 20).length, 40);
  assert.deepEqual(requests.at(-2), valid);
  assert.equal(requests.at(-1), 'GET');
  assert.equal(result.pending, true);
  assert.deepEqual(invalid.map(event => storage.rows.get(event.id)), invalid);
  assert.ok([...valid, remote].every(event => storage.rows.get(event.id).synced));
});
