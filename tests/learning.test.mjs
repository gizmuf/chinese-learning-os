import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
const output = await build({
  entryPoints: ["app/learning.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const learning = await import(
  "data:text/javascript;base64," +
    Buffer.from(output.outputFiles[0].text).toString("base64")
);
const { getCards, isReview, makeQueue } = learning;
const base = {
  id: "00000000-0000-4000-8000-000000000001",
  itemId: "hello",
  skill: "writing",
  mode: "recall",
  rating: 3,
  assisted: false,
  at: 1700000000000,
  timezone: "Asia/Shanghai",
  detail: {},
};
test("tracing, copying and assisted attempts never create successful memory cards", () => {
  for (const mode of ["watch", "trace", "copy"])
    assert.equal(isReview({ ...base, mode, assisted: true }), false);
  assert.deepEqual(getCards([{ ...base, assisted: true }]), {});
  assert.equal(isReview({ ...base, rating: 0 }), false);
});
test("recognition, listening and writing have independent schedules", () => {
  const cards = getCards([{ ...base, skill: "meaning" }]);
  assert.ok(cards["hello:meaning"]);
  assert.equal(cards["hello:writing"], undefined);
  assert.equal(cards["hello:listening"], undefined);
});
test("duplicate uploads do not advance a card twice", () => {
  const once = getCards([base]);
  assert.deepEqual(getCards([base, base]), once);
  assert.equal(once["hello:writing"].reps, 1);
});
test("multi-device replay is deterministic regardless of arrival order", () => {
  const later = {
    ...base,
    id: "00000000-0000-4000-8000-000000000002",
    at: base.at + 86400000,
    rating: 2,
  };
  assert.deepEqual(getCards([later, base, base]), getCards([base, later]));
});
test("due words precede new words without leaking between skills", () => {
  const event = { ...base, itemId: "water" };
  assert.equal(makeQueue([event], "writing")[0].id, "water");
  assert.equal(makeQueue([event], "meaning")[0].id, "hello");
});
const schemaOutput = await build({
  entryPoints: ["app/event-schema.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const { eventSchema } = await import(
  "data:text/javascript;base64," +
    Buffer.from(schemaOutput.outputFiles[0].text).toString("base64")
);
test("sync rejects unknown content and oversized or invalid ink", () => {
  assert.equal(eventSchema.safeParse(base).success, true);
  assert.equal(
    eventSchema.safeParse({ ...base, itemId: "hsk1-300" }).success,
    true,
  );
  assert.equal(
    eventSchema.safeParse({ ...base, itemId: "bonus-12" }).success,
    true,
  );
  assert.equal(
    eventSchema.safeParse({ ...base, itemId: "unknown" }).success,
    false,
  );
  assert.equal(
    eventSchema.safeParse({
      ...base,
      detail: { strokes: [[[{ x: 2, y: 0, p: 0.5, t: 1 }]]] },
    }).success,
    false,
  );
  assert.equal(
    eventSchema.safeParse({
      ...base,
      detail: { strokes: [Array.from({ length: 51 }, () => [])] },
    }).success,
    false,
  );
});

test("long Pencil attempts fit sync limits while preserving stroke endpoints", () => {
  const stroke = Array.from({ length: 1500 }, (_, i) => ({
    x: i / 1499,
    y: 1 - i / 1499,
    p: 0.512345,
    t: 123456789.123 + i,
  }));
  const word = Array.from({ length: 10 }, () =>
    Array.from({ length: 50 }, () => stroke),
  );
  const compact = learning.compactStrokes(word);
  assert.ok(compact.flat(2).length <= 4096);
  assert.equal(compact[0][0][0].x, 0);
  assert.equal(compact[0][0].at(-1).x, 1);
  assert.ok(Buffer.byteLength(JSON.stringify(compact)) < 900000);
  assert.equal(stroke.length, 1500);
});
