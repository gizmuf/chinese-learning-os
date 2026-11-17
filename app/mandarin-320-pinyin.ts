import {pinyinKey} from './chinese-search';
import {tonePinyin} from './dictionary-source-model';

type Candidate = {hanzi: string; pinyin: string};

const baseKey = (reading: string) => pinyinKey(reading.replace(/0/g, '5'));
const toneKey = (reading: string) => tonePinyin(reading.toLowerCase().replace(/u:|v/g, 'ü'))
  .normalize('NFC').replace(/[\s’'·-]/g, '');

export function createMandarin320PinyinLookup(entries: readonly Candidate[]) {
  const index = new Map<string, Map<string, {candidate: Candidate; tones: Set<string>}>>();
  for (const {hanzi, pinyin} of entries) {
    const readings = pinyin.replace(/\s*\(often ([^)]+)\)/g, ' / $1').split(/\s*\/\s*/);
    for (const reading of readings) {
      const key = baseKey(reading);
      const bucket = index.get(key) ?? new Map();
      const match = bucket.get(hanzi) ?? {candidate: {hanzi, pinyin}, tones: new Set<string>()};
      match.tones.add(toneKey(reading));
      bucket.set(hanzi, match);
      index.set(key, bucket);
    }
  }

  return (query: string): Candidate[] => {
    if (!/^[\p{Script=Latin}\p{M}0-5’'·:\s-]+$/u.test(query)) return [];
    const matches = index.get(baseKey(query));
    if (!matches) return [];
    const explicitlyToned = /[0-5\u0300\u0301\u0304\u030c]/.test(query.normalize('NFD'));
    if (!explicitlyToned) return Array.from(matches.values(), ({candidate}) => candidate);
    const tone = toneKey(query);
    const sameTone: Candidate[] = [];
    const otherTones: Candidate[] = [];
    for (const {candidate, tones} of matches.values()) {
      (tones.has(tone) ? sameTone : otherTones).push(candidate);
    }
    return [...sameTone, ...otherTones];
  };
}
