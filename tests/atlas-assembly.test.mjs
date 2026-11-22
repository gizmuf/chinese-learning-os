import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {build} from 'esbuild';

const {outputFiles: [bundle]} = await build({
  stdin: {contents: "export * from './app/atlas-assembly-model'; export * from './app/atlas-workspace-route';", resolveDir: process.cwd()},
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const model = await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));
const index = model.assemblyIndex('en');
const row = glyph => index.characters.get(glyph);

test('IDS describes real slot counts, enclosures, and positions inside a containing region', () => {
  assert.deepEqual(row('挤').parts.map(part => [part.glyph, ...part.positions]), [['扌', 'left'], ['齐', 'right']]);
  assert.deepEqual(row('问').parts.map(part => [part.glyph, ...part.positions]), [['门', 'around'], ['口', 'inside']]);
  assert.deepEqual(row('森').parts.map(part => part.positions[0]), ['top', 'lower left', 'lower right']);
  assert.deepEqual(model.assemblyParts(model.parseAssembly('⿰甲⿰乙丙')).map(part => part.positions), [['left'], ['right'], ['right']]);
  assert.equal(model.parseAssembly('⿰扌'), undefined);
});

test('families contain distinct real characters with independently filterable forms, positions, and HSK levels', () => {
  assert.equal(index.characters.size, 3088);
  const hand = model.assemblyFamily(index, '扌', 'all', {nested: false});
  assert.equal(new Set(hand.map(member => member.character.data.hanzi)).size, hand.length);
  assert.equal(hand.slice(0, 10).map(member => member.character.data.hanzi).join(''), '推拉抱打撞挤拖挖抓拍');
  const left = hand.find(member => member.character.data.hanzi === '挤');
  const bottom = hand.find(member => member.character.data.hanzi === '拿');
  const right = hand.find(member => member.character.data.hanzi === '拜');
  assert.ok(left.occurrences.some(match => match.glyph === '扌' && match.positions.includes('left')));
  assert.ok(bottom.occurrences.some(match => match.glyph === '手' && match.positions.includes('bottom')));
  assert.ok(right.occurrences.some(match => match.glyph === '手' && match.positions.includes('right')));
  const exact = model.assemblyFamily(index, '手', 'all', {exact: true});
  assert.ok(!exact.some(member => member.character.data.hanzi === '挤'));
  assert.ok(!model.assemblyFamily(index, '扌', 3).some(member => member.character.data.hanzi === '挤'));
  const speech = model.assemblyFamily(index, '讠', 'all', {nested: false});
  assert.equal(speech.slice(0, 10).map(member => member.character.data.hanzi).join(''), '说讲请谢认让记试话语');
  assert.ok(speech.find(member => member.character.data.hanzi === '让').occurrences.some(match =>
    match.glyph === '讠' && match.positions[0] === 'left'));
  const nested = model.assemblyFamily(index, '木', 'all').find(member => member.character.data.hanzi === '想');
  assert.ok(nested.occurrences.some(match => match.via === '相' && match.positions[0] === 'upper left'));
});

test('swap preserves the pinned operand and its position, and never invents a result', () => {
  const matches = model.assemblySwaps(index, row('挤'), '齐', 'all');
  assert.deepEqual(matches.map(({character, operand, position}) =>
    [character.data.hanzi, model.assemblyOperandText(operand), position]), [['济', '氵', 'left']]);
  assert.deepEqual(model.assemblySwaps(index, row('挤'), '齐', 3), []);
  assert.deepEqual(model.assemblySwaps(index, row('挤'), '木', 'all'), []);
  assert.equal(row('我').data.decomposition, row('找').data.decomposition);
  assert.ok(!model.assemblySwaps(index, row('挤'), '扌', 'all')
    .some(option => model.assemblyOperandText(option.operand) === '戈'));
});

test('published exact paths account for every stroke and keep repeated components distinct', () => {
  const strokes = JSON.parse(readFileSync('data/atlas-assembly-strokes.json', 'utf8')).mappings;
  for (const [hanzi, mapping] of Object.entries(strokes)) {
    const entry = row(hanzi);
    const groups = model.assemblyStrokeGroups(entry.parts, entry.data.decomposition, mapping, mapping.paths.length);
    assert.ok(groups?.length >= 2, hanzi);
    assert.equal(new Set(groups.flat()).size, mapping.paths.length, hanzi);
  }
  const mapping = strokes['森'];
  assert.equal(model.assemblyStrokeGroups(row('森').parts, '⿰木木', mapping, mapping.paths.length), undefined);
  assert.equal(model.assemblyStrokeGroups(row('森').parts, mapping.ids, mapping, mapping.paths.length - 1), undefined);
  assert.equal(model.assemblyStrokeGroups(row('森').parts, mapping.ids, mapping, mapping.paths.length).length, 3);
});

test('builder links restore the selected part including an intentionally cleared pin', () => {
  for (const part of ['齐', '扌', '']) {
    const route = model.readAtlasWorkspaceRoute('?atlas=1&workspace=1&mode=build&buildHanzi=挤&buildPart=' + part);
    assert.equal(route.buildPart, part);
    assert.equal(route.buildHanzi, '挤');
    assert.equal(model.atlasWorkspaceReturn(model.atlasWorkspaceHref(route, 42)), model.atlasWorkspaceHref(route, 42));
  }
  assert.equal(model.readAtlasWorkspaceRoute('?mode=build&buildHanzi=<>&buildPart=invalid').buildPart, undefined);
});
