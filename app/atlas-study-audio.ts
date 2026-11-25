import catalogue from '../data/atlas-study-audio.json';
import {atlasReadingKey, reviewedAtlasReading} from './atlas-study-reading-review';

const recordings: Readonly<Record<string, string | undefined>> = catalogue;

export function atlasStudyRecordings(hanzi: string, pinyin: string) {
  return pinyin.split('/').map(value => value.trim()).filter(Boolean).flatMap(reading => {
    const review = reviewedAtlasReading(hanzi, reading);
    const source = review?.source ?? recordings[atlasReadingKey(hanzi, reading)];
    return source ? [{pinyin: review?.pinyin ?? reading, source, context: review?.context,
      contextPinyin: review?.contextPinyin}] : [];
  });
}
