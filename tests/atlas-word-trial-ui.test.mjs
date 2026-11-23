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
  stdin: {
    contents: "export {default as Trial} from './app/atlas-word-trial'; export * from './app/atlas-workspace-route';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  jsx: 'automatic',
  loader: {'.css': 'empty'},
  plugins: [{
    name: 'word-trial-ui-playback',
    setup(builder) {
      builder.onResolve({filter: /^(?:react(?:\/jsx-runtime)?|lucide-react)$/}, ({path}) => ({
        path: require.resolve(path), external: true,
      }));
      builder.onResolve({filter: /^\.\/atlas-word-trial-audio$/}, ({path}) => ({path, namespace: 'playback'}));
      builder.onLoad({filter: /.*/, namespace: 'playback'}, () => ({
        contents: `
          import {useCallback, useState} from 'react';
          export const wordTrialAudioKey = term => term.hanzi + '|' + term.pinyin;
          export function useWordTrialPlayback() {
            const [activeKey, setKey] = useState(null);
            const stop = useCallback(() => setKey(null), []);
            return {activeKey, stop, error: null, errorKey: null, play: term => {
              const key = wordTrialAudioKey(term);
              setKey(activeKey === key ? null : key);
            }};
          }
        `,
      }));
    },
  }],
});

const scratch = mkdtempSync(join(tmpdir(), 'atlas-word-trial-ui-'));
const filename = join(scratch, 'test.mjs');
const {Trial, atlasTrialWord, atlasWorkspaceHref, readAtlasWorkspaceRoute, atlasWorkspaceReturn} = await (async () => {
  try {
    writeFileSync(filename, bundle.text);
    return await import(pathToFileURL(filename));
  } finally {
    rmSync(scratch, {recursive: true, force: true});
  }
})();

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const term = (hanzi, pinyin, english, levels = []) => ({hanzi, pinyin, english, levels});
const room = term('间', 'jiān', 'room', ['4']);
const bathroom = {...term('卫生间', 'wèishēngjiān', 'restroom', ['3']), characters: [term('卫', 'wèi', 'guard'), term('生', 'shēng', 'life', ['1']), room]};
const washroom = {...term('洗手间', 'xǐshǒujiān', 'washroom'), characters: [term('洗', 'xǐ', 'wash', ['1']), term('手', 'shǒu', 'hand', ['1']), room]};
const sentence = term('卫生间在哪儿？', 'Wèishēngjiān zài nǎr?', 'Where is the restroom?');
const study = {
  story: 'Na stacji widzisz znak 卫生间.',
  cues: [bathroom],
  inlineTerms: [term('厕所', 'cèsuǒ', 'toilet', ['2']), term('公厕', 'gōngcè', 'public toilet')],
  related: [{term: washroom, hint: 'Dobre słowo w uprzejmym pytaniu. Możesz usłyszeć 厕所.'}],
  situations: [{label: 'Na stacji', sentence, words: [bathroom, term('在哪儿', 'zài nǎr', 'where is')]}],
};
const catalog = {entries: [
  {head: bathroom, versions: {gpt: study, deepseek: {...study, story: 'W kawiarni szukasz znaku 卫生间 lub 公厕.'}}, sources: {gpt: 'model A', deepseek: 'model B'}},
  {head: room, versions: {gpt: study, deepseek: null}},
]};

function button(root, label) {
  const match = root.findAllByType('button').find(node => (node.props['aria-label'] ?? node.props.children) === label);
  assert.ok(match, 'missing button ' + label);
  return match;
}

function renderedText(node) {
  return typeof node === 'string' ? node : node?.children?.map(renderedText).join('') ?? '';
}

test('Atlas links round-trip the selected trial word independently of Swipe Words', () => {
  const query = '?atlas=1&workspace=1&mode=word-trial&trialWord=雪&swipeWord=房间&wordView=connections';
  const route = readAtlasWorkspaceRoute(query);
  assert.equal(route.mode, 'word-trial');
  assert.equal(route.trialWord, '雪');
  assert.equal(route.swipeWord, undefined);
  assert.equal(new URLSearchParams(atlasWorkspaceHref(route)).get('trialWord'), '雪');
  assert.equal(new URLSearchParams(atlasWorkspaceReturn(query)).get('trialWord'), '雪');
  assert.equal(readAtlasWorkspaceRoute('?mode=word-trial&trialWord=中文').trialWord, '卫生间');
  assert.equal(atlasTrialWord(), '卫生间');
  assert.equal(readAtlasWorkspaceRoute('?mode=swipe&swipeWord=房间&trialWord=雪').trialWord, undefined);
});

test('both providers expose the same active section and render clickable sentence, word and character pronunciations', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    assert.equal(url, '/atlas/word-trial/v1.json');
    return Response.json(catalog);
  };
  const chosen = [];
  const props = {word: '卫生间', onWordChange: word => chosen.push(word), onClose: () => {}};
  let renderer;
  try {
    await act(async () => {renderer = create(createElement(Trial, props));});
    const root = renderer.root;
    const columns = () => root.findByProps({className: 'awt-columns'});
    const text = () => renderedText(renderer.toJSON());
    assert.match(text(), /Na stacji widzisz znak/);
    assert.match(text(), /W kawiarni szukasz znaku/);
    assert.match(text(), /model A/);
    assert.match(text(), /guard/);
    assert.match(text(), /HSK 4 · znak/);
    assert.match(text(), /HSK 3 · słowo/);
    assert.match(root.findAllByType('option')[0].props.children.join(''), /卫生间 · wèishēngjiān · restroom · HSK 3/);
    assert.match(text(), /public toilet/);
    assert.ok(button(root, 'Odsłuchaj 公厕, gōngcè').findByType('rt'));
    assert.ok(button(root, 'Odsłuchaj 间, jiān'));

    await act(() => button(root, 'Sytuacje').props.onClick());
    assert.equal(button(root, 'Sytuacje').props['aria-pressed'], true);
    await act(() => button(root, 'DeepSeek').props.onClick());
    assert.equal(columns().props['data-provider'], 'deepseek');
    assert.equal(button(root, 'Sytuacje').props['aria-pressed'], true);
    assert.match(text(), /Where is the restroom\?/);
    const sentenceLabel = 'Odsłuchaj 卫生间在哪儿？, Wèishēngjiān zài nǎr?';
    await act(() => button(root, sentenceLabel).props.onClick());
    assert.equal(button(root, sentenceLabel).props['aria-pressed'], true);
    await act(() => button(root, 'Odsłuchaj 在哪儿, zài nǎr').props.onClick());
    assert.equal(button(root, sentenceLabel).props['aria-pressed'], false);
    assert.equal(button(root, 'Odsłuchaj 在哪儿, zài nǎr').props['aria-pressed'], true);

    await act(() => button(root, 'Podobne słowa').props.onClick());
    assert.match(text(), /Dobre słowo/);
    assert.ok(button(root, 'Odsłuchaj 厕所, cèsuǒ').findByType('rt'));
    assert.ok(root.findAllByProps({'aria-label': 'Słowa z objaśnienia'}).length);
    assert.match(text(), /poza wykazem/);
    assert.ok(root.findAllByType('details').some(details => details.findAllByType('button').length === 3));
    for (const control of root.findAllByType('button')) assert.equal(control.findAllByType('button').length, 1);

    await act(() => root.findByType('select').props.onChange({target: {value: '间'}}));
    assert.deepEqual(chosen, ['间']);
    await act(() => renderer.update(createElement(Trial, {...props, word: '间'})));
    assert.match(text(), /Brak lekcji od DeepSeek\./);
    assert.equal(columns().props['data-provider'], 'deepseek');
    assert.equal(button(root, 'Podobne słowa').props['aria-pressed'], true);
  } finally {
    if (renderer) await act(() => renderer.unmount());
    globalThis.fetch = originalFetch;
  }
});

test('a catalog network failure has a retry action', async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => ++attempts === 1 ? new Response(null, {status: 503}) : Response.json(catalog);
  let renderer;
  try {
    await act(async () => {renderer = create(createElement(Trial, {word: '卫生间', onWordChange: () => {}, onClose: () => {}}));});
    assert.equal(renderer.root.findByProps({role: 'alert'}).props.children, 'Nie udało się wczytać lekcji.');
    await act(async () => button(renderer.root, 'Spróbuj ponownie').props.onClick());
    assert.equal(attempts, 2);
    assert.equal(renderer.root.findByType('select').props.value, '卫生间');
  } finally {
    if (renderer) await act(() => renderer.unmount());
    globalThis.fetch = originalFetch;
  }
});

test('one local choice per word survives remounting and pressing again removes it', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const key = word => 'chinese-os:atlas-word-trial:v1:vote:' + word;
  const saved = new Map([[key('卫生间'), '{bad JSON']]);
  const listeners = new Set();
  let denied = false;
  globalThis.fetch = async () => Response.json(catalog);
  const storage = {
    getItem: key => saved.get(key) ?? null,
    setItem: (key, value) => {
      if (denied) throw new Error('Storage denied');
      saved.set(key, value);
    },
    removeItem: key => {
      if (denied) throw new Error('Storage denied');
      saved.delete(key);
    },
  };
  globalThis.window = {
    localStorage: storage,
    addEventListener: (name, listener) => {if (name === 'storage') listeners.add(listener);},
    removeEventListener: (name, listener) => {if (name === 'storage') listeners.delete(listener);},
  };
  const props = {onWordChange: () => {}, onClose: () => {}};
  let renderer;
  function vote(label) {
    return button(renderer.root.findByProps({className: 'awt-vote-options'}), label);
  }
  function footer() {
    return renderedText(renderer.toJSON()).split('Mój wybór').at(-1);
  }
  try {
    await act(async () => {renderer = create(createElement(Trial, {...props, word: '卫生间'}));});
    assert.match(footer(), /0\/2 ocenionych/);
    await act(() => vote('DeepSeek').props.onClick());
    assert.match(footer(), /1\/2 ocenionych/);
    assert.equal(vote('DeepSeek').props['aria-pressed'], true);
    await act(() => vote('GPT').props.onClick());
    assert.equal(saved.get(key('卫生间')), 'gpt');
    await act(() => renderer.update(createElement(Trial, {...props, word: '间'})));
    assert.equal(vote('GPT').props['aria-pressed'], false);
    await act(() => vote('Remis').props.onClick());
    assert.match(footer(), /2\/2 ocenionych/);
    await act(() => renderer.unmount());
    await act(async () => {renderer = create(createElement(Trial, {...props, word: '间'}));});
    assert.equal(vote('Remis').props['aria-pressed'], true);
    await act(() => vote('Remis').props.onClick());
    assert.deepEqual([...saved], [[key('卫生间'), 'gpt']]);
    assert.match(footer(), /1\/2 ocenionych/);
    denied = true;
    await act(() => vote('DeepSeek').props.onClick());
    assert.equal(vote('DeepSeek').props['aria-pressed'], true);
    assert.match(footer(), /dostępne do zamknięcia tej strony/);
    await act(() => {
      for (const listener of listeners) listener({key: key('卫生间'), storageArea: storage, newValue: null});
    });
    assert.match(footer(), /1\/2 ocenionych/);
    assert.equal(vote('DeepSeek').props['aria-pressed'], true);
  } finally {
    if (renderer) await act(() => renderer.unmount());
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});
