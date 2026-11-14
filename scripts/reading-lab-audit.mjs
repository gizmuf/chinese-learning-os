import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const {outputFiles: [bundle]} = await build({
  stdin: {
    contents: `export * from './app/reading-lab-model'; export {hskLevelIndex} from './app/hsk-level-model';`,
    resolveDir: root,
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const model = await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));
const metadata = JSON.parse(await readFile(new URL('../data/hsk-levels-source.json', import.meta.url)));
const asset = await readFile(new URL('../public' + metadata.asset, import.meta.url));
if (createHash('sha256').update(asset).digest('hex') !== metadata.assetSha256) throw Error('Unexpected HSK syllabus index revision');
const index = model.hskLevelIndex(JSON.parse(gunzipSync(asset).toString()));
const args = process.argv.slice(2);
const draft = args.includes('--draft');
const input = args.find(arg => arg !== '--draft') ?? new URL('../data/reading-lab.json', import.meta.url);
const data = JSON.parse(await readFile(input));
const readings = data.readings;
if (!Array.isArray(readings)) throw Error('Missing readings array');
const corpusIssues = [];
if (!draft) {
  if (new Set(readings.map(reading => reading.id)).size !== 8 || readings.length !== 8) corpusIssues.push('Expected eight readings with unique IDs');
  for (const level of [2, 3, 4, 5]) {
    if (readings.filter(reading => reading.level === level).length !== 2) corpusIssues.push(`Expected two HSK ${level} readings`);
  }
}
const byCount = (a, b) => b.count - a.count || a.text.localeCompare(b.text, 'zh');
const report = [];
let failed = !!corpusIssues.length;
for (const reading of readings) {
  const candidate = draft ? {
    ...reading, paragraphs: reading.paragraphs.map(paragraph => {
      if (paragraph.sentenceEnglish) return paragraph;
      const pending = {...paragraph, sentenceEnglish: []};
      return {...pending, sentenceEnglish: model.splitReadingSentences(pending).map(() => 'Draft translation pending.')};
    }),
  } : reading;
  const issues = model.validateReading(candidate);
  if (issues.length) {
    report.push({id: reading.id, issues});
    failed = true;
    continue;
  }
  const result = model.analyzeReading(candidate, index);
  const coverage = result.coverage.find(band => band.level === reading.level);
  const expectedExceptions = result.aboveLevel.length + result.offList.length;
  if (!draft && coverage.tokenCount / result.totals.tokens < 0.95) issues.push('Expected at least 95% cumulative listed-token coverage');
  if (!draft && expectedExceptions > 5) issues.push('Expected at most five distinct off-list or above-level forms');
  if (issues.length) failed = true;
  report.push({
    id: reading.id, level: reading.level, ...result.totals, coverage,
    expectedExceptions, issues,
    aboveLevel: result.aboveLevel.sort(byCount), offList: result.offList.sort(byCount),
  });
}
console.log(JSON.stringify({edition: metadata.edition, officialSource: metadata.officialSource, draft, corpusIssues, report}, null, 2));
if (failed) process.exitCode = 1;
