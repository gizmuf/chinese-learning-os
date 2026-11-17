import assert from 'node:assert/strict';
import {readFile, readdir, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {build} from 'esbuild';

const lessonId = 'hanzi-families-2026-11-17';
const readData = async (suffix = '') => JSON.parse(await readFile(
  new URL(`../data/${lessonId}${suffix}.json`, import.meta.url), 'utf8',
));
const [source, exercises, audio] = await Promise.all([readData(), readData('-practice'), readData('-audio')]);
const {entries, visualFamilies} = source;
const {outputFiles} = await build({
  entryPoints: [fileURLToPath(new URL('../app/hanzi-family-lesson-route.ts', import.meta.url))],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const {hanziFamilyLessonHref, hanziFamilyBackLink, matchesHanziAnswer} = await import(
  'data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64')
);

// Main list from the companion JSON and shape groups from the PDF appendix.
const headwords = (
  '一般 椅子 一点儿 一些 有的 有点儿 有些 有时候 雨 远 月 再 在 早 怎么 怎么样 找 这 样 这里 真 正在 只 只是 但 ' +
  '知道 住 桌子 字 写 昨天 乍 坐 做 爱好 白色 班 帮 帮忙 包 比 如 别 不错 不好意思 长 车站 出 出来 出去'
).split(' ');
const shapes = [
  '木 本 末 未', '般 船', '椅 骑 奇', '远 园 完 元', '样 洋 羊', '昨 作 怎 炸 窄',
  '住 往 注 主', '包 抱 饱 跑 炮', '比 北 批 毕', '坐 座 做 作', '白 百 日 目', '再 在 来 米',
].map(group => group.split(' '));

test('preserves source order for the 50 terms and all appendix groups', () => {
  assert.deepEqual(entries.map(entry => entry.hanzi), headwords);
  assert.deepEqual(visualFamilies.map(group => group.forms), shapes);
  for (const group of visualFamilies) {
    assert.deepEqual(group.examples.map(example => example.hanzi), group.forms, group.title);
  }
  assert.equal(visualFamilies.flatMap(group => group.forms).filter(form => form === '作').length, 2);
});

test('ties every exercise and its feedback to the corresponding source item', () => {
  const exerciseId = (group, index) => `${group}-${String(index + 1).padStart(2, '0')}`;
  assert.deepEqual(exercises.map(exercise => exercise.id), [
    ...headwords.map((_, index) => exerciseId('word', index)),
    ...shapes.map((_, index) => exerciseId('shape', index)),
  ]);
  for (const [index, entry] of entries.entries()) {
    const exercise = exercises[index];
    if (['只', '长'].includes(entry.hanzi)) {
      assert.deepEqual(exercise.answer.split(' · '), entry.pinyin.split(' / '), exercise.id);
    } else {
      assert.ok(exercise.answer.includes(entry.hanzi), exercise.id);
    }
  }
  for (const [index, forms] of shapes.entries()) {
    const exercise = exercises[entries.length + index];
    assert.deepEqual(exercise.choices.filter(choice => forms.includes(choice)).sort(), [...forms].sort(), exercise.id);
    assert.ok(forms.includes(exercise.answer), exercise.id);
  }
  for (const exercise of exercises) {
    for (const field of ['prompt', 'answer', 'explanation', 'pinyin', 'meaning']) {
      assert.ok(exercise[field]?.trim(), `${exercise.id} should provide ${field}`);
    }
    assert.ok(matchesHanziAnswer(exercise, exercise.answer), exercise.id);
    assert.equal(matchesHanziAnswer(exercise, ' 。！ '), false, exercise.id);
    for (const alternate of exercise.accepted ?? []) {
      assert.ok(matchesHanziAnswer(exercise, alternate), exercise.id);
    }
    if (exercise.kind === 'choice') {
      assert.deepEqual(exercise.choices.filter(choice => matchesHanziAnswer(exercise, choice)), [exercise.answer], exercise.id);
    }
  }
});

test('typed answers stay out of their clues', () => {
  for (const {kind, id, prompt, context, answer, accepted = []} of exercises) {
    if (kind !== 'gap' && kind !== 'writing') continue;
    assert.ok(context.includes('＿＿'), id);
    for (const response of [answer, ...accepted]) {
      assert.ok(!`${prompt} ${context}`.includes(response), `${id} reveals ${response}`);
    }
  }
});

// A repeated tile can be used twice only when two distinct indices carry it.
function canArrangeTiles(tiles, remaining, indices = tiles.map((_, index) => index)) {
  if (!indices.length) return remaining === '';
  return indices.some(index => remaining.startsWith(tiles[index]) && canArrangeTiles(
    tiles, remaining.slice(tiles[index].length), indices.filter(other => other !== index),
  ));
}

test('every sentence solution can be built using each tile index once', () => {
  const builds = exercises.filter(exercise => exercise.kind === 'build');
  const repeated = builds.find(exercise => exercise.id === 'word-05');
  assert.equal(repeated.choices.filter(tile => tile === '有的人').length, 2);
  assert.equal(canArrangeTiles(repeated.choices.filter((tile, index, all) => all.indexOf(tile) === index), repeated.answer), false);
  for (const exercise of builds) {
    const {id, choices, answer, accepted = []} = exercise;
    assert.ok(!matchesHanziAnswer(exercise, choices.join('')), `${id} starts scrambled`);
    for (const solution of [answer, ...accepted]) {
      assert.ok(canArrangeTiles(choices, solution), `${id}: ${solution}`);
      assert.ok(matchesHanziAnswer(exercise, ` ${solution.replaceAll('，', ', ')}。 `), id);
    }
  }
});

test('audio manifest and bundled MP3s match the full set of example sentences', async () => {
  const directory = new URL(`../public/audio/${lessonId}/`, import.meta.url);
  assert.equal(new Set(entries.map(entry => entry.example)).size, 50);
  assert.deepEqual(Object.keys(audio).sort(), entries.map(entry => entry.example).sort());
  const filenames = Object.values(audio).map(path => {
    assert.match(path, new RegExp(`^/audio/${lessonId}/[a-f0-9]{20}\\.mp3$`));
    return path.split('/').at(-1);
  });
  assert.equal(new Set(filenames).size, 50);
  assert.deepEqual((await readdir(directory)).sort(), filenames.sort());
  await Promise.all(filenames.map(async filename => {
    const details = await stat(new URL(filename, directory));
    assert.ok(details.isFile() && details.size > 1024, filename);
  }));
});

test('lesson back links preserve the library selection and restrict the return destination', () => {
  assert.equal(hanziFamilyLessonHref, `/?course=intensive&material=${lessonId}`);
  assert.equal(hanziFamilyBackLink(''), '/?course=intensive');
  const library = '/?study=library&lesson=49#details';
  const back = returnTo => hanziFamilyBackLink(new URLSearchParams({from: 'lessons', returnTo}).toString());
  assert.equal(back(library), library);
  assert.equal(back('//example.com/?study=library'), '/?study=library');
  assert.equal(back('/?course=intensive&material=other'), '/?study=library');
});
