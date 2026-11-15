import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {createElement} from 'react';
import {act, create} from 'react-test-renderer';

const require = createRequire(import.meta.url);
const mocks = {
  './i18n': `export const useI18n=()=>({locale:'en',t:s=>s});`,
  './study-lookup-context': `export const useStudyLookup=()=>null;export const StudyLookupButton=()=>null;export const StudyText=({text})=>text;`,
  './guided': `export default ()=>null;`,
};
const {outputFiles: [bundle]} = await build({
  stdin: {
    contents: `export {default as AtlasWorkspace} from './app/atlas-workspace';
      export {readAtlasWorkspaceRoute} from './app/atlas-workspace-route';`,
    resolveDir: process.cwd(),
  },
  bundle: true, jsx: 'automatic', format: 'esm', platform: 'node', write: false,
  loader: {'.css': 'empty'},
  plugins: [{name: 'reader-boundaries', setup(builder) {
    builder.onResolve({filter: /^(?:react(?:\/jsx-runtime)?|lucide-react)$/}, ({path}) => ({path: require.resolve(path), external: true}));
    builder.onResolve({filter: /^\.\//}, ({path}) => mocks[path] ? {path, namespace: 'mock'} : undefined);
    builder.onLoad({filter: /.*/, namespace: 'mock'}, ({path}) => ({contents: mocks[path]}));
  }}],
});
const folder = mkdtempSync(join(tmpdir(), 'atlas-embedded-recall-'));
let model;
try {
  const path = join(folder, 'test.mjs');
  writeFileSync(path, bundle.text);
  model = await import(pathToFileURL(path));
} finally {rmSync(folder, {recursive: true, force: true});}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.matchMedia = () => ({matches: false, addEventListener() {}, removeEventListener() {}});
globalThis.requestAnimationFrame = callback => {callback(); return 1;};
globalThis.cancelAnimationFrame = () => {};

function button(renderer, text) {
  const content = node => typeof node === 'string' ? node : node.children.map(content).join('');
  const match = renderer.root.findAllByType('button').find(element => content(element).includes(text));
  assert.ok(match, `Expected button ${text}`);
  return match;
}

test('unanswered embedded contrast recall hides the workspace answer and restores it after reveal or leaving', async () => {
  const initial = model.readAtlasWorkspaceRoute('?atlas=1&workspace=1&mode=practise&practice=contrast&anchor=学&hsk=1&word=hsk1-028');
  let renderer;
  await act(() => {renderer = create(createElement(model.AtlasWorkspace, {
    penOnly: false, setPenOnly() {}, notify() {}, embedded: {initial, viewport: null},
  }));});
  const inspector = () => renderer.root.findAllByProps({'aria-label': 'Context inspector'});
  assert.equal(inspector().length, 1);
  await act(() => button(renderer, 'Recall').props.onClick());
  assert.equal(renderer.root.findAllByProps({'data-study-assessment': 'blocked'}).length, 1);
  assert.equal(inspector().length, 0);
  await act(() => button(renderer, 'Show answer').props.onClick());
  assert.equal(inspector().length, 1);
  await act(() => button(renderer, 'Next').props.onClick());
  assert.equal(inspector().length, 0);
  await act(() => button(renderer, 'Spot the difference').props.onClick());
  assert.equal(inspector().length, 1);
  await act(() => renderer.unmount());
});

test('whole family keeps its board alongside opt-in stories and restores the selected tab from a detour', async () => {
  const initial = model.readAtlasWorkspaceRoute('?atlas=1&workspace=1&relation=structure&part=莫&anchor=莫&focus=character&hanzi=幕&hsk=all');
  let renderer;
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousAudio = globalThis.Audio;
  const recordings = [];
  const storageWrites = [];
  globalThis.document = {getElementById() { return null; }};
  globalThis.window = {scrollTo() {}, localStorage: {
    getItem() { return null; },
    setItem(...args) { storageWrites.push(args); },
    removeItem(...args) { storageWrites.push(args); },
  }};
  globalThis.Audio = class extends EventTarget {
    constructor(source) {
      super();
      this.source = source;
      this.paused = false;
      recordings.push(this);
    }
    play() { return Promise.resolve(); }
    pause() {
      this.paused = true;
      this.dispatchEvent(new Event('pause'));
    }
    load() {}
    removeAttribute() {}
  };
  const viewport = {scrollTop: 0, scrollTo() {}};
  try {
    await act(() => {renderer = create(createElement(model.AtlasWorkspace, {
      penOnly: false, setPenOnly() {}, notify() {}, embedded: {initial, viewport},
    }));});
    const board = () => renderer.root.findByProps({id: 'aw-family-board'});
    const members = () => board().findByProps({className: 'aw-structure-board'}).findAllByType('button');
    const pane = () => renderer.root.findAllByProps({id: 'aw-story-pane'})[0];
    const activeStory = () => pane().findAll(node => typeof node.type === 'string' && node.props['data-story-target'])[0]?.props['data-story-target'];
    const step = label => pane().findAllByType('button').find(node => node.children.includes(label));

    assert.equal(members().length, 11);
    assert.equal(pane(), undefined);
    await act(() => button(renderer, 'Story beside family').props.onClick());
    assert.equal(members().length, 11);
    assert.equal(activeStory(), '幕');
    await act(() => step('Structure').props.onClick());
    assert.equal(step('Structure').props['aria-pressed'], true);
    const part = pane().findAllByType('button').find(node => node.props['aria-label']?.includes('巾')
      || node.findAllByProps({className: 'ase-part-hanzi'}).some(child => child.children.includes('巾')));
    assert.ok(part);
    await act(() => part.props.onClick());
    assert.equal(activeStory(), undefined);
    await act(() => renderer.root.findByProps({'aria-label': 'Atlas exploration trail'}).findByType('button').props.onClick());
    assert.equal(activeStory(), '幕');
    assert.equal(step('Structure').props['aria-pressed'], true);
    assert.equal(members().length, 11);
    const pick = hanzi => members().find(node => node.props['aria-label']?.startsWith(hanzi)
      || node.findAll(child => child.props.lang === 'zh-Hans').some(child => child.children.includes(hanzi)));
    await act(() => pick('暮').props.onClick());
    assert.equal(activeStory(), '暮');
    await act(() => button(renderer, 'Listen to narration').props.onClick());
    assert.equal(recordings.at(-1).source, '/atlas/family-stories/mu-dusk-en.mp3');
    await act(() => pick('寞').props.onClick());
    assert.equal(recordings.at(-1).paused, true);
    assert.equal(activeStory(), undefined);
    assert.equal(pane().findAll(node => node.type === 'p' && node.children.includes('No story prepared yet.')).length, 1);
    assert.equal(pane().findAllByProps({'aria-label': 'Context inspector'}).length, 1);
    await act(() => button(renderer, 'Back to family').props.onClick());
    assert.equal(pane(), undefined);
    assert.equal(pick('寞').props['aria-pressed'], true);
    assert.equal(members().length, 11);

    await act(() => renderer.root.findByProps({'aria-label': 'Family search type'}).props.onChange({target: {value: 'literal'}}));
    await act(() => renderer.root.findByProps({id: 'aw-anchor'}).props.onChange({target: {value: '明天'}}));
    await act(() => renderer.root.findByType('form').props.onSubmit({preventDefault() {}}));
    await act(() => button(renderer, 'Story beside family').props.onClick());
    assert.equal(activeStory(), '明天');
    await act(() => step('In use').props.onClick());
    const contextListen = () => pane().findByProps({'aria-label': 'Context inspector'}).findAllByType('button')
      .find(node => node.children.includes('Listen'));
    await act(() => contextListen().props.onClick());
    assert.equal(recordings.at(-1).source, '/audio/tomorrow-word.mp3');
    assert.equal(contextListen().props['aria-pressed'], true);
    await act(() => button(renderer, 'Hear the sentence').props.onClick());
    assert.equal(recordings.at(-1).source, '/audio/tomorrow-sentence.mp3');
    assert.equal(contextListen().props['aria-pressed'], false);
    await act(() => contextListen().props.onClick());
    assert.equal(recordings.at(-1).source, '/audio/tomorrow-word.mp3');
    assert.equal(contextListen().props['aria-pressed'], true);
    await act(() => button(renderer, 'Back to family').props.onClick());
    assert.equal(recordings.at(-1).paused, true);
    assert.deepEqual(storageWrites, []);
  } finally {
    if (renderer) await act(() => renderer.unmount());
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
    globalThis.Audio = previousAudio;
  }
});
