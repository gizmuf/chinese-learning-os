import data from '../data/atlas-study-reading-review.json';

type ReviewedReading = {source: string; pinyin?: string; context?: string; contextPinyin?: string; english?: string};
const reviews: Readonly<Record<string, ReviewedReading | undefined>> = data;

export function atlasReadingKey(hanzi: string, pinyin: string) {
  const text = hanzi.normalize('NFC').replace(/\s+/gu, '').replace(/[。.]$/u, '');
  const reading = pinyin.normalize('NFC').toLowerCase().replace(/[^\p{Letter}\p{Mark}]/gu, '');
  return text + '\t' + reading;
}

const corrected = new Map<string, ReviewedReading>();
for (const [key, review] of Object.entries(reviews)) {
  if (review?.pinyin) corrected.set(atlasReadingKey(key.split('\t')[0], review.pinyin), review);
}

export function reviewedAtlasReading(hanzi: string, pinyin: string) {
  const key = atlasReadingKey(hanzi, pinyin);
  return reviews[key] ?? corrected.get(key);
}

export function correctAtlasTerm<T extends {hanzi: string; pinyin: string; english: string}>(term: T): T {
  let english = term.english;
  const variants = term.pinyin.split('/').map(value => value.trim());
  const correctedVariants = variants.map(pinyin => {
    const review = reviews[atlasReadingKey(term.hanzi, pinyin)];
    english = review?.english ?? english;
    return review?.pinyin ?? pinyin;
  });
  if (english === term.english && variants.every((value, index) => correctedVariants[index] === value)) return term;
  return {...term, english, pinyin: [...new Set(correctedVariants)].join(' / ')};
}
