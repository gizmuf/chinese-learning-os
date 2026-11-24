import recordings from '../data/atlas-word-family-audio.json';
import {normalizedPinyin} from './pinyin-practice-model';

const catalogue: Record<string, {pinyin: string; source: string}[] | undefined> = recordings;

export function wordFamilyRecordings(word: string, pinyin: string) {
  const desired = new Set(pinyin.split('/').map(normalizedPinyin).filter(Boolean));
  return (catalogue[word] ?? []).filter(clip => desired.has(normalizedPinyin(clip.pinyin)));
}
