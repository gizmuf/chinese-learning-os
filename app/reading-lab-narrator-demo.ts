import myDay from '../data/my-day-01-v2.json';
import type {ReadingLabReading} from './reading-lab-types';

const morning = myDay.sections[0].rows;
const words = [
  '我 每天 八 点 左右 醒来 。',
  '二十 到 三十 分钟 后 ， 我 起床 。',
  '然后 我 去 厨房 做 早饭 。',
  '因为 我 不 吃 肉 ， 所以 早饭 我 做 素菜 。',
  '然后 我 吃 早饭 。',
  '早饭 后 ， 我 准备 出门 ， 因为 我 得 去 学校 。',
];
const syllables = [
  'wǒ měi tiān bā diǎn zuǒ yòu xǐng lái',
  'èr shí dào sān shí fēn zhōng hòu wǒ qǐ chuáng',
  'rán hòu wǒ qù chú fáng zuò zǎo fàn',
  'yīn wèi wǒ bù chī ròu suǒ yǐ zǎo fàn wǒ zuò sù cài',
  'rán hòu wǒ chī zǎo fàn',
  'zǎo fàn hòu wǒ zhǔn bèi chū mén yīn wèi wǒ děi qù xué xiào',
];

export const narratorDemo: ReadingLabReading = {
  id: 'my-day-morning-audio',
  level: 2,
  topic: 'Narrator demo · Daily routine',
  title: {hanzi: '我的早上', pinyin: 'Wǒ de zǎoshang', english: 'My morning'},
  levelIntent: 'An extract from My Day to practise sequencing a routine. Some vocabulary goes beyond HSK 2.',
  paragraphs: [{
    id: 'p1',
    english: morning.map(row => row.english).join(' '),
    sentenceEnglish: morning.map(row => row.english),
    chunks: words.map((sentence, index) => {
      const readings = syllables[index].split(' ');
      let offset = 0;
      const tokens = sentence.split(' ').map(text => {
        const count = [...text].filter(character => /\p{Script=Han}/u.test(character)).length;
        const pinyin = readings.slice(offset, offset + count);
        offset += count;
        return {text, pinyin};
      });
      return {id: 'p1-c' + (index + 1), tokens};
    }),
  }],
  grammar: [{
    id: 'g1',
    pattern: '因为……所以……',
    note: '因为 introduces the reason and 所以 introduces the result.',
    example: {hanzi: morning[3].hanzi, pinyin: morning[3].pinyin, english: morning[3].english},
    sourceChunks: ['p1-c4'],
  }],
  questions: [{
    id: 'q1', question: '他几点左右醒来？', answer: '他八点左右醒来。',
    evidence: {paragraphId: 'p1', chunkId: 'p1-c1'},
  }],
  writing: {
    prompt: '用然后写两句，介绍你的早上。',
    english: 'Write two sentences about your morning using 然后.',
    requirements: ['Say when you wake up.', 'Use 然后 to describe what you do next.'],
  },
  glossaryCandidates: ['左右', '醒来', '起床', '然后', '早饭'],
};
