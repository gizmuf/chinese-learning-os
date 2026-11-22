import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const require = createRequire(import.meta.url);
const bundle = await build({
  stdin: {contents: `export {default as Grammar} from './app/hsk3-grammar';
    export {LookupContext} from './app/study-lookup-context';
    export {createElement} from 'react';
    export {default as renderer, act} from 'react-test-renderer';`, resolveDir: process.cwd(), loader: 'tsx'},
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
  loader: {'.css': 'empty'}, alias: {react: require.resolve('react').replace(/\/index\.js$/, '')},
  plugins: [{name: 'test-context', setup(build) {
    build.onResolve({filter: /^\.\/i18n$/}, () => ({path: 'i18n', namespace: 'test'}));
    build.onResolve({filter: /^\.\/auth-client$/}, () => ({path: 'auth', namespace: 'test'}));
    build.onLoad({filter: /.*/, namespace: 'test'}, args => ({
      contents: args.path === 'i18n' ? `export const useI18n=()=>({locale:'en'});`
        : `export const authenticatedFetch=async()=>Response.json({events:[]});`, loader: 'js',
    }));
  }}],
});
globalThis.require = require;
const file = join(mkdtempSync(join(tmpdir(), 'grammar-dictionary-')), 'bundle.mjs');
writeFileSync(file, bundle.outputFiles[0].text);
const m = await import(pathToFileURL(file));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window = new EventTarget();
window.location = new URL('https://test.invalid/?grammar=hsk3&hsk=3&grammarTopic=hsk2-syllabus-15&grammarExercise=hsk2-syllabus-15-exercise');
globalThis.history = {replaceState(_state, _unused, url) {window.location = new URL(url);}};
const button = (root, label) => root.root.findAllByType('button').find(node => node.children.join('') === label);
const studyWords = node => node.findAllByType('button').filter(button => button.props.className === 'study-word');
test.after(() => {for (const handle of process._getActiveHandles()) if (handle.constructor.name === 'MessagePort') handle.unref();});

test('guided grammar uses the common dictionary without choosing or checking an answer', async () => {
  const opened = [];
  const lookup = {dictionary: new Map(), open: (...args) => opened.push(args)};
  let root;
  await m.act(() => {root = m.renderer.create(m.createElement(m.LookupContext.Provider, {value: lookup},
    m.createElement(m.Grammar, {db: null, owner: null})));});
  try {
    const example = root.root.findByProps({className: 'grammar-example'});
    assert.ok(studyWords(example).length > 0, 'the example must expose the established dictionary targets');
    assert.equal(example.props['data-study-sentence'], '她一到家就做饭。');
    assert.equal(example.props['data-study-pinyin'], 'Tā yí dào jiā jiù zuòfàn.');
    assert.equal(example.props['data-study-meaning'], 'As soon as she gets home, she cooks.');
    assert.ok(studyWords(root.root.findByProps({className: 'grammar-pattern'})).length > 0);
    assert.ok(studyWords(root.root.findByProps({className: 'grammar-question'})).length > 0);
    const trigger = {};
    await m.act(() => studyWords(example)[0].props.onClick({stopPropagation() {}, currentTarget: trigger}));
    assert.deepEqual(opened[0], ['她', trigger]);
    const definition = root.root.findAllByType('button').find(node => node.props['aria-label'] === 'Definition: 就');
    assert.ok(definition, 'answer definitions must have a separate dictionary action');
    await m.act(() => definition.props.onClick({stopPropagation() {}, currentTarget: trigger}));
    assert.deepEqual(opened[1], ['就', trigger]);
    assert.equal(button(root, 'Check answer').props.disabled, true);
    assert.ok(root.root.findAllByType('button').filter(node => 'aria-pressed' in node.props).every(node => node.props['aria-pressed'] === false));
    for (const answer of root.root.findAllByType('button').filter(node => 'aria-pressed' in node.props)) {
      assert.equal(answer.findAllByType('button').length, 1, 'dictionary buttons must not be nested inside answer buttons');
    }
    const answer = root.root.findAllByType('button').find(node => 'aria-pressed' in node.props && node.children.join('') === '就');
    await m.act(() => answer.props.onClick());
    assert.equal(button(root, 'Check answer').props.disabled, false);
    await m.act(() => button(root, 'Check answer').props.onClick());
    const feedback = root.root.findByProps({role: 'status'});
    assert.ok(studyWords(feedback).length > 0, 'the completed sentence remains explorable after grading');
    assert.equal(window.location.search.includes('grammarExercise=hsk2-syllabus-15-exercise'), true);
  } finally {await m.act(() => root.unmount());}
});
