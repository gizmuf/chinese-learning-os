import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';

const {outputFiles: [bundle]} = await build({
  stdin: {contents: `export * from './app/reading-lab-review-model'; export * from './app/reading-lab-review-data';
    export * from './app/reading-lab-route'; export {readingLabReadings} from './app/reading-lab-data';`, resolveDir: process.cwd()},
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const m = await import('data:text/javascript;base64,' + Buffer.from(bundle.text).toString('base64'));
const day = 86_400_000;
const base = Date.UTC(2026, 10, 15);
const library = m.readingReviewTargets[0];
const uniqueSentence = '这所大学有三个图书馆。';
const attemptId = value => `7a7ff4ee-f450-4428-84b6-${String(value).padStart(12, '0')}`;

function fixture(owner = null, target = library) {
  const rows = new Map();
  let failing = false;
  const storage = {getItem: key => rows.get(key) ?? null, setItem: (key, value) => {
    if (failing) throw Error('quota');
    rows.set(key, value);
  }};
  const change = (action, now = base) => m.persistReadingReview(storage, owner, target.id, action, now).cards[target.id];
  const read = () => m.readReadingReviewStore(storage, owner).cards[target.id];
  const start = (now, serial) => {const attempt = attemptId(serial); change({type: 'begin', attempt}, now); return attempt;};
  function write(attempt, text = uniqueSentence, word = target.hanzi) {
    change({type: 'edit', attempt, field: 'word', value: word});
    change({type: 'reveal', attempt, help: false});
    change({type: 'edit', attempt, field: 'sentence', value: text});
  }
  return {rows, storage, change, read, start, write, quota: value => {failing = value;}};
}

test('all reading targets point to the exact authored token and rotate two original scenario variants', () => {
  assert.equal(m.readingReviewTargets.length, 16);
  assert.equal(new Set(m.readingReviewTargets.map(target => target.id)).size, 16);
  const perReading = new Map();
  for (const target of m.readingReviewTargets) {
    perReading.set(target.article, (perReading.get(target.article) ?? 0) + 1);
    assert.ok(target.source.hanzi.includes(target.hanzi) && target.source.pinyin && target.source.english);
    assert.ok(target.chunk.startsWith(target.paragraph + '-'));
    for (const scenario of target.scenarios) {
      assert.ok(scenario.hanzi.includes(target.hanzi));
      assert.ok(scenario.prompt && scenario.pinyin && scenario.english && !target.articleSentences.includes(scenario.hanzi));
    }
    assert.notEqual(target.scenarios[0].prompt, target.scenarios[1].prompt);
    const route = {level: target.level, article: target.article, paragraph: target.paragraph, chunk: target.chunk,
      aid: 'pinyin', chunks: true, grammar: '', reviewReturn: target.id};
    assert.deepEqual(m.readReadingLabRoute(m.readingLabHref(route)), route);
    const active = {...route, review: target.id};
    assert.deepEqual(m.readReadingLabRoute(m.readingLabHref(active)), active);
  }
  assert.deepEqual([...perReading.values()], Array(8).fill(2));
});

test('save is voluntary, initially tomorrow and idempotent; early practice cannot change the review schedule', () => {
  const f = fixture();
  assert.equal(f.read(), undefined);
  assert.throws(() => f.start(base, 1), /unavailable/);
  const enrolled = f.change({type: 'save'});
  assert.equal(enrolled.dueAt, base + day);
  assert.deepEqual(f.change({type: 'save'}, base + day), enrolled);
  const attempt = f.start(base, 2);
  assert.equal(f.read().pending.stage, 'recall');
  f.write(attempt);
  assert.deepEqual(f.read().pending.sentence, uniqueSentence);
  const result = f.change({type: 'finish', attempt, outcome: 'remembered'}, base + day);
  assert.equal(result.dueAt, enrolled.dueAt);
  assert.equal(result.step, 0);
  assert.equal(result.lastResponse.sentence, uniqueSentence);
  assert.equal(result.lastResponse.early, true);
  assert.equal(m.readingReviewScenario(library.id, result), library.scenarios[1]);
});

test('eligible due attempts advance 3, 7, 14, 30 days, cap and ignore a stale or duplicate completion', () => {
  const f = fixture();
  let result = f.change({type: 'save'});
  for (const [index, interval] of [3, 7, 14, 30, 30].entries()) {
    const due = result.dueAt;
    const attempt = f.start(due, index + 1);
    f.write(attempt);
    const preview = m.readingReviewNext(f.read(), 'remembered', due);
    assert.equal(preview.interval, interval);
    result = f.change({type: 'finish', attempt, outcome: 'remembered'}, due);
    assert.equal(preview.dueAt, result.dueAt);
    assert.equal(result.dueAt, due + interval * day);
    assert.deepEqual(f.change({type: 'finish', attempt, outcome: 'remembered'}, due + 1), result);
    assert.throws(() => f.change({type: 'finish', attempt: attemptId(900), outcome: 'remembered'}, due), /another tab/);
  }
  const due = result.dueAt, attempt = f.start(due, 51);
  f.change({type: 'reveal', attempt, help: true});
  assert.throws(() => f.change({type: 'finish', attempt, outcome: 'remembered'}, due), /supported/);
  result = f.change({type: 'finish', attempt, outcome: 'again'}, due);
  assert.equal(result.step, 0);
  assert.equal(result.dueAt, due + day);
  assert.equal(result.lastResponse.supported, true);
});

test('punctuation-injected words, word-only answers, source returns and exact model copies cannot advance independently', () => {
  for (const [word, sentence, extra] of [
    ['图，书，馆', uniqueSentence], [library.hanzi, '图书馆。'],
    [library.hanzi, library.scenarios[0].hanzi], [library.hanzi, library.source.hanzi],
    [library.hanzi, uniqueSentence, 'source'],
  ]) {
    const f = fixture(); f.change({type: 'save'});
    const attempt = f.start(base + day, 1);
    f.write(attempt, sentence, word);
    if (extra) f.change({type: extra, attempt});
    assert.equal(m.readingReviewEligibility(library.id, f.read()).independent, false);
  }
  const worth = m.readingReviewTargets.find(target => target.hanzi === '值得');
  const otherSource = worth.articleSentences.find(text => text.includes('不值得') && text !== worth.source.hanzi);
  assert.ok(otherSource);
  const f = fixture(null, worth); f.change({type: 'save'});
  const attempt = f.start(base + day, 1);
  f.write(attempt, otherSource);
  assert.equal(m.readingReviewEligibility(worth.id, f.read()).independent, false);
});

test('comparison after an independent sentence is allowed, but subsequent editing remains supported after reload', () => {
  const f = fixture(); f.change({type: 'save'});
  const attempt = f.start(base + day, 1);
  f.write(attempt);
  f.change({type: 'sample', attempt});
  assert.equal(m.readingReviewEligibility(library.id, f.read()).independent, true);
  f.change({type: 'edit', attempt, field: 'sentence', value: '这所大学有很好的图书馆。'});
  assert.equal(f.read().pending.help, true);
  assert.equal(m.readingReviewEligibility(library.id, f.read()).independent, false);
});

test('quota failure leaves durable schedule intact, successful retry preserves the typed response, and owners stay isolated', () => {
  const f = fixture('a'); f.change({type: 'save'});
  const attempt = f.start(base + day, 1);
  f.write(attempt);
  const before = f.read();
  f.quota(true);
  assert.throws(() => f.change({type: 'finish', attempt, outcome: 'remembered'}, base + day), /quota/);
  assert.deepEqual(f.read(), before);
  f.quota(false);
  const after = f.change({type: 'finish', attempt, outcome: 'remembered'}, base + day);
  assert.equal(after.lastResponse.sentence, uniqueSentence);
  assert.equal(m.readReadingReviewStore(f.storage, null).cards[library.id], undefined);
  assert.equal(m.validateReadingReviewStore(JSON.parse(`{"version":1,"cards":{"__proto__":{}}}`)), undefined);
  assert.equal(m.validateReadingReviewStore({version: 1, cards: {[library.id]: {...after, mastery: true}}}), undefined);
  const storageKey = m.readingReviewStorageKey('a');
  assert.deepEqual(m.validateReadingReviewStore(JSON.parse(f.rows.get(storageKey))).cards[library.id], after);
});

function findPin(article, hanzi, sentence) {
  for (let paragraph = 1; paragraph <= 4; paragraph++) for (let chunk = 1; chunk <= 40; chunk++) for (let index = 0; index < 24; index++) {
    const pin = m.findReadingReviewSource(article, `p${paragraph}-c${chunk}`, index);
    if (pin?.hanzi === hanzi && (!sentence || pin.sentence.includes(sentence))) return pin;
  }
  throw Error(`Missing ${hanzi} in ${article}`);
}

test('noncurated contextual tokens retain the exact source and authored polyphone, hide every occurrence and use no invented sample', () => {
  const pin = findPin('hsk4-repair-before-replace', '只', '只需要');
  assert.deepEqual(pin.pinyin, ['zhǐ']);
  const id = m.readingReviewPinId(pin);
  const f = fixture(null, {id});
  const card = f.change({type: 'save', target: pin});
  assert.deepEqual(card.target, pin);
  const word = m.resolveReadingReviewTarget(id, card);
  assert.equal(word.pinyin, 'zhǐ');
  assert.equal(word.cloze, word.source.hanzi.replaceAll('只', '＿＿'));
  assert.equal(word.cloze.includes('只'), false);
  assert.equal(word.meaning, undefined);
  assert.ok(word.source.english);
  assert.ok(word.scenarios.every(scenario => scenario.prompt && !scenario.hanzi));
  assert.equal(m.readReadingLabRoute(m.readingLabHref({level: word.level, article: pin.article, paragraph: word.paragraph,
    grammar: '', aid: 'tones', chunks: true, review: id, reviewReturn: id, chunk: pin.chunk})).review, id);
  pin.pinyin[0] = 'zhī';
  assert.equal(m.resolveReadingReviewTarget(id, {target: pin}), undefined);
  assert.throws(() => f.change({type: 'save', target: pin}), /no longer matches/);
  assert.equal(m.findReadingReviewSource(word.article, word.chunk, pin.tokenIndex).pinyin[0], 'zhǐ');
});

test('context enrollment reuses the existing curated ID and does not create a duplicate', () => {
  const pin = findPin(library.article, '图书馆');
  const f = fixture();
  const saved = f.change({type: 'save', target: pin});
  assert.equal(saved.target, undefined);
  assert.deepEqual(f.change({type: 'save', target: pin}, base + day), saved);
  assert.deepEqual(Object.keys(m.readReadingReviewStore(f.storage, null).cards), [library.id]);
});

test('short productive responses advance independently, while pinned copies and target-only responses do not', () => {
  const pin = findPin(library.article, '去', '要去买菜');
  const id = m.readingReviewPinId(pin);
  const f = fixture(null, {id, hanzi: '去'});
  f.change({type: 'save', target: pin});
  const attempt = f.start(base + day, 7);
  f.write(attempt, '去。');
  assert.equal(m.readingReviewEligibility(id, f.read()).independent, false);
  f.change({type: 'edit', attempt, field: 'sentence', value: pin.sentence});
  assert.equal(m.readingReviewEligibility(id, f.read()).independent, false);
  f.change({type: 'edit', attempt, field: 'sentence', value: '我去。'});
  assert.equal(m.readingReviewEligibility(id, f.read()).independent, true);
  const completed = f.change({type: 'finish', attempt, outcome: 'remembered'}, base + day);
  assert.equal(completed.lastResponse.sentence, '我去。');
  assert.deepEqual(completed.target, pin);
});

test('retired pinned source remains restorable and never consumes an active slot at the same location', () => {
  const pin = findPin(library.article, '去');
  const key = m.readingReviewPinId(pin);
  const f = fixture(null, {id: key});
  f.rows.set(m.readingReviewGuestKey, JSON.stringify({version: 1, cards: {[key]: {
    dueAt: base, step: 0, reviewCount: 0, revision: 0, target: {...pin, sentence: '我去玩。'},
  }}}));
  const store = m.readReadingReviewStore(f.storage, null);
  assert.equal(m.resolveReadingReviewTarget(key, store.cards[key]), undefined);
  assert.deepEqual(m.readingReviewSchedule(store, base).due, []);
  const nextKey = m.readingReviewTargetId(pin, store.cards);
  assert.notEqual(nextKey, key);
  const next = m.persistReadingReview(f.storage, null, nextKey, {type: 'save', target: pin}, base);
  assert.deepEqual(next.cards[key], store.cards[key]);
  assert.deepEqual(next.cards[nextKey].target, pin);
  assert.equal(m.readingReviewTargetId(pin, next.cards), nextKey);
  assert.deepEqual(m.readingReviewSchedule(next, base + day).due, [nextKey]);
});

test('every Han token occurrence resolves from the corpus, with context-compatible duplicates sharing one schedule', () => {
  for (const reading of m.readingLabReadings) for (const paragraph of reading.paragraphs) for (const chunk of paragraph.chunks) {
    for (const [index, token] of chunk.tokens.entries()) {
      const pin = m.findReadingReviewSource(reading.id, chunk.id, index);
      const hanzi = token.text.replaceAll(/[^\p{Script=Han}]/gu, '');
      if (hanzi) {
        assert.equal(pin?.hanzi, hanzi);
        assert.deepEqual(pin.pinyin, token.pinyin);
        assert.ok(m.resolveReadingReviewTarget(m.readingReviewPinId(pin), {target: pin}));
      } else assert.equal(pin, undefined);
    }
  }
  const first = m.findReadingReviewSource(library.article, 'p1-c7', 3);
  const second = m.findReadingReviewSource(library.article, 'p1-c8', 1);
  const id = m.readingReviewPinId(first);
  const f = fixture(null, {id});
  const enrolled = f.change({type: 'save', target: first});
  assert.equal(m.readingReviewTargetId(second, m.readReadingReviewStore(f.storage, null).cards), id);
  assert.deepEqual(f.change({type: 'save', target: second}, base + day), enrolled);
  const cloze = m.resolveReadingReviewTarget(id, enrolled).cloze;
  assert.equal(cloze.includes('点'), false);
  assert.equal(cloze.match(/＿＿/gu).length, 2);
});
