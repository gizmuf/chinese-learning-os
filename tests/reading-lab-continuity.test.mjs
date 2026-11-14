import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';

const {outputFiles: [bundle]} = await build({
  stdin: {
    contents: `export * from './app/reading-lab-session'; export * from './app/reading-lab-route';`,
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const model = await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));
const {persistReadingLabSession, readReadingLabSession, validateReadingLabSession, readingLabSessionKey, readingLabDraftLimit} = model;
const resume = {article: 'hsk2-library-meeting', level: 2, aid: 'pinyin', chunks: true, paragraph: 'p2', grammar: 'g1', scroll: 417};

function localStore() {
  const rows = new Map();
  return {rows, getItem: key => rows.get(key) ?? null, setItem: (key, value) => rows.set(key, value)};
}

test('draft and exact resume survive independent browser reads without writing learning progress', () => {
  const storage = localStore();
  const atlasReturn = model.readingLabHref(resume);
  persistReadingLabSession(storage, null, {resume});
  persistReadingLabSession(storage, null, {draft: {article: resume.article, text: '我们先读书。'}});
  assert.deepEqual([...storage.rows.keys()], [model.readingLabGuestKey]);
  const restored = readReadingLabSession(storage, null);
  assert.deepEqual(restored, {version: 1, resume, drafts: {[resume.article]: '我们先读书。'}});
  assert.equal(model.readingLabHref(restored.resume), atlasReturn);
  assert.equal(model.readReadingLabRoute(atlasReturn).paragraph, 'p2');
  assert.equal(Object.keys(restored).some(key => /event|grade|score|mastery/i.test(key)), false);
  persistReadingLabSession(storage, null, {draft: {article: resume.article, text: ''}});
  assert.deepEqual(readReadingLabSession(storage, null), {version: 1, resume, drafts: {}});
});

test('owner keys are distinct, and local edits reread unrelated drafts before merging', () => {
  const storage = localStore();
  const other = 'hsk2-cooking-together';
  persistReadingLabSession(storage, null, {draft: {article: resume.article, text: 'guest'}});
  persistReadingLabSession(storage, 'guest', {draft: {article: resume.article, text: 'signed in'}});
  persistReadingLabSession(storage, 'guest', {draft: {article: other, text: '饭'}});
  assert.notEqual(readingLabSessionKey(null), readingLabSessionKey('guest'));
  assert.deepEqual(readReadingLabSession(storage, null).drafts, {[resume.article]: 'guest'});
  assert.deepEqual(readReadingLabSession(storage, 'guest').drafts, {[resume.article]: 'signed in', [other]: '饭'});
  assert.deepEqual(readReadingLabSession(storage, 'someone else').drafts, {});
});

test('validated storage rejects foreign versions and drops invalid fields and invented progress', () => {
  assert.equal(validateReadingLabSession({version: 2, drafts: {}}), undefined);
  const saved = validateReadingLabSession({version: 1, drafts: {nonexistent: 'drop', [resume.article]: '一'.repeat(readingLabDraftLimit + 1)},
    resume: {...resume, level: 5, paragraph: 'nonexistent', grammar: 'nonexistent', scroll: Infinity}, mastery: {lesson: 100}});
  assert.deepEqual(saved, {version: 1, drafts: {}, resume: {...resume, paragraph: '', grammar: '', scroll: 0}});
  const storage = localStore();
  storage.setItem(model.readingLabGuestKey, '{broken');
  assert.equal(persistReadingLabSession(storage, null, {resume}).resume.article, resume.article);
  assert.throws(() => persistReadingLabSession({...storage, setItem() {throw Error('quota');}}, null, {resume}), /quota/);
});
