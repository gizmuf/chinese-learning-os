import {grammarFoundations, type GrammarUnit} from './grammar-foundations';
import batchA from '../data/grammar-hsk3-a.json';
import supplements from '../data/hsk-grammar-supplements.json';
import batchB from '../data/grammar-hsk3-b.json';

export type GrammarLevel = 1 | 2 | 3;
export const grammarLevels: GrammarLevel[] = [1, 2, 3];
export const grammarSyllabusPages = {1: '383–385', 2: '386–388', 3: '389–391'};
export const grammarSyllabusHref = 'https://www.chinesetest.cn/syllabus';

export type GrammarCoverageRow = {
  label: string;
  patterns: string;
  card?: string;
  partial?: true;
};

const row = (label: string, patterns: string, card?: string, partial?: true): GrammarCoverageRow =>
  ({label, patterns, card, partial});

// Grouped index of the syllabus. A linked card covers the listed construction or
// a stated subset. The index does not count individual words as separate rules.
const baseCoverage: Record<GrammarLevel, GrammarCoverageRow[]> = {
  1: [
    row('Word building and place nouns', '小–、第–、–们、–边；上、下、里、外、前、后'),
    row('Modal and separable verbs', '会、能、想、要、可以；看病、睡觉、说话等'),
    row('Question, personal and demonstrative pronouns', '什么、谁、哪、几、怎么；我、你、大家；这、那、有些等'),
    row('Numerals and classifiers', '一至千、二／两；本、杯；名量词与时量词', 'grammar-1-classifiers', true),
    row('Adverbs', '程度、范围、时间、频率、关联、否定；很、都、在、正在、再、还、也、不、没（有）、不要', 'grammar-1-negation', true),
    row('Locating, addressing and joining', '在；介词和、对；连词和'),
    row('Particles and interjections', '的；了；吧、吗、呢；叹词', 'grammar-1-ma', true),
    row('Phrase types', '联合、偏正、动宾、主谓；数量、介宾、方位'),
    row('Subjects, predicates, objects and modifiers', '主语、谓语、宾语、定语、状语'),
    row('Action counts', '动词＋动量补语'),
    row('Sentence structures and purposes', '动词／形容词／名词谓语句；非主谓句；陈述、疑问、祈使、感叹', 'grammar-1-ma', true),
    row('Identity with 是', 'A 是 B', 'grammar-1-shi'),
    row('Possession with 有', 'A 有 B', 'grammar-1-you'),
    row('Existence, successive verbs and two objects', '处所＋是／有；连动句；动词＋宾语₁＋宾语₂'),
    row('Joining clauses', '不用连词的复句；……，也／还……'),
    row('Completed actions and changes', '动词＋了；句末了'),
    row('Actions in progress', '在／正在＋动词；进行态＋呢', 'grammar-1-progressive', true),
    row('Numbers and time expressions', '钱数、序数、年/月/日/星期、钟点'),
  ],
  2: [
    row('Word building and place nouns', '–面；左、右'),
    row('Verb and adjective reduplication', 'AA、A一A、A了A、ABAB；AA、AABB'),
    row('Possibility and separable verbs', '可能；帮忙、游泳、跳舞、跑步'),
    row('Pronouns and demonstratives', '为什么、自己、那么／这么、那样／这样、每'),
    row('Numerals and classifiers', '万、好多、多；条、位、间、名、包；动量词'),
    row('Adverbs', '程度、范围、时间、频率、否定、关联、语气；最、一起、已经、经常、别、再、就、还是等'),
    row('Prepositions and conjunctions', '从、给、比、跟、因为；但、但是、虽然、还是、所以等', 'grammar-2-cause', true),
    row('Structural and sentence particles', '得、地；呢、吧、的、啊'),
    row('Phrase types and set frames', '动补、“的”字、连谓、兼语；名词性／动词性／形容词性；什么的、还是……吧、快要……了、都……了'),
    row('Subjects, predicates and modifiers', '受事主语；名词性短语作谓语；动词短语、主谓短语作定语'),
    row('Result, direction, manner and quantity complements', '错／懂／好／会／完；来／去与复合趋向；动词＋得＋形容词短语；时量与数量'),
    row('Choice questions', 'A 还是 B？', 'grammar-2-haishi'),
    row('Commands and special sentence types', '别；说明的“是”；达到的“有”；处所＋动词＋着；是……的；使令兼语句；给＋双宾语', 'grammar-2-zhe', true),
    row('Comparison and discrepancy', '比；有／没有……这么／那么；比较数量、程度和动作', 'grammar-2-bi', true),
    row('Choice, contrast, cause and rapid sequence', '……还是……；虽然……但是……；因为……所以……；一……就……', 'grammar-2-cause', true),
    row('Immediate sequence', '一……就……', 'grammar-2-as-soon-as'),
    row('Continuing states or actions', '动词＋着', 'grammar-2-zhe', true),
    row('Past experience', '动词＋过', 'grammar-2-guo'),
    row('Ordinals and approximation', '数词＋量词；几；数词＋多＋量词；数词＋量词＋多'),
  ],
  3: [
    row('Word building and directions', '老–、–家、–子、–员；东、南、西、北及中间', 'hsk3-grammar-word-building-lao-prefix', true),
    row('Modals and separable compounds', '需要、该、应该、愿意、得；动宾式和动补式离合词', 'hsk3-grammar-modals-separable-need-should', true),
    row('Question words and reference', '怎样；疑问代词任指／不定指；别人、咱们、别的、其他', 'hsk3-grammar-pronouns-anyone-with-dou', true),
    row('Classifiers, units and reduplication', '名量词、计量单位、借用名量词、动量词；个个、张张', 'hsk3-grammar-measure-object-classifiers', true),
    row('Adverbs and timing', '程度、范围、时间、频率、关联、情态、语气、否定；更、只、才、一边、必须、终于、不用等', 'hsk3-grammar-adverbs-time', true),
    row('Prepositions, conjunctions and particles', '为、向、关于、为了、把、被、根据；或、只有、只要、不但、而且、如果、可是、然后；的话', 'hsk3-grammar-prepositions-about-according-to', true),
    row('Phrase structures and fixed phrases', '同位、动补、数量重叠；不A不B、不一会儿、看来、越来越、看起来、一般来说等', 'phrases-compact-structures', true),
    row('Set sentence frames', '除了、从……起、对……来说、一点儿也不、越……越……、以前／以后、该……了、在……中等', 'phrases-time-and-exceptions', true),
    row('Subjects and multiple modifiers', '动词、形容词或主谓短语作主语；多项定语', 'sentence-parts-verb-subject', true),
    row('Result, extended direction and duration complements', '到／住／走／上；出／起／下；上／起来；下去／下来；动词＋时量＋了', 'complements-phase-and-time', true),
    row('Possibility complements', '动词＋得／不＋动词或形容词', 'complements-possibility'),
    row('Degree complements', '形容词＋得很；形容词／动词＋极了／坏了', 'complements-degree'),
    row('Questions and rhetorical emphasis', '怎样＋动词；不是……吗？', 'sentence-types-questions'),
    row('Disposal with 把', '把＋宾语＋动词＋处所／补语；把＋宾语₁＋动词＋（给）＋宾语₂', 'sentence-types-ba-result-place', true),
    row('Passive with 被', '主语＋被＋（施事）＋动词＋其他成分', 'sentence-types-passive'),
    row('Accompaniment and repeated verbs', '动词₁＋着＋动词₂；动词＋宾语＋同一动词＋补语', 'sentence-types-accompanying-and-repeated-verb'),
    row('Comparative degree, equality and different amounts', '比……更／还／不比；跟……一样；比……多／少／早／晚＋动词＋数量', 'compare-degree', true),
    row('Appearance, disappearance and attitude', '处所＋动词＋补语＋（了）＋数量＋人／物；是……的强调看法', 'existence-appearance-disappearance', true),
    row('Compound clauses', '承接、选择、并列、递进、转折、假设、条件、目的、紧缩', 'clauses-conditions', true),
    row('Approximate numbers', '大概；相邻数词连用', 'hsk3-grammar-measure-actions-approximation'),
  ],
};

const supplementalCopy = (en: string) => ({en, fr: en, ru: en, tr: en});
type Supplement = [GrammarLevel, number, string, string, string, string, string, string[]];
const supplementRows = supplements as Supplement[];
const supplementId = (level: GrammarLevel, group: number) => 'hsk' + level + '-syllabus-' + group;

function syllabusUnits(level: GrammarLevel): GrammarUnit[] {
  return supplementRows.filter(row => row[0] === level).map(([, group, rule, hanzi, pinyin, meaning, sentence, authored]) => {
    const source = baseCoverage[level][group - 1];
    const id = supplementId(level, group);
    const answer = (group + level) % authored.length;
    const options = authored.map((_, index) => authored[(index - answer + authored.length) % authored.length]);
    return {
      id,
      title: supplementalCopy(source.label),
      cards: [{
        id: id + '-rule', pattern: source.patterns, explanation: supplementalCopy(rule),
        example: {hanzi, pinyin, meaning: supplementalCopy(meaning)},
        exercises: [{
          id: id + '-exercise', prompt: supplementalCopy('Complete the sentence.'),
          sentence, options, answer,
          explanation: supplementalCopy(sentence.replace('___', authored[0]) + ' · ' + rule),
        }],
      }],
    };
  });
}

export const grammarCoverage = Object.fromEntries(grammarLevels.map(level => [level,
  baseCoverage[level].map((group, index) =>
    supplementRows.some(([band, order]) => band === level && order === index + 1)
      ? {label: group.label, patterns: group.patterns, card: supplementId(level, index + 1) + '-rule'}
      : group),
])) as Record<GrammarLevel, GrammarCoverageRow[]>;

const legacyUnits = [...batchA, ...batchB];
export const grammarStudyGroups = [
  {level: 1, units: [...grammarFoundations[1], ...syllabusUnits(1)]},
  {level: 2, units: [...grammarFoundations[2], ...syllabusUnits(2)]},
  {level: 3, units: [...legacyUnits, ...syllabusUnits(3)]},
] as const;

export function grammarCoverageTotals(level: GrammarLevel) {
  const rows = grammarCoverage[level];
  return {
    topics: rows.length,
    linked: rows.filter(item => !!item.card).length,
    partial: rows.filter(item => item.partial).length,
  };
}

export function grammarCounts(units: ReadonlyArray<{cards: ReadonlyArray<{exercises: readonly unknown[]}>}>) {
  const cards = units.flatMap(unit => unit.cards);
  return {topics: units.length, cards: cards.length, exercises: cards.reduce((total, card) => total + card.exercises.length, 0)};
}

export function readGrammarSelection(search: string, units: readonly GrammarUnit[]) {
  const params = new URLSearchParams(search);
  const id = params.get('grammarTopic');
  const unit = units.find(item => item.id === id);
  const index = unit?.cards.flatMap(card => card.exercises).findIndex(exercise => exercise.id === params.get('grammarExercise')) ?? -1;
  return {unitId: unit?.id ?? null, index: Math.max(0, index), checklist: params.get('grammarIndex') === 'syllabus'};
}

// This pre-existing key holds guided answers across all visible scopes.
export const grammarDraftKey = 'grammar-hsk3-v1';
export type GrammarAnswers = Record<string, {picked: number; checked: boolean}>;

export function restoreGrammarAnswers(value: unknown, units: readonly GrammarUnit[]): GrammarAnswers {
  const answers: GrammarAnswers = {};
  if (!value || typeof value !== 'object') return answers;
  const stored = value as GrammarAnswers;
  for (const unit of units) for (const card of unit.cards) for (const exercise of card.exercises) {
    const answer = stored[exercise.id];
    if (answer && Number.isInteger(answer.picked) && answer.picked >= 0 &&
      answer.picked < exercise.options.length && typeof answer.checked === 'boolean') {
      answers[exercise.id] = answer;
    }
  }
  return answers;
}
