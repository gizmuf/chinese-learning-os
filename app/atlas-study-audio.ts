import catalogue from '../data/atlas-study-audio.json';
import type {StudyTerm, StudyExample} from './atlas-study-model';

const recordings: Readonly<Record<string, string | undefined>> = catalogue;
type Readable = Pick<StudyTerm, 'hanzi' | 'pinyin' | 'namePinyin'> | Pick<StudyExample, 'hanzi' | 'pinyin'>;

export function atlasStudyRecordings(hanzi: string, pinyin: string) {
  const text = hanzi.normalize('NFC').replace(/\s+/gu, '').replace(/[。.]$/u, '');
  return pinyin.split('/').map(value => value.trim()).filter(Boolean).flatMap(reading => {
    const key = reading.normalize('NFC').toLowerCase().replace(/[^\p{Letter}\p{Mark}]/gu, '');
    const source = recordings[text + '\t' + key];
    return source ? [{pinyin: reading, source}] : [];
  });
}

export function atlasStudyPronunciation(term: Readable) {
  const pinyin = term.pinyin || ('namePinyin' in term ? term.namePinyin : '');
  if (!pinyin) return undefined;

  const [first] = atlasStudyRecordings(term.hanzi, pinyin);
  return {source: first?.source, reading: first?.pinyin ?? pinyin.split('/')[0].trim(), alternatives: pinyin.includes('/')};
}
