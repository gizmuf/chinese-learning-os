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
