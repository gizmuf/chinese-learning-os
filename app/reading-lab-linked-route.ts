import {importReading} from './reading-lab-own-text-model';
import type {NarrationTrack} from './reading-lab-narrator-model';
import {readingLabApiBase} from './reading-lab-own-audio';

export type LinkedReading = {markdown: string; track: NarrationTrack};
export const linkedReadingParam = 'readingText';
const tokenPattern = /^[a-f0-9]{32}$/u;

export function linkedReadingId(search: string) {
  const id = new URLSearchParams(search).get(linkedReadingParam);
  return id && (id === 'ditouzu' || tokenPattern.test(id)) ? id : undefined;
}

export function linkedReadingHref(id: string) {
  return window.location.origin + '/?atlas=1&reader=1&hsk=2&' + linkedReadingParam + '=' + encodeURIComponent(id);
}

const savedEndpoint = () => readingLabApiBase() + '/saved';

export async function saveLinkedReading(markdown: string, sentences: readonly string[]) {
  const response = await fetch(savedEndpoint(), {
    method: 'POST',
    credentials: 'omit',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({markdown, sentences}),
  });
  if (response.status === 409) throw Error('This recording is unavailable to share. You can still play it on this device.');
  if (response.status === 507) throw Error('Link storage is full. You can still play this recording.');
  if (!response.ok) throw Error('Could not save a link. Try again.');
  const {token} = await response.json() as {token?: unknown};
  if (typeof token !== 'string' || !tokenPattern.test(token)) throw Error('Invalid reading link.');
  return linkedReadingHref(token);
}

export async function loadLinkedReading(id: string, signal: AbortSignal): Promise<LinkedReading> {
  if (!tokenPattern.test(id)) throw Error('Reading link unavailable.');
  const endpoint = savedEndpoint() + '?token=' + id;
  const response = await fetch(endpoint, {signal, credentials: 'omit', cache: 'no-store'});
  if (!response.ok) throw Error('Reading link unavailable.');
  const {markdown, sentences, starts, duration} = await response.json() as {
    markdown?: unknown; sentences?: unknown; starts?: unknown; duration?: unknown;
  };
  if (typeof markdown !== 'string' || markdown.length > 4800 || !Array.isArray(sentences) || !Array.isArray(starts) ||
      starts.length !== sentences.length || typeof duration !== 'number' ||
      !Number.isFinite(duration) || duration <= 0 || duration > 360) {
    throw Error('Invalid saved reading.');
  }
  const imported = importReading(markdown).sentences;
  if (!imported.length || imported.length !== sentences.length || imported.some(({text}, index) =>
    text !== sentences[index] || !Number.isFinite(starts[index]) || starts[index] >= duration ||
      (index ? starts[index] <= starts[index - 1] : starts[index] !== 0))) {
    throw Error('Saved audio does not match this reading.');
  }
  const cues = imported.map(({key, text}, index) => ({key, text, start: starts[index] as number}));
  return {markdown, track: {source: endpoint + '&audio=1', duration, cues}};
}
