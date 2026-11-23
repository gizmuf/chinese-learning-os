#!/usr/bin/env node
// Offline compiler for the HSK 2025 study cards. The syllabus supplies recognition levels and
// exact headword levels separately. Chinese OS supplies sentences. CC-CEDICT (CC BY-SA 4.0)
// supplies additional lexical senses, and Make Me a Hanzi / BabelStone supply modern IDS.
// Source notices are carried in the index. Generated data is checked with --check.
import {readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'public/atlas/study-cards/v1');
const check = process.argv.includes('--check');
const draft = process.argv.includes('--draft');
const file = path => resolve(root, path);
const read = path => readFileSync(file(path), 'utf8');
const json = path => JSON.parse(read(path));
const gzip = path => gunzipSync(readFileSync(file(path))).toString('utf8');
const unique = values => [...new Set(values)];
const han = /\p{Script=Han}/u;
const headword = /^[\p{Script=Han}]+$/u;
const text = value => typeof value === 'string' ? value.trim() : '';
const english = value => text(value?.en ?? value);
const sentenceKey = value => value.replace(/[^\p{Script=Han}]/gu, '');
const wordKey = value => value.normalize('NFC').toLowerCase().replace(/[\s’'·-]/gu, '');
const baseKey = value => wordKey(value).replace(/ü/gu, 'v').normalize('NFD').replace(/\p{Mark}/gu, '');
const levelRank = level => level === '7-9' ? 7 : Number(level ?? 8);
const cleanGloss = value => value.replace(/\s*\(CL:[^)]*\)/giu, '').replace(/;?\s*CL:.*$/giu, '')
  .replace(/;?\s*(?:also|Taiwan|coll\.) pr\.\s*\[[^\]]+\]/giu, '')
  .replace(/\s*\|\s*/gu, ' / ').replace(/\s+/gu, ' ').replace(/[; ·]+$/u, '').trim();
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function tonePinyin(value) {
  return value.toLowerCase().replace(/([a-züv:]+)([1-5])/gu, (_, raw, tone) => {
    const syllable = raw.replace(/u:|v/gu, 'ü');
    if (tone === '5') return syllable;
    const vowelIndex = /a/u.test(syllable) ? syllable.indexOf('a') : /e/u.test(syllable) ? syllable.indexOf('e') :
      syllable.includes('ou') ? syllable.indexOf('ou') : syllable.search(/[aeiouü](?!.*[aeiouü])/u);
    const index = vowelIndex < 0 ? syllable.search(/[mn]/u) : vowelIndex;
    if (index < 0) return syllable;
    const marked = (syllable[index] + ['̄', '́', '̌', '̀'][Number(tone) - 1]).normalize('NFC');
    return syllable.slice(0, index) + marked + syllable.slice(index + 1);
  });
}

const official = JSON.parse(gzip('public/dictionary/hsk-levels-2025.json.gz'));
const wordLevels = new Map();
const recognition = new Map();
for (const [level, words] of Object.entries(official.words)) {
  for (const word of unique(words.split('|'))) {
    if (!wordLevels.has(word)) wordLevels.set(word, []);
    wordLevels.get(word).push(level);
  }
}
for (const [level, glyphs] of Object.entries(official.characters)) {
  for (const glyph of glyphs) {
    if (recognition.has(glyph)) throw new Error(`Duplicate official recognition character ${glyph}`);
    recognition.set(glyph, [level]);
  }
}
const targets = [...recognition].filter(([, [level]]) => levelRank(level) <= 3).map(([glyph]) => glyph);
if (targets.length !== 655) throw new Error(`Expected 655 recognition characters, found ${targets.length}`);
const targetSet = new Set(targets);
const requestedLevel = new Set(['1', '2', '3']);
const structureSource = json('data/hanzi-structure.json');
const browse = json('data/hsk-browse-index.json');
const characterSource = JSON.parse(gzip('public/dictionary/characters.json.gz'));
const structure = new Map(structureSource.characters.map(row => [row.hanzi, row]));
const componentReadings = new Map(json('data/study-component-readings.json').components.map(row => [row.glyph, row]));
const simplified = json('data/simplified-dictionary-policy.json');
const canonical = new Set(simplified.canonicalWords);
const curriculum = JSON.parse(read('app/content.ts').match(/export const items: Item\[\] = (\[[\s\S]*?\n\]);/u)[1]);
const confused = json('data/often-confused.json');
const byGlyph = new Map();
const lexicon = new Map();
const corpus = new Map();
const sourceRows = new Map();
const wordCandidates = new Map(targets.map(glyph => [glyph, []]));
const lowLevelSense = new Map();

// Concise teaching glosses for dictionary lines whose only stored gloss is a redirect or
// whose markup contains external cross-references. Headword levels still come from the syllabus.
const lexicalGlosses = new Map(Object.entries({
  下功夫: 'to put effort into; work hard at something', 与其: 'rather than; used before a less preferred option',
  交警: 'traffic police', 体检: 'medical examination; checkup', 做主: 'to make a decision; be in charge',
  做证: 'to testify; give evidence', 八卦: 'gossip; the eight trigrams', 卫视: 'satellite television',
  差点儿: 'almost; nearly', 星系: 'galaxy; star system', 玩意儿: 'thing; object (colloquial)',
  电商: 'e-commerce', 磨炼: 'to toughen through practice or hardship', 起到: 'to have an effect; play a role',
  辞典: 'dictionary', 院长: 'head of an institute, hospital or college', 非洲: 'Africa', 驾照: "driver's license",
}));

function lexicalTerm(hanzi, pinyin, english) {
  return {hanzi, pinyin, english, levels: wordLevels.get(hanzi) ?? []};
}

function addSense(hanzi, pinyin, gloss, priority, original = false) {
  if (!headword.test(hanzi) || !pinyin || !gloss) return;
  const term = lexicalTerm(hanzi, pinyin, lexicalGlosses.get(hanzi) ?? cleanGloss(gloss));
  const senses = lexicon.get(hanzi) ?? [];
  const key = wordKey(pinyin);
  if (senses.some(entry => entry.key === key && (entry.term.english === term.english || entry.priority < priority))) return;
  senses.push({term, priority, key, base: baseKey(pinyin)});
  lexicon.set(hanzi, senses);
  if (!original) return;
  for (const glyph of unique([...hanzi])) {
    if (targetSet.has(glyph)) wordCandidates.get(glyph).push({term, priority, key});
  }
}

for (const row of curriculum) {
  addSense(row.hanzi, row.pinyin, row.english, row.hskLevel ? 0 : 1, true);
  if (row.hskLevel && !wordLevels.get(row.hanzi)?.includes(String(row.hskLevel))) {
    throw new Error(`Curriculum headword outside its exact official level: ${row.hanzi} ${row.hskLevel}`);
  }
  if (row.hskLevel && [...row.hanzi].length === 1) {
    const senses = lowLevelSense.get(row.hanzi) ?? [];
    senses.push(row);
    lowLevelSense.set(row.hanzi, senses);
  }
}

const corpusPaths = [
  'data/mandarin-320.json', 'data/hanzi-families-2026-11-17.json', 'data/often-confused.json',
  'data/practical-2026-11-16/content.json', 'data/practical-2026-11-17/sections-01-07.json',
  'data/practical-2026-11-17/sections-08-14.json', 'data/reference-lessons/movement-directions.json',
  'data/reference-lessons/shang.json', 'data/reference-lessons/time-dates.json',
  'data/reference-lessons/teaching.json', 'data/connectors-phone-lesson.json',
  'data/reading-lab.json', 'data/reading-lab-podcast-53.json',
  'data/shuoshuo-morning.json', 'data/shuoshuo-companion.json', 'data/my-day-01-v2.json',
  'data/video-self-introduction/content.json', 'data/speaking-chunks/content.json',
  'data/hsk-grammar-supplements.json', 'data/grammar-hsk3-a.json', 'data/grammar-hsk3-b.json',
  ...Array.from({length: 9}, (_, i) => `data/lesson${String(i + 4).padStart(2, '0')}/content.json`),
];

function addExample(hanzi, pinyin, gloss, source, anchor, priority) {
  hanzi = text(hanzi);
  pinyin = text(pinyin);
  gloss = english(gloss);
  if (!hanzi || !pinyin || !gloss || !/[。？！.!?]$/u.test(hanzi)) return;
  const count = [...hanzi].filter(glyph => han.test(glyph)).length;
  if (count < 4 || count > 32 || [...hanzi].some(glyph => !han.test(glyph) && /[\p{Letter}\p{Number}]/u.test(glyph))) return;
  const previous = corpus.get(hanzi);
  if (!previous || priority < previous.priority) corpus.set(hanzi, {hanzi, pinyin, english: gloss, source, priority, anchor});
  if (anchor && headword.test(anchor) && hanzi.includes(anchor)) {
    const rows = sourceRows.get(anchor) ?? [];
    if (!rows.includes(hanzi)) rows.push(hanzi);
    sourceRows.set(anchor, rows);
  }
}

function visitCorpus(value, source, priority = 2) {
  if (Array.isArray(value)) {
    for (const row of value) visitCorpus(row, source, priority);
    return;
  }
  if (!value || typeof value !== 'object') return;
  const hanzi = text(value.hanzi) || text(value.zh);
  const pinyin = text(value.pinyin);
  const gloss = english(value.english ?? value.meaning ?? value.translation ?? value.en);
  if (headword.test(hanzi) && [...hanzi].length <= 8) addSense(hanzi, pinyin, gloss, priority, true);
  if (hanzi) addExample(hanzi, pinyin, gloss, source, undefined, priority);
  const sentence = text(value.sentence) || text(value.example);
  if (sentence) addExample(sentence, value.sentencePinyin ?? value.example_pinyin,
    value.translation ?? value.example_meaning, source, hanzi, priority);
  for (const child of Object.values(value)) if (child && typeof child === 'object') visitCorpus(child, source, priority);
}

for (const row of curriculum) {
  addExample(row.sentence, row.sentencePinyin, row.translation, 'app/content.ts', row.hanzi, 1);
}
for (const path of corpusPaths) visitCorpus(json(path), path);
const supplementName = 'data/atlas-study-examples.tsv';
if (existsSync(file(supplementName))) {
  for (const line of read(supplementName).split('\n').filter(line => line && !line.startsWith('#'))) {
    const [hanzi, pinyin, gloss, anchor, termPinyin, termEnglish] = line.split('\t');
    if (!hanzi || !pinyin || !gloss || !anchor) throw new Error(`Invalid example supplement: ${line}`);
    addSense(anchor, termPinyin, termEnglish, 1, true);
    addExample(hanzi, pinyin, gloss, supplementName, anchor, 1);
  }
}

const collocationPath = 'data/atlas-study-collocations.tsv';
let editedCollocations = 0;
if (existsSync(file(collocationPath))) {
  const pairs = new Set();
  for (const line of read(collocationPath).split('\n').filter(line => line && !line.startsWith('#'))) {
    const [glyph, hanzi, pinyin, gloss, ...rest] = line.trimEnd().split('\t');
    if (!targetSet.has(glyph) || !headword.test(hanzi) || !hanzi.includes(glyph) || !pinyin || !gloss || rest.length ||
        pairs.has(`${glyph}:${hanzi}`)) throw new Error(`Invalid edited collocation row: ${line}`);
    pairs.add(`${glyph}:${hanzi}`);
    addSense(hanzi, pinyin, gloss, 1);
    wordCandidates.get(glyph).push({term: lexicalTerm(hanzi, pinyin, gloss), priority: 1, edited: true});
    editedCollocations++;
  }
}

function cedictGloss(raw) {
  const selected = raw.split('/').map(cleanGloss).filter(sense => sense &&
    !/^(CL:|(?:old |archaic |dated )?variant of |see |abbr\. for )/iu.test(sense) &&
    !/\([^)]+\[[^\]]+\][^)]*\)/u.test(sense));
  return selected.filter(sense => !/\((?:arch\.|old|dialect|surname|literary)\)/iu.test(sense)).slice(0, 3).join('; ');
}

for (const line of gzip('resources/cc-cedict/cedict.txt.gz').split('\n')) {
  const entry = line.trimEnd().match(/^\S+ (\S+) \[([^\]]+)\] \/(.+)\/$/u);
  if (!entry) continue;
  const [, hanzi, pinyin, raw] = entry;
  if (!headword.test(hanzi) || (!canonical.has(hanzi) && !wordLevels.has(hanzi))) continue;
  if (/(?:\b(?:surname|variant of)\b)/iu.test(raw.split('/')[0]) || /^[A-Z]/u.test(pinyin)) continue;
  const gloss = cedictGloss(raw);
  if (gloss) addSense(hanzi, tonePinyin(pinyin), gloss, 4);
}

for (const row of browse.words) {
  if (!lexicon.has(row.hanzi)) addSense(row.hanzi, row.pinyin.split(' / ')[0], row.meaning, 5);
}

// Avoid using an independent gloss as a statement about the role of a radical inside a glyph.
const componentLabels = new Map(Object.entries({
  '亻': ['rén', 'person form'], '氵': ['shuǐ', 'water form'], '氺': ['shuǐ', 'water form'],
  '忄': ['xīn', 'heart form'], '⺗': ['xīn', 'heart form'], '扌': ['shǒu', 'hand form'],
  '讠': ['yán', 'speech form'], '阝': ['', 'side radical form (阜 on the left, 邑 on the right)'],
  '月': ['yuè', '月 form'], '⺼': ['', 'body form'], '彐': ['jì', '彐 form'],
  '口': ['kǒu', 'mouth; opening'], '日': ['rì', 'sun; day'], '青': ['qīng', 'blue-green'],
  '乛': ['', 'horizontal hook stroke'], '亅': ['', 'vertical hook stroke'], '丨': ['', 'vertical stroke'],
  '丿': ['', 'left-falling stroke'], '丶': ['', 'dot stroke'], '㇏': ['', 'right-falling stroke'],
  '㇀': ['', 'rising stroke'], '丅': ['', '丅 form'],
  '艹': ['cǎo', 'grass form'], '宀': ['mián', 'roof form'], '广': ['guǎng', '广 form'],
  '冖': ['mì', 'cover form'], '囗': ['wéi', 'enclosure'], '辶': ['', 'movement form'],
  '冫': ['bīng', 'ice form'], '灬': ['', 'four-dot form'], '刂': ['dāo', 'knife form'],
  '⺮': ['zhú', 'bamboo form'], '纟': ['sī', 'silk form'], '犭': ['quǎn', 'dog form'],
  '饣': ['shí', 'food form'], '钅': ['jīn', 'metal form'], '⻊': ['zú', 'foot form'],
  '衤': ['yī', 'clothing form'], '礻': ['shì', 'altar form'], '牜': ['niú', 'ox form'],
  '王': ['wáng', 'king; 王 form'], '⺩': ['', '王-shaped component'], '攵': ['pū', 'strike form'],
  '龶': ['', '龶 form'], '⺍': ['', 'three-stroke top form'], '𠂉': ['', '𠂉 form'],
}));

// Names used to identify graphic shapes in Mandarin. They are separate from readings.
const componentNames = new Map(Object.entries({
  '一': 'héng', '丨': 'shù', '丿': 'piě', '丶': 'diǎn', '亅': 'shùgōu',
  '乛': 'hénggōu', '㇏': 'nà', '㇀': 'tí',
  '辶': 'zǒuzhīpáng', '灬': 'sìdiǎndǐ', '阝': 'shuāng’ěrpáng',
  '亻': 'dānlìrén', '氵': 'sāndiǎnshuǐ', '扌': 'tíshǒupáng', '忄': 'shùxīnpáng',
  '艹': 'cǎozìtóu', '讠': 'yánzìpáng', '纟': 'jiǎosīpáng', '刂': 'lìdāopáng',
  '冫': 'liǎngdiǎnshuǐ', '钅': 'jīnzìpáng',
}));

// Reviewed short definitions where the first curriculum sense or the source's single
// reading leaves a common modern sense unexplained.
const characterGlosses = new Map(Object.entries({
  了: 'le: completed action or change of state; liǎo: finish, understand',
  口: 'mouth; opening; measure word for family members',
  调: 'tiáo: adjust, regulate; diào: transfer, tone or melody',
  着: 'zhe: ongoing state particle; zháo: touch or reach a result; zhuó: attach, apply; zhāo: a move',
  咖: 'kā in 咖啡 (coffee); gā in 咖喱 (curry)',
  啡: 'fēi in 咖啡 (coffee)',
  苹: 'píng in 苹果 (apple)',
  经: 'to pass through; to undergo; classic text',
}));

const editorialPath = 'data/atlas-study-entry-glosses.tsv';
const editorialEntries = new Map();
if (existsSync(file(editorialPath))) {
  for (const line of read(editorialPath).split('\n').filter(line => line && !line.startsWith('#'))) {
    const [glyph, pinyin, gloss, ...rest] = line.trimEnd().split('\t');
    if (!targetSet.has(glyph) || editorialEntries.has(glyph) || !pinyin || !gloss || rest.length ||
        !/^[\p{Letter}\p{Mark}]+(?: \/ [\p{Letter}\p{Mark}]+)*$/u.test(pinyin)) {
      throw new Error(`Invalid edited headword row: ${line}`);
    }
    editorialEntries.set(glyph, {pinyin, english: gloss});
  }
}

for (const [glyph, officialLevels] of recognition) {
  const definition = structure.get(glyph) ?? characterSource[glyph] ?? {};
  const lower = lowLevelSense.get(glyph) ?? [];
  const dictionary = lexicon.get(glyph) ?? [];
  const readings = unique([...lower.map(row => row.pinyin),
    ...(definition.readings ?? definition.pinyin ?? []), ...dictionary.map(row => row.term.pinyin)])
    .filter(value => value && /^[\p{Letter}\p{Mark}’']+$/u.test(value));
  const meanings = unique(lower.map(row => row.english));
  const gloss = characterGlosses.get(glyph) || meanings.join('; ') || dictionary.find(row => row.priority < 4)?.term.english ||
    definition.definition || dictionary[0]?.term.english || '';
  byGlyph.set(glyph, {hanzi: glyph, pinyin: readings.join(' / '), english: cleanGloss(gloss),
    ...editorialEntries.get(glyph), levels: officialLevels});
}

function characterTerm(glyph) {
  if (byGlyph.has(glyph)) return byGlyph.get(glyph);
  const definition = characterSource[glyph] ?? {};
  return {hanzi: glyph, pinyin: definition.pinyin?.join(' / ') ?? '', english: cleanGloss(definition.definition ?? ''), levels: []};
}

function componentTerm(glyph) {
  const namePinyin = componentNames.get(glyph);
  const name = namePinyin ? {namePinyin} : {};
  const label = componentLabels.get(glyph);
  if (label) return {hanzi: glyph, pinyin: label[0], english: label[1], levels: recognition.get(glyph) ?? [], ...name};
  const entry = characterTerm(glyph);
  const source = componentReadings.get(glyph);
  const special = structureSource.namedComponents[glyph];
  return {...entry, ...name, pinyin: entry.pinyin || source?.pinyin || '',
    english: special?.label.en || entry.english || source?.meaning || `${glyph} form`};
}

const positions = {
  '⿰': ['left', 'right'], '⿱': ['top', 'bottom'], '⿲': ['left', 'middle', 'right'],
  '⿳': ['top', 'middle', 'bottom'], '⿴': ['around', 'inside'], '⿵': ['around', 'inside'],
  '⿶': ['around', 'inside'], '⿷': ['around', 'inside'], '⿸': ['around', 'inside'],
  '⿹': ['around', 'inside'], '⿺': ['around', 'inside'], '⿼': ['around', 'inside'],
  '⿽': ['around', 'inside'], '⿻': ['overlapping', 'overlapping'],
};
const structuralShapes = new Map();
function parseIds(ids) {
  const glyphs = [...ids];
  let offset = 0;
  function readTree() {
    const glyph = glyphs[offset++];
    const layout = positions[glyph];
    return layout ? {operator: glyph, operands: layout.map(readTree)} : {component: glyph};
  }
  const tree = readTree();
  if (offset === glyphs.length) return tree;
}
function directParts(tree) {
  if (!tree?.operands) return [];
  function leaves(node, region) {
    if (node.component) return [{glyph: node.component, position: region}];
    return node.operands.flatMap(child => leaves(child, region));
  }
  return tree.operands.flatMap((operand, index) => leaves(operand, positions[tree.operator][index]))
    .filter(part => part.glyph !== '?' && part.glyph !== '？');
}
// CJK stroke symbols and removable single strokes stay visible in the composition. The family
// index omits those bare fragments, so a query like "rain" does not become a list of shared dots.
const familyEligible = glyph => !/[\u31c0-\u31ef]/u.test(glyph) && !'一丨丶丿乀乁乚乛𠃌𠄌亅乙'.includes(glyph);
const familyIndex = new Map();
for (const glyph of recognition.keys()) {
  const known = structure.get(glyph);
  const fallback = characterSource[glyph]?.decomposition;
  const tree = known?.decompositionTree ?? (fallback ? parseIds(fallback) : undefined);
  const parts = directParts(tree);
  structuralShapes.set(glyph, {tree, parts});
  for (const part of parts) {
    if (!familyEligible(part.glyph)) continue;
    const members = familyIndex.get(part.glyph) ?? new Map();
    const placements = members.get(glyph) ?? [];
    if (!placements.includes(part.position)) placements.push(part.position);
    members.set(glyph, placements);
    familyIndex.set(part.glyph, members);
  }
}

const compareGlyph = (a, b) => levelRank(recognition.get(a)?.[0]) - levelRank(recognition.get(b)?.[0]) || compare(a, b);
// Alternate written forms are recorded in the Assembly family teaching index.
const familyVariants = {人: '亻', 水: '氵', 手: '扌', 心: '忄', 言: '讠', 金: '钅', 食: '饣', 犬: '犭', 足: '⻊'};
const familyNotes = {
  '月': 'The written 月 form can represent the moon or a body component, depending on the character.',
  '阝': 'The left-side form comes from 阜. The right-side form comes from 邑.',
  '灬': 'The four dots can be a fire form. Their origin depends on the whole character.',
};
const familyLimit = 16;

const horizontalExamples = {
  '一': ['三', '下', '上', '旦'],
  '再': ['三', '下', '二'],
  '卫': ['上', '旦', '二'],
};

function familyFallback(glyph, parts) {
  const horizontal = horizontalExamples[glyph];
  if (horizontal) {
    const position = parts.find(part => part.glyph === '一')?.position;
    const self = structuralShapes.get(glyph)?.tree?.component === '一';
    const members = horizontal.filter(peer => structuralShapes.get(peer)?.parts.some(part =>
      part.glyph === '一' && (self || part.position === position))).map(characterTerm);
    if ((!position && !self) || members.length !== horizontal.length) throw new Error(`Unverified stroke family for ${glyph}`);
    const notes = self ? {
      en: '一 is the whole one-stroke character. The horizontal stroke is on top in 三 and 下, and at the bottom in 上 and 旦.',
      pl: '一 to cały znak zapisany jedną kreską. W 三 i 下 ta pozioma kreska jest na górze, a w 上 i 旦 na dole.',
    } : {
      en: `Find the same horizontal stroke ${position === 'top' ? 'at the top' : 'at the bottom'} of each character.`,
      pl: `Znajdź tę samą poziomą kreskę ${position === 'top' ? 'u góry' : 'na dole'} każdego znaku.`,
    };
    return [{part: componentTerm('一'), ...(position ? {position} : {}), members, notes}];
  }
  if (glyph === '舞') {
    const anchor = parts.find(part => part.glyph === '舛');
    const shun = directParts(parseIds(characterSource.舜.decomposition));
    const blink = structuralShapes.get('瞬')?.parts;
    if (!anchor || !shun.some(part => part.glyph === '舛') || !blink?.some(part => part.glyph === '舜')) {
      throw new Error('Unverified 舛 family for 舞');
    }
    return [{part: componentTerm('舛'), position: anchor.position, members: ['舜', '瞬'].map(characterTerm), notes: {
      en: '舛 is directly at the bottom of 舞 and 舜. In 瞬 it is nested inside 舜, on the right.',
      pl: '舛 znajduje się na dole 舞 i 舜. W 瞬 jest częścią 舜 po prawej stronie.',
    }}];
  }
  if (glyph === '已') {
    if (characterSource.已.radical !== '己' || characterSource.己.radical !== '己') {
      throw new Error('Unverified 己 dictionary radical for 已');
    }
    return [{part: componentTerm('己'), basis: 'dictionary-radical', members: [characterTerm('己')], notes: {
      en: 'The character dictionary indexes 已 and 己 under the 己 radical. 已 is a whole shape in the modern structure source.',
      pl: 'Słownik grupuje 已 i 己 pod kluczem 己. Źródło opisujące współczesną budowę podaje 已 jako cały kształt.',
    }}];
  }
  return [];
}

function makeFamilies(glyph, parts) {
  const anchors = [...parts.filter(part => familyEligible(part.glyph) && part.glyph !== glyph)];
  const variant = familyVariants[glyph];
  if (variant) anchors.unshift({glyph: variant});
  if (familyIndex.has(glyph)) anchors.push({glyph});
  const results = [];
  for (const anchor of unique(anchors.map(part => part.glyph))) {
    const {position} = anchors.find(part => part.glyph === anchor);
    const peers = [...(familyIndex.get(anchor) ?? [])].filter(([member, placements]) => member !== glyph &&
      (anchor !== '阝' || placements.includes(position)));
    if (anchor !== glyph && recognition.has(anchor)) peers.push([anchor, []]);
    peers.sort(([a, aa], [b, bb]) =>
      Number(bb.includes(position)) - Number(aa.includes(position)) || compareGlyph(a, b));
    const members = peers.slice(0, familyLimit).map(([member]) => characterTerm(member)).filter(term => term.pinyin && term.english);
    if (members.length) results.push({part: componentTerm(anchor), ...(position ? {position} : {}), members,
      ...(familyNotes[anchor] ? {notes: {en: familyNotes[anchor]}} : {})});
  }
  return results.length ? results.slice(0, 4) : familyFallback(glyph, parts);
}

const confusedLookups = new Map(confused.items.map(row => [row.id, row]));
const contrasts = new Map();
for (const group of confused.groups) {
  const rows = group.items.map(id => confusedLookups.get(id)).filter(Boolean);
  const note = english(group.note);
  for (const row of rows) {
    if (!targetSet.has(row.hanzi) || !note.includes(row.hanzi)) continue;
    const list = contrasts.get(row.hanzi) ?? [];
    for (const other of rows) {
      if (other.hanzi === row.hanzi || !headword.test(other.hanzi) || !note.includes(other.hanzi) ||
          list.some(item => item.term.hanzi === other.hanzi)) continue;
      const term = [...other.hanzi].length === 1 ? characterTerm(other.hanzi) : lexicalTerm(other.hanzi, other.pinyin, english(other.meaning));
      if (term.pinyin && term.english) list.push({term, note});
    }
    contrasts.set(row.hanzi, list);
  }
}
const bySound = new Map();
for (const glyph of targets) {
  for (const reading of characterTerm(glyph).pinyin.split(' / ')) {
    if (!reading) continue;
    const matches = bySound.get(reading) ?? [];
    matches.push(glyph);
    bySound.set(reading, matches);
  }
}

// Direct visual comparisons. These cues describe visible marks, never component origins.
const shapeContrasts = {
  '一': [['二', '一 has one horizontal stroke. 二 has two, with the longer stroke below.']],
  '二': [['三', '二 has two horizontal strokes. 三 has three, with the longest stroke at the bottom.']],
  '口': [['囗', '口 is the mouth or opening form. 囗 is the enclosing frame that surrounds another part, as in 国.']],
  '了': [['子', '子 has a horizontal line through the lower half. 了 has no line there.']],
  '牛': [['午', 'The long vertical in 牛 crosses the upper horizontal. In 午 it meets the upper horizontal at its end.']],
  '女': [['妈', 'Find 女 on its own, then at the left of 妈 before 马. Its horizontal stroke changes shape to fit the left side.']],
  '朋': [['明', '朋 uses the 月 shape twice. 明 has 日 on the left and 月 on the right.']],
  '人': [['入', 'In 人 the right-falling stroke starts lower than the left-falling stroke. In 入 the right-falling stroke starts higher.']],
  '太': [['大', '太 adds one dot below the crossing of the strokes in 大.']],
  '习': [['羽', '羽 has a matching pair of folded shapes with two short marks in each. 习 has a single folded shape with two short marks.']],
  '从': [['众', '从 has two 人 forms side by side. 众 has a third 人 at the top.']],
  '门': [['问', '门 is the frame. 问 has an extra 口 inside it.']],
  '鸟': [['乌', 'Look for the dot inside the upper part of 鸟. 乌 has no dot in that spot.']],
  '丈': [['大', '丈 and 大 both have crossing strokes. In 丈 the final sweep crosses the long left-falling stroke.']],
  '必': [['心', '必 has a long diagonal stroke that crosses the central portion. 心 has an open curved stroke and three separate dots.']],
  '才': [['寸', '才 has a diagonal left-falling stroke. 寸 uses a separate dot.']],
  '耳': [['闻', '耳 is the whole character on its own. 闻 places 耳 inside 门.']],
  '方': [['万', '方 has a dot at the top. 万 starts with a horizontal line and has no dot.']],
  '片': [['爿', 'The hook of 片 is on the right. The vertical of 爿 is on the left, with strokes projecting to its right.']],
  '双': [['对', '双 has 又 on both sides. 对 has 又 on the left and 寸 on the right.']],
  '用': [['月', '用 has a central vertical that crosses its inside horizontals. 月 has no central vertical.']],
  '已': [['己', 'In 已 the left vertical reaches the middle horizontal. In 己 it starts below it.']],
  '再': [['冉', '再 has an extra horizontal stroke at the top compared with 冉.']],
};

function placementText(position) {
  return ({left: 'on the left', right: 'on the right', middle: 'in the middle', top: 'at the top',
    bottom: 'at the bottom', around: 'around another part', inside: 'inside the enclosing part',
    overlapping: 'as an overlapping part'})[position];
}
function makeComparisons(glyph, families) {
  const reviewed = (shapeContrasts[glyph] ?? []).map(([other, note]) => ({term: componentTerm(other), note}));
  const related = [...reviewed, ...(contrasts.get(glyph) ?? [])].sort((a, b) => a.term.hanzi.length - b.term.hanzi.length);
  for (const family of families) {
    const anchor = family.part.hanzi;
    const comparison = family.members.find(term => term.hanzi !== anchor &&
      !related.some(row => row.term.hanzi === term.hanzi) &&
      family.position && structuralShapes.get(term.hanzi)?.parts.some(part => part.glyph === anchor && part.position === family.position));
    if (!comparison) continue;
    const other = structuralShapes.get(comparison.hanzi).parts.filter(part => part.glyph !== anchor).map(part => part.glyph);
    const own = structuralShapes.get(glyph).parts.filter(part => part.glyph !== anchor).map(part => part.glyph);
    if (!own.length || !other.length || own.join('') === other.join('')) continue;
    related.push({term: comparison,
      note: `${glyph} and ${comparison.hanzi} both use ${anchor} ${placementText(family.position)}. Compare ${own.join(' + ')} in ${glyph} with ${other.join(' + ')} in ${comparison.hanzi}.`});
  }
  const entry = characterTerm(glyph);
  for (const reading of entry.pinyin.split(' / ')) {
    const other = bySound.get(reading)?.find(candidate => candidate !== glyph && !related.some(row => row.term.hanzi === candidate));
    if (!other || reading.length < 2) continue;
    const term = characterTerm(other);
    related.push({term, note: `Both have a reading ${reading}. Compare ${glyph} (${entry.english.split(';')[0]}) and ${other} (${term.english.split(';')[0]}).`});
    break;
  }
  return related.slice(0, 4);
}

const characterReadings = new Map();
for (const [glyph, row] of Object.entries(characterSource)) {
  const values = unique([...(row.pinyin ?? []), ...(lexicon.get(glyph) ?? []).map(sense => sense.term.pinyin)])
    .filter(value => /^[\p{Letter}\p{Mark}]+$/u.test(value));
  if (values.length) characterReadings.set(glyph, values);
}
for (const [glyph, values] of Object.entries({
  儿: ['r'], 一: ['yī', 'yí', 'yì', 'yi'], 不: ['bù', 'bú', 'bu'], 的: ['de'], 地: ['de'], 得: ['de'],
  了: ['le'], 吧: ['ba'], 啊: ['a'], 呢: ['ne'], 吗: ['ma'], 嘛: ['ma'], 着: ['zhe'], 过: ['guo'],
})) characterReadings.set(glyph, unique([...values, ...(characterReadings.get(glyph) ?? [])]));

function alignPinyin(row) {
  const glyphs = [...row.hanzi].filter(glyph => han.test(glyph));
  const pinyin = row.pinyin.toLowerCase().normalize('NFC').match(/[a-züêāáǎàēéěèōóǒòīíǐìūúǔùǖǘǚǜńňǹḿ\p{Mark}]+/gu) ?? [];
  const given = pinyin.join('');
  const boundaries = new Set();
  let offset = 0;
  for (const word of pinyin) {
    offset += word.length;
    boundaries.add(offset);
  }
  const memo = new Map();
  function align(index, start) {
    if (index === glyphs.length) return start === given.length ? {score: 0, slices: []} : undefined;
    const key = index * (given.length + 1) + start;
    if (memo.has(key)) return memo.get(key);
    let best;
    const candidates = characterReadings.get(glyphs[index]) ?? [];
    for (const length of unique(candidates.map(value => value.length))) {
      const end = start + length;
      if (end > given.length || [...boundaries].some(point => point > start && point < end)) continue;
      const reading = given.slice(start, end);
      const exact = candidates.includes(reading);
      if (!exact && !candidates.some(value => baseKey(value) === baseKey(reading))) continue;
      const remaining = align(index + 1, end);
      if (!remaining) continue;
      const score = remaining.score + (exact ? 3 : 1) + Number(boundaries.has(end));
      if (!best || score > best.score) best = {score, slices: [{reading, end, exact}, ...remaining.slices]};
    }
    memo.set(key, best);
    return best;
  }
  const result = align(0, 0);
  if (!result || result.slices.filter(row => !row.exact).length > Math.ceil(glyphs.length * .3)) return;
  return {glyphs, readings: result.slices.map(slice => slice.reading), boundaries: result.slices.map(slice => boundaries.has(slice.end))};
}

const grammarGlosses = new Map([
  ['的:de', 'possessive and attributive particle'], ['地:de', 'adverbial particle'], ['得:de', 'complement particle'],
  ['得:děi', 'must; have to'], ['了:le', 'completed action or change of state'], ['着:zhe', 'ongoing state particle'],
  ['过:guo', 'experience particle'], ['谁:shuí', 'who'], ['谁:shéi', 'who'], ['不:bú', 'not'], ['个:ge', 'general measure word'],
  ['一:yí', 'one'], ['一:yì', 'one'], ['儿:r', 'rhotacized suffix'], ['们:men', 'plural marker'],
  ['子:zi', 'noun suffix'], ['呢:ne', 'sentence-final particle'], ['吧:ba', 'suggestion or softening particle'],
  ['吗:ma', 'yes/no question particle'], ['啊:a', 'sentence-final particle or interjection'],
]);

function tokenEnglish(senses, reading) {
  const key = wordKey(reading);
  return senses.find(sense => sense.key === key) ?? senses.find(sense => sense.base === baseKey(reading));
}
function spokenPinyin(readings) {
  return readings.map((reading, i) => i && /^[aeo]/u.test(baseKey(reading)) ? "'" + reading : reading).join('');
}

function annotateSentence(row) {
  const alignment = alignPinyin(row);
  if (!alignment) return;
  const {glyphs, readings, boundaries} = alignment;
  const ends = [];
  let length = 0;
  for (const glyph of row.hanzi) {
    if (han.test(glyph)) ends.push(length++);
    else length++;
  }
  const best = Array(glyphs.length + 1);
  best[glyphs.length] = {score: 0, words: []};
  for (let start = glyphs.length - 1; start >= 0; start--) {
    // Punctuation is a real token boundary. A dictionary match may not straddle it.
    const max = Math.min(start + 8, glyphs.length);
    for (let end = start + 1; end <= max; end++) {
      if (ends[end - 1] - ends[start] !== end - start - 1) break;
      const hanzi = glyphs.slice(start, end).join('');
      const pinyin = spokenPinyin(readings.slice(start, end));
      const sense = tokenEnglish(lexicon.get(hanzi) ?? [], pinyin);
      const grammar = grammarGlosses.get(`${hanzi}:${pinyin}`);
      if (!sense && !grammar && end > start + 1) continue;
      const gloss = grammar || sense?.term.english || (characterReadings.get(hanzi)?.length === 1 ? characterTerm(hanzi).english : '');
      const term = gloss ? lexicalTerm(hanzi, pinyin, gloss) : undefined;
      const exact = sense?.key === wordKey(pinyin);
      const tokenLength = end - start;
      const isAnchor = row.anchor === hanzi;
      const authoredBoundary = (start === 0 || boundaries[start - 1]) && boundaries[end - 1] &&
        !boundaries.slice(start, end - 1).some(Boolean);
      const score = best[end].score + (term ? 4 : -8) + (tokenLength - 1) * 9 + (exact ? 1 : 0) +
        (wordLevels.has(hanzi) ? 2 : 0) + (sense && sense.priority < 4 ? 2 : 0) +
        (isAnchor ? 12 : 0) + (authoredBoundary && tokenLength > 1 ? 4 : 0);
      if (!best[start] || score > best[start].score) {
        best[start] = {score, words: term ? [term, ...best[end].words] : best[end].words};
      }
    }
  }
  const words = best[0].words;
  const covered = words.reduce((sum, word) => sum + [...word.hanzi].length, 0);
  // Reject candidates when an unfamiliar name or ambiguous token has no reliable gloss.
  if (covered !== glyphs.length) return;
  return {hanzi: row.hanzi, pinyin: row.pinyin, english: row.english, words};
}

const annotated = new Map();
const contextsByGlyph = new Map(targets.map(glyph => [glyph, []]));
const contextsByWord = new Map();
for (const row of corpus.values()) {
  const example = annotateSentence(row);
  if (!example) continue;
  annotated.set(row.hanzi, example);
  for (const glyph of unique([...row.hanzi])) {
    if (targetSet.has(glyph)) contextsByGlyph.get(glyph).push(row);
  }
  for (const word of example.words) {
    const matches = contextsByWord.get(word.hanzi) ?? [];
    if (!matches.includes(row)) matches.push(row);
    contextsByWord.set(word.hanzi, matches);
    const sense = tokenEnglish(lexicon.get(word.hanzi) ?? [], word.pinyin);
    for (const glyph of unique([...word.hanzi])) {
      if (targetSet.has(glyph)) wordCandidates.get(glyph).push({term: sense?.term ?? word, key: wordKey(word.pinyin), priority: 3});
    }
  }
}

function contextualReadingKey(term) {
  const key = wordKey(term.pinyin);
  if (term.hanzi.startsWith('一')) return key.replace(/^(yī|yí|yì)/u, 'yi');
  if (term.hanzi.startsWith('不')) return key.replace(/^(bù|bú)/u, 'bu');
  return key;
}

function matchingExample(term, rows) {
  for (const row of rows) {
    const example = annotated.get(typeof row === 'string' ? row : row.hanzi);
    if (!example) continue;
    const matching = example.words.some(word => word.hanzi === term.hanzi && contextualReadingKey(word) === contextualReadingKey(term));
    if (matching) return example;
  }
}

for (const [word, officialLevels] of wordLevels) {
  if (officialLevels.some(level => requestedLevel.has(level)) || [...word].length < 2) continue;
  const senses = lexicon.get(word);
  if (!senses?.length) continue;
  const {term, key, priority} = senses[0];
  for (const glyph of unique([...word])) {
    if (targetSet.has(glyph)) wordCandidates.get(glyph).push({term, key, priority});
  }
}

function makeWords(glyph) {
  const list = wordCandidates.get(glyph);
  const best = new Map();
  for (const row of list) {
    const {term, priority} = row;
    if ([...term.hanzi].length > 5 || term.english.length > 200 || !/^[\p{Letter}\p{Mark}\s’'·-]+$/u.test(term.pinyin)) continue;
    const rank = levelRank(term.levels[0]);
    const gap = rank <= 3 ? 0 : rank < 8 ? 1.5 + (rank - 4) * .3 : 3;
    const anchored = sourceRows.get(term.hanzi) ?? [];
    const candidates = [...anchored, ...(contextsByWord.get(term.hanzi) ?? [])];
    const example = matchingExample(term, candidates);
    // Keep non-syllabus material to sourced lexical items that actually occur as words in an example.
    if (rank === 8 && !example && !row.edited) continue;
    const length = [...term.hanzi].length;
    const score = gap + priority * .2 + (example ? -2 : 0) + (length - 2) * .7 - (row.edited ? 3 : 0);
    // A bare glyph is useful when it is an exact listed word or has a real lesson use.
    if (length === 1 && rank > 3 && !example) continue;
    const key = term.hanzi;
    if (!best.has(key) || score < best.get(key).score) {
      best.set(key, {word: {...term, ...(example ? {example} : {})}, score, edited: row.edited});
    }
  }
  const rank = (a, b) => a.score - b.score || compare(a.word.hanzi, b.word.hanzi);
  let supplemental = 0;
  return [...best.values()].sort(rank).filter(({word, edited}) => {
    const lower = word.levels.some(level => requestedLevel.has(level));
    return edited || lower || word.example || ++supplemental <= 7;
  }).slice(0, 15).map(row => row.word);
}

function makeContexts(glyph, words) {
  const ownHeadwords = new Set(words.map(word => word.hanzi));
  const used = new Set();
  const usedSentences = new Set();
  function rank(row) {
    const example = annotated.get(row.hanzi);
    const fullCoverage = example.words.reduce((total, word) => total + [...word.hanzi].length, 0) ===
      [...example.hanzi].filter(glyph => han.test(glyph)).length;
    const inFocus = row.anchor && row.anchor.includes(glyph);
    const focusWord = example.words.find(word => word.hanzi === row.anchor && word.hanzi.includes(glyph)) ??
      example.words.find(word => word.hanzi.includes(glyph));
    return (inFocus ? -7 : 0) + (!fullCoverage ? 6 : 0) + row.priority * 2 +
      (focusWord && ownHeadwords.has(focusWord.hanzi) ? -1 : 0) + row.hanzi.length * .12;
  }
  const candidates = contextsByGlyph.get(glyph).map(row => ({row, score: rank(row)})).sort((a, b) =>
    a.score - b.score || compare(a.row.hanzi, b.row.hanzi));
  const result = [];
  for (const {row} of candidates) {
    const example = annotated.get(row.hanzi);
    const focusWord = example.words.find(word => word.hanzi === row.anchor && word.hanzi.includes(glyph)) ??
      example.words.find(word => word.hanzi.includes(glyph));
    const identity = sentenceKey(row.hanzi);
    if (!focusWord || used.has(focusWord.hanzi) || usedSentences.has(identity)) continue;
    result.push(example);
    usedSentences.add(identity);
    used.add(focusWord.hanzi);
    if (result.length >= 3) return result;
  }
  for (const {row} of candidates) {
    const example = annotated.get(row.hanzi);
    const identity = sentenceKey(row.hanzi);
    if (usedSentences.has(identity) || !example.words.some(word => word.hanzi.includes(glyph))) continue;
    result.push(example);
    usedSentences.add(identity);
    if (result.length >= 3) break;
  }
  return result;
}

function makeUsage(words, contexts, glyph) {
  const usage = new Map();
  for (const example of contexts) {
    const token = example.words.find(word => word.hanzi.includes(glyph));
    if (!token) continue;
    const lexical = words.find(word => word.hanzi === token.hanzi && contextualReadingKey(word) === contextualReadingKey(token));
    const term = lexical ?? token;
    if (!usage.has(term.hanzi)) usage.set(term.hanzi, {title: `${term.hanzi} · ${term.english.split(';')[0]}`, examples: []});
    usage.get(term.hanzi).examples.push(example);
  }
  return [...usage.values()].slice(0, 3);
}

const stories = new Map();
for (const level of ['1', '2', '3']) {
  const path = `data/atlas-study-mnemonics-${level}.tsv`;
  if (draft && !existsSync(file(path))) continue;
  for (const line of read(path).split('\n').filter(line => line && !line.startsWith('#'))) {
    const [glyph, scene, ...rest] = line.trimEnd().split('\t');
    if (!scene || rest.length || recognition.get(glyph)?.[0] !== level || stories.has(glyph)) {
      throw new Error(`Invalid HSK ${level} mnemonic row: ${line}`);
    }
    stories.set(glyph, [scene]);
  }
}

const storyTermPath = 'data/atlas-study-mnemonic-terms.tsv';
const storyReferences = /[\p{Script=Han}\u2e80-\u2fdf\u31c0-\u31ef\ue000-\uf8ff]+/gu;
const sceneReadings = new Map();
if (existsSync(file(storyTermPath))) {
  for (const line of read(storyTermPath).split('\n').filter(line => line && !line.startsWith('#'))) {
    const [reference, ...fields] = line.trimEnd().split('\t');
    const terms = fields.map(field => {
      const [hanzi, pinyin, gloss, ...rest] = field.split('|');
      if (!headword.test(hanzi) || !pinyin || !gloss || rest.length ||
          (!lexicon.has(hanzi) && !wordLevels.has(hanzi) && !canonical.has(hanzi)) || !alignPinyin({hanzi, pinyin})) {
        throw new Error(`Invalid mnemonic term ${reference}: ${field}`);
      }
      return {...lexicalTerm(hanzi, pinyin, gloss), kind: 'word'};
    });
    if (sceneReadings.has(reference) || !terms.length || terms.map(term => term.hanzi).join('') !== reference) {
      throw new Error(`Invalid mnemonic annotation: ${reference}`);
    }
    sceneReadings.set(reference, terms);
  }
}

const unresolvedStoryTerms = new Set();
function makeStoryTerms(story) {
  return story.flatMap(scene => (scene.match(storyReferences) ?? []).flatMap(reference => {
    const edited = sceneReadings.get(reference);
    if (edited) return edited;
    if ([...reference].length === 1) return {...componentTerm(reference), kind: 'character'};
    const lemma = lexicon.get(reference)?.[0]?.term;
    if (lemma && (canonical.has(reference) || wordLevels.has(reference)) &&
        alignPinyin({hanzi: reference, pinyin: lemma.pinyin})) return {...lemma, kind: 'word'};
    unresolvedStoryTerms.add(reference);
    return [];
  }));
}

const packSize = 10;
const packs = new Map();
const index = {
  schemaVersion: 1,
  sources: {
    syllabus: json('data/hsk-levels-source.json'),
    collocations: ['app/content.ts', ...corpusPaths, supplementName, 'resources/cc-cedict/cedict.txt.gz'],
    sentences: 'Chinese OS curriculum and checked-in lesson examples',
    dictionary: {...json('data/dictionary-sources.json').cedict, copyright: 'CC-CEDICT contributors',
      changes: 'Selected definitions and readings were adapted for study. The CC-CEDICT-derived material is available under CC BY-SA 4.0.'},
    editedEntries: editorialEntries.size ? editorialPath : undefined,
    editedCollocations: editedCollocations ? collocationPath : undefined,
    mnemonicTerms: sceneReadings.size ? storyTermPath : undefined,
    components: {source: structureSource.sourceUrl, additional: structureSource.additionalStructureSource.sourceUrl,
      notice: structureSource.epistemicNotice, license: '/licenses/hanzi-structure-LGPL.txt',
      names: {
        strokes: 'https://www.moe.gov.cn/ewebeditor/uploadfile/2015/01/12/20150112170016626.pdf',
        radicals: 'https://www.moj.gov.cn/pub/sfbgw/zwfw/zwfwbgxz/202101/P020210122423060808657.pdf',
        teachingTable: 'https://file.xdf.cn/uploads/200411/1113_200411232325UoPnWYuJ7Y1kzVRq.pdf',
      }},
    comparisons: ['data/often-confused.json', 'modern IDS with same placed shape', 'independently recorded same pinyin'],
    levels: 'Entry, parts, family members and mnemonic graphics use official recognition bands. Words, sentence tokens, lexical comparisons and mnemonic words use exact official headword bands. An empty array means the exact form is absent from the relevant syllabus table.',
  },
  cards: [],
};
const stats = {cards: 0, sources: corpus.size, aligned: annotated.size, examples: 0, words: 0, wordExamples: 0,
  laterWords: 0, outsideSyllabusWords: 0, parts: 0, terminal: 0, families: 0, comparisons: 0, stories: 0,
  storyTerms: 0, storyWords: 0, storyCharacters: 0, editedStories: sceneReadings.size,
  editedEntries: editorialEntries.size, editedCollocations};
const weak = {contexts: [], words: [], families: [], comparisons: [], readings: [], meanings: [], mnemonic: []};
const pilot = 'data/atlas-study-snow.json';
const override = existsSync(file(pilot)) ? json(pilot) : undefined;
if (!override && !draft) throw new Error(`Missing ${pilot}`);
for (const [i, glyph] of targets.entries()) {
  const parts = structuralShapes.get(glyph).parts;
  const families = makeFamilies(glyph, parts);
  const words = makeWords(glyph);
  const contexts = makeContexts(glyph, words);
  const entry = characterTerm(glyph);
  const story = stories.get(glyph) ?? [];
  const storyTerms = glyph === '雪' && override ? [] : makeStoryTerms(story);
  const card = glyph === '雪' && override ? override : {entry, words,
    parts: parts.map(part => componentTerm(part.glyph)), families, comparisons: makeComparisons(glyph, families),
    usage: makeUsage(words, contexts, glyph), contexts, story, ...(storyTerms.length ? {storyTerms} : {})};
  const pack = String(Math.floor(i / packSize) + 1).padStart(2, '0');
  if (!packs.has(pack)) packs.set(pack, {});
  packs.get(pack)[glyph] = card;
  index.cards.push({...card.entry, pack});
  stats.cards++;
  stats.words += card.words.length;
  stats.wordExamples += card.words.filter(word => word.example).length;
  stats.laterWords += card.words.filter(word => word.levels.some(level => levelRank(level) > 3)).length;
  stats.outsideSyllabusWords += card.words.filter(word => word.levels.length === 0).length;
  stats.examples += card.contexts.length;
  stats.parts += card.parts.length;
  stats.terminal += !card.parts.length;
  stats.families += card.families.length;
  stats.comparisons += card.comparisons.length;
  stats.stories += !!card.story.length;
  stats.storyTerms += storyTerms.length;
  stats.storyWords += storyTerms.filter(term => term.kind === 'word').length;
  stats.storyCharacters += storyTerms.filter(term => term.kind === 'character').length;
  if (card.contexts.length < 2) weak.contexts.push(glyph);
  if (card.words.length < 3) weak.words.push(glyph);
  if (!card.families.length) weak.families.push(glyph);
  if (!card.comparisons.length) weak.comparisons.push(glyph);
  if (!card.entry.pinyin) weak.readings.push(glyph);
  if (!card.entry.english) weak.meanings.push(glyph);
  if (!card.story.length) weak.mnemonic.push(glyph);
}
console.log(JSON.stringify({stats, weak: {...weak, mnemonic: weak.mnemonic.length,
  storyTerms: [...unresolvedStoryTerms]}}, null, 2));
if (draft) {
  if (process.env.ATLAS_STUDY_DRAFT) writeFileSync(process.env.ATLAS_STUDY_DRAFT, JSON.stringify({index, packs: Object.fromEntries(packs), weak}));
} else {
  if (weak.readings.length || weak.meanings.length || weak.mnemonic.length) throw new Error('Incomplete study cards');
  if (weak.contexts.length) throw new Error('Study cards require at least two attested sentences');
  if (weak.families.length) throw new Error(`Missing verified component families: ${weak.families.join(', ')}`);
  if (unresolvedStoryTerms.size) throw new Error(`Missing mnemonic terms: ${[...unresolvedStoryTerms].join(', ')}`);
  if ([...packs.values()].some(pack => Object.values(pack).some(card => !card.words.length))) {
    throw new Error('A study card has no attested lexical item');
  }
  const files = new Map([['index.json', index], ...[...packs].map(([pack, cards]) => [`${pack}.json`, cards])]);
  if (!check) mkdirSync(output, {recursive: true});
  for (const [name, value] of files) {
    const target = resolve(output, name);
    const expected = `${JSON.stringify(value)}\n`;
    if (check) {
      if (readFileSync(target, 'utf8') !== expected) throw new Error(`Stale study card asset: ${name}`);
    } else writeFileSync(target, expected);
  }
  const unexpected = readdirSync(output).filter(name => name.endsWith('.json') && !files.has(name));
  if (unexpected.length) throw new Error(`Unexpected study card assets: ${unexpected.join(', ')}`);
  console.log(`${files.size} files, ${Math.max(...[...files.values()].map(value => Buffer.byteLength(JSON.stringify(value))))} bytes largest`);
}
