import lesson from '../data/connectors-phone-lesson.json';

export const connectorsPhoneId = 'connectors-phone';
export const connectorsPhoneTitle = 'Connectors, frequency & phone habits';
export const connectorsPhoneHref = '/?study=library&material=' + connectorsPhoneId;
export const connectorsPhoneReadingId = 'ditouzu-full';
export const connectorsPhoneReadingHref = '/?atlas=1&reader=1&hsk=2&readingText=' + connectorsPhoneReadingId;
export const connectorsSections = [
  ['connectors', 'Connectors & frequency'],
  ['patterns', 'Trends & relationships'],
  ['reading', 'Read & listen'],
  ['caution', 'Be careful'],
  ['practice', 'Use it yourself'],
  ['hanzi', 'Hanzi & pinyin'],
] as const;
export type ConnectorsSection = typeof connectorsSections[number][0];
export type ConnectorsRow = {hanzi: string; pinyin: string; english: string; page?: number};
export const connectorsWordRows = [...lesson.connectors, ...lesson.frequency, ...lesson.phoneVocabulary];

export function connectorsSection(search: string): ConnectorsSection {
  const section = new URLSearchParams(search).get('section');
  return connectorsSections.find(([id]) => id === section)?.[0] ?? 'connectors';
}

export function connectorsBackHref(search: string) {
  const path = new URLSearchParams(search).get('returnTo');
  if (path?.startsWith('/?study=library') && !/[\\\r\n]/u.test(path)) return path;
  return '/?study=library';
}

export const frequencyAlternatives = [
  {term: '经常', pinyin: 'jīngcháng', english: 'often', example: '我经常坐地铁。', examplePinyin: 'Wǒ jīngcháng zuò dìtiě.', exampleEnglish: 'I often take the metro.', role: 'near-synonym'},
  {term: '常常', pinyin: 'chángcháng', english: 'often', example: '我常常坐地铁。', examplePinyin: 'Wǒ chángcháng zuò dìtiě.', exampleEnglish: 'I often take the metro.', role: 'near-synonym'},
  {term: '有时候', pinyin: 'yǒushíhou', english: 'sometimes', example: '我有时候坐地铁。', examplePinyin: 'Wǒ yǒushíhou zuò dìtiě.', exampleEnglish: 'I sometimes take the metro.', role: 'frequency contrast'},
  {term: '很少', pinyin: 'hěn shǎo', english: 'rarely', example: '我很少坐地铁。', examplePinyin: 'Wǒ hěn shǎo zuò dìtiě.', exampleEnglish: 'I rarely take the metro.', role: 'frequency contrast'},
  {term: '几乎从不', pinyin: 'jīhū cóngbù', english: 'almost never', example: '我几乎从不坐地铁。', examplePinyin: 'Wǒ jīhū cóngbù zuò dìtiě.', exampleEnglish: 'I almost never take the metro.', role: 'frequency contrast'},
  {term: '从不', pinyin: 'cóngbù', english: 'never', example: '我从不坐地铁。', examplePinyin: 'Wǒ cóngbù zuò dìtiě.', exampleEnglish: 'I never take the metro.', role: 'frequency contrast'},
] as const;

// These are contextual additions, not replacements of the source reading.
export const resultAlternatives: ConnectorsRow[] = [
  {hanzi: '带来了好处', pinyin: 'dài lái le hǎochu', english: 'brought benefits'},
  {hanzi: '带来了坏处', pinyin: 'dài lái le huàichu', english: 'brought disadvantages'},
  {hanzi: '看手机造成了交通事故。', pinyin: 'Kàn shǒujī zàochéng le jiāotōng shìgù.', english: 'Looking at a phone caused a traffic accident.'},
];

export function grammarGapCorrect(answer: string, expected: readonly string[]) {
  const parts = answer.trim().split(/[\s,，、/]+/u).filter(Boolean);
  return parts.length === expected.length && parts.every((part, index) => part === expected[index]);
}
