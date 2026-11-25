import recordings from '../data/atlas-word-family-audio.json';
import {atlasStudyRecordings} from './atlas-study-audio';
import {normalizedPinyin} from './pinyin-practice-model';

type Recording = {pinyin: string; source: string; context?: string; contextPinyin?: string};
const catalogue: Record<string, Recording[] | undefined> = recordings;

export function wordFamilyRecordings(word: string, pinyin: string) {
  const desired = new Set(pinyin.split('/').map(normalizedPinyin).filter(Boolean));
  const clips = new Map<string, Recording>((catalogue[word] ?? [])
    .filter(clip => desired.has(normalizedPinyin(clip.pinyin)))
    .map(clip => [normalizedPinyin(clip.pinyin), clip]));
  for (const clip of atlasStudyRecordings(word, pinyin)) {
    const reading = normalizedPinyin(clip.pinyin);
    if (desired.has(reading) && !clips.has(reading)) clips.set(reading, clip);
  }
  return [...clips.values()];
}
