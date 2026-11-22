import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';
import {build} from 'esbuild';

const {outputFiles: [modelBundle]} = await build({
  stdin: {
    contents: `export * from './app/atlas-workspace-route'; export * from './app/atlas-workspace-model';
      export * from './app/atlas-cloud-route'; export * from './app/word-family-model';
      export {familyStories} from './app/atlas-family-stories-data';
      export {wordPronunciation} from './app/atlas-spatial-model';`,
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const model = await import('data:text/javascript;base64,' + Buffer.from(modelBundle.text).toString('base64'));

test('Standalone Writing Recall selector hides in-scope and fallback answers with other labels intact', async () => {
  const source = readFileSync('app/study-app.tsx', 'utf8');
  const labels = source.slice(source.indexOf('  const writingRecallSelector'), source.indexOf('\n', source.indexOf(".filter(Boolean).join(' · ');")));
  const selectStart = source.lastIndexOf('{!session && (', source.indexOf('aria-label={t("Select word")}'));
  const selectEnd = source.indexOf('</select>', selectStart) + '</select>'.length;
  assert.ok(labels.includes('practiceWordLabel') && selectStart > 0);
  const select = source.slice(selectStart, selectEnd) + ')}';
  const {outputFiles: [bundle]} = await build({
    stdin: {
      contents: `import {createElement as h} from 'react'; import {renderToStaticMarkup} from 'react-dom/server';
        export function render(mode, skill, writingLayout, included, session = null) {
          const selected = {id: 'target', hanzi: '电脑', pinyin: 'diànnǎo', english: 'computer'};
          const studyItems = included ? [selected] : [{id: 'other', hanzi: '电话', pinyin: 'diànhuà', english: 'telephone'}];
          const items = [selected, ...studyItems], t = value => value, setSelected = () => {};
          const isLanguageSkill = value => value === 'pinyin';
          ${labels}
          return renderToStaticMarkup(<div>${select}</div>);
        }`,
      loader: 'tsx', resolveDir: process.cwd(),
    },
    jsxFactory: 'h', bundle: true, platform: 'node', format: 'cjs', write: false,
  });
  const output = {exports: {}};
  new Function('require', 'module', 'exports', bundle.text)(createRequire(import.meta.url), output, output.exports);
  for (const included of [true, false]) {
    const recall = output.exports.render('recall', 'writing', 'studio', included);
    assert.doesNotMatch(recall, /电脑|电话/u);
    assert.match(recall, /diànnǎo · computer/u);
    assert.match(recall, /value="target"/);
    assert.match(output.exports.render('trace', 'writing', 'studio', included), /电脑/u);
    assert.match(output.exports.render('recall', 'writing', 'notebook', included), /电脑/u);
    assert.doesNotMatch(output.exports.render('recall', 'pinyin', 'studio', included), /电脑|diànnǎo/u);
    assert.doesNotMatch(output.exports.render('recall', 'writing', 'studio', included, []), /<select/u);
  }
});

test('The curated 人/亻 grouping includes 你 while exact 人 and 亻 remain separate sets', () => {
  const members = part => model.workspaceStructure(1, 'en', part).map(character => character.hanzi);
  assert.ok(members('person').includes('你'));
  assert.ok(members('亻').includes('你'));
  assert.ok(!members('人').includes('你'));
  assert.deepEqual(new Set(members('person')), new Set([...members('人'), ...members('亻')]));
  assert.ok(model.familyWords('你', 'en', 1).some(word => word.hanzi === '你好'));
  const authored = model.familyStories.map(story => story.hanzi);
  const indexed = model.workspaceStructure('all', 'en', '莫').map(character => character.hanzi);
  assert.deepEqual(authored.filter(hanzi => !indexed.includes(hanzi)), ['摹']);
  assert.deepEqual(indexed.filter(hanzi => !authored.includes(hanzi)), ['寞']);
});

test('Unified Atlas combines the HSK4 and recorded 森林 entries only in All vocabulary', () => {
  const dictionaryId = 'hsk-browse:4:森林';
  const exampleId = 'atlas-example:u68ee';
  const route = model.readAtlasWorkspaceRoute('?relation=literal&anchor=森&word=' + dictionaryId);
  const all = model.resolveWorkspaceContext(route, 'en');
  assert.deepEqual(all.members.filter(word => word.hanzi === '森林').map(word => word.id), [dictionaryId]);
  assert.equal(all.word.level, 4);
  assert.equal(all.pronunciation.source, '/atlas/audio/atlas-u68ee-word.mp3');
  assert.ok(existsSync('public' + all.pronunciation.source));
  assert.equal(model.resolveWorkspaceContext({...route, wordId: exampleId}, 'en').word.id, dictionaryId);

  const hsk4 = model.resolveWorkspaceContext({...route, scope: 4}, 'en');
  assert.deepEqual(hsk4.members.filter(word => word.hanzi === '森林').map(word => word.id), [dictionaryId]);
  assert.equal(hsk4.word.atlasCharacterId, undefined);
  assert.equal(hsk4.pronunciation, undefined);
  assert.deepEqual(model.familyWords('森', 'en', 'all').filter(word => word.hanzi === '森林').map(word => word.id), [dictionaryId]);
});

test('Cloud Atlas handoff retains the learning selection, exact source route and both scopes', () => {
  const cloud = model.readCloudRoute('?atlas=1&cloud=1&hsk=1&layout=words&anchor=生&hanzi=学&part=child&entry=hsk1-028');
  const href = model.workspaceHrefFromCloud(cloud, {id: 'hsk1-028', hanzi: '大学生'});
  const workspace = model.readAtlasWorkspaceRoute(href);
  assert.deepEqual([workspace.scope, workspace.anchor, workspace.part, workspace.hanzi, workspace.wordId], [1, '生', 'child', '学', 'hsk1-028']);
  assert.equal(model.atlasWorkspaceReturn(href), href);
  assert.equal(model.atlasCloudReturn(new URLSearchParams(href).get('returnCloud')), model.cloudRouteHref(cloud));
  assert.equal(model.atlasCloudReturn('https://other.invalid/?atlas=1&cloud=1'), undefined);
  assert.equal(model.atlasCloudReturn('?atlas=1&cloud=1&reader=1'), undefined);
  const structure = model.readCloudRoute('?atlas=1&cloud=1&hsk=2&layout=cloud&hanzi=姓&part=女');
  const next = model.readAtlasWorkspaceRoute(model.workspaceHrefFromCloud(structure, undefined));
  assert.deepEqual([next.scope, next.hanzi, next.part, next.relation, next.kind], [2, '姓', '女', 'structure', 'character']);
});
