import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
const output = await build({
  entryPoints: ["app/content.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const { items, lessons, matchesItem, isInLevel } = await import(
  "data:text/javascript;base64," +
    Buffer.from(output.outputFiles[0].text).toString("base64")
);
const reference = JSON.parse(
  readFileSync("data/hsk1-reference.json", "utf8"),
).entries;
const starter = JSON.parse(
  readFileSync("data/starter-vocabulary.json", "utf8"),
);
test("all 300 HSK1 entries and 200 HSK2 entries remain separate, plus 20 extras", () => {
  assert.equal(items.length, 520);
  assert.equal(new Set(items.map((x) => x.id)).size, 520);
  assert.equal(
    new Set(items.filter((x) => x.hskLevel === 1).map((x) => x.hanzi)).size,
    300,
  );
  assert.deepEqual(
    items
      .filter((x) => x.hskLevel === 1)
      .map((x) => [x.hskEntry, x.hanzi])
      .sort((a, b) => a[0] - b[0]),
    reference.map((x) => [x.id, x.hanzi]),
  );
  assert.equal(items.filter((x) => x.hskEntry === undefined).length, 20);
  const ref2 = JSON.parse(
    readFileSync("data/hsk2-reference.json", "utf8"),
  ).entries;
  assert.deepEqual(
    items.filter((x) => x.hskLevel === 2).map((x) => [x.hskEntry, x.hanzi]),
    ref2.map((x) => [x.id, x.hanzi]),
  );
  assert.equal(
    new Set(items.filter((x) => x.hskLevel === 2).map((x) => x.hanzi)).size,
    198,
  );
  assert.match(items.find((x) => x.id === "hsk2-357").english, /spend/);
  assert.match(items.find((x) => x.id === "hsk2-358").english, /flower/);
  assert.match(items.find((x) => x.id === "hsk2-336").english, /order/);
});
test("existing notebooks keep all 32 original IDs and teaching material", () => {
  for (const old of starter) {
    const current = items.find((x) => x.id === old.id);
    assert.ok(current, old.id);
    for (const [key, value] of Object.entries(old))
      assert.equal(current[key], value, old.id + ":" + key);
  }
});
test("every entry has usable material, a known lesson and locally available stroke data", () => {
  assert.equal(lessons.length, 14);
  const groups = new Set(lessons.map((x) => x.id));
  for (const item of items) {
    assert.ok(groups.has(item.lesson), item.id);
    for (const key of [
      "hanzi",
      "pinyin",
      "english",
      "sentence",
      "sentencePinyin",
      "translation",
    ])
      assert.ok(item[key]?.trim(), item.id + ":" + key);
    assert.ok(item.sentence.includes(item.hanzi), item.id);
    assert.ok(!/[\u3400-\u9fff]/u.test(item.sentencePinyin), item.id);
    for (const char of item.hanzi) {
      const data = JSON.parse(
        readFileSync(`node_modules/hanzi-writer-data/${char}.json`, "utf8"),
      );
      assert.ok(data.strokes.length, `${item.id}:${char}`);
    }
  }
});
test("library filtering distinguishes syllabus words, extras and thematic lessons", () => {
  assert.equal(items.filter((x) => matchesItem(x, "", "hsk1")).length, 300);
  assert.equal(items.filter((x) => matchesItem(x, "", "bonus")).length, 20);
  assert.equal(items.filter((x) => matchesItem(x, "", "hsk2")).length, 200);
  assert.ok(
    items
      .filter((x) => matchesItem(x, "", "travel"))
      .every((x) => x.lesson === "travel"),
  );
  assert.ok(
    items.some((x) => matchesItem(x, "ni hao", "hsk1") && x.id === "hello"),
  );
  assert.ok(
    items.some((x) => matchesItem(x, "dianhua", "hsk1") && x.hanzi === "电话"),
  );
  assert.ok(
    items.some(
      (x) => matchesItem(x, "university", "hsk1") && x.hanzi === "大学",
    ),
  );
  assert.ok(!items.some((x) => matchesItem(x, "咖啡", "hsk1")));
  assert.ok(items.some((x) => matchesItem(x, "咖啡", "bonus")));
});
