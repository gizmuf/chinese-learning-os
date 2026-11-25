import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {pinyin} from 'pinyin-pro';

const json = file => JSON.parse(readFileSync(file, 'utf8'));
const reading = text => text.normalize('NFC').toLowerCase().replace(/[^\p{Letter}\p{Mark}]/gu, '');
const textKey = text => text.normalize('NFC').replace(/\s+/gu, '').replace(/[。.]$/u, '');
const soundKey = (text, pin) => textKey(text) + '\t' + reading(pin);
const characters = /^\p{Script=Han}$/u;
const sourceDirectory = 'public/atlas/study-cards/v1';
const catalogueFile = 'data/atlas-study-audio.json';
const staticSound = file => file.startsWith('/') && !file.startsWith('/api/') && existsSync('public' + file) && statSync('public' + file).size > 1000;
const targets = new Map();

function target(row, priority) {
  for (const pin of (row.pinyin || row.namePinyin || '').split('/').map(x => x.trim()).filter(Boolean)) {
    const key = soundKey(row.hanzi, pin);
    if (!targets.has(key) || targets.get(key).priority > priority) {
      targets.set(key, {text: row.hanzi, pinyin: pin, priority, name: !row.pinyin});
    }
  }
}

function addExample(example) {
  target(example, 1);
  for (const word of example.words ?? []) target(word, 2);
}

for (const file of readdirSync(sourceDirectory).filter(file => /^\d\d\.json$/.test(file)).sort()) {
  for (const card of Object.values(json(sourceDirectory + '/' + file))) {
    target(card.entry, 0);
    for (const word of card.words) {
      target(word, 2);
      if (word.example) addExample(word.example);
    }
    for (const group of card.usage) for (const example of group.examples) addExample(example);
    for (const example of card.contexts) addExample(example);
    for (const part of card.parts) target(part, 3);
    for (const family of card.families) {
      target(family.part, 3);
      for (const member of family.members) target(member, 3);
    }
    for (const {term} of card.comparisons) target(term, 2);
    for (const term of card.storyTerms ?? []) target(term, 2);
  }
}

const result = {};
function add(text, pin, file) {
  const key = soundKey(text, pin);
  if (targets.has(key) && !result[key] && staticSound(file)) result[key] = file;
}

for (const [text, clips] of Object.entries(json('data/atlas-word-family-audio.json'))) {
  for (const clip of clips) add(text, clip.pinyin, clip.source);
}
for (const clip of Object.values(json('public/atlas/word-trial/audio/manifest.json').recordings)) {
  add(clip.hanzi, clip.pinyin, clip.source);
}
const content = json('public/audio/manifest.json').recordings;
const itemText = readFileSync('app/content.ts', 'utf8').split('export const items: Item[] = ', 2)[1];
const items = new Map(JSON.parse(itemText.slice(0, itemText.indexOf('\n];') + 2)).map(item => [item.id, item]));
for (const clip of content) {
  const item = items.get(clip.itemId);
  const text = clip.kind === 'word' ? item?.hanzi : item?.sentence;
  const pin = clip.kind === 'word' ? item?.pinyin : item?.sentencePinyin;
  if (text && pin && text === clip.text) add(text, pin, '/audio/' + clip.file);
}

const sentences = new Map();
for (const group of Object.values(json('data/lesson-sentence-audio.json'))) {
  for (const [text, clip] of Object.entries(group)) if (clip.text === text && staticSound(clip.source)) {
    sentences.set(textKey(text), clip.source);
  }
}
for (const [key, row] of targets) {
  const file = row.priority === 1 ? sentences.get(textKey(row.text)) : undefined;
  if (file && !result[key]) result[key] = file;
}

const syllables = new Map();
for (const [key, file] of Object.entries(result)) {
  const [text, pin] = key.split('\t');
  if (characters.test(text) && /[\u0300\u0301\u0304\u030c]/u.test(pin.normalize('NFD')) && !syllables.has(pin)) {
    syllables.set(pin, file);
  }
}

const pronunciations = new Map(Object.entries({
  '丿': '撇', '丶': '点', '亅': '竖钩', '丨': '竖', '灬': '四点底', '辶': '走之旁',
  '扌': '提手旁', '阝': '双耳旁', '忄': '竖心旁', '氵': '三点水', '刂': '立刀旁',
  '礻': '示字旁', '衤': '衣字旁', '讠': '言字旁', '饣': '食字旁', '艹': '草字头', '乛': '横钩', '㇏': '捺',
}));
const homophones = new Map();
for (const row of [...targets.values()].sort((a, b) => a.priority - b.priority)) {
  if (!characters.test(row.text) || row.name) continue;
  const pin = reading(row.pinyin);
  if (reading(pinyin(row.text)) === pin && !homophones.has(pin)) homophones.set(pin, row.text);
}
const plan = new Map();
const unresolved = [];

function prepare(key, row) {
  const pin = reading(row.pinyin);
  const source = characters.test(row.text) && !row.name ? syllables.get(pin) : undefined;
  if (source) {
    result[key] = source;
    return;
  }
  const isCharacter = characters.test(row.text) && !row.name;
  const spoken = row.name ? pronunciations.get(row.text)
    : isCharacter && reading(pinyin(row.text)) !== pin ? homophones.get(pin) : row.text;
  if (!spoken || (row.priority !== 1 && reading(pinyin(spoken)) !== pin &&
      reading(pinyin(spoken, {toneSandhi: false})) !== pin)) {
    unresolved.push(row);
    return;
  }
  const identity = characters.test(row.text) && !row.name ? 'syllable\t' + pin : key;
  if (!plan.has(identity)) {
    const hash = createHash('sha256').update(identity).digest('hex').slice(0, 24);
    plan.set(identity, {spoken, pinyin: row.pinyin, file: '/audio/atlas-study/' + hash + '.mp3', keys: []});
  }
  const task = plan.get(identity);
  task.keys.push(key);
  if (staticSound(task.file)) result[key] = task.file;
}
for (const [key, row] of [...targets].sort(([, a], [, b]) => a.priority - b.priority)) {
  if (!result[key]) prepare(key, row);
}

if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify([...plan.values()].filter(row => !staticSound(row.file))));
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(unresolved));
writeFileSync(catalogueFile, JSON.stringify(Object.fromEntries(Object.entries(result).sort()), null, 0) + '\n');
const stats = {};
for (const [key, row] of targets) {
  const category = ['entries', 'sentences', 'words', 'parts'][row.priority];
  stats[category] ??= {target: 0, recorded: 0};
  stats[category].target++;
  if (result[key]) stats[category].recorded++;
}
console.log({coverage: stats, planned: [...plan.values()].filter(row => !staticSound(row.file)).length, unresolved: unresolved.length});
