// Regenerate the sprint catalog from the shipped HSK syllabus and study sources.
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';

const json = path => JSON.parse(readFileSync(path, 'utf8'));
const gz = path => JSON.parse(gunzipSync(readFileSync(path)));
const syllabus = gz('public/dictionary/hsk-levels-2025.json.gz');
const dictionary = gz('public/dictionary/characters.json.gz');
const {words} = json('data/hsk-browse-index.json');
const {outputFiles} = await build({
  stdin: {contents: 'export {studyOccurrenceCorpus} from "./app/dictionary-lesson-occurrences"; export {atlasByHanzi,componentById} from "./app/atlas-model";', resolveDir: process.cwd()},
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const {studyOccurrenceCorpus,atlasByHanzi,componentById} = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
const locales = ['en', 'fr', 'ru', 'tr'];
const localized = Object.fromEntries(locales.map(locale => [locale, new Map(studyOccurrenceCorpus(locale).map(row => [row.id,row]))]));
const rows = [...localized.en.values()];
const isHanzi = ch => /^\p{Unified_Ideograph}$/u.test(ch);
const rank = row => row.lessonId.startsWith('library:') ? 0 : 1;
const chars = text => new Set([...text].filter(isHanzi));
const sentences = rows.filter(row => row.kind === 'sentence' && row.audio?.text === row.text && existsSync('public'+row.audio.source))
  .sort((a,b) => rank(a)-rank(b) || a.text.length-b.text.length);
const byGlyph = new Map(), wordsByGlyph = new Map();
const singleGlosses = new Map(rows.filter(row=>row.kind==='word'&&chars(row.text).has(row.text)).map(row=>[row.text,row]));
for (const row of sentences) for (const ch of chars(row.text)) if (!byGlyph.has(ch)) byGlyph.set(ch,row);
for (const row of [...rows.filter(row=>row.kind==='word'),...words.map(row=>({text:row.hanzi,pinyin:row.pinyin,meaning:row.meaning}))]) {
  if ([...row.text].length<2 || !row.pinyin || !row.meaning) continue;
  for (const ch of chars(row.text)) if (!wordsByGlyph.has(ch)) wordsByGlyph.set(ch,row);
}
const beginner = [...new Set(['1','2','3'].flatMap(level=>[...syllabus.characters[level]]))];
const extension = [...syllabus.characters['4']].filter(ch=>!beginner.includes(ch))
  .sort((a,b)=>Number(byGlyph.has(b))-Number(byGlyph.has(a)));
const target = [...new Set([...beginner, ...extension])].slice(0,1000);
const translation = row => Object.fromEntries(locales.flatMap(locale => {
  const meaning = localized[locale].get(row.id)?.meaning;
  // An unchanged English source remains explicitly labelled in the UI.
  return locale==='en'||(meaning&&meaning!==row.meaning) ? [[locale,meaning??row.meaning]] : [];
}));
const levels = new Map(Object.entries(syllabus.characters).flatMap(([level, value])=>[...value].map(ch=>[ch,Number(level)])));
const available = target.map(hanzi=>{
  const entry=dictionary[hanzi];
  if (!entry?.pinyin?.length||!entry.definition) throw Error('Missing definition for '+hanzi);
  const sentence=byGlyph.get(hanzi),word=wordsByGlyph.get(hanzi),gloss=singleGlosses.get(hanzi);
  const atlas=atlasByHanzi.get(hanzi);
  const phonetic=atlas?.phonetic?componentById.get(atlas.phonetic)?.glyph:undefined;
  const confirmedSound=phonetic&&entry.decomposition?.includes(phonetic)?phonetic:undefined;
  const meanings=atlas?.meaning?{...atlas.meaning}:gloss?translation(gloss):null;
  if(meanings) meanings.en=entry.definition;
  return {hanzi,pinyin:entry.pinyin.join(' / '),meaning:entry.definition,level:levels.get(hanzi),part:confirmedSound||entry.radical||hanzi,clue:confirmedSound?'sound':'radical',
    ...(meanings?{meanings}:{}),
    ...(word?{word:{text:word.text,pinyin:word.pinyin,meaning:translation(word)}}:{}),
    ...(sentence?{sentence:{text:sentence.text,pinyin:sentence.pinyin,meaning:translation(sentence),audio:sentence.audio.source,source:sentence.sourceId}}:{})};
});
if (available.length!==1000) throw Error('Incomplete sprint catalog');
writeFileSync('data/hanzi-sprint.json',JSON.stringify(available)+'\n');
console.log(`${available.length} Hanzi, ${available.filter(row=>row.sentence).length} with an exact sentence recording, ${available.filter(row=>row.word).length} with a related word`);
