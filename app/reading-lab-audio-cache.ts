import type {ImportedSentence} from './reading-lab-own-text-model';
import type {NarrationCue} from './reading-lab-narrator-model';

export type SavedReadingAudio = {wav: Blob; cues: NarrationCue[]; duration: number; voice: string};
type StoredReadingAudio = Omit<SavedReadingAudio, 'wav'> & {wavBytes: ArrayBuffer};
const storeName = 'recordings';

export function readingAudioCacheKey(sentences: readonly ImportedSentence[]) {
  return JSON.stringify(sentences.map(sentence => sentence.text));
}

function openReadingAudioDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('chinese-os-reading-narration', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export function matchesSavedReadingAudio(value: SavedReadingAudio | undefined, sentences: readonly ImportedSentence[]): value is SavedReadingAudio {
  return value?.wav instanceof Blob && value.wav.type === 'audio/wav' && value.wav.size > 44
    && typeof value.voice === 'string' && value.voice.length <= 90
    && Number.isFinite(value.duration) && value.duration > 0 && value.duration <= 360
    && Array.isArray(value.cues) && sentences.length > 0 && value.cues.length === sentences.length
    && value.cues.every((cue, index) => cue.key === sentences[index].key && cue.text === sentences[index].text
      && Number.isFinite(cue.start) && cue.start < value.duration
      && (index === 0 ? cue.start === 0 : cue.start > value.cues[index - 1].start));
}

export async function readSavedReadingAudio(sentences: readonly ImportedSentence[]) {
  const db = await openReadingAudioDatabase();
  try {
    const stored = await new Promise<StoredReadingAudio | SavedReadingAudio | undefined>((resolve, reject) => {
      const request = db.transaction(storeName).objectStore(storeName).get(readingAudioCacheKey(sentences));
      request.onsuccess = () => resolve(request.result?.audio);
      request.onerror = () => reject(request.error);
    });
    const value = stored && 'wavBytes' in stored && stored.wavBytes instanceof ArrayBuffer
      ? {...stored, wav: new Blob([stored.wavBytes], {type: 'audio/wav'})}
      : stored as SavedReadingAudio | undefined;
    return matchesSavedReadingAudio(value, sentences) ? value : undefined;
  } finally {db.close();}
}

export async function saveReadingAudio(sentences: readonly ImportedSentence[], audio: SavedReadingAudio) {
  const {wav, ...metadata} = audio;
  const stored: StoredReadingAudio = {...metadata, wavBytes: await wav.arrayBuffer()};
  const db = await openReadingAudioDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).put({audio: stored}, readingAudioCacheKey(sentences));
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {db.close();}
}
