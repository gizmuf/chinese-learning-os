import {pinyin} from 'pinyin-pro';

const hanzi = /\p{Script=Han}/u;

type GrammarPattern = {label: string; note: string; match: RegExp};
const patterns: readonly GrammarPattern[] = [
  {label: '一边…一边…', match: /一边.+一边[^。！？]+/u, note: 'Two actions happening at the same time.'},
  {label: '越来越…', match: /越来越[^，。！？；]+/u, note: 'An increasing degree or a gradual change. The phrase after 越来越 tells what is changing.'},
  {label: '一方面…另一方面…', match: /一方面.+另一方面[^。！？]+/u, note: 'Presents two sides of the same issue.'},
  {label: '如果…就…', match: /如果.+?就[^，。！？]+/u, note: '如果 introduces a condition, and 就 introduces what follows from it.'},
  {label: '给…带来…', match: /给[^，。！？]+?带来[^，。！？]+/u, note: 'Says who or what is affected (给…) and what it brings them (带来…).'},
  {label: '因为…', match: /因为[^，。！？]+/u, note: 'Introduces a reason. The result can be given separately or introduced with 所以.'},
  {label: '动词 + 得 + 描写', match: /[做说写跑走开吃读睡唱跳学]得(?:很|太|不太|非常|比较|真|特别)[^，。！？；]+/u,
    note: '得 (de) links an action to a description of how it is done. In 开得很快, 很快 describes the speed of driving.'},
  {label: '动词 + 不到', match: /(?:注意|看|听|找|买|做|达)不到[^，。！？；]*/u,
    note: '不到 says the action cannot reach its result. 注意不到危险 means failing to notice the danger.'},
  {label: '也', match: /也(?:有|是|一样|会|能|需要|带来)[^，。！？；]*/u, note: 'Adds a parallel idea, roughly “also” or “too”.'},
  {label: '需要…', match: /需要[^，。！？；]+/u, note: 'Expresses a need. A noun or action can follow 需要.'},
];

export type ImportedSentence = {
  key: string;
  text: string;
  pinyin: string;
  grammar: {label: string; note: string; example: string}[];
};

export type ImportedReading = {title?: string; titlePinyin?: string; sentences: ImportedSentence[]};

function readingPinyin(text: string) {
  const pronounce = (part: string) => pinyin(part, {type: 'string', toneType: 'symbol'});
  const contextual = /打的(?=需要|去|回|到)|(?<=[做说写跑走开吃读睡唱跳学])得(?=很|太|不太|非常|比较|真|特别)/gu;
  let offset = 0;
  const readings: string[] = [];
  for (const match of text.matchAll(contextual)) {
    readings.push(pronounce(text.slice(offset, match.index)), match[0] === '打的' ? 'dǎ dī' : 'de');
    offset = match.index + match[0].length;
  }
  readings.push(pronounce(text.slice(offset)));
  return readings.filter(Boolean).join(' ').replace(/\s+([，。！？；：、）》】”’])/gu, '$1');
}

export function importReading(source: string): ImportedReading {
  const lines = source.split(/\r\n?|\n/u).map(line => line
    .replace(/&#x20;|&#32;|&nbsp;/giu, ' ').replace(/\\\*/gu, '*')
    .trim().replace(/\\$/u, '').trim()).filter(Boolean);
  const markdownTitle = lines[0]?.match(/^\*\*(.+)\*\*$/u)?.[1] ?? lines[0]?.match(/^#{1,6}\s+(.+)$/u)?.[1];
  const titleWithReading = lines.length >= 3 && /^[\p{Script=Han}]{1,16}$/u.test(lines[0])
    && /^[\p{Script=Latin}\p{Mark} '\u2019-]+$/u.test(lines[1].replace(/^\*|\*$/gu, ''));
  const title = markdownTitle && /^[\p{Script=Han}]{1,16}$/u.test(markdownTitle)
    ? markdownTitle : (titleWithReading ? lines[0] : undefined);
  if (title) {
    lines.shift();
    if (lines[0] && /^[\p{Script=Latin}\p{Mark} '\u2019-]+$/u.test(lines[0].replace(/^\*|\*$/gu, ''))) lines.shift();
  }
  const texts = lines.flatMap((line, index) => {
    const plain = line.replace(/^\*\*(.+)\*\*$/u, '$1');
    const sentences = Array.from(plain.matchAll(/.+?(?:[。！？!?]+[”’」』】）》]*|\.(?!\d)|$)/gu), match => match[0].trim())
      .filter(text => hanzi.test(text));
    const supplied = lines[index + 1]?.match(/^\*([^*]+)\*$/u)?.[1];
    const readings = supplied && /^[\p{Script=Latin}\p{Mark}\s.,!?;:，。！？'’\u2010-]+$/u.test(supplied)
      ? supplied.match(/[^.!?。！？]+[.!?。！？]*\s*/gu)?.map(reading => reading.trim()) : undefined;
    return sentences.map((text, position) => ({text, supplied: readings?.length === sentences.length ? readings[position] : undefined}));
  });
  return {
    ...(title && {title, titlePinyin: readingPinyin(title)}),
    sentences: texts.map(({text, supplied}, index) => ({
      key: 'sentence-' + (index + 1),
      text,
      pinyin: supplied || readingPinyin(text),
      grammar: patterns.flatMap(({label, note, match}) => {
        const example = text.match(match)?.[0];
        return example ? [{label, note, example}] : [];
      }),
    })),
  };
}
