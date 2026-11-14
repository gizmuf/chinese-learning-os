import {progressSchema} from './event-schema';
import type {LearningEvent} from './learning';

type StoredEvent = LearningEvent & {synced: boolean};
type SyncProgress = {
  read: () => Promise<StoredEvent[]>;
  put: (events: StoredEvent[]) => Promise<void>;
  request: (method: 'GET' | 'POST', body?: string) => Promise<Response>;
};

const requestLimit = 900_000;
const uploadBatchSize = 20;
const validationProbeLimit = 40;
const encoder = new TextEncoder();

function eventBody(events: StoredEvent[]) {
  return JSON.stringify({events});
}

async function rejectedBatch(response: Response) {
  if (response.status === 413) return true;
  if (response.status !== 400) return false;
  const data: unknown = await response.json().catch(() => null);
  return !!data && typeof data === 'object' && 'error' in data && data.error === 'Invalid learning event.';
}

/** The server validates a batch before inserting anything, so a definite rejection can be split safely. */
export async function synchronizeProgress({read, put, request}: SyncProgress) {
  const pending = (await read()).filter(event => !event.synced);

  let validationProbesLeft = validationProbeLimit;

  async function upload(events: StoredEvent[], probe = false): Promise<void> {
    if (probe) {
      if (validationProbesLeft === 0) return;
      validationProbesLeft--;
    }
    const response = await request('POST', eventBody(events));
    if (response.ok) {
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || !('accepted' in data) || !Array.isArray(data.accepted)
          || !data.accepted.every((id: unknown) => typeof id === 'string')) throw Error('Invalid progress acknowledgement');
      const accepted = new Set(data.accepted);
      const confirmed = events.filter(event => accepted.has(event.id));
      if (confirmed.length) await put(confirmed.map(event => ({...event, synced: true})));
      return;
    }
    if (!await rejectedBatch(response)) throw Error('Progress upload failed');
    if (events.length === 1) return;
    const middle = Math.ceil(events.length / 2);
    await upload(events.slice(0, middle), true);
    await upload(events.slice(middle), true);
  }

  let batch: StoredEvent[] = [];
  for (const event of pending) {
    if (encoder.encode(eventBody([event])).length > requestLimit) continue;
    const next = [...batch, event];
    if (next.length > uploadBatchSize || encoder.encode(eventBody(next)).length > requestLimit) {
      await upload(batch);
      batch = [event];
    } else batch = next;
  }
  if (batch.length) await upload(batch);

  const response = await request('GET');
  if (!response.ok) throw Error('Progress download failed');
  const remote = progressSchema.parse(await response.json()).events;
  const local = new Map((await read()).map(event => [event.id, event]));
  // Never replace a pending local record with a server record bearing the same UUID.
  // A matching record is confirmed on the next successful idempotent POST.
  const downloaded = remote.filter(event => local.get(event.id)?.synced !== false);
  if (downloaded.length) await put(downloaded.map(event => ({...event, synced: true})));
  const events = await read();
  return {events, pending: events.some(event => !event.synced)};
}
