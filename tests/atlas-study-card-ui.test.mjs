import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { createElement } from 'react';
import { act, create } from 'react-test-renderer';

const require = createRequire(import.meta.url);
const bundle = await build({
  entryPoints: ['app/atlas-study-card.tsx'],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  jsx: 'automatic',
  loader: { '.css': 'empty' },
  plugins: [{
    name: 'shared-react',
    setup(builder) {
      builder.onResolve({ filter: /^(?:react(?:\/jsx-runtime)?|lucide-react)$/ }, ({ path }) => ({
        path: require.resolve(path), external: true,
      }));
    },
  }],
});
const directory = mkdtempSync(join(tmpdir(), 'atlas-study-card-ui-'));
const filename = join(directory, 'card.mjs');
const { default: AtlasStudyCard } = await (async () => {
  try {
    writeFileSync(filename, bundle.outputFiles[0].text);
    return await import(pathToFileURL(filename));
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
})();

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const term = (hanzi, pinyin, english, levels = []) => ({ hanzi, pinyin, english, levels });
const snow = term('雪', 'xuě', 'snow', ['1']);
const fallingSnow = term('下雪', 'xià xuě', 'to snow');
const snowing = { ...term('下雪了。', 'Xià xuě le.', 'It’s snowing.'), words: [fallingSnow] };
const snowStopped = term('雪停了。', 'Xuě tíng le.', 'The snow has stopped.');
const thunder = term('雷', 'léi', 'thunder', ['6']);
const zero = term('零', 'líng', 'zero', ['1']);
const need = term('需', 'xū', 'to need', ['3']);
const rain = term('雨', 'yǔ', 'rain', ['1']);
const component = term('彐', 'jì', 'component');
const namedComponent = { ...term('辶', '', 'movement form'), namePinyin: 'zǒuzhīpáng' };
const graphicComponent = term('𠂉', '', 'three-stroke top form');
const skiing = term('滑雪', 'huáxuě', 'to ski', ['6']);
const bank = { ...term('银行', 'yínháng', 'bank', ['3']), kind: 'word' };
const study = { ...term('学', 'xué', 'to study', ['1']), kind: 'character' };
const pilot = {
  entry: snow,
  words: [{ ...snow, example: snowStopped }, { ...fallingSnow, example: snowing }, skiing],
  parts: [rain, component, namedComponent, graphicComponent],
  families: [{ part: rain, members: [snow, zero, need, thunder], notes: { '需': 'Samodzielne słowo 需 ma poziom HSK 5.' } }],
  comparisons: [
    { term: thunder, note: 'U góry zostaje 雨.' },
    { term: skiing, note: '滑雪 to wyrażenie z 雪.' },
  ],
  usage: [{ title: 'Pogoda', examples: [snowing] }],
  contexts: [snowStopped],
  story: ['Wyglądasz przez okno 雨.', 'Łapiesz płatek 雪 koło 银行 i widzisz znak 学. Chwilę później zaczyna 下雪.'],
  storyTerms: [{ ...rain, kind: 'character' }, { ...snow, kind: 'character' }, bank, bank, study, { ...fallingSnow, kind: 'word' }],
};

function content(node) {
  return typeof node === 'string' ? node : node.children.map(content).join('');
}

function button(renderer, text, root = renderer.root) {
  const match = root.findAllByType('button').find(node => content(node).includes(text));
  assert.ok(match, 'Button present: ' + text);
  return match;
}

function visiblePanel(renderer) {
  return renderer.root.findAllByProps({ role: 'tabpanel' }).find(panel => !panel.props.hidden);
}

test('a study card selects vocabulary and whole examples, labels HSK, and browses the recognition catalog', async t => {
  const index = [snow, zero, need].map(item => ({ ...item, pack: 'sample' }));
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.endsWith('/index.json')) return Response.json({ cards: index });
    if (url.endsWith('/sample.json')) return Response.json({
      '雪': pilot, '零': { ...pilot, entry: zero, storyTerms: [{ ...zero, kind: 'character' }] },
    });
    throw new Error('Unexpected fetch: ' + url);
  });
  const selected = [];
  const navigate = hanzi => selected.push(hanzi);
  let closed = false;
  const props = { hanzi: '雪', onNavigate: navigate, onClose: () => { closed = true; }, returnLabel: 'Słownik' };
  let renderer;
  await act(() => { renderer = create(createElement(AtlasStudyCard, props)); });
  t.after(async () => { await act(() => renderer.unmount()); });

  assert.equal(content(renderer.root.findByType('h2')), '雪xuěsnow');
  assert.equal(renderer.root.findByProps({ className: 'asc-mast' }).findByProps({ 'aria-label': 'Odsłuchaj: 雪' }).type, 'button');
  assert.match(content(visiblePanel(renderer)), /下雪了。Xià xuě le.It’s snowing./);
  await act(() => button(renderer, 'Dalsze HSK', visiblePanel(renderer)).props.onClick());
  assert.match(content(visiblePanel(renderer)), /滑雪huáxuěto skiHSK 6/);
  assert.doesNotMatch(content(visiblePanel(renderer)), /下雪了。/);
  await act(() => button(renderer, 'Poza wykazem', visiblePanel(renderer)).props.onClick());
  assert.equal(button(renderer, 'to snow', visiblePanel(renderer)).props['aria-pressed'], true);
  assert.match(content(visiblePanel(renderer)), /下雪xià xuěto snowpoza wykazem/);

  await act(() => button(renderer, 'Rodzina').props.onClick());
  assert.match(content(visiblePanel(renderer)), /Wspólny komponent 雨 · yǔ · rain · HSK 1/);
  assert.match(content(visiblePanel(renderer)), /彐jìcomponentpoza wykazem/);
  await act(() => button(renderer, 'to need', visiblePanel(renderer)).props.onClick());
  assert.match(content(visiblePanel(renderer)), /HSK 3.*Samodzielne słowo 需 ma poziom HSK 5/);
  assert.equal(button(renderer, 'Otwórz kartę 需', visiblePanel(renderer)).type, 'button');

  await act(() => button(renderer, 'Łatwo pomylić').props.onClick());
  assert.match(content(visiblePanel(renderer)), /U góry zostaje 雨/);
  assert.match(content(visiblePanel(renderer)), /雪xuěsnowHSK 1 · znak雷léithunderHSK 6 · znak/);
  await act(() => button(renderer, '滑雪', visiblePanel(renderer)).props.onClick());
  assert.match(content(visiblePanel(renderer)), /滑雪huáxuěto skiHSK 6 · słowo/);

  await act(() => button(renderer, 'W użyciu').props.onClick());
  assert.equal(visiblePanel(renderer).findByProps({ 'aria-label': 'Odsłuchaj: 下雪了。' }).type, 'button');
  assert.equal(visiblePanel(renderer).findByProps({ 'aria-label': 'Odsłuchaj: 雪停了。' }).type, 'button');
  assert.equal(button(renderer, 'It’s snowing.', visiblePanel(renderer)).props['aria-pressed'], false);
  await act(() => button(renderer, 'It’s snowing.', visiblePanel(renderer)).props.onClick());
  assert.equal(button(renderer, 'It’s snowing.', visiblePanel(renderer)).props['aria-pressed'], true);
  assert.match(content(visiblePanel(renderer)), /下雪xià xuěto snowpoza wykazem/);

  await act(() => button(renderer, 'Historyjka').props.onClick());
  assert.match(content(visiblePanel(renderer)), /Budowa i znaczenie.*Wyobrażona historyjka.*Łapiesz płatek/);
  assert.match(content(visiblePanel(renderer)), /雨yǔrainHSK 1 · znak彐jìcomponentpoza wykazem/);
  assert.match(content(visiblePanel(renderer)), /辶nazwa · zǒuzhīpángmovement formpoza wykazem/);
  assert.match(content(visiblePanel(renderer)), /𠂉forma graficznathree-stroke top formpoza wykazem/);
  assert.match(content(visiblePanel(renderer)), /雪 · xuě · snow · HSK 1/);
  const storyTerms = visiblePanel(renderer).findByProps({ 'aria-label': 'Znaki i słowa z historyjki' });
  assert.equal(storyTerms.children.length, 3);
  assert.equal(content(storyTerms), '银行yínhángbankHSK 3 · słowo学xuéto studyHSK 1 · znak下雪xià xuěto snowpoza wykazem');

  await act(async () => { button(renderer, 'Znaki').props.onClick(); });
  assert.equal(renderer.root.findByProps({ 'aria-current': 'true' }).type, 'button');
  assert.match(content(renderer.root.findByProps({ className: 'asc-index-scope' })), /3 znaków · HSK 1–3/);
  await act(() => renderer.root.findByType('input').props.onChange({ target: { value: 'ling2' } }));
  assert.equal(renderer.root.findAllByProps({ className: 'asc-index-grid' }).length, 1);
  await act(() => button(renderer, 'língzero').props.onClick());
  assert.deepEqual(selected, ['零']);
  await act(() => renderer.update(createElement(AtlasStudyCard, { ...props, hanzi: '零' })));
  assert.equal(content(renderer.root.findByType('h2')), '零língzero');
  assert.equal(visiblePanel(renderer).props['aria-labelledby'].endsWith('-words-tab'), true);
  await act(() => button(renderer, 'Historyjka').props.onClick());
  assert.equal(visiblePanel(renderer).findAllByProps({ 'aria-label': 'Znaki i słowa z historyjki' }).length, 0);
  await act(() => button(renderer, 'Słownik').props.onClick());
  assert.equal(closed, true);
});
