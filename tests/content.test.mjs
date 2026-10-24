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
test("all 300 HSK1, 200 HSK2 and 500 HSK3 entries remain separate, plus 20 extras", () => {
  assert.equal(items.length, 1020);
  assert.equal(new Set(items.map((x) => x.id)).size, 1020);
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

test("HSK3 exactly matches all official entries with original examples and isolated search", () => {
  const ref3=JSON.parse(readFileSync("data/hsk3-reference.json","utf8")).entries;
  const pool=items.filter(item=>isInLevel(item,"hsk3"));
  assert.equal(pool.length,500);
  assert.deepEqual(pool.map(item=>[item.hskEntry,item.hanzi,item.pinyin]),ref3.map(item=>[item.id,item.hanzi,item.pinyin]));
  assert.deepEqual(pool.map(item=>item.hskEntry),Array.from({length:500},(_,i)=>i+501));
  for(const item of pool){
    assert.ok(item.sentence.includes(item.hanzi),item.id);
    assert.ok(item.english&&item.translation&&item.sentencePinyin,item.id);
    assert.ok(matchesItem(item,"","hsk3"));
    assert.ok(!matchesItem(item,"","hsk1")&&!matchesItem(item,"","hsk2")&&!matchesItem(item,"","bonus"));
  }
  assert.equal(items.filter(item=>matchesItem(item,"","hsk3")).length,500);
});
test("polyphonic HSK3 readings and syllabus senses are explicit",()=>{
 const byId=Object.fromEntries(items.map(item=>[item.id,item]));
 assert.match(byId['hsk3-587'].sentencePinyin,/děi fù xí/);
 assert.match(byId['hsk3-678'].sentencePinyin,/huán dào/);
 assert.match(byId['hsk3-968'].sentencePinyin,/zhǎng de/);
 assert.match(byId['hsk3-605'].sentencePinyin,/cháng/);
 assert.match(byId['hsk3-565'].sentencePinyin,/jiāo yīng/);
 assert.match(byId['hsk3-683'].english,/meeting/);
 assert.match(byId['hsk3-704'].english,/tenth.*yuan/);
 assert.match(byId['hsk2-486'].english,/station/);
 assert.match(byId['hsk3-966'].english,/stand/);
});
