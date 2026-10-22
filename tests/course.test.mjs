import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
async function load(entry) {
  const r = await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
  });
  return import(
    "data:text/javascript;base64," +
      Buffer.from(r.outputFiles[0].text).toString("base64")
  );
}
const data = await load("app/course-data.ts"),
  tasks = await load("app/course-exercises.ts"),
  learning = await load("app/course-learning.ts");
const { terms, sentences, topicInfo, termBase, termItem, sentenceItem } = data;
const { exercises, isCorrect, shuffledOptions } = tasks;
const base = {
  id: "00000000-0000-4000-8000-000000000001",
  lessonId: "intensive-03",
  activityId: "time-days",
  kind: "answer",
  correct: true,
  assisted: false,
  at: 1700000000000,
};
test("lesson 03 has complete trilingual content, provenance and four activities per topic", () => {
  assert.equal(exercises.length, 24);
  assert.equal(sentences.length, 22);
  assert.equal(new Set(terms.map((t) => t.id)).size, terms.length);
  for (const item of [...terms, ...sentences]) {
    assert.ok(item.hanzi && item.pinyin);
    for (const locale of ["en", "fr", "ru"])
      assert.ok(item.meaning[locale]?.trim());
  }
  for (const topic of Object.keys(topicInfo)) {
    assert.equal(exercises.filter((e) => e.topic === topic).length, 4);
    for (const locale of ["en", "fr", "ru"])
      assert.ok(topicInfo[topic].note[locale]);
  }
  for (const e of exercises) {
    assert.equal(new Set(e.options.map((o) => o.id)).size, e.options.length);
    for (const a of e.answers) {
      assert.ok(a.every((id) => e.options.some((o) => o.id === id)));
      assert.ok(isCorrect(e, a));
    }
    for (const locale of ["en", "fr", "ru"])
      assert.ok(e.prompt[locale] && e.explanation[locale]);
    if (e.audio) assert.ok(sentences.find((s) => s.id === e.audio));
  }
});
test("HSK words retain identity and course words/sentences have distinct IDs", () => {
  for (const term of terms)
    for (const locale of ["en", "fr", "ru"]) {
      const item = termItem(term, locale);
      assert.equal(item.hanzi, term.hanzi);
      assert.equal(item.english, term.meaning[locale]);
      if (termBase(term)) assert.equal(item.id, termBase(term).id);
      else assert.equal(item.id, "course03-" + term.id);
    }
  const guo = terms.find((t) => t.hanzi === "过");
  assert.equal(termItem(guo, "en").id, "hsk2-351");
  for (const sentence of sentences)
    assert.equal(sentenceItem(sentence, "en").id, "course03-" + sentence.id);
});
test("grading rejects reversed time and wrong negation, shuffling preserves the answer set", () => {
  const order = exercises.find((e) => e.id === "time-days");
  assert.equal(isCorrect(order, [...order.answers[0]].reverse()), false);
  assert.equal(isCorrect(order, order.answers[0].slice(1)), false);
  for (const [id, correct, wrong] of [
    ["negation-habit", "bu", "mei"],
    ["negation-yesterday", "mei", "bu"],
    ["negation-now", "not-have", "bu"],
  ]) {
    const e = exercises.find((e) => e.id === id);
    assert.ok(isCorrect(e, [correct]));
    assert.equal(isCorrect(e, [wrong]), false);
  }
  const original = structuredClone(order.options);
  assert.deepEqual(
    shuffledOptions(order.options, 31),
    shuffledOptions(order.options, 31),
  );
  assert.deepEqual(
    [...shuffledOptions(order.options, 31)].map((o) => o.id).sort(),
    original.map((o) => o.id).sort(),
  );
  assert.deepEqual(order.options, original);
});
test("course schedules exclude hints/study/copy, deduplicate and replay deterministically", () => {
  const { courseCards, courseSummary } = learning;
  assert.deepEqual(
    courseCards([
      { ...base, assisted: true },
      { ...base, activityId: "study:time", kind: "study", correct: null },
    ]),
    {},
  );
  const later = {
    ...base,
    id: "00000000-0000-4000-8000-000000000002",
    at: base.at + 86400000,
    correct: false,
  };
  assert.deepEqual(
    courseCards([base, base, later]),
    courseCards([later, base]),
  );
  assert.equal(courseCards([base, base])["time-days"].reps, 1);
  const summary = courseSummary([
    base,
    { ...later, activityId: "time-years", assisted: true },
  ]);
  assert.equal(summary.attempted, 2);
  assert.equal(summary.independent, 1);
  assert.equal(summary.correct, 1);
  assert.equal(summary.practiced, false);
  assert.deepEqual(
    courseCards([
      {
        ...base,
        kind: "writing",
        activityId: "write:today",
        rating: 0,
        assisted: true,
      },
    ]),
    {},
  );
});
test("course validation rejects unknown activities and mismatched study/answer kinds", () => {
  const schema = learning.courseEventSchema;
  assert.ok(schema.safeParse(base).success);
  for (const event of [
    { ...base, activityId: "hsk1-001" },
    { ...base, kind: "study" },
    { ...base, correct: null },
    { ...base, lessonId: "intensive-04" },
    { ...base, rating: 5 },
  ])
    assert.equal(schema.safeParse(event).success, false);
});
