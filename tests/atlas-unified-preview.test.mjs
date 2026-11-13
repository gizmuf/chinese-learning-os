import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import test from 'node:test';
import { build } from 'esbuild';

const { outputFiles: [bundle] } = await build({
  stdin: {
    contents: `
      export * from './app/atlas-workspace-model';
      export * from './app/atlas-workspace-route';
      export * from './app/atlas-story-explorer-model';
      export {readCloudRoute} from './app/atlas-cloud-route';
      export {atlasChunksReturn} from './app/atlas-chunks-route';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const atlas = await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));
const read = atlas.readAtlasWorkspaceRoute;

test('HSK 1 生 displays the three Journey assignments and seven literal family members', () => {
  const groups = atlas.workspaceGroups('en', 1);
  const birth = groups.find(group => group.id === 'journey-1-character-751f');
  const { here, full } = atlas.workspaceJourneyGroup(birth, 'en', 1);
  assert.deepEqual(here.map(word => word.id), ['hsk1-183', 'hsk1-231', 'hsk1-256']);
  assert.deepEqual(full.map(word => word.id).sort(), [
    'hsk1-028', 'hsk1-183', 'hsk1-231', 'hsk1-238', 'hsk1-256', 'hsk1-293', 'student',
  ]);
  const hereIds = new Set(here.map(word => word.id));
  const study = groups.find(group => group.id === 'journey-1-character-5b66');
  for (const word of full.filter(word => !hereIds.has(word.id))) {
    assert.ok(study.words.some(assigned => assigned.id === word.id));
  }
});

test('Story return retains mode, scope, selection, family filters, practice and scroll', () => {
  const route = read('?atlas=1&workspace=1&mode=read&relation=structure&hsk=2&anchor=生&group=journey-2-character-751f&part=女&hanzi=姓&word=hsk2-465&text=姓名&focus=character&wsstory=姓&step=2&page=3&map=matrix&practice=reels&wide=1');
  const origin = atlas.atlasWorkspaceHref(route, 257);
  assert.deepEqual(read(origin), route);
  assert.equal(atlas.atlasWorkspaceScroll(origin), 257);
  assert.equal(atlas.atlasWorkspaceReturn(origin), origin);
  assert.equal(atlas.atlasChunksReturn(new URLSearchParams({returnAtlas: origin}).toString()), '/' + origin);
  assert.equal(atlas.atlasWorkspaceReturn('https://other.example/?atlas=1&workspace=1'), undefined);
  const existing = '?atlas=1&cloud=1&layout=journey&hsk=1&anchor=生';
  assert.equal(atlas.atlasWorkspaceReturn(existing), undefined);
  assert.equal(atlas.readCloudRoute(existing).layout, 'journey');
});

const loops = [
  ['幕', ['莫', '巾'], '夜幕', undefined, '夜幕降临了。', '/atlas/family-stories/mu-curtain-sentence.mp3'],
  ['明天', ['明', '天'], '明天', 'tomorrow', '明天见。', '/audio/tomorrow-sentence.mp3'],
  ['姓', ['女', '生'], '姓名', 'hsk2-465', '请写你的姓名。', '/audio/hsk2-465-sentence.mp3'],
];
for (const [target, parts, word, id, sentence, audio] of loops) {
  test(`${target} Story links retain components, word identity and recorded sentence context`, async () => {
    const story = atlas.atlasExplorerStories[target];
    const start = read('?atlas=1&workspace=1&mode=read&wsstory=' + target);
    assert.deepEqual(story.structure.parts.map(part => part.text), parts);
    for (const part of story.structure.parts) {
      const route = { ...start, ...atlas.workspaceExploration(part.text, part.kind, 'en', start) };
      const context = atlas.resolveWorkspaceContext(route, 'en');
      assert.equal(context.text, part.text);
      assert.ok(context.reading && context.meaning);
    }
    const route = { ...start, ...atlas.workspaceExploration(word, 'word', 'en', start) };
    const context = atlas.resolveWorkspaceContext(route, 'en');
    assert.equal(context.text, word);
    assert.equal(context.word?.id, id);
    assert.ok(context.reading && context.meaning);
    const wordAudio = audio.replace('-sentence.mp3', '-word.mp3');
    assert.equal(context.pronunciation?.source, wordAudio);
    assert.ok((await stat('public' + wordAudio)).size > 0);
    assert.equal(context.example?.text, sentence);
    assert.equal(context.example?.audio?.source, audio);
    assert.ok((await stat('public' + audio)).size > 0);
    const sentenceRoute = { ...route, ...atlas.workspaceExploration(sentence, 'sentence', 'en', route) };
    const sentenceContext = atlas.resolveWorkspaceContext(sentenceRoute, 'en');
    assert.equal(sentenceContext.text, sentence);
    assert.ok(sentenceContext.reading && sentenceContext.meaning);
    assert.equal(sentenceContext.pronunciation?.source, audio);
  });
}

test('Opening 姓名 from the HSK 1 story retains the filter and the HSK 2 identity', () => {
  const start = read('?atlas=1&workspace=1&mode=read&wsstory=姓&hsk=1');
  const route = { ...start, ...atlas.workspaceExploration('姓名', 'word', 'en', start) };
  const context = atlas.resolveWorkspaceContext(route, 'en');
  assert.equal(route.scope, 1);
  assert.equal(context.word?.id, 'hsk2-465');
  assert.equal(context.outsideScope, true);
  assert.ok(!context.members.some(word => word.id === 'hsk2-465'));
});
