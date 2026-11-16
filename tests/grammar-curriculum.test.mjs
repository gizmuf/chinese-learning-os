import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {indexedDB} from 'fake-indexeddb';

const {outputFiles: [bundle]} = await build({
  stdin: {
    contents: "export * from './app/grammar-curriculum'; export * from './app/grammar-hsk3-data'; export * from './app/global-hsk-model'; export * from './app/local-store';",
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const grammar = await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));

test('cumulative scope adds foundations while the original independent exercise bank stays intact', () => {
  assert.deepEqual(grammar.grammarStudyGroups.map(({units}) => grammar.grammarCounts(units)), [
    {topics: 3, cards: 6, exercises: 6},
    {topics: 3, cards: 6, exercises: 6},
    {topics: 12, cards: 57, exercises: 114},
  ]);
  for (const scope of [1, 2, 3, 4, '7-9', 'all']) {
    const visible = grammar.grammarStudyGroups.filter(group => grammar.knownHskInScope(group.level, scope));
    assert.deepEqual(visible.map(group => group.level), [1, 2, 3].slice(0, scope === 1 || scope === 2 ? scope : 3));
  }
  const units = grammar.grammarStudyGroups.flatMap(({units}) => units);
  const allIds = units.flatMap(unit => unit.cards.flatMap(card => card.exercises.map(ex => ex.id)));
  assert.equal(allIds.length, new Set(allIds).size);
  assert.deepEqual(allIds.slice(12), grammar.grammarActivityIds);
});

test('syllabus markers only point to existing exercises at their mapped levels', () => {
  const summary = grammar.grammarStudyGroups.map(({level, units}) => {
    const rows = grammar.grammarCoverage[level];
    const cards = new Map(units.flatMap(unit => unit.cards.map(card => [card.id, card])));
    for (const row of rows) {
      if (row.partial) assert.ok(row.card);
      if (row.card) assert.ok(cards.get(row.card)?.exercises.length, row.card);
    }
    return grammar.grammarCoverageTotals(level);
  });
  assert.deepEqual(summary, [
    {topics: 18, linked: 7, partial: 5},
    {topics: 19, linked: 8, partial: 5},
    {topics: 20, linked: 20, partial: 14},
  ]);
});

test('foundation rules contain examples and uniquely identified localized exercises', () => {
  for (const {units} of grammar.grammarStudyGroups.slice(0, 2)) {
    for (const unit of units) for (const card of unit.cards) {
      assert.match(card.example.hanzi, /\p{Script=Han}/u);
      assert.match(card.example.pinyin, /[āáǎàēéěèīíǐìōóǒòūúǔù]/u);
      for (const exercise of card.exercises) {
        assert.equal(exercise.sentence.split('___').length, 2);
        assert.equal(new Set(exercise.options).size, 3);
        assert.ok(exercise.options[exercise.answer]);
        for (const locale of ['en', 'fr', 'ru', 'tr']) {
          assert.ok(card.explanation[locale]?.trim());
          assert.ok(card.example.meaning[locale]?.trim());
          assert.ok(exercise.explanation[locale]?.trim());
        }
      }
    }
  }
});

test('grammar return restores topic, exact exercise and syllabus overview', () => {
  const units = grammar.grammarStudyGroups.flatMap(({units}) => units);
  const unit = units.find(item => item.id === 'hsk3-grammar-clauses');
  const exercises = unit.cards.flatMap(card => card.exercises);
  const search = new URLSearchParams({grammar: 'hsk3', hsk: '3', grammarIndex: 'syllabus', grammarTopic: unit.id, grammarExercise: exercises[6].id});
  assert.deepEqual(grammar.readGrammarSelection('?' + search, units), {unitId: unit.id, index: 6, checklist: true});
  search.set('grammarExercise', 'removed');
  assert.deepEqual(grammar.readGrammarSelection('?' + search, units), {unitId: unit.id, index: 0, checklist: true});
  search.set('grammarTopic', 'removed');
  assert.deepEqual(grammar.readGrammarSelection('?' + search, units), {unitId: null, index: 0, checklist: true});
});

test('old guided answers survive narrowing, adding a foundation answer, and reopening the same notebook', async () => {
  globalThis.indexedDB = indexedDB;
  const owner = crypto.randomUUID();
  const units = grammar.grammarStudyGroups.flatMap(group => group.units);
  const hsk1 = units[0].cards[0].exercises[0];
  const hsk3 = grammar.grammarQuestions[0].ex;
  const legacyKey = 'grammar-hsk3-v1';
  const legacyAnswer = {picked: hsk3.answer, checked: true};
  assert.equal(grammar.grammarDraftKey, legacyKey);
  const db = await grammar.openStore(owner);
  await grammar.saveDraft(db, legacyKey, {[hsk3.id]: legacyAnswer, invalid: {picked: -1, checked: false}});
  const restored = grammar.restoreGrammarAnswers(await grammar.readDraft(db, grammar.grammarDraftKey), units);
  assert.deepEqual(restored, {[hsk3.id]: legacyAnswer});
  assert.equal(grammar.knownHskInScope(3, 1), false);
  await grammar.saveDraft(db, grammar.grammarDraftKey, {...restored, [hsk1.id]: {picked: hsk1.answer, checked: true}});
  db.close();
  const reopened = await grammar.openStore(owner);
  assert.deepEqual(grammar.restoreGrammarAnswers(await grammar.readDraft(reopened, legacyKey), units), {
    [hsk3.id]: legacyAnswer,
    [hsk1.id]: {picked: hsk1.answer, checked: true},
  });
  reopened.close();
});
