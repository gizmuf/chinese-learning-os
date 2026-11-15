import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {createElement} from 'react';
import {act, create} from 'react-test-renderer';

const require = createRequire(import.meta.url);
const {outputFiles: [bundle]} = await build({
  stdin: {contents: `export {ReadingReview} from './app/reading-lab-review';
    export {readingReviewTargets, findReadingReviewSource, readingReviewPinId} from './app/reading-lab-review-data';
    export {persistReadingReview} from './app/reading-lab-review-model';`, resolveDir: process.cwd()},
  bundle: true, jsx: 'automatic', platform: 'node', format: 'esm', write: false,
  plugins: [{name: 'shared-react', setup(builder) {
    builder.onResolve({filter: /^react(?:\/jsx-runtime)?$/}, ({path}) => ({path: require.resolve(path), external: true}));
  }}],
});
const folder = mkdtempSync(join(tmpdir(), 'reading-review-ui-'));
let model;
try {
  const path = join(folder, 'bundle.mjs');
  writeFileSync(path, bundle.text);
  model = await import(pathToFileURL(path));
} finally {rmSync(folder, {recursive: true, force: true});}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const day = 86_400_000;
const base = Date.UTC(2026, 10, 15);
const target = model.readingReviewTargets[0];
const inputText = '公园旁边有一座图书馆。';
const content = node => typeof node === 'string' ? node : node.children.map(content).join('');

test('active review hides the target and another tab completing a joined attempt never starts an extra one', async () => {
  const rows = new Map();
  const storage = {getItem: key => rows.get(key) ?? null, setItem: (key, value) => rows.set(key, value)};
  const action = (action, now = base + day) => model.persistReadingReview(storage, null, target.id, action, now);
  action({type: 'save'}, base);
  const attempt = '7a7ff4ee-f450-4428-84b6-000000000009';
  let store = action({type: 'begin', attempt});
  const writes = [];
  let fail = false;
  let renderer;
  const render = () => createElement(model.ReadingReview, {id: target.id, reviews: {ready: true, store, now: base + day, write: (_id, request) => {
    writes.push(request);
    if (fail) throw Error('quota');
    store = action(request);
    renderer.update(render());
  }}, onExit() {}, onSource() {}});
  await act(() => {renderer = create(render());});
  assert.match(content(renderer.root), /Recall the Chinese word for/);
  assert.doesNotMatch(content(renderer.root), /图书馆|在图书馆见/u);
  assert.equal(renderer.root.findByProps({'aria-label': 'Reading review'}).props['data-study-assessment'], 'blocked');
  await act(() => renderer.root.findByType('input').props.onChange({target: {value: target.hanzi}}));
  await act(() => renderer.root.findByType('form').props.onSubmit({preventDefault() {}}));
  assert.match(content(renderer.root), /图书馆/u);
  assert.equal(renderer.root.findByProps({'aria-label': 'Reading review'}).props['data-study-assessment'], 'blocked');
  await act(() => renderer.root.findByType('textarea').props.onChange({target: {value: inputText}}));
  const button = label => renderer.root.findAllByType('button').find(element => content(element) === label);
  assert.match(content(renderer.root), /Again brings this word back tomorrow/);
  assert.match(content(renderer.root), /Remembered schedules it in 3 days/);
  await act(() => button('Compare a sample').props.onClick());
  assert.match(content(renderer.root), /One possible sentence/);
  fail = true;
  await act(() => button('Remembered').props.onClick());
  assert.ok(button('Retry save'));
  assert.equal(button('Back to reading').props.disabled, true);
  store = action({type: 'finish', attempt, outcome: 'remembered'});
  await act(() => renderer.update(render()));
  assert.match(content(renderer.root), /completed in another tab/);
  assert.equal(button('Back to reading').props.disabled, false);
  assert.equal(button('Retry save'), undefined);
  assert.equal(writes.some(request => request.type === 'begin'), false);
  assert.equal(store.cards[target.id].lastResponse.sentence, inputText);
  await act(() => renderer.unmount());
});

test('noncurated review renders the exact cloze and later offers the labeled source instead of a fabricated sample', async () => {
  const {findReadingReviewSource, readingReviewPinId} = model;
  const pin = findReadingReviewSource('hsk4-repair-before-replace', 'p1-c9', 1);
  assert.equal(pin.hanzi, '只');
  const id = readingReviewPinId(pin);
  const rows = new Map();
  const storage = {getItem: key => rows.get(key) ?? null, setItem: (key, value) => rows.set(key, value)};
  const action = (action, now = base + day) => model.persistReadingReview(storage, null, id, action, now);
  action({type: 'save', target: pin}, base);
  let store = action({type: 'begin', attempt: '7a7ff4ee-f450-4428-84b6-000000000010'});
  let renderer;
  const render = () => createElement(model.ReadingReview, {id, reviews: {ready: true, store, now: base + day, write: (_id, request) => {
    store = action(request);
    renderer.update(render());
  }}, onExit() {}, onSource() {}});
  await act(() => {renderer = create(render());});
  const button = label => renderer.root.findAllByType('button').find(element => content(element) === label);
  assert.match(content(renderer.root), /Context recall.*原来＿＿需要换个灯泡/su);
  assert.doesNotMatch(content(renderer.root), /只|zhǐ|zhī|classifier/u);
  await act(() => button('Need help').props.onClick());
  assert.match(content(renderer.root), /只zhǐ/u);
  assert.equal(button('Compare a sample'), undefined);
  await act(() => button('View source sentence').props.onClick());
  assert.match(content(renderer.root), /Source sentence.*原来只需要换个灯泡/su);
  assert.equal(button('Remembered').props.disabled, true);
  await act(() => renderer.unmount());
});
