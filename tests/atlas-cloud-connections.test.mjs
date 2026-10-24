import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const result = await build({
  stdin: {
    contents: `export * from './app/atlas-cloud-connections';export {default as CloudHighlight} from './app/atlas-cloud-highlight';export {atlasComponents,atlasByHanzi} from './app/atlas-model';export {createElement} from 'react';export {renderToStaticMarkup} from 'react-dom/server';`,
    resolveDir: process.cwd(), loader: 'tsx',
  },
  bundle: true, platform: 'node', format: 'esm', write: false, jsx: 'automatic',
  banner: { js: "import{createRequire}from'node:module';const require=createRequire(process.cwd()+'/package.json');" },
});
const m = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
const mappings = JSON.parse(readFileSync('public/atlas/component-strokes.json', 'utf8')).mappings;

test('Functional relations use reviewed annotations, including declared glyph aliases', () => {
  for (const part of ['person', '人', '亻']) assert.equal(m.cloudRelation('你', part), 'meaning');
  for (const part of ['qing', '青']) assert.equal(m.cloudRelation('晴', part), 'sound');
  for (const part of ['water', '水', '氵']) assert.equal(m.cloudRelation('清', part), 'meaning');
  assert.equal(m.cloudRelation('北', 'spoon'), 'shape'); // Present in HSK structure, not curated functional claims.
  assert.equal(m.cloudRelation('你', 'unknown'), 'shape');
  assert.equal(m.cloudRelation('你', undefined), 'shape');
  assert.equal(m.cloudRelation('你好', 'person'), 'shape'); // Do not infer a whole-word relation from one character.
  assert.equal(m.cloudRelation('火', 'person'), 'shape'); // Structural resemblance is not a person meaning clue.
  for (const part of m.atlasComponents) {
    for (const glyph of [part.glyph, ...part.aliases]) assert.ok(m.cloudComponentIds(glyph).includes(part.id));
  }
});

test('Exact standalone aliases are whole shapes; partial highlighting requires an explicit mapping', () => {
  assert.equal(m.cloudHighlightAvailability('亻', 'person'), 'whole');
  assert.equal(m.cloudHighlightAvailability('水', '氵'), 'whole');
  assert.equal(m.cloudHighlightAvailability('木', 'wood'), 'whole');
  assert.equal(m.cloudHighlightAvailability('你', 'person'), 'mapped');
  assert.equal(m.cloudHighlightAvailability('北', 'spoon'), 'none');
  assert.equal(m.cloudHighlightAvailability('你好', 'person'), 'none');
  assert.equal(m.cloudHighlightAvailability('你', 'unknown'), 'none');
  const structure = JSON.parse(readFileSync('data/hanzi-structure.json', 'utf8'));
  for (const glyph of Object.keys(structure.namedComponents)) {
    assert.equal(m.cloudHighlightAvailability(glyph, glyph), 'whole');
    assert.equal(m.cloudHighlightAvailability(glyph, 'person'), 'none');
  }
});

test('Stroke indices match exact reviewed components and repeated parts include every mapped occurrence', () => {
  assert.deepEqual(m.cloudHighlightStrokes('你', '亻', 7), [0, 1]);
  assert.deepEqual(m.cloudHighlightStrokes('晴', '青', 12), [4, 5, 6, 7, 8, 9, 10, 11]);
  assert.deepEqual(m.cloudHighlightStrokes('林', 'wood', 8), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(m.cloudHighlightStrokes('森', '木', 12), Array.from({ length: 12 }, (_, i) => i));
  for (const [key, row] of Object.entries(mappings)) {
    const hanzi = String.fromCodePoint(parseInt(key.slice(1), 16));
    const { strokes } = JSON.parse(readFileSync(`public/characters/${hanzi}.json`, 'utf8'));
    for (const [component, indices] of Object.entries(row)) {
      assert.deepEqual(m.cloudHighlightStrokes(hanzi, component, strokes.length), [...indices].sort((a, b) => a - b), `${hanzi}/${component}`);
    }
  }
});

test('Malformed, absent, non-integer and out-of-range mappings fail closed as a whole', () => {
  for (const indices of [[], [-1], [7], [1.5], ['1'], [0, 0], [0, 99], null, '0,1']) {
    assert.equal(m.cloudHighlightStrokes('你', 'person', 7, { u4f60: { person: indices } }), null);
  }
  for (const count of [0, -1, NaN, Infinity, 1.5]) assert.equal(m.cloudHighlightStrokes('你', 'person', count), null);
  for (const bad of [null, [], {}, { u4f60: null }, { u4f60: [] }]) assert.equal(m.cloudHighlightStrokes('你', 'person', 7, bad), null);
  assert.equal(m.cloudHighlightStrokes('你', 'missing', 7), null);
  assert.equal(m.cloudHighlightStrokes('北', 'person', 5), null);
});

test('Renderer is accessible inline content with neutral full-glyph fallbacks, never invented fragments', () => {
  const render = props => m.renderToStaticMarkup(m.createElement(m.CloudHighlight, props));
  const whole = render({ hanzi: '亻', component: 'person', className: 'test-highlight' });
  assert.match(whole, /role="img"/); assert.match(whole, /aria-label="亻"/); assert.match(whole, /class="test-highlight"/);
  assert.match(whole, /data-cloud-highlight="whole"/); assert.match(whole, /var\(--cloud-shared,#b4423c\)/);
  const neutral = render({ hanzi: '北', component: 'spoon' });
  assert.match(neutral, /data-cloud-highlight="none"/); assert.match(neutral, />北<\/span>/); assert.doesNotMatch(neutral, /<svg|<path|b4423c/);
  const word = render({ hanzi: '你好', component: 'person' });
  assert.match(word, /aria-label="你好"/); assert.match(word, />你<\/span>/); assert.match(word, />好<\/span>/);
  const named = render({ hanzi: '\uf5fb', component: '\uf5fb' });
  assert.match(named, /ChineseOSNamedShapes/); assert.match(named, /data-cloud-highlight="whole"/);
  for (const html of [whole, neutral, word, named]) assert.doesNotMatch(html, /<button|<a\b|tabindex|onclick/i);
});
