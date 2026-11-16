import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const {outputFiles: [bundle]} = await build({
  stdin: {
    contents: "export * from './app/global-hsk-model'; export * from './app/hsk-scope'; export * from './app/review-queue'; export * from './app/content'; export * from './app/reading-lab-route'; export * from './app/chunk-situation-lab-model';",
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const hsk = await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));
const pool = scope => hsk.items.filter(item => hsk.knownHskInScope(item.hskLevel, scope));

test('published study card totals are cumulative and only All includes unclassified extras', () => {
  assert.deepEqual(hsk.browseScopes.map(hsk.globalHskLabel), ['HSK 1','HSK 1–2','HSK 1–3','HSK 1–4','HSK 1–5','HSK 1–6','HSK 1–9','All']);
  assert.deepEqual([1, 2, 3, 4, 5, 6, '7-9', 'all'].map(scope => pool(scope).length), [300, 500, 1000, 1000, 1000, 1000, 1000, 1020]);
  assert.ok(pool(2).some(item => item.hskLevel === 1));
  assert.ok(!hsk.knownHskInScope('7-9', 6));
  assert.ok(!hsk.knownHskInScope(undefined, '7-9'));
  assert.ok(hsk.knownHskInScope(undefined, 'all'));
});

test('saved preference wins an incoming route and legacy settings open cumulatively', () => {
  assert.equal(hsk.initialGlobalHsk('?atlas=1&hsk=5'), 5);
  assert.equal(hsk.initialGlobalHsk('?atlas=1&hsk=5', true), 1);
  assert.equal(hsk.initialGlobalHsk('?study=library&level=hsk3'), 3);
  assert.equal(hsk.hskScopeForOwner({level:'hsk2'}, 5), 2);
  assert.equal(hsk.hskScopeForOwner({level:'bonus'}, 1), 'all');
  assert.equal(hsk.hskScopeForOwner({level:'hsk3',hskScope:1}, 5), 1);
  assert.equal(hsk.hskScopeForOwner({hskScope:'not-a-scope'}, 1), 1);
});

test('a pinned all-words review preserves the exact queue and index after narrowing or reloading', () => {
  const original = pool('all');
  const index = original.findIndex(item => item.hskLevel === undefined);
  const run = '01234567-1234-4abc-9def-0123456789ab';
  const narrow = pool(1);
  const draft = {id: run, itemIds: original.map(item => item.id), index, practice: true};
  const link = hsk.scopedAllReviewHref(1, run);
  assert.equal(hsk.isAllReviewEntry(link), true);
  assert.equal(hsk.allReviewRun(link), run);
  const resumed = hsk.queueForScopedAllReview(hsk.items, narrow, draft, hsk.allReviewRun(link));
  assert.equal(resumed.run, run);
  assert.equal(resumed.index, index);
  assert.equal(resumed.queue[index].id, original[index].id);
  assert.equal(hsk.knownHskInScope(resumed.queue[index].hskLevel, 1), false);
  assert.deepEqual(hsk.queueForScopedAllReview(hsk.items, narrow, draft, undefined), {queue:narrow,index:0});
  assert.deepEqual(hsk.queueForScopedAllReview(hsk.items, narrow, draft, 'stale'), {queue:narrow,index:0});
});

test('Reading Lab links preserve both higher ranges and the originating selection', () => {
  const href = '?atlas=1&reader=1&hsk=7-9&article=sample-narrative&at=p2&aid=pinyin';
  const route = hsk.readReadingLabRoute(href);
  assert.equal(route.level, '7-9');
  assert.equal(route.article, 'sample-narrative');
  assert.equal(hsk.readingLabReturn(href), hsk.readingLabHref(route));
  assert.equal(hsk.readReadingLabRoute('?hsk=1').level, 1);
});

test('Situation Lab filters tagged grammar while keeping unclassified everyday material', () => {
  const everyday = hsk.situationRound('everyday', 1);
  assert.ok(everyday.length);
  assert.deepEqual(hsk.situationRound('all', 1), everyday);
  assert.ok(hsk.situationRound('all', 3).some(situation => situation.grammar?.frame.level === 'core'));
  assert.ok(!hsk.situationRound('all', 3).some(situation => situation.grammar?.frame.level === 'extension'));
});

test('a legacy exact-band review bookmark upgrades without losing the saved run', () => {
  const original = hsk.items.filter(item => item.hskLevel === 3);
  const range = pool(1);
  const draft = {id:'old-run', itemIds:original.map(item => item.id), index:22, practice:true};
  const legacy = '?practice=all&level=hsk3';
  const result = hsk.queueForScopedAllReview(hsk.items, range, draft, hsk.allReviewRun(legacy), hsk.initialGlobalHsk(legacy));
  assert.equal(result.run, 'old-run');
  assert.equal(result.index, 22);
  assert.equal(result.queue[22].id, original[22].id);
  assert.deepEqual(hsk.queueForScopedAllReview(hsk.items, range, draft, 'fresh-run', 3), {queue:range,index:0});
});
