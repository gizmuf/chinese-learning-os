import type {HanziExercise} from './hanzi-family-lesson-route';

export type MandarinEntry = {
  id: number;
  hanzi: string;
  pinyin: string;
  meaning: string;
  example: string;
  example_pinyin: string;
  example_meaning: string;
  family: string;
  notes: string;
};

export function recallMandarin320(entry: MandarinEntry): HanziExercise {
  return {
    id: 'recall-' + entry.id,
    kind: 'writing',
    prompt: 'Write the Hanzi for this word.',
    context: entry.pinyin + ' · ' + entry.meaning,
    answer: entry.hanzi,
    pinyin: entry.pinyin,
    meaning: entry.meaning,
    explanation: entry.notes,
  };
}

const sentencePieces: Partial<Record<number, string[]>> = {
  44: ['对，', '你', '说得对。'],
  219: ['我', '想问你', '一个', '问题。'],
  240: ['我会写。', '我在', '练习', '写字。'],
  264: ['有的人', '喜欢茶，', '有的人', '喜欢咖啡。'],
  271: ['我', '在家。', '他', '在吃饭。'],
  285: ['真的吗？', '真好！'],
  287: ['我', '只有', '一个。', '一只猫。'],
  298: ['请坐。', '我', '坐公交车。'],
  314: ['这条路', '很长。', '我', '长大了。'],
};

export function sentenceMandarin320(entry: MandarinEntry): HanziExercise {
  const id = 'sentence-' + entry.id;
  const first = entry.example.indexOf(entry.hanzi);
  if (first >= 0 && first === entry.example.lastIndexOf(entry.hanzi)) {
    const blank = entry.example.replace(entry.hanzi, '＿＿');
    return {
      id,
      kind: 'gap',
      prompt: 'Type the missing Hanzi.',
      context: blank + ' · ' + entry.example_meaning,
      answer: entry.hanzi,
      pinyin: entry.pinyin,
      meaning: entry.meaning,
      explanation: entry.notes,
    };
  }

  const pieces = sentencePieces[entry.id];
  const sample = {
    id,
    context: entry.example_meaning,
    answer: entry.example,
    pinyin: entry.example_pinyin,
    meaning: entry.example_meaning,
    explanation: 'This is the lesson’s sample. Other ways of expressing the same meaning may also work.',
  };
  if (pieces && pieces.join('') === entry.example) {
    const offset = 1 + entry.id % (pieces.length - 1);
    return {
      ...sample,
      kind: 'build',
      prompt: 'Put the Chinese pieces in the order shown by the English.',
      choices: [...pieces.slice(offset), ...pieces.slice(0, offset)],
    };
  }
  return {
    ...sample,
    kind: 'gap',
    prompt: 'Type the lesson’s sample in Chinese.',
  };
}

const contrastCards: (HanziExercise & {topic: string})[] = [
  {
    id: 'contrast-01',
    topic: '心 / 忄 — serce i stany',
    kind: 'choice',
    prompt: 'Which character means “busy”?',
    context: '我今天很＿＿。 · I’m very busy today.',
    choices: ['忘', '忙', '慢'],
    answer: '忙',
    pinyin: 'máng',
    meaning: 'busy',
    explanation: '忙 has 忄 on the left. 忘, “forget,” has 心 at the bottom. Both contain 亡.',
  },
  {
    id: 'contrast-02',
    topic: '日 — dzień, słońce, czas',
    kind: 'choice',
    prompt: 'Which character means “sun” or “day”?',
    choices: ['目', '白', '日', '百'],
    answer: '日',
    pinyin: 'rì',
    explanation: '日 has one inner horizontal stroke. 目, “eye,” has two.',
  },
  {
    id: 'contrast-03',
    topic: '口 — usta i podobne obrysy',
    kind: 'choice',
    prompt: 'Choose the character for “ask.”',
    context: '我想＿＿你一件事。 · I want to ask you something.',
    choices: ['间', '闷', '问'],
    answer: '问',
    pinyin: 'wèn',
    explanation: '问 has 口, “mouth,” inside 门. 间 has 日 inside 门, and 闷 has 心.',
  },
  {
    id: 'contrast-04',
    topic: '女 — kobieta i rodzina',
    kind: 'choice',
    prompt: 'Which character means “mum”?',
    choices: ['妈', '吗', '马'],
    answer: '妈',
    pinyin: 'mā',
    explanation: '妈 has 女 on the left and a first tone. 吗 is a neutral-tone question particle, and 马 mǎ means “horse.”',
  },
  {
    id: 'contrast-05',
    topic: '木 — drewno i kształty',
    kind: 'choice',
    prompt: 'Which character completes the word for “weekend”?',
    context: '周＿＿',
    choices: ['未', '本', '末'],
    answer: '末',
    pinyin: 'mò',
    explanation: '周末 zhōumò means “weekend.” In 末 the top horizontal stroke is longer. In 未, “not yet,” the lower horizontal stroke is longer. 本 marks the base of 木.',
  },
  {
    id: 'contrast-06',
    topic: '氵 — wodny komponent',
    kind: 'choice',
    prompt: 'Which character completes the word for “life” or “to live”?',
    context: '生＿＿',
    choices: ['话', '活'],
    answer: '活',
    pinyin: 'huó',
    explanation: '生活 shēnghuó uses 活, with 氵. 话 huà has 讠 and appears in words about speaking, such as 说话.',
  },
  {
    id: 'contrast-07',
    topic: '囗 — otaczająca ramka',
    kind: 'choice',
    prompt: 'Which character means “garden” or “park”?',
    context: '公＿＿ · public park',
    choices: ['国', '园', '困', '回'],
    answer: '园',
    pinyin: 'yuán',
    explanation: '公园 gōngyuán uses 园, which encloses 元. 国 encloses 玉, 困 encloses 木, and 回 encloses 口.',
  },
  {
    id: 'contrast-08',
    topic: '视 — patrzenie',
    kind: 'choice',
    prompt: 'Which character completes the word for “video”?',
    context: '＿＿频',
    choices: ['见', '试', '视'],
    answer: '视',
    pinyin: 'shì',
    explanation: '视频 shìpín means “video.” 视 contains 礻 and 见. 试 shì has 讠 and means “try” or “test.”',
  },
  {
    id: 'contrast-09',
    topic: '行 — dwa częste czytania',
    kind: 'choice',
    prompt: 'How is the last syllable pronounced in the word for “bank”?',
    context: '银＿＿ · bank',
    choices: ['xíng', 'háng'],
    answer: 'háng',
    explanation: '银行 is yínháng. 行 is xíng in 这样行吗？ (“Will this work?”). Learn the reading with the word or phrase.',
  },
  {
    id: 'contrast-10',
    topic: '便 — wygodnie czy tanio?',
    kind: 'choice',
    prompt: 'How is the first syllable pronounced in the word for “inexpensive”?',
    context: '＿＿宜 · inexpensive',
    choices: ['pián', 'biàn'],
    answer: 'pián',
    explanation: '便宜 is piányi. 方便, “convenient,” is fāngbiàn.',
  },
  {
    id: 'contrast-11',
    topic: '漂 — trzy czytania w słowach',
    kind: 'choice',
    prompt: 'How is the first syllable pronounced in the word for “beautiful”?',
    context: '＿＿亮 · beautiful',
    choices: ['piāo', 'piǎo', 'piào'],
    answer: 'piào',
    explanation: '漂亮 is piàoliang, 漂浮 (“float”) is piāofú, and 漂白 (“bleach”) is piǎobái.',
  },
  {
    id: 'contrast-12',
    topic: '能 — możliwość i warunki',
    kind: 'choice',
    prompt: 'Which word explicitly points to a learned skill here?',
    context: '我＿＿开车。 · I know how to drive.',
    choices: ['能', '可以', '会'],
    answer: '会',
    pinyin: 'huì',
    explanation: '会开车 expresses knowing how to drive. 能 often points to ability or circumstances. 可以 can express permission or an available option.',
  },
  {
    id: 'contrast-13',
    topic: 'Look-alikes — czytaj kreski',
    kind: 'choice',
    prompt: 'Which character completes the word for “soil”?',
    context: '＿＿地 · land or ground',
    choices: ['士', '土'],
    answer: '土',
    pinyin: 'tǔ',
    explanation: '土地 tǔdì uses 土, with a longer lower horizontal stroke. 士 shì has a longer upper horizontal stroke.',
  },
  {
    id: 'contrast-14',
    topic: 'Antonyms — pary znaczeń',
    kind: 'choice',
    prompt: 'Choose the opposite in price.',
    context: '那个很贵，这个很＿＿。 · That one is expensive. This one is cheap.',
    choices: ['近', '便宜', '少', '小'],
    answer: '便宜',
    pinyin: 'piányi',
    explanation: '贵 guì and 便宜 piányi contrast on price. The same pair works with 比: 这个比那个便宜。',
  },
  {
    id: 'contrast-15',
    topic: 'Clock time and duration',
    kind: 'choice',
    prompt: 'Choose the expression for a duration of three hours.',
    context: '我学了＿＿。 · I studied for three hours.',
    choices: ['三点', '三分钟', '三个小时'],
    answer: '三个小时',
    pinyin: 'sān ge xiǎoshí',
    explanation: '三点 is three o’clock. 三个小时 measures three hours. 三分钟 measures three minutes.',
  },
  {
    id: 'contrast-16',
    topic: '第 and 弟',
    kind: 'choice',
    prompt: 'Choose the character that marks an ordinal.',
    context: '这是我的＿＿一本书。 · This is my first book.',
    choices: ['弟', '第'],
    answer: '第',
    pinyin: 'dì',
    explanation: '第 combines with a number to form an ordinal such as 第一, “first.” 弟弟 dìdi means “younger brother.”',
  },
  {
    id: 'contrast-17',
    topic: 'The tone of 不 before 认',
    kind: 'choice',
    prompt: 'Which pinyin shows the pronunciation of “don’t know (someone)”?',
    choices: ['bù rènshi', 'bú rènshi'],
    answer: 'bú rènshi',
    explanation: '不 is pronounced bú before a fourth-tone syllable such as 认 rèn. Compare 不喝 bù hē, where 喝 has the first tone.',
  },
  {
    id: 'contrast-18',
    topic: '再 and 在',
    kind: 'choice',
    prompt: 'Which character means “again” here?',
    context: '请＿＿说一次。 · Please say it again.',
    choices: ['在', '再'],
    answer: '再',
    pinyin: 'zài',
    explanation: '再 means “again” in 再说一次. 在 can mark location, as in 在家, or a current action, as in 在说话.',
  },
  {
    id: 'contrast-19',
    topic: '只 as “only” and as a classifier',
    kind: 'choice',
    prompt: 'How is the missing classifier pronounced?',
    context: '一＿＿猫 · one cat',
    choices: ['zhǐ', 'zhī'],
    answer: 'zhī',
    explanation: 'In 一只猫 yì zhī māo, 只 is a classifier. In 我只有一个, 只 is zhǐ and means “only.”',
  },
];

export const mandarin320Contrasts: HanziExercise[] = contrastCards;
export const mandarin320ContrastTopics = contrastCards.map(card => card.topic);
