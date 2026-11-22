import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';

const {outputFiles: [bundle]} = await build({
  stdin: {
    contents: "export * from './app/atlas-assembly-model'; export * from './app/atlas-swipe-model'; export * from './app/atlas-swipe-regions'; export * from './app/atlas-workspace-route';",
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const model = await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));
const index = model.assemblyIndex('en');
const get = glyph => index.characters.get(glyph);

test('a left slot swipe is reversible with the same right-hand component', () => {
  const sunny = model.slotSwipeMap(index, get('晴'), get('晴').parts[0], 3);
  assert.equal(sunny.from.anchor, '青');
  assert.equal(sunny.map.neighbours.right.text, '睛');
  assert.equal(sunny.map.neighbours.right.anchor, '青');
  const eye = model.slotSwipeMap(index, get('睛'), get('睛').parts[0], 3);
  assert.equal(eye.map.neighbours.left.text, '晴');
});

test('nested parts retain their original stroke indices and reject a mismatched outline', () => {
  const qing = model.rootSwipeRegions(get('清')).find(region => region.part.glyph === '青');
  const children = model.childSwipeRegions(index, qing, []);
  assert.deepEqual(children.map(region => [region.part.glyph, region.strokes]), [
    ['龶', [3, 4, 5, 6]], ['月', [7, 8, 9, 10]],
  ]);
  assert.deepEqual(model.childSwipeRegions(index, {...qing, strokes: qing.strokes.slice(1)}, []), []);
});

test('scope playback counts each character and written headword once, and keeps families real', () => {
  const characters = model.scopedCharacterFrames(index, 3);
  const words = model.wordFrames('en', 3, '', true);
  assert.equal(characters.length, 655);
  assert.equal(new Set(characters.map(frame => frame.text)).size, characters.length);
  assert.equal(new Set(words.map(frame => frame.text)).size, words.length);
  assert.ok(words.some(frame => frame.text === '眼睛'));
  const cover = model.focusCharacter(index, get('学'), '冖');
  const family = model.characterFrames(index, cover, 'all');
  const map = model.swipeMap(family, model.swipeCharacterFrame(cover), true);
  assert.equal(map.next, 'down');
  assert.ok(family.every(frame => frame.character.part.glyph === '冖'));
});

test('Swipe links preserve which copy of a repeated component is in focus', () => {
  const url = '?mode=swipe&atlas=1&workspace=1&buildHanzi=森&buildPart=木&swipeSlot=1.1';
  const route = model.readAtlasWorkspaceRoute(url);
  assert.equal(route.swipeSlot, '1.1');
  assert.equal(model.focusCharacter(index, get('森'), route.buildPart, route.swipeSlot).part.positions[0], 'lower right');
  assert.equal(model.readAtlasWorkspaceRoute(model.atlasWorkspaceHref(route)).swipeSlot, '1.1');
  assert.equal(model.readAtlasWorkspaceRoute('?mode=swipe&swipeSlot=5%3C').swipeSlot, undefined);
});
