import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const {outputFiles: [bundle]} = await build({
  stdin: {
    contents: "export * from './app/atlas-workspace-model'; export * from './app/atlas-workspace-route';",
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const atlas = await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));

test('the workspace requires both explicit flags and resolves bare authored sentence links', () => {
  for (const search of ['?atlas=1', '?workspace=1', '?atlas=1&workspace=0']) {
    assert.equal(atlas.isAtlasWorkspaceEntry(new URLSearchParams(search)), false);
  }
  const query = '?atlas=1&workspace=1&hsk=1&focus=sentence&text=明天见。';
  assert.equal(atlas.isAtlasWorkspaceEntry(new URLSearchParams(query)), true);
  const context = atlas.resolveWorkspaceContext(atlas.readAtlasWorkspaceRoute(query), 'en');
  assert.equal(context.word?.id, 'tomorrow');
  assert.equal(context.example?.text, '明天见。');
  assert.equal(context.pronunciation?.source, '/audio/tomorrow-sentence.mp3');
  assert.deepEqual(atlas.workspaceHanzi(context.text), ['明', '天', '见']);
});

test('a bare word link retains its identity outside the family scope and an unknown part retains an empty scope', () => {
  const wordRoute = atlas.readAtlasWorkspaceRoute('?atlas=1&workspace=1&anchor=生&hsk=1&focus=word&text=姓名');
  const wordContext = atlas.resolveWorkspaceContext(wordRoute, 'en');
  assert.equal(wordContext.word?.id, 'hsk2-465');
  assert.equal(wordContext.outsideScope, true);
  assert.equal(wordContext.members.length, 7);
  const partRoute = atlas.readAtlasWorkspaceRoute('?atlas=1&workspace=1&hsk=1&relation=structure&focus=component&text=巾');
  const partContext = atlas.resolveWorkspaceContext(partRoute, 'en');
  assert.equal(partContext.part?.glyph, '巾');
  assert.equal(partContext.hanzi, '巾');
  assert.notEqual(partContext.text, '学');
  assert.ok(partContext.structural.every(character => character.hanzi === '巾' || character.components.includes('巾')));
});

test('topic groups keep their assigned IDs and the literal family keeps cross-assigned members', () => {
  const groups = atlas.workspaceGroups('en', 1);
  const topic = groups.find(group => group.kind === 'topic');
  const topicRoute = atlas.readAtlasWorkspaceRoute('?mode=read&relation=topic&hsk=1&group=' + topic.id);
  const topicContext = atlas.resolveWorkspaceContext(topicRoute, 'en', groups);
  assert.deepEqual(topicContext.members.map(word => word.id), topic.words.map(word => word.id));
  const birth = groups.find(group => group.anchor === '生');
  assert.equal(atlas.workspaceGroupLabel(birth, 'en', 1), '3 here · 7 in full family');
});

test('original views open the selected 学 character in an actual component family', () => {
  const route = atlas.readAtlasWorkspaceRoute('?atlas=1&workspace=1&anchor=学&hsk=1&hanzi=学&word=hsk1-028&part=sun');
  const context = atlas.resolveWorkspaceContext(route, 'en');
  assert.equal(context.word?.hanzi, '大学生');
  const params = new URLSearchParams(atlas.workspaceOriginalHref(route, context, 'family', 57));
  assert.equal(params.get('part'), 'child');
  assert.ok(atlas.workspaceStructure(1, 'en', params.get('part')).some(character => character.hanzi === '学'));
  assert.equal(params.get('hanzi'), '学');
  assert.equal(params.get('word'), 'hsk1-028');
  assert.equal(atlas.atlasWorkspaceScroll(params.get('returnWorkspace')), 57);
});

test('original views preserve an explicit matching component and enable nested matching where required', () => {
  for (const [hanzi, part, canonical, deep] of [['姓', '女', 'woman', false], ['幕', '莫', '莫', false], ['幕', '日', 'sun', true]]) {
    const route = atlas.readAtlasWorkspaceRoute('?' + new URLSearchParams({
      atlas: '1', workspace: '1', relation: 'structure', focus: 'character', hanzi, part,
    }));
    const context = atlas.resolveWorkspaceContext(route, 'en');
    const params = new URLSearchParams(atlas.workspaceOriginalHref(route, context, 'space'));
    assert.equal(params.get('part'), canonical);
    assert.equal(params.has('deep'), deep);
    assert.ok(atlas.workspaceStructure('all', 'en', canonical).some(character => character.hanzi === hanzi));
  }
});


test('the HSK 1 学 matrix page contains every Hanzi in its word rows', () => {
  const route = atlas.readAtlasWorkspaceRoute('?atlas=1&workspace=1&anchor=学&hsk=1&mode=map&map=matrix');
  const context = atlas.resolveWorkspaceContext(route, 'en');
  const words = context.members.slice(0, atlas.workspaceBoardSize);
  assert.equal(words.length, context.members.length);
  assert.deepEqual(atlas.workspaceHanzi(words.map(word => word.hanzi).join('')), ['学', '生', '习', '校', '大', '上', '同', '小', '中']);
});

test('Words deep links opt into Connections and keep plain Swipe as the default', () => {
  const query = '?mode=swipe&swipeWord=一起';
  const plain = atlas.readAtlasWorkspaceRoute(query);
  const linked = atlas.readAtlasWorkspaceRoute(query + '&wordView=connections');
  assert.equal(plain.wordView, undefined);
  assert.equal(linked.wordView, 'connections');
  assert.equal(atlas.readAtlasWorkspaceRoute(atlas.atlasWorkspaceHref(linked)).swipeWord, '一起');
  assert.equal(new URLSearchParams(atlas.atlasWorkspaceHref(linked)).get('wordView'), 'connections');
  for (const invalid of ['?mode=swipe&wordView=connections', '?mode=build&swipeWord=一起&wordView=connections', query + '&wordView=unknown']) {
    assert.equal(atlas.readAtlasWorkspaceRoute(invalid).wordView, undefined);
  }
});
